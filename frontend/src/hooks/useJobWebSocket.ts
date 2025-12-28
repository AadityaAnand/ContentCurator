import { useEffect, useRef, useState, useCallback } from 'react'

interface JobUpdate {
  type: string
  timestamp: string
  job_id?: number
  data?: {
    status: string
    progress: number
    total_items: number
    processed_items: number
    created_items: number
    message?: string
    error?: string
    result?: any
  }
  current_status?: string
  progress?: number
}

interface UseJobWebSocketOptions {
  jobId: number | null
  onUpdate?: (update: JobUpdate) => void
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  enabled?: boolean
}

export function useJobWebSocket({
  jobId,
  onUpdate,
  onComplete,
  onError,
  enabled = true,
}: UseJobWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<JobUpdate | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (!jobId || !enabled) return

    const ws = new WebSocket(`ws://localhost:8000/ws/jobs/${jobId}`)

    ws.onopen = () => {
      console.log(`WebSocket connected to job ${jobId}`)
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const update: JobUpdate = JSON.parse(event.data)
        setLastUpdate(update)

        if (update.type === 'job_update' && update.data) {
          onUpdate?.(update)

          if (update.data.status === 'completed') {
            onComplete?.(update.data.result)
            ws.close()
          } else if (update.data.status === 'failed') {
            onError?.(update.data.error || 'Job failed')
            ws.close()
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    ws.onclose = () => {
      console.log(`WebSocket disconnected from job ${jobId}`)
      setIsConnected(false)
      wsRef.current = null

      // Attempt reconnect with exponential backoff (max 3 attempts)
      if (enabled && reconnectAttemptsRef.current < 3) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 5000)
        console.log(`Attempting reconnect in ${delay}ms...`)
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1
          connect()
        }, delay)
      }
    }

    wsRef.current = ws
  }, [jobId, enabled, onUpdate, onComplete, onError])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const sendCommand = useCallback((command: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }))
    }
  }, [])

  useEffect(() => {
    if (enabled && jobId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [jobId, enabled, connect, disconnect])

  return {
    isConnected,
    lastUpdate,
    sendCommand,
    disconnect,
  }
}
