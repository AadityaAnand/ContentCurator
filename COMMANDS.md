# Command Reference - Content Curator

Quick reference for all commands you'll need.

## 🚀 Getting Started

```bash
# First time setup
cd ContentCurator
chmod +x start.sh
./start.sh

# Or use Make
make start
```

---

## 📦 Service Management

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend

# Check service status
docker-compose ps

# View resource usage
docker-compose stats
```

### Using Make (Easier)

```bash
# Start everything
make start

# Stop everything
make stop

# Restart everything
make restart

# Check status
make status
```

---

## 📊 Logs & Debugging

### View Logs

```bash
# All services (live tail)
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend

# Since timestamp
docker-compose logs --since 2024-12-03T10:00:00

# Make shortcuts
make logs              # All logs
make logs-backend      # Backend only
make logs-frontend     # Frontend only
```

### Debugging

```bash
# Enter container shell
docker-compose exec backend bash
docker-compose exec frontend sh

# Check environment variables
docker-compose exec backend env

# Test network connectivity
docker-compose exec backend ping postgres
docker-compose exec backend curl http://frontend:3000
```

---

## 🗄️ Database Management

### Migrations

```bash
# Run migrations (upgrade)
docker-compose exec backend alembic upgrade head

# Rollback one migration
docker-compose exec backend alembic downgrade -1

# Rollback all
docker-compose exec backend alembic downgrade base

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Check current version
docker-compose exec backend alembic current

# View migration history
docker-compose exec backend alembic history

# Make shortcuts
make db-migrate        # Run migrations
make db-reset          # Reset database (destructive!)
```

### Database Access

```bash
# Open PostgreSQL shell
docker-compose exec postgres psql -U curator -d content_curator

# Or use Make
make db-shell

# Execute SQL query directly
docker-compose exec postgres psql -U curator -d content_curator -c "SELECT COUNT(*) FROM articles;"

# Export data
docker-compose exec postgres pg_dump -U curator content_curator > backup.sql

# Import data
docker-compose exec -T postgres psql -U curator -d content_curator < backup.sql
```

### Useful SQL Queries

```sql
-- Count articles
SELECT COUNT(*) FROM articles;

-- Count by source type
SELECT source_type, COUNT(*) FROM articles GROUP BY source_type;

-- Recent articles
SELECT id, title, created_at FROM articles ORDER BY created_at DESC LIMIT 10;

-- Categories with counts
SELECT c.name, COUNT(ac.article_id) as article_count 
FROM categories c 
LEFT JOIN article_categories ac ON c.id = ac.category_id 
GROUP BY c.name;

-- Articles without summaries (should be none)
SELECT COUNT(*) FROM articles a 
LEFT JOIN summaries s ON a.id = s.article_id 
WHERE s.id IS NULL;

-- Search articles
SELECT id, title FROM articles WHERE title ILIKE '%AI%' LIMIT 10;
```

---

## 🔧 API Testing

### Using cURL

```bash
# Health check
curl http://localhost:8000/health

# Get all articles
curl http://localhost:8000/api/articles

# Get articles page 2
curl "http://localhost:8000/api/articles?page=2&page_size=10"

# Search articles
curl "http://localhost:8000/api/articles/search?query=AI"

# Get single article
curl http://localhost:8000/api/articles/1

# Get categories
curl http://localhost:8000/api/articles/categories/list

# Ingest RSS feed
curl -X POST "http://localhost:8000/api/ingest/rss" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com/rss",
    "source_name": "Hacker News",
    "max_articles": 5
  }'

# Ingest YouTube video
curl -X POST "http://localhost:8000/api/ingest/youtube" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "source_name": "YouTube"
  }'
```

### Using HTTPie (prettier output)

```bash
# Install httpie
brew install httpie  # macOS
# or
pip install httpie

# Use it
http GET http://localhost:8000/api/articles
http GET "http://localhost:8000/api/articles/search?query=AI"

http POST http://localhost:8000/api/ingest/rss \
  url="https://news.ycombinator.com/rss" \
  source_name="Hacker News" \
  max_articles:=5
```

---

## 🧪 Testing

### API Documentation

```bash
# Open Swagger UI
open http://localhost:8000/docs

# Open ReDoc
open http://localhost:8000/redoc

# Get OpenAPI spec
curl http://localhost:8000/openapi.json
```

### Frontend Testing

```bash
# Open frontend
open http://localhost:3000

# Open articles page
open http://localhost:3000/articles

# Open specific article
open http://localhost:3000/articles/1
```

### Test Scripts

```bash
# Quick API test
make test-api

# Quick frontend test
make test-frontend

# Ingest sample data
make ingest-sample
```

---

## 🔄 Development Workflow

### Backend Development

```bash
# Watch backend logs
docker-compose logs -f backend

# Restart after code changes (if needed)
docker-compose restart backend

# Run Python shell in backend
docker-compose exec backend python

# Install new Python package
docker-compose exec backend pip install package-name
# Then update requirements.txt

# Format Python code (if you have black)
docker-compose exec backend black app/

# Type check Python code (if you have mypy)
docker-compose exec backend mypy app/
```

### Frontend Development

```bash
# Watch frontend logs
docker-compose logs -f frontend

# Install new npm package
cd frontend
npm install package-name
# Restart: docker-compose restart frontend

# Build production frontend
cd frontend
npm run build

# Type check TypeScript
cd frontend
npx tsc --noEmit

# Lint code
cd frontend
npm run lint
```

---

## 🐳 Docker Management

### Images

```bash
# List images
docker images

# Pull latest images
docker-compose pull

# Build images
docker-compose build

# Rebuild without cache
docker-compose build --no-cache

# Remove unused images
docker image prune
```

### Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect contentcurator_postgres_data

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Networks

```bash
# List networks
docker network ls

# Inspect network
docker network inspect contentcurator_default

# Test connectivity
docker-compose exec backend ping postgres
```

### Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Remove everything (DANGEROUS!)
docker system prune -a --volumes

# Using Make (safer)
make clean  # Asks for confirmation
```

---

## 🔍 Monitoring

### Check Service Health

```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U curator

# Check if backend is responding
curl http://localhost:8000/health

# Check if frontend is responding
curl -s http://localhost:3000 > /dev/null && echo "OK" || echo "FAIL"

# Check Ollama
curl http://localhost:11434/api/tags
```

### Resource Usage

```bash
# Real-time stats
docker-compose stats

# Disk usage
docker system df

# Container details
docker-compose exec backend df -h
docker-compose exec backend free -m
```

---

## 📦 Backup & Restore

### Database Backup

```bash
# Create backup
docker-compose exec -T postgres pg_dump -U curator content_curator > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use Make
make backup-db

# Create compressed backup
docker-compose exec -T postgres pg_dump -U curator content_curator | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Database Restore

```bash
# Restore from backup
docker-compose exec -T postgres psql -U curator -d content_curator < backup.sql

# Or use Make
make restore-db FILE=backup.sql

# Restore from compressed backup
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U curator -d content_curator
```

### Full Backup

```bash
# Backup database + code
tar -czf content_curator_backup_$(date +%Y%m%d).tar.gz \
  --exclude='*/node_modules' \
  --exclude='*/__pycache__' \
  --exclude='*/.next' \
  ContentCurator/

# Include database
docker-compose exec -T postgres pg_dump -U curator content_curator > db_backup.sql
tar -czf full_backup_$(date +%Y%m%d).tar.gz ContentCurator/ db_backup.sql
```

---

## 🚀 Production Commands

### Build Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production
docker-compose -f docker-compose.prod.yml up -d

# View production logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Environment Management

```bash
# Copy env for production
cp .env .env.production

# Edit production env
nano .env.production

# Use production env
docker-compose --env-file .env.production up -d
```

---

## 🎯 Quick Recipes

### Complete Reset

```bash
# Stop everything and remove data
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
./start.sh
```

### Ingest Multiple Feeds

```bash
# Save as batch_ingest.sh
for url in \
  "https://news.ycombinator.com/rss" \
  "https://techcrunch.com/feed/" \
  "https://news.mit.edu/rss/topic/artificial-intelligence2"
do
  curl -X POST "http://localhost:8000/api/ingest/rss" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$url\", \"max_articles\": 5}"
  sleep 30  # Wait between feeds
done
```

### Monitor Ingestion

```bash
# Watch article count in real-time
watch -n 5 'docker-compose exec postgres psql -U curator -d content_curator -c "SELECT COUNT(*) FROM articles;"'

# Watch logs during ingestion
docker-compose logs -f backend | grep -i "processing\|created"
```

### Quick Health Check

```bash
# Save as health_check.sh
#!/bin/bash
echo "=== Content Curator Health Check ==="
echo ""
echo "Services:"
docker-compose ps
echo ""
echo "API:"
curl -s http://localhost:8000/health | jq
echo ""
echo "Frontend:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000
echo ""
echo "Database:"
docker-compose exec postgres pg_isready -U curator
echo ""
echo "Articles count:"
docker-compose exec postgres psql -U curator -d content_curator -t -c "SELECT COUNT(*) FROM articles;"
```

---

## 📝 Environment Variables

```bash
# View all environment variables
docker-compose exec backend env | sort

# Check specific variable
docker-compose exec backend echo $OLLAMA_HOST

# Test with different variable
OLLAMA_HOST=http://different:11434 docker-compose up
```

---

## 🔑 Useful Make Commands

```bash
make help              # Show all available commands
make start             # Start everything
make stop              # Stop everything
make restart           # Restart everything
make logs              # View all logs
make logs-backend      # View backend logs
make logs-frontend     # View frontend logs
make clean             # Clean everything (asks confirmation)
make db-migrate        # Run database migrations
make db-reset          # Reset database
make db-shell          # Open database shell
make ingest-sample     # Ingest sample data
make test-api          # Test API
make test-frontend     # Test frontend
make status            # Check service status
make backup-db         # Backup database
make restore-db        # Restore database
```

---

## 🆘 Troubleshooting Commands

```bash
# Container won't start
docker-compose logs backend | tail -50

# Port already in use
lsof -i :8000  # Find process using port
kill -9 <PID>  # Kill process

# Database connection issues
docker-compose exec backend ping postgres
docker-compose exec postgres psql -U curator -d content_curator -c "SELECT 1;"

# Ollama issues
curl http://localhost:11434/api/tags
ollama list

# Frontend build issues
docker-compose exec frontend npm install
docker-compose restart frontend

# Clear Docker cache
docker system prune -a --volumes
./start.sh
```

---

**Pro Tip**: Add these to your shell aliases:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias cc-start='cd ~/ContentCurator && make start'
alias cc-logs='cd ~/ContentCurator && make logs'
alias cc-stop='cd ~/ContentCurator && make stop'
alias cc-shell='cd ~/ContentCurator && make db-shell'
alias cc-test='cd ~/ContentCurator && make test-api'
```

---

This reference covers 90% of commands you'll use. Bookmark this file! 📌
