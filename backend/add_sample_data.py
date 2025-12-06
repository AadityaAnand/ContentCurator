"""Add sample articles to the database for testing."""
import asyncio
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Article, Category, article_categories
from app.config import settings

# Create database connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

async def add_sample_data():
    db = SessionLocal()
    
    try:
        # Check if categories exist
        existing_cats = db.query(Category).count()
        if existing_cats > 0:
            print(f"Using existing {existing_cats} categories")
            categories = db.query(Category).all()
        else:
            # Create some categories
            categories = [
                Category(name="Technology", description="Technology news and updates", color="#3B82F6"),
                Category(name="AI & ML", description="Artificial Intelligence and Machine Learning", color="#8B5CF6"),
                Category(name="Web Development", description="Web development tutorials and news", color="#10B981"),
                Category(name="Science", description="Scientific discoveries and research", color="#F59E0B"),
            ]
            
            for cat in categories:
                db.add(cat)
            db.commit()
            
            # Refresh to get IDs
            for cat in categories:
                db.refresh(cat)
        
        # Create sample articles
        articles_data = [
            {
                "title": "Introduction to Large Language Models",
                "url": "https://example.com/intro-to-llms",
                "source_type": "rss",
                "source_name": "AI Weekly",
                "content": "Large Language Models (LLMs) have revolutionized natural language processing. These models, trained on vast amounts of text data, can understand and generate human-like text. They power applications like chatbots, content generation, and code assistance.",
                "author": "Jane Smith",
                "published_at": datetime(2025, 12, 1, 10, 0, 0),
                "categories": [categories[1]]  # AI & ML
            },
            {
                "title": "The Future of Web Development: Trends for 2025",
                "url": "https://example.com/web-dev-2025",
                "source_type": "rss",
                "source_name": "Dev Digest",
                "content": "Web development continues to evolve with new frameworks and tools. In 2025, we're seeing increased adoption of server components, edge computing, and AI-assisted development. TypeScript remains dominant, and new meta-frameworks are simplifying full-stack development.",
                "author": "John Doe",
                "published_at": datetime(2025, 12, 2, 14, 30, 0),
                "categories": [categories[0], categories[2]]  # Technology, Web Development
            },
            {
                "title": "Breakthrough in Quantum Computing Research",
                "url": "https://example.com/quantum-breakthrough",
                "source_type": "rss",
                "source_name": "Science Daily",
                "content": "Researchers at MIT have achieved a significant breakthrough in quantum computing stability. The new error correction technique could pave the way for practical quantum computers that can solve complex problems in cryptography, drug discovery, and climate modeling.",
                "author": "Dr. Alice Wong",
                "published_at": datetime(2025, 12, 3, 9, 15, 0),
                "categories": [categories[0], categories[3]]  # Technology, Science
            },
            {
                "title": "Understanding Neural Networks: A Beginner's Guide",
                "url": "https://example.com/neural-networks-guide",
                "source_type": "rss",
                "source_name": "ML Basics",
                "content": "Neural networks are the foundation of modern deep learning. This guide explains how neurons, layers, and activation functions work together to process information. We'll cover perceptrons, backpropagation, and common architectures like CNNs and RNNs.",
                "author": "Michael Chen",
                "published_at": datetime(2025, 12, 4, 16, 45, 0),
                "categories": [categories[1]]  # AI & ML
            },
            {
                "title": "Building Scalable APIs with FastAPI",
                "url": "https://example.com/fastapi-scalable-apis",
                "source_type": "rss",
                "source_name": "Python Weekly",
                "content": "FastAPI has become the go-to framework for building modern Python APIs. This tutorial covers async programming, dependency injection, automatic documentation, and best practices for creating production-ready APIs that can handle thousands of requests per second.",
                "author": "Sarah Johnson",
                "published_at": datetime(2025, 12, 5, 11, 20, 0),
                "categories": [categories[2]]  # Web Development
            },
            {
                "title": "Machine Learning in Healthcare: Saving Lives with AI",
                "url": "https://example.com/ml-healthcare",
                "source_type": "rss",
                "source_name": "Med Tech News",
                "content": "AI and machine learning are transforming healthcare. From early disease detection to personalized treatment plans, ML algorithms are helping doctors make better decisions. Recent studies show 95% accuracy in detecting certain cancers from medical imaging.",
                "author": "Dr. Robert Lee",
                "published_at": datetime(2025, 12, 6, 8, 0, 0),
                "categories": [categories[1], categories[3]]  # AI & ML, Science
            },
        ]
        
        # Add articles with categories
        for article_data in articles_data:
            cats = article_data.pop("categories")
            article = Article(**article_data)
            db.add(article)
            db.flush()  # Get the article ID
            
            # Link categories
            for cat in cats:
                db.execute(
                    article_categories.insert().values(
                        article_id=article.id,
                        category_id=cat.id
                    )
                )
        
        db.commit()
        print(f"✅ Successfully added {len(articles_data)} sample articles and {len(categories)} categories!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(add_sample_data())
