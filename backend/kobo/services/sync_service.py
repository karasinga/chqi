import logging
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from kobo.models import RawSubmission, SyncLog
from .kobo_client import KoboClient
from .data_mapper import map_submission, validate_mapping

logger = logging.getLogger(__name__)

class SyncService:
    def run(self, triggered_by='scheduler', force_full=False):
        log = SyncLog.objects.create(triggered_by=triggered_by)
        
        client = KoboClient()
        inserted = 0
        updated = 0
        fetched = 0
        mapping_warnings = []
        
        try:
            since = None
            if not force_full:
                # Determine incremental window (2-day safety net to catch late edits/updates)
                last_log = SyncLog.objects.filter(status='success').order_by('-finished_at').first()
                if last_log and last_log.finished_at:
                    since = (last_log.finished_at - timedelta(days=2)).isoformat()
            
            logger.info(f"Starting Kobo data sync. Force full: {force_full}, since: {since}")
            iterator = client.iter_submissions(since=since)
            
            # 1. Validate mapping on the first record of the pull
            try:
                first_record = next(iterator)
                mapping_warnings = validate_mapping(first_record)
                fetched += 1
                
                mapped_data = map_submission(first_record)
                if mapped_data:
                    with transaction.atomic():
                        obj, created = RawSubmission.objects.update_or_create(
                            submission_id=mapped_data.pop('submission_id'),
                            defaults=mapped_data
                        )
                        if created:
                            inserted += 1
                        else:
                            updated += 1
            except StopIteration:
                # No records returned at all
                pass
                
            # 2. Process the rest of the records
            for raw_row in iterator:
                fetched += 1
                mapped_data = map_submission(raw_row)
                if not mapped_data:
                    continue
                
                with transaction.atomic():
                    obj, created = RawSubmission.objects.update_or_create(
                        submission_id=mapped_data.pop('submission_id'),
                        defaults=mapped_data
                    )
                    if created:
                        inserted += 1
                    else:
                        updated += 1

            log.status = 'success'
            log.records_fetched = fetched
            log.records_inserted = inserted
            log.records_updated = updated
            log.mapping_warnings = mapping_warnings if mapping_warnings else None
            
        except Exception as e:
            logger.exception("Error executing Kobo data synchronization service")
            log.status = 'failed'
            log.error_message = str(e)[:2000]
            raise
            
        finally:
            log.finished_at = timezone.now()
            log.save()
            
        return {
            'status': log.status,
            'job_id': log.id,
            'fetched': fetched,
            'inserted': inserted,
            'updated': updated,
            'mapping_warnings': mapping_warnings
        }
