# Testing Guide - Content Curator

This guide provides sample data and testing scenarios for the Content Curator application.

## Prerequisites

Make sure the application is running:
```bash
./start.sh
```

Wait for all services to be ready (the script will confirm when ready).

---

## Test Scenario 1: RSS Feed Ingestion

### Using the API Documentation (Recommended)

1. Navigate to http://localhost:8000/docs
2. Find the `POST /api/ingest/rss` endpoint
3. Click "Try it out"
4. Use one of these sample feeds:

#### Sample RSS Feeds

**Hacker News (Tech News)**
```json
{
  "url": "https://news.ycombinator.com/rss",
  "source_name": "Hacker News",
  "max_articles": 5
}
```

**TechCrunch (Tech Startups)**
```json
{
  "url": "https://techcrunch.com/feed/",
  "source_name": "TechCrunch",
  "max_articles": 5
}
```

**MIT News - AI**
```json
{
  "url": "https://news.mit.edu/rss/topic/artificial-intelligence2",
  "source_name": "MIT News - AI",
  "max_articles": 5
}
```

**ArXiv - AI Research**
```json
{
  "url": "http://export.arxiv.org/rss/cs.AI",
  "source_name": "ArXiv CS.AI",
  "max_articles": 3
}
```

**NASA News**
```json
{
  "url": "https://www.nasa.gov/rss/dyn/breaking_news.rss",
  "source_name": "NASA",
  "max_articles": 5
}
```

### Using cURL

```bash
# Ingest Hacker News
curl -X POST "http://localhost:8000/api/ingest/rss" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com/rss",
    "source_name": "Hacker News",
    "max_articles": 5
  }'

# Ingest TechCrunch
curl -X POST "http://localhost:8000/api/ingest/rss" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://techcrunch.com/feed/",
    "source_name": "TechCrunch",
    "max_articles": 5
  }'
```

### Expected Response

```json
{
  "success": true,
  "message": "Processed 5 articles: 5 created, 0 updated",
  "articles_processed": 5,
  "articles_created": 5,
  "articles_updated": 0,
  "errors": []
}
```

**Note**: First ingestion takes longer (~1-2 minutes for 5 articles) because Ollama processes each article. Be patient!

---

## Test Scenario 2: YouTube Video Ingestion

### Sample YouTube Videos

Videos with good transcripts for testing:

**Technology Talk**
```json
{
  "url": "https://www.youtube.com/watch?v=aircAruvnKk",
  "source_name": "YouTube"
}
```

**Educational Content**
```json
{
  "url": "https://www.youtube.com/watch?v=RF8LbAdAZ7o",
  "source_name": "YouTube"
}
```

### Using cURL

```bash
curl -X POST "http://localhost:8000/api/ingest/youtube" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=aircAruvnKk",
    "source_name": "YouTube"
  }'
```

### Expected Response

```json
{
  "success": true,
  "message": "Successfully ingested YouTube video aircAruvnKk",
  "articles_processed": 1,
  "articles_created": 1,
  "articles_updated": 0,
  "errors": []
}
```

**Note**: Only works for videos with available transcripts. Not all videos have them.

---

## Test Scenario 3: Browsing Articles

### Frontend Testing

1. **Navigate to Articles Page**
   - Open http://localhost:3000/articles
   - You should see all ingested articles

2. **Test Search**
   - Type "AI" in the search bar
   - Click Search
   - Should return articles mentioning AI

3. **Test Filters**
   - Click on a category filter (e.g., "AI", "Technology")
   - Click on source type filter (e.g., "RSS", "YOUTUBE")
   - Try combining filters

4. **Test Pagination**
   - If you have more than 10 articles, pagination appears at the bottom
   - Navigate between pages

5. **View Article Details**
   - Click on any article title
   - Should show full article page with:
     * Executive Summary
     * Full Summary
     * Key Points (numbered list)
     * Full Content
     * Metadata

### API Testing

**Get All Articles**
```bash
curl "http://localhost:8000/api/articles"
```

**Get Articles Page 2**
```bash
curl "http://localhost:8000/api/articles?page=2&page_size=10"
```

**Filter by Category**
```bash
curl "http://localhost:8000/api/articles?category=AI"
```

**Filter by Source Type**
```bash
curl "http://localhost:8000/api/articles?source_type=rss"
```

**Search Articles**
```bash
# Search for "machine learning"
curl "http://localhost:8000/api/articles/search?query=machine%20learning"

# Search with filters
curl "http://localhost:8000/api/articles/search?query=AI&categories=Technology&source_types=rss"
```

**Get Single Article**
```bash
# Get article with ID 1
curl "http://localhost:8000/api/articles/1"
```

**Get Categories**
```bash
curl "http://localhost:8000/api/articles/categories/list"
```

---

## Test Scenario 4: Batch Ingestion

To build a good dataset for testing Phase 2 (knowledge graph), ingest multiple sources:

```bash
# Script to ingest multiple sources
#!/bin/bash

# Array of RSS feeds
feeds=(
  "https://news.ycombinator.com/rss|Hacker News"
  "https://techcrunch.com/feed/|TechCrunch"
  "https://news.mit.edu/rss/topic/artificial-intelligence2|MIT AI News"
  "https://www.theverge.com/rss/index.xml|The Verge"
  "http://export.arxiv.org/rss/cs.AI|ArXiv AI"
)

for feed in "${feeds[@]}"; do
  IFS='|' read -r url name <<< "$feed"
  echo "Ingesting: $name"
  curl -X POST "http://localhost:8000/api/ingest/rss" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$url\", \"source_name\": \"$name\", \"max_articles\": 10}"
  echo ""
  echo "Waiting 30 seconds before next feed..."
  sleep 30
done

echo "Batch ingestion complete!"
```

Save as `batch_ingest.sh`, make executable, and run:
```bash
chmod +x batch_ingest.sh
./batch_ingest.sh
```

**Warning**: This will take 10-15 minutes as Ollama processes ~50 articles.

---

## Test Scenario 5: Verify Ollama Processing

Check that Ollama is properly processing content:

1. **View Article Details**
   - Open any article at http://localhost:3000/articles/{id}
   - Verify all sections are present:
     * Executive Summary (2-3 sentences)
     * Full Summary (paragraph)
     * Key Points (5-7 bullet points)
     * Categories (1-3 tags)

2. **Check Quality**
   - Executive summary should be concise and informative
   - Full summary should capture main points
   - Key points should be distinct and relevant
   - Categories should be appropriate (AI, Technology, Science, etc.)

---

## Test Scenario 6: Error Handling

### Test Invalid RSS Feed
```bash
curl -X POST "http://localhost:8000/api/ingest/rss" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://invalid-feed-url.com/rss",
    "max_articles": 5
  }'
```

Expected: Error message in response

### Test Invalid YouTube URL
```bash
curl -X POST "http://localhost:8000/api/ingest/youtube" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=invalid"
  }'
```

Expected: Error about invalid video or no transcript

### Test Duplicate Ingestion
```bash
# Ingest the same feed twice
curl -X POST "http://localhost:8000/api/ingest/rss" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com/rss",
    "max_articles": 5
  }'
```

Expected: Second time should show articles_updated instead of articles_created

---

## Performance Testing

### Monitoring Logs

Watch the backend logs to see processing:
```bash
docker-compose logs -f backend
```

You'll see:
- RSS feed parsing
- Article processing
- Ollama API calls
- Database operations
- Any errors or warnings

### Check Database

Connect to the database to verify data:
```bash
docker-compose exec postgres psql -U curator -d content_curator

# Run queries
SELECT COUNT(*) FROM articles;
SELECT COUNT(*) FROM summaries;
SELECT COUNT(*) FROM categories;
SELECT name, COUNT(*) FROM categories GROUP BY name;

# Exit
\q
```

---

## Troubleshooting Tests

### Issue: Ingestion is very slow

**Cause**: Ollama processing takes time  
**Solution**: This is normal. Each article takes ~10-20 seconds to process.

### Issue: "Connection refused" to Ollama

**Cause**: Ollama not running  
**Solution**: 
```bash
ollama serve
```

### Issue: No articles appearing in frontend

**Cause**: Backend not running or database migration not run  
**Solution**:
```bash
docker-compose logs backend
docker-compose exec backend alembic upgrade head
```

### Issue: YouTube ingestion fails

**Cause**: Video doesn't have transcript or is private  
**Solution**: Try a different video (most educational/tech talks have transcripts)

---

## Validation Checklist

After running tests, verify:

- [ ] At least 10 articles ingested successfully
- [ ] Articles have summaries (executive, full, key points)
- [ ] Articles have categories
- [ ] Search functionality returns relevant results
- [ ] Filters work (category and source type)
- [ ] Pagination works (if >10 articles)
- [ ] Article detail page displays all information
- [ ] External links work
- [ ] No errors in backend logs
- [ ] Database has data (verify with psql)

---

## Next Steps

Once Phase 1 testing is complete and working well:

1. **Ingest more content** (aim for 50-100 articles)
2. **Verify data quality** (check summaries make sense)
3. **Document any issues** found
4. **Proceed to Phase 2** (Knowledge Graph)

---

## Quick Test Command Reference

```bash
# Health check
curl http://localhost:8000/health

# Ingest RSS
curl -X POST "http://localhost:8000/api/ingest/rss" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://news.ycombinator.com/rss", "max_articles": 5}'

# Get articles
curl http://localhost:8000/api/articles

# Search
curl "http://localhost:8000/api/articles/search?query=AI"

# View logs
docker-compose logs -f backend

# Check database
docker-compose exec postgres psql -U curator -d content_curator -c "SELECT COUNT(*) FROM articles;"
```

Happy testing! 🧪
