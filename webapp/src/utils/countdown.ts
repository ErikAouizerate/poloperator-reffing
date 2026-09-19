export interface CountdownOptions {
  durationMs: number
  intervalMs: number
  onTick: (remainingMs: number) => void
  onComplete: () => void
}

export interface CountdownController {
  stop: () => void
  trigger: () => void
}

export function startCountdown({
  durationMs,
  intervalMs,
  onTick,
  onComplete,
}: CountdownOptions): CountdownController {
  let remainingMs = durationMs
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null

  onTick(remainingMs)

  const scheduleNextTick = () => {
    timer = setTimeout(tick, intervalMs)
  }

  const completeAndRestart = () => {
    onTick(0)
    onComplete()
    remainingMs = durationMs
    onTick(remainingMs)
    scheduleNextTick()
  }

  const tick = () => {
    if (stopped) return
    remainingMs -= intervalMs
    if (remainingMs <= 0) {
      completeAndRestart()
    } else {
      onTick(remainingMs)
      scheduleNextTick()
    }
  }

  scheduleNextTick()

  return {
    stop: () => {
      stopped = true
      if (timer !== null) clearTimeout(timer)
    },
    trigger: () => {
      if (stopped) return
      if (timer !== null) clearTimeout(timer)
      completeAndRestart()
    },
  }
}
