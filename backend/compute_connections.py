"""Compute similarity connections between articles."""
import asyncio
import json
import numpy as np
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Embedding, Connection, Article


async def compute_connections(threshold: float = 0.7):
    """Compute connections based on embedding similarity."""
    db = SessionLocal()
    
    try:
        # Get all embeddings
        embeddings = db.query(Embedding).all()
        
        if len(embeddings) < 2:
            print("❌ Need at least 2 articles with embeddings")
            return
        
        print(f"📊 Found {len(embeddings)} articles with embeddings")
        print(f"🎯 Similarity threshold: {threshold}")
        print()
        
        # Parse embedding vectors
        embedding_data = []
        for emb in embeddings:
            try:
                vector = json.loads(emb.vector) if isinstance(emb.vector, str) else emb.vector
                article = db.query(Article).filter(Article.id == emb.article_id).first()
                embedding_data.append({
                    'article_id': emb.article_id,
                    'title': article.title[:50] if article else 'Unknown',
                    'vector': np.array(vector)
                })
            except Exception as e:
                print(f"⚠️  Error parsing embedding for article {emb.article_id}: {e}")
                continue
        
        print(f"✓ Successfully parsed {len(embedding_data)} embeddings")
        print()
        
        # Compute similarities
        connections_created = 0
        connections_skipped = 0
        total_comparisons = len(embedding_data) * (len(embedding_data) - 1) // 2
        
        print(f"🔄 Computing {total_comparisons} pairwise similarities...")
        print()
        
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
                        
                        print(f"  ✓ {similarity:.3f} | {emb1['title']}")
                        print(f"           ↔ {emb2['title']}")
                        print()
                    else:
                        connections_skipped += 1
        
        db.commit()
        
        print("=" * 60)
        print(f"✅ Created {connections_created} new connections")
        print(f"⏭️  Skipped {connections_skipped} existing connections")
        print("=" * 60)
        
        # Show stats
        total_connections = db.query(Connection).count()
        print()
        print("📈 Connection Statistics:")
        print(f"  Total connections in database: {total_connections}")
        print(f"  Average connections per article: {total_connections * 2 / len(embedding_data):.1f}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    threshold = 0.7
    if len(sys.argv) > 1:
        try:
            threshold = float(sys.argv[1])
        except ValueError:
            print("Usage: python compute_connections.py [threshold]")
            print("Example: python compute_connections.py 0.75")
            sys.exit(1)
    
    print("🚀 Computing article connections...")
    print()
    asyncio.run(compute_connections(threshold))
