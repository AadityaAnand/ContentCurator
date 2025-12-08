import Link from 'next/link'
import { BookOpen, Search, TrendingUp, Layers, Sparkles, Network, Lightbulb } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black sm:text-6xl md:text-7xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent mb-4">
          Jnana
        </h1>
        <p className="text-lg text-amber-400 font-semibold mb-4">
          <em>Knowledge, Wisdom & Enlightenment</em>
        </p>
        <p className="text-2xl font-semibold text-amber-300 mb-4">
          The Cosmic Library of Wisdom
        </p>
        <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
          Jnana harnesses the power of ancient wisdom and cutting-edge AI to illuminate the hidden connections within knowledge. Like the celestial guardians of sacred texts, we gather, analyze, and weave information into cosmic patterns. Discover the threads that bind all understanding together.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/articles"
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-bold rounded-lg text-slate-900 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 shadow-lg hover:shadow-amber-400/50 transition-all"
          >
            <Search className="h-5 w-5 mr-2" />
            Explore Knowledge
          </Link>
          <Link
            href="/articles"
            className="inline-flex items-center px-8 py-3 border-2 border-amber-400 text-base font-bold rounded-lg text-amber-300 bg-transparent hover:bg-amber-400/10 transition-colors"
          >
            Begin Journey
          </Link>
        </div>
      </div>

      {/* What We Do Section */}
      <div className="bg-gradient-to-r from-amber-900/20 to-purple-900/20 border border-amber-700/30 rounded-xl p-8 mb-16 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-amber-300 mb-6 text-center">
          The Path of Jnana
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-800/50 border border-amber-700/20 rounded-lg p-6 backdrop-blur-sm hover:border-amber-400/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <Search className="h-6 w-6 text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-300">1. Gather</h3>
            </div>
            <p className="text-gray-300">
              Like celestial sentries, we harvest knowledge from RSS feeds, YouTube, research archives. Your digital library grows without effort.
            </p>
          </div>
          <div className="bg-slate-800/50 border border-amber-700/20 rounded-lg p-6 backdrop-blur-sm hover:border-amber-400/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-6 w-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-purple-300">2. Illuminate</h3>
            </div>
            <p className="text-gray-300">
              Ancient wisdom meets modern AI—Ollama LLMs generate summaries, distill essence, and craft 768-dimensional thought-maps.
            </p>
          </div>
          <div className="bg-slate-800/50 border border-amber-700/20 rounded-lg p-6 backdrop-blur-sm hover:border-amber-400/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <Network className="h-6 w-6 text-orange-400" />
              <h3 className="text-lg font-semibold text-orange-300">3. Weave</h3>
            </div>
            <p className="text-gray-300">
              Cosmic threads bind knowledge together—semantic connections form a living mandala of understanding within your library.
            </p>
          </div>
        </div>
        <p className="text-center text-amber-200 text-lg font-semibold">
          <strong>The Result:</strong> Transcend keyword searching, visualize knowledge networks, discover universal patterns across all understanding.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <FeatureCard
          icon={<Search className="h-8 w-8 text-amber-400" />}
          title="Semantic Search"
          description="Search by meaning, not keywords. Transcend language barriers."
        />
        <FeatureCard
          icon={<BookOpen className="h-8 w-8 text-purple-400" />}
          title="AI Wisdom"
          description="Summaries by Ollama LLMs. Privacy-first, local processing."
        />
        <FeatureCard
          icon={<Layers className="h-8 w-8 text-orange-400" />}
          title="Cosmic Graph"
          description="Force-directed, radial, hierarchical knowledge networks."
        />
        <FeatureCard
          icon={<TrendingUp className="h-8 w-8 text-amber-300" />}
          title="Sacred Patterns"
          description="Discover knowledge clusters and hidden relationships."
        />
      </div>

      {/* Stats Section */}
      <div className="bg-slate-800/50 border border-amber-700/30 rounded-lg backdrop-blur-sm p-8 mb-16">
        <h2 className="text-2xl font-bold text-amber-300 mb-6 text-center">Crafted With Sacred Technology</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-orange-400 mb-2">Ollama</div>
            <div className="text-gray-300">Local LLMs: Wisdom without cloud</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-amber-400 mb-2">PostgreSQL</div>
            <div className="text-gray-300">Cosmic storage of embeddings</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-400 mb-2">D3.js</div>
            <div className="text-gray-300">Cosmic visualization networks</div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-2 border-amber-400/50 rounded-xl p-8 text-center backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-amber-300 mb-4">Begin Your Journey of Discovery</h2>
        <p className="text-lg mb-6 text-gray-300">
          Explore the cosmic library, discover sacred connections, uncover universal truths within knowledge.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/articles"
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 font-bold rounded-lg hover:from-amber-300 hover:to-orange-300 shadow-lg hover:shadow-amber-400/50 transition-all"
          >
            <Search className="h-5 w-5 mr-2" />
            Explore Articles
          </Link>
          <Link
            href="/graph"
            className="inline-flex items-center px-8 py-3 border-2 border-amber-400 text-amber-300 font-bold rounded-lg hover:bg-amber-400/10 transition-colors"
          >
            <Network className="h-5 w-5 mr-2" />
            Knowledge Graph
          </Link>
        </div>
      </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-800/50 border border-amber-700/20 rounded-lg p-6 backdrop-blur-sm hover:border-amber-400/50 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-amber-300 mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  )
}
