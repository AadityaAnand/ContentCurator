'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ingestionApi, jobsApi } from '@/lib/api';
import { Loader2, Plus, Search, AlertCircle, CheckCircle2, Sparkles, Database, Clock, Rss, Youtube } from 'lucide-react';
import type { JobStatusResponse, IngestionResponse } from '@/types';

type IngestionTab = 'topic' | 'rss' | 'youtube';

export default function IngestPage() {
  const [activeTab, setActiveTab] = useState<IngestionTab>('topic');

  // Topic state
  const [topicQuery, setTopicQuery] = useState('');
  const [topicMaxResults, setTopicMaxResults] = useState(3);
  const [topicSourceName, setTopicSourceName] = useState('Web Search');

  // RSS state
  const [rssUrl, setRssUrl] = useState('');
  const [rssMaxArticles, setRssMaxArticles] = useState(10);
  const [rssSourceName, setRssSourceName] = useState('');

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeSourceName, setYoutubeSourceName] = useState('YouTube');

  const [currentJob, setCurrentJob] = useState<JobStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const queryClient = useQueryClient();

  // Poll job status
  const pollJobStatus = async (jobId: number) => {
    try {
      const status = await jobsApi.getJobStatus(jobId);
      setCurrentJob(status);

      // If job is complete or failed, stop polling
      if (status.status === 'completed' || status.status === 'failed') {
        setIsPolling(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (status.status === 'completed') {
          queryClient.invalidateQueries({ queryKey: ['articles'] });
        }
      }
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  };

  // Start polling when job is created
  const startPolling = (jobId: number) => {
    setIsPolling(true);
    // Poll immediately
    pollJobStatus(jobId);
    // Then poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollJobStatus(jobId);
    }, 2000);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const topicMutation = useMutation({
    mutationFn: (payload: { query: string; max_results: number; source_name: string }) =>
      ingestionApi.ingestTopicAsync(payload.query, payload.max_results, payload.source_name),
    onSuccess: (data) => {
      startPolling(data.id);
      setTopicQuery('');
    },
  });

  const rssMutation = useMutation({
    mutationFn: (payload: { url: string; max_articles: number; source_name?: string }) =>
      ingestionApi.ingestRSS(payload.url, payload.source_name, payload.max_articles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setRssUrl('');
      setRssSourceName('');
    },
  });

  const youtubeMutation = useMutation({
    mutationFn: (payload: { url: string; source_name: string }) =>
      ingestionApi.ingestYouTube(payload.url, payload.source_name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setYoutubeUrl('');
    },
  });

  const embeddingsMutation = useMutation({
    mutationFn: () => ingestionApi.triggerEmbeddings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  const connectionsMutation = useMutation({
    mutationFn: (threshold: number) => ingestionApi.triggerConnections(threshold),
  });

  const handleTopicIngest = (e: React.FormEvent) => {
    e.preventDefault();
    if (topicQuery.trim()) {
      topicMutation.mutate({
        query: topicQuery,
        max_results: topicMaxResults,
        source_name: topicSourceName,
      });
    }
  };

  const handleRSSIngest = (e: React.FormEvent) => {
    e.preventDefault();
    if (rssUrl.trim()) {
      rssMutation.mutate({
        url: rssUrl,
        max_articles: rssMaxArticles,
        source_name: rssSourceName || undefined,
      });
    }
  };

  const handleYouTubeIngest = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl.trim()) {
      youtubeMutation.mutate({
        url: youtubeUrl,
        source_name: youtubeSourceName,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Plus className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Ingest New Content
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Discover and add new articles from the web to your knowledge library
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('topic')}
              className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'topic'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Search className="h-4 w-4" />
              Topic Search
            </button>
            <button
              onClick={() => setActiveTab('rss')}
              className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'rss'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Rss className="h-4 w-4" />
              RSS Feed
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'youtube'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Youtube className="h-4 w-4" />
              YouTube
            </button>
          </div>
        </div>

        {/* Ingestion Forms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Topic Search Form */}
          {activeTab === 'topic' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Search Web for Topic
              </h2>

          <form onSubmit={handleTopicIngest} className="space-y-4">
            <div>
              <label htmlFor="topic-query" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Topic or Keywords
              </label>
              <input
                id="topic-query"
                type="text"
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
                placeholder="e.g., 'artificial intelligence in healthcare'"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                disabled={topicMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="max-results" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Articles: {topicMaxResults}
                </label>
                <input
                  id="max-results"
                  type="range"
                  min="1"
                  max="10"
                  value={topicMaxResults}
                  onChange={(e) => setTopicMaxResults(Number(e.target.value))}
                  className="w-full"
                  disabled={topicMutation.isPending}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>

              <div>
                <label htmlFor="source-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source Label
                </label>
                <input
                  id="source-name"
                  type="text"
                  value={topicSourceName}
                  onChange={(e) => setTopicSourceName(e.target.value)}
                  placeholder="e.g., 'Web Search'"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={topicMutation.isPending}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!topicQuery.trim() || topicMutation.isPending || isPolling}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {topicMutation.isPending || isPolling ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {isPolling ? 'Processing...' : 'Starting...'}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Ingest Articles
                </>
              )}
            </button>
          </form>

          {/* Job Progress */}
          {currentJob && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                {currentJob.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : currentJob.status === 'failed' ? (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    {currentJob.status === 'completed' && '✓ Ingestion Complete!'}
                    {currentJob.status === 'failed' && '✗ Ingestion Failed'}
                    {currentJob.status === 'running' && 'Processing Articles...'}
                    {currentJob.status === 'pending' && 'Queued for Processing...'}
                  </h3>

                  {/* Progress Bar */}
                  {currentJob.status === 'running' && (
                    <div className="mb-3">
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${currentJob.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        {currentJob.processed_items} of {currentJob.total_items} articles processed
                      </p>
                    </div>
                  )}

                  {/* Results */}
                  {currentJob.status === 'completed' && currentJob.result && (
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <p>✓ {currentJob.result.articles_created} new articles added</p>
                      <p>✓ {currentJob.result.articles_processed} articles processed</p>
                      {currentJob.result.articles_updated > 0 && (
                        <p>✓ {currentJob.result.articles_updated} articles updated</p>
                      )}
                    </div>
                  )}

                  {currentJob.status === 'failed' && currentJob.error_message && (
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {currentJob.error_message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {topicMutation.isError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Ingestion failed
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {topicMutation.error instanceof Error ? topicMutation.error.message : 'Unknown error'}
                  </p>
                </div>
              </div>
            </div>
          )}
            </>
          )}

          {/* RSS Feed Form */}
          {activeTab === 'rss' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Rss className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                Ingest RSS Feed
              </h2>

              <form onSubmit={handleRSSIngest} className="space-y-4">
                <div>
                  <label htmlFor="rss-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    RSS Feed URL
                  </label>
                  <input
                    id="rss-url"
                    type="url"
                    value={rssUrl}
                    onChange={(e) => setRssUrl(e.target.value)}
                    placeholder="e.g., 'https://example.com/rss'"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    disabled={rssMutation.isPending}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="rss-max-articles" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Articles: {rssMaxArticles}
                    </label>
                    <input
                      id="rss-max-articles"
                      type="range"
                      min="1"
                      max="100"
                      value={rssMaxArticles}
                      onChange={(e) => setRssMaxArticles(Number(e.target.value))}
                      className="w-full"
                      disabled={rssMutation.isPending}
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="rss-source-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Source Label (Optional)
                    </label>
                    <input
                      id="rss-source-name"
                      type="text"
                      value={rssSourceName}
                      onChange={(e) => setRssSourceName(e.target.value)}
                      placeholder="e.g., 'Tech News'"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      disabled={rssMutation.isPending}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!rssUrl.trim() || rssMutation.isPending}
                  className="w-full px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {rssMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Ingest RSS Feed
                    </>
                  )}
                </button>
              </form>

              {rssMutation.isSuccess && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                        RSS Feed Ingested Successfully
                      </h3>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Articles have been processed and added to your library.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {rssMutation.isError && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                        RSS Ingestion Failed
                      </h3>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        {rssMutation.error instanceof Error ? rssMutation.error.message : 'Unknown error'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* YouTube Form */}
          {activeTab === 'youtube' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-600 dark:text-red-400" />
                Ingest YouTube Video
              </h2>

              <form onSubmit={handleYouTubeIngest} className="space-y-4">
                <div>
                  <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    YouTube Video URL
                  </label>
                  <input
                    id="youtube-url"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="e.g., 'https://www.youtube.com/watch?v=...'"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    disabled={youtubeMutation.isPending}
                  />
                </div>

                <div>
                  <label htmlFor="youtube-source-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source Label
                  </label>
                  <input
                    id="youtube-source-name"
                    type="text"
                    value={youtubeSourceName}
                    onChange={(e) => setYoutubeSourceName(e.target.value)}
                    placeholder="e.g., 'YouTube'"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    disabled={youtubeMutation.isPending}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!youtubeUrl.trim() || youtubeMutation.isPending}
                  className="w-full px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {youtubeMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Ingest Video
                    </>
                  )}
                </button>
              </form>

              {youtubeMutation.isSuccess && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                        YouTube Video Ingested Successfully
                      </h3>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Video transcript has been processed and added to your library.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {youtubeMutation.isError && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                        YouTube Ingestion Failed
                      </h3>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        {youtubeMutation.error instanceof Error ? youtubeMutation.error.message : 'Unknown error'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Post-Ingestion Actions */}
        {currentJob && currentJob.status === 'completed' && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Next Steps
            </h2>
            
            <div className="space-y-3">
              <button
                onClick={() => embeddingsMutation.mutate()}
                disabled={embeddingsMutation.isPending}
                className="w-full px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {embeddingsMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Embeddings
                  </>
                )}
              </button>

              <button
                onClick={() => connectionsMutation.mutate(0.7)}
                disabled={connectionsMutation.isPending}
                className="w-full px-4 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {connectionsMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Computing...
                  </>
                ) : (
                  <>
                    <Database className="h-5 w-5" />
                    Compute Connections
                  </>
                )}
              </button>

              {(embeddingsMutation.isSuccess || connectionsMutation.isSuccess) && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    ✓ Processing started in background. Visit{' '}
                    <a href="/articles" className="font-semibold underline">
                      Articles
                    </a>
                    {' '}or{' '}
                    <a href="/graph" className="font-semibold underline">
                      Knowledge Graph
                    </a>
                    {' '}to see results.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
