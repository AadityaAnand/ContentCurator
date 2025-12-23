'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { savedArticlesApi, authApi, categoriesApi } from '@/lib/api'
import { Loader2, ArrowLeft, Heart, Trash2, Settings, Bell, Mail, CheckCircle2 } from 'lucide-react'
import { ArticleCard } from '@/components/ArticleCard'
import { useState } from 'react'
import type { UserPreferences } from '@/types'

export default function ProfilePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch saved articles
  const { data: savedArticles = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['savedArticles', token],
    queryFn: () => token ? savedArticlesApi.list(token) : Promise.resolve([]),
    enabled: !!token && isAuthenticated,
  })

  // Fetch user preferences
  const { data: preferences, isLoading: prefsLoading } = useQuery<UserPreferences | null>({
    queryKey: ['preferences', token],
    queryFn: () => token ? authApi.getPreferences(token) : Promise.resolve(null),
    enabled: !!token && isAuthenticated,
  })

  // Fetch all categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  // Update preferences mutation
  const updatePrefsMutation = useMutation({
    mutationFn: (prefs: { digest_frequency?: string; email_notifications?: boolean }) =>
      authApi.updatePreferences(token!, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', token] })
      setSuccessMessage('Preferences updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
  })

  // Follow/unfollow topic mutations
  const followTopicMutation = useMutation({
    mutationFn: (categoryId: number) => authApi.followTopic(token!, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', token] })
      setSuccessMessage('Topic followed!')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
  })

  const unfollowTopicMutation = useMutation({
    mutationFn: (categoryId: number) => authApi.unfollowTopic(token!, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', token] })
      setSuccessMessage('Topic unfollowed!')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
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

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-200">{successMessage}</span>
          </div>
        )}

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

        {/* Preferences Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Preferences
          </h2>

          {prefsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Email Digest Frequency */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Mail className="h-4 w-4" />
                  Email Digest Frequency
                </label>
                <div className="flex gap-3">
                  {['daily', 'weekly', 'none'].map((freq) => (
                    <button
                      key={freq}
                      onClick={() => updatePrefsMutation.mutate({ digest_frequency: freq })}
                      disabled={updatePrefsMutation.isPending}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        preferences?.digest_frequency === freq
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      } disabled:opacity-50`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Choose how often you&apos;d like to receive email digests of new articles
                </p>
              </div>

              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Notifications
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Receive notifications about important updates
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => updatePrefsMutation.mutate({ email_notifications: !preferences?.email_notifications })}
                  disabled={updatePrefsMutation.isPending}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences?.email_notifications
                      ? 'bg-indigo-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences?.email_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Followed Topics */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Followed Topics
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {preferences?.followed_topics && preferences.followed_topics.length > 0 ? (
                    preferences.followed_topics.map((topic: any) => (
                      <span
                        key={topic.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                      >
                        {topic.name}
                        <button
                          onClick={() => unfollowTopicMutation.mutate(topic.id)}
                          disabled={unfollowTopicMutation.isPending}
                          className="hover:text-indigo-900 dark:hover:text-indigo-100 disabled:opacity-50"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No topics followed yet
                    </p>
                  )}
                </div>

                {/* Available Topics to Follow */}
                {categories && categories.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Available topics:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categories
                        .filter((cat: any) => !preferences?.followed_topics?.some((ft: any) => ft.id === cat.id))
                        .map((category: any) => (
                          <button
                            key={category.id}
                            onClick={() => followTopicMutation.mutate(category.id)}
                            disabled={followTopicMutation.isPending}
                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            + {category.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
