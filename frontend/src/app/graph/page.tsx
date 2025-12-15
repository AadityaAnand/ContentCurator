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

const graphModeInfo = {
  force: {
    title: 'Force-Directed Layout',
    description: 'Physics-based simulation where articles naturally cluster based on their semantic relationships.',
    insights: [
      'Clusters reveal groups of topically related articles',
      'Central nodes often represent "hub" articles connecting multiple topics',
      'Distance between nodes indicates semantic similarity',
      'Isolated nodes suggest unique or outlier content'
    ]
  },
  radial: {
    title: 'Radial Layout',
    description: 'Circular arrangement providing a balanced view of all articles and their interconnections.',
    insights: [
      'Equal visibility for all articles regardless of connection count',
      'Connection patterns across the circle show cross-topic relationships',
      'Density of connections indicates content cohesion',
      'Gaps suggest opportunities for content expansion'
    ]
  },
  hierarchical: {
    title: 'Hierarchical Layout',
    description: 'Organized by connection count, placing highly connected "hub" articles at the top.',
    insights: [
      'Top rows show your most interconnected content',
      'Reveals content authority and influence within your library',
      'Bottom rows indicate specialized or niche articles',
      'Vertical structure shows information architecture'
    ]
  }
}

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'force' | 'radial' | 'hierarchical'>('force')
  const [showInfo, setShowInfo] = useState(true)



  // Fetch graph data using optimized endpoint
  const { data: graphData, isLoading: connectionsLoading, error: graphError } = useQuery({
    queryKey: ['graph-data'],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
      const response = await fetch(`${apiUrl}/api/embeddings/graph?min_similarity=0.5&limit=100`)
      if (!response.ok) throw new Error('Failed to fetch graph data')
      const data = await response.json()
      
      return {
        nodes: data.nodes.map((n: any) => ({ id: n.id, title: n.title })),
        links: data.edges.map((e: any) => ({ source: e.source, target: e.target, strength: e.similarity }))
      }
    },
    retry: 2,
  })

  // Initialize D3 graph
  useEffect(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0 || !svgRef.current || !containerRef.current) {
      return
    }

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    // Add zoom behavior
    const g = svg.append('g')

    const zoomHandler = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoomHandler)

    // Create simulation based on view mode
    let simulation: any

    if (viewMode === 'force') {
      simulation = d3
        .forceSimulation(graphData.nodes as any)
        .force('link', d3.forceLink(graphData.links).id((d: any) => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(60))
    } else if (viewMode === 'radial') {
      // Radial layout - strongest connections in center
      const centerNode = graphData.nodes[0]
      const radius = Math.min(width, height) / 3
      
      graphData.nodes.forEach((node: any, i: number) => {
        const angle = (i / graphData.nodes.length) * 2 * Math.PI
        node.fx = width / 2 + radius * Math.cos(angle)
        node.fy = height / 2 + radius * Math.sin(angle)
      })
    } else if (viewMode === 'hierarchical') {
      // Hierarchical layout - organize by connection strength
      const nodeConnections = new Map<number, number>()
      graphData.links.forEach((link: any) => {
        nodeConnections.set(link.source, (nodeConnections.get(link.source) || 0) + 1)
        nodeConnections.set(link.target, (nodeConnections.get(link.target) || 0) + 1)
      })

      const sortedNodes = [...graphData.nodes].sort((a: any, b: any) => 
        (nodeConnections.get(b.id) || 0) - (nodeConnections.get(a.id) || 0)
      )

      sortedNodes.forEach((node: any, i: number) => {
        const level = Math.floor(i / 3)
        const posInLevel = i % 3
        node.fx = width / 4 + (posInLevel * width / 3)
        node.fy = 100 + level * 120
      })
    }

    // Create links with gradient for connection strength
    const defs = svg.append('defs')
    const gradient = defs.append('linearGradient')
      .attr('id', 'link-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#06b6d4')
      .attr('stop-opacity', 0.3)

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#6366f1')
      .attr('stop-opacity', 0.8)

    const links = g
      .append('g')
      .selectAll('line')
      .data(graphData.links as any)
      .join('line')
      .attr('stroke', (d: any) => d.strength > 0.7 ? '#6366f1' : d.strength > 0.5 ? '#8b5cf6' : '#94a3b8')
      .attr('stroke-opacity', (d: any) => 0.3 + d.strength * 0.5)
      .attr('stroke-width', (d: any) => 1 + d.strength * 3)
      .attr('stroke-dasharray', (d: any) => d.strength < 0.5 ? '5,5' : '0')

    // Create node groups
    const nodeGroups = g
      .append('g')
      .selectAll('g')
      .data(graphData.nodes as any)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation()
        setSelectedNode(d.id)
        window.location.href = `/articles/${d.id}`
      })

    // Add node circles with size based on connections
    nodeGroups
      .append('circle')
      .attr('r', (d: any) => {
        const connections = graphData.links.filter((l: any) => 
          l.source === d.id || l.target === d.id
        ).length
        return 10 + connections * 2
      })
      .attr('fill', (d: any) => {
        if (d.id === selectedNode) return '#4f46e5'
        const connections = graphData.links.filter((l: any) => 
          l.source === d.id || l.target === d.id
        ).length
        return connections > 2 ? '#f59e0b' : connections > 1 ? '#06b6d4' : '#10b981'
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    // Add labels
    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 25)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#1f2937')
      .attr('pointer-events', 'none')
      .text((d: any) => d.title.substring(0, 20) + (d.title.length > 20 ? '...' : ''))

    // Add connection count badges
    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const connections = graphData.links.filter((l: any) => 
          l.source === d.id || l.target === d.id
        ).length
        return connections
      })

    // Add drag behavior for force layout
    if (viewMode === 'force' && simulation) {
      nodeGroups.call(
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

      // Update positions on simulation tick
      simulation.on('tick', () => {
        links
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y)

        nodeGroups.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      })
    } else {
      // Static positioning for radial and hierarchical
      links
        .attr('x1', (d: any) => d.source.fx)
        .attr('y1', (d: any) => d.source.fy)
        .attr('x2', (d: any) => d.target.fx)
        .attr('y2', (d: any) => d.target.fy)

      nodeGroups.attr('transform', (d: any) => `translate(${d.fx},${d.fy})`)
    }

    // Cleanup
    return () => {
      if (simulation) simulation.stop()
    }
  }, [graphData, selectedNode, viewMode])

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

  const isLoading = connectionsLoading

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Graph</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Interactive visualization of article relationships
            </p>
          </div>
          {graphData && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">{graphData.nodes?.length || 0}</span> articles •{' '}
              <span className="font-semibold">{graphData.links?.length || 0}</span> connections
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="sticky top-[120px] z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-3 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('force')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'force'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Force-Directed
            </button>
            <button
              onClick={() => setViewMode('radial')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'radial'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Radial
            </button>
            <button
              onClick={() => setViewMode('hierarchical')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'hierarchical'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Hierarchical
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Reset view"
            >
              <RotateCcw className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="flex-1 relative w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 min-h-[400px] sm:min-h-[600px]"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-gray-700 dark:text-gray-300">Loading graph data...</p>
            </div>
          </div>
        )}

        {graphError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <p className="text-red-600 dark:text-red-400 font-semibold">Failed to load graph</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Make sure you have articles with embeddings. Visit the Ingest page to add content.
              </p>
              <a href="/ingest" className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                Go to Ingest
              </a>
            </div>
          </div>
        )}

        {!isLoading && !graphError && graphData && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <p className="text-gray-700 dark:text-gray-300 font-semibold">No graph data available</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                You need articles with embeddings to see the knowledge graph. Start by ingesting content.
              </p>
              <a href="/ingest" className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                Add Content
              </a>
            </div>
          </div>
        )}

        <svg ref={svgRef} className="w-full h-full" style={{ touchAction: 'manipulation' }} />

        {/* Info Panel */}
        {showInfo && (
          <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg p-4 sm:p-5 max-w-sm sm:max-w-md border border-gray-200 dark:border-gray-700 text-sm sm:text-base">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  {graphModeInfo[viewMode].title}
                </h3>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {graphModeInfo[viewMode].description}
            </p>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 mb-3">
              <h4 className="font-semibold text-sm text-indigo-900 dark:text-indigo-300 mb-2">
                💡 What You Can Learn:
              </h4>
              <ul className="space-y-1.5">
                {graphModeInfo[viewMode].insights.map((insight, i) => (
                  <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start">
                    <span className="text-indigo-600 dark:text-indigo-400 mr-2 mt-0.5">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Hide this panel
            </button>
          </div>
        )}

        {!showInfo && (
          <button
            onClick={() => setShowInfo(true)}
            className="absolute top-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
          >
            ℹ️ Show Info
          </button>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-3 sm:p-4 max-w-xs text-xs sm:text-sm border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500" />
              <span>Hub (3+ connections)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-cyan-500" />
              <span>Connected (2 connections)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Isolated (1 connection)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600" />
              <span>Selected article</span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-0.5 bg-indigo-600" style={{ opacity: 0.8 }} />
                <span>Strong (0.7+)</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-0.5 bg-purple-600" style={{ opacity: 0.6 }} />
                <span>Medium (0.5-0.7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-slate-400 border-dashed border-t" />
                <span>Weak (&lt;0.5)</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-500 italic">
            {viewMode === 'force' && 'Drag nodes • Scroll to zoom • Click to view'}
            {viewMode === 'radial' && 'Circular layout • Scroll to zoom • Click to view'}
            {viewMode === 'hierarchical' && 'Organized by connections • Click to view'}
          </p>
        </div>
      </div>
    </div>
  )
}
