from rest_framework import serializers

from .models import Repository, SyncRun, Target


class TargetSerializer(serializers.ModelSerializer):
    # Write-only: secrets are never returned by the API.
    token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    token_set = serializers.SerializerMethodField()

    class Meta:
        model = Target
        fields = [
            "id", "name", "kind", "url", "verify_tls", "token", "token_set",
            "last_ping_at", "last_ping_ok", "last_ping_message", "created_at", "updated_at",
        ]
        read_only_fields = ["last_ping_at", "last_ping_ok", "last_ping_message", "created_at", "updated_at"]

    def get_token_set(self, obj):
        return bool(obj.token)


class RepositorySerializer(serializers.ModelSerializer):
    target_name = serializers.CharField(source="target.name", read_only=True)

    class Meta:
        model = Repository
        fields = [
            "id", "target", "target_name", "name", "git_url", "branch", "config_path",
            "sync_status", "last_commit", "last_synced_at", "drift_summary",
        ]
        read_only_fields = ["sync_status", "last_commit", "last_synced_at", "drift_summary"]


class SyncRunSerializer(serializers.ModelSerializer):
    repository_name = serializers.CharField(source="repository.name", read_only=True)

    class Meta:
        model = SyncRun
        fields = ["id", "repository", "repository_name", "status", "commit", "summary", "started_at", "finished_at"]
