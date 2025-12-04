# Multi-Modal Content Curator with Ollama

An intelligent content aggregation and knowledge discovery platform that helps you discover patterns, connections, and trends across fragmented information sources.

> **📚 New here?** Check out [INDEX.md](INDEX.md) for a complete documentation guide!  
> **🚀 Quick start?** Jump to [QUICKSTART.md](QUICKSTART.md)  
> **✅ What's built?** Read [SUCCESS.md](SUCCESS.md)

## Features

- 🔄 **Multi-Source Ingestion**: RSS feeds, YouTube transcripts, research papers, and news articles
- 🤖 **AI-Powered Processing**: Summarization, categorization, and embeddings using Ollama
- 🕸️ **Knowledge Graph**: Interactive visualization of connections between content
- 📊 **Trend Detection**: Identify emerging trends and predict what's becoming important
- 👤 **Personalization**: Custom digests based on your interests
- 🔍 **Semantic Search**: Find content by meaning, not just keywords

## Tech Stack

- **Backend**: FastAPI, PostgreSQL with pgvector, Ollama, Celery
- **Frontend**: Next.js 15, React 19, TypeScript, TanStack Query, Tailwind CSS
- **Visualization**: Cytoscape.js (knowledge graph), Recharts (trends)
- **Infrastructure**: Docker, Docker Compose

## Prerequisites

- Docker and Docker Compose
- Ollama installed and running on your host machine
- At least 8GB RAM available
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

## Quick Start

1. **Clone and setup environment**:
   ```bash
   cd ContentCurator
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Ensure Ollama is running**:
   ```bash
   # Install a model for embeddings and chat
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```

3. **Start the services**:
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Project Structure

```
ContentCurator/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI application
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── database.py     # Database connection
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   ├── alembic/            # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js 15 app directory
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities and API client
│   │   └── types/         # TypeScript types
│   ├── package.json
│   └── Dockerfile.dev
└── docker-compose.yml
```

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

```bash
# Create a new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1
```

## API Endpoints

### Phase 1 - Content Ingestion
- `POST /api/ingest/rss` - Ingest RSS feeds
- `POST /api/ingest/youtube` - Ingest YouTube videos
- `GET /api/articles` - List articles with pagination
- `GET /api/articles/search` - Search articles
- `GET /api/articles/{id}` - Get article details

### Phase 2 - Knowledge Graph
- `POST /api/embeddings/generate` - Generate embeddings
- `GET /api/articles/{id}/related` - Get related articles
- `GET /api/graph/data` - Get graph visualization data
- `GET /api/graph/topics` - Get topic nodes

### Phase 3 - Personalization
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/me` - Get user profile
- `POST /api/digests/generate` - Generate digest
- `GET /api/digests` - List digests

### Phase 4 - Trends
- `GET /api/trends` - List trending topics
- `GET /api/trends/{topic_id}` - Trend details
- `GET /api/trends/predictions` - Predict emerging topics

## Testing

```bash
# Backend tests
docker-compose exec backend pytest

# Frontend tests
cd frontend && npm test
```

## Deployment

See `docker-compose.prod.yml` for production deployment configuration.

## License

MIT License

## Contributing

Contributions are welcome! Please read the contributing guidelines first.
