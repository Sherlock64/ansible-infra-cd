import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ansibleinfracd.settings")

app = Celery("ansibleinfracd")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
