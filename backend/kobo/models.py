from django.db import models

class RawSubmission(models.Model):
    submission_id       = models.CharField(max_length=50, unique=True, db_index=True)
    submission_uuid     = models.UUIDField(null=True, blank=True)
    facility_name       = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    county              = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    subcounty           = models.CharField(max_length=150, null=True, blank=True)
    mfl_code            = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    client_sex          = models.CharField(max_length=10, null=True, blank=True)
    client_age          = models.IntegerField(null=True, blank=True)
    visit_type          = models.CharField(max_length=50, null=True, blank=True)
    conditions_reported = models.TextField(null=True, blank=True)
    date_patient_seen   = models.DateField(null=True, blank=True, db_index=True)
    kobo_submission_time = models.DateTimeField(null=True, blank=True)
    kobo_last_modified  = models.DateTimeField(null=True, blank=True)
    pulled_at           = models.DateTimeField(auto_now_add=True)
    raw_payload         = models.JSONField()

    class Meta:
        db_table = 'kobo.raw_submissions'
        ordering = ['-date_patient_seen']

    def __str__(self):
        return f"{self.submission_id} - {self.facility_name or 'Unknown Facility'}"


class SyncLog(models.Model):
    started_at      = models.DateTimeField(auto_now_add=True)
    finished_at     = models.DateTimeField(null=True, blank=True)
    status          = models.CharField(max_length=20, default='running')
    triggered_by    = models.CharField(max_length=20, default='scheduler')
    records_fetched = models.IntegerField(default=0)
    records_inserted = models.IntegerField(default=0)
    records_updated = models.IntegerField(default=0)
    error_message   = models.TextField(null=True, blank=True)
    mapping_warnings = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'kobo.sync_log'
        ordering = ['-started_at']

    def __str__(self):
        return f"Sync at {self.started_at} ({self.status})"
