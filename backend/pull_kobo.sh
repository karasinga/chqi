#!/bin/bash
# ─── Kobo Nightly Sync ────────────────────────────────────────────────────────
# Coolify Scheduled Task configuration:
#   Command:  bash pull_kobo.sh
#   Cron:     0 20 * * *   (11 PM EAT / 8 PM UTC)
#
# Nixpacks builds a virtualenv at /opt/venv — confirmed from build logs.
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "=== Kobo Nightly Sync ==="
echo "Started at: $(date)"

# Nixpacks installs all packages into /opt/venv — use that Python directly.
PYTHON=/opt/venv/bin/python

if [ ! -f "$PYTHON" ]; then
    echo "ERROR: $PYTHON not found. Falling back to system python3..."
    PYTHON=$(which python3 || which python)
fi

echo "Using: $PYTHON ($($PYTHON --version 2>&1))"

if [ $# -eq 0 ]; then
    $PYTHON manage.py pull_kobo --scheduled
else
    $PYTHON manage.py pull_kobo "$@"
fi

echo "Finished at: $(date)"
