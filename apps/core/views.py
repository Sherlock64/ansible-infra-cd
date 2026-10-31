from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.db import connection
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ansibleinfracd.celery import app as celery_app

from .models import Repository, SyncRun, Target
from .serializers import RepositorySerializer, SyncRunSerializer, TargetSerializer
from .tasks import test_target_connection


# --- Single-page app -------------------------------------------------------

@never_cache
def spa(request):
    """Serve the bundled PatternFly app's index.html for every non-API route."""
    index = settings.FRONTEND_DIST / "index.html"
    if not index.exists():
        return HttpResponse(
            "Frontend bundle not found. Build it with `npm run build` in frontend/ "
            "(the Containerfile does this automatically).",
            status=503,
            content_type="text/plain",
        )
    return HttpResponse(index.read_text(), content_type="text/html")


# --- Auth ------------------------------------------------------------------

def _user_payload(user):
    return {"username": user.get_username(), "is_staff": user.is_staff}


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    """GET: current session (also sets the CSRF cookie). DELETE: log out."""

    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False})
        return Response({"authenticated": True, "user": _user_payload(request.user)})

    def delete(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get("username", ""),
            password=request.data.get("password", ""),
        )
        if user is None:
            return Response({"detail": "Invalid username or password."}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return Response({"authenticated": True, "user": _user_payload(user)})


# --- Resources -------------------------------------------------------------

class TargetViewSet(viewsets.ModelViewSet):
    queryset = Target.objects.all().order_by("name")
    serializer_class = TargetSerializer

    @action(detail=True, methods=["post"], url_path="test-connection")
    def test_connection(self, request, pk=None):
        target = self.get_object()
        result = test_target_connection.delay(target.pk)
        return Response({"task_id": result.id}, status=status.HTTP_202_ACCEPTED)


class RepositoryViewSet(viewsets.ModelViewSet):
    queryset = Repository.objects.select_related("target")
    serializer_class = RepositorySerializer


class SyncRunViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SyncRun.objects.select_related("repository")
    serializer_class = SyncRunSerializer


# --- Overview and system health ---------------------------------------------

def system_health():
    checks = {}

    try:
        connection.ensure_connection()
        checks["database"] = True
    except Exception:  # noqa: BLE001
        checks["database"] = False

    try:
        cache.set("aic:health", "ok", timeout=10)
        checks["redis"] = cache.get("aic:health") == "ok"
    except Exception:  # noqa: BLE001
        checks["redis"] = False

    try:
        checks["worker"] = bool(celery_app.control.inspect(timeout=1).ping())
    except Exception:  # noqa: BLE001
        checks["worker"] = False

    # beat triggers the heartbeat task and the worker runs it, so a fresh
    # timestamp shows the whole beat -> broker -> worker path is working.
    checks["beat"] = False
    try:
        beat_at = cache.get(settings.HEARTBEAT_CACHE_KEY)
        if beat_at:
            age = timezone.now() - parse_datetime(beat_at)
            checks["beat"] = age.total_seconds() < settings.HEARTBEAT_MAX_AGE_SECONDS
    except Exception:  # noqa: BLE001
        pass

    return {"status": "ok" if all(checks.values()) else "degraded", "checks": checks}


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(system_health())


class OverviewView(APIView):
    def get(self, request):
        repos = list(Repository.objects.select_related("target"))
        counts = {key: 0 for key, _ in Repository.SyncStatus.choices}
        for repo in repos:
            counts[repo.sync_status] += 1
        needs_attention = [r for r in repos if r.sync_status != Repository.SyncStatus.SYNCED]

        if not repos:
            health = "unknown"
        elif counts["error"]:
            health = "error"
        elif counts["out_of_sync"] or counts["unknown"]:
            health = "degraded"
        else:
            health = "healthy"

        since = timezone.now() - timedelta(days=7)
        recent = list(SyncRun.objects.filter(started_at__gte=since, finished_at__isnull=False))

        durations = [(r.finished_at - r.started_at).total_seconds() for r in recent if r.status == SyncRun.Status.SUCCESS]
        avg_seconds = round(sum(durations) / len(durations), 1) if durations else None

        success_rate = []
        for offset in range(6, -1, -1):
            day = (timezone.now() - timedelta(days=offset)).date()
            runs = [r for r in recent if r.started_at.date() == day]
            ok = sum(1 for r in runs if r.status == SyncRun.Status.SUCCESS)
            success_rate.append({"date": day.isoformat(), "percent": round(100 * ok / len(runs)) if runs else None})

        activity = SyncRun.objects.select_related("repository")[:10]
        target = Target.objects.order_by("id").first()

        return Response({
            "health": health,
            "target": TargetSerializer(target).data if target else None,
            "totals": {"repositories": len(repos), **counts},
            "avg_sync_seconds": avg_seconds,
            "success_rate_7d": success_rate,
            "needs_attention": RepositorySerializer(needs_attention[:10], many=True).data,
            "activity": SyncRunSerializer(activity, many=True).data,
            "system": system_health(),
        })
