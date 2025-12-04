# Content Curator - Quick Start Guide

## Prerequisites

1. **Docker & Docker Compose** - Ensure Docker is installed and running
2. **Ollama** - Install Ollama from https://ollama.ai
3. **Node.js 18+** (optional, for local frontend development)
4. **Python 3.11+** (optional, for local backend development)

## Installation Steps

### 1. Install Ollama Models

First, ensure Ollama is running:

```bash
ollama serve
```

Then install the required models (in a new terminal):

```bash
# Install the chat model
ollama pull llama3.2

# Install the embedding model
ollama pull nomic-embed-text
```

### 2. Clone and Setup

```bash
cd ContentCurator
cp .env.example .env
# Edit .env if needed (defaults work for local development)
```

### 3. Start the Application

#### Option A: Using the startup script (Recommended)

```bash
chmod +x start.sh
./start.sh
```

This script will:
- Check if Ollama is running
- Ensure required models are installed
- Start all Docker services
- Run database migrations
- Wait for all services to be ready

#### Option B: Manual startup

```bash
# Start services
docker-compose up -d

# Wait a few seconds for PostgreSQL to start
sleep 5

# Run migrations
docker-compose exec backend alembic upgrade head
```

### 4. Access the Application

Once started, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc

## Testing the Application

### 1. Ingest Your First Articles

You can test the ingestion using the API documentation at http://localhost:8000/docs

**Ingest RSS Feed:**

Go to `/api/ingest/rss` endpoint and try:

```json
{
  "url": "https://news.ycombinator.com/rss",
  "source_name": "Hacker News",
  "max_articles": 5
}
```

**Ingest YouTube Video:**

Go to `/api/ingest/youtube` endpoint and try:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "source_name": "YouTube"
}
```

### 2. Browse Articles

Navigate to http://localhost:3000/articles to see the ingested articles.

### 3. Use cURL (Alternative)

```bash
# Ingest RSS feed
curl -X POST "http://localhost:8000/api/ingest/rss" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com/rss",
    "source_name": "Hacker News",
    "max_articles": 5
  }'

# Get all articles
curl "http://localhost:8000/api/articles"

# Search articles
curl "http://localhost:8000/api/articles/search?query=AI"
```

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Services

```bash
docker-compose down
```

### Reset Database

```bash
# Stop services
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Start fresh
docker-compose up -d
docker-compose exec backend alembic upgrade head
```

## Troubleshooting

### Ollama Connection Issues

If you see errors about Ollama connection:

1. Make sure Ollama is running: `ollama serve`
2. Check if models are installed: `ollama list`
3. Test Ollama: `curl http://localhost:11434/api/tags`

### Database Migration Issues

If migrations fail:

```bash
# Reset migrations
docker-compose exec backend alembic downgrade base
docker-compose exec backend alembic upgrade head
```

### Frontend Not Loading

```bash
# Rebuild frontend
docker-compose up -d --build frontend

# Or install dependencies manually
cd frontend
npm install
npm run dev
```

### Backend API Not Responding

```bash
# Check logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

## Development Workflow

### Local Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://curator:curator_dev_password@localhost:5432/content_curator"
export OLLAMA_HOST="http://localhost:11434"

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

### Local Frontend Development

```bash
cd frontend
npm install

# Set environment variable
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# Start development server
npm run dev
```

## Recommended RSS Feeds for Testing

- **Hacker News**: https://news.ycombinator.com/rss
- **TechCrunch**: https://techcrunch.com/feed/
- **MIT News - AI**: https://news.mit.edu/rss/topic/artificial-intelligence2
- **ArXiv CS.AI**: http://export.arxiv.org/rss/cs.AI

## Next Steps

1. **Ingest more content** - Add RSS feeds, YouTube videos
2. **Explore the UI** - Search and filter articles
3. **Phase 2** - Implement knowledge graph (next in the roadmap)
4. **Phase 3** - Add user authentication and personalization
5. **Phase 4** - Implement trend detection

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Review the API docs: http://localhost:8000/docs

Happy curating! 🚀
