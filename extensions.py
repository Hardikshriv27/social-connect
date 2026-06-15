"""
Shared Flask extension instances.
Initialized here and bound to the app in app.py to avoid circular imports.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = "auth.login_page"
login_manager.login_message = "Please log in to continue."
login_manager.login_message_category = "error"
