from youtube_transcript_api import YouTubeTranscriptApi
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Article, Summary, Category
from app.schemas import YouTubeIngest, IngestionResponse
from app.services.ollama_service import ollama_service
import logging
import re
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)


class YouTubeIngestionService:
    """Service for ingesting YouTube videos with transcripts"""
    
    def _extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        # Handle different YouTube URL formats
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]+)',
            r'youtube\.com\/embed\/([^&\n?]+)',
            r'youtube\.com\/v\/([^&\n?]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    async def ingest_youtube_video(
        self,
        video_data: YouTubeIngest,
        db: Session
    ) -> IngestionResponse:
        """
        Ingest a YouTube video by extracting its transcript.
        
        Args:
            video_data: YouTube video configuration
            db: Database session
            
        Returns:
            IngestionResponse with statistics
        """
        errors = []
        
        try:
            # Extract video ID
            video_id = self._extract_video_id(str(video_data.url))
            
            if not video_id:
                return IngestionResponse(
                    success=False,
                    message="Invalid YouTube URL",
                    articles_processed=1,
                    articles_created=0,
                    articles_updated=0,
                    errors=["Could not extract video ID from URL"]
                )
            
            # Check if video already exists
            url = f"https://www.youtube.com/watch?v={video_id}"
            existing_article = db.query(Article).filter(Article.url == url).first()
            
            if existing_article:
                logger.info(f"Video already exists: {url}")
                return IngestionResponse(
                    success=True,
                    message="Video already exists in database",
                    articles_processed=1,
                    articles_created=0,
                    articles_updated=1,
                    errors=[]
                )
            
            # Get transcript
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                transcript_text = " ".join([item['text'] for item in transcript_list])
            except Exception as e:
                error_msg = f"Could not retrieve transcript: {str(e)}"
                logger.error(error_msg)
                return IngestionResponse(
                    success=False,
                    message="Transcript not available",
                    articles_processed=1,
                    articles_created=0,
                    articles_updated=0,
                    errors=[error_msg]
                )
            
            if not transcript_text or len(transcript_text) < 100:
                return IngestionResponse(
                    success=False,
                    message="Transcript too short or empty",
                    articles_processed=1,
                    articles_created=0,
                    articles_updated=0,
                    errors=["Transcript has insufficient content"]
                )
            
            # For title, we'll use a placeholder (in production, use YouTube API)
            title = f"YouTube Video {video_id}"
            
            # Process transcript with Ollama
            logger.info(f"Processing YouTube video: {video_id}")
            processed = await ollama_service.process_article_content(title, transcript_text)
            
            # Create article
            article = Article(
                title=processed.get('executive_summary', title)[:500],  # Use summary as title if available
                url=url,
                source_type='youtube',
                source_name=video_data.source_name,
                content=transcript_text,
                published_at=datetime.utcnow()
            )
            db.add(article)
            db.flush()
            
            # Create summary
            summary = Summary(
                article_id=article.id,
                executive_summary=processed['executive_summary'],
                full_summary=processed['full_summary'],
                key_points=processed['key_points']
            )
            db.add(summary)
            
            # Handle categories
            for cat_name in processed['categories']:
                category = db.query(Category).filter(Category.name == cat_name).first()
                if not category:
                    category = Category(name=cat_name)
                    db.add(category)
                    db.flush()
                article.categories.append(category)
            
            db.commit()
            logger.info(f"Successfully created article for YouTube video: {video_id}")
            
            return IngestionResponse(
                success=True,
                message=f"Successfully ingested YouTube video {video_id}",
                articles_processed=1,
                articles_created=1,
                articles_updated=0,
                errors=[]
            )
            
        except Exception as e:
            db.rollback()
            error_msg = f"Error ingesting YouTube video: {str(e)}"
            logger.error(error_msg)
            return IngestionResponse(
                success=False,
                message="Failed to ingest YouTube video",
                articles_processed=1,
                articles_created=0,
                articles_updated=0,
                errors=[error_msg]
            )


# Global instance
youtube_ingestion_service = YouTubeIngestionService()
