"""WebSocket endpoints for real-time updates."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import asyncio
import logging

from app.database import get_db
from app.models import Job
from app.services.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/jobs/{job_id}")
async def websocket_job_updates(
    websocket: WebSocket,
    job_id: int,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time job updates.

    Clients can connect to this endpoint to receive live updates about a specific job.

    Example usage (JavaScript):
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/ws/jobs/123');
    ws.onmessage = (event) => {
        const update = JSON.parse(event.data);
        console.log(update);
    };
    ```
    """
    # Verify job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        await websocket.close(code=1008, reason="Job not found")
        return

    await manager.connect(websocket, job_id)

    try:
        # Send initial job state
        await manager.send_personal_message({
            "type": "job_state",
            "job_id": job_id,
            "data": {
                "status": job.status,
                "progress": job.progress,
                "total_items": job.total_items,
                "processed_items": job.processed_items,
                "created_items": job.created_items,
                "error_message": job.error_message,
                "result": job.result
            }
        }, websocket)

        # Keep connection alive and listen for client messages
        while True:
            try:
                # Wait for client messages (heartbeat, close, etc.)
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0  # 30 second timeout
                )

                # Handle client messages
                if data == "ping":
                    await websocket.send_text("pong")
                elif data == "close":
                    break
                elif data == "refresh":
                    # Send current job state
                    db.refresh(job)
                    await manager.send_personal_message({
                        "type": "job_state",
                        "job_id": job_id,
                        "data": {
                            "status": job.status,
                            "progress": job.progress,
                            "total_items": job.total_items,
                            "processed_items": job.processed_items,
                            "created_items": job.created_items,
                            "error_message": job.error_message,
                            "result": job.result
                        }
                    }, websocket)

            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_json({"type": "heartbeat"})
            except WebSocketDisconnect:
                break

    except Exception as e:
        logger.error(f"WebSocket error for job {job_id}: {e}")
    finally:
        manager.disconnect(websocket, job_id)


@router.websocket("/ws/jobs")
async def websocket_all_jobs(websocket: WebSocket):
    """
    WebSocket endpoint for all job updates.

    Clients can connect to receive updates about all jobs in the system.

    Example usage (JavaScript):
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/ws/jobs');
    ws.onmessage = (event) => {
        const update = JSON.parse(event.data);
        console.log('Job', update.job_id, 'update:', update.data);
    };
    ```
    """
    await manager.connect(websocket)

    try:
        # Keep connection alive and listen for client messages
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0  # 30 second timeout
                )

                # Handle client messages
                if data == "ping":
                    await websocket.send_text("pong")
                elif data == "close":
                    break

            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_json({"type": "heartbeat"})
            except WebSocketDisconnect:
                break

    except Exception as e:
        logger.error(f"WebSocket error for all jobs: {e}")
    finally:
        manager.disconnect(websocket)


@router.get("/ws/connections")
async def get_connection_stats():
    """
    Get WebSocket connection statistics.

    Returns information about active WebSocket connections.
    """
    return {
        "total_connections": manager.get_connection_count(),
        "job_subscriptions": {
            job_id: manager.get_job_connection_count(job_id)
            for job_id in manager.active_connections.keys()
        }
    }
