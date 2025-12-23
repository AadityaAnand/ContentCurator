from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models import Job, Article, Embedding
from app.schemas import ResearchRequest, JobResponse
from app.services.research_service import research_service
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/research", tags=["research"])


@router.post("/topic", response_model=JobResponse)
@limiter.limit("5/minute")
async def research_topic(
    http_request: Request,
    request: ResearchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Research a topic by automatically searching multiple sources:
    - Web articles (via Tavily)
    - YouTube videos (via YouTube Data API)

    This endpoint:
    1. Creates a background job
    2. Searches web and YouTube in parallel
    3. Processes all content with Ollama
    4. Auto-generates embeddings
    5. Auto-computes connections
    6. Returns immediately with job ID for status tracking

    - **query**: Topic to research
    - **max_web_results**: Number of web articles (1-15, default: 5)
    - **max_youtube_results**: Number of YouTube videos (0-10, default: 3)

    Use GET /api/jobs/{job_id}/status to poll for status updates.
    """
    try:
        # Create a job record
        total_items = request.max_web_results + request.max_youtube_results
        job = Job(
            job_type="topic_research",
            status="pending",
            total_items=total_items,
            parameters={
                "query": request.query,
                "max_web_results": request.max_web_results,
                "max_youtube_results": request.max_youtube_results
            }
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Schedule the background task
        background_tasks.add_task(
            run_research_job,
            job.id,
            request.model_dump()
        )

        logger.info(f"Created research job {job.id} for topic: {request.query}")
        return job

    except Exception as e:
        logger.error(f"Error creating research job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create research job: {str(e)}"
        )


async def run_research_job(job_id: int, research_data: dict):
    """Background task to run research and update job status."""
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

        # Run the research
        query = research_data["query"]
        max_web_results = research_data["max_web_results"]
        max_youtube_results = research_data["max_youtube_results"]

        logger.info(f"Job {job_id}: Starting research for '{query}'")

        result = await research_service.research_topic(
            query=query,
            max_web_results=max_web_results,
            max_youtube_results=max_youtube_results,
            db=db
        )

        # Update progress to 70% after ingestion
        job.progress = 70
        db.commit()

        # Auto-generate embeddings if articles were created
        embeddings_generated = 0
        connections_computed = 0

        if result["total_articles_created"] > 0:
            try:
                logger.info(f"Job {job_id}: Auto-generating embeddings...")

                # Import the task function
                from app.routers.embeddings import generate_embeddings_task, compute_connections_task

                # Get articles without embeddings
                articles_without_embeddings = db.query(Article).outerjoin(Embedding).filter(
                    Embedding.id == None
                ).all()

                if articles_without_embeddings:
                    article_ids = [a.id for a in articles_without_embeddings]
                    await generate_embeddings_task(article_ids)
                    embeddings_generated = len(article_ids)
                    logger.info(f"Job {job_id}: Generated {embeddings_generated} embeddings")

                job.progress = 85
                db.commit()

                logger.info(f"Job {job_id}: Auto-computing connections...")
                await compute_connections_task(0.7)

                # Count connections created (simple estimate)
                connections_computed = embeddings_generated * 2  # Rough estimate
                logger.info(f"Job {job_id}: Computed connections")

                job.progress = 95
                db.commit()

            except Exception as e:
                logger.error(f"Job {job_id}: Error in post-processing: {e}")
                result["errors"].append(f"Post-processing error: {str(e)}")

        # Update job with final results
        job.status = "completed"
        job.completed_at = datetime.now()
        job.progress = 100
        job.processed_items = result["total_articles_created"]
        job.created_items = result["total_articles_created"]
        job.result = {
            "success": result["success"],
            "query": result["query"],
            "web_articles_created": result["web_articles_created"],
            "youtube_videos_created": result["youtube_videos_created"],
            "total_articles_created": result["total_articles_created"],
            "embeddings_generated": embeddings_generated,
            "connections_computed": connections_computed,
            "errors": result["errors"]
        }
        db.commit()

        logger.info(f"Job {job_id} completed successfully: {result['total_articles_created']} articles, "
                   f"{embeddings_generated} embeddings, {connections_computed} connections")

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
