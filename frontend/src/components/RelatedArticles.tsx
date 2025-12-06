'use client'

import { useQuery } from '@tanstack/react-query'
import { articlesApi } from '@/lib/api'
import { Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime, getSourceColor } from '@/lib/utils'

interface RelatedArticlesProps {
  articleId: number
  limit?: number
}

export default function RelatedArticles({ articleId, limit = 5 }: RelatedArticlesProps) {
  const { data: relatedArticles, isLoading, error } = useQuery({
    queryKey: ['related-articles', articleId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8000/api/embeddings/related/${articleId}?limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to fetch related articles')
      }
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-gray-600 dark:text-gray-400 text-sm">
        Unable to load related articles.
      </div>
    )
  }

  if (!relatedArticles || relatedArticles.length === 0) {
    return (
      <div className="text-gray-600 dark:text-gray-400 text-sm">
        No related articles found yet. Related articles are discovered based on semantic similarity.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {relatedArticles.map((item: any) => {
        const article = item.article
        const similarity = item.similarity_score

        return (
          <div
            key={article.id}
            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/articles/${article.id}`}
                  className="text-base font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2"
                >
                  {article.title}
                </Link>
                
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSourceColor(article.source_type)}`}>
                    {article.source_type.toUpperCase()}
                  </span>
                  {article.published_at && (
                    <span>{formatRelativeTime(article.published_at)}</span>
                  )}
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    {Math.round(similarity * 100)}% similar
                  </span>
                </div>

                {article.summary?.executive_summary && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {article.summary.executive_summary}
                  </p>
                )}
              </div>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
