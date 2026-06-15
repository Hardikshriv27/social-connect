"""
Authentication blueprint.

Routes:
    GET  /login            -- login page
    POST /login            -- authenticate
    GET  /signup           -- signup page
    POST /signup           -- create account
    GET  /logout           -- log out
"""

import re
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user

from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@auth_bp.route("/login", methods=["GET"])
def login_page():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.home"))
    return render_template("login.html")


@auth_bp.route("/login", methods=["POST"])
def login():
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")

    if not email or not password:
        flash("Enter your email and password.", "error")
        return redirect(url_for("auth.login_page"))

    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password):
        flash("Incorrect email or password.", "error")
        return redirect(url_for("auth.login_page"))

    login_user(user, remember=True)
    return redirect(url_for("dashboard.home"))


@auth_bp.route("/signup", methods=["GET"])
def signup_page():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.home"))
    return render_template("signup.html")


@auth_bp.route("/signup", methods=["POST"])
def signup():
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    confirm = request.form.get("confirm_password", "")

    if not email or not EMAIL_RE.match(email):
        flash("Enter a valid email address.", "error")
        return redirect(url_for("auth.signup_page"))

    if len(password) < 8:
        flash("Password must be at least 8 characters.", "error")
        return redirect(url_for("auth.signup_page"))

    if password != confirm:
        flash("Passwords do not match.", "error")
        return redirect(url_for("auth.signup_page"))

    if User.query.filter_by(email=email).first():
        flash("An account with that email already exists. Try logging in.", "error")
        return redirect(url_for("auth.signup_page"))

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    login_user(user, remember=True)
    flash("Account created. Connect your social accounts to get started.", "success")
    return redirect(url_for("dashboard.home"))


@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login_page"))
