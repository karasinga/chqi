import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from projects.serializers import ProjectSerializer
from projects.models import Project

print("Serializer fields:")
print(ProjectSerializer().fields.keys())

try:
    p = Project.objects.first()
    if p:
        print(f"\nProject {p.id} total_budget: {p.total_budget}")
        data = ProjectSerializer(p).data
        print(f"Serialized['total_budget']: {data.get('total_budget')}")
    else:
        print("No project found.")
except Exception as e:
    print(e)
