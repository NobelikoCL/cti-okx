import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("ctis_okx")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
