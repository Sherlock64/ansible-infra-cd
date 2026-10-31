"""URL configuration for ansibleinfracd."""

from django.contrib import admin
from django.urls import include, path, re_path

from apps.core.views import spa

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.core.urls")),
    # Everything else belongs to the bundled PatternFly single-page app.
    re_path(r"^(?!api/|admin/|static/).*$", spa, name="spa"),
]
