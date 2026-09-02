interface RefreshButtonProps {
  loading: boolean;
  remainingMs: number;
  intervalMs: number;
  onClick: () => void;
  className?: string;
}

export function RefreshButton({
  loading,
  remainingMs,
  intervalMs,
  onClick,
  className = "",
}: RefreshButtonProps) {
  const progress = 1 - remainingMs / intervalMs;
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`relative overflow-hidden rounded-[10px] border-2 border-ink bg-surface px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit hover:bg-teal disabled:opacity-60 ${className}`}
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