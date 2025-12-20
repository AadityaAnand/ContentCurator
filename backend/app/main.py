from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import ingestion, articles, embeddings, auth, saved_articles, trends, jobs, research
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-Modal Content Curator with Ollama - An intelligent content aggregation and knowledge discovery platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(saved_articles.router)
app.include_router(ingestion.router, prefix=settings.API_V1_PREFIX)
app.include_router(research.router, prefix=settings.API_V1_PREFIX)
app.include_router(articles.router, prefix=settings.API_V1_PREFIX)
app.include_router(embeddings.router, prefix=f"{settings.API_V1_PREFIX}/embeddings", tags=["embeddings"])
app.include_router(trends.router, prefix=settings.API_V1_PREFIX)
app.include_router(jobs.router, prefix=f"{settings.API_V1_PREFIX}/jobs", tags=["jobs"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Content Curator API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }


@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info("Starting Content Curator API...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Ollama Host: {settings.OLLAMA_HOST}")
    logger.info(f"Database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'configured'}")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    logger.info("Shutting down Content Curator API...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development"
    )
