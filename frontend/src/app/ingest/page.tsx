'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ingestionApi, jobsApi } from '@/lib/api';
import { Loader2, Plus, Search, AlertCircle, CheckCircle2, Sparkles, Database, Clock } from 'lucide-react';
import type { JobStatusResponse } from '@/types';

export default function IngestPage() {
  const [topicQuery, setTopicQuery] = useState('');
  const [topicMaxResults, setTopicMaxResults] = useState(3);
  const [topicSourceName, setTopicSourceName] = useState('Web Search');
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
      // Start polling for job status
      startPolling(data.id);
      setTopicQuery('');
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

          {/* Info Card */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Enter a topic and we'll search the web using Tavily API</li>
                  <li>Articles are downloaded, cleaned, and summarized by Ollama AI</li>
                  <li>Content is permanently stored in your knowledge library</li>
                  <li>Generate embeddings and connections to integrate with existing articles</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Topic Ingestion Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
