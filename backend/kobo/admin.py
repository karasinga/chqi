from django.contrib import admin
from .models import RawSubmission, SyncLog

@admin.register(RawSubmission)
class RawSubmissionAdmin(admin.ModelAdmin):
    list_display = ['submission_id', 'facility_name', 'county', 'date_patient_seen', 'visit_type']
    list_filter = ['county', 'visit_type', 'client_sex']
    search_fields = ['facility_name', 'mfl_code', 'submission_id']
    readonly_fields = ['pulled_at', 'raw_payload']


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ['started_at', 'finished_at', 'status', 'triggered_by', 'records_fetched', 'records_inserted', 'records_updated']
    list_filter = ['status', 'triggered_by']
    readonly_fields = [f.name for f in SyncLog._meta.fields]
