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


class DmhEchisScreeningData(models.Model):
    location_name = models.CharField(max_length=255)
    metric = models.CharField(max_length=255)
    last_1_month = models.IntegerField(default=0)
    last_month = models.IntegerField(default=0)
    last_3_months = models.IntegerField(default=0)
    last_6_months = models.IntegerField(default=0)
    year_to_date_ytd = models.IntegerField(default=0)
    last_12_months = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.location_name} | {self.metric}"


class DmhKamiliNurse(models.Model):
    s_no = models.IntegerField()
    county = models.CharField(max_length=255)
    work_station = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.county} | {self.work_station}"


class DmhNationalPsychHr(models.Model):
    location = models.CharField(max_length=255)
    mental_health_nurses = models.IntegerField(default=0)
    mental_health_clinical_officers = models.IntegerField(default=0)
    psychiatrist_consultant = models.IntegerField(default=0)

    def __str__(self):
        return self.location


class DmhMergedEchisKhisData(models.Model):
    county = models.CharField(max_length=255)
    sub_county = models.CharField(max_length=255)
    community_unit = models.CharField(max_length=255)
    metric_id = models.CharField(max_length=255)
    period_start = models.DateTimeField()
    sum = models.IntegerField(default=0)
    community_unit_standardized = models.CharField(max_length=255, blank=True, default='')
    community_unit_id = models.CharField(max_length=50, blank=True, default='')
    community_unit_name = models.CharField(max_length=255, blank=True, default='')
    facility_id = models.CharField(max_length=50, blank=True, default='')
    facility_name = models.CharField(max_length=255, blank=True, default='')
    ward = models.CharField(max_length=255, blank=True, default='')
    subcounty = models.CharField(max_length=255, blank=True, default='')
    county_standardized = models.CharField(max_length=255, blank=True, default='')
    country = models.CharField(max_length=255, blank=True, default='')
    is_matched = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.county} | {self.community_unit} | {self.metric_id}"


class DmhAllKhisFacilities(models.Model):
    org_unit_id = models.CharField(max_length=50, primary_key=True)
    facility = models.CharField(max_length=255)
    ward = models.CharField(max_length=255, blank=True, default='')
    subcounty = models.CharField(max_length=255, blank=True, default='')
    county = models.CharField(max_length=255, blank=True, default='')
    country = models.CharField(max_length=255, blank=True, default='')
    name = models.CharField(max_length=255, blank=True, null=True)
    display_name = models.CharField(max_length=255, blank=True, default='')
    facility_type = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return self.facility


class DmhEchisScreeningReferral(models.Model):
    county = models.CharField(max_length=255)
    sub_county = models.CharField(max_length=255)
    community_unit = models.CharField(max_length=255)
    metric_id = models.CharField(max_length=255)
    period_start = models.DateTimeField()
    sum = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.county} | {self.community_unit} | {self.metric_id}"


class DmhAllFacilitiesWithCuInfo(models.Model):
    org_unit_id = models.CharField(max_length=50, primary_key=True)
    facility = models.CharField(max_length=255)
    ward = models.CharField(max_length=255, blank=True, default='')
    subcounty = models.CharField(max_length=255, blank=True, default='')
    county = models.CharField(max_length=255, blank=True, default='')
    country = models.CharField(max_length=255, blank=True, default='')
    cu_status = models.CharField(max_length=255, blank=True, default='')
    cu_count = models.IntegerField(default=0)
    community_units_list = models.TextField(blank=True, null=True)
    has_cus = models.BooleanField(default=False)

    def __str__(self):
        return self.facility


class DmhCuFacilityMapping(models.Model):
    community_unit_id = models.CharField(max_length=50)
    community_unit_name = models.CharField(max_length=255)
    facility_id = models.CharField(max_length=50)
    facility_name = models.CharField(max_length=255)
    ward = models.CharField(max_length=255, blank=True, default='')
    subcounty = models.CharField(max_length=255, blank=True, default='')
    county = models.CharField(max_length=255, blank=True, default='')
    country = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return f"{self.community_unit_name} -> {self.facility_name}"
