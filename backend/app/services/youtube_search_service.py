import logging
from typing import List, Dict
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class YouTubeSearchService:
    """Search YouTube for videos on a topic using YouTube Data API v3."""

    def __init__(self) -> None:
        self.search_endpoint = "https://www.googleapis.com/youtube/v3/search"
        self.http_timeout = 15.0

    async def search_videos(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """
        Search YouTube for videos matching the query.

        Args:
            query: Search query/topic
            max_results: Maximum number of videos to return (1-50)

        Returns:
            List of dicts with video metadata:
            [
                {
                    "video_id": "...",
                    "title": "...",
                    "channel_title": "...",
                    "description": "..."
                },
                ...
            ]
        """
        if not settings.YOUTUBE_API_KEY:
            logger.warning("YOUTUBE_API_KEY is not configured, skipping YouTube search")
            return []

        try:
            params = {
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": min(max_results, 50),  # API limit is 50
                "key": settings.YOUTUBE_API_KEY,
                "relevanceLanguage": "en",
                "safeSearch": "moderate",
                "videoCaption": "closedCaption",  # Prefer videos with captions (for transcripts)
            }

            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                response = await client.get(self.search_endpoint, params=params)
                response.raise_for_status()
                data = response.json()

            results = []
            for item in data.get("items", []):
                video_id = item.get("id", {}).get("videoId")
                if not video_id:
                    continue

                snippet = item.get("snippet", {})
                results.append({
                    "video_id": video_id,
                    "title": snippet.get("title", ""),
                    "channel_title": snippet.get("channelTitle", ""),
                    "description": snippet.get("description", ""),
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                })

            logger.info(f"Found {len(results)} YouTube videos for query: {query}")
            return results

        except httpx.HTTPStatusError as e:
            logger.error(f"YouTube API error: {e.response.status_code} - {e.response.text}")
            return []
        except Exception as e:
            logger.error(f"YouTube search failed: {e}")
            return []


# Global instance
youtube_search_service = YouTubeSearchService()
