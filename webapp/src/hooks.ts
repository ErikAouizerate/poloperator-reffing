import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store/store'
import { startCountdown, type CountdownController } from './utils/countdown'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}

const TICK_MS = 250

export function useAutoRefresh({
  intervalMs,
  onRefresh,
}: {
  intervalMs: number
  onRefresh: () => void
}): { remainingMs: number; restart: () => void; refreshNow: () => void } {
  const [remainingMs, setRemainingMs] = useState(intervalMs)
  const controllerRef = useRef<CountdownController | null>(null)
  const onRefreshRef = useRef(onRefresh)
  const intervalMsRef = useRef(intervalMs)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    intervalMsRef.current = intervalMs
  }, [intervalMs])

  const restart = useCallback(() => {
    controllerRef.current?.stop()
    setRemainingMs(intervalMsRef.current)
    controllerRef.current = startCountdown({
      durationMs: intervalMsRef.current,
      intervalMs: TICK_MS,
      onTick: setRemainingMs,
      onComplete: () => onRefreshRef.current(),
    })
  }, [])

  const refreshNow = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.trigger()
    } else {
      onRefreshRef.current()
      restart()
    }
  }, [restart])

  useEffect(() => {
    restart()
    return () => controllerRef.current?.stop()
  }, [intervalMs, restart])

  return { remainingMs, restart, refreshNow }
}