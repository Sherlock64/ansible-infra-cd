import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import Repository, SyncRun, Target

REPOS = [
    ("aap-config-prod", "https://git.example.com/platform/aap-config-prod.git", "main", Repository.SyncStatus.SYNCED, ""),
    ("aap-config-shared", "https://git.example.com/platform/aap-config-shared.git", "main", Repository.SyncStatus.SYNCED, ""),
    ("team-network-config", "https://git.example.com/network/aap-config.git", "main", Repository.SyncStatus.OUT_OF_SYNC, "3 objects differ"),
    ("team-apps-config", "https://git.example.com/apps/aap-config.git", "develop", Repository.SyncStatus.OUT_OF_SYNC, "1 object missing, 2 differ"),
    ("team-security-config", "https://git.example.com/security/aap-config.git", "main", Repository.SyncStatus.ERROR, "Git fetch failed"),
]


class Command(BaseCommand):
    help = "Create demo data (a fake target, repositories and sync history). Safe to re-run."

    def handle(self, *args, **options):
        rng = random.Random(42)
        now = timezone.now()
        target, _ = Target.objects.get_or_create(
            name="demo-aap", defaults={"kind": Target.Kind.AAP, "url": "https://aap.example.com", "verify_tls": True}
        )
        for name, url, branch, status, drift in REPOS:
            repo, created = Repository.objects.get_or_create(
                target=target, name=name,
                defaults={
                    "git_url": url, "branch": branch, "sync_status": status, "drift_summary": drift,
                    "last_commit": f"{rng.getrandbits(40):010x}",
                    "last_synced_at": now - timedelta(minutes=rng.randint(2, 600)),
                },
            )
            if not created:
                continue
            for day in range(7):
                for _ in range(rng.randint(1, 3)):
                    started = now - timedelta(days=day, hours=rng.randint(0, 20))
                    ok = rng.random() > 0.15
                    run = SyncRun.objects.create(
                        repository=repo,
                        status=SyncRun.Status.SUCCESS if ok else SyncRun.Status.FAILED,
                        commit=f"{rng.getrandbits(40):010x}",
                        summary="Applied configuration" if ok else "Task failed: connection refused",
                    )
                    # started_at is auto_now_add, so backdate with update()
                    SyncRun.objects.filter(pk=run.pk).update(
                        started_at=started, finished_at=started + timedelta(seconds=rng.randint(3, 12))
                    )
        self.stdout.write(self.style.SUCCESS("Demo data ready."))
