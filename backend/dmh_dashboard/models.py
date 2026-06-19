"""
DMH KHIS History — fact tables for PowerBI consumption.

Mirrors the CSV schema produced by the khis-extractor:
  analytics: OrgUnit_ID, Period_ID, Value, DataElement, name, Year, Quarter,
             Month, Period_Type, Facility, Country, County, SubCounty, Ward
  reporting: same + Metric, DataSet

`value` kept as CharField — DHIS2 emits floats mixed with occasional text
(e.g. "default", blank). PowerBI casts in Power Query; storing verbatim
avoids silent data loss.

Upsert semantics: latest-state. `as_of_date` intentionally OUT of
unique_together — a re-pull overwrites the same (period) row with the
newest KHIS truth. Older periods not in the extraction are untouched.
"""
from django.db import models


class DmhRefreshLog(models.Model):
    """Tracks each load run for observability."""
    STATUS_CHOICES = [
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]
    TRIGGER_CHOICES = [
        ('cron', 'Cron'),
        ('manual', 'Manual'),
    ]

    profile = models.CharField(max_length=40, db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='running')
    rows_upserted = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, default='')
    trigger = models.CharField(max_length=20, choices=TRIGGER_CHOICES, default='cron')

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.profile} - {self.status} @ {self.started_at}"


class DmhAnalyticsFact(models.Model):
    profile = models.CharField(max_length=40, db_index=True)
    org_unit_id = models.CharField(max_length=20)
    period_id = models.CharField(max_length=10, db_index=True)
    data_element = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=50)
    year = models.IntegerField(null=True, blank=True)
    quarter = models.CharField(max_length=2, blank=True, default='')
    month = models.CharField(max_length=2, blank=True, default='')
    period_type = models.CharField(max_length=20, blank=True, default='')
    facility = models.CharField(max_length=255, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    county = models.CharField(max_length=100, blank=True, default='')
    subcounty = models.CharField(max_length=150, blank=True, default='')
    ward = models.CharField(max_length=150, blank=True, default='')
    as_of_date = models.DateField()

    class Meta:
        unique_together = [
            'org_unit_id', 'period_id', 'data_element', 'name', 'profile'
        ]
        indexes = [
            models.Index(fields=['period_id']),
            models.Index(fields=['county', 'period_id']),
        ]

    def __str__(self):
        return f"{self.profile} | {self.org_unit_id} | {self.period_id}"


class DmhReportingFact(models.Model):
    profile = models.CharField(max_length=40, db_index=True)
    org_unit_id = models.CharField(max_length=20)
    period_id = models.CharField(max_length=10, db_index=True)
    data_element = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=50)
    metric = models.CharField(max_length=50)
    dataset = models.CharField(max_length=255, blank=True, default='')
    year = models.IntegerField(null=True, blank=True)
    quarter = models.CharField(max_length=2, blank=True, default='')
    month = models.CharField(max_length=2, blank=True, default='')
    period_type = models.CharField(max_length=20, blank=True, default='')
    facility = models.CharField(max_length=255, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    county = models.CharField(max_length=100, blank=True, default='')
    subcounty = models.CharField(max_length=150, blank=True, default='')
    ward = models.CharField(max_length=150, blank=True, default='')
    as_of_date = models.DateField()

    class Meta:
        unique_together = [
            'org_unit_id', 'period_id', 'data_element', 'name', 'metric', 'profile'
        ]
        indexes = [
            models.Index(fields=['period_id']),
            models.Index(fields=['county', 'period_id']),
        ]

    def __str__(self):
        return f"{self.profile} | {self.org_unit_id} | {self.period_id} | {self.metric}"
