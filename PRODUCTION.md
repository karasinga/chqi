# 🚀 CHQI Dashboard — Go-Production Cheatsheet

> **Stack:** Django 6 (DRF) · React 18 (Vite) · SQLite → PostgreSQL · Nginx · Gunicorn

---

## 1. Environment Variables

Create a `.env` file in `backend/` (never commit this) or set these as system/server env vars.

```env
# ── Django ────────────────────────────────────────────────────────────────────
DJANGO_SECRET_KEY=replace-with-50+-random-chars   # generate: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
DJANGO_DEBUG=False

# ── Database (PostgreSQL) ─────────────────────────────────────────────────────
DB_ENGINE=django.db.backends.postgresql
DB_NAME=chqi_db
DB_USER=chqi_user
DB_PASSWORD=strong-db-password
DB_HOST=localhost
DB_PORT=5432

# ── Email (SMTP) ──────────────────────────────────────────────────────────────
EMAIL_USE_SMTP=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@chqi.org
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=CHQI Dashboard <noreply@chqi.org>

# ── Frontend URL (used in password-reset links) ───────────────────────────────
FRONTEND_URL=https://yourdomain.com
```

---

## 2. Backend — settings.py Production Checklist

Open `backend/config/settings.py` and apply the following before deploying:

### 2a. Swap SQLite → PostgreSQL

Replace the `DATABASES` block:

```python
import os

DATABASES = {
    'default': {
        'ENGINE': os.environ.get('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.environ.get('DB_NAME', BASE_DIR / 'db.sqlite3'),
        'USER': os.environ.get('DB_USER', ''),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', ''),
        'PORT': os.environ.get('DB_PORT', ''),
    }
}
```

Install the driver:
```bash
pip install psycopg2-binary
```

### 2b. ALLOWED_HOSTS

```python
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']
```

### 2c. CORS / CSRF Origins

```python
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
]
CSRF_TRUSTED_ORIGINS = [
    "https://yourdomain.com",
]
```

### 2d. Static Files

```python
STATIC_ROOT = BASE_DIR / 'staticfiles'
```

Then run:
```bash
python manage.py collectstatic --noinput
```

### 2e. Password-Reset Redirect (users/urls.py)

The redirect URLs currently point to `http://localhost:5173`. Update these lambdas:

```python
# users/urls.py — replace localhost references
lambda r, uidb64, token: redirect(f"{settings.FRONTEND_URL}/reset-password/{uidb64}/{token}")
lambda r: redirect(f"{settings.FRONTEND_URL}/login?reset=done")
lambda r: redirect(f"{settings.FRONTEND_URL}/login?reset=complete")
```

### 2f. Secure Cookie Flags (add to settings.py)

```python
# Add these for HTTPS production
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_SSL_REDIRECT = True
```

---

## 3. Frontend — Build for Production

### 3a. Set the API Base URL

Edit `frontend/src/utils/api.js` line 1:

```js
// Change from:
const API_BASE_URL = 'http://localhost:8000/api';

// Change to:
const API_BASE_URL = '/api';   // Nginx will proxy /api → Django
```

Or use an `.env` file in `frontend/`:

```env
VITE_API_BASE_URL=/api
```

And update `api.js`:
```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
```

### 3b. Build

```bash
cd frontend
npm install
npm run build
# Output → frontend/dist/
```

---

## 4. Server Setup (Ubuntu/Debian)

### 4a. Install dependencies

```bash
sudo apt update && sudo apt install -y python3-pip python3-venv nginx postgresql postgresql-contrib
```

### 4b. PostgreSQL database

```bash
sudo -u postgres psql
CREATE DATABASE chqi_db;
CREATE USER chqi_user WITH PASSWORD 'strong-db-password';
ALTER ROLE chqi_user SET client_encoding TO 'utf8';
ALTER ROLE chqi_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE chqi_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE chqi_db TO chqi_user;
\q
```

### 4c. Django setup

```bash
cd /path/to/project/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn psycopg2-binary

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser   # create your admin account
```

### 4d. Gunicorn systemd service

Create `/etc/systemd/system/chqi.service`:

```ini
[Unit]
Description=CHQI Dashboard Gunicorn
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/project/backend
EnvironmentFile=/path/to/project/backend/.env
ExecStart=/path/to/project/backend/venv/bin/gunicorn \
    --workers 3 \
    --bind unix:/run/chqi.sock \
    config.wsgi:application
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable chqi
sudo systemctl start chqi
sudo systemctl status chqi   # verify: "active (running)"
```

---

## 5. Nginx Configuration

Create `/etc/nginx/sites-available/chqi`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 20M;

    # ── React SPA ─────────────────────────────────────────────────────────────
    root /path/to/project/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # SPA fallback — required for React Router
    }

    # ── Django API ────────────────────────────────────────────────────────────
    location /api/ {
        proxy_pass http://unix:/run/chqi.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── Django Admin ──────────────────────────────────────────────────────────
    location /admin/ {
        proxy_pass http://unix:/run/chqi.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── Django Static / Media ─────────────────────────────────────────────────
    location /static/ {
        alias /path/to/project/backend/staticfiles/;
    }

    location /media/ {
        alias /path/to/project/backend/media/;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/chqi /etc/nginx/sites-enabled/
sudo nginx -t          # verify syntax
sudo systemctl reload nginx
```

### SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 6. Final Verification Checklist

Run through this after every deployment:

- [ ] `DJANGO_DEBUG=False` is set in the environment
- [ ] `DJANGO_SECRET_KEY` is a strong, unique random string (not the dev insecure key)
- [ ] `ALLOWED_HOSTS` contains only your real domain(s)
- [ ] `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` use `https://`
- [ ] Password-reset redirect URLs use `FRONTEND_URL` env var (not localhost)
- [ ] `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True` are set
- [ ] `npm run build` completed without errors and `frontend/dist/` is up to date
- [ ] `API_BASE_URL` in `api.js` points to `/api` (not `http://localhost:8000/api`)
- [ ] `collectstatic` has been run and static files are accessible at `/static/`
- [ ] Gunicorn service is active: `sudo systemctl status chqi`
- [ ] Nginx config passes: `sudo nginx -t`
- [ ] SSL certificate is valid and HTTP redirects to HTTPS
- [ ] Django admin accessible at `https://yourdomain.com/admin/`
- [ ] Login works end-to-end and session cookie is `Secure; HttpOnly; SameSite=Lax`
- [ ] Password-reset email arrives and redirect link points to production domain
- [ ] Media file uploads work (researcher photos, etc.)

---

## 7. Quick Redeploy (after code changes)

```bash
# 1. Pull latest
cd /path/to/project
git pull

# 2. Backend — run migrations if any
cd backend
source venv/bin/activate
pip install -r requirements.txt   # if dependencies changed
python manage.py migrate
python manage.py collectstatic --noinput

# 3. Frontend — rebuild
cd ../frontend
npm install                        # if package.json changed
npm run build

# 4. Restart Gunicorn
sudo systemctl restart chqi

# 5. Reload Nginx (only if config changed)
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Key File Reference

| File | What to Change for Production |
|---|---|
| `backend/config/settings.py` | `ALLOWED_HOSTS`, `DATABASES`, `CORS_ALLOWED_ORIGINS`, secure cookie flags |
| `backend/.env` | All secrets — never commit |
| `backend/users/urls.py` | Replace `localhost:5173` redirects with `settings.FRONTEND_URL` |
| `frontend/src/utils/api.js` | `API_BASE_URL` → `/api` |
| `/etc/nginx/sites-available/chqi` | Domain name, SSL cert paths, static/media paths |
| `/etc/systemd/system/chqi.service` | Project path, `EnvironmentFile` path |
