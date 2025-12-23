from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models import Job
from app.schemas import RSSFeedIngest, YouTubeIngest, TopicIngest, IngestionResponse, JobResponse
from app.services.rss_service import rss_ingestion_service
from app.services.youtube_service import youtube_ingestion_service
from app.services.topic_ingestion_service import topic_ingestion_service
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.post("/rss", response_model=IngestionResponse)
@limiter.limit("10/minute")
async def ingest_rss_feed(
    request: Request,
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
@limiter.limit("10/minute")
async def ingest_youtube_video(
    request: Request,
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


@router.post("/topic", response_model=IngestionResponse)
async def ingest_topic(
    topic: TopicIngest,
    db: Session = Depends(get_db)
):
    """
    Ingest articles for an arbitrary topic using a web search API (synchronous).

    - **query**: Topic or keyword to search
    - **max_results**: Number of search results to process (1-15)

    The endpoint will search the web (Tavily), fetch each page, summarize with Ollama,
    auto-categorize, and store results. Requires `TAVILY_API_KEY` in settings.

    Note: This is a synchronous endpoint. For long-running operations, use /topic/async instead.
    """
    try:
        logger.info(f"Ingesting topic search for: {topic.query}")
        result = await topic_ingestion_service.ingest_topic(topic, db)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error in topic ingestion endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest topic: {str(e)}"
        )


@router.post("/topic/async", response_model=JobResponse)
async def ingest_topic_async(
    topic: TopicIngest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Ingest articles for a topic as a background job (asynchronous).

    - **query**: Topic or keyword to search
    - **max_results**: Number of search results to process (1-15)

    Returns immediately with a job ID that can be used to track progress.
    Use GET /api/jobs/{job_id}/status to poll for status updates.
    """
    try:
        # Create a job record
        job = Job(
            job_type="topic_ingestion",
            status="pending",
            total_items=topic.max_results,
            parameters={
                "query": topic.query,
                "max_results": topic.max_results,
                "source_name": topic.source_name
            }
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Schedule the background task
        background_tasks.add_task(
            run_topic_ingestion_job,
            job.id,
            topic.model_dump()
        )

        logger.info(f"Created background job {job.id} for topic: {topic.query}")
        return job

    except Exception as e:
        logger.error(f"Error creating topic ingestion job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create ingestion job: {str(e)}"
        )


async def run_topic_ingestion_job(job_id: int, topic_data: dict):
    """Background task to run topic ingestion and update job status."""
    from app.database import SessionLocal

    db = SessionLocal()

    try:
        # Get the job
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        # Update job status to running
        job.status = "running"
        job.started_at = datetime.now()
        job.progress = 0
        db.commit()

        # Create TopicIngest object
        topic = TopicIngest(**topic_data)

        # Run the ingestion
        result = await topic_ingestion_service.ingest_topic(topic, db)

        # Update job with results
        job.status = "completed"
        job.completed_at = datetime.now()
        job.progress = 100
        job.processed_items = result.articles_processed
        job.created_items = result.articles_created
        job.result = {
            "success": result.success,
            "message": result.message,
            "articles_processed": result.articles_processed,
            "articles_created": result.articles_created,
            "articles_updated": result.articles_updated,
            "errors": result.errors
        }
        db.commit()

        logger.info(f"Job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}")

        # Update job with error
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "failed"
            job.completed_at = datetime.now()
            job.error_message = str(e)
            db.commit()

    finally:
        db.close()
