from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import RSSFeedIngest, YouTubeIngest, IngestionResponse
from app.services.rss_service import rss_ingestion_service
from app.services.youtube_service import youtube_ingestion_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.post("/rss", response_model=IngestionResponse)
async def ingest_rss_feed(
    feed_data: RSSFeedIngest,
    db: Session = Depends(get_db)
):
    """
    Ingest articles from an RSS feed.
    
    - **url**: RSS feed URL
    - **source_name**: Optional custom source name
    - **max_articles**: Maximum number of articles to process (1-100)
    
    The endpoint will:
    1. Fetch and parse the RSS feed
    2. Extract article content
    3. Generate summaries and key points using Ollama
    4. Auto-categorize articles
    5. Store in database
    """
    try:
        logger.info(f"Ingesting RSS feed: {feed_data.url}")
        result = await rss_ingestion_service.ingest_rss_feed(feed_data, db)
        return result
    except Exception as e:
        logger.error(f"Error in RSS ingestion endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest RSS feed: {str(e)}"
        )


@router.post("/youtube", response_model=IngestionResponse)
async def ingest_youtube_video(
    video_data: YouTubeIngest,
    db: Session = Depends(get_db)
):
    """
    Ingest a YouTube video by extracting its transcript.
    
    - **url**: YouTube video URL (supports various formats)
    - **source_name**: Optional custom source name
    
    The endpoint will:
    1. Extract video ID from URL
    2. Fetch transcript using youtube-transcript-api
    3. Generate summaries and key points using Ollama
    4. Auto-categorize video content
    5. Store in database
    
    Note: Only works for videos with available transcripts.
    """
    try:
        logger.info(f"Ingesting YouTube video: {video_data.url}")
        result = await youtube_ingestion_service.ingest_youtube_video(video_data, db)
        return result
    except Exception as e:
        logger.error(f"Error in YouTube ingestion endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest YouTube video: {str(e)}"
        )
