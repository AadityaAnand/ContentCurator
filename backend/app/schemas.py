from pydantic import BaseModel, Field, HttpUrl, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============================================================================
# User & Auth Schemas
# ============================================================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ============================================================================
# Article Schemas
# ============================================================================

class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SummaryBase(BaseModel):
    executive_summary: str
    full_summary: str
    key_points: List[str] = Field(..., min_length=3, max_length=10)


class SummaryCreate(SummaryBase):
    article_id: int


class SummaryResponse(SummaryBase):
    id: int
    article_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ArticleBase(BaseModel):
    title: str = Field(..., max_length=500)
    url: str = Field(..., max_length=2000)
    source_type: str = Field(..., max_length=50)
    source_name: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    author: Optional[str] = Field(None, max_length=200)
    published_at: Optional[datetime] = None


class ArticleCreate(ArticleBase):
    pass


class ArticleResponse(ArticleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    summary: Optional[SummaryResponse] = None
    categories: List[CategoryResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


class ArticleDetailResponse(ArticleResponse):
    """Extended article response with additional details"""
    related_count: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)


class ArticleListResponse(BaseModel):
    items: List[ArticleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Ingestion Schemas
# ============================================================================

class RSSFeedIngest(BaseModel):
    url: HttpUrl
    source_name: Optional[str] = None
    max_articles: int = Field(default=10, ge=1, le=100)


class YouTubeIngest(BaseModel):
    url: HttpUrl
    source_name: Optional[str] = "YouTube"


class TopicIngest(BaseModel):
    query: str = Field(..., min_length=2, max_length=200)
    max_results: int = Field(default=5, ge=1, le=15)
    source_name: Optional[str] = None


class IngestionResponse(BaseModel):
    success: bool
    message: str
    articles_processed: int
    articles_created: int
    articles_updated: int
    errors: List[str] = []


# ============================================================================
# Search Schemas
# ============================================================================

class ArticleSearchParams(BaseModel):
    query: Optional[str] = None
    categories: Optional[List[str]] = None
    source_types: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)


# ============================================================================
# Embedding & Graph Schemas
# ============================================================================

class EmbeddingCreate(BaseModel):
    article_id: int
    force_regenerate: bool = False


class EmbeddingResponse(BaseModel):
    id: int
    article_id: int
    model_name: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RelatedArticle(BaseModel):
    article: ArticleResponse
    similarity_score: float


class RelatedArticlesResponse(BaseModel):
    article_id: int
    related_articles: List[RelatedArticle]


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # 'article' or 'topic'
    category: Optional[str] = None
    url: Optional[str] = None
    published_at: Optional[datetime] = None
    size: float = 1.0
    color: Optional[str] = None


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float
    type: str = "semantic"


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    metadata: Dict[str, Any] = {}


# ============================================================================
# User & Auth Schemas
# ============================================================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    digest_frequency: str
    email_notifications: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None


class TokenPayload(BaseModel):
    sub: int  # user_id
    exp: datetime


class UserPreferences(BaseModel):
    digest_frequency: str = Field(..., pattern=r'^(daily|weekly|none)$')
    email_notifications: bool
    followed_topic_ids: List[int] = []


# ============================================================================
# Digest Schemas
# ============================================================================

class DigestGenerate(BaseModel):
    digest_type: str = Field(..., pattern=r'^(daily|weekly|custom)$')
    custom_start_date: Optional[datetime] = None
    custom_end_date: Optional[datetime] = None


class DigestResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    digest_type: str
    period_start: datetime
    period_end: datetime
    article_count: int
    topics_covered: List[str]
    created_at: datetime
    sent_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class DigestListResponse(BaseModel):
    items: List[DigestResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Trend Schemas
# ============================================================================

class TrendResponse(BaseModel):
    id: int
    topic_name: str
    category_id: Optional[int]
    current_volume: int
    velocity: float
    acceleration: float
    confidence_score: float
    period_start: datetime
    period_end: datetime
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TrendDetail(TrendResponse):
    historical_data: Dict[str, Any]
    prediction_data: Dict[str, Any]
    
    model_config = ConfigDict(from_attributes=True)


class TrendListResponse(BaseModel):
    items: List[TrendResponse]
    total: int
