from django.db import models

from .fields import EncryptedTextField


class Target(models.Model):
    """An AAP or AWX instance that configuration is synced to.

    The UI currently allows a single target, but nothing in the schema
    enforces that so multi-target support is an additive change later.
    """

    class Kind(models.TextChoices):
        AAP = "aap", "Ansible Automation Platform"
        AWX = "awx", "AWX"

    name = models.CharField(max_length=100, unique=True)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.AAP)
    url = models.URLField(help_text="Base URL, e.g. https://aap.example.com")
    verify_tls = models.BooleanField(default=True)
    token = EncryptedTextField(blank=True, default="")

    last_ping_at = models.DateTimeField(null=True, blank=True)
    last_ping_ok = models.BooleanField(null=True, blank=True)
    last_ping_message = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def ping_path(self):
        return "/api/controller/v2/ping/" if self.kind == self.Kind.AAP else "/api/v2/ping/"


class Repository(models.Model):
    class SyncStatus(models.TextChoices):
        SYNCED = "synced", "Synced"
        OUT_OF_SYNC = "out_of_sync", "Out of sync"
        ERROR = "error", "Error"
        UNKNOWN = "unknown", "Unknown"

    target = models.ForeignKey(Target, on_delete=models.CASCADE, related_name="repositories")
    name = models.CharField(max_length=100)
    git_url = models.CharField(max_length=500)
    branch = models.CharField(max_length=100, default="main")
    config_path = models.CharField(max_length=300, default="/", help_text="Path to the config-as-code root in the repo")
    sync_status = models.CharField(max_length=20, choices=SyncStatus.choices, default=SyncStatus.UNKNOWN)
    last_commit = models.CharField(max_length=40, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    drift_summary = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "repositories"
        constraints = [models.UniqueConstraint(fields=["target", "name"], name="unique_repo_name_per_target")]

    def __str__(self):
        return self.name


class SyncRun(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    repository = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="sync_runs")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    commit = models.CharField(max_length=40, blank=True)
    summary = models.CharField(max_length=255, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.repository} @ {self.started_at:%Y-%m-%d %H:%M} ({self.status})"
