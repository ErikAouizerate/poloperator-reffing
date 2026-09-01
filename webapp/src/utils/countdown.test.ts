import { afterEach, describe, expect, it, vi } from 'vitest'
import { startCountdown } from './countdown'

describe('startCountdown', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticks down from durationMs in intervalMs steps', () => {
    vi.useFakeTimers()
    const ticks: number[] = []
    startCountdown({
      durationMs: 60_000,
      intervalMs: 250,
      onTick: (r) => ticks.push(r),
      onComplete: () => {},
    })
    vi.advanceTimersByTime(250)
    expect(ticks).toEqual([60_000, 59_750])
  })

  it('fires onComplete at 0 and auto-restarts', () => {
    vi.useFakeTimers()
    const ticks: number[] = []
    let completions = 0
    startCountdown({
      durationMs: 1_000,
      intervalMs: 250,
      onTick: (r) => ticks.push(r),
      onComplete: () => {
        completions += 1
      },
    })
    vi.advanceTimersByTime(2_000)
    expect(completions).toBe(2)
    expect(ticks[0]).toBe(1_000)
    expect(ticks[ticks.length - 1]).toBe(1_000)
  })

  it('stop() halts the countdown', () => {
    vi.useFakeTimers()
    const ticks: number[] = []
    const stop = startCountdown({
      durationMs: 1_000,
      intervalMs: 250,
      onTick: (r) => ticks.push(r),
      onComplete: () => {},
    })
    vi.advanceTimersByTime(500)
    stop()
    const count = ticks.length
    vi.advanceTimersByTime(1_000)
    expect(ticks.length).toBe(count)
  })
})