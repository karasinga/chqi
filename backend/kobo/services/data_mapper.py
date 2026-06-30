import logging
from datetime import datetime
from django.utils import timezone

logger = logging.getLogger(__name__)

# Maps Django Model Field Name -> Kobo JSON Key
# UPDATE THIS DICTIONARY IF KOBO FIELD NAMES CHANGE
FIELD_MAP = {
    'submission_id':       '_id',
    'submission_uuid':     '_uuid',
    'county':              'main/county',
    'subcounty':           'main/subcounty',
    'facility_name':       'main/facility_name',
    'mfl_code':            'main/mfl_code_calc',
    'client_sex':          'main/client_sex',
    'client_age':          'main/client_age',
    'visit_type':          'main/visit_type',
    'conditions_reported': 'main/conditions_reported',
    'date_patient_seen':   'main/date_patient_seen',
    'kobo_submission_time':'_submission_time',
    'kobo_last_modified':  '_last_modified',
}

def validate_mapping(raw_sample: dict) -> list[str]:
    """
    Validates that expected Kobo fields still exist in the payload.
    Returns a list of warnings for missing fields.
    """
    if not raw_sample:
        return ["Empty payload provided for validation"]
    
    warnings = []
    for model_field, kobo_key in FIELD_MAP.items():
        if kobo_key not in raw_sample and model_field not in ['submission_uuid', 'kobo_last_modified']:
            warnings.append(f"MISSING: '{kobo_key}' (maps to model field '{model_field}')")
    return warnings

def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], '%Y-%m-%d').date()
    except ValueError:
        return None

def _parse_datetime(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return timezone.make_aware(dt) if timezone.is_naive(dt) else dt
    except (ValueError, TypeError):
        return None

def _parse_int(value):
    try:
        return int(float(str(value)))
    except (ValueError, TypeError):
        return None

def map_submission(raw: dict) -> dict:
    """Maps raw Kobo JSON to a dict suitable for Django ORM creation."""
    sub_id = str(raw.get(FIELD_MAP['submission_id'], ''))
    if not sub_id:
        return None

    raw_uuid = raw.get(FIELD_MAP['submission_uuid'], '')
    clean_uuid = str(raw_uuid).replace('uuid:', '') if raw_uuid else None

    return {
        'submission_id':       sub_id,
        'submission_uuid':     clean_uuid,
        'kobo_submission_time':_parse_datetime(raw.get(FIELD_MAP['kobo_submission_time'])),
        'kobo_last_modified':  _parse_datetime(raw.get(FIELD_MAP['kobo_last_modified'])),
        'county':              raw.get(FIELD_MAP['county']),
        'subcounty':           raw.get(FIELD_MAP['subcounty']),
        'facility_name':       raw.get(FIELD_MAP['facility_name']),
        'mfl_code':            raw.get(FIELD_MAP['mfl_code']),
        'client_sex':          raw.get(FIELD_MAP['client_sex']),
        'client_age':          _parse_int(raw.get(FIELD_MAP['client_age'])),
        'visit_type':          raw.get(FIELD_MAP['visit_type']),
        'conditions_reported': raw.get(FIELD_MAP['conditions_reported']),
        'date_patient_seen':   _parse_date(raw.get(FIELD_MAP['date_patient_seen'])),
        'raw_payload':         raw,  # The untouched payload
    }
