import logging
import re
from typing import List, Dict
from urllib.parse import urlparse

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Article, Summary, Category
from app.schemas import TopicIngest, IngestionResponse
from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)


class TopicIngestionService:
    """Search the web for a topic, summarize, and store articles."""

    def __init__(self) -> None:
        self.search_endpoint = "https://api.tavily.com/search"
        self.http_timeout = 15.0

    async def ingest_topic(self, payload: TopicIngest, db: Session) -> IngestionResponse:
        if not settings.TAVILY_API_KEY:
            raise ValueError("TAVILY_API_KEY is not configured")

        articles_processed = 0
        articles_created = 0
        articles_updated = 0
        errors: List[str] = []

        try:
            search_results = await self._search_web(payload.query, payload.max_results)
            if not search_results:
                return IngestionResponse(
                    success=False,
                    message="No search results found",
                    articles_processed=0,
                    articles_created=0,
                    articles_updated=0,
                    errors=["Search returned no results"]
                )

            for result in search_results:
                articles_processed += 1
                url = result.get("url") or result.get("link")
                title = result.get("title") or payload.query
                if not url:
                    errors.append("Result missing URL; skipped")
                    continue

                try:
                    existing = db.query(Article).filter(Article.url == url).first()
                    if existing:
                        articles_updated += 1
                        continue

                    content = await self._fetch_content(url)
                    if not content or len(content) < 200:
                        errors.append(f"Content too short for {url}; skipped")
                        continue

                    processed = await ollama_service.process_article_content(title, content)

                    article = Article(
                        title=title,
                        url=url,
                        source_type="web_search",
                        source_name=payload.source_name or self._extract_domain(url),
                        content=content,
                        author=None,
                        published_at=None
                    )
                    db.add(article)
                    db.flush()

                    summary = Summary(
                        article_id=article.id,
                        executive_summary=processed["executive_summary"],
                        full_summary=processed["full_summary"],
                        key_points=processed["key_points"]
                    )
                    db.add(summary)

                    for cat_name in processed["categories"]:
                        category = db.query(Category).filter(Category.name == cat_name).first()
                        if not category:
                            category = Category(name=cat_name)
                            db.add(category)
                            db.flush()
                        article.categories.append(category)

                    db.commit()
                    articles_created += 1
                except Exception as exc:
                    db.rollback()
                    logger.error(f"Failed to ingest {url}: {exc}")
                    errors.append(f"{url}: {exc}")

            success = articles_created > 0 or articles_updated > 0
            message = f"Processed {articles_processed} results: {articles_created} created, {articles_updated} skipped as existing"
            return IngestionResponse(
                success=success,
                message=message,
                articles_processed=articles_processed,
                articles_created=articles_created,
                articles_updated=articles_updated,
                errors=errors
            )
        except Exception as exc:
            logger.error(f"Topic ingestion failed: {exc}")
            return IngestionResponse(
                success=False,
                message="Topic ingestion failed",
                articles_processed=articles_processed,
                articles_created=articles_created,
                articles_updated=articles_updated,
                errors=errors + [str(exc)]
            )

    async def _search_web(self, query: str, max_results: int) -> List[Dict[str, str]]:
        payload = {
            "api_key": settings.TAVILY_API_KEY,
            "query": query,
            "max_results": max_results,
            "search_depth": "basic",
            "include_answer": False,
        }
        async with httpx.AsyncClient(timeout=self.http_timeout) as client:
            resp = await client.post(self.search_endpoint, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("results", [])

    async def _fetch_content(self, url: str) -> str:
        async with httpx.AsyncClient(timeout=self.http_timeout) as client:
            resp = await client.get(url, follow_redirects=True)
            resp.raise_for_status()
            html = resp.text
            return self._strip_html(html)

    def _strip_html(self, html: str) -> str:
        cleaned = re.sub(r"(?is)<(script|style).*?>.*?</\\1>", " ", html)
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip()[:15000]

    def _extract_domain(self, url: str) -> str:
        try:
            parsed = urlparse(url)
            return parsed.netloc.replace("www.", "") or "web"
        except Exception:
            return "web"


# Global instance
topic_ingestion_service = TopicIngestionService()
