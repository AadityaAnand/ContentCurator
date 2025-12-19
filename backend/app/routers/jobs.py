"""Job tracking and status endpoints for background tasks."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import logging
from datetime import datetime

from app.database import get_db
from app.models import Job
from app.schemas import JobResponse, JobStatusResponse
from app.services.topic_ingestion_service import topic_ingestion_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Get status of a specific job (lightweight endpoint for polling)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(
        id=job.id,
        status=job.status,
        progress=job.progress,
        total_items=job.total_items,
        processed_items=job.processed_items,
        created_items=job.created_items,
        error_message=job.error_message,
        result=job.result
    )


@router.get("/", response_model=list[JobResponse])
async def list_jobs(
    job_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """List recent jobs with optional filtering."""
    query = db.query(Job)

    if job_type:
        query = query.filter(Job.job_type == job_type)
    if status:
        query = query.filter(Job.status == status)

    jobs = query.order_by(Job.created_at.desc()).limit(limit).all()
    return jobs


@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Delete a completed or failed job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == "running":
        raise HTTPException(status_code=400, detail="Cannot delete a running job")

    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}
