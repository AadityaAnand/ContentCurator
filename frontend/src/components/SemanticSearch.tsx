'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime, getSourceColor } from '@/lib/utils'

interface SearchModeToggleProps {
  mode: 'text' | 'semantic'
  onChange: (mode: 'text' | 'semantic') => void
}

export function SearchModeToggle({ mode, onChange }: SearchModeToggleProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-gray-600 dark:text-gray-400">Search Mode:</span>
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => onChange('text')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            mode === 'text'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Text Search
        </button>
        <button
          onClick={() => onChange('semantic')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            mode === 'semantic'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Semantic Search
        </button>
      </div>
      {mode === 'semantic' && (
        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
          AI-powered
        </span>
      )}
    </div>
  )
}

interface SemanticSearchResultsProps {
  query: string
}

export function SemanticSearchResults({ query }: SemanticSearchResultsProps) {
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['semantic-search', query],
    queryFn: async () => {
      if (!query.trim()) return []

      // For now, we'll use a simple approach: fetch all articles and find semantically similar ones
      // In a production system, this would call a backend semantic search endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(
        `${apiUrl}/api/articles/search?query=${encodeURIComponent(query)}&page=1&page_size=20`
      )
      if (!response.ok) return []
      const data = await response.json()
      return data.items || []
    },
    enabled: query.length > 0,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !results || results.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
        {query ? 'No results found' : 'Start typing to search...'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((article: any) => (
        <Link
          key={article.id}
          href={`/articles/${article.id}`}
          className="block bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-400 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {article.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSourceColor(
                    article.source_type
                  )}`}
                >
                  {article.source_type.toUpperCase()}
                </span>
                {article.published_at && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {formatRelativeTime(article.published_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
