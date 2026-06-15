"""
OAuth blueprint — connects each user's own Facebook, Instagram, and
YouTube accounts. All tokens are stored per-user in SocialAccount rows.

Facebook / Instagram (Meta):
    1. User clicks "Connect Facebook" -> redirect to Facebook Login dialog
    2. Meta redirects back to /oauth/facebook/callback with a `code`
    3. Exchange `code` for a short-lived user access token
    4. Exchange short-lived token for a long-lived token (~60 days)
    5. Fetch the user's Facebook Pages (pages_show_list)
    6. For the first/selected Page, fetch the linked Instagram Business
       Account (if any) via the Page's `instagram_business_account` field
    7. Store the long-lived Page access token + IG account id

YouTube (Google):
    1. User clicks "Connect YouTube" -> redirect to Google's consent screen
       (access_type=offline, prompt=consent to guarantee a refresh_token)
    2. Google redirects back to /oauth/youtube/callback with a `code`
    3. Exchange `code` for access_token + refresh_token
    4. Store both; refresh_token lets us mint new access tokens
       indefinitely without re-prompting the user.
"""
import os
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

import datetime
import secrets

import requests
from flask import Blueprint, redirect, request, session, url_for, flash, current_app
from flask_login import login_required, current_user

from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials

from extensions import db
from models import SocialAccount

oauth_bp = Blueprint("oauth", __name__, url_prefix="/oauth")

# =====================================================================
# Helpers
# =====================================================================

def _redirect_uri(provider: str) -> str:
    return f"{current_app.config['APP_BASE_URL']}/oauth/{provider}/callback"


def _upsert_social_account(provider: str, **fields) -> SocialAccount:
    account = current_user.get_account(provider)
    if account is None:
        account = SocialAccount(user_id=current_user.id, provider=provider)
        db.session.add(account)
    for key, value in fields.items():
        setattr(account, key, value)
    account.updated_at = datetime.datetime.utcnow()
    db.session.commit()
    return account


# =====================================================================
# Facebook + Instagram (Meta Graph API)
# =====================================================================

@oauth_bp.route("/facebook/start")
@login_required
def facebook_start():
    cfg = current_app.config
    if not cfg["META_APP_ID"] or not cfg["META_APP_SECRET"]:
        flash("Facebook/Instagram login is not configured on this server.", "error")
        return redirect(url_for("dashboard.settings"))

    state = secrets.token_urlsafe(24)
    session["fb_oauth_state"] = state

    params = {
        "client_id": cfg["META_APP_ID"],
        "redirect_uri": _redirect_uri("facebook"),
        "state": state,
        "scope": cfg["META_OAUTH_SCOPES"],
        "response_type": "code",
    }
    auth_url = "https://www.facebook.com/" + cfg["META_GRAPH_API_VERSION"] + "/dialog/oauth"
    query = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    return redirect(f"{auth_url}?{query}")


@oauth_bp.route("/facebook/callback")
@login_required
def facebook_callback():
    cfg = current_app.config

    if request.args.get("error"):
        flash("Facebook connection was cancelled.", "error")
        return redirect(url_for("dashboard.settings"))

    state = request.args.get("state")
    if not state or state != session.pop("fb_oauth_state", None):
        flash("Facebook login session expired. Please try again.", "error")
        return redirect(url_for("dashboard.settings"))

    code = request.args.get("code")
    if not code:
        flash("Facebook did not return an authorization code.", "error")
        return redirect(url_for("dashboard.settings"))

    graph = cfg["META_GRAPH_BASE"]

    # --- Step 1: exchange `code` for a short-lived user access token ---
    token_resp = requests.get(f"{graph}/oauth/access_token", params={
        "client_id": cfg["META_APP_ID"],
        "client_secret": cfg["META_APP_SECRET"],
        "redirect_uri": _redirect_uri("facebook"),
        "code": code,
    }).json()

    if "access_token" not in token_resp:
        current_app.logger.error("Facebook token exchange failed: %s", token_resp.get("error"))
        flash("Could not connect Facebook. Please try again.", "error")
        return redirect(url_for("dashboard.settings"))

    short_lived_token = token_resp["access_token"]

    # --- Step 2: exchange short-lived -> long-lived token (~60 days) ---
    long_lived_resp = requests.get(f"{graph}/oauth/access_token", params={
        "grant_type": "fb_exchange_token",
        "client_id": cfg["META_APP_ID"],
        "client_secret": cfg["META_APP_SECRET"],
        "fb_exchange_token": short_lived_token,
    }).json()

    user_token = long_lived_resp.get("access_token", short_lived_token)
    expires_in = long_lived_resp.get("expires_in")  # seconds, ~5184000 (60 days)
    expires_at = (
        datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in)
        if expires_in else None
    )

    # --- Step 3: fetch the user's Facebook Pages ---
    pages_resp = requests.get(f"{graph}/me/accounts", params={
        "access_token": user_token,
        "fields": "id,name,access_token",
    }).json()

    pages = pages_resp.get("data", [])
    if not pages:
        flash(
            "Facebook connected, but no Facebook Pages were found on this account. "
            "You need to manage at least one Facebook Page to post and view insights.",
            "error",
        )
        return redirect(url_for("dashboard.settings"))

    # For simplicity, use the first Page. A future iteration could let the
    # user choose which Page to connect if they manage multiple.
    page = pages[0]
    page_id = page["id"]
    page_name = page.get("name", "Facebook Page")
    page_access_token = page.get("access_token", user_token)

    # --- Step 4: store the Facebook connection ---
    _upsert_social_account(
        "facebook",
        access_token=page_access_token,
        token_expires_at=expires_at,
        external_account_id=page_id,
        external_account_name=page_name,
    )

    # --- Step 5: discover linked Instagram Business Account, if any ---
    ig_resp = requests.get(f"{graph}/{page_id}", params={
        "access_token": page_access_token,
        "fields": "instagram_business_account{id,username}",
    }).json()

    ig_account = ig_resp.get("instagram_business_account")
    if ig_account:
        _upsert_social_account(
            "instagram",
            access_token=page_access_token,  # IG Graph API uses the Page token
            token_expires_at=expires_at,
            external_account_id=ig_account["id"],
            external_account_name=ig_account.get("username", "Instagram"),
            extra_data=f'{{"linked_page_id": "{page_id}"}}',
        )
        flash(f"Connected Facebook Page \"{page_name}\" and Instagram (@{ig_account.get('username')}).", "success")
    else:
        flash(
            f"Connected Facebook Page \"{page_name}\". "
            "No Instagram Business account is linked to this Page, so Instagram was not connected.",
            "warning",
        )

    return redirect(url_for("dashboard.settings"))


@oauth_bp.route("/facebook/disconnect")
@login_required
def facebook_disconnect():
    for provider in ("facebook", "instagram"):
        account = current_user.get_account(provider)
        if account:
            db.session.delete(account)
    db.session.commit()
    flash("Disconnected Facebook and Instagram.", "success")
    return redirect(url_for("dashboard.settings"))


# =====================================================================
# YouTube (Google OAuth)
# =====================================================================

def _google_client_config():
    cfg = current_app.config
    return {
        "web": {
            "client_id": cfg["GOOGLE_CLIENT_ID"],
            "client_secret": cfg["GOOGLE_CLIENT_SECRET"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [_redirect_uri("youtube")],
        }
    }


@oauth_bp.route("/youtube/start")
@login_required
def youtube_start():
    cfg = current_app.config
    if not cfg["GOOGLE_CLIENT_ID"] or not cfg["GOOGLE_CLIENT_SECRET"]:
        flash("YouTube login is not configured on this server.", "error")
        return redirect(url_for("dashboard.settings"))

    flow = Flow.from_client_config(
        _google_client_config(),
        scopes=cfg["YOUTUBE_OAUTH_SCOPES"],
        redirect_uri=_redirect_uri("youtube"),
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",  # ensures a refresh_token is returned every time
    )
    session["yt_oauth_state"] = state
    return redirect(auth_url)


@oauth_bp.route("/youtube/callback")
@login_required
def youtube_callback():
    cfg = current_app.config

    if request.args.get("error"):
        flash("YouTube connection was cancelled.", "error")
        return redirect(url_for("dashboard.settings"))

    state = session.get("yt_oauth_state")
    if not state or state != request.args.get("state"):
        flash("YouTube login session expired. Please try again.", "error")
        return redirect(url_for("dashboard.settings"))

    flow = Flow.from_client_config(
        _google_client_config(),
        scopes=cfg["YOUTUBE_OAUTH_SCOPES"],
        state=state,
        redirect_uri=_redirect_uri("youtube"),
    )

    try:
        flow.fetch_token(authorization_response=request.url)
    except Exception as exc:  # pragma: no cover - network/3rd-party errors
        current_app.logger.error("YouTube token exchange failed: %s", exc)
        flash("Could not connect YouTube. Please try again.", "error")
        return redirect(url_for("dashboard.settings"))

    creds = flow.credentials

    # Fetch channel name to display in Settings
    channel_name = "YouTube channel"
    try:
        from googleapiclient.discovery import build
        youtube = build("youtube", "v3", credentials=creds)
        resp = youtube.channels().list(part="snippet", mine=True).execute()
        items = resp.get("items", [])
        if items:
            channel_name = items[0]["snippet"]["title"]
    except Exception as exc:  # pragma: no cover
        current_app.logger.warning("Could not fetch YouTube channel name: %s", exc)

    expires_at = creds.expiry  # Google credentials expose a datetime directly

    _upsert_social_account(
        "youtube",
        access_token=creds.token,
        refresh_token=creds.refresh_token,
        token_expires_at=expires_at,
        external_account_id=None,
        external_account_name=channel_name,
    )

    flash(f"Connected YouTube channel \"{channel_name}\".", "success")
    return redirect(url_for("dashboard.settings"))


@oauth_bp.route("/youtube/disconnect")
@login_required
def youtube_disconnect():
    account = current_user.get_account("youtube")
    if account:
        db.session.delete(account)
        db.session.commit()
    flash("Disconnected YouTube.", "success")
    return redirect(url_for("dashboard.settings"))


def get_youtube_credentials(account: SocialAccount):
    """
    Build a google.oauth2.credentials.Credentials object for a stored
    YouTube SocialAccount, refreshing the access token if it has expired.
    Returns None if the account has no usable refresh token.
    """
    cfg = current_app.config
    if not account or not account.refresh_token:
        return None

    creds = Credentials(
        token=account.access_token,
        refresh_token=account.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=cfg["GOOGLE_CLIENT_ID"],
        client_secret=cfg["GOOGLE_CLIENT_SECRET"],
        scopes=cfg["YOUTUBE_OAUTH_SCOPES"],
    )

    if account.is_expired or not creds.valid:
        try:
            creds.refresh(GoogleRequest())
            account.access_token = creds.token
            account.token_expires_at = creds.expiry
            db.session.commit()
        except Exception as exc:  # pragma: no cover
            current_app.logger.error("YouTube token refresh failed: %s", exc)
            return None

    return creds
