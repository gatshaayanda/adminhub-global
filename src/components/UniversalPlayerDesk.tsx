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
import { findSeedCadence, findSeededDesk } from "@/data/seededDesks";
import { applyEngineInterpretation, finalizeEngineResult } from "@/lib/boardsignal/interpretation";
import { validateDeskForPublication } from "@/lib/boardsignal/quality";
import type { BoardSignalDesk, DeskApiResponse, DeskCandidate, DeskEngineResult } from "@/lib/boardsignal/types";

export default function UniversalPlayerDesk({ requestedUsername, mode = "live" }: { requestedUsername: string; mode?: "seed" | "live" }) {
  const seeded = useMemo(() => findSeededDesk(requestedUsername), [requestedUsername]);
  const cadenceAnchor = useMemo(() => findSeedCadence(requestedUsername), [requestedUsername]);
  const [desk, setDesk] = useState<BoardSignalDesk | null>(mode === "seed" ? seeded ?? null : null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(mode === "live");
  const [noActivity, setNoActivity] = useState("");
  const [engineResults, setEngineResults] = useState<Record<string, DeskEngineResult>>({});

  useEffect(() => {
    let active = true;
    if (mode === "seed") {
      setDesk(seeded ?? null);
      setError(seeded ? "" : "A full approved historical Desk has not been loaded for this player yet.");
      setLoading(false);
      return () => { active = false; };
    }
    setDesk(null);
    setError("");
    setNoActivity("");
    setLoading(true);
    const anchor = cadenceAnchor ? `?anchorStart=${encodeURIComponent(cadenceAnchor)}` : "";

    fetch(`/api/boardsignal/${encodeURIComponent(requestedUsername)}${anchor}`, { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json() as DeskApiResponse }))
      .then(({ response, body }) => {
        if (!active) return;
        if (!response.ok || !body.ok) throw new Error(body.ok ? "BoardSignal could not build this Desk." : body.error);
        setDesk(body.desk);
      })
      .catch((reason) => {
        if (!active) return;
        const message = reason instanceof Error ? reason.message : "BoardSignal could not build this Desk.";
        if (message.startsWith("No games were played")) setNoActivity(message);
        else setError(message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [requestedUsername, mode, seeded, cadenceAnchor]);

  useEffect(() => {
    if (!desk || desk.source !== "live") return;
    const candidates = desk.candidates.filter((candidate) => candidate.fenBefore ?? candidate.fen);
    if (!candidates.length) {
      return;
    }

    const failCandidates = (items: DeskCandidate[], reason: string) => {
      setEngineResults((values) => {
        const next = { ...values };
        for (const candidate of items) {
          next[candidate.id] = { id: candidate.id, depth: 0, status: "failed", failureReason: reason };
        }
        return next;
      });
    };

    if (!window.crossOriginIsolated || typeof Worker === "undefined") {
      failCandidates(candidates, "Browser isolation required by the on-device engine was unavailable.");
      return;
    }

    const worker = new Worker("/stockfish/engine-worker.js");
    type EngineTask = { candidate: DeskCandidate; phase: "before" | "after"; fen: string };
    const tasks: EngineTask[] = candidates.flatMap((candidate) => {
      const before = candidate.fenBefore ?? candidate.fen;
      if (!before) return [];
      return [
        { candidate, phase: "before" as const, fen: before },
        ...(candidate.fenAfter ? [{ candidate, phase: "after" as const, fen: candidate.fenAfter }] : []),
      ];
    });
    const partial = new Map<string, DeskEngineResult>();
    let queueIndex = 0;
    let current: EngineTask | undefined;
    let latest: { depth: number; cp?: number; mate?: number; bestMove?: string } | undefined;
    let taskTimer: ReturnType<typeof setTimeout> | undefined;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    let waitingForStop = false;

    const clearTaskTimer = () => {
      if (taskTimer) clearTimeout(taskTimer);
      taskTimer = undefined;
    };

    const failCurrent = (reason: string) => {
      if (!current) return;
      clearTaskTimer();
      const failedCandidate = current.candidate;
      partial.set(failedCandidate.id, { id: failedCandidate.id, depth: latest?.depth ?? 0, status: "failed", failureReason: reason });
      setEngineResults((values) => ({
        ...values,
        [failedCandidate.id]: { id: failedCandidate.id, depth: latest?.depth ?? 0, status: "failed", failureReason: reason },
      }));
      while (queueIndex < tasks.length && tasks[queueIndex].candidate.id === failedCandidate.id) queueIndex += 1;
      current = undefined;
      latest = undefined;
      waitingForStop = true;
      worker.postMessage("stop");
      stopTimer = setTimeout(() => {
        worker.terminate();
        const remainingIds = new Set(tasks.slice(queueIndex).map((task) => task.candidate.id));
        failCandidates(candidates.filter((candidate) => remainingIds.has(candidate.id)), "The on-device chess engine could not recover after a timed-out position.");
      }, 3_000);
    };

    const beginNext = () => {
      clearTaskTimer();
      current = tasks[queueIndex];
      latest = current ? { depth: 0 } : undefined;
      if (!current) {
        worker.terminate();
        return;
      }
      worker.postMessage(`position fen ${current.fen}`);
      worker.postMessage("go depth 14");
      taskTimer = setTimeout(() => failCurrent("The selected position exceeded the on-device analysis time limit."), 20_000);
    };

    const bootTimer = setTimeout(() => {
      worker.terminate();
      failCandidates(candidates, "The on-device chess engine did not start in time.");
    }, 20_000);

    const normalized = (raw: number, fen: string, playerColor: DeskCandidate["playerColor"]) => {
      const activeColor = fen.split(" ")[1] === "w" ? "white" : "black";
      return raw * (playerColor === activeColor ? 1 : -1);
    };

    worker.onmessage = (event: MessageEvent<string>) => {
      const line = String(event.data);
      if (line.startsWith("bestmove") && waitingForStop) {
        waitingForStop = false;
        if (stopTimer) clearTimeout(stopTimer);
        stopTimer = undefined;
        beginNext();
        return;
      }
      if (line === "boardsignal-engine-ready") {
        if (bootTimer) clearTimeout(bootTimer);
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
        latest = {
          depth,
          ...(cpRaw ? { cp: normalized(Number(cpRaw), current.fen, current.candidate.playerColor) } : {}),
          ...(mateRaw ? { mate: normalized(Number(mateRaw), current.fen, current.candidate.playerColor) } : {}),
        };
      }
      if (line.startsWith("bestmove") && current && latest) {
        clearTaskTimer();
        const bestMove = line.match(/^bestmove\s+(\S+)/)?.[1];
        const previous = partial.get(current.candidate.id) ?? { id: current.candidate.id, depth: 0 };
        const next: DeskEngineResult = current.phase === "before"
          ? { ...previous, depth: Math.max(previous.depth, latest.depth), beforeCp: latest.cp, beforeMate: latest.mate, bestMove }
          : { ...previous, depth: Math.max(previous.depth, latest.depth), afterCp: latest.cp, afterMate: latest.mate };
        partial.set(current.candidate.id, next);
        const needsAfter = Boolean(current.candidate.fenAfter);
        if (current.phase === "after" || !needsAfter) {
          const final = finalizeEngineResult(current.candidate, next);
          setEngineResults((values) => ({ ...values, [current!.candidate.id]: final }));
        }
        queueIndex += 1;
        beginNext();
      }
    };

    worker.onerror = () => {
      clearTaskTimer();
      if (bootTimer) clearTimeout(bootTimer);
      if (stopTimer) clearTimeout(stopTimer);
      worker.terminate();
      const remainingIds = new Set(tasks.slice(queueIndex).map((task) => task.candidate.id));
      failCandidates(candidates.filter((candidate) => remainingIds.has(candidate.id)), "The on-device chess engine stopped unexpectedly.");
    };

    return () => {
      clearTaskTimer();
      if (bootTimer) clearTimeout(bootTimer);
      if (stopTimer) clearTimeout(stopTimer);
      worker.terminate();
    };
  }, [desk]);

  useEffect(() => {
    if (!desk || desk.source !== "live" || typeof window === "undefined") return;
    const interpreted = applyEngineInterpretation(desk, engineResults);
    if (!interpreted.complete) return;
    const quality = validateDeskForPublication(interpreted.desk, engineResults);
    if (quality.status !== "PASS") return;
    const playerKey = desk.player.playerId ?? desk.player.username.toLowerCase();
    const storageKey = `boardsignal:desks:${playerKey}`;
    try {
      const existing = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as BoardSignalDesk[];
      const next = [interpreted.desk, ...existing.filter((item) => item.episodeKey !== interpreted.desk.episodeKey)]
        .sort((a, b) => b.period.end.localeCompare(a.period.end))
        .slice(0, 4);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Device storage is a convenience cache; a completed Desk remains usable without it.
    }
  }, [desk, engineResults]);

  if (loading) return <DeskLoading username={requestedUsername} />;
  if (noActivity && !desk) return <DeskNoActivity username={requestedUsername} message={noActivity} />;
  if (error || !desk) return <DeskError username={requestedUsername} error={error} />;

  const interpretation = desk.source === "live" ? applyEngineInterpretation(desk, engineResults) : { desk, complete: true, reviewed: desk.candidates.length, total: desk.candidates.length };
  const shown = interpretation.desk;
  if (desk.source === "live" && desk.candidates.length && !interpretation.complete) {
    return <DeskAnalysisProgress username={desk.player.username} reviewed={interpretation.reviewed} total={interpretation.total} />;
  }
  const quality = validateDeskForPublication(shown, engineResults);
  if (quality.status === "FAIL") {
    return <DeskQualityHold username={desk.player.username} codes={quality.codes} />;
  }
  const hasPositions = shown.candidates.some((candidate) => candidate.fen || candidate.gameUrl);

  return (
    <div id="main" className="universal-desk-page">
      <section className="container universal-desk-shell">
        <header className="universal-player-bar">
          <div className="universal-avatar">{shown.player.username.slice(0, 2).toUpperCase()}</div>
          <div><span>Chess.com account</span><h1>{shown.player.username}</h1><p>{shown.primaryPool} · {shown.period.label}</p></div>
          <div className="private-access"><LockKeyhole size={16} /> {shown.source === "live" ? "Live generated Desk" : "Example Desk"}</div>
        </header>

        {shown.period.isLastActive ? (
          <div className="last-active-banner"><AlertTriangle size={18} /><div><strong>This is the last active week—not current form.</strong><p>The latest completed period was {shown.period.latestCompletedLabel}; BoardSignal searched backward through fixed seven-day episodes.</p></div></div>
        ) : null}
        {noActivity ? <div className="last-active-banner"><ShieldCheck size={18} /><div><strong>No new Desk was created.</strong><p>{noActivity} Your previous Desk remains available.</p></div></div> : null}

        <section className="universal-cover">
          <div className="universal-cover-copy">
            <span className="live-pill">{shown.source === "live" ? "Your live Desk" : "Historical founding-beta coverage"}</span>
            <p className="kicker">{shown.period.label} · {shown.games} games</p>
            <h2>{shown.headline}</h2>
            <p>{shown.summary}</p>
            <div className="lead-actions">
              <a href="#replay" className="button button-lime">Understand my week <ArrowRight size={17} /></a>
              <a href="#signals" className="button button-glass">Go to my signals</a>
            </div>
          </div>
          <div className="universal-score-card">
            <span>Week at a glance</span>
            <strong>{shown.wins}W · {shown.draws}D · {shown.losses}L</strong>
            <p>{shown.score.toFixed(1)}% score</p>
            <div><span>Longest runs</span><b>{shown.longestWinStreak}W · {shown.longestLossStreak}L</b></div>
          </div>
        </section>

        <nav className="desk-chapter-nav" aria-label="Player Desk chapters">
          <a href="#replay">My week</a>
          <a href="#pools">Ratings & pools</a>
          <a href="#signals">My signals</a>
          {hasPositions ? <a href="#evidence">My evidence</a> : null}
        </nav>

        <section className="universal-metrics" aria-label="Desk facts">
          <div><span>Games</span><strong>{shown.games}</strong></div>
          <div><span>Sessions</span><strong>{shown.sessions ?? "—"}</strong></div>
          <div><span>Checkmate wins</span><strong>{shown.checkmateWins ?? "—"}</strong></div>
          <div><span>Primary pool</span><strong>{shown.primaryPool}</strong></div>
        </section>

        <section className="universal-section" id="replay">
          <div className="universal-section-heading"><span>01</span><div><p className="kicker">The Replay</p><h2>How the week moved.</h2></div></div>
          {shown.replay ? <div className="replay-narrative"><span>{shown.replay.shape.replaceAll("_", " ")}</span><h3>{shown.replay.title}</h3><p>{shown.replay.narrative}</p></div> : null}
          {shown.days.length ? (
            <div className="universal-timeline">
              {shown.days.map((day) => (
                <article className={day.wins > day.losses ? "positive" : day.losses > day.wins ? "negative" : "neutral"} key={day.date}>
                  <span>{day.label}</span><strong>{day.wins}W · {day.draws}D · {day.losses}L</strong>{day.ratingChange !== undefined ? <small>{shown.primaryPool} {day.ratingChange >= 0 ? "+" : ""}{day.ratingChange}</small> : null}
                </article>
              ))}
            </div>
          ) : <div className="section-empty"><strong>Your week in one view</strong><p>{shown.summary}</p></div>}
          <div className="replay-callouts">
            <div><Sparkles /><span>Positive run</span><strong>{shown.longestWinStreak || "See Green Signal"}</strong><p>{shown.longestWinStreak ? "consecutive wins" : shown.signals.green.title}</p></div>
            <div><BarChart3 /><span>Watch run</span><strong>{shown.longestLossStreak || "See Amber Signal"}</strong><p>{shown.longestLossStreak ? "consecutive losses" : shown.signals.amber.title}</p></div>
          </div>
        </section>

        {shown.turningPoint ? <section className="universal-section" id="turning-point">
          <div className="universal-section-heading"><span>02</span><div><p className="kicker">Turning point</p><h2>{shown.turningPoint.title}</h2><p>{shown.turningPoint.copy}</p></div></div>
        </section> : null}

        <section className="universal-section" id="pools">
          <div className="universal-section-heading"><span>{shown.turningPoint ? "03" : "02"}</span><div><p className="kicker">Ratings and pools</p><h2>Each time class gets its own rating story.</h2></div></div>
          <div className="pool-table">
            {shown.pools.map((pool) => (
              <article key={pool.pool}>
                <div><span>Pool</span><strong>{pool.pool}</strong></div>
                <div><span>Games</span><strong>{pool.games}</strong></div>
                <div><span>Record</span><strong>{pool.record}</strong></div>
                <div><span>Recorded rating</span><strong>{pool.firstRecordedRating !== undefined ? `${pool.firstRecordedRating} → ${pool.lastRecordedRating} (${(pool.change ?? pool.lastRecordedRating! - pool.firstRecordedRating) >= 0 ? "+" : ""}${pool.change ?? pool.lastRecordedRating! - pool.firstRecordedRating})` : "Not available"}</strong><small>{pool.peak !== undefined ? `High ${pool.peak} · Low ${pool.low}` : ""}</small></div>
              </article>
            ))}
          </div>
          <div className="desk-fact-grid">
            {shown.colorRecords ? <article><span>By colour</span><strong>White {shown.colorRecords.white.record}</strong><p>Black {shown.colorRecords.black.record}</p></article> : null}
            {shown.gameLength ? <article><span>Game length</span><strong>Median {shown.gameLength.medianMoves} moves</strong><p>Average {shown.gameLength.averageMoves} · Range {shown.gameLength.shortestMoves}–{shown.gameLength.longestMoves}</p></article> : null}
            {shown.sessionDetails ? <article><span>Sessions</span><strong>{shown.sessionDetails.length} identified</strong><p>30-minute gap rule · best session included {Math.max(0, ...shown.sessionDetails.map((session) => session.wins))} wins</p></article> : null}
            {shown.clockEvidence ? <article><span>Clock evidence</span><strong>{shown.clockEvidence.gamesWithClockData} of {shown.clockEvidence.totalGames} games</strong><p>Only usable clock tags can support time guidance.</p></article> : null}
          </div>
          {shown.terminations?.length || shown.openings.length ? <div className="desk-detail-columns">
            <div><span>Terminations</span>{shown.terminations?.slice(0, 6).map((item) => <p key={item.type}><strong>{item.games}</strong> {item.type}</p>)}</div>
            <div><span>Most played openings</span>{shown.openings.slice(0, 5).map((item) => <p key={item.name}><strong>{item.games}</strong> {item.name}</p>)}</div>
          </div> : null}
        </section>

        <section className="universal-section" id="signals">
          <div className="universal-section-heading"><span>{shown.turningPoint ? "04" : "03"}</span><div><p className="kicker">My Signal Board</p><h2>What to preserve, monitor and fix first.</h2></div></div>
          {shown.source === "live" && !interpretation.complete ? <p className="helper-copy">Comparing {interpretation.reviewed} of {interpretation.total} selected positions. Red and Blue appear only after the evidence is complete.</p> : null}
          <div className="universal-signal-grid">
            <SignalCard tone="green" signal={shown.signals.green} />
            <SignalCard tone="amber" signal={shown.signals.amber} />
            <SignalCard tone="red" signal={shown.signals.red} />
            <SignalCard tone="blue" signal={shown.signals.blue} />
          </div>
        </section>

        {hasPositions ? <section className="universal-section" id="evidence">
          <div className="universal-section-heading"><span>{shown.turningPoint ? "05" : "04"}</span><div><p className="kicker">The evidence</p><h2>Open the games behind the guidance.</h2></div></div>
          <div className="universal-evidence-list">
            {shown.candidates.map((candidate) => <EvidenceCard key={candidate.id} candidate={candidate} engine={engineResults[candidate.id]} />)}
          </div>
        </section> : null}

        {shown.pocketCard ? <section className="universal-section pocket-card"><p className="kicker">Pocket card</p><h2>{shown.pocketCard}</h2></section> : null}

        <section className="desk-caveats">
          <ShieldCheck size={20} />
          <div><strong>Evidence notes</strong><ul>{shown.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul></div>
        </section>

      </section>
    </div>
  );
}

function DeskLoading({ username }: { username: string }) {
  return (
    <div id="main" className="desk-processing-page"><section className="container desk-processing-card">
      <div className="processing-orb"><LoaderCircle /></div><p className="kicker">Building your live Desk</p><h1>{username}</h1><p>Keep this tab open while BoardSignal retrieves the public games and establishes the fixed seven-day period.</p>
      <div className="processing-stages" aria-live="polite">
        <div className="active"><LoaderCircle className="spin" /><p>Getting games and confirming the seven-day period</p></div>
        <div><span aria-hidden="true" /><p>Reading the factual week</p></div>
        <div><span aria-hidden="true" /><p>Finding important moments</p></div>
        <div><span aria-hidden="true" /><p>Checking key positions</p></div>
        <div><span aria-hidden="true" /><p>Validating the finished Desk</p></div>
      </div>
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

function DeskNoActivity({ username, message }: { username: string; message: string }) {
  return (
    <div id="main" className="desk-processing-page"><section className="container desk-processing-card">
      <ShieldCheck /><p className="kicker">No new Desk this period</p><h1>{username}</h1><p>{message}</p><p>No populated Desk was invented and no historical seed was substituted for live processing.</p><Link href="/" className="text-link">Return to BoardSignal</Link>
    </section></div>
  );
}

function DeskAnalysisProgress({ username, reviewed, total }: { username: string; reviewed: number; total: number }) {
  return (
    <div id="main" className="desk-processing-page"><section className="container desk-processing-card">
      <div className="processing-orb"><LoaderCircle /></div><p className="kicker">Covering your week</p><h1>{username}</h1><p>Keep this tab open. The on-device engine has reviewed {reviewed} of {total} selected positions.</p>
      <div className="processing-stages" aria-live="polite">
        <div className="done"><ShieldCheck /><p>Player, games and period confirmed</p></div>
        <div className="done"><ShieldCheck /><p>Facts, pools, timeline and candidates calculated</p></div>
        <div className="active"><LoaderCircle className="spin" /><p>Checking key positions ({reviewed}/{total})</p></div>
        <div><span aria-hidden="true" /><p>Building Replay and Signal Board</p></div>
        <div><span aria-hidden="true" /><p>Validating the finished Desk</p></div>
      </div>
    </section></div>
  );
}

function DeskQualityHold({ username, codes }: { username: string; codes: string[] }) {
  const engineUnavailable = codes.includes("ENGINE_REVIEW_UNAVAILABLE") || codes.includes("ENGINE_REVIEW_INCOMPLETE");
  return (
    <div id="main" className="desk-processing-page"><section className="container desk-processing-card error-card">
      <ShieldCheck /><p className="kicker">We could not finish this Desk</p><h1>{username}</h1><p>{engineUnavailable ? "The on-device position review did not complete, so BoardSignal withheld the Desk instead of publishing unsupported guidance." : "This episode did not clear BoardSignal's evidence checks, so no diagnosis has been published."}</p>
      <div className="processing-stages"><div className="done"><ShieldCheck /><p>Player, games, period and factual week completed</p></div><div className="active"><AlertTriangle /><p>{engineUnavailable ? "Position analysis needs attention" : "Final evidence validation needs attention"}</p></div></div>
      <p className="quality-reference">Check: {codes.join(" · ")}</p><div className="quality-actions"><button type="button" className="button button-lime" onClick={() => window.location.reload()}>Retry analysis</button><Link href="/" className="text-link">Return to BoardSignal</Link></div>
    </section></div>
  );
}

function SignalCard({ tone, signal }: { tone: "green" | "amber" | "red" | "blue"; signal: BoardSignalDesk["signals"]["green"] }) {
  return <article className={`universal-signal signal-${tone} ${signal.status === "withheld" ? "signal-withheld" : ""}`}><span>{signal.label}</span><h3>{signal.title}</h3><p>{signal.copy}</p><small>{signal.status === "withheld" ? "Evidence threshold not met" : signal.evidenceIds?.length ? `${signal.evidenceIds.length} linked evidence position${signal.evidenceIds.length === 1 ? "" : "s"}` : "Supported by the factual week"}</small></article>;
}

function EvidenceCard({ candidate, engine }: { candidate: DeskCandidate; engine?: DeskEngineResult }) {
  const gameLabel = /^G\d+$/i.test(candidate.id)
    ? `Game ${Number(candidate.id.slice(1))}`
    : /^P\d+$/i.test(candidate.id)
      ? `Position ${Number(candidate.id.slice(1))}`
      : candidate.id;
  const value = engine?.status === "failed" ? "Unavailable" : engine?.beforeMate !== undefined
    ? engine.beforeMate > 0 ? `Mate in ${engine.beforeMate}` : `Mated in ${Math.abs(engine.beforeMate)}`
    : engine?.beforeCp !== undefined ? `${engine.beforeCp >= 0 ? "+" : ""}${(engine.beforeCp / 100).toFixed(2)}` : candidate.reconstruction === "legal" ? "Position" : "Game link";
  const swing = engine?.status === "failed" ? engine.failureReason ?? "Position review failed" : engine?.evaluationLossCp !== undefined && engine.evaluationLossCp >= 100
    ? `${(engine.evaluationLossCp / 100).toFixed(2)} evaluation swing`
    : engine?.bestMoveSan ? `Stronger: ${engine.bestMoveSan}` : "Reviewed position";
  return <article><div className="evidence-eval"><span>{gameLabel}</span><strong>{value}</strong></div><div><p>{candidate.reason} · {candidate.playerColor}</p>{candidate.opponent ? <h3>vs {candidate.opponent}</h3> : null}<p>{swing}</p></div><a href={candidate.gameUrl} target="_blank" rel="noreferrer" className="button button-outline">Open game <ExternalLink size={15} /></a></article>;
}
