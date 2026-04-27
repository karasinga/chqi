import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from projects.models import Project
from pm.models import ActivityLog

def check_field(model, field_name):
    column = model._meta.get_field(field_name).column
    table = model._meta.db_table
    
    with connection.cursor() as cursor:
        # This works for both SQLite and Postgres to get column info
        if 'postgresql' in settings.DATABASES['default']['ENGINE']:
            cursor.execute(f"""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table}' AND column_name = '{field_name}';
            """)
            res = cursor.fetchone()
            return res[0] if res else "NOT FOUND"
        else:
            cursor.execute(f"PRAGMA table_info({table})")
            rows = cursor.fetchall()
            for row in rows:
                if row[1] == field_name:
                    return row[2]
            return "NOT FOUND"

print("--- Database Schema Check ---")
print(f"Project ID Type: {check_field(Project, 'id')}")
print(f"ActivityLog Target ID Type: {check_field(ActivityLog, 'target_id')}")
print("-----------------------------")

if 'uuid' in check_field(Project, 'id').lower() or 'char' in check_field(Project, 'id').lower():
    print("SUCCESS: Project ID is UUID compatible.")
else:
    print("WARNING: Project ID appears to be an INTEGER. Migrations required!")

if 'char' in check_field(ActivityLog, 'target_id').lower() or 'text' in check_field(ActivityLog, 'target_id').lower():
    print("SUCCESS: ActivityLog Target ID is CharField compatible.")
else:
    print("WARNING: ActivityLog Target ID appears to be an INTEGER. Migrations required!")
