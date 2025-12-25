"""Embeddings and semantic search endpoints."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.models import Article, Embedding, Connection
from app.services.ollama_service import OllamaService
from app.schemas import ArticleDetailResponse
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
        # Generate embedding from article content (truncate to avoid Ollama errors)
        content_preview = article.content[:2000] if article.content else ''
        text_to_embed = f"{article.title}\n\n{content_preview}"
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
                
                # Generate embedding (truncate content to avoid Ollama errors)
                content_preview = article.content[:2000] if article.content else ''
                text_to_embed = f"{article.title}\n\n{content_preview}"
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


@router.post("/search")
async def semantic_search(
    query: str,
    limit: int = 10,
    threshold: float = 0.3,
    db: Session = Depends(get_db)
) -> List[dict]:
    """Search articles using semantic similarity based on embeddings."""
    import json
    import numpy as np
    from scipy.spatial.distance import cosine
    
    if not query or len(query.strip()) == 0:
        return []
    
    try:
        # Generate embedding for query
        query_embedding = await ollama_service.generate_embedding(query)
        query_vector = np.array(query_embedding)
        
        # Get all article embeddings
        embeddings = db.query(Embedding).all()
        
        if not embeddings:
            return []
        
        # Calculate similarity scores
        results = []
        for emb in embeddings:
            try:
                # Parse stored embedding
                article_vector = np.array(json.loads(emb.vector))
                
                # Calculate cosine similarity (1 - cosine distance)
                similarity = 1 - cosine(query_vector, article_vector)
                
                if similarity >= threshold:
                    article = db.query(Article).filter(Article.id == emb.article_id).first()
                    if article:
                        results.append({
                            "id": article.id,
                            "title": article.title,
                            "url": article.url,
                            "source_name": article.source_name,
                            "published_at": article.published_at.isoformat() if article.published_at else None,
                            "similarity_score": float(similarity),
                            "content_preview": article.content[:200] + "..." if article.content and len(article.content) > 200 else article.content,
                        })
            except (json.JSONDecodeError, ValueError, TypeError) as e:
                logger.warning(f"Error processing embedding {emb.id}: {e}")
                continue
        
        # Sort by similarity and limit
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results[:limit]
    
    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/graph")
async def get_knowledge_graph(
    min_similarity: float = 0.5,
    limit: Optional[int] = 100,
    offset: int = 0,
    category_id: Optional[int] = None,
    cluster: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get knowledge graph data optimized for visualization with performance enhancements.

    Args:
        min_similarity: Minimum similarity score for connections (0.0-1.0)
        limit: Maximum number of nodes to return (default: 100, max: 500)
        offset: Offset for pagination
        category_id: Filter by category ID
        cluster: Enable clustering for large datasets

    Returns nodes (articles) and edges (connections) in a format ready for graph rendering.
    """
    # Cap limit at 500 for performance
    limit = min(limit, 500) if limit else 100

    # Get articles with embeddings (only these can have connections)
    articles_query = db.query(Article).join(Embedding, Article.id == Embedding.article_id)

    # Filter by category if specified
    if category_id:
        from app.models import Category
        articles_query = articles_query.join(Article.categories).filter(Category.id == category_id)

    # Order by most recent for consistent pagination
    articles_query = articles_query.order_by(Article.created_at.desc())

    # Get total count for pagination
    total_count = articles_query.count()

    # Apply pagination
    articles_query = articles_query.offset(offset).limit(limit)

    articles = articles_query.all()
    
    if not articles:
        return {"nodes": [], "edges": [], "stats": {"node_count": 0, "edge_count": 0}}
    
    article_ids = [a.id for a in articles]
    
    # Get connections between these articles
    connections = db.query(Connection).filter(
        Connection.source_article_id.in_(article_ids),
        Connection.target_article_id.in_(article_ids),
        Connection.similarity_score >= min_similarity
    ).all()
    
    # Build nodes with metadata
    nodes = []
    for article in articles:
        # Count connections for this node
        connection_count = sum(1 for c in connections if c.source_article_id == article.id or c.target_article_id == article.id)
        
        nodes.append({
            "id": article.id,
            "title": article.title,
            "url": article.url,
            "source_type": article.source_type,
            "published_at": article.published_at.isoformat() if article.published_at else None,
            "connection_count": connection_count,
            "content_preview": article.content[:200] if article.content else ""
        })
    
    # Build edges
    edges = []
    seen_pairs = set()
    for conn in connections:
        # Avoid duplicate edges (A-B and B-A)
        pair = tuple(sorted([conn.source_article_id, conn.target_article_id]))
        if pair not in seen_pairs:
            seen_pairs.add(pair)
            edges.append({
                "source": conn.source_article_id,
                "target": conn.target_article_id,
                "similarity": round(conn.similarity_score, 3),
                "type": conn.connection_type or "semantic"
            })
    
    # Apply clustering if requested and dataset is large
    clusters = None
    if cluster and len(nodes) > 50:
        clusters = _compute_clusters(nodes, edges)

    return {
        "nodes": nodes,
        "edges": edges,
        "clusters": clusters,
        "pagination": {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count
        },
        "stats": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "avg_connections": round(len(edges) * 2 / len(nodes), 2) if nodes else 0,
            "min_similarity": min_similarity
        }
    }


def _compute_clusters(nodes: list, edges: list) -> dict:
    """
    Compute clusters using simple community detection based on connections.

    Uses a greedy clustering algorithm to group highly connected nodes.

    Args:
        nodes: List of node dictionaries
        edges: List of edge dictionaries

    Returns:
        Dictionary mapping node IDs to cluster IDs
    """
    # Build adjacency map
    adjacency = {}
    for node in nodes:
        adjacency[node["id"]] = set()

    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        adjacency[source].add(target)
        adjacency[target].add(source)

    # Greedy clustering
    clusters = {}
    cluster_id = 0
    visited = set()

    for node in nodes:
        node_id = node["id"]
        if node_id in visited:
            continue

        # Start new cluster
        cluster = {node_id}
        queue = [node_id]
        visited.add(node_id)

        # BFS to find connected nodes
        while queue:
            current = queue.pop(0)
            neighbors = adjacency.get(current, set())

            for neighbor in neighbors:
                if neighbor not in visited and neighbor in adjacency:
                    visited.add(neighbor)
                    cluster.add(neighbor)
                    queue.append(neighbor)

        # Assign cluster ID
        for node_id in cluster:
            clusters[node_id] = cluster_id

        cluster_id += 1

    return clusters
