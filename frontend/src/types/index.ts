// API Types

export interface Category {
  id: number
  name: string
  description?: string
  color?: string
  created_at: string
}

export interface Summary {
  id: number
  article_id: number
  executive_summary: string
  full_summary: string
  key_points: string[]
  created_at: string
  updated_at: string
}

export interface Article {
  id: number
  title: string
  url: string
  source_type: string
  source_name?: string
  content?: string
  author?: string
  published_at?: string
  created_at: string
  updated_at: string
  summary?: Summary
  categories: Category[]
}

export interface ArticleDetail extends Article {
  related_count?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface IngestionResponse {
  success: boolean
  message: string
  articles_processed: number
  articles_created: number
  articles_updated: number
  errors: string[]
}

export interface SearchParams {
  query?: string
  categories?: string
  source_types?: string
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

export interface JobResponse {
  id: number
  job_type: string
  status: string
  progress: number
  total_items: number
  processed_items: number
  created_items: number
  parameters?: Record<string, any>
  result?: Record<string, any>
  error_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
  updated_at: string
}

export interface JobStatusResponse {
  id: number
  status: string
  progress: number
  total_items: number
  processed_items: number
  created_items: number
  error_message?: string
  result?: Record<string, any>
}

export interface UserPreferences {
  digest_frequency: string
  email_notifications: boolean
  followed_topics: Category[]
}
