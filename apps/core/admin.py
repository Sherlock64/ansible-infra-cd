from django.contrib import admin

from .models import Repository, SyncRun, Target


@admin.register(Target)
class TargetAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "url", "last_ping_ok")
    exclude = ("token",)


@admin.register(Repository)
class RepositoryAdmin(admin.ModelAdmin):
    list_display = ("name", "target", "branch", "sync_status", "last_synced_at")


@admin.register(SyncRun)
class SyncRunAdmin(admin.ModelAdmin):
    list_display = ("repository", "status", "started_at", "finished_at")
