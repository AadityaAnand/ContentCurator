'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { articlesApi, categoriesApi } from '@/lib/api'
import { ArticleCard } from '@/components/ArticleCard'
import { Pagination } from '@/components/Pagination'
import { SearchModeToggle, SemanticSearchResults } from '@/components/SemanticSearch'
import { Search, Filter, BookOpen, AlertCircle } from 'lucide-react'

export default function ArticlesPage() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSourceType, setSelectedSourceType] = useState<string>('')
  const [searchInput, setSearchInput] = useState('')
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text')
  const [semanticQuery, setSemanticQuery] = useState('')
  const pageSize = 10

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  // Fetch articles
  const { data, isLoading, error } = useQuery({
    queryKey: ['articles', page, searchQuery, selectedCategory, selectedSourceType],
    queryFn: () => {
      if (searchQuery) {
        return articlesApi.search({
          query: searchQuery,
          categories: selectedCategory || undefined,
          source_types: selectedSourceType || undefined,
          page,
          page_size: pageSize,
        })
      }
      return articlesApi.list(page, pageSize, selectedCategory, selectedSourceType)
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category)
    setPage(1)
  }

  const handleSourceTypeChange = (sourceType: string) => {
    setSelectedSourceType(sourceType === selectedSourceType ? '' : sourceType)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSearchInput('')
    setSelectedCategory('')
    setSelectedSourceType('')
    setPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Knowledge Library
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Browse and search through your curated collection of articles
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">What you can do here:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li><strong>Text Search:</strong> Find articles by title, content, or keywords</li>
                <li><strong>Semantic Search:</strong> Discover related content using AI embeddings</li>
                <li><strong>Filter:</strong> Narrow down by category or source type</li>
                <li>Looking to add new content? Visit <a href="/ingest" className="font-semibold underline">Ingest</a> page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Search Mode Toggle */}
      <SearchModeToggle mode={searchMode} onChange={setSearchMode} />

      {/* Semantic Search or Regular Search */}
      {searchMode === 'semantic' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Describe what you're looking for... (AI will find semantically similar content)"
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <SemanticSearchResults query={semanticQuery} />
        </div>
      ) : (
        <>
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles by title or content..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Filter className="h-4 w-4" />
                <span>Filters:</span>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Source Type Filter */}
              <select
                value={selectedSourceType}
                onChange={(e) => handleSourceTypeChange(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Sources</option>
                <option value="rss">RSS Feed</option>
                <option value="youtube">YouTube</option>
                <option value="web">Web Search</option>
              </select>

              {(searchQuery || selectedCategory || selectedSourceType) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Articles List */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">
                Error loading articles: {error.message}
              </p>
            </div>
          ) : !data?.items?.length ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
                No articles found
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                {searchQuery || selectedCategory || selectedSourceType
                  ? 'Try adjusting your filters or search query'
                  : 'Start by adding content from the Ingest page'}
              </p>
              <a
                href="/ingest"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ingest New Content
              </a>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((article: any) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>

              {/* Pagination */}
              {data.total > pageSize && (
                <div className="mt-8">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(data.total / pageSize)}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
