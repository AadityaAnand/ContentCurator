"""Generate embeddings for all articles in the database."""
import asyncio
import sys
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Article, Embedding
from app.services.ollama_service import OllamaService
from app.config import settings


async def generate_embeddings():
    """Generate embeddings for all articles."""
    db = SessionLocal()
    ollama = OllamaService()
    
    try:
        # Get articles without embeddings
        articles = db.query(Article).outerjoin(Embedding).filter(
            Embedding.id == None
        ).all()
        
        if not articles:
            print("✅ All articles already have embeddings!")
            return
        
        print(f"📊 Found {len(articles)} articles without embeddings")
        print(f"🤖 Using model: {settings.OLLAMA_EMBEDDING_MODEL}")
        print()
        
        success_count = 0
        failed_count = 0
        
        for i, article in enumerate(articles, 1):
            try:
                print(f"[{i}/{len(articles)}] Processing: {article.title[:60]}...")
                
                # Generate embedding
                text_to_embed = f"{article.title}\n\n{article.content or ''}"
                embedding_vector = await ollama.generate_embedding(text_to_embed)
                
                # Store embedding
                embedding = Embedding(
                    article_id=article.id,
                    vector=str(embedding_vector),  # Store as string
                    model_name=settings.OLLAMA_EMBEDDING_MODEL
                )
                db.add(embedding)
                db.commit()
                
                success_count += 1
                print(f"  ✓ Generated ({len(embedding_vector)} dimensions)")
                
            except Exception as e:
                failed_count += 1
                print(f"  ✗ Error: {e}")
                continue
        
        print()
        print("=" * 60)
        print(f"✅ Successfully generated: {success_count}")
        print(f"❌ Failed: {failed_count}")
        print("=" * 60)
    
    finally:
        db.close()


if __name__ == "__main__":
    print("🚀 Starting embedding generation...")
    print()
    asyncio.run(generate_embeddings())
