"""Category management endpoints with bulk operations."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
import logging

from app.database import get_db
from app.models import Category, Article, article_categories
from app.schemas import (
    CategoryResponse,
    CategoryCreate,
    CategoryUpdate,
    CategoryWithStatsResponse,
    BulkCategoryAssignment,
    BulkCategoryResponse
)
from app.routers.auth import get_current_active_user
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=List[CategoryWithStatsResponse])
async def list_categories(
    include_stats: bool = True,
    db: Session = Depends(get_db)
):
    """
    List all categories with optional statistics.

    - **include_stats**: Include article counts and recent activity
    """
    try:
        if include_stats:
            # Get categories with article counts
            categories_with_counts = db.query(
                Category,
                func.count(article_categories.c.article_id).label('article_count')
            ).outerjoin(
                article_categories,
                Category.id == article_categories.c.category_id
            ).group_by(Category.id).all()

            result = []
            for category, article_count in categories_with_counts:
                result.append({
                    "id": category.id,
                    "name": category.name,
                    "description": category.description,
                    "color": category.color,
                    "created_at": category.created_at,
                    "article_count": article_count
                })
            return result
        else:
            categories = db.query(Category).all()
            return [
                {
                    "id": cat.id,
                    "name": cat.name,
                    "description": cat.description,
                    "color": cat.color,
                    "created_at": cat.created_at,
                    "article_count": 0
                }
                for cat in categories
            ]
    except Exception as e:
        logger.error(f"Error listing categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list categories: {str(e)}"
        )


@router.get("/{category_id}", response_model=CategoryWithStatsResponse)
async def get_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific category with statistics."""
    category = db.query(Category).filter(Category.id == category_id).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Get article count
    article_count = db.query(func.count(article_categories.c.article_id)).filter(
        article_categories.c.category_id == category_id
    ).scalar()

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "color": category.color,
        "created_at": category.created_at,
        "article_count": article_count or 0
    }


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new category.

    Requires authentication.
    """
    # Check if category already exists
    existing = db.query(Category).filter(Category.name == category_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{category_data.name}' already exists"
        )

    category = Category(
        name=category_data.name,
        description=category_data.description,
        color=category_data.color
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    logger.info(f"Category '{category.name}' created by user {current_user.id}")
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a category.

    Requires authentication.
    """
    category = db.query(Category).filter(Category.id == category_id).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Update fields
    if category_data.name is not None:
        # Check if new name conflicts
        existing = db.query(Category).filter(
            and_(
                Category.name == category_data.name,
                Category.id != category_id
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category_data.name}' already exists"
            )
        category.name = category_data.name

    if category_data.description is not None:
        category.description = category_data.description

    if category_data.color is not None:
        category.color = category_data.color

    db.commit()
    db.refresh(category)

    logger.info(f"Category {category_id} updated by user {current_user.id}")
    return category


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a category.

    Note: This removes the category from all articles but doesn't delete the articles.
    Requires authentication.
    """
    category = db.query(Category).filter(Category.id == category_id).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    category_name = category.name
    db.delete(category)
    db.commit()

    logger.info(f"Category '{category_name}' deleted by user {current_user.id}")
    return {"message": f"Category '{category_name}' deleted successfully"}


@router.post("/bulk/assign", response_model=BulkCategoryResponse)
async def bulk_assign_categories(
    assignment_data: BulkCategoryAssignment,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Bulk assign categories to multiple articles.

    - **article_ids**: List of article IDs to update
    - **category_ids**: List of category IDs to assign
    - **mode**: 'add' (add to existing), 'replace' (replace all), 'remove' (remove specified)

    Requires authentication.
    """
    # Validate articles exist
    articles = db.query(Article).filter(Article.id.in_(assignment_data.article_ids)).all()
    if len(articles) != len(assignment_data.article_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some articles not found"
        )

    # Validate categories exist
    categories = db.query(Category).filter(Category.id.in_(assignment_data.category_ids)).all()
    if len(categories) != len(assignment_data.category_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some categories not found"
        )

    updated_count = 0

    for article in articles:
        if assignment_data.mode == 'replace':
            # Replace all categories
            article.categories = categories
            updated_count += 1
        elif assignment_data.mode == 'add':
            # Add categories (avoid duplicates)
            existing_ids = {cat.id for cat in article.categories}
            for category in categories:
                if category.id not in existing_ids:
                    article.categories.append(category)
            updated_count += 1
        elif assignment_data.mode == 'remove':
            # Remove specified categories
            category_ids_to_remove = set(assignment_data.category_ids)
            article.categories = [
                cat for cat in article.categories
                if cat.id not in category_ids_to_remove
            ]
            updated_count += 1

    db.commit()

    logger.info(
        f"Bulk category assignment: {updated_count} articles updated "
        f"with {len(categories)} categories in '{assignment_data.mode}' mode "
        f"by user {current_user.id}"
    )

    return {
        "success": True,
        "updated_count": updated_count,
        "mode": assignment_data.mode,
        "category_ids": assignment_data.category_ids,
        "article_ids": assignment_data.article_ids
    }


@router.post("/bulk/merge")
async def bulk_merge_categories(
    source_category_id: int,
    target_category_id: int,
    delete_source: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Merge two categories.

    All articles from source category will be assigned to target category.

    - **source_category_id**: Category to merge from
    - **target_category_id**: Category to merge into
    - **delete_source**: Whether to delete source category after merge

    Requires authentication.
    """
    # Validate categories exist
    source = db.query(Category).filter(Category.id == source_category_id).first()
    target = db.query(Category).filter(Category.id == target_category_id).first()

    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source category {source_category_id} not found"
        )

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target category {target_category_id} not found"
        )

    if source_category_id == target_category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot merge a category with itself"
        )

    # Get all articles from source category
    articles_with_source = db.query(Article).join(Article.categories).filter(
        Category.id == source_category_id
    ).all()

    # Add target category to all these articles
    for article in articles_with_source:
        if target not in article.categories:
            article.categories.append(target)
        # Remove source category
        if source in article.categories:
            article.categories.remove(source)

    affected_count = len(articles_with_source)

    # Delete source category if requested
    if delete_source:
        db.delete(source)

    db.commit()

    logger.info(
        f"Category merge: '{source.name}' → '{target.name}', "
        f"{affected_count} articles affected, "
        f"source deleted: {delete_source}, "
        f"by user {current_user.id}"
    )

    return {
        "success": True,
        "source_category": source.name,
        "target_category": target.name,
        "affected_articles": affected_count,
        "source_deleted": delete_source
    }


@router.delete("/bulk/cleanup")
async def cleanup_unused_categories(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete all categories that have no associated articles.

    Requires authentication.
    """
    # Find categories with 0 articles
    unused_categories = db.query(Category).outerjoin(
        article_categories,
        Category.id == article_categories.c.category_id
    ).group_by(Category.id).having(
        func.count(article_categories.c.article_id) == 0
    ).all()

    deleted_count = len(unused_categories)
    deleted_names = [cat.name for cat in unused_categories]

    for category in unused_categories:
        db.delete(category)

    db.commit()

    logger.info(
        f"Cleanup: {deleted_count} unused categories deleted by user {current_user.id}"
    )

    return {
        "success": True,
        "deleted_count": deleted_count,
        "deleted_categories": deleted_names
    }
