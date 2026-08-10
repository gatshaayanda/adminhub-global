"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { findSeededDesk } from "@/data/seededDesks";
import type { BoardSignalDesk, DeskApiResponse, DeskCandidate } from "@/lib/boardsignal/types";

type EngineResult = {
  id: string;
  depth: number;
  cp?: number;
  mate?: number;
};

export default function UniversalPlayerDesk({ requestedUsername }: { requestedUsername: string }) {
  const seeded = useMemo(() => findSeededDesk(requestedUsername), [requestedUsername]);
  const [desk, setDesk] = useState<BoardSignalDesk | null>(seeded ?? null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!seeded);
  const [engineResults, setEngineResults] = useState<Record<string, EngineResult>>({});

  useEffect(() => {
    if (seeded) return;
    let active = true;

    fetch(`/api/boardsignal/${encodeURIComponent(requestedUsername)}`, { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json() as DeskApiResponse }))
      .then(({ response, body }) => {
        if (!active) return;
        if (!response.ok || !body.ok) throw new Error(body.ok ? "BoardSignal could not build this Desk." : body.error);
        setDesk(body.desk);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "BoardSignal could not build this Desk.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [requestedUsername, seeded]);

  useEffect(() => {
    if (!desk || desk.source !== "live") return;
    const candidates = desk.candidates.filter((candidate) => candidate.fen);
    if (!candidates.length) {
      return;
    }

    if (!window.crossOriginIsolated || typeof Worker === "undefined") {
      return;
    }

    const worker = new Worker("/stockfish/engine-worker.js");
    let queueIndex = 0;
    let current: DeskCandidate | undefined;
    let latest: EngineResult | undefined;

    const beginNext = () => {
      current = candidates[queueIndex];
      latest = current ? { id: current.id, depth: 0 } : undefined;
      if (!current?.fen) {
        worker.terminate();
        return;
      }
      worker.postMessage(`position fen ${current.fen}`);
      worker.postMessage("go depth 11");
    };

    worker.onmessage = (event: MessageEvent<string>) => {
      const line = String(event.data);
      if (line === "boardsignal-engine-ready") {
        worker.postMessage("uci");
        return;
      }
      if (line === "uciok") {
        worker.postMessage("setoption name Threads value 1");
        worker.postMessage("setoption name Hash value 16");
        worker.postMessage("isready");
        return;
      }
      if (line === "readyok") {
        beginNext();
        return;
      }
      if (line.startsWith("info ") && current && latest) {
        const depth = Number(line.match(/\bdepth (\d+)/)?.[1] ?? latest.depth);
        const cpRaw = line.match(/\bscore cp (-?\d+)/)?.[1];
        const mateRaw = line.match(/\bscore mate (-?\d+)/)?.[1];
        const activeColor = current.fen?.split(" ")[1] === "w" ? "white" : "black";
        const perspective = current.playerColor === activeColor ? 1 : -1;
        latest = {
          id: current.id,
          depth,
          ...(cpRaw ? { cp: Number(cpRaw) * perspective } : {}),
          ...(mateRaw ? { mate: Number(mateRaw) * perspective } : {}),
        };
      }
      if (line.startsWith("bestmove") && current && latest) {
        setEngineResults((values) => ({ ...values, [current!.id]: latest! }));
        queueIndex += 1;
        beginNext();
      }
    };

    worker.onerror = () => {
      worker.terminate();
    };

    return () => worker.terminate();
  }, [desk]);

  if (loading) return <DeskLoading username={requestedUsername} />;
  if (error || !desk) return <DeskError username={requestedUsername} error={error} />;

  const hasPositions = desk.candidates.some((candidate) => candidate.fen || candidate.gameUrl);

  return (
    <div id="main" className="universal-desk-page">
      <section className="container universal-desk-shell">
        <header className="universal-player-bar">
          <div className="universal-avatar">{desk.player.username.slice(0, 2).toUpperCase()}</div>
          <div><span>Chess.com account</span><h1>{desk.player.username}</h1><p>{desk.primaryPool} · {desk.period.label}</p></div>
          <div className="private-access"><LockKeyhole size={16} /> Latest Desk</div>
        </header>

        {desk.period.isLastActive ? (
          <div className="last-active-banner"><AlertTriangle size={18} /><div><strong>This is the last active week—not current form.</strong><p>The latest completed period was {desk.period.latestCompletedLabel}; BoardSignal searched backward in fixed Monday–Sunday blocks.</p></div></div>
        ) : null}

        <section className="universal-cover">
          <div className="universal-cover-copy">
            <span className="live-pill">Your latest Desk</span>
            <p className="kicker">{desk.period.label} · {desk.games} games</p>
            <h2>{desk.headline}</h2>
            <p>{desk.summary}</p>
            <div className="lead-actions">
              <a href="#replay" className="button button-lime">Understand my week <ArrowRight size={17} /></a>
              <a href="#signals" className="button button-glass">Go to my signals</a>
            </div>
          </div>
          <div className="universal-score-card">
            <span>Week at a glance</span>
            <strong>{desk.wins}–{desk.losses}–{desk.draws}</strong>
            <p>{desk.score.toFixed(1)}% score</p>
            <div><span>Longest runs</span><b>{desk.longestWinStreak}W · {desk.longestLossStreak}L</b></div>
          </div>
        </section>

        <nav className="desk-chapter-nav" aria-label="Player Desk chapters">
          <a href="#replay">My week</a>
          <a href="#pools">Ratings & pools</a>
          <a href="#signals">My signals</a>
          {hasPositions ? <a href="#evidence">My evidence</a> : null}
        </nav>

        <section className="universal-metrics" aria-label="Desk facts">
          <div><span>Games</span><strong>{desk.games}</strong></div>
          <div><span>Sessions</span><strong>{desk.sessions || "—"}</strong></div>
          <div><span>Checkmate wins</span><strong>{desk.checkmateWins}</strong></div>
          <div><span>Primary pool</span><strong>{desk.primaryPool}</strong></div>
        </section>

        <section className="universal-section" id="replay">
          <div className="universal-section-heading"><span>01</span><div><p className="kicker">The Replay</p><h2>How the week moved.</h2></div></div>
          {desk.days.length ? (
            <div className="universal-timeline">
              {desk.days.map((day) => (
                <article className={day.wins > day.losses ? "positive" : day.losses > day.wins ? "negative" : "neutral"} key={day.date}>
                  <span>{day.label}</span><strong>{day.wins}W · {day.draws}D · {day.losses}L</strong>
                </article>
              ))}
            </div>
          ) : <div className="section-empty"><strong>Your week in one view</strong><p>{desk.summary}</p></div>}
          <div className="replay-callouts">
            <div><Sparkles /><span>Positive run</span><strong>{desk.longestWinStreak || "See Green Signal"}</strong><p>{desk.longestWinStreak ? "consecutive wins" : desk.signals.green.title}</p></div>
            <div><BarChart3 /><span>Watch run</span><strong>{desk.longestLossStreak || "See Amber Signal"}</strong><p>{desk.longestLossStreak ? "consecutive losses" : desk.signals.amber.title}</p></div>
          </div>
        </section>

        <section className="universal-section" id="pools">
          <div className="universal-section-heading"><span>02</span><div><p className="kicker">Ratings and pools</p><h2>Do not mix different chess into one rating story.</h2></div></div>
          <div className="pool-table">
            {desk.pools.map((pool) => (
              <article key={pool.pool}>
                <div><span>Pool</span><strong>{pool.pool}</strong></div>
                <div><span>Games</span><strong>{pool.games}</strong></div>
                <div><span>Record</span><strong>{pool.record}</strong></div>
                <div><span>Recorded rating</span><strong>{pool.firstRecordedRating !== undefined ? `${pool.firstRecordedRating} → ${pool.lastRecordedRating}` : "Not available"}</strong></div>
              </article>
            ))}
          </div>
        </section>

        <section className="universal-section" id="signals">
          <div className="universal-section-heading"><span>03</span><div><p className="kicker">My Signal Board</p><h2>What to preserve, monitor and fix first.</h2></div></div>
          <div className="universal-signal-grid">
            <SignalCard tone="green" signal={desk.signals.green} />
            <SignalCard tone="amber" signal={desk.signals.amber} />
            <SignalCard tone="red" signal={desk.signals.red} />
            <SignalCard tone="blue" signal={desk.signals.blue} />
          </div>
        </section>

        {hasPositions ? <section className="universal-section" id="evidence">
          <div className="universal-section-heading"><span>04</span><div><p className="kicker">The evidence</p><h2>Open the games behind the guidance.</h2></div></div>
          <div className="universal-evidence-list">
            {desk.candidates.map((candidate) => <EvidenceCard key={candidate.id} candidate={candidate} engine={engineResults[candidate.id]} />)}
          </div>
        </section> : null}

        <section className="desk-caveats">
          <ShieldCheck size={20} />
          <div><strong>What this Desk is careful about</strong><ul>{desk.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul></div>
        </section>

      </section>
    </div>
  );
}

function DeskLoading({ username }: { username: string }) {
  return (
    <div id="main" className="desk-processing-page"><section className="container desk-processing-card">
      <div className="processing-orb"><LoaderCircle /></div><p className="kicker">Preparing your Desk</p><h1>{username}</h1><p>Your latest week is being covered.</p>
    </section></div>
  );
}

function DeskError({ username, error }: { username: string; error: string }) {
  return (
    <div id="main" className="desk-processing-page"><section className="container desk-processing-card error-card">
      <AlertTriangle /><p className="kicker">Desk could not be built</p><h1>{username}</h1><p>{error}</p><div className="gateway-search"><UsernameDeskForm compact /></div><Link href="/" className="text-link">Return to BoardSignal</Link>
    </section></div>
  );
}

function SignalCard({ tone, signal }: { tone: "green" | "amber" | "red" | "blue"; signal: BoardSignalDesk["signals"]["green"] }) {
  return <article className={`universal-signal signal-${tone}`}><span>{signal.label}</span><h3>{signal.title}</h3><p>{signal.copy}</p></article>;
}

function EvidenceCard({ candidate, engine }: { candidate: DeskCandidate; engine?: EngineResult }) {
  const gameLabel = /^G\d+$/i.test(candidate.id)
    ? `Game ${Number(candidate.id.slice(1))}`
    : /^P\d+$/i.test(candidate.id)
      ? `Position ${Number(candidate.id.slice(1))}`
      : candidate.id;
  const evaluation = engine?.mate !== undefined
    ? engine.mate > 0 ? `Mate in ${engine.mate}` : `Mated in ${Math.abs(engine.mate)}`
    : engine?.cp !== undefined ? `${engine.cp >= 0 ? "+" : ""}${(engine.cp / 100).toFixed(2)}` : candidate.reconstruction === "legal" ? "Position" : "Game link";
  return <article><div className="evidence-eval"><span>{gameLabel}</span><strong>{evaluation}</strong></div><div><p>{candidate.reason} · {candidate.playerColor}</p><h3>vs {candidate.opponent}</h3><p>{candidate.reconstruction === "legal" ? "This position supports the guidance above." : "Open the game to see the moment in context."}</p></div><a href={candidate.gameUrl} target="_blank" rel="noreferrer" className="button button-outline">Open game <ExternalLink size={15} /></a></article>;
}
