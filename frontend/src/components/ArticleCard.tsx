import type { Article } from '@/types'
import Link from 'next/link'
import { formatRelativeTime, getSourceColor, getCategoryColor } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <Link href={`/articles/${article.id}`}>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 mb-2">
              {article.title}
            </h3>
          </Link>

          {/* Executive Summary */}
          {article.summary && (
            <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
              {article.summary.executive_summary}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
            {article.source_name && (
              <span className="font-medium">{article.source_name}</span>
            )}
            {article.published_at && (
              <>
                <span>•</span>
                <span>{formatRelativeTime(article.published_at)}</span>
              </>
            )}
            {article.author && (
              <>
                <span>•</span>
                <span>by {article.author}</span>
              </>
            )}
          </div>

          {/* Categories and Source Type */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceColor(article.source_type)}`}>
              {article.source_type.toUpperCase()}
            </span>
            {article.categories.map((category, index) => (
              <span
                key={category.id}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(index)}`}
              >
                {category.name}
              </span>
            ))}
          </div>
        </div>

        {/* External Link */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          title="Open original source"
        >
          <ExternalLink className="h-5 w-5" />
        </a>
      </div>
    </div>
  )
}
