'use client'

import { useQuery } from '@tanstack/react-query'
import { articlesApi } from '@/lib/api'
import { formatDateTime, formatRelativeTime, getSourceColor, getCategoryColor } from '@/lib/utils'
import { ExternalLink, Loader2, Calendar, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import RelatedArticles from '@/components/RelatedArticles'
import { use } from 'react'

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const articleId = parseInt(id)

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articlesApi.get(articleId),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Article Not Found</h2>
          <p className="text-red-600 dark:text-red-300">
            {error?.message || 'The article you are looking for does not exist.'}
          </p>
          <Link href="/articles" className="inline-block mt-4 text-red-700 dark:text-red-300 hover:underline">
            ← Back to articles
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link href="/articles" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-6">
        ← Back to articles
      </Link>

      {/* Article Header */}
      <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {article.title}
        </h1>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
          {article.source_name && (
            <div className="flex items-center">
              <span className="font-medium">{article.source_name}</span>
            </div>
          )}
          {article.published_at && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{formatDateTime(article.published_at)}</span>
              <span className="ml-2 text-gray-400">({formatRelativeTime(article.published_at)})</span>
            </div>
          )}
          {article.author && (
            <div className="flex items-center">
              <UserIcon className="h-4 w-4 mr-1" />
              <span>{article.author}</span>
            </div>
          )}
        </div>

        {/* Categories and Source Type */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSourceColor(article.source_type)}`}>
            {article.source_type.toUpperCase()}
          </span>
          {article.categories.map((category, index) => (
            <span
              key={category.id}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(index)}`}
            >
              {category.name}
            </span>
          ))}
        </div>

        {/* Original Link */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-8"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          View original source
        </a>

        {/* Summaries */}
        {article.summary && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Executive Summary</h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                {article.summary.executive_summary}
              </p>
            </div>

            {/* Full Summary */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Full Summary</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {article.summary.full_summary}
              </p>
            </div>

            {/* Key Points */}
            {article.summary.key_points && article.summary.key_points.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Key Points</h2>
                <ul className="space-y-2">
                  {article.summary.key_points.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 pt-0.5">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      </article>
      {/* Related Articles Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Related Articles</h2>
        <RelatedArticles articleId={articleId} limit={5} />
      </div>
    </div>
  )
}
