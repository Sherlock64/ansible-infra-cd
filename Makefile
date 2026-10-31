COMPOSE ?= podman-compose
MANAGE = $(COMPOSE) exec web python manage.py

.PHONY: help env up down logs build migrate superuser seed shell dev-frontend

help:
	@echo "make env|up|down|logs|build|superuser|seed|shell|dev-frontend"

env:  ## create .env with generated secrets
	@test -f .env || { cp .env.example .env; \
	  sed -i "s|^AIC_SECRET_KEY=.*|AIC_SECRET_KEY=$$(python3 -c 'import secrets;print(secrets.token_urlsafe(50))')|" .env; \
	  sed -i "s|^AIC_DB_PASSWORD=.*|AIC_DB_PASSWORD=$$(python3 -c 'import secrets;print(secrets.token_urlsafe(24))')|" .env; \
	  sed -i "s|^AIC_ENCRYPTION_KEY=.*|AIC_ENCRYPTION_KEY=$$(python3 -c 'import os,base64;print(base64.urlsafe_b64encode(os.urandom(32)).decode())')|" .env; \
	  echo ".env created with generated secrets"; }

up: env
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

build:
	$(COMPOSE) build

superuser:
	$(MANAGE) createsuperuser

seed:
	$(MANAGE) seed_demo

shell:
	$(MANAGE) shell

dev-frontend:
	$(COMPOSE) --profile dev up frontend
