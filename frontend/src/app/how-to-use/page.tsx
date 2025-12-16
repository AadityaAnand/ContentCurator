'use client';

import { BookOpen, Search, Plus, Sparkles, Database, Network, TrendingUp, ArrowRight, CheckCircle2, Info } from 'lucide-react';

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                How to Use Jnana
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                Your complete guide to building and exploring your AI-powered knowledge library
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
            <Info className="h-6 w-6" />
            Quick Start Guide
          </h2>
          <div className="space-y-3 text-indigo-800 dark:text-indigo-200">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
              <p><strong>Ingest Content:</strong> Add articles by searching for topics on the Ingest page</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
              <p><strong>Generate Embeddings:</strong> Click "Generate Embeddings" to create AI vectors</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
              <p><strong>Compute Connections:</strong> Click "Compute Connections" to find relationships</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
              <p><strong>Explore:</strong> Browse articles, visualize the knowledge graph, and discover insights</p>
            </div>
          </div>
        </div>

        {/* Detailed Steps */}
        <div className="space-y-8">
          {/* Step 1: Ingest Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Plus className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Step 1: Ingest Content
              </h2>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Start building your knowledge library by adding articles from the web.
            </p>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How it works:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Navigate to the <strong>Ingest</strong> page</li>
                <li>Enter a topic or keyword (e.g., "machine learning", "climate change")</li>
                <li>Choose how many articles to fetch (1-10)</li>
                <li>Optionally customize the source label</li>
                <li>Click <strong>"Ingest Articles"</strong></li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <Info className="h-5 w-5" />
                What happens behind the scenes:
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>• Tavily API searches the web for your topic</li>
                <li>• Content is downloaded and cleaned from each URL</li>
                <li>• Ollama AI (running locally) generates summaries and key points</li>
                <li>• Articles are auto-categorized and stored in the database</li>
                <li>• Everything happens on your machine - no cloud processing!</li>
              </ul>
            </div>
          </div>

          {/* Step 2: Generate Embeddings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Step 2: Generate Embeddings
              </h2>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Transform your articles into mathematical vectors that capture their meaning.
            </p>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How to do it:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>After ingesting articles, scroll down to the <strong>"Next Steps"</strong> section</li>
                <li>Click the <strong>"Generate Embeddings"</strong> button</li>
                <li>The process runs in the background (takes 1-2 minutes for 10 articles)</li>
                <li>You can continue browsing while embeddings are generated</li>
              </ol>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Why embeddings matter:</h3>
              <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                <li>• Converts text into 768-dimensional vectors using Ollama's nomic-embed-text model</li>
                <li>• Enables semantic search - find articles by meaning, not just keywords</li>
                <li>• Required for computing article relationships</li>
                <li>• Powers the knowledge graph visualization</li>
              </ul>
            </div>
          </div>

          {/* Step 3: Compute Connections */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Database className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Step 3: Compute Connections
              </h2>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Discover relationships between articles by analyzing their semantic similarity.
            </p>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How to do it:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>After embeddings are generated, find the <strong>"Compute Connections"</strong> button</li>
                <li>Click it to start the connection computation</li>
                <li>The system compares all article pairs (runs in background)</li>
                <li>Connections are created for articles with ≥70% similarity</li>
              </ol>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">What you get:</h3>
              <ul className="space-y-2 text-sm text-orange-800 dark:text-orange-200">
                <li>• Network of related articles based on semantic similarity</li>
                <li>• Each connection has a similarity score (0.0 to 1.0)</li>
                <li>• Powers the "Related Articles" feature on article detail pages</li>
                <li>• Creates the visual knowledge graph</li>
              </ul>
            </div>
          </div>

          {/* Step 4: Explore */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Search className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Step 4: Explore Your Knowledge
              </h2>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Now you can explore your knowledge library in multiple ways:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Search className="h-5 w-5 text-indigo-600" />
                  Articles Page
                </h3>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>• Browse all articles</li>
                  <li>• Filter by category</li>
                  <li>• Search by title or keywords</li>
                  <li>• View summaries and key points</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Network className="h-5 w-5 text-purple-600" />
                  Knowledge Graph
                </h3>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>• Visualize article relationships</li>
                  <li>• Interactive force-directed graph</li>
                  <li>• Discover knowledge clusters</li>
                  <li>• Click nodes to view details</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  Trends & Analytics
                </h3>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>• Top sources and categories</li>
                  <li>• Articles over time</li>
                  <li>• Content distribution charts</li>
                  <li>• Recent additions</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  Semantic Search
                </h3>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>• Search by meaning</li>
                  <li>• Find conceptually similar content</li>
                  <li>• Goes beyond keyword matching</li>
                  <li>• Powered by AI embeddings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Tips & Best Practices */}
        <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            Tips & Best Practices
          </h2>
          <div className="space-y-3 text-amber-800 dark:text-amber-200">
            <p>• <strong>Start small:</strong> Ingest 3-5 articles initially to test the workflow</p>
            <p>• <strong>Be specific:</strong> Use focused topic queries for better results (e.g., "neural networks" vs "AI")</p>
            <p>• <strong>Wait for processing:</strong> Embeddings and connections take time - be patient!</p>
            <p>• <strong>Explore connections:</strong> The knowledge graph reveals surprising relationships</p>
            <p>• <strong>Regular updates:</strong> After adding new articles, regenerate embeddings and connections</p>
            <p>• <strong>Privacy first:</strong> All AI processing happens locally with Ollama - your data never leaves your machine</p>
          </div>
        </div>

        {/* Technical Requirements */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Technical Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-semibold mb-2">Required Services:</h3>
              <ul className="space-y-1">
                <li>• Ollama (with llama3.2 and nomic-embed-text models)</li>
                <li>• PostgreSQL database</li>
                <li>• Tavily API key (for web search)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Recommended:</h3>
              <ul className="space-y-1">
                <li>• At least 8GB RAM</li>
                <li>• Modern web browser</li>
                <li>• Stable internet connection</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <a
            href="/ingest"
            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
