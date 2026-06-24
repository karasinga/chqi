import os
import glob
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from dmh_dashboard.models import (
    DmhEchisScreeningData, DmhKamiliNurse, DmhNationalPsychHr,
    DmhMergedEchisKhisData, DmhAllKhisFacilities, DmhEchisScreeningReferral,
    DmhAllFacilitiesWithCuInfo, DmhCuFacilityMapping
)


class Command(BaseCommand):
    help = 'Load auxiliary CSV datasets into PostgreSQL'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dir', type=str, required=True,
            help='Root directory of the KHIS datasets (e.g. .../KHIS data sets)',
        )

    def handle(self, *args, **options):
        base_dir = options['dir']
        if not os.path.exists(base_dir):
            self.stdout.write(self.style.ERROR(f"Directory not found: {base_dir}"))
            return

        # Define file search patterns
        files_map = {
            'screening_data': ('E-CHIS/mental_health_screening_data.csv', DmhEchisScreeningData, self._load_screening_data),
            'kamili_nurse': ('Pysch Nurses/Kamili Nurse.csv', DmhKamiliNurse, self._load_kamili_nurse),
            'psych_hr': ('Pysch Nurses/National psych HR.csv', DmhNationalPsychHr, self._load_psych_hr),
            'merged_data': ('Merged_ECHIS_KHIS/merged_echiscus_and_khisdata.csv', DmhMergedEchisKhisData, self._load_merged_data),
            'khis_facilities': ('KHIS CU/All KHIS Facilities.csv', DmhAllKhisFacilities, self._load_khis_facilities),
            'screening_referral': ('E-CHIS/ncd_mental_health_screening_referral.csv', DmhEchisScreeningReferral, self._load_screening_referral),
            'cu_info': ('KHIS CU/All_Facilities_with_CU_Info_20251106.csv', DmhAllFacilitiesWithCuInfo, self._load_cu_info),
            'cu_mapping': ('KHIS CU/CU_Facility_Mapping_20251106_071548.csv', DmhCuFacilityMapping, self._load_cu_mapping),
        }

        for name, (rel_path, model, load_func) in files_map.items():
            # Try to resolve path (case-insensitive glob search)
            pattern = os.path.join(base_dir, '**', os.path.basename(rel_path))
            discovered = glob.glob(pattern, recursive=True)
            if not discovered:
                self.stdout.write(self.style.WARNING(f"File not found for pattern: {pattern}"))
                continue

            filepath = discovered[0]
            self.stdout.write(f"Loading {filepath} into {model.__name__}...")

            try:
                df = pd.read_csv(filepath, low_memory=False)
                # Strip spaces from column headers
                df.columns = [c.strip() for c in df.columns]

                with transaction.atomic():
                    # Clear existing data for static backfill
                    model.objects.all().delete()
                    load_func(df)

                self.stdout.write(self.style.SUCCESS(f"  Successfully loaded {len(df)} rows."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Failed to load {filepath}: {e}"))

    def _load_screening_data(self, df):
        # Columns: ['Location_name', 'Metric', 'Last 1 Month', 'Last Month', 'Last 3 Months', 'Last 6 Months', 'Year to Date (YTD)', 'Last 12 months']
        objs = [
            DmhEchisScreeningData(
                location_name=row['Location_name'],
                metric=row['Metric'],
                last_1_month=int(row.get('Last 1 Month', 0)),
                last_month=int(row.get('Last Month', 0)),
                last_3_months=int(row.get('Last 3 Months', 0)),
                last_6_months=int(row.get('Last 6 Months', 0)),
                year_to_date_ytd=int(row.get('Year to Date (YTD)', 0)),
                last_12_months=int(row.get('Last 12 months', 0))
            )
            for _, row in df.iterrows()
        ]
        DmhEchisScreeningData.objects.bulk_create(objs)

    def _load_kamili_nurse(self, df):
        # Columns: ['S/No.', 'County', 'Work Station']
        objs = [
            DmhKamiliNurse(
                s_no=int(row['S/No.']),
                county=row['County'],
                work_station=row['Work Station']
            )
            for _, row in df.iterrows()
        ]
        DmhKamiliNurse.objects.bulk_create(objs)

    def _load_psych_hr(self, df):
        # Columns: ['County and National Hospital', 'Mental Health Nurses', 'Mental Health Clinical Officers', 'Psychiatrist Consultant']
        objs = [
            DmhNationalPsychHr(
                location=row['County and National Hospital'],
                mental_health_nurses=int(row.get('Mental Health Nurses', 0)),
                mental_health_clinical_officers=int(row.get('Mental Health Clinical Officers', 0)),
                psychiatrist_consultant=int(row.get('Psychiatrist Consultant', 0))
            )
            for _, row in df.iterrows()
        ]
        DmhNationalPsychHr.objects.bulk_create(objs)

    def _load_merged_data(self, df):
        # Convert period_start to datetime (format is e.g. '2025-01-01 00:00:00+00')
        df['period_start'] = pd.to_datetime(df['period_start'])
        objs = [
            DmhMergedEchisKhisData(
                county=row['county'],
                sub_county=row['sub_county'],
                community_unit=row['community_unit'],
                metric_id=row['metric_id'],
                period_start=row['period_start'],
                sum=int(row['sum']) if pd.notnull(row['sum']) else 0,
                community_unit_standardized=row.get('community_unit_standardized', ''),
                community_unit_id=row.get('CommunityUnit_ID', ''),
                community_unit_name=row.get('CommunityUnit_Name', ''),
                facility_id=row.get('Facility_ID', ''),
                facility_name=row.get('Facility_Name', ''),
                ward=row.get('Ward', ''),
                subcounty=row.get('SubCounty', ''),
                county_standardized=row.get('County', ''),
                country=row.get('Country', ''),
                is_matched=bool(row.get('is_matched', False))
            )
            for _, row in df.where(df.notnull(), None).iterrows()
        ]
        DmhMergedEchisKhisData.objects.bulk_create(objs)

    def _load_khis_facilities(self, df):
        objs = [
            DmhAllKhisFacilities(
                org_unit_id=row['OrgUnit_ID'],
                facility=row['Facility'],
                ward=row.get('Ward', ''),
                subcounty=row.get('SubCounty', ''),
                county=row.get('County', ''),
                country=row.get('Country', ''),
                name=row.get('name'),
                display_name=row.get('Display Name', ''),
                facility_type=row.get('Facility Type', '')
            )
            for _, row in df.where(df.notnull(), None).iterrows()
        ]
        DmhAllKhisFacilities.objects.bulk_create(objs)

    def _load_screening_referral(self, df):
        df['period_start'] = pd.to_datetime(df['period_start'])
        objs = [
            DmhEchisScreeningReferral(
                county=row['county'],
                sub_county=row['sub_county'],
                community_unit=row['community_unit'],
                metric_id=row['metric_id'],
                period_start=row['period_start'],
                sum=int(row['sum']) if pd.notnull(row['sum']) else 0
            )
            for _, row in df.where(df.notnull(), None).iterrows()
        ]
        DmhEchisScreeningReferral.objects.bulk_create(objs)

    def _load_cu_info(self, df):
        objs = [
            DmhAllFacilitiesWithCuInfo(
                org_unit_id=row['OrgUnit_ID'],
                facility=row['Facility'],
                ward=row.get('Ward', ''),
                subcounty=row.get('SubCounty', ''),
                county=row.get('County', ''),
                country=row.get('Country', ''),
                cu_status=row.get('CU_Status', ''),
                cu_count=int(row.get('CU_Count', 0)),
                community_units_list=row.get('CommunityUnits_List'),
                has_cus=bool(row.get('Has_CUs', False))
            )
            for _, row in df.where(df.notnull(), None).iterrows()
        ]
        DmhAllFacilitiesWithCuInfo.objects.bulk_create(objs)

    def _load_cu_mapping(self, df):
        objs = [
            DmhCuFacilityMapping(
                community_unit_id=row['CommunityUnit_ID'],
                community_unit_name=row['CommunityUnit_Name'],
                facility_id=row['Facility_ID'],
                facility_name=row['Facility_Name'],
                ward=row.get('Ward', ''),
                subcounty=row.get('SubCounty', ''),
                county=row.get('County', ''),
                country=row.get('Country', '')
            )
            for _, row in df.where(df.notnull(), None).iterrows()
        ]
        DmhCuFacilityMapping.objects.bulk_create(objs)
