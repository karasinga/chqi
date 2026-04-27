import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

db_config = settings.DATABASES['default']
pwd = db_config.get('PASSWORD')
print(f"Password length: {len(pwd)}")
print(f"Password hex: {pwd.encode().hex()}")
