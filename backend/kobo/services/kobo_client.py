import logging
import requests
from typing import Iterator, Dict, Any
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

class KoboClient:
    def __init__(self):
        self.base_url = getattr(settings, 'KOBO_BASE_URL', None)
        self.form_id = getattr(settings, 'KOBO_FORM_ID', None)
        self.token = getattr(settings, 'KOBO_TOKEN', None)

        if not self.base_url or not self.form_id or not self.token:
            raise ImproperlyConfigured(
                "Kobo settings (KOBO_BASE_URL, KOBO_FORM_ID, KOBO_TOKEN) "
                "must be configured in Django settings / environment variables."
            )

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Token {self.token}",
            "Accept": "application/json",
        })

    def iter_submissions(self, since: str = None) -> Iterator[Dict[str, Any]]:
        """
        Yield submissions page by page.
        Uses _last_modified for incremental pulls to catch edited submissions.
        """
        url = f"{self.base_url}/api/v2/assets/{self.form_id}/data.json"
        params = {"limit": 1000}
        
        if since:
            # CRITICAL: Use _last_modified, not _submission_time
            params["query"] = f'{{"_last_modified":{{"$gt":"{since}"}}}}'

        next_url = url
        while next_url:
            try:
                logger.info(f"Fetching Kobo data from: {next_url}")
                response = self.session.get(
                    next_url, 
                    params=params if next_url == url else None, 
                    timeout=60
                )
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                logger.error(f"Kobo API request failed: {e}")
                raise
            
            data = response.json()
            results = data.get("results", [])
            for row in results:
                yield row
                
            next_url = data.get("next")
            logger.info(f"Fetched {len(results)} records. Next page exists: {bool(next_url)}")
