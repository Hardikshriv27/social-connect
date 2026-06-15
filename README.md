# Social Connect

A multi-user dashboard for connecting and posting to Facebook, Instagram,
and YouTube — each user authenticates with their own account via OAuth.

## What changed from the previous version

| Area | Before | Now |
|---|---|---|
| Auth | Hardcoded `APP_USERNAME` / `APP_PASSWORD` in `.env` | Email + password signup/login, hashed passwords, Flask-Login sessions, show/hide password |
| Social accounts | One shared developer token for FB/IG in `.env` | Each user connects their own FB Page, linked IG Business account, and YouTube channel via OAuth |
| Tokens | Single long-lived dev token, no refresh | Per-user tokens stored encrypted in SQLite; FB short-lived → long-lived exchange; YouTube refresh tokens auto-refreshed |
| Data | `users` table didn't exist | SQLite via SQLAlchemy: `users`, `social_accounts` |
| Templates | Duplicate `{% endfor %}` / mismatched `{% if %}` blocks causing "unknown tag 'endfor'" | Rewritten, validated templates (all pass Jinja parse check) |
| Posts | "No posts yet" even with valid data | Per-user FB posts fetched from the connected Page; missing `message` falls back to "Media post (no text)" |
| UI | Basic dashboard | Refreshed design system (`static/css/style.css`), connection status rail, empty/error states with guidance |

## Project structure

```
social-connect/
├── app.py              # App factory, blueprint registration, DB init
├── config.py           # All settings, sourced from environment variables
├── extensions.py       # SQLAlchemy + Flask-Login instances
├── models.py           # User, SocialAccount (encrypted tokens)
├── auth.py             # Signup / login / logout
├── oauth.py            # Facebook+Instagram OAuth, YouTube OAuth, token refresh
├── social_api.py       # Per-user Graph API / YouTube Data API calls
├── dashboard.py         # Dashboard, settings, /post, /debug/token
├── requirements.txt
├── .env.example
├── static/css/style.css
└── templates/
    ├── base.html, login.html, signup.html
    ├── _sidebar.html, index.html, settings.html
```

## Setup

1. **Create a virtual environment and install dependencies**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Copy `.env.example` to `.env` and fill in real values**
   ```bash
   cp .env.example .env
   ```

   Generate two required secrets:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"            # FLASK_SECRET_KEY
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"  # TOKEN_ENCRYPTION_KEY
   ```

3. **Meta (Facebook + Instagram) app setup**
   - Create an app at https://developers.facebook.com/apps with the
     **Facebook Login** product enabled.
   - Add this OAuth redirect URI: `{APP_BASE_URL}/oauth/facebook/callback`
   - Set `META_APP_ID` / `META_APP_SECRET` in `.env`.
   - For Instagram to connect, the user's Facebook Page must have a linked
     **Instagram Business or Creator account** (set up via Meta Business
     Suite). The app discovers it automatically through the Page.
   - During development, your app will be in "Development Mode" — only
     users added as Testers/Developers in the Meta App dashboard can log
     in. Submit for App Review (with the scopes in `META_OAUTH_SCOPES`)
     before allowing the public to connect.

4. **Google (YouTube) OAuth setup**
   - Create OAuth 2.0 credentials (Web application) at
     https://console.cloud.google.com/apis/credentials
   - Add this authorized redirect URI: `{APP_BASE_URL}/oauth/youtube/callback`
   - Enable the **YouTube Data API v3** for the project.
   - Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`.
   - While the app is unverified, only test users added in the OAuth
     consent screen configuration can connect.

5. **Run the app**
   ```bash
   python app.py
   ```
   The SQLite database (`instance/social_connect.db`) and tables are
   created automatically on first run.

6. **Use it**
   - Visit `http://127.0.0.1:5000`, sign up with an email + password.
   - Go to **Settings** and connect Facebook (Instagram links
     automatically if a Business account is attached to the Page) and
     YouTube.
   - Go to **Compose** to write and publish a post. Only platforms you've
     connected can be selected.
   - **Analytics** shows live reach/follower data where the Graph/YouTube
     APIs return it, with clear empty states otherwise.
   - **Posts** shows your Facebook Page's recent posts.

## Token lifecycle

- **Facebook/Instagram**: on connect, the short-lived user token from the
  OAuth code exchange is swapped for a long-lived token (~60 days) and the
  Page access token (which inherits that expiry) is stored with
  `token_expires_at`. There's no silver-bullet "refresh" for Page tokens —
  when `is_expired` becomes true, prompt the user to reconnect via
  Settings (the UI shows a "Needs reconnect" badge once `/debug/token`
  reports the token invalid).
- **YouTube**: Google's `refresh_token` is stored (requested via
  `access_type=offline` + `prompt=consent`). `oauth.get_youtube_credentials`
  transparently refreshes the access token whenever it's expired, so
  uploads keep working without user interaction as long as the refresh
  token remains valid (it's revoked only if the user removes app access
  in their Google account or doesn't use it for 6+ months while in
  testing mode).

## Security notes

- Passwords are hashed with Werkzeug's `generate_password_hash`
  (PBKDF2-SHA256).
- All OAuth tokens are encrypted at rest with Fernet
  (`TOKEN_ENCRYPTION_KEY`) before being written to the database.
- Tokens are never rendered in templates or returned to the frontend;
  `/debug/token` only returns validity/expiry metadata, not the tokens
  themselves.
- Set `FLASK_ENV=production` and serve over HTTPS so
  `SESSION_COOKIE_SECURE` takes effect.
- Uploaded files are written to `UPLOAD_FOLDER`, used for the API call,
  then deleted immediately after.

## Known limitations / next steps

- If a user manages multiple Facebook Pages, the first one returned by
  the Graph API is connected automatically. A Page-picker step would be
  a natural next addition.
- Facebook Page token expiry has no programmatic refresh — reconnecting
  via Settings is the supported flow when `/debug/token` flags it invalid.
- Instagram posting currently supports image posts via public URL only
  (per Graph API requirements); Reels/video publishing would need the
  separate video container flow.
