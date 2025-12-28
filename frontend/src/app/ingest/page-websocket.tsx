'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ingestionApi } from '@/lib/api'
import { Search, AlertCircle, Sparkles, Rss, Youtube, Globe, CheckCircle2 } from 'lucide-react'
import { JobProgress } from '@/components/JobProgress'

export default function IngestPageWebSocket() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'research' | 'rss' | 'youtube'>('research')

  // Research state
  const [researchQuery, setResearchQuery] = useState('')
  const [maxWebResults, setMaxWebResults] = useState(5)
  const [maxYoutubeResults, setMaxYoutubeResults] = useState(3)

  // RSS state
  const [rssUrl, setRssUrl] = useState('')
  const [rssSourceName, setRssSourceName] = useState('')
  const [rssMaxArticles, setRssMaxArticles] = useState(10)

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeSourceName, setYoutubeSourceName] = useState('')

  const [currentJobId, setCurrentJobId] = useState<number | null>(null)

  const queryClient = useQueryClient()

  const researchMutation = useMutation({
    mutationFn: (payload: { query: string; max_web_results: number; max_youtube_results: number }) =>
      ingestionApi.researchTopic(payload.query, payload.max_web_results, payload.max_youtube_results),
    onSuccess: (data) => {
      setCurrentJobId(data.id)
      setResearchQuery('')
    },
  })

  const rssMutation = useMutation({
    mutationFn: async (payload: { url: string; sourceName?: string; maxArticles: number }) => {
      const response = await ingestionApi.ingestRSS(payload.url, payload.sourceName, payload.maxArticles)
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      return response
    },
    onSuccess: () => {
      setRssUrl('')
      setRssSourceName('')
    },
  })

  const youtubeMutation = useMutation({
    mutationFn: async (payload: { url: string; sourceName?: string }) => {
      const response = await ingestionApi.ingestYouTube(payload.url, payload.sourceName)
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      return response
    },
    onSuccess: () => {
      setYoutubeUrl('')
      setYoutubeSourceName('')
    },
  })

  const handleResearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (researchQuery.trim()) {
      researchMutation.mutate({
        query: researchQuery,
        max_web_results: maxWebResults,
        max_youtube_results: maxYoutubeResults,
      })
    }
  }

  const handleRssIngest = (e: React.FormEvent) => {
    e.preventDefault()
    if (rssUrl.trim()) {
      rssMutation.mutate({
        url: rssUrl,
        sourceName: rssSourceName || undefined,
        maxArticles: rssMaxArticles,
      })
    }
  }

  const handleYoutubeIngest = (e: React.FormEvent) => {
    e.preventDefault()
    if (youtubeUrl.trim()) {
      youtubeMutation.mutate({
        url: youtubeUrl,
        sourceName: youtubeSourceName || undefined,
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Ingest Content
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Add new content to your knowledge library
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('research')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'research'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Search className="h-4 w-4" />
              Research Topic
            </button>
            <button
              onClick={() => setActiveTab('rss')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'rss'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Rss className="h-4 w-4" />
              RSS Feed
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'youtube'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Youtube className="h-4 w-4" />
              YouTube Video
            </button>
          </div>

          {/* Job Progress - WebSocket Enabled */}
          {currentJobId && (
            <div className="mb-6">
              <JobProgress
                jobId={currentJobId}
                title="Research in Progress"
                onComplete={(result) => {
                  queryClient.invalidateQueries({ queryKey: ['articles'] })
                  console.log('Research completed:', result)
                }}
                onClose={() => setCurrentJobId(null)}
              />
            </div>
          )}

          {/* Info Cards */}
          {activeTab === 'research' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-2">How Autonomous Research Works:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-blue-800 dark:text-blue-200">
                    <div className="flex items-start gap-2">
                      <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Web Articles</p>
                        <p className="text-xs">Searches Tavily API for relevant articles</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Youtube className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">YouTube Videos</p>
                        <p className="text-xs">Finds educational videos with transcripts</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">AI Processing</p>
                        <p className="text-xs">Ollama summarizes and categorizes everything</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Auto-Integration</p>
                        <p className="text-xs">Real-time progress via WebSocket</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Forms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {activeTab === 'research' && (
            <form onSubmit={handleResearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Research Query
                </label>
                <input
                  type="text"
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                  placeholder="e.g., Latest developments in quantum computing"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Web Results
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxWebResults}
                    onChange={(e) => setMaxWebResults(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    YouTube Results
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={maxYoutubeResults}
                    onChange={(e) => setMaxYoutubeResults(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={researchMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Search className="h-5 w-5" />
                {researchMutation.isPending ? 'Starting Research...' : 'Start Research'}
              </button>
            </form>
          )}

          {activeTab === 'rss' && (
            <form onSubmit={handleRssIngest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  RSS Feed URL
                </label>
                <input
                  type="url"
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source Name (optional)
                </label>
                <input
                  type="text"
                  value={rssSourceName}
                  onChange={(e) => setRssSourceName(e.target.value)}
                  placeholder="e.g., TechCrunch"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Articles
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={rssMaxArticles}
                  onChange={(e) => setRssMaxArticles(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={rssMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Rss className="h-5 w-5" />
                {rssMutation.isPending ? 'Ingesting Feed...' : 'Ingest RSS Feed'}
              </button>
            </form>
          )}

          {activeTab === 'youtube' && (
            <form onSubmit={handleYoutubeIngest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source Name (optional)
                </label>
                <input
                  type="text"
                  value={youtubeSourceName}
                  onChange={(e) => setYoutubeSourceName(e.target.value)}
                  placeholder="e.g., Channel Name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={youtubeMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Youtube className="h-5 h-5" />
                {youtubeMutation.isPending ? 'Ingesting Video...' : 'Ingest YouTube Video'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
