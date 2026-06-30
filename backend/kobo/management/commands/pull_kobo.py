import logging
from django.core.management.base import BaseCommand
from django.core.mail import mail_admins
from django.utils import timezone
from kobo.services.sync_service import SyncService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Pull data from KoboToolbox into PostgreSQL'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full',
            action='store_true',
            help='Full sync (fetch all records, not just incremental)',
        )
        parser.add_argument(
            '--scheduled',
            action='store_true',
            help='Flag to indicate this run was triggered by a scheduler/cron',
        )

    def handle(self, *args, **options):
        self.stdout.write("Starting KoboToolbox data pull...")
        
        is_scheduled = options.get('scheduled', False)
        force_full = options.get('full', False)
        
        try:
            service = SyncService()
            result = service.run(
                triggered_by='scheduler' if is_scheduled else 'manual',
                force_full=force_full
            )
            
            # Alert on suspicious zero-record pull (weekdays only)
            if result['fetched'] == 0 and timezone.now().weekday() < 5:
                mail_admins(
                    subject='⚠️ KMHCBP Pipeline: Zero records pulled',
                    message=(
                        f"The Kobo pull completed but fetched 0 records.\n"
                        f"Check sync_log id={result['job_id']}."
                    )
                )
                
            # Alert on field mapping drift
            if result.get('mapping_warnings'):
                mail_admins(
                    subject='⚠️ KMHCBP Pipeline: Kobo field mapping drift detected',
                    message=(
                        "The Kobo form structure appears to have changed:\n\n"
                        + "\n".join(result['mapping_warnings'])
                        + "\n\nData saved in raw_payload, but extracted columns may be NULL."
                    )
                )
            
            self.stdout.write(self.style.SUCCESS(
                f"\nPull complete!\n"
                f"  Status:   {result['status']}\n"
                f"  Fetched:  {result['fetched']}\n"
                f"  Inserted: {result['inserted']}\n"
                f"  Updated:  {result['updated']}\n"
            ))
            
        except Exception as e:
            logger.exception("Kobo pull command failed")
            mail_admins(
                subject='🚨 KMHCBP Pipeline: Data pull FAILED',
                message=f"Failed with error:\n\n{str(e)}"
            )
            raise
