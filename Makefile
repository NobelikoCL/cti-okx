# ─────────────────────────────────────────────────────────────────────────────
# CTIS OKX — Makefile
# Usage: make <target>
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: up down restart build logs status shell-backend shell-db migrate scan

# ── Stack management ──────────────────────────────────────────────────────────

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

build:
	docker compose build --parallel

deploy:
	bash deploy.sh

# ── Logs ──────────────────────────────────────────────────────────────────────

logs:
	docker compose logs -f --tail=100

logs-backend:
	docker compose logs -f --tail=100 backend

logs-worker:
	docker compose logs -f --tail=100 celery_worker

logs-beat:
	docker compose logs -f --tail=100 celery_beat

logs-nginx:
	docker compose logs -f --tail=50 nginx

# ── Status ────────────────────────────────────────────────────────────────────

status:
	docker compose ps

# ── Shells ────────────────────────────────────────────────────────────────────

shell-backend:
	docker compose exec backend bash

shell-db:
	docker compose exec postgres psql -U ctis -d ctis_okx

# ── Django ────────────────────────────────────────────────────────────────────

migrate:
	docker compose exec backend python manage.py migrate

createsuperuser:
	docker compose exec backend python manage.py createsuperuser

collectstatic:
	docker compose exec backend python manage.py collectstatic --noinput

# ── Scanner ───────────────────────────────────────────────────────────────────

scan:
	docker compose exec backend python manage.py shell -c \
		"from apps.scanner.tasks import scan_markets; scan_markets.apply_async()"
	@echo "Scanner lanzado — ver logs con: make logs-worker"
