"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-12-03 00:00:00.000000

"""
from pathlib import Path
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Try to import Vector, use TEXT as fallback for Phase 1
try:
    from pgvector.sqlalchemy import Vector
    VECTOR_LIBRARY_AVAILABLE = True
except ImportError:
    VECTOR_LIBRARY_AVAILABLE = False
    Vector = None


def _vector_extension_available() -> bool:
    """Return True if the pgvector extension control file exists for the local Postgres install."""
    possible_paths = [
        Path("/opt/homebrew/opt/postgresql@15/share/postgresql@15/extension/vector.control"),
        Path("/opt/homebrew/share/postgresql@15/extension/vector.control"),
        Path("/usr/local/share/postgresql/extension/vector.control"),
    ]
    return any(p.exists() for p in possible_paths)


VECTOR_EXTENSION_AVAILABLE = VECTOR_LIBRARY_AVAILABLE and _vector_extension_available()

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension only if control file exists; otherwise skip (Phase 2 feature)
    if VECTOR_EXTENSION_AVAILABLE:
        op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    else:
        print("Warning: pgvector extension not available; embeddings will be stored as TEXT")
    
    # Create categories table
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_categories_id'), 'categories', ['id'], unique=False)
    op.create_index(op.f('ix_categories_name'), 'categories', ['name'], unique=True)
    
    # Create articles table
    op.create_table(
        'articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('url', sa.String(length=2000), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_name', sa.String(length=200), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('author', sa.String(length=200), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_articles_id'), 'articles', ['id'], unique=False)
    op.create_index(op.f('ix_articles_title'), 'articles', ['title'], unique=False)
    op.create_index(op.f('ix_articles_url'), 'articles', ['url'], unique=True)
    op.create_index(op.f('ix_articles_source_type'), 'articles', ['source_type'], unique=False)
    op.create_index(op.f('ix_articles_published_at'), 'articles', ['published_at'], unique=False)
    op.create_index(op.f('ix_articles_created_at'), 'articles', ['created_at'], unique=False)
    
    # Create summaries table
    op.create_table(
        'summaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('executive_summary', sa.Text(), nullable=False),
        sa.Column('full_summary', sa.Text(), nullable=False),
        sa.Column('key_points', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_summaries_id'), 'summaries', ['id'], unique=False)
    op.create_index(op.f('ix_summaries_article_id'), 'summaries', ['article_id'], unique=True)
    
    # Create article_categories association table
    op.create_table(
        'article_categories',
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('article_id', 'category_id')
    )
    
    # Create embeddings table
    # Use TEXT for vector column if pgvector not available (Phase 1)
    vector_col = Vector(768) if VECTOR_EXTENSION_AVAILABLE and Vector else sa.Text()
    op.create_table(
        'embeddings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('vector', vector_col, nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_embeddings_id'), 'embeddings', ['id'], unique=False)
    op.create_index(op.f('ix_embeddings_article_id'), 'embeddings', ['article_id'], unique=True)
    
    # Create connections table
    op.create_table(
        'connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_article_id', sa.Integer(), nullable=False),
        sa.Column('target_article_id', sa.Integer(), nullable=False),
        sa.Column('similarity_score', sa.Float(), nullable=False),
        sa.Column('connection_type', sa.String(length=50), nullable=True),
        sa.Column('connection_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['source_article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_connections_id'), 'connections', ['id'], unique=False)
    op.create_index(op.f('ix_connections_source_article_id'), 'connections', ['source_article_id'], unique=False)
    op.create_index(op.f('ix_connections_similarity_score'), 'connections', ['similarity_score'], unique=False)
    
    # Create users table (for Phase 3)
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=200), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=True),
        sa.Column('digest_frequency', sa.String(length=20), nullable=True),
        sa.Column('email_notifications', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # Create user association tables
    op.create_table(
        'user_saved_articles',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('saved_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'article_id')
    )
    
    op.create_table(
        'user_followed_topics',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'category_id')
    )
    
    # Create digests table (for Phase 3)
    op.create_table(
        'digests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('digest_type', sa.String(length=20), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('article_count', sa.Integer(), nullable=True),
        sa.Column('topics_covered', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_digests_id'), 'digests', ['id'], unique=False)
    op.create_index(op.f('ix_digests_user_id'), 'digests', ['user_id'], unique=False)
    op.create_index(op.f('ix_digests_created_at'), 'digests', ['created_at'], unique=False)
    
    # Create trends table (for Phase 4)
    op.create_table(
        'trends',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('topic_name', sa.String(length=200), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('current_volume', sa.Integer(), nullable=False),
        sa.Column('velocity', sa.Float(), nullable=False),
        sa.Column('acceleration', sa.Float(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('historical_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('prediction_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trends_id'), 'trends', ['id'], unique=False)
    op.create_index(op.f('ix_trends_topic_name'), 'trends', ['topic_name'], unique=False)
    op.create_index(op.f('ix_trends_created_at'), 'trends', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('trends')
    op.drop_table('digests')
    op.drop_table('user_followed_topics')
    op.drop_table('user_saved_articles')
    op.drop_table('users')
    op.drop_table('connections')
    op.drop_table('embeddings')
    op.drop_table('article_categories')
    op.drop_table('summaries')
    op.drop_table('articles')
    op.drop_table('categories')
