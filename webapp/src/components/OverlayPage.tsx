import { useMemo, useRef } from "react";
import {
  buildOverlayPath,
  parseOverlayParams,
} from "../services/overlay/overlayParams";
import { POLOPERATOR_BASE } from "../services/poloperator/fetch";

const TWEAKS_ID = "po-tweaks";

/**
 * CSS injected into the framed poloperator overlay. It targets inline-style
 * signatures (the overlay card has no class names) with `!important` so it also
 * applies to nodes re-rendered by the page's live updates.
 * Starting values — iterate against a live match in devtools.
 */
export const OVERLAY_TWEAKS_CSS = `
  /* Court + tournament header bar: hidden. */
  div[style*="text-transform:uppercase"] { display: none !important; }

  /* Card: positioning anchor for the clock zone; reserves the clock width. */
  div[style*="min-width:520px"] { position: relative !important; min-width: 660px !important; padding-right: 72px !important; }
  span[style*="min-width:48px"] { min-width: 40px !important; }

  /* Clock: its own zone on the right, separated by a vertical divider. */
  div[style*="background:#0f172a"] {
    position: absolute !important;
    right: 0 !important;
    top: 0 !important;
    height: 100% !important;
    width: 72px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: rgba(15, 15, 30, 0.95) !important;
    padding: 0 !important;
    border-left: 1px solid #ffffff !important;
  }
  span[style*="font-weight:700"][style*="font-size:28px"] { font-size: 16px !important; }

  /* Team blocks: symmetric around the score. */
  div[style*="padding:20px 24px"] {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }
  div[style*="padding:16px 20px"] { padding: 4px 6px !important; }
  div[style*="padding-top:24px"] { padding-top: 4px !important; }
  div[style*="gap:12px"] { gap: 6px !important; }

  /* Team names: single line, truncated with an ellipsis when too long. */
  div[style*="flex:1"] { min-width: 0 !important; }
  div[style*="font-weight:800"] {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    max-width: 100% !important;
  }
`;

function injectTweaks(iframe: HTMLIFrameElement | null): void {
  let doc: Document | null = null;
  try {
    doc = iframe?.contentDocument ?? null; // null when cross-origin
  } catch {
    return;
  }
  if (!doc || doc.getElementById(TWEAKS_ID)) return;
  const style = doc.createElement("style");
  style.id = TWEAKS_ID;
  style.textContent = OVERLAY_TWEAKS_CSS;
  doc.head.appendChild(style);
}

export function OverlayPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const params = useMemo(() => parseOverlayParams(window.location.search), []);
  const path = buildOverlayPath(params);

  if (!path) {
    return (
      <main className="overlay-page flex min-h-svh items-center justify-center bg-transparent p-6 text-center text-sm text-ink">
        Ajoute un paramètre « tournament » à l'URL, par exemple
        /overlay?tournament=mon-tournoi&amp;court=1
      </main>
    );
  }

  return (
    <main className="overlay-page h-svh w-svw overflow-hidden bg-transparent">
      <iframe
        ref={iframeRef}
        src={`${POLOPERATOR_BASE}${path}`}
        title="Overlay du match en direct"
        onLoad={() => injectTweaks(iframeRef.current)}
        className="h-full w-full border-0"
      />
    </main>
  );
}
