import { useRef } from "react";
import type { Match } from "../types/poloperator";
import {
  buildOverlayHref,
  listOverlayCourts,
} from "../services/overlay/overlayParams";

const ACTION_CLASS =
  "inline-flex items-center gap-1 rounded-[10px] border-2 border-ink bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit transition-transform hover:-translate-y-0.5 hover:bg-teal";

interface ScoreStreamButtonProps {
  slug: string;
  matches: Match[];
}

/**
 * Link to the re-styled `/overlay` scoreboard, in a new tab. With a single
 * court it is a plain link; with several, one dropdown button lists them and
 * picking a court opens its overlay.
 */
export function ScoreStreamButton({ slug, matches }: ScoreStreamButtonProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const courts = listOverlayCourts(matches);

  if (courts.length === 0) return null;

  if (courts.length === 1) {
    return (
      <a
        href={buildOverlayHref(slug, courts[0].court)}
        target="_blank"
        rel="noreferrer"
        className={ACTION_CLASS}
      >
        Voir le stream du score ↗
      </a>
    );
  }

  const closeMenu = () => detailsRef.current?.removeAttribute("open");

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className={`${ACTION_CLASS} cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden`}
      >
        Voir le stream du score ▾
      </summary>
      <ul className="absolute right-0 z-10 mt-1 min-w-full rounded-[10px] border-2 border-ink bg-surface p-1 shadow-kit">
        {courts.map((court) => (
          <li key={court.name}>
            <a
              href={buildOverlayHref(slug, court.court)}
              target="_blank"
              rel="noreferrer"
              onClick={closeMenu}
              className="block whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-ink hover:bg-teal"
            >
              {court.name}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
