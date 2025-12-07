'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

interface Article {
  id: number
  title: string
}

interface Connection {
  source_article_id: number
  target_article_id: number
  similarity_score: number
}

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])

  // Fetch articles for graph
  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ['articles-all'],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/articles?page=1&page_size=100`)
      if (!response.ok) throw new Error('Failed to fetch articles')
      const data = await response.json()
      return data.items || []
    },
  })

  // Fetch connections for graph
  const { data: allConnections, isLoading: connectionsLoading } = useQuery({
    queryKey: ['connections-all'],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/embeddings/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
  })

  // Build graph data when articles load
  useEffect(() => {
    if (articles && articles.length > 0) {
      const graphNodes = articles.map((article: Article) => ({
        id: article.id,
        label: article.title.substring(0, 30) + (article.title.length > 30 ? '...' : ''),
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: 0,
        vy: 0,
      }))
      setNodes(graphNodes)
    }
  }, [articles])

  // Fetch and build edges when nodes are ready
  useEffect(() => {
    if (nodes.length === 0) return

    const fetchEdges = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const edgesList: any[] = []

      for (const node of nodes) {
        try {
          const response = await fetch(
            `${apiUrl}/api/embeddings/related/${node.id}?limit=10`
          )
          if (response.ok) {
            const relatedArticles = await response.json()
            relatedArticles.forEach((related: any) => {
              // Avoid duplicate edges
              const edgeKey = `${Math.min(node.id, related.id)}-${Math.max(node.id, related.id)}`
              if (
                !edgesList.find(
                  (e) =>
                    `${Math.min(e.source, e.target)}-${Math.max(e.source, e.target)}` ===
                    edgeKey
                )
              ) {
                edgesList.push({
                  source: node.id,
                  target: related.id,
                  weight: related.similarity_score,
                })
              }
            })
          }
        } catch (error) {
          console.error(`Failed to fetch related articles for ${node.id}`)
        }
      }

      setEdges(edgesList)
    }

    fetchEdges()
  }, [nodes])

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw edges
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    edges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.source)
      const target = nodes.find((n) => n.id === edge.target)
      if (source && target) {
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.stroke()
      }
    })

    // Draw nodes
    nodes.forEach((node) => {
      ctx.fillStyle = '#4f46e5'
      ctx.beginPath()
      ctx.arc(node.x, node.y, 8, 0, Math.PI * 2)
      ctx.fill()

      // Draw label
      ctx.fillStyle = '#1f2937'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y + 16)
    })
  }, [nodes, edges])

  const isLoading = articlesLoading || connectionsLoading

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Knowledge Graph
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Visualize connections between articles based on semantic similarity
        </p>

        {isLoading ? (
          <div className="flex justify-center items-center h-[600px]">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <canvas
              ref={canvasRef}
              width={1000}
              height={600}
              className="w-full rounded-lg"
            />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Articles
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {nodes.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Connections
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {edges.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Density
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {nodes.length > 0
                ? (
                    (edges.length / (nodes.length * (nodes.length - 1))) *
                    100
                  ).toFixed(1) + '%'
                : '0%'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
