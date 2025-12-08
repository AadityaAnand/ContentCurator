from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, Article
from app.schemas import ArticleResponse
from app.auth import get_current_active_user

router = APIRouter(prefix="/api/saved-articles", tags=["Saved Articles"])

@router.get("", response_model=List[ArticleResponse])
async def get_saved_articles(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all articles saved by the current user"""
    return current_user.saved_articles

@router.post("/{article_id}", status_code=status.HTTP_201_CREATED)
async def save_article(
    article_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save an article to user's saved list"""
    # Check if article exists
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    
    # Check if already saved
    if article in current_user.saved_articles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Article already saved"
        )
    
    # Save article
    current_user.saved_articles.append(article)
    db.commit()
    
    return {"message": "Article saved successfully", "article_id": article_id}

@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_article(
    article_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove an article from user's saved list"""
    # Check if article exists
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    
    # Check if article is saved
    if article not in current_user.saved_articles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Article not in saved list"
        )
    
    # Remove article
    current_user.saved_articles.remove(article)
    db.commit()
    
    return None

@router.get("/check/{article_id}")
async def check_article_saved(
    article_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Check if an article is saved by the current user"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    
    is_saved = article in current_user.saved_articles
    return {"article_id": article_id, "is_saved": is_saved}
