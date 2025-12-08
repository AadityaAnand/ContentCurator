from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Article, Category
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
    
    # Average articles per category
    avg_per_category = db.query(
        func.avg(func.count(Article.id))
    ).join(
        Article.categories
    ).group_by(
        Category.id
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
