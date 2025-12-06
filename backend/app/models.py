from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.database import Base


# Association table for many-to-many relationship between articles and categories
article_categories = Table(
    'article_categories',
    Base.metadata,
    Column('article_id', Integer, ForeignKey('articles.id', ondelete='CASCADE'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)


# Association table for user saved articles
user_saved_articles = Table(
    'user_saved_articles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('article_id', Integer, ForeignKey('articles.id', ondelete='CASCADE'), primary_key=True),
    Column('saved_at', DateTime(timezone=True), server_default=func.now())
)


# Association table for user followed topics
user_followed_topics = Table(
    'user_followed_topics',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    url = Column(String(2000), nullable=False, unique=True, index=True)
    source_type = Column(String(50), nullable=False, index=True)  # 'rss', 'youtube', 'arxiv', etc.
    source_name = Column(String(200))  # e.g., 'TechCrunch', 'Hacker News'
    content = Column(Text)
    author = Column(String(200))
    published_at = Column(DateTime(timezone=True), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    summary = relationship("Summary", back_populates="article", uselist=False, cascade="all, delete-orphan")
    categories = relationship("Category", secondary=article_categories, back_populates="articles")
    embedding = relationship("Embedding", back_populates="article", uselist=False, cascade="all, delete-orphan")
    connections = relationship("Connection", foreign_keys="Connection.source_article_id", back_populates="source_article", cascade="all, delete-orphan")
    saved_by_users = relationship("User", secondary=user_saved_articles, back_populates="saved_articles")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey('articles.id', ondelete='CASCADE'), nullable=False, unique=True)
    executive_summary = Column(Text, nullable=False)  # 2-3 sentences
    full_summary = Column(Text, nullable=False)  # Full paragraph
    key_points = Column(JSON, nullable=False)  # List of 5-7 key points
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    article = relationship("Article", back_populates="summary")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text)
    color = Column(String(7))  # Hex color for UI
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    articles = relationship("Article", secondary=article_categories, back_populates="categories")
    followed_by_users = relationship("User", secondary=user_followed_topics, back_populates="followed_topics")


class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey('articles.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    vector = Column(Text)  # Store as TEXT until pgvector is available
    model_name = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    article = relationship("Article", back_populates="embedding")


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    source_article_id = Column(Integer, ForeignKey('articles.id', ondelete='CASCADE'), nullable=False, index=True)
    target_article_id = Column(Integer, ForeignKey('articles.id', ondelete='CASCADE'), nullable=False, index=True)
    similarity_score = Column(Float, nullable=False, index=True)
    connection_type = Column(String(50), default='semantic')  # 'semantic', 'topic', 'citation', etc.
    connection_metadata = Column(JSON)  # Additional connection information
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    source_article = relationship("Article", foreign_keys=[source_article_id])
    target_article = relationship("Article", foreign_keys=[target_article_id])


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    digest_frequency = Column(String(20), default='weekly')  # 'daily', 'weekly', 'none'
    email_notifications = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    followed_topics = relationship("Category", secondary=user_followed_topics, back_populates="followed_by_users")
    saved_articles = relationship("Article", secondary=user_saved_articles, back_populates="saved_by_users")
    digests = relationship("Digest", back_populates="user", cascade="all, delete-orphan")


class Digest(Base):
    __tablename__ = "digests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)  # The synthesized digest content
    digest_type = Column(String(20), nullable=False)  # 'daily', 'weekly', 'custom'
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    article_count = Column(Integer, default=0)
    topics_covered = Column(JSON)  # List of topic names
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    sent_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="digests")


class Trend(Base):
    __tablename__ = "trends"

    id = Column(Integer, primary_key=True, index=True)
    topic_name = Column(String(200), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'))
    current_volume = Column(Integer, nullable=False)  # Number of articles in current period
    velocity = Column(Float, nullable=False)  # Rate of change
    acceleration = Column(Float, default=0.0)  # Change in velocity
    confidence_score = Column(Float, nullable=False)  # 0-1 confidence in trend
    historical_data = Column(JSON)  # Time series data
    prediction_data = Column(JSON)  # Predicted future values
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
