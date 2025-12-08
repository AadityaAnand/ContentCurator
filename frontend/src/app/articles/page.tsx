'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { articlesApi, categoriesApi } from '@/lib/api'
import { ArticleCard } from '@/components/ArticleCard'
import { Pagination } from '@/components/Pagination'
import { SearchModeToggle, SemanticSearchResults } from '@/components/SemanticSearch'
import { Search, Filter, Loader2 } from 'lucide-react'

export default function ArticlesPage() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSourceType, setSelectedSourceType] = useState<string>('')
  const [searchInput, setSearchInput] = useState('')
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text')
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Articles</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Browse and search curated content from multiple sources
        </p>
      </div>

      {/* Search Mode Toggle */}
      <SearchModeToggle mode={searchMode} onChange={setSearchMode} />

      {searchMode === 'semantic' ? (
        // Semantic Search Results
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search semantically (by meaning)..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <SemanticSearchResults query={searchInput} />
        </div>
      ) : (
        // Traditional Search
        <>
          {/* Search Bar */}
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Search
              </button>
            </form>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          {(searchQuery || selectedCategory || selectedSourceType) && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Source Type Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-sm text-gray-600 dark:text-gray-400 self-center mr-2">Source:</span>
          {['rss', 'youtube', 'arxiv'].map((sourceType) => (
            <button
              key={sourceType}
              onClick={() => handleSourceTypeChange(sourceType)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedSourceType === sourceType
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {sourceType.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 self-center mr-2">Category:</span>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.name)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.name
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
          <p className="font-medium">Error loading articles</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Articles List */}
      {data && (
        <>
          {data.items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No articles found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {data.items.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>

              {/* Pagination */}
              {data.total_pages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={data.total_pages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </>
      )}
        </>
      )}
    </div>
  )
}
