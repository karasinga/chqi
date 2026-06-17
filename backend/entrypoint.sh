#!/bin/bash
set -e          # Exit immediately if any command fails
set -o pipefail # Catch errors in pipes

# ─── Wait for Postgres ────────────────────────────────────────────────────────
# If DB_HOST is empty but DATABASE_URL is set, extract host and port from it
if [ -z "$DB_HOST" ] && [ -n "$DATABASE_URL" ]; then
  # Extract host and port from format: postgres://user:password@host:port/dbname
  # Remove protocol prefix
  TEMP="${DATABASE_URL#*//}"
  # Remove auth prefix (everything before @)
  TEMP="${TEMP#*@}"
  # Remove path suffix (everything after /)
  TEMP="${TEMP%%/*}"
  
  # Check if port is explicitly provided
  if [[ "$TEMP" == *":"* ]]; then
    DB_HOST="${TEMP%%:*}"
    DB_PORT="${TEMP##*:}"
  else
    DB_HOST="$TEMP"
    DB_PORT=5432
  fi
fi

if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
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
else
  echo "No explicit DB_HOST or DATABASE_URL found to check. Proceeding directly..."
fi


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
  --bind 0.0.0.0:8080 \
  --workers 2 \
  --timeout 120 \
  --log-level info
