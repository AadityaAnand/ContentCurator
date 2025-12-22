'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ingestionApi, jobsApi } from '@/lib/api';
import { Loader2, Search, AlertCircle, CheckCircle2, Clock, Youtube, Globe, Sparkles, Rss } from 'lucide-react';
import type { JobStatusResponse } from '@/types';

export default function IngestPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'research' | 'rss'>('research');

  // Research state
  const [researchQuery, setResearchQuery] = useState('');
  const [maxWebResults, setMaxWebResults] = useState(5);
  const [maxYoutubeResults, setMaxYoutubeResults] = useState(3);

  // RSS state
  const [rssUrl, setRssUrl] = useState('');
  const [rssSourceName, setRssSourceName] = useState('');
  const [rssMaxArticles, setRssMaxArticles] = useState(10);

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
    pollJobStatus(jobId);
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

  const researchMutation = useMutation({
    mutationFn: (payload: { query: string; max_web_results: number; max_youtube_results: number }) =>
      ingestionApi.researchTopic(payload.query, payload.max_web_results, payload.max_youtube_results),
    onSuccess: (data) => {
      startPolling(data.id);
      setResearchQuery('');
    },
  });

  const rssMutation = useMutation({
    mutationFn: async (payload: { url: string; sourceName?: string; maxArticles: number }) => {
      const response = await ingestionApi.ingestRSS(payload.url, payload.sourceName, payload.maxArticles);
      // RSS ingestion doesn't return job ID, just sync response
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      return response;
    },
    onSuccess: () => {
      setRssUrl('');
      setRssSourceName('');
    },
  });

  const handleResearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (researchQuery.trim()) {
      researchMutation.mutate({
        query: researchQuery,
        max_web_results: maxWebResults,
        max_youtube_results: maxYoutubeResults,
      });
    }
  };

  const handleRssIngest = (e: React.FormEvent) => {
    e.preventDefault();
    if (rssUrl.trim()) {
      rssMutation.mutate({
        url: rssUrl,
        sourceName: rssSourceName || undefined,
        maxArticles: rssMaxArticles,
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
              <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Ingest Content
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Add new content to your knowledge library
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('research')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'research'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Search className="h-4 w-4" />
              Research Topic
            </button>
            <button
              onClick={() => setActiveTab('rss')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'rss'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Rss className="h-4 w-4" />
              RSS Feed
            </button>
          </div>

          {/* Info Card */}
          {activeTab === 'research' ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-2">How Autonomous Research Works:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-blue-800 dark:text-blue-200">
                    <div className="flex items-start gap-2">
                      <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Web Articles</p>
                        <p className="text-xs">Searches Tavily API for relevant articles</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Youtube className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">YouTube Videos</p>
                        <p className="text-xs">Finds educational videos with transcripts</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">AI Processing</p>
                        <p className="text-xs">Ollama summarizes and categorizes everything</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Auto-Integration</p>
                        <p className="text-xs">Generates embeddings and connections automatically</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex gap-3">
                <Rss className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900 dark:text-orange-100">
                  <p className="font-semibold mb-2">RSS Feed Ingestion:</p>
                  <p className="text-orange-800 dark:text-orange-200">
                    Provide an RSS feed URL and we&apos;ll fetch the latest articles, process them with Ollama AI for summaries and categorization, then add them to your knowledge library.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Forms */}
        {activeTab === 'research' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              What do you want to learn about?
            </h2>

          <form onSubmit={handleResearch} className="space-y-6">
            <div>
              <label htmlFor="research-query" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Research Topic
              </label>
              <input
                id="research-query"
                type="text"
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                placeholder="e.g., 'quantum computing applications' or 'sustainable energy solutions'"
                className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                disabled={researchMutation.isPending || isPolling}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="max-web" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Web Articles: {maxWebResults}
                </label>
                <input
                  id="max-web"
                  type="range"
                  min="1"
                  max="15"
                  value={maxWebResults}
                  onChange={(e) => setMaxWebResults(Number(e.target.value))}
                  className="w-full"
                  disabled={researchMutation.isPending || isPolling}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>1</span>
                  <span>15</span>
                </div>
              </div>

              <div>
                <label htmlFor="max-youtube" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube Videos: {maxYoutubeResults}
                </label>
                <input
                  id="max-youtube"
                  type="range"
                  min="0"
                  max="10"
                  value={maxYoutubeResults}
                  onChange={(e) => setMaxYoutubeResults(Number(e.target.value))}
                  className="w-full"
                  disabled={researchMutation.isPending || isPolling}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0</span>
                  <span>10</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!researchQuery.trim() || researchMutation.isPending || isPolling}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              {researchMutation.isPending || isPolling ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  {isPolling ? 'Researching...' : 'Starting Research...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6" />
                  Start Research
                </>
              )}
            </button>
          </form>

          {/* Job Progress */}
          {currentJob && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
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
                    {currentJob.status === 'completed' && '✓ Research Complete!'}
                    {currentJob.status === 'failed' && '✗ Research Failed'}
                    {currentJob.status === 'running' && 'Research in Progress...'}
                    {currentJob.status === 'pending' && 'Queued for Processing...'}
                  </h3>

                  {/* Progress Bar */}
                  {currentJob.status === 'running' && (
                    <div className="mb-3">
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${currentJob.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                        {currentJob.progress < 70 && 'Searching and processing content...'}
                        {currentJob.progress >= 70 && currentJob.progress < 85 && 'Generating embeddings...'}
                        {currentJob.progress >= 85 && 'Computing connections...'}
                      </p>
                    </div>
                  )}

                  {/* Results */}
                  {currentJob.status === 'completed' && currentJob.result && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {currentJob.result.web_articles_created > 0 && (
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                            <Globe className="h-4 w-4" />
                            <span>{currentJob.result.web_articles_created} web articles</span>
                          </div>
                        )}
                        {currentJob.result.youtube_videos_created > 0 && (
                          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                            <Youtube className="h-4 w-4" />
                            <span>{currentJob.result.youtube_videos_created} videos</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                        <p>✓ {currentJob.result.embeddings_generated || 0} embeddings generated</p>
                        <p>✓ {currentJob.result.connections_computed || 0} connections discovered</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          Your research is ready! View it in{' '}
                          <a href="/articles" className="font-semibold underline hover:text-blue-600">
                            Articles
                          </a>
                          {' '}or{' '}
                          <a href="/graph" className="font-semibold underline hover:text-blue-600">
                            Knowledge Graph
                          </a>
                        </p>
                      </div>
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

          {researchMutation.isError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Research failed
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {researchMutation.error instanceof Error ? researchMutation.error.message : 'Unknown error'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Rss className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Ingest RSS Feed
            </h2>

            <form onSubmit={handleRssIngest} className="space-y-6">
              <div>
                <label htmlFor="rss-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  RSS Feed URL *
                </label>
                <input
                  id="rss-url"
                  type="url"
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  disabled={rssMutation.isPending}
                  required
                />
              </div>

              <div>
                <label htmlFor="rss-source-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source Name (optional)
                </label>
                <input
                  id="rss-source-name"
                  type="text"
                  value={rssSourceName}
                  onChange={(e) => setRssSourceName(e.target.value)}
                  placeholder="e.g., 'TechCrunch' or 'MIT News'"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  disabled={rssMutation.isPending}
                />
              </div>

              <div>
                <label htmlFor="rss-max-articles" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Articles: {rssMaxArticles}
                </label>
                <input
                  id="rss-max-articles"
                  type="range"
                  min="1"
                  max="50"
                  value={rssMaxArticles}
                  onChange={(e) => setRssMaxArticles(Number(e.target.value))}
                  className="w-full"
                  disabled={rssMutation.isPending}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!rssUrl.trim() || rssMutation.isPending}
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold text-lg rounded-lg hover:from-orange-700 hover:to-amber-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                {rssMutation.isPending ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Processing Feed...
                  </>
                ) : (
                  <>
                    <Rss className="h-6 w-6" />
                    Ingest RSS Feed
                  </>
                )}
              </button>
            </form>

            {rssMutation.isSuccess && rssMutation.data && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                      RSS Feed Ingested Successfully!
                    </h3>
                    <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      <p>✓ {rssMutation.data.articles_created} articles added to your library</p>
                      <p className="text-xs mt-2">
                        View them in{' '}
                        <a href="/articles" className="font-semibold underline hover:text-green-600">
                          Articles
                        </a>
                      </p>
                    </div>
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
                      RSS ingestion failed
                    </h3>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {rssMutation.error instanceof Error ? rssMutation.error.message : 'Unknown error'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
