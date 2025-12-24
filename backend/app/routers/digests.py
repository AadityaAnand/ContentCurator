"""Digest generation and management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.database import get_db
from app.models import User, Digest
from app.schemas import DigestResponse, DigestListResponse, DigestCreate
from app.routers.auth import get_current_active_user
from app.services.digest_service import DigestService
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/digests", tags=["digests"])
limiter = Limiter(key_func=get_remote_address)

digest_service = DigestService()


@router.get("", response_model=DigestListResponse)
async def list_user_digests(
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all digests for the current user.

    Returns paginated list of digests with newest first.
    """
    # Calculate offset
    offset = (page - 1) * page_size

    # Query digests
    query = db.query(Digest).filter(Digest.user_id == current_user.id)
    total = query.count()

    digests = query.order_by(Digest.created_at.desc()).offset(offset).limit(page_size).all()

    return {
        "items": digests,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/{digest_id}", response_model=DigestResponse)
async def get_digest(
    digest_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific digest by ID."""
    digest = db.query(Digest).filter(
        Digest.id == digest_id,
        Digest.user_id == current_user.id
    ).first()

    if not digest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Digest not found"
        )

    return digest


@router.post("/generate", response_model=DigestResponse)
@limiter.limit("5/hour")
async def generate_digest(
    request: Request,
    digest_data: DigestCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate a new digest for the current user.

    Can specify digest type ('daily', 'weekly', 'custom') and custom period.
    """
    try:
        # Generate digest
        digest = await digest_service.generate_digest(
            user=current_user,
            db=db,
            digest_type=digest_data.digest_type,
            custom_period_days=digest_data.custom_period_days
        )

        if not digest:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No articles found for the specified period or user has digests disabled"
            )

        # Send email in background if user has notifications enabled
        if current_user.email_notifications:
            background_tasks.add_task(
                digest_service.send_digest,
                digest=digest,
                user=current_user,
                db=db
            )

        return digest

    except Exception as e:
        logger.error(f"Error generating digest: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate digest: {str(e)}"
        )


@router.post("/{digest_id}/send")
@limiter.limit("10/hour")
async def send_digest(
    request: Request,
    digest_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Resend an existing digest via email."""
    # Get digest
    digest = db.query(Digest).filter(
        Digest.id == digest_id,
        Digest.user_id == current_user.id
    ).first()

    if not digest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Digest not found"
        )

    # Send email
    success = await digest_service.send_digest(digest, current_user, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send digest email"
        )

    return {"message": "Digest sent successfully", "sent_at": digest.sent_at}


@router.delete("/{digest_id}")
async def delete_digest(
    digest_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a digest."""
    digest = db.query(Digest).filter(
        Digest.id == digest_id,
        Digest.user_id == current_user.id
    ).first()

    if not digest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Digest not found"
        )

    db.delete(digest)
    db.commit()

    return {"message": "Digest deleted successfully"}


# Admin endpoint to trigger batch digest generation
@router.post("/admin/send-batch")
@limiter.limit("1/hour")
async def send_digest_batch(
    request: Request,
    frequency: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to send digests to all users with specified frequency.

    This would typically be called by a scheduler (cron job).
    Should be protected by admin authentication in production.
    """
    if frequency not in ['daily', 'weekly']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Frequency must be 'daily' or 'weekly'"
        )

    # Run in background
    background_tasks.add_task(
        digest_service.send_digests_for_frequency,
        db=db,
        frequency=frequency
    )

    return {
        "message": f"Batch digest generation started for {frequency} digests",
        "frequency": frequency
    }
