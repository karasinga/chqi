from django.db import migrations

# Reusable SQL template — one view per analytics profile.
VIEW_TEMPLATE = """
CREATE OR REPLACE VIEW {view_name} AS
SELECT
    org_unit_id  AS "OrgUnit_ID",
    period_id::bigint     AS "Period_ID",
    value::numeric::bigint AS "Value",
    data_element          AS "DataElement",
    name                  AS "name",
    year::bigint          AS "Year",
    quarter               AS "Quarter",
    NULLIF(month, '')::bigint  AS "Month",
    period_type           AS "Period_Type",
    facility              AS "Facility",
    country               AS "Country",
    county                AS "County",
    subcounty             AS "SubCounty",
    ward                  AS "Ward"
FROM dmh_dashboard_dmhanalyticsfact
WHERE profile = '{profile}';
"""

ANALYTICS_VIEWS = [
    ("v_analytics_moh_717",      "moh_717"),
    ("v_analytics_moh_705_744a", "moh_705_744a"),
    ("v_analytics_moh_647",      "moh_647"),
    ("v_analytics_moh_515",      "moh_515"),
    ("v_analytics_moh_711",      "referrals"),
    ("v_analytics_morbidity",    "morbidity"),
]


class Migration(migrations.Migration):

    dependencies = [
        ('dmh_dashboard', '0002_reporting_views'),
    ]

    operations = [
        migrations.RunSQL(
            sql="\n".join(
                VIEW_TEMPLATE.format(view_name=v, profile=p)
                for v, p in ANALYTICS_VIEWS
            ),
            reverse_sql="\n".join(
                f'DROP VIEW IF EXISTS {v} CASCADE;'
                for v, _ in ANALYTICS_VIEWS
            ),
        ),
    ]
