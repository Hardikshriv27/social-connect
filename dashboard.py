"""
Dashboard blueprint -- the main application UI once a user is logged in.

Routes:
    GET  /                  -- main dashboard (compose / analytics / posts)
    GET  /settings          -- connected accounts management
    POST /post              -- publish a post across selected platforms
    GET  /debug/token       -- per-user token validity check (JSON)
"""

import os
from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required, current_user

from extensions import db
from social_api import (
    check_facebook_token,
    get_facebook_posts,
    get_facebook_page_insights,
    get_instagram_account_info,
    get_instagram_insights,
    extract_metric_value,
    post_to_facebook,
    post_to_instagram,
    upload_to_youtube,
    get_youtube_channel_stats,
)

dashboard_bp = Blueprint("dashboard", __name__)


def _allowed_file(filename, allowed_extensions):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


@dashboard_bp.route("/")
@login_required
def home():
    fb_account = current_user.get_account("facebook")
    ig_account = current_user.get_account("instagram")
    yt_account = current_user.get_account("youtube")

    # --- Facebook data ---
    fb_posts = get_facebook_posts(fb_account) if fb_account else []
    fb_insights = get_facebook_page_insights(fb_account) if fb_account else None
    fb_reach = extract_metric_value(fb_insights, "page_impressions_unique")

    # --- Instagram data ---
    ig_insights = get_instagram_insights(ig_account) if ig_account else None
    ig_info = get_instagram_account_info(ig_account) if ig_account else None
    ig_reach = extract_metric_value(ig_insights, "reach")
    ig_followers = ig_info.get("followers_count") if ig_info else None

    # --- YouTube data ---
    yt_stats = get_youtube_channel_stats(yt_account) if yt_account else None

    return render_template(
        "index.html",
        fb_account=fb_account,
        ig_account=ig_account,
        yt_account=yt_account,
        fb_posts=fb_posts,
        fb_reach=fb_reach,
        ig_reach=ig_reach,
        ig_followers=ig_followers,
        yt_stats=yt_stats,
    )


@dashboard_bp.route("/settings")
@login_required
def settings():
    fb_account = current_user.get_account("facebook")
    ig_account = current_user.get_account("instagram")
    yt_account = current_user.get_account("youtube")

    fb_valid, fb_detail = (check_facebook_token(fb_account) if fb_account else (False, None))

    return render_template(
        "settings.html",
        fb_account=fb_account,
        ig_account=ig_account,
        yt_account=yt_account,
        fb_token_valid=fb_valid,
    )


@dashboard_bp.route("/debug/token")
@login_required
def debug_token():
    fb_account = current_user.get_account("facebook")
    ig_account = current_user.get_account("instagram")
    yt_account = current_user.get_account("youtube")

    fb_valid, fb_detail = (check_facebook_token(fb_account) if fb_account else (False, {"error": "not connected"}))

    return jsonify({
        "facebook": {
            "connected": fb_account is not None,
            "valid": fb_valid,
            "detail": fb_detail,
            "expires_at": fb_account.token_expires_at.isoformat() if fb_account and fb_account.token_expires_at else None,
        },
        "instagram": {
            "connected": ig_account is not None,
            "account_id": ig_account.external_account_id if ig_account else None,
        },
        "youtube": {
            "connected": yt_account is not None,
            "has_refresh_token": bool(yt_account and yt_account.refresh_token),
            "expires_at": yt_account.token_expires_at.isoformat() if yt_account and yt_account.token_expires_at else None,
        },
    })


@dashboard_bp.route("/post", methods=["POST"])
@login_required
def post():
    msg = request.form.get("message", "").strip()
    image_url = request.form.get("image_url", "").strip()
    image_file = request.files.get("image_file")
    video_file = request.files.get("video_file")
    platforms = request.form.getlist("platforms")

    if not msg:
        return jsonify({"status": "error", "message": "Caption cannot be empty."})
    if not platforms:
        return jsonify({"status": "error", "message": "Select at least one platform."})

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    saved_image_path = None
    saved_video_path = None
    results = {}

    try:
        # --- Save uploaded image, if any ---
        if image_file and image_file.filename:
            if not _allowed_file(image_file.filename, current_app.config["ALLOWED_IMAGE_EXTENSIONS"]):
                return jsonify({"status": "error", "message": "Unsupported image file type."})
            saved_image_path = os.path.join(upload_folder, image_file.filename)
            image_file.save(saved_image_path)

        # ── Facebook ──
        if "facebook" in platforms:
            fb_account = current_user.get_account("facebook")
            if not fb_account:
                results["facebook"] = {"error": {"message": "Facebook is not connected."}}
            else:
                try:
                    if saved_image_path:
                        results["facebook"] = post_to_facebook(fb_account, msg, image_path=saved_image_path)
                    elif image_url:
                        results["facebook"] = post_to_facebook(fb_account, msg, image_url=image_url)
                    else:
                        results["facebook"] = post_to_facebook(fb_account, msg)
                except Exception as exc:
                    results["facebook"] = {"error": {"message": str(exc)}}

        # ── Instagram ──
        if "instagram" in platforms:
            ig_account = current_user.get_account("instagram")
            if not ig_account:
                results["instagram"] = {"error": {"message": "Instagram is not connected."}}
            elif image_url:
                try:
                    results["instagram"] = post_to_instagram(ig_account, image_url, msg)
                except Exception as exc:
                    results["instagram"] = {"error": {"message": str(exc)}}
            elif saved_image_path:
                results["instagram"] = {
                    "warning": "Instagram requires a public image URL, not a local file. Post skipped for Instagram."
                }
            else:
                results["instagram"] = {"warning": "Instagram requires an image. Post skipped."}

        # ── YouTube ──
        if "youtube" in platforms:
            yt_account = current_user.get_account("youtube")
            if not yt_account:
                results["youtube"] = {"error": {"message": "YouTube is not connected."}}
            elif video_file and video_file.filename:
                if not _allowed_file(video_file.filename, current_app.config["ALLOWED_VIDEO_EXTENSIONS"]):
                    results["youtube"] = {"error": {"message": "Unsupported video file type."}}
                else:
                    saved_video_path = os.path.join(upload_folder, video_file.filename)
                    video_file.save(saved_video_path)
                    try:
                        results["youtube"] = upload_to_youtube(yt_account, saved_video_path, msg, msg)
                    except Exception as exc:
                        results["youtube"] = {"error": {"message": str(exc)}}
            else:
                results["youtube"] = {"warning": "No video file provided for YouTube. Post skipped."}

    finally:
        for path in (saved_image_path, saved_video_path):
            if path and os.path.exists(path):
                os.remove(path)

    # --- Build response ---
    def extract_error_text(v):
        if not isinstance(v, dict):
            return None
        if "error" in v:
            err = v["error"]
            return err.get("message", str(err)) if isinstance(err, dict) else str(err)
        if "warning" in v:
            return v["warning"]
        return None

    errors = []
    for p, v in results.items():
        err_text = extract_error_text(v)
        if err_text:
            errors.append(f"{p}: {err_text}")

    posted_to = [p for p, v in results.items() if isinstance(v, dict) and "id" in v]
    preview_data = {"text": msg, "image": image_url or None, "platforms": platforms}

    if posted_to:
        success_msg = "Posted to " + ", ".join(p.title() for p in posted_to) + " successfully!"
        if errors:
            success_msg += " | " + "; ".join(errors)
        return jsonify({"status": "success", "message": success_msg, "preview": preview_data})
    elif errors:
        return jsonify({"status": "error", "message": " | ".join(errors)})
    else:
        return jsonify({"status": "error", "message": "Nothing was posted. Check your platform selections."})
