"""
Database models.

User              -- application account (email + hashed password)
SocialAccount     -- one connected platform account per user
                     (facebook, instagram, youtube). Access/refresh tokens
                     are stored encrypted at rest using Fernet.
"""

import datetime
from cryptography.fernet import Fernet, InvalidToken
from flask import current_app
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


def _fernet():
    key = current_app.config.get("TOKEN_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError(
            "TOKEN_ENCRYPTION_KEY is not set. Generate one with: "
            "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    social_accounts = db.relationship(
        "SocialAccount", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def get_account(self, provider: str):
        """Return the connected SocialAccount for a provider, or None."""
        return self.social_accounts.filter_by(provider=provider).first()

    def __repr__(self):
        return f"<User {self.email}>"


class SocialAccount(db.Model):
    __tablename__ = "social_accounts"
    __table_args__ = (
        db.UniqueConstraint("user_id", "provider", name="uq_user_provider"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # 'facebook', 'instagram', or 'youtube'
    provider = db.Column(db.String(20), nullable=False)

    # Encrypted token blobs (Fernet). Never store raw tokens.
    _access_token = db.Column("access_token", db.Text, nullable=True)
    _refresh_token = db.Column("refresh_token", db.Text, nullable=True)

    token_expires_at = db.Column(db.DateTime, nullable=True)

    # Provider-specific identifiers
    external_account_id = db.Column(db.String(255), nullable=True)   # FB Page ID / IG Business ID
    external_account_name = db.Column(db.String(255), nullable=True)  # Display name / Page name

    # Free-form JSON-ish text for extra metadata (e.g. linked IG ID for an FB page)
    extra_data = db.Column(db.Text, nullable=True)

    connected_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # --- Encrypted token accessors ---
    @property
    def access_token(self):
        if not self._access_token:
            return None
        try:
            return _fernet().decrypt(self._access_token.encode()).decode()
        except InvalidToken:
            return None

    @access_token.setter
    def access_token(self, value):
        self._access_token = _fernet().encrypt(value.encode()).decode() if value else None

    @property
    def refresh_token(self):
        if not self._refresh_token:
            return None
        try:
            return _fernet().decrypt(self._refresh_token.encode()).decode()
        except InvalidToken:
            return None

    @refresh_token.setter
    def refresh_token(self, value):
        self._refresh_token = _fernet().encrypt(value.encode()).decode() if value else None

    @property
    def is_expired(self) -> bool:
        if not self.token_expires_at:
            return False
        return datetime.datetime.utcnow() >= self.token_expires_at

    @property
    def expires_soon(self, within_days: int = 3) -> bool:
        if not self.token_expires_at:
            return False
        return datetime.datetime.utcnow() >= (
            self.token_expires_at - datetime.timedelta(days=within_days)
        )

    def __repr__(self):
        return f"<SocialAccount {self.provider} user_id={self.user_id}>"
