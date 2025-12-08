'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import * as d3 from 'd3'

interface Article {
  id: number
  title: string
}

interface Connection {
  source_article_id: number
  target_article_id: number
  similarity_score: number
}

interface GraphNode {
  id: number
  title: string
}

interface GraphLink {
  source: number
  target: number
  strength: number
}

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<number | null>(null)

  // Fetch articles
  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ['articles-all'],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
      const response = await fetch(`${apiUrl}/api/articles?page=1&page_size=100`)
      if (!response.ok) throw new Error('Failed to fetch articles')
      const data = await response.json()
      return data.items || []
    },
  })

  // Fetch connections using the related endpoint
  const { data: graphData, isLoading: connectionsLoading } = useQuery({
    queryKey: ['graph-connections', articles?.length],
    queryFn: async () => {
      if (!articles || articles.length === 0) return { nodes: [], links: [] }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
      const links: Set<string> = new Set()
      const connections: GraphLink[] = []

      // Fetch related articles for each article
      for (const article of articles) {
        try {
          const response = await fetch(`${apiUrl}/api/embeddings/related/${article.id}?limit=3`)
          if (response.ok) {
            const related = await response.json()
            related.forEach((rel: any) => {
              const key = [Math.min(article.id, rel.id), Math.max(article.id, rel.id)].join('-')
              if (!links.has(key)) {
                links.add(key)
                connections.push({
                  source: article.id,
                  target: rel.id,
                  strength: rel.similarity_score || 0.5,
                })
              }
            })
          }
        } catch (err) {
          console.error(`Failed to fetch relations for article ${article.id}:`, err)
        }
      }

      const nodes: GraphNode[] = articles.map((a: Article) => ({
        id: a.id,
        title: a.title,
      }))

      return { nodes, links: connections }
    },
    enabled: !!articles && articles.length > 0,
  })

  // Initialize D3 graph
  useEffect(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0 || !svgRef.current) {
      return
    }

    const width = containerRef.current?.clientWidth || 800
    const height = containerRef.current?.clientHeight || 600

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    // Add zoom behavior
    const g = svg.append('g')

    const zoomHandler = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event: any) => {
      g.attr('transform', event.transform)
    })

    svg.call(zoomHandler)

    // Create force simulation
    const simulation = d3
      .forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(graphData.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50))

    // Create links
    const links = g
      .append('g')
      .selectAll('line')
      .data(graphData.links as any)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', (d: any) => 0.3 + d.strength * 0.4)
      .attr('stroke-width', (d: any) => 1 + d.strength * 2)

    // Create nodes
    const nodes = g
      .append('g')
      .selectAll<SVGCircleElement, any>('circle')
      .data(graphData.nodes as any)
      .join('circle')
      .attr('r', 8)
      .attr('fill', (d: any) => (d.id === selectedNode ? '#4f46e5' : '#06b6d4'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation()
        setSelectedNode(d.id)
        window.location.href = `/articles/${d.id}`
      })
      .call(
        (d3.drag() as any)
          .on('start', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event: any, d: any) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Add labels
    const labels = g
      .append('g')
      .selectAll('text')
      .data(graphData.nodes as any)
      .join('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#1f2937')
      .attr('pointer-events', 'none')
      .text((d: any) => d.title.substring(0, 15) + (d.title.length > 15 ? '...' : ''))

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      nodes.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)

      labels.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [graphData, selectedNode])

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z * 1.2, 5))
  }

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z / 1.2, 0.5))
  }

  const handleReset = () => {
    setZoom(1)
    setSelectedNode(null)
    if (svgRef.current) {
      d3.select(svgRef.current).transition().duration(750).call(
        d3
          .zoom<SVGSVGElement, unknown>()
          .transform as any,
        d3.zoomIdentity.translate(50, 50)
      )
    }
  }

  const isLoading = articlesLoading || connectionsLoading

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Knowledge Graph</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Interactive visualization of article relationships and semantic connections
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {graphData && (
              <>
                <span>Articles: {graphData.nodes?.length || 0}</span>
                <span className="mx-3">•</span>
                <span>Connections: {graphData.links?.length || 0}</span>
                <span className="mx-3">•</span>
                <span>
                  Density:{' '}
                  {graphData.nodes && graphData.nodes.length > 0
                    ? (
                        ((graphData.links?.length || 0) * 2) /
                        (graphData.nodes.length * (graphData.nodes.length - 1))
                      )
                        .toFixed(3)
                        .substring(0, 4)
                    : '0'}
                </span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Reset view"
            >
              <RotateCcw className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-gray-700 dark:text-gray-300">Loading graph data...</p>
            </div>
          </div>
        )}

        <svg ref={svgRef} className="w-full h-full" style={{ touchAction: 'manipulation' }} />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span>Article node (clickable)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600" />
              <span>Selected article</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-400" />
              <span>Relationship (thickness = strength)</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
            Drag nodes to move • Scroll to zoom • Click article to view details
          </p>
        </div>
      </div>
    </div>
  )
}
