from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("targets", views.TargetViewSet)
router.register("repositories", views.RepositoryViewSet)
router.register("sync-runs", views.SyncRunViewSet)

urlpatterns = [
    path("auth/session/", views.SessionView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("overview/", views.OverviewView.as_view()),
    path("system/health/", views.HealthView.as_view()),
    path("", include(router.urls)),
]
