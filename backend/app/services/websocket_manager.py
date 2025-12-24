"""WebSocket connection manager for real-time updates."""
import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        # Store active connections by job_id
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Store all connections for broadcast
        self.all_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, job_id: int = None):
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: WebSocket connection to register
            job_id: Optional job ID to subscribe to specific job updates
        """
        await websocket.accept()
        self.all_connections.add(websocket)

        if job_id is not None:
            if job_id not in self.active_connections:
                self.active_connections[job_id] = set()
            self.active_connections[job_id].add(websocket)
            logger.info(f"WebSocket connected for job {job_id}")
        else:
            logger.info("WebSocket connected for all updates")

    def disconnect(self, websocket: WebSocket, job_id: int = None):
        """
        Unregister a WebSocket connection.

        Args:
            websocket: WebSocket connection to remove
            job_id: Optional job ID that was subscribed to
        """
        self.all_connections.discard(websocket)

        if job_id is not None and job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
            logger.info(f"WebSocket disconnected from job {job_id}")
        else:
            # Remove from all job subscriptions
            for connections in self.active_connections.values():
                connections.discard(websocket)
            logger.info("WebSocket disconnected")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.all_connections.discard(websocket)

    async def send_job_update(self, job_id: int, update_data: dict):
        """
        Send update to all connections subscribed to a specific job.

        Args:
            job_id: ID of the job
            update_data: Update data to send
        """
        if job_id not in self.active_connections:
            return

        message = {
            "type": "job_update",
            "job_id": job_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": update_data
        }

        disconnected = set()
        for connection in self.active_connections[job_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending job update to connection: {e}")
                disconnected.add(connection)

        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn, job_id)

    async def broadcast(self, message: dict):
        """
        Broadcast a message to all connected clients.

        Args:
            message: Message to broadcast
        """
        message["timestamp"] = datetime.utcnow().isoformat()

        disconnected = set()
        for connection in self.all_connections.copy():
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected.add(connection)

        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

    async def send_job_progress(
        self,
        job_id: int,
        status: str,
        progress: int,
        total_items: int = 0,
        processed_items: int = 0,
        created_items: int = 0,
        message: str = None,
        error: str = None,
        result: dict = None
    ):
        """
        Send a job progress update.

        Args:
            job_id: ID of the job
            status: Job status (pending, running, completed, failed)
            progress: Progress percentage (0-100)
            total_items: Total items to process
            processed_items: Items processed so far
            created_items: Items created
            message: Optional status message
            error: Optional error message
            result: Optional result data
        """
        update_data = {
            "status": status,
            "progress": progress,
            "total_items": total_items,
            "processed_items": processed_items,
            "created_items": created_items
        }

        if message:
            update_data["message"] = message
        if error:
            update_data["error"] = error
        if result:
            update_data["result"] = result

        await self.send_job_update(job_id, update_data)

    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self.all_connections)

    def get_job_connection_count(self, job_id: int) -> int:
        """Get number of connections subscribed to a specific job."""
        return len(self.active_connections.get(job_id, set()))


# Global connection manager instance
manager = ConnectionManager()
