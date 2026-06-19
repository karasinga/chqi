from django.contrib import admin

from .models import DmhRefreshLog, DmhAnalyticsFact, DmhReportingFact


@admin.register(DmhRefreshLog)
class DmhRefreshLogAdmin(admin.ModelAdmin):
    list_display = ('profile', 'status', 'rows_upserted', 'started_at', 'completed_at', 'trigger')
    list_filter = ('status', 'profile', 'trigger')
    readonly_fields = ('started_at', 'completed_at')
    ordering = ('-started_at',)


# Fact tables are managed exclusively by the load_dmh_csvs command —
# read-only in admin to prevent manual edits that the next upsert would clobber.
@admin.register(DmhAnalyticsFact)
class DmhAnalyticsFactAdmin(admin.ModelAdmin):
    list_display = ('profile', 'org_unit_id', 'period_id', 'name', 'value', 'county', 'as_of_date')
    list_filter = ('profile', 'period_id', 'county')
    search_fields = ('org_unit_id', 'facility', 'county', 'data_element')
    readonly_fields = [f.name for f in DmhAnalyticsFact._meta.fields]
    ordering = ('-as_of_date',)


@admin.register(DmhReportingFact)
class DmhReportingFactAdmin(admin.ModelAdmin):
    list_display = ('profile', 'org_unit_id', 'period_id', 'metric', 'value', 'county', 'as_of_date')
    list_filter = ('profile', 'period_id', 'metric')
    search_fields = ('org_unit_id', 'facility', 'county', 'data_element', 'dataset')
    readonly_fields = [f.name for f in DmhReportingFact._meta.fields]
    ordering = ('-as_of_date',)
