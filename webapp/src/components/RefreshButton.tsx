import { useEffect, useRef, useState } from "react";
import { startCountdown } from "../utils/countdown";

interface RefreshButtonProps {
  loading: boolean;
  onRefresh: () => void;
  intervalMs?: number;
}

const TICK_MS = 250;

export function RefreshButton({
  loading,
  onRefresh,
  intervalMs = 240_000,
}: RefreshButtonProps) {
  const [remainingMs, setRemainingMs] = useState(intervalMs);
  const stopRef = useRef<(() => void) | null>(null);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    stopRef.current?.();
    const stop = startCountdown({
      durationMs: intervalMs,
      intervalMs: TICK_MS,
      onTick: setRemainingMs,
      onComplete: () => onRefreshRef.current(),
    });
    stopRef.current = stop;
    return () => stop();
  }, [intervalMs]);

  const progress = 1 - remainingMs / intervalMs;
  const seconds = Math.ceil(remainingMs / 1000);

  const handleClick = () => {
    if (loading) return;
    onRefreshRef.current();
    stopRef.current?.();
    setRemainingMs(intervalMs);
    stopRef.current = startCountdown({
      durationMs: intervalMs,
      intervalMs: TICK_MS,
      onTick: setRemainingMs,
      onComplete: () => onRefreshRef.current(),
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="relative overflow-hidden rounded-[10px] border-2 border-ink bg-surface px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit hover:bg-teal disabled:opacity-60"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-teal/60"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative">
        {loading ? (
          "Rafraîchir…"
        ) : (
          <>
            Rafraîchir ·{" "}
            <span className="inline-block w-[4ch] text-left tabular-nums tracking-[0]">
              {seconds}
            </span>
            s
          </>
        )}
      </span>
    </button>
  );
}
