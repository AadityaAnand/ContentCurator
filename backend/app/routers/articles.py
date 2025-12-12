from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import Article, Summary, Category
from app.schemas import (
    ArticleResponse,
    ArticleDetailResponse,
    ArticleListResponse,
    ArticleSearchParams,
    CategoryResponse
)
import logging
import math

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=ArticleListResponse)
async def list_articles(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by category name"),
    source_type: Optional[str] = Query(None, description="Filter by source type"),
    db: Session = Depends(get_db)
):
    """
    List articles with pagination and optional filtering.
    
    - **page**: Page number (starts at 1)
    - **page_size**: Number of articles per page (1-100)
    - **category**: Filter by category name
    - **source_type**: Filter by source type (rss, youtube, etc.)
    
    Returns paginated list of articles with summaries and categories.
    """
    try:
        # Build query
        query = db.query(Article)
        
        # Apply filters
        if category:
            query = query.join(Article.categories).filter(Category.name == category)
        
        if source_type:
            query = query.filter(Article.source_type == source_type)
        
        # Order by most recent first
        query = query.order_by(desc(Article.created_at))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        articles = query.offset(offset).limit(page_size).all()
        
        # Calculate total pages
        total_pages = math.ceil(total / page_size)
        
        return ArticleListResponse(
            items=articles,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"Error listing articles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list articles: {str(e)}"
        )


@router.get("/search", response_model=ArticleListResponse)
async def search_articles(
    query: Optional[str] = Query(None, description="Search query"),
    categories: Optional[str] = Query(None, description="Comma-separated category names"),
    source_types: Optional[str] = Query(None, description="Comma-separated source types"),
    start_date: Optional[datetime] = Query(None, description="Filter articles after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter articles before this date"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search articles with full-text search and filters.
    
    - **query**: Search in title, content, and summaries
    - **categories**: Filter by category names (comma-separated)
    - **source_types**: Filter by source types (comma-separated)
    - **start_date**: Filter articles published after this date
    - **end_date**: Filter articles published before this date
    - **page**: Page number
    - **page_size**: Items per page
    """
    try:
        # Build query
        article_query = db.query(Article)
        
        # Text search
        if query:
            search_pattern = f"%{query}%"
            article_query = article_query.outerjoin(Article.summary).filter(
                or_(
                    Article.title.ilike(search_pattern),
                    Article.content.ilike(search_pattern),
                    Summary.executive_summary.ilike(search_pattern),
                    Summary.full_summary.ilike(search_pattern)
                )
            )
        
        # Category filter
        if categories:
            category_list = [c.strip() for c in categories.split(',')]
            article_query = article_query.join(Article.categories).filter(
                Category.name.in_(category_list)
            )
        
        # Source type filter
        if source_types:
            source_type_list = [s.strip() for s in source_types.split(',')]
            article_query = article_query.filter(Article.source_type.in_(source_type_list))
        
        # Date filters
        if start_date:
            article_query = article_query.filter(Article.published_at >= start_date)
        
        if end_date:
            article_query = article_query.filter(Article.published_at <= end_date)
        
        # Order by relevance (most recent first for now)
        article_query = article_query.order_by(desc(Article.created_at))
        
        # Get total count
        total = article_query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        articles = article_query.offset(offset).limit(page_size).all()
        
        # Calculate total pages
        total_pages = math.ceil(total / page_size)
        
        return ArticleListResponse(
            items=articles,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"Error searching articles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search articles: {str(e)}"
        )


@router.get("/{article_id}", response_model=ArticleDetailResponse)
async def get_article(
    article_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single article by ID with full details.
    
    Returns the article with:
    - Full content
    - All summary levels (executive, full, key points)
    - Categories
    - Metadata
    """
    try:
        article = db.query(Article).filter(Article.id == article_id).first()
        
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Article with id {article_id} not found"
            )
        
        # Create response with additional fields
        response = ArticleDetailResponse.model_validate(article)
        
        # Add related count (will be implemented in Phase 2)
        response.related_count = 0
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting article {article_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get article: {str(e)}"
        )


@router.get("/categories/list", response_model=List[CategoryResponse])
async def list_categories(
    db: Session = Depends(get_db)
):
    """
    List all categories with article counts.
    
    Useful for displaying category filters in the UI.
    """
    try:
        categories = db.query(Category).all()
        return categories
    except Exception as e:
        logger.error(f"Error listing categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list categories: {str(e)}"
        )


@router.post("/embeddings/generate-all")
async def trigger_generate_all_embeddings(
    db: Session = Depends(get_db)
):
    """
    Trigger batch embedding generation for all articles without embeddings.
    
    Returns immediately; processing happens in the background.
    Call this after bulk ingestion (e.g., from /api/ingest/topic) to wire up the graph.
    """
    from app.routers.embeddings import generate_embeddings_task
    from fastapi import BackgroundTasks
    from app.models import Embedding
    
    try:
        # Get articles without embeddings
        articles_without_embeddings = db.query(Article).outerjoin(Embedding).filter(
            Embedding.id == None
        ).all()
        
        if not articles_without_embeddings:
            return {
                "message": "All articles already have embeddings",
                "count": 0
            }
        
        article_ids = [a.id for a in articles_without_embeddings]
        
        # Note: In production, use Celery or similar for true async; for now, this queues background work
        import asyncio
        asyncio.create_task(generate_embeddings_task(article_ids))
        
        return {
            "message": f"Started generating embeddings for {len(article_ids)} articles",
            "count": len(article_ids)
        }
    except Exception as e:
        logger.error(f"Error triggering embeddings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/connections/compute")
async def trigger_compute_connections(
    threshold: float = Query(0.7, ge=0.0, le=1.0)
):
    """
    Trigger semantic connection computation between articles based on embeddings.
    
    - **threshold**: Similarity threshold for connections (0.0-1.0, default 0.7)
    
    Returns immediately; processing happens in the background.
    """
    from app.routers.embeddings import compute_connections_task
    import asyncio
    
    try:
        asyncio.create_task(compute_connections_task(threshold))
        return {
            "message": f"Started computing connections with threshold {threshold}",
            "threshold": threshold
        }
    except Exception as e:
        logger.error(f"Error triggering connections: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

