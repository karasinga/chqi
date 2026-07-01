#!/bin/bash
# ─── Kobo Nightly Sync ────────────────────────────────────────────────────────
# Coolify Scheduled Task configuration:
#   Command:  bash pull_kobo.sh
#   Cron:     0 20 * * *   (11 PM EAT / 8 PM UTC)
#
# Nixpacks builds a virtualenv at /opt/venv — confirmed from build logs.
#
# Usage:
#   bash pull_kobo.sh              # Incremental sync (auto-appends --scheduled)
#   bash pull_kobo.sh --full       # Full re-sync (ignores last sync timestamp)
#   bash pull_kobo.sh --scheduled  # Explicit scheduled run (same as no-arg)
#   bash pull_kobo.sh --full --scheduled  # Full sync flagged as scheduled
#
# Flags (passed through to manage.py pull_kobo):
#   --full        Full sync — fetch ALL records, ignoring 2-day incremental window.
#                 Use after schema changes or to repair missing data.
#   --scheduled   Marks run as scheduler-triggered (vs manual). Enables
#                 zero-record alerts and admin email notifications on failure.
#                 Auto-applied when script is called without arguments.
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
