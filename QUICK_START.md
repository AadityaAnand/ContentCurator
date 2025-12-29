# Quick Start Guide - Content Curator

**Status**: ✅ Fresh Database (0 articles)
**Date**: December 29, 2025

---

## 🎯 TL;DR - What Is This For?

**NOT for**: One-time Google searches (use Google)
**IS for**: Monitoring 10-20 sources on topics you care about, getting daily digests

**Think**: Smart RSS reader + AI summaries + knowledge graph + trend detection

---

## 🚀 Get Started in 5 Minutes

### Option A: Tech Professional (Example)

**1. Add RSS Feeds** (Pick 3-5 you actually read):
```bash
# TechCrunch
curl -X POST http://localhost:8000/api/ingest/rss \
  -H "Content-Type: application/json" \
  -d '{"url":"https://techcrunch.com/feed/","max_articles":5}'

# Hacker News
curl -X POST http://localhost:8000/api/ingest/rss \
  -H "Content-Type: application/json" \
  -d '{"url":"https://news.ycombinator.com/rss","max_articles":5}'

# Dev.to
curl -X POST http://localhost:8000/api/ingest/rss \
  -H "Content-Type: application/json" \
  -d '{"url":"https://dev.to/feed/","max_articles":5}'
```

**2. Research Your Main Interests** (2-3 topics):
```bash
# Your tech stack
curl -X POST http://localhost:8000/api/research/topic \
  -H "Content-Type: application/json" \
  -d '{
    "query":"Next.js 15 features and best practices",
    "max_web_results":3,
    "max_youtube_results":2
  }'

# Your industry
curl -X POST http://localhost:8000/api/research/topic \
  -H "Content-Type: application/json" \
  -d '{
    "query":"AI coding assistants comparison 2024",
    "max_web_results":3,
    "max_youtube_results":2
  }'
```

**3. Check Results**:
```bash
# View articles
open http://localhost:3000

# Check analytics
open http://localhost:3000/analytics

# View categories
open http://localhost:3000/categories
```

**4. Organize**:
- Go to `/categories`
- Merge duplicate categories (e.g., "AI" + "Artificial Intelligence")
- Delete irrelevant ones

**5. Set Up Digest** (Optional):
- Configure SMTP in `backend/.env` (see SETUP_GUIDE.md)
- Set preferences to daily/weekly
- Get ONE email instead of checking 10 sites

---

### Option B: Content Creator

**Use Case**: YouTube channel covering tech news

**1. Add News Sources**:
```bash
# Multiple tech news RSS feeds
curl -X POST http://localhost:8000/api/ingest/rss \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.theverge.com/rss/index.xml","max_articles":5}'

curl -X POST http://localhost:8000/api/ingest/rss \
  -H "Content-Type: application/json" \
  -d '{"url":"https://arstechnica.com/feed/","max_articles":5}'
```

**2. Daily Research for Video Ideas**:
```bash
curl -X POST http://localhost:8000/api/research/topic \
  -H "Content-Type: application/json" \
  -d '{"query":"AI breakthroughs this week","max_web_results":5,"max_youtube_results":5}'
```

**3. Use Analytics**:
- Check `/analytics` for trending topics
- Use hot topics as video ideas
- Knowledge graph shows related stories

---

### Option C: Learning Mode

**Use Case**: Learning about a new technology

**1. Comprehensive Research**:
```bash
# Beginner content
curl -X POST http://localhost:8000/api/research/topic \
  -H "Content-Type: application/json" \
  -d '{"query":"Rust programming language for beginners","max_web_results":5,"max_youtube_results":5}'

# Advanced topics
curl -X POST http://localhost:8000/api/research/topic \
  -H "Content-Type: application/json" \
  -d '{"query":"Rust ownership and borrowing explained","max_web_results":3,"max_youtube_results":3}'

# Real-world usage
curl -X POST http://localhost:8000/api/research/topic \
  -H "Content-Type: application/json" \
  -d '{"query":"Rust web development frameworks","max_web_results":3,"max_youtube_results":2}'
```

**2. Add Learning Resources**:
```bash
# Add blogs/tutorials
curl -X POST http://localhost:8000/api/ingest/rss \
  -H "Content-Type: application/json" \
  -d '{"url":"https://blog.rust-lang.org/feed.xml","max_articles":10}'
```

**3. Track Progress**:
- Knowledge graph shows how concepts connect
- Weekly digest summarizes what you learned
- Semantic search finds related tutorials

---

## 📋 Quality RSS Feed Sources (By Category)

### Tech News
- https://techcrunch.com/feed/
- https://www.theverge.com/rss/index.xml
- https://arstechnica.com/feed/
- https://news.ycombinator.com/rss

### Development
- https://dev.to/feed/
- https://css-tricks.com/feed/
- https://github.com/trending (use RSS variant)
- https://blog.golang.org/feed.atom

### AI/ML
- https://blog.openai.com/rss/
- https://deepmind.google/blog/rss.xml
- https://www.deeplearning.ai/the-batch/ (newsletter)

### Startups/Business
- https://ycombinator.com/blog.rss
- https://paulgraham.com/rss.html
- https://www.indiehackers.com/feed

### Design
- https://www.smashingmagazine.com/feed/
- https://www.awwwards.com/blog/feed/
- https://dribbble.com/shots/following.rss

---

## ⚡ Pro Tips

### 1. Start Small
- ❌ Don't add 50 RSS feeds on day 1
- ✅ Add 5 quality sources, evaluate after a week

### 2. Use Research Strategically
- ❌ Don't search "python tutorials" (too broad)
- ✅ Search "python async await best practices 2024" (specific)

### 3. Organize Categories Early
- Go to `/categories` after first ingestion
- Merge duplicates immediately
- Keep 10-20 well-defined categories max

### 4. Trust But Verify
- Use AI summaries to prioritize
- Click through to read full articles
- Don't trust summaries blindly

### 5. Set Up Automation
```bash
# Daily RSS ingestion (cron job)
0 8 * * * cd /path/to/backend && python scripts/ingest_feeds.py

# Daily research (cron job)
0 9 * * * cd /path/to/backend && python scripts/daily_research.py
```

---

## 🎯 What Success Looks Like

**After 1 Week**:
- [ ] 20-30 quality articles ingested
- [ ] 5-10 organized categories
- [ ] Can find articles easily
- [ ] Spending 10 min/day vs 1 hour checking sites

**After 1 Month**:
- [ ] 100-200 articles in knowledge base
- [ ] Daily/weekly digest configured
- [ ] Discovering connections via knowledge graph
- [ ] Spotting trends in analytics
- [ ] Saved 20+ hours vs manual checking

---

## 🚨 Common Mistakes

### Mistake 1: Using It Like Google
**Wrong**: Search "weather today"
**Right**: Monitor "climate change research" over time

### Mistake 2: Too Many Sources
**Wrong**: 100 RSS feeds
**Right**: 10-15 carefully chosen feeds

### Mistake 3: No Organization
**Wrong**: Let AI create 500 random categories
**Right**: Maintain 10-20 curated categories

### Mistake 4: Trusting AI Blindly
**Wrong**: Share AI summary as fact
**Right**: Use summary to decide if worth reading full article

### Mistake 5: Not Using Digests
**Wrong**: Check platform daily manually
**Right**: Let digest email come to you

---

## 📚 See Also

- **ACTUAL_USE_CASE.md** - Comprehensive guide with workflows
- **SETUP_GUIDE.md** - Email setup, automation, deployment
- **QUICK_REFERENCE.md** - All API commands
- **ALL_TASKS_COMPLETE.md** - System status and features

---

**Ready to start?** Pick Option A, B, or C above and run the commands!
