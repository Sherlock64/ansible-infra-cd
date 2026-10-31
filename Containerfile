# --- Stage 1: build the PatternFly (React + Vite) bundle ---------------------
FROM registry.access.redhat.com/ubi9/nodejs-22 AS frontend
WORKDIR /opt/app-root/src
COPY --chown=1001:0 frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY --chown=1001:0 frontend/ ./
RUN npm run build

# --- Stage 2: Django runtime (web, celery worker and beat share this image) --
FROM registry.access.redhat.com/ubi9/python-312
WORKDIR /opt/app-root/src

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=1001:0 manage.py entrypoint.sh ./
COPY --chown=1001:0 ansibleinfracd/ ./ansibleinfracd/
COPY --chown=1001:0 apps/ ./apps/
COPY --chown=1001:0 templates/ ./templates/
COPY --from=frontend --chown=1001:0 /opt/app-root/src/dist ./frontend/dist

# Collect the bundle into STATIC_ROOT for WhiteNoise (the key is a build-time dummy).
RUN AIC_SECRET_KEY=build python manage.py collectstatic --noinput

ENV PYTHONUNBUFFERED=1
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["web"]
