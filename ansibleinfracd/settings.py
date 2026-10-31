"""
Django settings for ansibleinfracd project.

All deployment configuration is read from environment variables prefixed
with ``AIC_``. See ``.env.example`` for the full list.

AAP/AWX targets and their credentials are *not* configured here: they are
entered in the application (Settings page) and stored in the database.
"""

import base64
import hashlib
import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


def env(name, default=None):
    return os.getenv(f"AIC_{name}", default)


def env_bool(name, default=False):
    value = env(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def env_list(name, default=""):
    return [item.strip() for item in env(name, default).split(",") if item.strip()]


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("SECRET_KEY", "changeme")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env_bool("DEBUG_MODE", True)

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]")
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

# Key used to encrypt secrets (e.g. AAP tokens) stored in the database.
# This is the one bootstrap secret that has to live outside the database.
# Generate one with:
#   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY = env("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    if not DEBUG:
        from django.core.exceptions import ImproperlyConfigured

        raise ImproperlyConfigured("AIC_ENCRYPTION_KEY must be set when AIC_DEBUG_MODE is off.")
    # Development convenience only: derive a key from SECRET_KEY.
    ENCRYPTION_KEY = base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest()).decode()


# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "whitenoise.runserver_nostatic",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_celery_results",
    "apps.core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "ansibleinfracd.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "ansibleinfracd.wsgi.application"


# Database (PostgreSQL: authentication storage and site data)
DATABASES = {
    "default": {
        "ENGINE": env("DB_TYPE", "django.db.backends.postgresql"),
        "NAME": env("DB_NAME", "ansibleinfracd"),
        "USER": env("DB_USERNAME", "ansibleinfracd"),
        "PASSWORD": env("DB_PASSWORD", ""),
        "HOST": env("DB_HOST", "localhost"),
        "PORT": env("DB_PORT", "5432"),
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Redis (cache + Celery broker, on separate databases)
REDIS_HOST = env("REDIS_HOST", "localhost")
REDIS_PORT = env("REDIS_PORT", "6379")
REDIS_CACHE_DB = env("REDIS_CACHE_DB", "1")
REDIS_BROKER_DB = env("REDIS_BROKER_DB", "0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CACHE_DB}",
    }
}


# Celery (background jobs; the Django app monitors them, see /api/v1/system/health/)
CELERY_BROKER_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_BROKER_DB}"
CELERY_RESULT_BACKEND = "django-db"
CELERY_RESULT_EXTENDED = True
CELERY_TIMEZONE = TIME_ZONE = "UTC"
CELERY_TASK_TRACK_STARTED = True
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BEAT_SCHEDULE = {
    "heartbeat": {
        "task": "apps.core.tasks.heartbeat",
        "schedule": 30.0,
    },
}
HEARTBEAT_CACHE_KEY = "aic:celery:heartbeat"
HEARTBEAT_MAX_AGE_SECONDS = 90


# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Internationalization
LANGUAGE_CODE = "en-us"
USE_I18N = True
USE_TZ = True


# Static files. The Vite build (frontend/dist) is collected into STATIC_ROOT and
# served by WhiteNoise; Vite is configured with base="/static/".
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
STATICFILES_DIRS = [d for d in (FRONTEND_DIST,) if d.exists()]
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

# Email
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
