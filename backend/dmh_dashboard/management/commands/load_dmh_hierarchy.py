"""
Load facility hierarchy CSV into DmhFacilityHierarchy table (upsert).

Usage:
    python manage.py load_dmh_hierarchy --file path/to/hierarchy_facility_with_code.csv

Idempotent — re-running the same file upserts by org_unit_id.
"""
import logging

import pandas as pd
from django.core.management.base import BaseCommand

from dmh_dashboard.loaders import upsert_facility_hierarchy

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Load facility hierarchy CSV into DmhFacilityHierarchy (upsert, idempotent)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file', type=str, required=True,
            help='Path to hierarchy_facility_with_code.csv',
        )

    def handle(self, *args, **options):
        filepath = options['file']
        self.stdout.write(f"Reading {filepath}...")

        df = pd.read_csv(filepath, low_memory=False, dtype=str)

        if df.empty:
            self.stdout.write(self.style.WARNING('CSV is empty, nothing to load.'))
            return

        self.stdout.write(f"Read {len(df)} rows. Upserting...")

        try:
            total = upsert_facility_hierarchy(df)
        except Exception as exc:
            logger.exception("Facility hierarchy upsert failed")
            self.stdout.write(self.style.ERROR(f"Upsert failed: {exc}"))
            return

        self.stdout.write(self.style.SUCCESS(
            f"Done. {total} rows upserted into DmhFacilityHierarchy."
        ))
