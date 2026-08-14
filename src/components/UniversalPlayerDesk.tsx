"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { PrivateUniverseSections } from "@/components/UniverseRecognition";
import { findSeedCadence, findSeededDesk } from "@/data/seededDesks";
import { foundingBetaField } from "@/data/universeField";
import { applyEngineInterpretation, finalizeEngineResult } from "@/lib/boardsignal/interpretation";
import { factualReviewToRetryDesk, type FactualReviewDraft } from "@/lib/boardsignal/factualReview";
import { validateDeskForPublication } from "@/lib/boardsignal/quality";
import { buildDeskReturnLoop, buildPlayerUniverseView } from "@/lib/boardsignal/universe";
import type {
  BoardSignalDesk,
  DeskApiResponse,
  DeskCandidate,
  DeskEngineResult,
  EngineDiagnostic,
  EngineDiagnosticCode,
} from "@/lib/boardsignal/types";

const ENGINE_JS_URL = "/stockfish/stockfish-18-lite-single.js";
const ENGINE_WASM_URL = "/stockfish/stockfish-18-lite-single.wasm";
const ENGINE_DEPTH = 11;
const DESK_CACHE_VERSION = "v1";
const MAX_AUTO_ENGINE_RECOVERY_PASSES = 1;
const NON_RETRYABLE_ENGINE_CODES = new Set<EngineDiagnosticCode>(["ENGINE_UNSUPPORTED", "ENGINE_ASSET_404"]);
const EMPTY_ENGINE_RESULTS: Record<string, DeskEngineResult> = {};

type EngineRecoveryState = "idle" | "checking" | "auto-retrying" | "manual" | "blocked";

function storedDeskKey(username: string) {
  return `boardsignal:desks:${DESK_CACHE_VERSION}:${username.toLowerCase()}`;
}

function legacyStoredDeskKey(username: string) {
  return `boardsignal:desks:${username.toLowerCase()}`;
}

function readStoredDesks(username: string) {
  if (typeof window === "undefined") return [];
  const normalized = username.toLowerCase();
  const collected = new Map<string, BoardSignalDesk>();
  const inspect = (raw: string | null) => {
    if (!raw) return;
    try {
      const desks = JSON.parse(raw) as BoardSignalDesk[];
      for (const item of desks) {
        if (item.source === "live" && item.player.username.toLowerCase() === normalized) {
          collected.set(item.episodeKey ?? `${item.period.start}:${item.period.end}`, item);
        }
      }
    } catch {
      // A malformed convenience cache never changes Desk generation.
    }
  };
  inspect(window.localStorage.getItem(storedDeskKey(username)));
  inspect(window.localStorage.getItem(legacyStoredDeskKey(username)));
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("boardsignal:desks:") && key !== storedDeskKey(username) && key !== legacyStoredDeskKey(username)) {
      inspect(window.localStorage.getItem(key));
    }
  }
  return [...collected.values()].sort((a, b) => b.period.end.localeCompare(a.period.end)).slice(0, 4);
}

type UniversalPlayerDeskProps = {
  requestedUsername: string;
  mode?: "seed" | "live";
  ownerToken?: string;
  onDeskPublished?: (desk: BoardSignalDesk, engineResults: Record<string, DeskEngineResult>) => Promise<void>;
  onFactualReviewReady?: (desk: BoardSignalDesk) => Promise<void>;
  pendingFactualReview?: FactualReviewDraft;
  publishedDesk?: BoardSignalDesk;
  publishedEngineResults?: Record<string, DeskEngineResult>;
};

export default function UniversalPlayerDesk({
  requestedUsername,
  mode = "live",
  ownerToken,
  onDeskPublished,
  onFactualReviewReady,
  pendingFactualReview,
  publishedDesk,
  publishedEngineResults = EMPTY_ENGINE_RESULTS,
}: UniversalPlayerDeskProps) {
  const isPublishedView = Boolean(publishedDesk);
  const isPendingFactualView = Boolean(pendingFactualReview) && !isPublishedView;
  const seeded = useMemo(() => findSeededDesk(requestedUsername), [requestedUsername]);
  const cadenceAnchor = useMemo(() => findSeedCadence(requestedUsername), [requestedUsername]);
  const pendingDesk = useMemo(() => pendingFactualReview ? factualReviewToRetryDesk(pendingFactualReview) : undefined, [pendingFactualReview]);
  const [desk, setDesk] = useState<BoardSignalDesk | null>(publishedDesk ?? pendingDesk ?? (mode === "seed" ? seeded ?? null : null));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(mode === "live" && !isPublishedView);
  const [noActivity, setNoActivity] = useState("");
  const [engineResults, setEngineResults] = useState<Record<string, DeskEngineResult>>(publishedEngineResults);
  const [engineDiagnostic, setEngineDiagnostic] = useState<EngineDiagnostic | null>(null);
  const [engineAttempt, setEngineAttempt] = useState(0);
  const [storedDesks, setStoredDesks] = useState<BoardSignalDesk[]>([]);
  const [persistenceError, setPersistenceError] = useState("");
  const [analysisEnabled, setAnalysisEnabled] = useState(!isPendingFactualView);
  const [factualReviewDurable, setFactualReviewDurable] = useState(isPendingFactualView);
  const [retryCandidateIds, setRetryCandidateIds] = useState<string[] | null>(null);
  const [recoveryState, setRecoveryState] = useState<EngineRecoveryState>(isPendingFactualView ? "manual" : "checking");
  const autoRecoveryPasses = useRef(0);
  const persistenceAttempts = useRef(new Set<string>());

  useEffect(() => {
    if (mode === "live" && !isPublishedView) setStoredDesks(readStoredDesks(requestedUsername));
  }, [mode, requestedUsername, isPublishedView]);

  useEffect(() => {
    let active = true;
    if (publishedDesk) {
      setDesk(publishedDesk);
      setEngineResults(publishedEngineResults);
      setAnalysisEnabled(false);
      setFactualReviewDurable(false);
      setRetryCandidateIds(null);
      setRecoveryState("idle");
      autoRecoveryPasses.current = 0;
      setError("");
      setNoActivity("");
      setLoading(false);
      return () => { active = false; };
    }
    if (pendingFactualReview && pendingDesk) {
      setDesk(pendingDesk);
      setEngineResults({});
      setEngineDiagnostic(null);
      setAnalysisEnabled(false);
      setFactualReviewDurable(true);
      setRetryCandidateIds(null);
      setRecoveryState("manual");
      autoRecoveryPasses.current = 0;
      setPersistenceError("");
      setError("");
      setNoActivity("");
      setLoading(false);
      return () => { active = false; };
    }
    if (mode === "seed") {
      setDesk(seeded ?? null);
      setError(seeded ? "" : "A full approved historical Desk has not been loaded for this player yet.");
      setLoading(false);
      return () => { active = false; };
    }
    setDesk(null);
    setError("");
    setNoActivity("");
    setEngineResults({});
    setEngineDiagnostic(null);
    setEngineAttempt(0);
    setAnalysisEnabled(true);
    setFactualReviewDurable(false);
    setRetryCandidateIds(null);
    setRecoveryState("checking");
    autoRecoveryPasses.current = 0;
    setPersistenceError("");
    setLoading(true);
    const anchor = cadenceAnchor ? `?anchorStart=${encodeURIComponent(cadenceAnchor)}` : "";

    fetch(`/api/boardsignal/${encodeURIComponent(requestedUsername)}${anchor}`, { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json() as DeskApiResponse }))
      .then(async ({ response, body }) => {
        if (!active) return;
        if (!response.ok || !body.ok) throw new Error(body.ok ? "BoardSignal could not build this Desk." : body.error);
        if (ownerToken && onFactualReviewReady) {
          try {
            await onFactualReviewReady(body.desk);
            if (active) {
              setFactualReviewDurable(true);
              setPersistenceError("");
            }
          } catch (reason) {
            if (active) setPersistenceError(reason instanceof Error ? reason.message : "Your factual week is available in this session, but BoardSignal could not save it for return yet.");
          }
        }
        if (active) setDesk(body.desk);
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
  }, [requestedUsername, mode, seeded, cadenceAnchor, publishedDesk, publishedEngineResults, pendingFactualReview, pendingDesk, ownerToken, onFactualReviewReady]);

  useEffect(() => {
    if (!desk || desk.source !== "live" || isPublishedView || !analysisEnabled) return;
    const retrySet = retryCandidateIds ? new Set(retryCandidateIds) : undefined;
    const candidates = desk.candidates.filter((candidate) => (candidate.fenBefore ?? candidate.fen) && (!retrySet || retrySet.has(candidate.id)));
    if (!candidates.length) return;

    let cancelled = false;
    let worker: Worker | undefined;
    let bootTimer: ReturnType<typeof setTimeout> | undefined;
    let taskTimer: ReturnType<typeof setTimeout> | undefined;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;

    const userAgentCategory = (): EngineDiagnostic["userAgentCategory"] => {
      const userAgent = navigator.userAgent;
      if (/Android/i.test(userAgent)) return "android";
      if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
      if (/Mobile/i.test(userAgent)) return "mobile";
      return userAgent ? "desktop" : "unknown";
    };

    const diagnostic = (
      code: EngineDiagnosticCode,
      stage: EngineDiagnostic["stage"],
      consumerMessage: string,
      details: Partial<EngineDiagnostic> = {},
    ): EngineDiagnostic => ({
      code,
      stage,
      consumerMessage,
      workerSupported: typeof Worker !== "undefined",
      webAssemblySupported: typeof WebAssembly !== "undefined",
      crossOriginIsolated: window.crossOriginIsolated,
      userAgentCategory: userAgentCategory(),
      attempt: engineAttempt + 1,
      timestamp: new Date().toISOString(),
      ...details,
    });

    const recordDiagnostic = (item: EngineDiagnostic) => {
      if (cancelled) return;
      setEngineDiagnostic(item);
      console.error("[BoardSignal engine]", item);
    };

    const failCandidates = (items: DeskCandidate[], item: EngineDiagnostic) => {
      if (cancelled) return;
      recordDiagnostic(item);
      setEngineResults((values) => {
        const next = { ...values };
        for (const candidate of items) {
          next[candidate.id] = {
            id: candidate.id,
            depth: 0,
            status: "failed",
            failureReason: item.consumerMessage,
            failureCode: item.code,
            diagnostic: item,
          };
        }
        return next;
      });
    };

    if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
      failCandidates(candidates, diagnostic(
        "ENGINE_UNSUPPORTED",
        "capability",
        "Position analysis is not supported by this browser.",
        { detail: "A Web Worker and WebAssembly are both required. Cross-origin isolation is not required by the selected engine." },
      ));
      return;
    }

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
    let waitingForStop = false;

    const clearBootTimer = () => {
      if (bootTimer) clearTimeout(bootTimer);
      bootTimer = undefined;
    };

    const clearTaskTimer = () => {
      if (taskTimer) clearTimeout(taskTimer);
      taskTimer = undefined;
    };

    const failCurrent = () => {
      if (!current) return;
      clearTaskTimer();
      const failedCandidate = current.candidate;
      const item = diagnostic(
        "ENGINE_POSITION_TIMEOUT",
        "position",
        "One selected position exceeded the on-device analysis time limit.",
        { assetUrl: ENGINE_JS_URL, detail: `Candidate ${failedCandidate.id} did not return bestmove at depth ${ENGINE_DEPTH}.` },
      );
      const failedResult: DeskEngineResult = {
        id: failedCandidate.id,
        depth: latest?.depth ?? 0,
        status: "failed",
        failureReason: item.consumerMessage,
        failureCode: item.code,
        diagnostic: item,
      };
      recordDiagnostic(item);
      partial.set(failedCandidate.id, failedResult);
      setEngineResults((values) => ({
        ...values,
        [failedCandidate.id]: failedResult,
      }));
      while (queueIndex < tasks.length && tasks[queueIndex].candidate.id === failedCandidate.id) queueIndex += 1;
      current = undefined;
      latest = undefined;
      waitingForStop = true;
      worker?.postMessage("stop");
      stopTimer = setTimeout(() => {
        worker?.terminate();
        const remainingIds = new Set(tasks.slice(queueIndex).map((task) => task.candidate.id));
        failCandidates(candidates.filter((candidate) => remainingIds.has(candidate.id)), diagnostic(
          "ENGINE_RUNTIME_ERROR",
          "runtime",
          "Position analysis could not recover after a timed-out position.",
          { assetUrl: ENGINE_JS_URL },
        ));
      }, 3_000);
    };

    const beginNext = () => {
      clearTaskTimer();
      current = tasks[queueIndex];
      latest = current ? { depth: 0 } : undefined;
      if (!current) {
        worker?.terminate();
        return;
      }
      worker?.postMessage(`position fen ${current.fen}`);
      worker?.postMessage(`go depth ${ENGINE_DEPTH}`);
      taskTimer = setTimeout(failCurrent, 20_000);
    };

    const normalized = (raw: number, fen: string, playerColor: DeskCandidate["playerColor"]) => {
      const activeColor = fen.split(" ")[1] === "w" ? "white" : "black";
      return raw * (playerColor === activeColor ? 1 : -1);
    };

    const probeAsset = async (assetUrl: string) => {
      let response = await fetch(assetUrl, { method: "HEAD", cache: "no-store" });
      if (response.status === 405) {
        response = await fetch(assetUrl, { headers: { Range: "bytes=0-0" }, cache: "no-store" });
      }
      return response;
    };

    const startEngine = async () => {
      setEngineDiagnostic(null);
      try {
        const [jsResponse, wasmResponse] = await Promise.all([
          probeAsset(ENGINE_JS_URL),
          probeAsset(ENGINE_WASM_URL),
        ]);
        const failedAsset = !jsResponse.ok ? { url: ENGINE_JS_URL, status: jsResponse.status } : !wasmResponse.ok ? { url: ENGINE_WASM_URL, status: wasmResponse.status } : undefined;
        if (failedAsset) {
          failCandidates(candidates, diagnostic(
            failedAsset.status === 404 ? "ENGINE_ASSET_404" : "ENGINE_RUNTIME_ERROR",
            "asset",
            "Position analysis could not load its on-device engine files.",
            { assetUrl: failedAsset.url, detail: `Asset request returned HTTP ${failedAsset.status}.` },
          ));
          return;
        }
      } catch (reason) {
        failCandidates(candidates, diagnostic(
          "ENGINE_RUNTIME_ERROR",
          "asset",
          "Position analysis could not load its on-device engine files.",
          { assetUrl: ENGINE_JS_URL, detail: reason instanceof Error ? reason.message : String(reason) },
        ));
        return;
      }

      if (cancelled) return;
      try {
        worker = new Worker(ENGINE_JS_URL, { name: "boardsignal-stockfish-18-lite" });
      } catch (reason) {
        failCandidates(candidates, diagnostic(
          "ENGINE_WORKER_START_FAILED",
          "worker",
          "Position analysis could not start on this device.",
          { assetUrl: ENGINE_JS_URL, detail: reason instanceof Error ? reason.message : String(reason) },
        ));
        return;
      }

      worker.onmessage = (event: MessageEvent<string>) => {
        const line = String(event.data);
        if (line.startsWith("bestmove") && waitingForStop) {
          waitingForStop = false;
          if (stopTimer) clearTimeout(stopTimer);
          stopTimer = undefined;
          beginNext();
          return;
        }
        if (line === "uciok") {
          clearBootTimer();
          worker?.postMessage("setoption name Hash value 16");
          worker?.postMessage("isready");
          bootTimer = setTimeout(() => {
            worker?.terminate();
            failCandidates(candidates, diagnostic(
              "ENGINE_UCI_TIMEOUT",
              "ready",
              "Position analysis did not become ready in time.",
              { assetUrl: ENGINE_JS_URL, detail: "The engine returned uciok but not readyok." },
            ));
          }, 20_000);
          return;
        }
        if (line === "readyok") {
          clearBootTimer();
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
          const completedTask = current;
          const completedLatest = latest;
          const bestMove = line.match(/^bestmove\s+(\S+)/)?.[1];
          const previous = partial.get(completedTask.candidate.id) ?? { id: completedTask.candidate.id, depth: 0 };
          const next: DeskEngineResult = completedTask.phase === "before"
            ? { ...previous, depth: Math.max(previous.depth, completedLatest.depth), beforeCp: completedLatest.cp, beforeMate: completedLatest.mate, bestMove }
            : { ...previous, depth: Math.max(previous.depth, completedLatest.depth), afterCp: completedLatest.cp, afterMate: completedLatest.mate };
          partial.set(completedTask.candidate.id, next);
          const needsAfter = Boolean(completedTask.candidate.fenAfter);
          if (completedTask.phase === "after" || !needsAfter) {
            const final = finalizeEngineResult(completedTask.candidate, next);
            setEngineResults((values) => ({ ...values, [completedTask.candidate.id]: final }));
          }
          queueIndex += 1;
          beginNext();
        }
      };

      worker.onerror = (event: ErrorEvent) => {
        clearBootTimer();
        clearTaskTimer();
        if (stopTimer) clearTimeout(stopTimer);
        worker?.terminate();
        const looksLikeWasm = /wasm|webassembly/i.test(`${event.message} ${event.filename}`);
        const item = diagnostic(
          looksLikeWasm ? "ENGINE_WASM_LOAD_FAILED" : "ENGINE_RUNTIME_ERROR",
          looksLikeWasm ? "worker" : "runtime",
          "Position analysis could not complete.",
          {
            assetUrl: looksLikeWasm ? ENGINE_WASM_URL : ENGINE_JS_URL,
            eventMessage: event.message,
            filename: event.filename,
            lineno: event.lineno,
          },
        );
        const remainingIds = new Set(tasks.slice(queueIndex).map((task) => task.candidate.id));
        failCandidates(candidates.filter((candidate) => remainingIds.has(candidate.id)), item);
      };

      worker.postMessage("uci");
      bootTimer = setTimeout(() => {
        worker?.terminate();
        failCandidates(candidates, diagnostic(
          "ENGINE_UCI_TIMEOUT",
          "uci",
          "Position analysis did not start in time.",
          { assetUrl: ENGINE_JS_URL, detail: "The engine did not return uciok." },
        ));
      }, 20_000);
    };

    void startEngine();

    return () => {
      cancelled = true;
      clearBootTimer();
      clearTaskTimer();
      if (stopTimer) clearTimeout(stopTimer);
      worker?.terminate();
    };
  }, [desk, engineAttempt, isPublishedView, analysisEnabled, retryCandidateIds]);

  useEffect(() => {
    if (!desk || desk.source !== "live" || isPublishedView || !analysisEnabled) return;
    const reviewable = desk.candidates.filter((candidate) => candidate.fenBefore ?? candidate.fen);
    if (!reviewable.length || !reviewable.every((candidate) => Boolean(engineResults[candidate.id]))) return;

    const failed = reviewable.filter((candidate) => engineResults[candidate.id]?.status === "failed");
    if (!failed.length) {
      setRecoveryState("idle");
      return;
    }
    const retryable = failed.filter((candidate) => !NON_RETRYABLE_ENGINE_CODES.has(engineResults[candidate.id]?.failureCode as EngineDiagnosticCode));
    const blocked = failed.filter((candidate) => NON_RETRYABLE_ENGINE_CODES.has(engineResults[candidate.id]?.failureCode as EngineDiagnosticCode));
    if (!retryable.length) {
      setRecoveryState("blocked");
      setAnalysisEnabled(false);
      return;
    }
    if (autoRecoveryPasses.current >= MAX_AUTO_ENGINE_RECOVERY_PASSES) {
      setRecoveryState(blocked.length ? "blocked" : "manual");
      setAnalysisEnabled(false);
      return;
    }

    autoRecoveryPasses.current += 1;
    setRecoveryState("auto-retrying");
    const timer = window.setTimeout(() => {
      setRetryCandidateIds(retryable.map((candidate) => candidate.id));
      setEngineDiagnostic(null);
      setEngineAttempt((attempt) => attempt + 1);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [analysisEnabled, desk, engineResults, isPublishedView]);

  useEffect(() => {
    if (!desk || desk.source !== "live" || isPublishedView || typeof window === "undefined") return;
    const interpreted = applyEngineInterpretation(desk, engineResults);
    if (!interpreted.complete) return;
    const quality = validateDeskForPublication(interpreted.desk, engineResults);
    if (quality.status !== "PASS") return;
    try {
      const existing = readStoredDesks(desk.player.username);
      const next = [interpreted.desk, ...existing.filter((item) => item.episodeKey !== interpreted.desk.episodeKey)]
        .sort((a, b) => b.period.end.localeCompare(a.period.end))
        .slice(0, 4);
      const storageKeys = new Set([
        storedDeskKey(desk.player.username),
        ...(desk.player.playerId ? [`boardsignal:desks:${DESK_CACHE_VERSION}:${desk.player.playerId}`] : []),
      ]);
      for (const storageKey of storageKeys) window.localStorage.setItem(storageKey, JSON.stringify(next));
      setStoredDesks(next);
      const deskKey = interpreted.desk.episodeKey ?? `${interpreted.desk.period.start}:${interpreted.desk.period.end}`;
      if (ownerToken && onDeskPublished && !persistenceAttempts.current.has(deskKey)) {
        persistenceAttempts.current.add(deskKey);
        setPersistenceError("");
        void onDeskPublished(interpreted.desk, engineResults).catch((reason) => {
          persistenceAttempts.current.delete(deskKey);
          setPersistenceError(reason instanceof Error ? reason.message : "The completed Desk could not be saved to your Player Room.");
        });
      }
    } catch {
      // Device storage is a convenience cache; a completed Desk remains usable without it.
    }
  }, [desk, engineResults, isPublishedView, onDeskPublished, ownerToken]);

  if (loading) return <DeskLoading username={requestedUsername} />;
  if (noActivity && !desk) return <DeskNoActivity username={requestedUsername} message={noActivity} previousDesk={storedDesks[0]} />;
  if (error || !desk) return <DeskError username={requestedUsername} error={error} />;

  const retryAnalysis = () => {
    const retryableIds = desk.candidates
      .filter((candidate) => (candidate.fenBefore ?? candidate.fen) && (!engineResults[candidate.id] || engineResults[candidate.id]?.status === "failed"))
      .map((candidate) => candidate.id);
    const start = () => {
      autoRecoveryPasses.current = 0;
      setRetryCandidateIds(retryableIds.length ? retryableIds : null);
      setEngineDiagnostic(null);
      setRecoveryState("checking");
      setAnalysisEnabled(true);
      setEngineAttempt((attempt) => attempt + 1);
    };
    if (persistenceError && ownerToken && onFactualReviewReady && desk.source === "live") {
      void onFactualReviewReady(desk)
        .then(() => {
          setFactualReviewDurable(true);
          setPersistenceError("");
        })
        .catch((reason) => setPersistenceError(reason instanceof Error ? reason.message : "Your factual week is still only available in this session."))
        .finally(start);
      return;
    }
    start();
  };

  if (isPendingFactualView && !analysisEnabled) {
    return <DeskQualityHold desk={desk} codes={["ENGINE_REVIEW_INCOMPLETE"]} diagnostic={engineDiagnostic} onRetry={retryAnalysis} persistenceNotice={persistenceError} durable={factualReviewDurable} recoveryState={recoveryState} reviewed={Object.keys(engineResults).length} total={desk.candidates.length} />;
  }

  const interpretation = desk.source === "live" && !isPublishedView ? applyEngineInterpretation(desk, engineResults) : { desk, complete: true, reviewed: desk.candidates.length, total: desk.candidates.length };
  const shown = interpretation.desk;
  if (desk.source === "live" && !isPublishedView && desk.candidates.length && !interpretation.complete) {
    if (ownerToken && onFactualReviewReady) {
      return <DeskQualityHold desk={desk} codes={["ENGINE_REVIEW_INCOMPLETE"]} diagnostic={engineDiagnostic} onRetry={retryAnalysis} persistenceNotice={persistenceError} durable={factualReviewDurable} recoveryState={recoveryState} reviewed={interpretation.reviewed} total={interpretation.total} />;
    }
    return <DeskAnalysisProgress username={desk.player.username} reviewed={interpretation.reviewed} total={interpretation.total} />;
  }
  const quality = validateDeskForPublication(shown, engineResults);
  if (quality.status === "FAIL") {
    return <DeskQualityHold desk={shown} codes={quality.codes} diagnostic={engineDiagnostic} onRetry={retryAnalysis} persistenceNotice={persistenceError} durable={factualReviewDurable} recoveryState={recoveryState} reviewed={interpretation.reviewed} total={interpretation.total} />;
  }
  const hasPositions = shown.candidates.some((candidate) => candidate.fen || candidate.gameUrl);
  const universeView = shown.source === "live" ? buildPlayerUniverseView(foundingBetaField, shown) : undefined;

  return (
    <div id="main" className="universal-desk-page">
      <section className="container universal-desk-shell">
        <header className="universal-player-bar">
          <div className="universal-avatar">{shown.player.username.slice(0, 2).toUpperCase()}</div>
          <div><span>Chess.com account</span><h1>{shown.player.username}</h1><p>{shown.primaryPool} · {shown.period.label}</p></div>
          <div className="private-access"><LockKeyhole size={16} /> {isPublishedView ? "Saved Player Room Desk" : shown.source === "live" ? "Live generated Desk" : "Example Desk"}</div>
        </header>

        {shown.period.isLastActive ? (
          <div className="last-active-banner"><AlertTriangle size={18} /><div><strong>This is the last active week—not current form.</strong><p>The latest completed period was {shown.period.latestCompletedLabel}; BoardSignal searched backward through fixed seven-day episodes.</p></div></div>
        ) : null}
        {noActivity ? <div className="last-active-banner"><ShieldCheck size={18} /><div><strong>No new Desk was created.</strong><p>{noActivity} Your previous Desk remains available.</p></div></div> : null}
        {persistenceError ? <div className="last-active-banner"><AlertTriangle size={18} /><div><strong>Your Desk is complete on this device.</strong><p>{persistenceError} Reopen your Player Room to retry saving the same fixed episode.</p></div></div> : null}

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
          {universeView ? <a href="#standing">My standing</a> : null}
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

        {universeView ? <PrivateUniverseSections view={universeView} /> : null}

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

function DeskNoActivity({ username, message, previousDesk }: { username: string; message: string; previousDesk?: BoardSignalDesk }) {
  const universeView = previousDesk ? buildPlayerUniverseView(foundingBetaField, previousDesk) : undefined;
  const returnLoop = previousDesk ? buildDeskReturnLoop(previousDesk, universeView?.standings) : undefined;
  const dueLabel = returnLoop?.nextDeskDueAt
    ? new Date(`${returnLoop.nextDeskDueAt}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : undefined;
  return (
    <div id="main" className="desk-processing-page"><section className="container desk-processing-card">
      <ShieldCheck /><p className="kicker">Between Desks</p><h1>{username}</h1><p>{message}</p><p>No populated Desk was invented and no historical seed was substituted for live processing.</p>
      {returnLoop ? <div className="return-loop-grid">
        {returnLoop.previousBlue ? <article className="return-loop-blue"><span>Carry with you</span><h2>{returnLoop.previousBlue.title}</h2><p>{returnLoop.previousBlue.copy}</p><small>From your last Desk · Not graded</small></article> : null}
        {returnLoop.amberWatch ? <article className="return-loop-amber"><span>Watch</span><h2>{returnLoop.amberWatch.title}</h2><p>{returnLoop.amberWatch.copy}</p><small>Awareness only · From {returnLoop.amberWatch.sourcePeriod}</small></article> : null}
        <article className="return-loop-next"><span>Your next Desk</span><h2>{dueLabel ?? "After the next fixed period closes"}</h2><p>Your next completed Desk will judge its own evidence independently.</p></article>
      </div> : <div className="universe-empty"><p>No previous passing LIVE Desk is stored on this device, so BoardSignal has nothing truthful to carry forward.</p></div>}
      <div className="quality-actions"><Link href="/feed" className="button button-outline">Explore the Universe</Link><Link href="/" className="text-link">Return to BoardSignal</Link></div>
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

function DeskQualityHold({
  desk,
  codes,
  diagnostic,
  onRetry,
  persistenceNotice,
  durable = false,
  recoveryState = "manual",
  reviewed = 0,
  total = 0,
}: {
  desk: BoardSignalDesk;
  codes: string[];
  diagnostic: EngineDiagnostic | null;
  onRetry: () => void;
  persistenceNotice?: string;
  durable?: boolean;
  recoveryState?: EngineRecoveryState;
  reviewed?: number;
  total?: number;
}) {
  const engineUnavailable = codes.includes("ENGINE_REVIEW_UNAVAILABLE") || codes.includes("ENGINE_REVIEW_INCOMPLETE");
  if (engineUnavailable) {
    return (
      <div id="main" className="universal-desk-page">
        <section className="container universal-desk-shell">
          <header className="universal-player-bar">
            <div className="universal-avatar">{desk.player.username.slice(0, 2).toUpperCase()}</div>
            <div><span>MY BOARD SIGNAL</span><h1>{desk.player.username}</h1><p>{desk.primaryPool} · {desk.period.label}</p></div>
            <div className="private-access"><LockKeyhole size={16} /> Private factual review</div>
          </header>

          <section className="universal-cover">
            <div className="universal-cover-copy">
              <span className="live-pill">Your factual week is ready</span>
              <p className="kicker">{desk.period.label} · {desk.games} games</p>
              <h2>{desk.wins}W · {desk.draws}D · {desk.losses}L</h2>
              <p>{desk.summary}</p>
            </div>
            <div className="universal-score-card"><span>Score</span><strong>{desk.score.toFixed(1)}%</strong><small>{desk.longestWinStreak ? `Strongest run · ${desk.longestWinStreak} wins` : "Week facts saved"}</small></div>
          </section>

          <section className="universal-metrics" aria-label="Factual week summary">
            <div><span>Games</span><strong>{desk.games}</strong></div>
            <div><span>Wins</span><strong>{desk.wins}</strong></div>
            <div><span>Draws</span><strong>{desk.draws}</strong></div>
            <div><span>Losses</span><strong>{desk.losses}</strong></div>
          </section>

          {desk.pools.length ? <section className="universal-section">
            <div className="universal-section-heading"><span>01</span><div><p className="kicker">Ratings and pools</p><h2>The rating facts that are already complete.</h2></div></div>
            <div className="pool-table">{desk.pools.map((pool) => <article key={pool.pool}><div><span>Pool</span><strong>{pool.pool}</strong></div><div><span>Games</span><strong>{pool.games}</strong></div><div><span>Record</span><strong>{pool.record}</strong></div><div><span>Rating movement</span><strong>{pool.change !== undefined ? `${pool.change >= 0 ? "+" : ""}${pool.change}` : "—"}</strong></div></article>)}</div>
          </section> : null}

          {desk.days.length ? <section className="universal-section">
            <div className="universal-section-heading"><span>02</span><div><p className="kicker">The week</p><h2>Your chronology is still here.</h2></div></div>
            <div className="universal-timeline">{desk.days.map((day) => <article className={day.wins > day.losses ? "positive" : day.losses > day.wins ? "negative" : "neutral"} key={day.date}><span>{day.label}</span><strong>{day.wins}W · {day.draws}D · {day.losses}L</strong>{day.ratingChange !== undefined ? <small>{desk.primaryPool} {day.ratingChange >= 0 ? "+" : ""}{day.ratingChange}</small> : null}</article>)}</div>
          </section> : null}

          <section className="universal-section">
            {persistenceNotice ? <div className="last-active-banner"><AlertTriangle size={18} /><div><strong>This factual review is still open in this session.</strong><p>{persistenceNotice}</p></div></div> : null}
            <div className="last-active-banner"><LoaderCircle size={18} /><div><strong>Your week is ready. Position review is finishing.</strong><p>{recoveryState === "auto-retrying" ? "Everything below is already confirmed from your games. BoardSignal is retrying the position check before adding final improvement guidance." : recoveryState === "checking" ? "Everything below is already confirmed from your games. BoardSignal is checking the selected positions before adding final improvement guidance." : recoveryState === "blocked" && diagnostic?.code === "ENGINE_UNSUPPORTED" ? "Everything below is already confirmed from your games. This browser cannot run the position check, so BoardSignal is keeping the factual review safe without adding unsupported guidance." : recoveryState === "blocked" && diagnostic?.code === "ENGINE_ASSET_404" ? "Everything below is already confirmed from your games. The position-review file is unavailable right now, so BoardSignal is keeping the factual review safe without pointlessly retrying it." : "Everything below is already confirmed from your games. Position-based guidance remains withheld until the existing evidence checks pass."}</p>{total ? <small>{reviewed} of {total} selected positions checked on this visit.</small> : null}</div></div>
            <p className="quality-reference">Position check: {codes.join(" · ")}</p>
            {durable ? <p className="quality-reference">Your review is saved. You may leave and return without losing this completed factual week.</p> : null}
            {diagnostic ? <details className="quality-reference" data-engine-code={diagnostic.code}><summary>Beta engine diagnostics</summary><p>{diagnostic.code} · {diagnostic.stage} · attempt {diagnostic.attempt}</p><p>Worker {diagnostic.workerSupported ? "supported" : "unavailable"} · WebAssembly {diagnostic.webAssemblySupported ? "supported" : "unavailable"} · isolation {diagnostic.crossOriginIsolated ? "on" : "off"} · {diagnostic.userAgentCategory}</p>{diagnostic.detail || diagnostic.eventMessage ? <p>{diagnostic.detail ?? diagnostic.eventMessage}</p> : null}</details> : null}
            {recoveryState === "manual" ? <div className="quality-actions"><button type="button" className="button button-lime" onClick={onRetry}>TRY POSITION CHECK AGAIN</button></div> : null}
          </section>
        </section>
      </div>
    );
  }
  return (
    <div id="main" className="desk-processing-page"><section className="container desk-processing-card error-card">
      <ShieldCheck /><p className="kicker">We could not finish this Desk</p><h1>{desk.player.username}</h1><p>This episode did not clear BoardSignal's evidence checks, so no diagnosis has been published.</p>
      <div className="processing-stages"><div className="done"><ShieldCheck /><p>Player, games, period and factual week completed</p></div><div className="active"><AlertTriangle /><p>Final evidence validation needs attention</p></div></div>
      <p className="quality-reference">Check: {codes.join(" · ")}</p>
      {diagnostic ? <details className="quality-reference" data-engine-code={diagnostic.code}>
        <summary>Beta engine diagnostics</summary>
        <p>{diagnostic.code} · {diagnostic.stage} · attempt {diagnostic.attempt}</p>
        <p>Worker {diagnostic.workerSupported ? "supported" : "unavailable"} · WebAssembly {diagnostic.webAssemblySupported ? "supported" : "unavailable"} · isolation {diagnostic.crossOriginIsolated ? "on" : "off"} · {diagnostic.userAgentCategory}</p>
        {diagnostic.assetUrl ? <p>Asset: {diagnostic.assetUrl}</p> : null}
        {diagnostic.detail || diagnostic.eventMessage ? <p>{diagnostic.detail ?? diagnostic.eventMessage}</p> : null}
        {diagnostic.filename ? <p>{diagnostic.filename}{diagnostic.lineno ? `:${diagnostic.lineno}` : ""}</p> : null}
      </details> : null}
      <div className="quality-actions"><button type="button" className="button button-lime" onClick={onRetry}>Retry analysis</button><Link href="/" className="text-link">Return to BoardSignal</Link></div>
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
