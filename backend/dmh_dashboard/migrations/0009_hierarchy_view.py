from django.db import connection, migrations


def _is_postgres():
    try:
        return connection.vendor == 'postgresql'
    except Exception:
        return False


_RUN_ON_POSTGRES = _is_postgres()

VIEWS_SQL = [
    # v_facility_hierarchy
    ("""
    CREATE OR REPLACE VIEW v_facility_hierarchy AS
    SELECT
        org_unit_id AS "OrgUnit_ID",
        org_unit_code AS "OrgUnit_Code",
        facility AS "Facility",
        country AS "Country",
        country_code AS "Country_Code",
        county AS "County",
        county_code AS "County_Code",
        subcounty AS "SubCounty",
        subcounty_code AS "SubCounty_Code",
        ward AS "Ward",
        ward_code AS "Ward_Code"
    FROM dmh_dashboard_dmhfacilityhierarchy;
    """, "DROP VIEW IF EXISTS v_facility_hierarchy CASCADE;"),
]


class Migration(migrations.Migration):

    dependencies = [
        ('dmh_dashboard', '0008_dmhfacilityhierarchy'),
    ]

    operations = [
        migrations.RunSQL(
            sql="\n".join(forward for forward, _ in VIEWS_SQL),
            reverse_sql="\n".join(reverse for _, reverse in VIEWS_SQL),
        )
    ] if _RUN_ON_POSTGRES else []
