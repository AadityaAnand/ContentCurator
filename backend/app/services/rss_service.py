import feedparser
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Article, Summary, Category
from app.schemas import RSSFeedIngest, IngestionResponse
from app.services.ollama_service import ollama_service
import logging
from email.utils import parsedate_to_datetime

logger = logging.getLogger(__name__)


class RSSIngestionService:
    """Service for ingesting and processing RSS feeds"""
    
    async def ingest_rss_feed(
        self,
        feed_data: RSSFeedIngest,
        db: Session
    ) -> IngestionResponse:
        """
        Ingest articles from an RSS feed.
        
        Args:
            feed_data: RSS feed configuration
            db: Database session
            
        Returns:
            IngestionResponse with statistics
        """
        articles_processed = 0
        articles_created = 0
        articles_updated = 0
        errors = []
        
        try:
            # Parse RSS feed
            feed = feedparser.parse(str(feed_data.url))
            
            if feed.bozo:
                logger.warning(f"Feed parsing warning: {feed.bozo_exception}")
            
            if not feed.entries:
                return IngestionResponse(
                    success=False,
                    message="No entries found in feed",
                    articles_processed=0,
                    articles_created=0,
                    articles_updated=0,
                    errors=["Feed contains no entries"]
                )
            
            # Determine source name
            source_name = feed_data.source_name
            if not source_name and hasattr(feed.feed, 'title'):
                source_name = feed.feed.title
            
            # Process entries
            entries = feed.entries[:feed_data.max_articles]
            
            for entry in entries:
                articles_processed += 1
                
                try:
                    # Extract article data
                    title = entry.get('title', 'No Title')
                    url = entry.get('link', '')
                    
                    if not url:
                        errors.append(f"Entry '{title}' has no URL, skipping")
                        continue
                    
                    # Get content
                    content = self._extract_content(entry)
                    
                    if not content or len(content) < 100:
                        errors.append(f"Article '{title}' has insufficient content, skipping")
                        continue
                    
                    # Get author
                    author = entry.get('author', None)
                    
                    # Get published date
                    published_at = self._parse_date(entry)
                    
                    # Check if article already exists
                    existing_article = db.query(Article).filter(Article.url == url).first()
                    
                    if existing_article:
                        logger.info(f"Article already exists: {url}")
                        articles_updated += 1
                        continue
                    
                    # Process content with Ollama
                    logger.info(f"Processing article: {title}")
                    processed = await ollama_service.process_article_content(title, content)
                    
                    # Create article
                    article = Article(
                        title=title,
                        url=url,
                        source_type='rss',
                        source_name=source_name,
                        content=content,
                        author=author,
                        published_at=published_at
                    )
                    db.add(article)
                    db.flush()  # Get article ID
                    
                    # Create summary
                    summary = Summary(
                        article_id=article.id,
                        executive_summary=processed['executive_summary'],
                        full_summary=processed['full_summary'],
                        key_points=processed['key_points']
                    )
                    db.add(summary)
                    
                    # Handle categories
                    for cat_name in processed['categories']:
                        category = db.query(Category).filter(Category.name == cat_name).first()
                        if not category:
                            category = Category(name=cat_name)
                            db.add(category)
                            db.flush()
                        article.categories.append(category)
                    
                    db.commit()
                    articles_created += 1
                    logger.info(f"Successfully created article: {title}")
                    
                except Exception as e:
                    db.rollback()
                    error_msg = f"Error processing entry '{entry.get('title', 'unknown')}': {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
            
            success = articles_created > 0 or articles_updated > 0
            message = f"Processed {articles_processed} articles: {articles_created} created, {articles_updated} updated"
            
            return IngestionResponse(
                success=success,
                message=message,
                articles_processed=articles_processed,
                articles_created=articles_created,
                articles_updated=articles_updated,
                errors=errors
            )
            
        except Exception as e:
            logger.error(f"Error ingesting RSS feed: {e}")
            return IngestionResponse(
                success=False,
                message=f"Failed to ingest RSS feed: {str(e)}",
                articles_processed=articles_processed,
                articles_created=articles_created,
                articles_updated=articles_updated,
                errors=errors + [str(e)]
            )
    
    def _extract_content(self, entry: Dict[str, Any]) -> str:
        """Extract content from RSS entry"""
        # Try different content fields
        if hasattr(entry, 'content') and entry.content:
            return entry.content[0].value
        elif hasattr(entry, 'summary'):
            return entry.summary
        elif hasattr(entry, 'description'):
            return entry.description
        return ""
    
    def _parse_date(self, entry: Dict[str, Any]) -> Optional[datetime]:
        """Parse published date from entry"""
        try:
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                return datetime(*entry.published_parsed[:6])
            elif hasattr(entry, 'published'):
                return parsedate_to_datetime(entry.published)
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                return datetime(*entry.updated_parsed[:6])
        except Exception as e:
            logger.warning(f"Error parsing date: {e}")
        return None


# Global instance
rss_ingestion_service = RSSIngestionService()
