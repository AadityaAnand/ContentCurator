'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Calendar, Trash2, Send, Plus, Eye, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Digest {
  id: number
  user_id: number
  title: string
  content: string
  digest_type: string
  period_start: string
  period_end: string
  article_count: number
  topics_covered: string[]
  created_at: string
  sent_at: string | null
}

interface DigestListResponse {
  items: Digest[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export default function DigestsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedDigest, setSelectedDigest] = useState<Digest | null>(null)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [digestType, setDigestType] = useState<'daily' | 'weekly' | 'custom'>('daily')
  const [customDays, setCustomDays] = useState(3)

  // Fetch digests
  const { data: digestsData, isLoading } = useQuery<DigestListResponse>({
    queryKey: ['digests', page, token],
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:8000/api/digests?page=${page}&page_size=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (!response.ok) throw new Error('Failed to fetch digests')
      return response.json()
    },
    enabled: !!token,
  })

  // Generate digest mutation
  const generateMutation = useMutation({
    mutationFn: async (data: { digest_type: string; custom_period_days?: number }) => {
      const response = await fetch('http://localhost:8000/api/digests/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to generate digest')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digests'] })
      setShowGenerateForm(false)
    },
  })

  // Resend digest mutation
  const resendMutation = useMutation({
    mutationFn: async (digestId: number) => {
      const response = await fetch(`http://localhost:8000/api/digests/${digestId}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to resend digest')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digests'] })
    },
  })

  // Delete digest mutation
  const deleteMutation = useMutation({
    mutationFn: async (digestId: number) => {
      const response = await fetch(`http://localhost:8000/api/digests/${digestId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to delete digest')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digests'] })
      setSelectedDigest(null)
    },
  })

  const handleGenerate = () => {
    const data: { digest_type: string; custom_period_days?: number } = {
      digest_type: digestType,
    }
    if (digestType === 'custom') {
      data.custom_period_days = customDays
    }
    generateMutation.mutate(data)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-gray-600">Please log in to view digests</p>
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
                <Mail className="w-8 h-8 text-indigo-600" />
                Email Digests
              </h1>
              <p className="text-gray-600 mt-2">
                Generate and manage your personalized content digests
              </p>
            </div>

            <button
              onClick={() => setShowGenerateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Generate New Digest
            </button>
          </div>
        </div>

        {/* Generate Form Modal */}
        {showGenerateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Digest</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Digest Type
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'daily', label: 'Daily (last 24 hours)' },
                      { value: 'weekly', label: 'Weekly (last 7 days)' },
                      { value: 'custom', label: 'Custom period' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="digestType"
                          value={option.value}
                          checked={digestType === option.value}
                          onChange={(e) => setDigestType(e.target.value as any)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {digestType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={customDays}
                      onChange={(e) => setCustomDays(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}

                {generateMutation.isError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {generateMutation.error instanceof Error
                      ? generateMutation.error.message
                      : 'Failed to generate digest'}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Generate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowGenerateForm(false)}
                    disabled={generateMutation.isPending}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Digest Preview Modal */}
        {selectedDigest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selectedDigest.title}</h2>
                <button
                  onClick={() => setSelectedDigest(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium capitalize">{selectedDigest.digest_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Articles:</span>
                    <span className="ml-2 font-medium">{selectedDigest.article_count}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedDigest.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Sent:</span>
                    <span className="ml-2 font-medium">
                      {selectedDigest.sent_at ? formatDate(selectedDigest.sent_at) : 'Not sent'}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-sm text-gray-600">Topics:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedDigest.topics_covered.map((topic, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedDigest.content }}
                />
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => resendMutation.mutate(selectedDigest.id)}
                  disabled={resendMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {resendMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Resend
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this digest?')) {
                      deleteMutation.mutate(selectedDigest.id)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Digests List */}
        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : digestsData && digestsData.items.length > 0 ? (
            <>
              <div className="divide-y divide-gray-200">
                {digestsData.items.map((digest) => (
                  <div
                    key={digest.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedDigest(digest)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {digest.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(digest.created_at)}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                            {digest.digest_type}
                          </span>
                          <span>{digest.article_count} articles</span>
                          {digest.sent_at && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Check className="w-4 h-4" />
                              Sent
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {digest.topics_covered.slice(0, 5).map((topic, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                          {digest.topics_covered.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{digest.topics_covered.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDigest(digest)
                        }}
                        className="ml-4 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {digestsData.total_pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {digestsData.items.length} of {digestsData.total} digests
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      Page {page} of {digestsData.total_pages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === digestsData.total_pages}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No digests yet</p>
              <button
                onClick={() => setShowGenerateForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Generate Your First Digest
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
