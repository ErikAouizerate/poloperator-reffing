export interface CountdownOptions {
  durationMs: number
  intervalMs: number
  onTick: (remainingMs: number) => void
  onComplete: () => void
}

export function startCountdown({
  durationMs,
  intervalMs,
  onTick,
  onComplete,
}: CountdownOptions): () => void {
  let remainingMs = durationMs
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null

  onTick(remainingMs)

  const tick = () => {
    if (stopped) return
    remainingMs -= intervalMs
    if (remainingMs <= 0) {
      onTick(0)
      onComplete()
      remainingMs = durationMs
      onTick(remainingMs)
    } else {
      onTick(remainingMs)
    }
    timer = setTimeout(tick, intervalMs)
  }

  timer = setTimeout(tick, intervalMs)

  return () => {
    stopped = true
    if (timer !== null) clearTimeout(timer)
  }
}