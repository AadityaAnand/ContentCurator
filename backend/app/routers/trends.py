from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Article, Category
from app.services.trend_analysis_service import trend_analysis_service
from typing import List, Dict, Any

router = APIRouter(prefix="/trends", tags=["trends"])


@router.get("/top-sources")
async def get_top_sources(db: Session = Depends(get_db), days: int = 30):
    """Get most active content sources in the last N days"""
    since = datetime.utcnow() - timedelta(days=days)
    
    results = db.query(
        Article.source_name,
        Article.source_type,
        func.count(Article.id).label('count')
    ).filter(
        Article.created_at >= since
    ).group_by(
        Article.source_name,
        Article.source_type
    ).order_by(
        desc('count')
    ).limit(10).all()
    
    return [
        {
            'name': r[0] or 'Unknown',
            'type': r[1],
            'count': r[2]
        }
        for r in results
    ]


@router.get("/top-categories")
async def get_top_categories(db: Session = Depends(get_db), days: int = 30):
    """Get most discussed categories in the last N days"""
    since = datetime.utcnow() - timedelta(days=days)
    
    results = db.query(
        Category.name,
        func.count(Article.id).label('count')
    ).join(
        Article.categories
    ).filter(
        Article.created_at >= since
    ).group_by(
        Category.id,
        Category.name
    ).order_by(
        desc('count')
    ).limit(10).all()
    
    return [
        {
            'name': r[0],
            'count': r[1]
        }
        for r in results
    ]


@router.get("/articles-over-time")
async def get_articles_over_time(db: Session = Depends(get_db), days: int = 30):
    """Get article count over time (daily breakdown)"""
    since = datetime.utcnow() - timedelta(days=days)
    
    results = db.query(
        func.date(Article.created_at).label('date'),
        func.count(Article.id).label('count')
    ).filter(
        Article.created_at >= since
    ).group_by(
        func.date(Article.created_at)
    ).order_by('date').all()
    
    return [
        {
            'date': str(r[0]),
            'count': r[1]
        }
        for r in results
    ]


@router.get("/stats")
async def get_overall_stats(db: Session = Depends(get_db)):
    """Get overall platform statistics"""
    total_articles = db.query(func.count(Article.id)).scalar()
    total_categories = db.query(func.count(Category.id)).scalar()
    unique_sources = db.query(
        func.count(func.distinct(Article.source_name))
    ).scalar()
    
    # Average articles per category using subquery
    category_counts = db.query(
        Category.id,
        func.count(Article.id).label('article_count')
    ).join(
        Article.categories
    ).group_by(
        Category.id
    ).subquery()
    
    avg_per_category = db.query(
        func.avg(category_counts.c.article_count)
    ).scalar() or 0
    
    return {
        'total_articles': total_articles or 0,
        'total_categories': total_categories or 0,
        'unique_sources': unique_sources or 0,
        'avg_articles_per_category': round(float(avg_per_category), 2)
    }


@router.get("/newest-articles")
async def get_newest_articles(db: Session = Depends(get_db), limit: int = 10):
    """Get newest articles"""
    results = db.query(
        Article.id,
        Article.title,
        Article.source_name,
        Article.published_at,
        Article.created_at
    ).order_by(
        desc(Article.published_at)
    ).limit(limit).all()
    
    return [
        {
            'id': r[0],
            'title': r[1],
            'source': r[2],
            'published_at': r[3].isoformat() if r[3] else None,
            'created_at': r[4].isoformat() if r[4] else None
        }
        for r in results
    ]


@router.get("/source-distribution")
async def get_source_distribution(db: Session = Depends(get_db), days: int = 30):
    """Get distribution of articles by source type"""
    since = datetime.utcnow() - timedelta(days=days)
    
    results = db.query(
        Article.source_type,
        func.count(Article.id).label('count')
    ).filter(
        Article.created_at >= since
    ).group_by(
        Article.source_type
    ).order_by(
        desc('count')
    ).all()
    
    return [
        {
            'type': r[0],
            'count': r[1]
        }
        for r in results
    ]


# Advanced Analytics Endpoints

@router.get("/analytics/trending")
async def get_trending_topics(
    db: Session = Depends(get_db),
    days: int = 14,
    min_articles: int = 3
):
    """
    Get trending topics with velocity, direction, and confidence metrics.

    Args:
        days: Number of days to analyze (default: 14)
        min_articles: Minimum articles required (default: 3)

    Returns:
        List of trending topics with detailed metrics
    """
    return trend_analysis_service.analyze_topic_trends(db, days, min_articles)


@router.get("/analytics/emerging")
async def get_emerging_topics(
    db: Session = Depends(get_db),
    days: int = 14,
    min_velocity: float = 50.0
):
    """
    Detect rapidly emerging topics gaining traction.

    Args:
        days: Number of days to analyze (default: 14)
        min_velocity: Minimum growth rate % (default: 50.0)

    Returns:
        List of emerging topics with recent articles
    """
    return trend_analysis_service.detect_emerging_topics(db, days, min_velocity)


@router.get("/analytics/forecast/{category_id}")
async def forecast_category(
    category_id: int,
    db: Session = Depends(get_db),
    forecast_days: int = 7
):
    """
    Forecast future article volume for a category using linear regression.

    Args:
        category_id: ID of category to forecast
        forecast_days: Number of days to forecast ahead (default: 7)

    Returns:
        Forecast data with predicted volumes and confidence scores
    """
    return trend_analysis_service.forecast_category_volume(db, category_id, forecast_days)


@router.get("/analytics/momentum/{category_id}")
async def get_category_momentum(
    category_id: int,
    db: Session = Depends(get_db),
    window_days: int = 7
):
    """
    Calculate momentum score for a topic.

    Momentum considers volume, velocity, and acceleration.

    Args:
        category_id: ID of category
        window_days: Days per analysis period (default: 7)

    Returns:
        Momentum metrics with score (0-100)
    """
    return trend_analysis_service.calculate_topic_momentum(db, category_id, window_days)


@router.get("/analytics/summary")
async def get_trending_summary(
    db: Session = Depends(get_db),
    days: int = 14
):
    """
    Get comprehensive trending summary for dashboard.

    Includes top trends, emerging topics, and hot topics.

    Args:
        days: Number of days to analyze (default: 14)

    Returns:
        Complete trending summary with all metrics
    """
    return trend_analysis_service.get_trending_summary(db, days)
