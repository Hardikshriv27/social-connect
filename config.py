"""
Application configuration.
All values are sourced from environment variables (see .env.example).
"""

import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # --- Core ---
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-only-change-me")
    APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://127.0.0.1:5000").rstrip("/")

    # --- Database ---
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'social_connect.db')}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- Token encryption ---
    TOKEN_ENCRYPTION_KEY = os.environ.get("TOKEN_ENCRYPTION_KEY", "")

    # --- Session / cookies ---
    SESSION_COOKIE_NAME = "social_connect_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    # Set to True when serving over HTTPS in production.
    SESSION_COOKIE_SECURE = os.environ.get("FLASK_ENV") == "production"

    # --- Uploads ---
    UPLOAD_FOLDER = os.path.join(BASE_DIR, os.environ.get("UPLOAD_FOLDER", "uploads"))
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH_MB", "500")) * 1024 * 1024
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
    ALLOWED_VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "mkv", "webm"}

    # --- Meta (Facebook / Instagram) ---
    META_APP_ID = os.environ.get("META_APP_ID", "")
    META_APP_SECRET = os.environ.get("META_APP_SECRET", "")
    META_GRAPH_API_VERSION = os.environ.get("META_GRAPH_API_VERSION", "v19.0")
    META_GRAPH_BASE = f"https://graph.facebook.com/{META_GRAPH_API_VERSION}"
    META_OAUTH_SCOPES = os.environ.get(
        "META_OAUTH_SCOPES",
        "pages_show_list,pages_read_engagement,pages_manage_posts,read_insights,"
        "instagram_basic,instagram_manage_insights,instagram_content_publish,business_management",
    )

    # --- Google (YouTube) ---
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    YOUTUBE_OAUTH_SCOPES = os.environ.get(
        "YOUTUBE_OAUTH_SCOPES",
        "https://www.googleapis.com/auth/youtube.upload,"
        "https://www.googleapis.com/auth/youtube.readonly",
    ).split(",")
