"""Job tracking service with WebSocket integration."""
import asyncio
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Job
from app.services.websocket_manager import manager

logger = logging.getLogger(__name__)


class JobTracker:
    """Helper class for updating jobs with WebSocket notifications."""

    @staticmethod
    async def update_job(
        job: Job,
        db: Session,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        processed_items: Optional[int] = None,
        created_items: Optional[int] = None,
        error_message: Optional[str] = None,
        result: Optional[dict] = None,
        message: Optional[str] = None
    ):
        """
        Update job status and send WebSocket notification.

        Args:
            job: Job instance to update
            db: Database session
            status: New status
            progress: Progress percentage (0-100)
            processed_items: Number of items processed
            created_items: Number of items created
            error_message: Error message if failed
            result: Result data
            message: Status message
        """
        updated = False

        if status is not None:
            job.status = status
            updated = True

        if progress is not None:
            job.progress = progress
            updated = True

        if processed_items is not None:
            job.processed_items = processed_items
            updated = True

        if created_items is not None:
            job.created_items = created_items
            updated = True

        if error_message is not None:
            job.error_message = error_message
            updated = True

        if result is not None:
            job.result = result
            updated = True

        if updated:
            db.commit()
            db.refresh(job)

            # Send WebSocket update
            try:
                await manager.send_job_progress(
                    job_id=job.id,
                    status=job.status,
                    progress=job.progress or 0,
                    total_items=job.total_items or 0,
                    processed_items=job.processed_items or 0,
                    created_items=job.created_items or 0,
                    message=message,
                    error=job.error_message,
                    result=job.result
                )
            except Exception as e:
                logger.error(f"Failed to send WebSocket update for job {job.id}: {e}")

    @staticmethod
    def update_job_sync(
        job: Job,
        db: Session,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        processed_items: Optional[int] = None,
        created_items: Optional[int] = None,
        error_message: Optional[str] = None,
        result: Optional[dict] = None
    ):
        """
        Synchronous version of update_job (for non-async contexts).

        WebSocket notifications will be skipped in sync context.
        Use update_job() in async contexts for full functionality.
        """
        if status is not None:
            job.status = status

        if progress is not None:
            job.progress = progress

        if processed_items is not None:
            job.processed_items = processed_items

        if created_items is not None:
            job.created_items = created_items

        if error_message is not None:
            job.error_message = error_message

        if result is not None:
            job.result = result

        db.commit()
        db.refresh(job)


# Global job tracker instance
job_tracker = JobTracker()
