"""Embeddings and semantic search endpoints."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.models import Article, Embedding, Connection
from app.services.ollama_service import OllamaService
from app.schemas import ArticleDetail
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

ollama_service = OllamaService()


@router.post("/generate/{article_id}")
async def generate_embedding(
    article_id: int,
    db: Session = Depends(get_db)
):
    """Generate embedding for a specific article."""
    # Get article
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Check if embedding already exists
    existing = db.query(Embedding).filter(Embedding.article_id == article_id).first()
    if existing:
        return {"message": "Embedding already exists", "article_id": article_id}
    
    try:
        # Generate embedding from article content
        text_to_embed = f"{article.title}\n\n{article.content or ''}"
        embedding_vector = await ollama_service.generate_embedding(text_to_embed)
        
        # Store embedding (as TEXT since pgvector not available)
        embedding = Embedding(
            article_id=article_id,
            vector=str(embedding_vector),  # Store as string for now
            model_name=settings.OLLAMA_EMBEDDING_MODEL
        )
        db.add(embedding)
        db.commit()
        
        logger.info(f"Generated embedding for article {article_id}")
        return {"message": "Embedding generated", "article_id": article_id}
    
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-all")
async def generate_all_embeddings(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Generate embeddings for all articles that don't have them."""
    # Get articles without embeddings
    articles_without_embeddings = db.query(Article).outerjoin(Embedding).filter(
        Embedding.id == None
    ).all()
    
    if not articles_without_embeddings:
        return {"message": "All articles already have embeddings"}
    
    # Generate embeddings in background
    background_tasks.add_task(
        generate_embeddings_task,
        [a.id for a in articles_without_embeddings]
    )
    
    return {
        "message": f"Started generating embeddings for {len(articles_without_embeddings)} articles",
        "count": len(articles_without_embeddings)
    }


async def generate_embeddings_task(article_ids: List[int]):
    """Background task to generate embeddings."""
    from app.database import SessionLocal
    db = SessionLocal()
    
    try:
        for article_id in article_ids:
            try:
                article = db.query(Article).filter(Article.id == article_id).first()
                if not article:
                    continue
                
                # Check if already exists
                existing = db.query(Embedding).filter(Embedding.article_id == article_id).first()
                if existing:
                    continue
                
                # Generate embedding
                text_to_embed = f"{article.title}\n\n{article.content or ''}"
                embedding_vector = await ollama_service.generate_embedding(text_to_embed)
                
                # Store embedding
                embedding = Embedding(
                    article_id=article_id,
                    vector=str(embedding_vector),
                    model_name=settings.OLLAMA_EMBEDDING_MODEL
                )
                db.add(embedding)
                db.commit()
                
                logger.info(f"Generated embedding for article {article_id}")
            
            except Exception as e:
                logger.error(f"Error generating embedding for article {article_id}: {e}")
                continue
    
    finally:
        db.close()


@router.post("/compute-connections")
async def compute_connections(
    background_tasks: BackgroundTasks,
    threshold: float = 0.7,
    db: Session = Depends(get_db)
):
    """Compute similarity connections between articles based on embeddings."""
    # Check if we have embeddings
    embeddings_count = db.query(Embedding).count()
    if embeddings_count < 2:
        return {"message": "Need at least 2 articles with embeddings", "count": embeddings_count}
    
    # Start background task
    background_tasks.add_task(compute_connections_task, threshold)
    
    return {
        "message": f"Started computing connections for {embeddings_count} articles",
        "threshold": threshold
    }


async def compute_connections_task(threshold: float = 0.7):
    """Background task to compute article connections."""
    from app.database import SessionLocal
    import json
    import numpy as np
    
    db = SessionLocal()
    
    try:
        # Get all embeddings
        embeddings = db.query(Embedding).all()
        
        if len(embeddings) < 2:
            return
        
        # Parse embedding vectors
        embedding_data = []
        for emb in embeddings:
            try:
                vector = json.loads(emb.vector) if isinstance(emb.vector, str) else emb.vector
                embedding_data.append({
                    'article_id': emb.article_id,
                    'vector': np.array(vector)
                })
            except Exception as e:
                logger.error(f"Error parsing embedding for article {emb.article_id}: {e}")
                continue
        
        # Compute similarities
        connections_created = 0
        for i, emb1 in enumerate(embedding_data):
            for emb2 in embedding_data[i+1:]:
                # Calculate cosine similarity
                vec1 = emb1['vector']
                vec2 = emb2['vector']
                
                similarity = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
                
                if similarity >= threshold:
                    # Check if connection already exists
                    existing = db.query(Connection).filter(
                        ((Connection.source_article_id == emb1['article_id']) & 
                         (Connection.target_article_id == emb2['article_id'])) |
                        ((Connection.source_article_id == emb2['article_id']) & 
                         (Connection.target_article_id == emb1['article_id']))
                    ).first()
                    
                    if not existing:
                        connection = Connection(
                            source_article_id=emb1['article_id'],
                            target_article_id=emb2['article_id'],
                            similarity_score=float(similarity),
                            connection_type='semantic'
                        )
                        db.add(connection)
                        connections_created += 1
        
        db.commit()
        logger.info(f"Created {connections_created} new connections")
    
    except Exception as e:
        logger.error(f"Error computing connections: {e}")
        db.rollback()
    finally:
        db.close()


@router.get("/related/{article_id}")
async def get_related_articles(
    article_id: int,
    limit: int = 5,
    db: Session = Depends(get_db)
) -> List[dict]:
    """Get articles related to a specific article based on connections."""
    # Get connections
    connections = db.query(Connection).filter(
        (Connection.source_article_id == article_id) | 
        (Connection.target_article_id == article_id)
    ).order_by(Connection.similarity_score.desc()).limit(limit).all()
    
    if not connections:
        return []
    
    # Get related article IDs
    related_ids = []
    similarities = {}
    for conn in connections:
        related_id = conn.target_article_id if conn.source_article_id == article_id else conn.source_article_id
        related_ids.append(related_id)
        similarities[related_id] = conn.similarity_score
    
    # Get articles
    articles = db.query(Article).filter(Article.id.in_(related_ids)).all()
    
    # Format response
    result = []
    for article in articles:
        result.append({
            "id": article.id,
            "title": article.title,
            "url": article.url,
            "source_name": article.source_name,
            "similarity_score": similarities[article.id],
            "published_at": article.published_at.isoformat() if article.published_at else None,
        })
    
    # Sort by similarity
    result.sort(key=lambda x: x['similarity_score'], reverse=True)
    
    return result


@router.get("/stats")
async def get_embedding_stats(db: Session = Depends(get_db)):
    """Get statistics about embeddings and connections."""
    total_articles = db.query(Article).count()
    articles_with_embeddings = db.query(Embedding).count()
    total_connections = db.query(Connection).count()
    
    return {
        "total_articles": total_articles,
        "articles_with_embeddings": articles_with_embeddings,
        "articles_without_embeddings": total_articles - articles_with_embeddings,
        "total_connections": total_connections,
        "avg_connections_per_article": round(total_connections * 2 / max(articles_with_embeddings, 1), 2)
    }
