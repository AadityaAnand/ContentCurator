'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { useQuery } from '@tanstack/react-query'
import { savedArticlesApi } from '@/lib/api'
import { Loader2, ArrowLeft, Heart, Trash2 } from 'lucide-react'
import { ArticleCard } from '@/components/ArticleCard'

export default function ProfilePage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()

  // Fetch saved articles
  const { data: savedArticles, isLoading, error, refetch } = useQuery({
    queryKey: ['savedArticles', token],
    queryFn: () => token ? savedArticlesApi.list(token) : Promise.resolve([]),
    enabled: !!token && isAuthenticated,
  })

  if (authLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-8">Please sign in to view your profile</p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleRemoveSaved = async (articleId: number) => {
    if (token) {
      try {
        await savedArticlesApi.remove(articleId, token)
        refetch()
      } catch (err) {
        console.error('Failed to remove article:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/articles"
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Articles
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Profile</h1>
          <p className="text-gray-600 dark:text-gray-300">Welcome, {user?.username}!</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Username</p>
              <p className="text-lg text-gray-900 dark:text-white">{user?.username}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-lg text-gray-900 dark:text-white">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Saved Articles Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500" />
            Saved Articles
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              <p className="font-medium">Error loading saved articles</p>
              <p className="text-sm">{error.message}</p>
            </div>
          ) : savedArticles && savedArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedArticles.map((article: any) => (
                <div key={article.id} className="relative">
                  <ArticleCard article={article} />
                  <button
                    onClick={() => handleRemoveSaved(article.id)}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove from saved"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No saved articles yet</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                Start exploring and save articles to your collection
              </p>
              <Link
                href="/articles"
                className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Explore Articles
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
