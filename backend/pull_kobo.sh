#!/bin/bash
# ─── Kobo Nightly Sync ────────────────────────────────────────────────────────
# This script is intended to be called by Coolify Scheduled Tasks.
# It mirrors the same environment that entrypoint.sh uses (no virtualenv needed;
# Python is on PATH after the Nixpacks/Docker build).
#
# Coolify Scheduled Task configuration:
#   Command:  bash pull_kobo.sh
#   Cron:     0 20 * * *   (11 PM EAT / 8 PM UTC)
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "=== Kobo Nightly Sync ==="
echo "Started at: $(date)"

python manage.py pull_kobo --scheduled

echo "Finished at: $(date)"
