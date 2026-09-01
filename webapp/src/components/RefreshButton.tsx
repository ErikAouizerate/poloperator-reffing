import { useEffect, useRef, useState } from 'react'
import { startCountdown } from '../utils/countdown'

interface RefreshButtonProps {
  loading: boolean
  onRefresh: () => void
  intervalMs?: number
}

const TICK_MS = 250

export function RefreshButton({
  loading,
  onRefresh,
  intervalMs = 60_000,
}: RefreshButtonProps) {
  const [remainingMs, setRemainingMs] = useState(intervalMs)
  const stopRef = useRef<(() => void) | null>(null)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    stopRef.current?.()
    const stop = startCountdown({
      durationMs: intervalMs,
      intervalMs: TICK_MS,
      onTick: setRemainingMs,
      onComplete: () => onRefreshRef.current(),
    })
    stopRef.current = stop
    return () => stop()
  }, [intervalMs])

  const progress = 1 - remainingMs / intervalMs
  const seconds = Math.ceil(remainingMs / 1000)

  const handleClick = () => {
    if (loading) return
    onRefreshRef.current()
    stopRef.current?.()
    setRemainingMs(intervalMs)
    stopRef.current = startCountdown({
      durationMs: intervalMs,
      intervalMs: TICK_MS,
      onTick: setRemainingMs,
      onComplete: () => onRefreshRef.current(),
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="relative overflow-hidden rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-teal-500 hover:text-teal-400 disabled:opacity-60"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-teal-500/25"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative">
        {loading ? 'Rafraîchir…' : `Rafraîchir · ${seconds}s`}
      </span>
    </button>
  )
}