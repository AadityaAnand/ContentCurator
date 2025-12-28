import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useJobWebSocket } from '@/hooks/useJobWebSocket'

interface JobProgressProps {
  jobId: number | null
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  onClose?: () => void
  title?: string
}

export function JobProgress({
  jobId,
  onComplete,
  onError,
  onClose,
  title = 'Processing',
}: JobProgressProps) {
  const [status, setStatus] = useState<string>('pending')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [processedItems, setProcessedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [createdItems, setCreatedItems] = useState(0)

  const { isConnected } = useJobWebSocket({
    jobId,
    enabled: jobId !== null,
    onUpdate: (update) => {
      if (update.data) {
        setStatus(update.data.status)
        setProgress(update.data.progress || 0)
        setMessage(update.data.message || '')
        setTotalItems(update.data.total_items || 0)
        setProcessedItems(update.data.processed_items || 0)
        setCreatedItems(update.data.created_items || 0)

        if (update.data.error) {
          setError(update.data.error)
        }
      }
    },
    onComplete: (result) => {
      setStatus('completed')
      setProgress(100)
      onComplete?.(result)
    },
    onError: (err) => {
      setStatus('failed')
      setError(err)
      onError?.(err)
    },
  })

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-600" />
      case 'failed':
        return <AlertCircle className="w-6 h-6 text-red-600" />
      case 'processing':
        return <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      default:
        return <Loader2 className="w-6 h-6 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
      case 'processing':
        return 'bg-indigo-50 border-indigo-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getProgressBarColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-600'
      case 'failed':
        return 'bg-red-600'
      default:
        return 'bg-indigo-600'
    }
  }

  if (!jobId) return null

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()} transition-colors`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">{getStatusIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {title}
              {isConnected && status === 'processing' && (
                <span className="ml-2 inline-flex items-center text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-1"></span>
                  Live
                </span>
              )}
            </h3>

            {(status === 'completed' || status === 'failed') && onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Info */}
          <div className="space-y-1">
            {message && (
              <p className="text-sm text-gray-700">{message}</p>
            )}

            {totalItems > 0 && (
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>Progress: {processedItems}/{totalItems}</span>
                {createdItems > 0 && <span>Created: {createdItems}</span>}
                <span className="font-medium">{progress}%</span>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 mt-2">Error: {error}</p>
            )}

            {status === 'completed' && !error && (
              <p className="text-sm text-green-600 mt-2">
                ✓ Completed successfully
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
