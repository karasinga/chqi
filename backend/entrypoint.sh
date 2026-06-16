#!/bin/bash
set -e          # Exit immediately if any command fails
set -o pipefail # Catch errors in pipes

# ─── Wait for Postgres ────────────────────────────────────────────────────────
MAX_RETRIES=30
RETRY_COUNT=0

echo "Waiting for postgres at ${DB_HOST}:${DB_PORT}..."

while ! bash -c "echo > /dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Postgres not ready after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "  Waiting for postgres... attempt $RETRY_COUNT/$MAX_RETRIES"
  sleep 2
done

echo "Postgres is ready!"

# ─── Django Setup ─────────────────────────────────────────────────────────────
echo "Running migrations..."
python manage.py migrate --noinput

echo "Creating superuser if none exists..."
python manage.py createsuperuser_if_none

echo "Collecting static files..."
python manage.py collectstatic --noinput

# ─── Start Production Server ──────────────────────────────────────────────────
echo "Starting gunicorn..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 120 \
  --log-level info
