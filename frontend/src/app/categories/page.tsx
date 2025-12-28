'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Folder, Edit, Trash2, Plus, Merge, CheckSquare, Loader2, X, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Category {
  id: number
  name: string
  description: string | null
  color: string | null
  article_count?: number
}

interface BulkAssignResponse {
  success: boolean
  updated_count: number
  mode: string
  category_ids: number[]
  article_ids: number[]
}

export default function CategoriesPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#4F46E5')

  const [mergeSourceId, setMergeSourceId] = useState<number | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null)
  const [deleteSource, setDeleteSource] = useState(true)

  // Fetch categories with stats
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories', token],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/categories?include_stats=true', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('Failed to fetch categories')
      return response.json()
    },
    enabled: !!token,
  })

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string }) => {
      const response = await fetch('http://localhost:8000/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create category')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setShowCreateModal(false)
      setNewCategoryName('')
      setNewCategoryDescription('')
      setNewCategoryColor('#4F46E5')
    },
  })

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Category> }) => {
      const response = await fetch(`http://localhost:8000/api/categories/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update category')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setShowEditModal(false)
      setEditingCategory(null)
    },
  })

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`http://localhost:8000/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to delete category')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  // Merge categories mutation
  const mergeMutation = useMutation({
    mutationFn: async ({
      sourceId,
      targetId,
      deleteSource,
    }: {
      sourceId: number
      targetId: number
      deleteSource: boolean
    }) => {
      const response = await fetch(
        `http://localhost:8000/api/categories/bulk/merge?source_category_id=${sourceId}&target_category_id=${targetId}&delete_source=${deleteSource}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (!response.ok) throw new Error('Failed to merge categories')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setShowMergeModal(false)
      setMergeSourceId(null)
      setMergeTargetId(null)
    },
  })

  // Cleanup unused categories mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('http://localhost:8000/api/categories/bulk/cleanup', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to cleanup categories')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      alert(`Cleaned up ${data.deleted_count} unused categories`)
    },
  })

  const handleCreate = () => {
    if (newCategoryName.trim()) {
      createMutation.mutate({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
        color: newCategoryColor,
      })
    }
  }

  const handleUpdate = () => {
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: {
          name: editingCategory.name,
          description: editingCategory.description,
          color: editingCategory.color,
        },
      })
    }
  }

  const handleMerge = () => {
    if (mergeSourceId && mergeTargetId && mergeSourceId !== mergeTargetId) {
      mergeMutation.mutate({
        sourceId: mergeSourceId,
        targetId: mergeTargetId,
        deleteSource,
      })
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-gray-600">Please log in to manage categories</p>
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
                <Folder className="w-8 h-8 text-indigo-600" />
                Category Management
              </h1>
              <p className="text-gray-600 mt-2">
                Organize your content with categories and bulk operations
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowMergeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Merge className="w-5 h-5" />
                Merge
              </button>
              <button
                onClick={() => {
                  if (confirm('Remove all categories with 0 articles?')) {
                    cleanupMutation.mutate()
                  }
                }}
                disabled={cleanupMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {cleanupMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                Cleanup
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Category
              </button>
            </div>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Category</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., Machine Learning"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCreate}
                    disabled={createMutation.isPending || !newCategoryName.trim()}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Category</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingCategory.description || ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <input
                    type="color"
                    value={editingCategory.color || '#4F46E5'}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, color: e.target.value })
                    }
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleUpdate}
                    disabled={updateMutation.isPending}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingCategory(null)
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Merge Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Merge Categories</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Category (will be merged from)
                  </label>
                  <select
                    value={mergeSourceId || ''}
                    onChange={(e) => setMergeSourceId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select source...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.article_count || 0} articles)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Category (will be merged into)
                  </label>
                  <select
                    value={mergeTargetId || ''}
                    onChange={(e) => setMergeTargetId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select target...</option>
                    {categories
                      .filter((cat) => cat.id !== mergeSourceId)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.article_count || 0} articles)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deleteSource"
                    checked={deleteSource}
                    onChange={(e) => setDeleteSource(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="deleteSource" className="text-sm text-gray-700">
                    Delete source category after merging
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleMerge}
                    disabled={
                      mergeMutation.isPending ||
                      !mergeSourceId ||
                      !mergeTargetId ||
                      mergeSourceId === mergeTargetId
                    }
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {mergeMutation.isPending ? 'Merging...' : 'Merge Categories'}
                  </button>
                  <button
                    onClick={() => setShowMergeModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color || '#4F46E5' }}
                    />
                    <h3 className="font-semibold text-gray-900 truncate">{category.name}</h3>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory(category)
                        setShowEditModal(true)
                      }}
                      className="p-1 text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Delete category "${category.name}"? This will remove it from all articles.`
                          )
                        ) {
                          deleteMutation.mutate(category.id)
                        }
                      }}
                      className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {category.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {category.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {category.article_count || 0} article
                    {category.article_count !== 1 ? 's' : ''}
                  </span>
                  {category.article_count === 0 && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      Unused
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No categories yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Category
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
