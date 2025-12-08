import Link from 'next/link'
import { BookOpen, Search, TrendingUp, Layers, Sparkles, Network, Brain } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Brain className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            ContentCurator
          </h1>
        </div>
        <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
          Your Intelligent Knowledge Discovery Platform
        </p>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
          ContentCurator uses advanced AI to automatically collect, analyze, and connect information from multiple sources.
          Discover hidden patterns, semantic relationships, and emerging trends across articles, videos, and research papers.
          Transform fragmented information into actionable knowledge.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/articles"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Search className="h-5 w-5 mr-2" />
            Explore Articles
          </Link>
          <Link
            href="/articles"
            className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* What We Do Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-8 mb-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          What Does ContentCurator Do?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Search className="h-6 w-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">1. Collect</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Automatically ingests content from RSS feeds, YouTube channels, and research databases. No manual copying required.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">2. Analyze</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Uses AI (Ollama LLMs) to generate summaries, extract key points, and create 768-dimensional semantic embeddings.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Network className="h-6 w-6 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">3. Connect</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Discovers semantic relationships between articles using cosine similarity, building a knowledge graph of connections.
            </p>
          </div>
        </div>
        <p className="text-center text-gray-700 dark:text-gray-300 text-lg">
          <strong>Result:</strong> Search by meaning (not just keywords), explore relationship graphs, and uncover insights across your entire content library.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <FeatureCard
          icon={<Search className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          title="Semantic Search"
          description="Search by meaning, not keywords. Find conceptually similar content even with different wording."
        />
        <FeatureCard
          icon={<BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          title="AI Summaries"
          description="Instant summaries and key insights using local LLMs (Llama 3.2). Privacy-focused, no cloud APIs."
        />
        <FeatureCard
          icon={<Layers className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          title="Knowledge Graph"
          description="Interactive 3D visualizations showing article connections with force-directed, radial, and hierarchical layouts."
        />
        <FeatureCard
          icon={<TrendingUp className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          title="Pattern Discovery"
          description="Identify content clusters, hub articles, and emerging themes through visual graph analysis."
        />
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Powered By</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">Ollama</div>
            <div className="text-gray-600 dark:text-gray-300">Local LLMs: Llama 3.2 & nomic-embed-text</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">PostgreSQL</div>
            <div className="text-gray-600 dark:text-gray-300">Vector embeddings & relational data</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">D3.js</div>
            <div className="text-gray-600 dark:text-gray-300">Interactive graph visualizations</div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Content Discovery?</h2>
        <p className="text-lg mb-6 opacity-90">
          Start exploring articles, discover connections, and uncover insights hidden in your content.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/articles"
            className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Search className="h-5 w-5 mr-2" />
            Browse Articles
          </Link>
          <Link
            href="/graph"
            className="inline-flex items-center px-6 py-3 bg-indigo-700 text-white font-medium rounded-lg hover:bg-indigo-800 transition-colors border-2 border-white/20"
          >
            <Network className="h-5 w-5 mr-2" />
            Explore Graph
          </Link>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  )
}
