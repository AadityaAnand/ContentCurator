import logging
import asyncio
from typing import Dict, List
from sqlalchemy.orm import Session

from app.models import Article, Summary, Category
from app.services.topic_ingestion_service import topic_ingestion_service
from app.services.youtube_search_service import youtube_search_service
from app.services.youtube_service import youtube_ingestion_service
from app.services.ollama_service import ollama_service
from app.schemas import TopicIngest, YouTubeIngest

logger = logging.getLogger(__name__)


class ResearchService:
    """
    Unified research service that automatically searches multiple sources:
    - Web articles (via Tavily)
    - YouTube videos (via YouTube Data API)

    Processes all content with Ollama and stores in database.
    """

    async def research_topic(
        self,
        query: str,
        max_web_results: int = 5,
        max_youtube_results: int = 3,
        db: Session = None
    ) -> Dict:
        """
        Research a topic by searching web and YouTube, processing all content.

        Args:
            query: Topic to research
            max_web_results: Number of web articles to fetch (1-15)
            max_youtube_results: Number of YouTube videos to fetch (1-10)
            db: Database session

        Returns:
            Dict with results:
            {
                "success": bool,
                "query": str,
                "web_articles_created": int,
                "youtube_videos_created": int,
                "total_articles_created": int,
                "errors": List[str]
            }
        """
        logger.info(f"Starting research for topic: {query}")

        web_articles_created = 0
        youtube_videos_created = 0
        errors = []

        # Run web search and YouTube search in parallel
        web_task = self._search_web(query, max_web_results, db)
        youtube_task = self._search_youtube(query, max_youtube_results, db)

        web_result, youtube_result = await asyncio.gather(
            web_task,
            youtube_task,
            return_exceptions=True
        )

        # Process web search results
        if isinstance(web_result, Exception):
            error_msg = f"Web search failed: {str(web_result)}"
            logger.error(error_msg)
            errors.append(error_msg)
        elif web_result:
            web_articles_created = web_result.get("articles_created", 0)
            if web_result.get("errors"):
                errors.extend(web_result["errors"])

        # Process YouTube search results
        if isinstance(youtube_result, Exception):
            error_msg = f"YouTube search failed: {str(youtube_result)}"
            logger.error(error_msg)
            errors.append(error_msg)
        elif youtube_result:
            youtube_videos_created = youtube_result.get("videos_created", 0)
            if youtube_result.get("errors"):
                errors.extend(youtube_result["errors"])

        total_created = web_articles_created + youtube_videos_created
        success = total_created > 0

        result = {
            "success": success,
            "query": query,
            "web_articles_created": web_articles_created,
            "youtube_videos_created": youtube_videos_created,
            "total_articles_created": total_created,
            "errors": errors
        }

        logger.info(f"Research completed: {web_articles_created} web articles, "
                   f"{youtube_videos_created} videos, {len(errors)} errors")

        return result

    async def _search_web(self, query: str, max_results: int, db: Session) -> Dict:
        """Search web using existing topic ingestion service."""
        try:
            topic = TopicIngest(
                query=query,
                max_results=max_results,
                source_name="Web Research"
            )
            result = await topic_ingestion_service.ingest_topic(topic, db)
            return {
                "articles_created": result.articles_created,
                "errors": result.errors
            }
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            raise

    async def _search_youtube(self, query: str, max_results: int, db: Session) -> Dict:
        """Search YouTube and ingest top videos."""
        errors = []
        videos_created = 0

        try:
            # Search for videos
            videos = await youtube_search_service.search_videos(query, max_results)

            if not videos:
                logger.warning(f"No YouTube videos found for query: {query}")
                return {"videos_created": 0, "errors": []}

            # Ingest each video
            for video in videos:
                try:
                    url = video["url"]

                    # Check if already exists
                    existing = db.query(Article).filter(Article.url == url).first()
                    if existing:
                        logger.info(f"Video already exists: {url}")
                        continue

                    # Ingest video using existing YouTube service
                    youtube_data = YouTubeIngest(
                        url=url,
                        source_name="YouTube Research"
                    )
                    result = await youtube_ingestion_service.ingest_youtube_video(youtube_data, db)

                    if result.success:
                        videos_created += 1
                    else:
                        errors.extend(result.errors)

                except Exception as e:
                    error_msg = f"Failed to ingest video {video.get('url')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

            return {"videos_created": videos_created, "errors": errors}

        except Exception as e:
            logger.error(f"YouTube search failed: {e}")
            raise


# Global instance
research_service = ResearchService()
