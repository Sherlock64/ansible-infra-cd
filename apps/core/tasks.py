import requests
from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .models import Target


@shared_task
def heartbeat():
    """Written by beat every 30s so the web app can tell worker + beat are alive."""
    cache.set(settings.HEARTBEAT_CACHE_KEY, timezone.now().isoformat(), timeout=None)


@shared_task
def test_target_connection(target_id):
    """Ping the AAP/AWX controller and record the result on the Target."""
    target = Target.objects.get(pk=target_id)
    url = target.url.rstrip("/") + target.ping_path
    headers = {"Authorization": f"Bearer {target.token}"} if target.token else {}
    try:
        response = requests.get(url, headers=headers, verify=target.verify_tls, timeout=10)
        response.raise_for_status()
        ok, message = True, f"HTTP {response.status_code}"
        version = response.json().get("version") if response.headers.get("content-type", "").startswith("application/json") else None
        if version:
            message += f" - version {version}"
    except Exception as exc:  # noqa: BLE001 - any failure is reported to the user
        ok, message = False, str(exc)[:250]
    Target.objects.filter(pk=target_id).update(
        last_ping_at=timezone.now(), last_ping_ok=ok, last_ping_message=message
    )
    return {"ok": ok, "message": message}
