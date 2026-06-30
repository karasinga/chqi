#!/bin/bash
# ─── Kobo Nightly Sync ────────────────────────────────────────────────────────
# Coolify Scheduled Task configuration:
#   Command:  bash pull_kobo.sh
#   Cron:     0 20 * * *   (11 PM EAT / 8 PM UTC)
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "=== Kobo Nightly Sync ==="
echo "Started at: $(date)"
echo ""

# ─── Find the right Python (the one that has Django installed) ────────────────
echo "--- Python diagnostic ---"
echo "PATH: $PATH"
echo "which python:  $(which python  2>/dev/null || echo 'not found')"
echo "which python3: $(which python3 2>/dev/null || echo 'not found')"
echo ""

# Try to find Python with Django installed — check common Nixpacks/Docker paths
PYTHON=""
for candidate in \
    python \
    python3 \
    /usr/local/bin/python3 \
    /usr/local/bin/python \
    /usr/bin/python3 \
    /usr/bin/python \
    /nix/var/nix/profiles/default/bin/python3 \
    /nix/store/*/bin/python3; do
    if command -v "$candidate" &>/dev/null 2>&1; then
        if "$candidate" -c "import django" &>/dev/null 2>&1; then
            PYTHON="$candidate"
            echo "Using Python: $PYTHON ($(${PYTHON} --version 2>&1))"
            break
        else
            echo "Skip $candidate — django not available"
        fi
    fi
done

if [ -z "$PYTHON" ]; then
    echo "ERROR: Could not find a Python interpreter with Django installed."
    echo "Please check the container build logs."
    exit 1
fi

echo ""
echo "Running: $PYTHON manage.py pull_kobo --scheduled"
$PYTHON manage.py pull_kobo --scheduled

echo ""
echo "Finished at: $(date)"

