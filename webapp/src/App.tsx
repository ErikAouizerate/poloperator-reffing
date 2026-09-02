import { useEffect, useMemo, useRef, useState } from "react";
import type { TournamentSummary } from "./types/poloperator";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  loadTournamentRequested,
  loadTournamentsRequested,
} from "./store/tournamentActions";
import { TournamentPicker } from "./components/TournamentPicker";
import { UpcomingMatches } from "./components/UpcomingMatches";
import { LiveMatches } from "./components/LiveMatches";
import { RefereeCounts } from "./components/RefereeCounts";
import { RefreshButton } from "./components/RefreshButton";
import { SettingsModal } from "./components/SettingsModal";
import { resolvePickerList } from "./services/poloperator/filter";
import { classifyMatches } from "./services/prediction/timeline";
import { parseSlugFromSearch, syncTournamentSlug } from "./utils/urlTournament";

function formatTournamentDates(summary: TournamentSummary): string {
  const parts: string[] = [];
  if (summary.dateStart) {
    const start = new Date(summary.dateStart);
    const end = summary.dateEnd ? new Date(summary.dateEnd) : null;
    parts.push(
      end
        ? `${start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
        : start.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
    );
  }
  if (summary.city) parts.push(summary.city);
  if (summary.country) parts.push(summary.country);
  return parts.join(" · ");
}

function App() {
  const dispatch = useAppDispatch();
  const list = useAppSelector((s) => s.tournament.list);
  const listLoading = useAppSelector((s) => s.tournament.listLoading);
  const listError = useAppSelector((s) => s.tournament.listError);
  const selected = useAppSelector((s) => s.tournament.selected);
  const settings = useAppSelector((s) => s.settings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const summary = selected.summary;

  const [urlSlug] = useState(() =>
    typeof window === "undefined"
      ? null
      : parseSlugFromSearch(window.location.search),
  );
  const urlHandledRef = useRef(false);

  const selectedSlug = useMemo(() => {
    if (summary?.slug) return summary.slug;
    if (!urlSlug || !list) return null;
    return list.some((t) => t.slug === urlSlug) ? urlSlug : null;
  }, [summary, urlSlug, list]);

  const pickerList = useMemo(
    () => resolvePickerList(list, settings, selectedSlug),
    [list, settings, selectedSlug],
  );

  useEffect(() => {
    dispatch(loadTournamentsRequested());
  }, [dispatch]);

  useEffect(() => {
    if (urlHandledRef.current) return;
    if (!urlSlug || !list || selected.loading || selected.summary) return;
    const summary = list.find((t) => t.slug === urlSlug);
    urlHandledRef.current = true;
    if (!summary) return;
    dispatch(loadTournamentRequested({ slug: urlSlug, summary }));
  }, [urlSlug, list, selected.loading, selected.summary, dispatch]);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of selected.data?.teams ?? []) map.set(team.id, team.name);
    return (teamId: string | null) => (teamId ? (map.get(teamId) ?? "?") : "?");
  }, [selected.data]);

  const timeline = selected.data
    ? classifyMatches(
        selected.data.slots,
        selected.data.upcomingMatches,
        new Date(),
      )
    : { live: [], upcoming: [] };

  const handleRefresh = () => {
    dispatch(loadTournamentsRequested());
    if (selected.summary) {
      dispatch(
        loadTournamentRequested({
          slug: selected.summary.slug,
          summary: selected.summary,
        }),
      );
    }
  };

  const handleSelect = (t: TournamentSummary) => {
    dispatch(loadTournamentRequested({ slug: t.slug, summary: t }));
    syncTournamentSlug(t.slug);
  };

  return (
    <main className="min-h-svh bg-bg font-sans text-ink">
      <header className="border-b-2 border-ink bg-surface">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-[10px] border-2 border-ink px-3 py-1.5 shadow-kit">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full border-2 border-red"
              />
              <span className="font-display text-[17px] font-bold tracking-tight">
                poloperator reffing
              </span>
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              BETA
            </span>
          </div>
          <RefreshButton
            loading={listLoading || selected.loading}
            onRefresh={handleRefresh}
          />
          <div className="flex items-center justify-self-end gap-2">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Copier le lien"
              title="Copier le lien du tournoi"
              className="flex h-9 items-center justify-center rounded-full border-2 border-ink bg-surface px-3 text-xs font-bold uppercase tracking-[0.1em] text-ink hover:bg-teal"
            >
              {copied ? "Copié" : "Partager"}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Configuration"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-surface text-sm text-ink hover:bg-teal"
            >
              ⚙
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <TournamentPicker
            tournaments={pickerList}
            loading={listLoading}
            selectedSlug={selectedSlug}
            onSelect={handleSelect}
          />
        </div>

        {listError ? (
          <ErrorBanner
            message={`Impossible de charger les tournois : ${listError}`}
          />
        ) : null}

        {!summary ? (
          <p className="text-sm text-muted">
            {listLoading
              ? "Chargement des tournois…"
              : "Choisis un tournoi dans la liste pour voir les arbitres à venir."}
          </p>
        ) : selected.loading ? (
          <p className="text-sm text-muted">
            Chargement de « {summary.name} »…
          </p>
        ) : selected.error ? (
          <ErrorBanner
            message={`Impossible de charger « ${summary.name} » : ${selected.error}`}
          />
        ) : selected.data ? (
          <div className="space-y-10">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                  {summary.name}
                </h2>
                <a
                  href={`https://poloperator.com/fr/tournament/${summary.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-[10px] border-2 border-ink bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit transition-transform hover:-translate-y-0.5 hover:bg-teal"
                >
                  Voir sur Poloperator ↗
                </a>
              </div>
              <p className="mt-1 text-sm text-muted">
                {formatTournamentDates(summary)} · {selected.data.teams.length}{" "}
                équipes · {timeline.upcoming.length} match à venir
                {timeline.upcoming.length > 1 ? "s" : ""}
                {timeline.live.length > 0
                  ? ` · ${timeline.live.length} match${timeline.live.length > 1 ? "s" : ""} en cours`
                  : ""}
              </p>
            </div>
            <UpcomingMatches
              matches={timeline.upcoming}
              suggestionsByMatch={selected.data.suggestionsByMatch}
              teamNameById={teamNameById}
              suggestionLimit={settings.suggestedTeamCount}
            />
            <LiveMatches
              matches={timeline.live}
              teamNameById={teamNameById}
            />
            <RefereeCounts counts={selected.data.refereeCounts} />
          </div>
        ) : null}
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
      />
    </main>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="mb-6 rounded-lg border-2 border-ink bg-pink px-4 py-3 text-sm font-medium text-ink">
      {message}
    </p>
  );
}

export default App;
