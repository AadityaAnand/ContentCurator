'use client'

import { useQuery } from '@tanstack/react-query'
import { trendsApi } from '@/lib/api'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Database, BookOpen, Target } from 'lucide-react'
import { Loader2 } from 'lucide-react'

export default function TrendsPage() {
  // Fetch all trends data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['trendsStats'],
    queryFn: trendsApi.getStats,
  })

  const { data: topSources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['topSources'],
    queryFn: () => trendsApi.getTopSources(30),
  })

  const { data: topCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['topCategories'],
    queryFn: () => trendsApi.getTopCategories(30),
  })

  const { data: articlesOverTime, isLoading: timeLoading } = useQuery({
    queryKey: ['articlesOverTime'],
    queryFn: () => trendsApi.getArticlesOverTime(30),
  })

  const { data: sourceDistribution, isLoading: distLoading } = useQuery({
    queryKey: ['sourceDistribution'],
    queryFn: () => trendsApi.getSourceDistribution(30),
  })

  const { data: newestArticles } = useQuery({
    queryKey: ['newestArticles'],
    queryFn: () => trendsApi.getNewestArticles(5),
  })

  const isLoading = statsLoading || sourcesLoading || categoriesLoading || timeLoading || distLoading

  const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#f97316', '#6366f1', '#14b8a6']

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-indigo-600" />
            Trends & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Discover insights across your knowledge base</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={<BookOpen className="h-6 w-6" />}
                label="Total Articles"
                value={stats?.total_articles || 0}
                color="indigo"
              />
              <StatCard
                icon={<Target className="h-6 w-6" />}
                label="Categories"
                value={stats?.total_categories || 0}
                color="purple"
              />
              <StatCard
                icon={<Database className="h-6 w-6" />}
                label="Content Sources"
                value={stats?.unique_sources || 0}
                color="orange"
              />
              <StatCard
                icon={<TrendingUp className="h-6 w-6" />}
                label="Avg per Category"
                value={stats?.avg_articles_per_category.toFixed(1) || 0}
                color="green"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Articles Over Time */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Articles Over Time (Last 30 Days)</h2>
                {articlesOverTime && articlesOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={articlesOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={{ fill: '#4f46e5' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">No data available</div>
                )}
              </div>

              {/* Source Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Source Distribution</h2>
                {sourceDistribution && sourceDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, count }) => `${type}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {sourceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">No data available</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Sources */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Top Content Sources</h2>
                {topSources && topSources.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topSources}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#ec4899" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">No data available</div>
                )}
              </div>

              {/* Top Categories */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Top Categories</h2>
                {topCategories && topCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCategories} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9ca3af" />
                      <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">No data available</div>
                )}
              </div>
            </div>

            {/* Latest Articles */}
            {newestArticles && newestArticles.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Latest Articles</h2>
                <div className="space-y-3">
                  {newestArticles.map((article: any) => (
                    <div key={article.id} className="flex items-start justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{article.title}</p>
                        <div className="flex gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {article.source && <span>{article.source}</span>}
                          {article.published_at && (
                            <span>{new Date(article.published_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorClasses = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
