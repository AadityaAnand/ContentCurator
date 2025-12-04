.PHONY: help start stop restart logs clean test ingest-sample db-migrate db-reset

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

start: ## Start all services
	@echo "Starting Content Curator..."
	@./start.sh

stop: ## Stop all services
	@echo "Stopping services..."
	@docker-compose down

restart: ## Restart all services
	@echo "Restarting services..."
	@docker-compose restart

logs: ## Show logs from all services
	@docker-compose logs -f

logs-backend: ## Show backend logs only
	@docker-compose logs -f backend

logs-frontend: ## Show frontend logs only
	@docker-compose logs -f frontend

clean: ## Stop services and remove volumes (WARNING: deletes data)
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? (y/N) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "Cleaned!"; \
	fi

db-migrate: ## Run database migrations
	@echo "Running migrations..."
	@docker-compose exec backend alembic upgrade head

db-reset: ## Reset database (WARNING: deletes data)
	@echo "WARNING: This will delete all database data!"
	@read -p "Are you sure? (y/N) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose exec backend alembic downgrade base; \
		docker-compose exec backend alembic upgrade head; \
		echo "Database reset complete!"; \
	fi

db-shell: ## Open PostgreSQL shell
	@docker-compose exec postgres psql -U curator -d content_curator

ingest-sample: ## Ingest sample articles from Hacker News
	@echo "Ingesting sample articles from Hacker News..."
	@curl -X POST "http://localhost:8000/api/ingest/rss" \
		-H "Content-Type: application/json" \
		-d '{"url": "https://news.ycombinator.com/rss", "source_name": "Hacker News", "max_articles": 5}'

test-api: ## Test API health
	@echo "Testing API health..."
	@curl http://localhost:8000/health

test-frontend: ## Test frontend
	@echo "Testing frontend..."
	@curl -s http://localhost:3000 > /dev/null && echo "✓ Frontend is running" || echo "✗ Frontend is not responding"

status: ## Check status of all services
	@docker-compose ps

install-deps: ## Install frontend dependencies
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install

build: ## Build all containers
	@echo "Building containers..."
	@docker-compose build

rebuild: ## Rebuild all containers from scratch
	@echo "Rebuilding containers..."
	@docker-compose build --no-cache

update: ## Pull latest images and restart
	@echo "Updating..."
	@docker-compose pull
	@docker-compose up -d

backup-db: ## Backup database to file
	@echo "Backing up database..."
	@docker-compose exec -T postgres pg_dump -U curator content_curator > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup complete!"

restore-db: ## Restore database from backup file (Usage: make restore-db FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Error: Please specify FILE=backup.sql"; \
		exit 1; \
	fi
	@echo "Restoring database from $(FILE)..."
	@docker-compose exec -T postgres psql -U curator -d content_curator < $(FILE)
	@echo "Restore complete!"
