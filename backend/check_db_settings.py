import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

db_config = settings.DATABASES['default']
print(f"Host: {db_config.get('HOST')}")
print(f"User: {db_config.get('USER')}")
print(f"Password starts with: {db_config.get('PASSWORD')[:5]}...")
print(f"Password length: {len(db_config.get('PASSWORD'))}")
