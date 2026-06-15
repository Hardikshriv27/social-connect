"""
Per-user social media API helpers.

Every function takes a SocialAccount (the connected account belonging to
the current user) rather than relying on any global/developer token.
All functions fail gracefully and return empty/None on error so the
dashboard never crashes due to a missing or expired token.
"""

import datetime
import requests
from flask import current_app


# =====================================================================
# Facebook
# =====================================================================

def check_facebook_token(account):
    """Returns (is_valid, detail_dict)."""
    if not account or not account.access_token:
        return False, {"error": "Facebook is not connected."}
    graph = current_app.config["META_GRAPH_BASE"]
    resp = requests.get(f"{graph}/me", params={"access_token": account.access_token}).json()
    if "error" in resp:
        return False, resp["error"]
    return True, resp


def get_facebook_posts(account, limit=10):
    if not account or not account.access_token or not account.external_account_id:
        return []
    graph = current_app.config["META_GRAPH_BASE"]
    resp = requests.get(f"{graph}/{account.external_account_id}/posts", params={
        "fields": "message,created_time,full_picture,permalink_url",
        "limit": limit,
        "access_token": account.access_token,
    }).json()
    if "error" in resp:
        current_app.logger.warning("Facebook posts error: %s", resp["error"])
        return []
    return resp.get("data", [])


def get_facebook_page_insights(account):
    """Returns the raw insights response, or None if unavailable."""
    if not account or not account.access_token or not account.external_account_id:
        return None
    graph = current_app.config["META_GRAPH_BASE"]
    resp = requests.get(f"{graph}/{account.external_account_id}/insights", params={
        "metric": "page_impressions_unique,page_post_engagements",
        "period": "week",
        "access_token": account.access_token,
    }).json()
    if "error" in resp:
        current_app.logger.warning("Facebook insights error: %s", resp["error"])
        return None
    return resp


def post_to_facebook(account, message, image_path=None, image_url=None):
    if not account or not account.access_token or not account.external_account_id:
        return {"error": {"message": "Facebook is not connected."}}

    graph = current_app.config["META_GRAPH_BASE"]
    page_id = account.external_account_id

    if image_path:
        url = f"{graph}/{page_id}/photos"
        with open(image_path, "rb") as img_file:
            files = {"source": img_file}
            payload = {"caption": message, "access_token": account.access_token}
            resp = requests.post(url, data=payload, files=files)
    elif image_url:
        url = f"{graph}/{page_id}/photos"
        payload = {"caption": message, "url": image_url, "access_token": account.access_token}
        resp = requests.post(url, data=payload)
    else:
        url = f"{graph}/{page_id}/feed"
        payload = {"message": message, "access_token": account.access_token}
        resp = requests.post(url, data=payload)

    data = resp.json()
    if "error" in data:
        current_app.logger.warning("Facebook post error: %s", data["error"])
    return data


# =====================================================================
# Instagram (Graph API via linked Facebook Page token)
# =====================================================================

def get_instagram_account_info(account):
    if not account or not account.access_token or not account.external_account_id:
        return None
    graph = current_app.config["META_GRAPH_BASE"]
    resp = requests.get(f"{graph}/{account.external_account_id}", params={
        "fields": "followers_count,media_count,username",
        "access_token": account.access_token,
    }).json()
    if "error" in resp:
        current_app.logger.warning("Instagram account error: %s", resp["error"])
        return None
    return resp


def get_instagram_insights(account):
    if not account or not account.access_token or not account.external_account_id:
        return None
    graph = current_app.config["META_GRAPH_BASE"]
    resp = requests.get(f"{graph}/{account.external_account_id}/insights", params={
        "metric": "reach,accounts_engaged",
        "period": "day",
        "metric_type": "total_value",
        "access_token": account.access_token,
    }).json()
    if "error" in resp:
        current_app.logger.warning("Instagram insights error: %s", resp["error"])
        return None
    return resp


def post_to_instagram(account, image_url, caption):
    """
    Instagram Graph API requires a publicly accessible image URL
    (no local file uploads).
    """
    if not account or not account.access_token or not account.external_account_id:
        return {"error": {"message": "Instagram is not connected."}}
    if not image_url:
        return {"error": {"message": "Instagram requires a public image URL."}}

    graph = current_app.config["META_GRAPH_BASE"]
    ig_id = account.external_account_id

    media_resp = requests.post(f"{graph}/{ig_id}/media", data={
        "image_url": image_url,
        "caption": caption,
        "access_token": account.access_token,
    }).json()

    if "id" not in media_resp:
        current_app.logger.warning("Instagram media creation error: %s", media_resp.get("error"))
        return media_resp

    publish_resp = requests.post(f"{graph}/{ig_id}/media_publish", data={
        "creation_id": media_resp["id"],
        "access_token": account.access_token,
    }).json()

    if "error" in publish_resp:
        current_app.logger.warning("Instagram publish error: %s", publish_resp["error"])
    return publish_resp


# =====================================================================
# Shared helpers
# =====================================================================

def extract_metric_value(insights_response, metric_name):
    if not insights_response or "data" not in insights_response:
        return None
    for item in insights_response["data"]:
        if item.get("name") == metric_name:
            values = item.get("values", [])
            if values:
                return values[-1].get("value")
            total = item.get("total_value", {})
            if "value" in total:
                return total["value"]
    return None


# =====================================================================
# YouTube
# =====================================================================

def upload_to_youtube(account, video_path, title, description):
    """
    Uploads a video to the connected user's YouTube channel.
    `account` must be a SocialAccount with a valid refresh token;
    credentials/refresh handling lives in oauth.get_youtube_credentials.
    """
    from oauth import get_youtube_credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    creds = get_youtube_credentials(account)
    if not creds:
        return {"error": "YouTube is not connected or the connection has expired. Please reconnect."}

    youtube = build("youtube", "v3", credentials=creds)
    request_upload = youtube.videos().insert(
        part="snippet,status",
        body={
            "snippet": {"title": title or "New video", "description": description or ""},
            "status": {"privacyStatus": "public"},
        },
        media_body=MediaFileUpload(video_path),
    )
    return request_upload.execute()


def get_youtube_channel_stats(account):
    """Returns basic channel statistics (subscriberCount, videoCount), or None."""
    from oauth import get_youtube_credentials
    from googleapiclient.discovery import build

    creds = get_youtube_credentials(account)
    if not creds:
        return None

    try:
        youtube = build("youtube", "v3", credentials=creds)
        resp = youtube.channels().list(part="statistics", mine=True).execute()
        items = resp.get("items", [])
        if items:
            return items[0].get("statistics")
    except Exception as exc:  # pragma: no cover
        current_app.logger.warning("YouTube stats error: %s", exc)
    return None
