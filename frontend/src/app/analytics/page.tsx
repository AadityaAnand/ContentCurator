'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, TrendingUp, Zap, Activity, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import api from '@/lib/api'

interface Trend {
  category_id: number
  category_name: string
  recent_volume: number
  previous_volume: number
  velocity: number
  confidence: number
  direction: 'rising' | 'falling' | 'stable'
  total_volume: number
  momentum_score?: number
}

interface EmergingTopic extends Trend {
  recent_article_count: number
  latest_articles: Array<{
    id: number
    title: string
    created_at: string | null
  }>
}

interface TrendingSummary {
  period_days: number
  generated_at: string
  summary: {
    total_trending_topics: number
    emerging_topics_count: number
    hot_topics_count: number
  }
  top_trends: Trend[]
  emerging_topics: EmergingTopic[]
  hot_topics: Trend[]
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(14)

  const { data: summary, isLoading } = useQuery<TrendingSummary>({
    queryKey: ['analytics-summary', days],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8000/api/trends/analytics/summary?days=${days}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      return response.json()
    },
    refetchInterval: 60000, // Refresh every minute
  })

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'rising':
        return <ArrowUp className="w-4 h-4 text-green-600" />
      case 'falling':
        return <ArrowDown className="w-4 h-4 text-red-600" />
      default:
        return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'rising':
        return 'text-green-600 bg-green-50'
      case 'falling':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getMomentumColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50'
    if (score >= 40) return 'text-orange-600 bg-orange-50'
    return 'text-blue-600 bg-blue-50'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-8 h-8 text-indigo-600" />
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Track trending topics and emerging content patterns
              </p>
            </div>

            {/* Time Period Selector */}
            <div className="flex gap-2">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    days === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Trending Topics</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {summary.summary.total_trending_topics}
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-blue-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Emerging Topics</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {summary.summary.emerging_topics_count}
                    </p>
                  </div>
                  <Zap className="w-12 h-12 text-green-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Hot Topics</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                      {summary.summary.hot_topics_count}
                    </p>
                  </div>
                  <Bell className="w-12 h-12 text-red-600 opacity-20" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Hot Topics */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-600" />
                    Hot Topics (High Momentum)
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Topics with the highest momentum scores
                  </p>
                </div>
                <div className="p-6">
                  {summary.hot_topics.length > 0 ? (
                    <div className="space-y-4">
                      {summary.hot_topics.map((topic) => (
                        <div
                          key={topic.category_id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {topic.category_name}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-gray-600">
                                  {topic.total_volume} articles
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDirectionColor(topic.direction)}`}>
                                  {getDirectionIcon(topic.direction)}
                                  <span className="ml-1">{topic.velocity.toFixed(1)}%</span>
                                </span>
                              </div>
                            </div>
                            <div className={`px-3 py-2 rounded-lg text-sm font-bold ${getMomentumColor(topic.momentum_score || 0)}`}>
                              {topic.momentum_score?.toFixed(0)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No hot topics found</p>
                  )}
                </div>
              </div>

              {/* Emerging Topics */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-600" />
                    Emerging Topics
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Rapidly growing topics (&gt;50% velocity)
                  </p>
                </div>
                <div className="p-6">
                  {summary.emerging_topics.length > 0 ? (
                    <div className="space-y-4">
                      {summary.emerging_topics.map((topic) => (
                        <div
                          key={topic.category_id}
                          className="border border-green-200 rounded-lg p-4 bg-green-50/30 hover:bg-green-50/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {topic.category_name}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-gray-600">
                                  {topic.total_volume} articles
                                </span>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  <ArrowUp className="w-3 h-3 inline mr-1" />
                                  {topic.velocity.toFixed(0)}% growth
                                </span>
                              </div>
                            </div>
                          </div>

                          {topic.latest_articles.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <p className="text-xs font-medium text-gray-600 mb-2">Latest Articles:</p>
                              <div className="space-y-1">
                                {topic.latest_articles.slice(0, 2).map((article) => (
                                  <p key={article.id} className="text-xs text-gray-700 truncate">
                                    • {article.title}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No emerging topics found</p>
                  )}
                </div>
              </div>

              {/* All Trending Topics */}
              <div className="bg-white rounded-lg shadow lg:col-span-2">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Top Trending Topics
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Ranked by absolute velocity (rate of change)
                  </p>
                </div>
                <div className="p-6">
                  {summary.top_trends.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm font-medium text-gray-600 border-b border-gray-200">
                            <th className="pb-3">Topic</th>
                            <th className="pb-3 text-right">Recent</th>
                            <th className="pb-3 text-right">Previous</th>
                            <th className="pb-3 text-right">Velocity</th>
                            <th className="pb-3 text-center">Trend</th>
                            <th className="pb-3 text-right">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.top_trends.map((trend) => (
                            <tr key={trend.category_id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 font-medium text-gray-900">{trend.category_name}</td>
                              <td className="py-3 text-right text-gray-700">{trend.recent_volume}</td>
                              <td className="py-3 text-right text-gray-700">{trend.previous_volume}</td>
                              <td className={`py-3 text-right font-semibold ${
                                trend.velocity > 0 ? 'text-green-600' : trend.velocity < 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {trend.velocity > 0 ? '+' : ''}{trend.velocity.toFixed(1)}%
                              </td>
                              <td className="py-3 text-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDirectionColor(trend.direction)}`}>
                                  {getDirectionIcon(trend.direction)}
                                  <span className="ml-1 capitalize">{trend.direction}</span>
                                </span>
                              </td>
                              <td className="py-3 text-right text-gray-700">
                                {(trend.confidence * 100).toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No trending topics found</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-6 text-center text-sm text-gray-500">
              Last updated: {new Date(summary.generated_at).toLocaleString()}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
