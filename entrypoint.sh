#!/bin/bash
# Usage: entrypoint.sh web|worker|beat|<any command>
set -euo pipefail

wait_for_migrations() {
  until python manage.py migrate --check >/dev/null 2>&1; do
    echo "Waiting for database migrations..."
    sleep 2
  done
}

case "${1:-web}" in
  web)
    until python manage.py migrate --noinput; do
      echo "Database not ready, retrying..."
      sleep 2
    done
    exec gunicorn ansibleinfracd.wsgi:application --bind 0.0.0.0:8000 --workers "${AIC_WEB_WORKERS:-3}" --access-logfile -
    ;;
  worker)
    wait_for_migrations
    exec celery -A ansibleinfracd worker --loglevel "${AIC_LOG_LEVEL:-info}"
    ;;
  beat)
    wait_for_migrations
    exec celery -A ansibleinfracd beat --loglevel "${AIC_LOG_LEVEL:-info}" --schedule /tmp/celerybeat-schedule
    ;;
  *)
    exec "$@"
    ;;
esac
