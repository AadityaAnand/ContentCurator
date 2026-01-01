'use client'

import { useState, useRef, useEffect } from 'react'
import { chatApi } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, FileText, Network, BarChart3 } from 'lucide-react'

interface Message {
  id?: number
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    title: string
    url: string
    snippet: string
  }>
  created_at?: string
  isStreaming?: boolean
}

interface Conversation {
  id: number
  title: string
  updated_at: string
  message_count: number
}

type TabType = 'chat' | 'sources' | 'graph' | 'analytics'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Fetch conversations for sidebar
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations(20),
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleStreamingMessage = async (userMessage: string) => {
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: conversationId || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let assistantMessage: Message = {
        role: 'assistant',
        content: '',
        isStreaming: true,
        sources: []
      }

      setMessages(prev => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'conversation_id') {
                  setConversationId(data.id)
                } else if (data.type === 'sources') {
                  assistantMessage.sources = data.sources
                  setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }])
                } else if (data.type === 'chunk') {
                  assistantMessage.content += data.content
                  setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }])
                } else if (data.type === 'done') {
                  assistantMessage.id = data.message_id
                  assistantMessage.isStreaming = false
                  setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }])
                  queryClient.invalidateQueries({ queryKey: ['conversations'] })
                } else if (data.type === 'error') {
                  throw new Error(data.message)
                }
              } catch (e) {
                console.error('Error parsing SSE:', e)
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err)
      setError(err.message || 'Failed to get response. Please try again.')
      setMessages(prev => prev.slice(0, -2))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    await handleStreamingMessage(input.trim())
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }

  const loadConversation = async (id: number) => {
    try {
      const conv = await chatApi.getConversation(id)
      setConversationId(id)
      setMessages(conv.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        created_at: m.created_at
      })))
      setSidebarOpen(false)
    } catch (err) {
      console.error('Error loading conversation:', err)
    }
  }

  const currentConversation = conversations.find(c => c.id === conversationId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden flex flex-col shadow-2xl`}>
        <div className="p-4 border-b border-gray-700/50">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            ✨ New Conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wider px-3 py-2 font-semibold">
            Recent Chats
          </div>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                conversationId === conv.id
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="text-sm font-medium truncate">{conv.title}</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                <span>{conv.message_count} messages</span>
                <span>•</span>
                <span>{new Date(conv.updated_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border-b border-amber-700/30 px-6 py-4 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent tracking-tight">
                    Jnana
                  </h1>
                </div>
              </div>
              <button
                onClick={handleNewChat}
                className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-amber-400 to-amber-300 text-slate-900 rounded-xl hover:from-amber-300 hover:to-amber-200 transition-all shadow-lg hover:shadow-amber-400/50 transform hover:scale-105"
              >
                New Chat
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-2">
              {[
                { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare },
                { id: 'sources' as TabType, label: 'Sources', icon: FileText },
                { id: 'graph' as TabType, label: 'Graph', icon: Network },
                { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 }
              ].map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    disabled={!conversationId && tab.id !== 'chat'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-900 shadow-lg'
                        : 'text-amber-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 bg-gradient-to-br from-gray-50 to-blue-50">
          {activeTab === 'chat' ? (
            <div className="max-w-5xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-16 animate-fade-in">
                <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-xl">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                  What would you like to know?
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Ask me anything and I'll research the web to give you a comprehensive answer with verified sources
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                  {[
                    { q: 'What are the latest AI breakthroughs?', icon: '��' },
                    { q: 'Explain quantum computing', icon: '⚛️' },
                    { q: 'How does React Server Components work?', icon: '⚛️' },
                    { q: 'What is the current state of fusion energy?', icon: '⚡' }
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(example.q)}
                      className="group p-4 text-left bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all transform hover:scale-105"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{example.icon}</span>
                        <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors font-medium">
                          {example.q}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div>
                      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900">
                        <ReactMarkdown
                          components={{
                            a: ({ node, ...props }) => (
                              <a
                                {...props}
                                className="text-blue-600 hover:text-blue-800 underline font-medium"
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                        {message.isStreaming && (
                          <span className="inline-block w-2 h-5 bg-blue-600 animate-pulse ml-1 rounded"></span>
                        )}
                      </div>
                      {message.sources && message.sources.length > 0 && !message.isStreaming && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                            📚 {message.sources.length} Sources Used
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {message.sources.map((source, i) => (
                              <a
                                key={i}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-start gap-2 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                <span className="text-blue-600 font-semibold text-xs mt-0.5">[{i + 1}]</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-gray-900 group-hover:text-blue-600 truncate">
                                    {source.title}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">{source.url}</div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-3xl bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl px-6 py-4 shadow-md">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Researching web sources...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 text-red-700 text-sm shadow-md animate-fade-in">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>{error}</div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
            </div>
          ) : activeTab === 'sources' ? (
            <SourcesTab conversationId={conversationId} />
          ) : activeTab === 'graph' ? (
            <GraphTab conversationId={conversationId} />
          ) : (
            <AnalyticsTab conversationId={conversationId} />
          )}
        </div>

        {/* Input - Only show for chat tab */}
        {activeTab === 'chat' && (
        <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-sm px-6 py-6">
          <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 placeholder-gray-400 shadow-sm"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                {loading ? (
                  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            {conversationId && (
              <div className="mt-3 text-xs text-gray-500 text-center">
                💬 Conversation context is active - I remember our previous messages
              </div>
            )}
          </form>
        </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// Sources Tab Component
function SourcesTab({ conversationId }: { conversationId: number | null }) {
  const { data: sources, isLoading } = useQuery({
    queryKey: ['conversation-sources', conversationId],
    queryFn: () => conversationId ? chatApi.getChatSources(100, conversationId) : Promise.resolve([]),
    enabled: !!conversationId
  })

  if (!conversationId) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No conversation selected</h3>
        <p className="text-gray-500">Start a chat to see sources used in this conversation</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading sources...</p>
      </div>
    )
  }

  const conversationSources = sources || []

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sources Used in This Conversation</h2>
        <p className="text-gray-600">{conversationSources.length} sources found</p>
      </div>

      {conversationSources.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No sources yet</h3>
          <p className="text-gray-500">Sources will appear here as you ask questions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {conversationSources.map((source: any, i: number) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-2">{source.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{source.snippet}</p>
              <div className="text-xs text-blue-600 truncate">{source.url}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// Graph Tab Component
function GraphTab({ conversationId }: { conversationId: number | null }) {
  if (!conversationId) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <Network className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No conversation selected</h3>
        <p className="text-gray-500">Start a chat to see the conversation flow graph</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Conversation Flow</h2>
        <p className="text-gray-600">Visualize the flow of this conversation</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <Network className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Graph Visualization Coming Soon</h3>
        <p className="text-gray-500">Interactive conversation flow graph will be displayed here</p>
      </div>
    </div>
  )
}

// Analytics Tab Component
function AnalyticsTab({ conversationId }: { conversationId: number | null }) {
  const { data: stats } = useQuery({
    queryKey: ['conversation-stats', conversationId],
    queryFn: () => conversationId ? chatApi.getChatStats(conversationId) : chatApi.getChatStats(),
    enabled: !!conversationId
  })

  if (!conversationId) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No conversation selected</h3>
        <p className="text-gray-500">Start a chat to see analytics for this conversation</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Conversation Analytics</h2>
        <p className="text-gray-600">Statistics for this conversation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {stats?.total_messages || 0}
          </div>
          <div className="text-sm text-gray-600">Total Messages</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {stats?.total_unique_sources || 0}
          </div>
          <div className="text-sm text-gray-600">Unique Sources</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-3xl font-bold text-amber-600 mb-2">
            {stats?.total_conversations || 0}
          </div>
          <div className="text-sm text-gray-600">Total Conversations</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Detailed Analytics Coming Soon</h3>
        <p className="text-gray-500">Charts and insights for this conversation will be displayed here</p>
      </div>
    </div>
  )
}
