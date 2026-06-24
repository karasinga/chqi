from django.db import migrations


VIEWS_SQL = [
    # 1. v_echis_screening_data
    ("""
    CREATE OR REPLACE VIEW v_echis_screening_data AS
    SELECT
        id,
        location_name AS "Location_name",
        metric AS "Metric",
        last_1_month AS "Last 1 Month",
        last_month AS "Last Month",
        last_3_months AS "Last 3 Months",
        last_6_months AS "Last 6 Months",
        year_to_date_ytd AS "Year to Date (YTD)",
        last_12_months AS "Last 12 months"
    FROM dmh_dashboard_dmhechisscreeningdata;
    """, "DROP VIEW IF EXISTS v_echis_screening_data CASCADE;"),

    # 2. v_kamili_nurse
    ("""
    CREATE OR REPLACE VIEW v_kamili_nurse AS
    SELECT
        id,
        s_no AS "S/No.",
        county AS "County",
        work_station AS "Work Station"
    FROM dmh_dashboard_dmhkamilinurse;
    """, "DROP VIEW IF EXISTS v_kamili_nurse CASCADE;"),

    # 3. v_national_psych_hr
    ("""
    CREATE OR REPLACE VIEW v_national_psych_hr AS
    SELECT
        id,
        location AS "County and National Hospital",
        mental_health_nurses AS "Mental Health Nurses ",
        mental_health_clinical_officers AS "Mental Health Clinical Officers ",
        psychiatrist_consultant AS "Psychiatrist Consultant "
    FROM dmh_dashboard_dmhnationalpsychhr;
    """, "DROP VIEW IF EXISTS v_national_psych_hr CASCADE;"),

    # 4. v_merged_echis_khis_data
    ("""
    CREATE OR REPLACE VIEW v_merged_echis_khis_data AS
    SELECT
        id,
        county AS "county",
        sub_county AS "sub_county",
        community_unit AS "community_unit",
        metric_id AS "metric_id",
        period_start AS "period_start",
        sum AS "sum",
        community_unit_standardized AS "community_unit_standardized",
        community_unit_id AS "CommunityUnit_ID",
        community_unit_name AS "CommunityUnit_Name",
        facility_id AS "Facility_ID",
        facility_name AS "Facility_Name",
        ward AS "Ward",
        subcounty AS "SubCounty",
        county_standardized AS "County",
        country AS "Country",
        is_matched AS "is_matched"
    FROM dmh_dashboard_dmhmergedechiskhisdata;
    """, "DROP VIEW IF EXISTS v_merged_echis_khis_data CASCADE;"),

    # 5. v_all_khis_facilities
    ("""
    CREATE OR REPLACE VIEW v_all_khis_facilities AS
    SELECT
        org_unit_id AS "OrgUnit_ID",
        facility AS "Facility",
        ward AS "Ward",
        subcounty AS "SubCounty",
        county AS "County",
        country AS "Country",
        name AS "name",
        display_name AS "Display Name",
        facility_type AS "Facility Type"
    FROM dmh_dashboard_dmhallkhisfacilities;
    """, "DROP VIEW IF EXISTS v_all_khis_facilities CASCADE;"),

    # 6. v_echis_screening_referral
    ("""
    CREATE OR REPLACE VIEW v_echis_screening_referral AS
    SELECT
        id,
        county AS "county",
        sub_county AS "sub_county",
        community_unit AS "community_unit",
        metric_id AS "metric_id",
        period_start AS "period_start",
        sum AS "sum"
    FROM dmh_dashboard_dmhechisscreeningreferral;
    """, "DROP VIEW IF EXISTS v_echis_screening_referral CASCADE;"),

    # 7. v_all_facilities_with_cu_info
    ("""
    CREATE OR REPLACE VIEW v_all_facilities_with_cu_info AS
    SELECT
        org_unit_id AS "OrgUnit_ID",
        facility AS "Facility",
        ward AS "Ward",
        subcounty AS "SubCounty",
        county AS "County",
        country AS "Country",
        cu_status AS "CU_Status",
        cu_count AS "CU_Count",
        community_units_list AS "CommunityUnits_List",
        has_cus AS "Has_CUs"
    FROM dmh_dashboard_dmhallfacilitieswithcuinfo;
    """, "DROP VIEW IF EXISTS v_all_facilities_with_cu_info CASCADE;"),

    # 8. v_cu_facility_mapping
    ("""
    CREATE OR REPLACE VIEW v_cu_facility_mapping AS
    SELECT
        id,
        community_unit_id AS "CommunityUnit_ID",
        community_unit_name AS "CommunityUnit_Name",
        facility_id AS "Facility_ID",
        facility_name AS "Facility_Name",
        ward AS "Ward",
        subcounty AS "SubCounty",
        county AS "County",
        country AS "Country"
    FROM dmh_dashboard_dmhcufacilitymapping;
    """, "DROP VIEW IF EXISTS v_cu_facility_mapping CASCADE;")
]


class Migration(migrations.Migration):

    dependencies = [
        ('dmh_dashboard', '0006_auto_models'),
    ]

    operations = [
        migrations.RunSQL(
            sql="\n".join(forward for forward, _ in VIEWS_SQL),
            reverse_sql="\n".join(reverse for _, reverse in VIEWS_SQL),
        )
    ]
