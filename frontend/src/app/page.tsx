import Link from 'next/link'
import { BookOpen, Search, TrendingUp, Layers } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl md:text-6xl mb-4">
          Multi-Modal Content Curator
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
          Discover patterns, connections, and trends across fragmented information sources.
          Your intelligent research assistant powered by AI.
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

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <FeatureCard
          icon={<Search className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          title="Smart Aggregation"
          description="Automatically collect articles, videos, and research papers from multiple sources"
        />
        <FeatureCard
          icon={<BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          title="AI Summaries"
          description="Get concise summaries and key points using advanced NLP models"
        />
        <FeatureCard
          icon={<Layers className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          title="Knowledge Graph"
          description="Visualize connections between topics and discover hidden relationships"
        />
        <FeatureCard
          icon={<TrendingUp className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          title="Trend Detection"
          description="Identify emerging trends and predict what's becoming important"
        />
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">AI-Powered</div>
            <div className="text-gray-600 dark:text-gray-300">Summarization & Analysis</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">Multi-Source</div>
            <div className="text-gray-600 dark:text-gray-300">RSS, YouTube, Research Papers</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">Semantic</div>
            <div className="text-gray-600 dark:text-gray-300">Search & Connections</div>
          </div>
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
