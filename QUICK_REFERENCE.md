# Content Curator - Quick Reference Guide

**Fast access to common commands and endpoints**

---

## 🚀 Quick Start

### Start Services
```bash
# Backend (Terminal 1)
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Terminal 2)
cd frontend && npm run dev
```

### Access URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Analytics**: http://localhost:3000/analytics
- **Digests**: http://localhost:3000/digests
- **Categories**: http://localhost:3000/categories

---

## 📊 Key Endpoints

### Authentication
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'

# Get token and export
export TOKEN="your-jwt-token-here"
```

### Content Ingestion
```bash
# Research Topic
curl -X POST http://localhost:8000/api/research \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"AI breakthroughs 2025","max_web_results":5,"max_youtube_results":3}'

# Ingest RSS Feed
curl -X POST http://localhost:8000/api/ingest/rss \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://techcrunch.com/feed/","max_articles":10}'

# Ingest YouTube Video
curl -X POST http://localhost:8000/api/ingest/youtube \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=..."}'
```

### Analytics
```bash
# Trending Topics
curl http://localhost:8000/api/trends/analytics/trending?days=14

# Emerging Topics
curl http://localhost:8000/api/trends/analytics/emerging?min_velocity=50

# Trending Summary (Dashboard)
curl http://localhost:8000/api/trends/analytics/summary?days=14

# Forecast Category
curl http://localhost:8000/api/trends/analytics/forecast/5?forecast_days=7

# Category Momentum
curl http://localhost:8000/api/trends/analytics/momentum/5
```

### Digests
```bash
# Generate Daily Digest
curl -X POST http://localhost:8000/api/digests/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"digest_type":"daily"}'

# Generate Custom Period Digest
curl -X POST http://localhost:8000/api/digests/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"digest_type":"custom","custom_period_days":3}'

# List Digests
curl http://localhost:8000/api/digests?page=1&page_size=10 \
  -H "Authorization: Bearer $TOKEN"

# Resend Digest
curl -X POST http://localhost:8000/api/digests/123/send \
  -H "Authorization: Bearer $TOKEN"
```

### Categories
```bash
# List Categories
curl http://localhost:8000/api/categories?include_stats=true

# Create Category
curl -X POST http://localhost:8000/api/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Machine Learning","description":"ML articles","color":"#4F46E5"}'

# Bulk Assign Categories
curl -X POST http://localhost:8000/api/categories/bulk/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"article_ids":[1,2,3],"category_ids":[5,12],"mode":"add"}'

# Merge Categories
curl -X POST "http://localhost:8000/api/categories/bulk/merge?source_category_id=8&target_category_id=5&delete_source=true" \
  -H "Authorization: Bearer $TOKEN"

# Cleanup Unused
curl -X DELETE http://localhost:8000/api/categories/bulk/cleanup \
  -H "Authorization: Bearer $TOKEN"
```

### Embeddings & Knowledge Graph
```bash
# Check Stats
curl http://localhost:8000/api/embeddings/stats

# Generate Embeddings
curl -X POST http://localhost:8000/api/embeddings/generate-all

# Compute Connections
curl -X POST http://localhost:8000/api/embeddings/compute-connections \
  -H "Content-Type: application/json" \
  -d '{"min_similarity":0.5}'

# Get Knowledge Graph
curl "http://localhost:8000/api/embeddings/graph?limit=100&cluster=true"

# Search Similar Articles
curl http://localhost:8000/api/embeddings/similar/123?limit=10
```

---

## 🔧 Common Tasks

### Check System Health
```bash
# Backend health
curl http://localhost:8000/health

# Embedding progress
curl http://localhost:8000/api/embeddings/stats

# Connection stats
curl http://localhost:8000/ws/connections
```

### User Preferences
```bash
# Get Preferences
curl http://localhost:8000/api/auth/preferences \
  -H "Authorization: Bearer $TOKEN"

# Update Digest Frequency
curl -X PATCH http://localhost:8000/api/auth/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"digest_frequency":"daily","email_notifications":true}'

# Follow Topic
curl -X POST http://localhost:8000/api/auth/preferences/topics/5 \
  -H "Authorization: Bearer $TOKEN"

# Unfollow Topic
curl -X DELETE http://localhost:8000/api/auth/preferences/topics/5 \
  -H "Authorization: Bearer $TOKEN"
```

### Database Operations
```bash
# Connect to database
docker-compose exec db psql -U curator -d content_curator

# Common queries
SELECT COUNT(*) FROM articles;
SELECT COUNT(*) FROM articles WHERE embedding IS NOT NULL;
SELECT COUNT(*) FROM semantic_connections;
SELECT name, COUNT(*) as count FROM categories
  JOIN article_categories ON categories.id = article_categories.category_id
  GROUP BY name ORDER BY count DESC;
```

---

## 🐛 Troubleshooting

### Backend Issues
```bash
# Restart backend
lsof -ti:8000 | xargs kill -9
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Check logs
tail -f backend/logs/app.log

# Test Ollama connection
curl http://localhost:11434/api/tags
```

### Frontend Issues
```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run dev

# Check for TypeScript errors
npm run type-check

# Check for linting issues
npm run lint
```

### Ollama Issues
```bash
# Check Ollama service
ollama list

# Pull models if missing
ollama pull llama3.2
ollama pull nomic-embed-text

# Test Ollama
ollama run llama3.2 "Hello, how are you?"
```

### Database Issues
```bash
# Recreate database (WARNING: deletes all data)
dropdb content_curator
createdb content_curator
cd backend && alembic upgrade head
```

---

## 📝 Environment Variables

### Required Backend Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/content_curator

# Security
SECRET_KEY=your-secret-key-here

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# External APIs
TAVILY_API_KEY=your-tavily-key
YOUTUBE_API_KEY=your-youtube-key

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Required Frontend Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🧪 Testing

### Test Authentication
```bash
# Register → Login → Access Protected Route
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"test123"}' | \
  jq -r '.access_token')

curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Test Research Flow
```bash
# Start research job
JOB_ID=$(curl -s -X POST http://localhost:8000/api/research \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"quantum computing","max_web_results":3}' | \
  jq -r '.id')

# Check job status
curl http://localhost:8000/api/jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"

# Wait for completion and check articles
sleep 30
curl http://localhost:8000/api/articles?page=1&page_size=5 \
  -H "Authorization: Bearer $TOKEN"
```

### Test WebSocket
```bash
# In browser console:
const ws = new WebSocket('ws://localhost:8000/ws/jobs/123');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Update:', JSON.parse(e.data));
```

---

## 📊 Performance Metrics

### Expected Response Times
- Health check: <50ms
- List articles: <200ms
- Analytics summary: <500ms
- Generate digest: 3-5s (AI processing)
- Research job: 30-60s (depends on results)

### Rate Limits
- Default: 100 requests/minute
- Login: 10/minute
- Registration: 5/hour
- Research: 5/minute
- Digest generation: 5/hour

---

## 🔐 Security Best Practices

### Development
- ✅ Never commit .env files
- ✅ Use strong SECRET_KEY
- ✅ Enable CORS only for localhost
- ✅ Use HTTPS in production

### Production
- ✅ Change all default passwords
- ✅ Use environment variables
- ✅ Enable rate limiting
- ✅ Set up SSL/TLS
- ✅ Configure firewall
- ✅ Regular backups
- ✅ Monitor logs

---

## 📚 Useful Links

- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **GitHub Repo**: [Your repository]
- **Issues**: [GitHub Issues]
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Next.js Docs**: https://nextjs.org/docs
- **Ollama Models**: https://ollama.ai/library

---

## 🎯 Common Workflows

### Daily Development Workflow
1. Start backend and frontend
2. Check health endpoints
3. Make changes
4. Test locally
5. Commit and push

### Content Curation Workflow
1. Research topic via API or UI
2. Review and categorize articles
3. Generate embeddings
4. Explore knowledge graph
5. Generate digest
6. Share insights

### Analytics Workflow
1. Open analytics dashboard
2. Review trending topics
3. Identify emerging content
4. Check momentum scores
5. Forecast future trends
6. Adjust content strategy

---

**Quick Tip**: Bookmark this page for fast access to commands! 📌
