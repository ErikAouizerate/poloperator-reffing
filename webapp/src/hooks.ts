import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store/store'
import { startCountdown } from './utils/countdown'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

const TICK_MS = 250

export function useAutoRefresh({
  intervalMs,
  onRefresh,
}: {
  intervalMs: number
  onRefresh: () => void
}): { remainingMs: number; restart: () => void } {
  const [remainingMs, setRemainingMs] = useState(intervalMs)
  const stopRef = useRef<(() => void) | null>(null)
  const onRefreshRef = useRef(onRefresh)
  const intervalMsRef = useRef(intervalMs)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    intervalMsRef.current = intervalMs
  }, [intervalMs])

  const restart = useCallback(() => {
    stopRef.current?.()
    setRemainingMs(intervalMsRef.current)
    stopRef.current = startCountdown({
      durationMs: intervalMsRef.current,
      intervalMs: TICK_MS,
      onTick: setRemainingMs,
      onComplete: () => onRefreshRef.current(),
    })
  }, [])

  useEffect(() => {
    restart()
    return () => stopRef.current?.()
  }, [intervalMs, restart])

  return { remainingMs, restart }
}