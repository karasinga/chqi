"""
CSV → DB upsert using Django ORM bulk_create(update_conflicts=True).

Single path, works on both SQLite (dev) and PostgreSQL (prod). No raw SQL,
no psycopg2 dependency in this layer.

Performance: builds model instances from vectorized dict-records
(df.to_dict('records')) instead of row-by-row iterrows() — ~50x faster on
500k+ row files. NaN handling: cast to object + replace with None universally
so psycopg2/SQLite write SQL NULL. The Value column is read as str at ingest
time (READ_CSV_DTYPE) so DHIS2 dirty text survives verbatim.
"""
import logging

import pandas as pd
from django.db import transaction
from django.utils import timezone

from .models import DmhAnalyticsFact, DmhReportingFact, DmhRefreshLog

logger = logging.getLogger(__name__)

# CSV column -> model field
ANALYTICS_MAP = {
    'OrgUnit_ID': 'org_unit_id',
    'Period_ID': 'period_id',
    'DataElement': 'data_element',
    'name': 'name',
    'Value': 'value',
    'Year': 'year',
    'Quarter': 'quarter',
    'Month': 'month',
    'Period_Type': 'period_type',
    'Facility': 'facility',
    'Country': 'country',
    'County': 'county',
    'SubCounty': 'subcounty',
    'Ward': 'ward',
}

REPORTING_MAP = {
    **ANALYTICS_MAP,
    'Metric': 'metric',
    'DataSet': 'dataset',
}

# read_csv dtype override — keeps DHIS2 dirty Value as text verbatim.
READ_CSV_DTYPE = {'Value': str}


def _clean_df(df):
    """Cast all columns to object, NaN -> Python None (DB NULL)."""
    return df.astype(object).where(pd.notnull(df), None)


def _records(df, mapping, profile, as_of_date):
    """
    Vectorized: rename CSV columns to model fields and return a list of
    plain dicts, one per row, ready to splat into a model constructor.

    NaN already converted to None by _clean_df. CharField columns are
    coerced None -> '' (their model default) because passing None explicitly
    bypasses the default and trips NOT NULL constraints. IntegerField 'year'
    stays None (null=True) or is int()-cast.
    """
    renamed = df[list(mapping.keys())].rename(columns=mapping)
    recs = renamed.to_dict('records')
    for r in recs:
        r['profile'] = profile
        r['as_of_date'] = as_of_date
        for k, v in r.items():
            if v is None and k != 'year':
                r[k] = ''
        if r.get('year') is not None:
            r['year'] = int(r['year'])
    return recs


def upsert_analytics(df, profile, as_of_date, log=None, chunksize=5000):
    """Upsert analytics rows. Updates refresh log if provided."""
    df = _clean_df(df)
    recs = _records(df, ANALYTICS_MAP, profile, as_of_date)
    total = 0
    # Single transaction: avoids per-chunk autocommit (disk sync storm),
    # especially on SQLite. All-or-nothing per file.
    with transaction.atomic():
        for i in range(0, len(recs), chunksize):
            chunk = [DmhAnalyticsFact(**r) for r in recs[i:i + chunksize]]
            DmhAnalyticsFact.objects.bulk_create(
                chunk,
                update_conflicts=True,
                unique_fields=['org_unit_id', 'period_id', 'data_element', 'name', 'profile'],
                update_fields=[
                    'value', 'year', 'quarter', 'month', 'period_type',
                    'facility', 'country', 'county', 'subcounty', 'ward', 'as_of_date',
                ],
            )
            total += len(chunk)

    if log is not None:
        log.rows_upserted = total
        log.status = 'success'
        log.completed_at = timezone.now()
        log.save()
    return total


def upsert_reporting(df, profile, as_of_date, log=None, chunksize=5000):
    """Upsert reporting-rate rows. Updates refresh log if provided."""
    df = _clean_df(df)
    recs = _records(df, REPORTING_MAP, profile, as_of_date)
    total = 0
    with transaction.atomic():
        for i in range(0, len(recs), chunksize):
            chunk = [DmhReportingFact(**r) for r in recs[i:i + chunksize]]
            DmhReportingFact.objects.bulk_create(
                chunk,
                update_conflicts=True,
                unique_fields=[
                    'org_unit_id', 'period_id', 'data_element', 'name', 'metric', 'profile',
                ],
                update_fields=[
                    'value', 'dataset', 'year', 'quarter', 'month', 'period_type',
                    'facility', 'country', 'county', 'subcounty', 'ward', 'as_of_date',
                ],
            )
            total += len(chunk)

    if log is not None:
        log.rows_upserted = total
        log.status = 'success'
        log.completed_at = timezone.now()
        log.save()
    return total
