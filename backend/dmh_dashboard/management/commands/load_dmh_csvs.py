"""
Load KHIS extraction CSVs into dmh_dashboard fact tables.

Two modes:
  --dir DIR          incremental: newest timestamped CSV per profile per type
                     (recursive scan of dated subfolders)
  --master-dir DIR   one-time backfill: historical master CSVs whose filenames
                     don't carry the profile label (mapped via MASTER_PROFILE_MAP)

Both may be passed simultaneously; files are deduped by profile (newest mtime wins)
so re-runs are idempotent.

Profile inference:
  - Timestamped extraction CSVs: substring match on VALID_PROFILES
    (ported from extractor's _infer_profile_label)
  - Master CSVs: MASTER_PROFILE_MAP (reverse of extractor's ANALYTICS/REPORTING_MASTERS)
"""
import glob
import logging
import os
from collections import defaultdict
from datetime import date

import pandas as pd
from django.core.management.base import BaseCommand
from django.utils import timezone

from dmh_dashboard.loaders import (
    READ_CSV_DTYPE, upsert_analytics, upsert_reporting,
)
from dmh_dashboard.models import DmhRefreshLog

logger = logging.getLogger(__name__)

# Profiles whose label appears verbatim in timestamped extraction filenames.
# Order matters: longest first so "moh_705_744a" wins over a hypothetical "moh_705".
VALID_PROFILES = [
    "moh_705_744a", "moh_717", "moh_647", "moh_515",
    "morbidity", "referrals",
]


def infer_profile(filename):
    """Substring match against VALID_PROFILES. Returns None if no match."""
    lower = os.path.basename(filename).lower()
    for p in VALID_PROFILES:
        if p in lower:
            return p
    return None


def infer_master_profile(filename):
    """
    Master CSVs use human-readable names with no profile label.
    Map by distinctive substring. Returns (profile, type) or None.
    Keys must be lowercase; matched against the lowercased filename.
    """
    lower = os.path.basename(filename).lower()
    for needle, mapping in MASTER_PROFILE_MAP.items():
        if needle in lower:
            return mapping
    return None


# (profile, data_type) keyed by distinctive filename substring.
# data_type: 'analytics' | 'reporting'
# Mirrors the ANALYTICS_MASTERS / REPORTING_MASTERS dicts in the extractor's
# update_powerbi_datasets.py — keep in sync if filenames change.
MASTER_PROFILE_MAP = {
    # ── Analytics masters ───────────────────────────────────────────────
    "moh 717 inpatient":           ("moh_717", "analytics"),
    "moh 705a_b_744a":             ("moh_705_744a", "analytics"),
    "moh 647.csv":                 ("moh_647", "analytics"),
    "moh_515 referred":            ("moh_515", "analytics"),
    "mental health reporting summary version 2023.csv": ("morbidity", "analytics"),
    "referrals.csv":               ("referrals", "analytics"),
    # ── Reporting masters ───────────────────────────────────────────────
    "reportingrates_detailed_facility_moh_717.csv":      ("moh_717", "reporting"),
    "reportingrates_detailed_facility_moh_705":          ("moh_705_744a", "reporting"),
    "reportingrates_detailed_facility_moh_647.csv":      ("moh_647", "reporting"),
    "reportingrates_detailed_facility_moh_515.csv":      ("moh_515", "reporting"),
    "reportingrates_detailed_facility_morbidity.csv":    ("morbidity", "reporting"),
    "reportingrates_detailed_facility_moh_711.csv":      ("referrals", "reporting"),
}


class Command(BaseCommand):
    help = 'Load DMH KHIS CSVs into Postgres history tables (upsert, idempotent)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dir', type=str,
            help='Root directory containing dated subfolders of timestamped extraction CSVs',
        )
        parser.add_argument(
            '--master-dir', type=str,
            help='Directory of historical master CSVs (backfill). Recursively scanned.',
        )
        parser.add_argument(
            '--profile', type=str,
            help='Only load a specific profile (e.g. moh_717)',
        )
        parser.add_argument(
            '--as-of', type=str,
            help='Override as_of_date (YYYY-MM-DD). Defaults to today.',
        )
        parser.add_argument(
            '--trigger', type=str, default='manual',
            choices=['cron', 'manual'],
            help='Label for DmhRefreshLog.trigger (default: manual)',
        )

    def handle(self, *args, **options):
        as_of_date = date.fromisoformat(options['as_of']) if options['as_of'] else date.today()
        target_profile = options.get('profile')
        trigger = options.get('trigger')

        # Collect (profile, data_type) -> [filepaths]
        discovered = defaultdict(list)

        if options.get('dir'):
            self._discover_timestamped(options['dir'], discovered)

        if options.get('master_dir'):
            self._discover_masters(options['master_dir'], discovered)

        if not discovered:
            self.stdout.write(self.style.WARNING('No CSV files found.'))
            return

        total = 0
        for (profile, data_type), files in discovered.items():
            if target_profile and profile != target_profile:
                continue
            # Dedupe: newest mtime wins per (profile, type)
            latest = max(files, key=os.path.getmtime)
            total += self._process_file(latest, profile, data_type, as_of_date, trigger)

        self.stdout.write(self.style.SUCCESS(
            f'Finished. Total rows upserted: {total} (as_of={as_of_date})'
        ))

    # ── Discovery ────────────────────────────────────────────────────────

    def _discover_timestamped(self, base_dir, discovered):
        """Recursive glob, case-insensitive type filter (Linux-safe)."""
        all_csvs = glob.glob(os.path.join(base_dir, '**', '*.csv'), recursive=True)
        for f in all_csvs:
            lower = f.lower()
            if 'reporting_rates' in lower or 'reporting rates' in lower:
                data_type = 'reporting'
            elif 'analytics' in lower:
                data_type = 'analytics'
            else:
                continue  # ignore non-extraction CSVs (e.g. stray masters)
            profile = infer_profile(f)
            if profile:
                discovered[(profile, data_type)].append(f)

    def _discover_masters(self, base_dir, discovered):
        """Recursive scan for master-named CSVs."""
        all_csvs = glob.glob(os.path.join(base_dir, '**', '*.csv'), recursive=True)
        for f in all_csvs:
            mapping = infer_master_profile(f)
            if mapping:
                discovered[mapping].append(f)

    # ── Processing ───────────────────────────────────────────────────────

    def _process_file(self, filepath, profile, data_type, as_of_date, trigger):
        log = DmhRefreshLog.objects.create(
            profile=profile, status='running', trigger=trigger,
        )
        self.stdout.write(f"Loading {filepath}  (profile={profile}, type={data_type})...")

        try:
            df = pd.read_csv(filepath, low_memory=False, dtype=READ_CSV_DTYPE)
        except Exception as exc:
            logger.exception("Failed to read %s", filepath)
            log.status = 'failed'
            log.error_message = f"read_csv: {exc}"
            log.completed_at = timezone.now()
            log.save()
            self.stdout.write(self.style.ERROR(f"  read failed: {exc}"))
            return 0

        if df.empty:
            log.status = 'success'
            log.rows_upserted = 0
            log.completed_at = timezone.now()
            log.save()
            self.stdout.write(self.style.WARNING('  empty CSV, skipped'))
            return 0

        try:
            if data_type == 'reporting':
                rows = upsert_reporting(df, profile, as_of_date, log=log)
            else:
                rows = upsert_analytics(df, profile, as_of_date, log=log)
        except Exception as exc:
            logger.exception("Upsert failed for %s", filepath)
            log.status = 'failed'
            log.error_message = str(exc)
            log.completed_at = timezone.now()
            log.save()
            self.stdout.write(self.style.ERROR(f"  upsert failed: {exc}"))
            return 0

        self.stdout.write(self.style.SUCCESS(f"  upserted {rows} rows for {profile}"))
        return rows
