"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createInitialSpaceState, advanceSpaceWorld, getFirstFootholdCue, habitatCapacity, habitatStage, mitigateSpaceHazard, recordSpaceChronicle, selectSpaceSurveyTarget, surveySpaceWorld, restoreSpaceState, SPACE_SAVE_KEY, WORLD_PLANETS, type SpaceState } from "./space-civilisation";
import "./racing-warmup.css";
import Racing3DScene from "./racing-3d-scene";
import { movePeople } from "./space-people";
import { FOUNDING_CATEGORIES, FOUNDING_CIRCUMSTANCES, getCircumstance, DEFAULT_FOUNDING_IDS } from "./space-founding";
import { getSurveyWorld, SPACE_SURVEY_TARGET_KEY } from "./space-universe";

const SPACE_AUTOSAVE_KEY = "ggl-space-autosave-v1";
const SPACE_MANUAL_SAVE_KEY = "ggl-space-manual-save-v1";
const SPACE_FOUNDING_ARCHIVE_KEY = "ggl-space-founding-archive-v1";
type FoundingArchiveEntry = { id: string; title: string; circumstanceIds: string[]; savedAt: number };
type SpaceGameSnapshot = { version: 1; savedAt: number; world: SpaceState; flight: Race; paused: boolean };
const isFiniteRace = (value: unknown): value is Race => {
  if (!value || typeof value !== "object") return false;
  const race = value as Record<string, unknown>;
  const numeric = ["progress","speed","elapsed","lap","lapTime","steering","throttle","brakePressure","lateral","lateralVelocity","heading","drift","nos","last","offTrack","longitudinalLoad","lateralG","wheelLock","worldX","worldY","worldZ","worldYaw","velocityX","velocityY","velocityZ","damage","lastImpactAt","trackT"];
  return numeric.every((key) => typeof race[key] === "number" && Number.isFinite(race[key])) && typeof race.lapInvalid === "boolean" && (race.bestLap === null || (typeof race.bestLap === "number" && Number.isFinite(race.bestLap)));
};
const isValidSpaceState = (value: unknown): value is SpaceState => {
  if (!value || typeof value !== "object") return false;
  const world = value as Record<string, unknown>;
  const numeric = ["cargoPeople","cargoEquipment","acclaim","asteroidsShot","havenPopulation","machineInventory","worldTimeMinutes","lastSimulatedAt","havenGrowthRemainder"];
  const records = ["deployedEquipment","planetProgress","colonies","colonyGrowthRemainders"];
  return world.version === 1
    && numeric.every((key) => typeof world[key] === "number" && Number.isFinite(world[key]))
    && (typeof world.nearbyTarget === "string" || world.nearbyTarget === null)
    && Array.isArray(world.visitedPlanets) && Array.isArray(world.travelNotes) && Array.isArray(world.events)
    && records.every((key) => Boolean(world[key]) && typeof world[key] === "object" && !Array.isArray(world[key]));
};
const parseGameSnapshot = (raw: string | null): SpaceGameSnapshot | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SpaceGameSnapshot>;
    if (value.version !== 1 || typeof value.savedAt !== "number" || !Number.isFinite(value.savedAt) || !isValidSpaceState(value.world) || !isFiniteRace(value.flight) || typeof value.paused !== "boolean") return null;
    return value as SpaceGameSnapshot;
  } catch { return null; }
};
export type { SpaceState };
export type Phase = "ready" | "countdown" | "running" | "paused" | "finished" | "crashed";
export type Controls = { steer: number; flight: number; accelerate: boolean; brake: boolean; boost: boolean; fire: boolean };
export type Race = {
  progress: number; speed: number; elapsed: number; lap: number; lapTime: number; steering: number; throttle: number; brakePressure: number;
  bestLap: number | null; lateral: number; lateralVelocity: number; heading: number; drift: number;
  nos: number; last: number; lapInvalid: boolean; offTrack: number;
  longitudinalLoad: number; lateralG: number; wheelLock: number;
  worldX: number; worldY: number; worldZ: number; worldYaw: number; velocityX: number; velocityY: number; velocityZ: number; damage: number; lastImpactAt: number; trackT: number;
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const newRace = (): Race => ({ progress: 0, speed: 0, elapsed: 0, lap: 1, lapTime: 0, steering: 0, throttle: 0, brakePressure: 0, bestLap: null, lateral: 0, lateralVelocity: 0, heading: 0, drift: 0, nos: 100, last: 0, lapInvalid: false, offTrack: 0, longitudinalLoad: 0, lateralG: 0, wheelLock: 0, worldX: 0, worldY: 0, worldZ: -35, worldYaw: 0, velocityX: 0, velocityY: 0, velocityZ: 0, damage: 0, lastImpactAt: 0, trackT: 0 });
function fmt(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}

export default function RacingWarmup({ embedded = false }: { embedded?: boolean }) {
  const expanded = true;
  const raceRef = useRef<Race>(newRace());
  const controlsRef = useRef<Controls>({ steer: 0, flight: 0, accelerate: false, brake: false, boost: false, fire: false });
  const spaceStateRef = useRef<SpaceState>(createInitialSpaceState());
  const [, setSpaceUiTick] = useState(0);
  const stateHydratedRef = useRef(false);
  const lastProcessedWorldMinutesRef = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  const [phase, setPhase] = useState<Phase>("ready");
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [manualSaveAvailable, setManualSaveAvailable] = useState(false);
  const [chronicleMenuOpen, setChronicleMenuOpen] = useState(false);
  const [foundingSetupOpen, setFoundingSetupOpen] = useState(false);
  const [foundingCategory, setFoundingCategory] = useState<"beneficial" | "harmful" | "mixed" | "neutral">("beneficial");
  const [selectedFoundingIds, setSelectedFoundingIds] = useState<string[]>([]);
  const [foundingArchive, setFoundingArchive] = useState<FoundingArchiveEntry[]>([]);
  const [sceneGeneration, setSceneGeneration] = useState(0);
  const restartWasRunningRef = useRef(true);
  useEffect(() => { const timer = window.setInterval(() => setSpaceUiTick(n => n + 1), 500); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const now = Date.now();
    try {
      const archiveRaw = window.localStorage.getItem(SPACE_FOUNDING_ARCHIVE_KEY);
      const archiveParsed = archiveRaw ? JSON.parse(archiveRaw) : [];
      if (Array.isArray(archiveParsed)) setFoundingArchive(archiveParsed.filter(item => item && typeof item.id === "string" && Array.isArray(item.circumstanceIds)).slice(0, 30));
      const autoSnapshot = parseGameSnapshot(window.localStorage.getItem(SPACE_AUTOSAVE_KEY));
      if (autoSnapshot) {
        setFoundingSetupOpen(false);
        const savedIds = autoSnapshot.world.population?.foundingProfile?.circumstanceIds;
        if (Array.isArray(savedIds) && savedIds.length) setSelectedFoundingIds(savedIds.slice(0,3));
        // Restore the last world, applying offline time only when the previous
        // session was active. Every visit waits for an explicit player start.
        const restoreAt = autoSnapshot.paused ? autoSnapshot.world.lastSimulatedAt : now;
        spaceStateRef.current = restoreSpaceState(autoSnapshot.world, restoreAt);
        raceRef.current = { ...autoSnapshot.flight, last: 0 };
        phaseRef.current = "ready";
        setPhase("ready");
      } else {
        const legacy = window.localStorage.getItem(SPACE_SAVE_KEY);
        if (legacy) { spaceStateRef.current = restoreSpaceState(JSON.parse(legacy), now); setFoundingSetupOpen(false); }
        else { spaceStateRef.current = createInitialSpaceState(now, selectedFoundingIds); setFoundingSetupOpen(true); }
      }
      setManualSaveAvailable(Boolean(parseGameSnapshot(window.localStorage.getItem(SPACE_MANUAL_SAVE_KEY))));
    } catch {
      spaceStateRef.current = createInitialSpaceState(now);
      raceRef.current = newRace();
      phaseRef.current = "ready";
      setPhase("ready");
      setManualSaveAvailable(false);
    }
    try {
      const pendingSurveyTarget = window.localStorage.getItem(SPACE_SURVEY_TARGET_KEY);
      if (pendingSurveyTarget && getSurveyWorld(pendingSurveyTarget)) selectSpaceSurveyTarget(spaceStateRef.current, pendingSurveyTarget);
    } catch { /* The ship remains playable without cross-page navigation storage. */ }
    lastProcessedWorldMinutesRef.current = spaceStateRef.current.worldTimeMinutes;
    stateHydratedRef.current = true;
    setSpaceUiTick(n => n + 1);

    const saveWorld = () => {
      if (!stateHydratedRef.current) return;
      const state = spaceStateRef.current;
      if (phaseRef.current === "running") {
        const elapsed = state.worldTimeMinutes - lastProcessedWorldMinutesRef.current;
        if (elapsed > 0) advanceSpaceWorld(state, elapsed);
      }
      lastProcessedWorldMinutesRef.current = state.worldTimeMinutes;
      const savedAt = Date.now();
      state.lastSimulatedAt = savedAt;
      const snapshot: SpaceGameSnapshot = { version: 1, savedAt, world: state, flight: { ...raceRef.current, last: 0 }, paused: phaseRef.current !== "running" };
      try {
        window.localStorage.setItem(SPACE_SAVE_KEY, JSON.stringify(state));
        window.localStorage.setItem(SPACE_AUTOSAVE_KEY, JSON.stringify(snapshot));
      } catch { /* Keep the active run playable if browser storage is unavailable. */ }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") { saveWorld(); return; }
      const paused = phaseRef.current !== "running";
      const state = restoreSpaceState(spaceStateRef.current, paused ? spaceStateRef.current.lastSimulatedAt : Date.now());
      spaceStateRef.current = state;
      lastProcessedWorldMinutesRef.current = state.worldTimeMinutes;
      raceRef.current.last = 0;
      saveWorld();
      setSpaceUiTick(n => n + 1);
    };
    const timer = window.setInterval(() => { if (document.visibilityState !== "hidden") saveWorld(); setSpaceUiTick(n => n + 1); }, 1000);
    window.addEventListener("pagehide", saveWorld);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", saveWorld);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      saveWorld();
    };
  }, []);
  const [countdown, setCountdown] = useState(3);
  const [speed, setSpeed] = useState(0);
  const [lapTime, setLapTime] = useState(0);
  const [nos, setNos] = useState(100);
  const [signal, setSignal] = useState({ label: "GREEN LIGHT · BUILD SPEED", tone: "go" });
  const cornerSkillRef = useRef({ brakedForCorner: false, turnedIn: false, exitBoostUntil: 0 });
  const [boostActive, setBoostActive] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" | "info" } | null>(null);
  const [transferSignal, setTransferSignal] = useState<{ id: number; emoji: string; title: string; detail: string; route: string } | null>(null);
  const [proximityMenuOpen, setProximityMenuOpen] = useState(true);
  const [shipManifestOpen, setShipManifestOpen] = useState(false);
  const transferSignalId = useRef(0);
  const transferTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalTransfer = useCallback((emoji: string, title: string, detail: string, route: string) => {
    transferSignalId.current += 1;
    setTransferSignal({ id: transferSignalId.current, emoji, title, detail, route });
    if (transferTimer.current) clearTimeout(transferTimer.current);
    transferTimer.current = setTimeout(() => setTransferSignal(null), 2600);
  }, []);
  const businessName = "GGL Racing";
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  phaseRef.current = phase;

  const notify = useCallback((text: string, kind: "success" | "error" | "info" = "success") => {
    setToast({ text, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (transferTimer.current) clearTimeout(transferTimer.current);
  }, []);
  useEffect(() => { if (!embedded) document.title = "GGL Space · Open-space exploration"; }, [embedded]);

  const neutralControls = () => { controlsRef.current = { steer: 0, flight: 0, accelerate: false, brake: false, boost: false, fire: false }; };
  const writeAutoSnapshot = () => {
    const state = spaceStateRef.current;
    if (phaseRef.current === "running") {
      const elapsed = state.worldTimeMinutes - lastProcessedWorldMinutesRef.current;
      if (elapsed > 0) advanceSpaceWorld(state, elapsed);
    }
    lastProcessedWorldMinutesRef.current = state.worldTimeMinutes;
    const savedAt = Date.now();
    state.lastSimulatedAt = savedAt;
    const snapshot: SpaceGameSnapshot = { version: 1, savedAt, world: state, flight: { ...raceRef.current, last: 0 }, paused: phaseRef.current !== "running" };
    try { window.localStorage.setItem(SPACE_SAVE_KEY, JSON.stringify(state)); window.localStorage.setItem(SPACE_AUTOSAVE_KEY, JSON.stringify(snapshot)); } catch { notify("Browser storage is unavailable. Your current run is still active.", "error"); }
  };
  const reset = useCallback(() => {
    raceRef.current = newRace();
    cornerSkillRef.current = { brakedForCorner: false, turnedIn: false, exitBoostUntil: 0 };
    controlsRef.current = { steer: 0, flight: 0, accelerate: false, brake: false, boost: false, fire: false };
    setSpeed(0); setLapTime(0); setNos(100); setBoostActive(false);
    phaseRef.current = "running"; setPhase("running");
  }, []);
  const archiveFoundingChoice = (ids: string[]) => {
    const selected = ids.map(getCircumstance).filter(Boolean);
    const entry: FoundingArchiveEntry = { id: "origin-" + Date.now().toString(36), title: selected.map(item => item!.title).join(" + "), circumstanceIds: ids, savedAt: Date.now() };
    const next = [entry, ...foundingArchive.filter(item => item.circumstanceIds.join("|") !== ids.join("|"))].slice(0, 30);
    setFoundingArchive(next);
    try { window.localStorage.setItem(SPACE_FOUNDING_ARCHIVE_KEY, JSON.stringify(next)); notify("Founding profile archived. You can load it into another civilisation."); } catch { notify("The civilisation is playable, but its founding archive could not be written.", "error"); }
  };
  const toggleFoundingChoice = (id: string) => {
    setSelectedFoundingIds(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 3 ? [...current, id] : current);
  };
  const loadFoundingArchive = (entry: FoundingArchiveEntry) => {
    setSelectedFoundingIds(entry.circumstanceIds.slice(0,3));
    const category = getCircumstance(entry.circumstanceIds[0])?.category;
    if (category) setFoundingCategory(category);
    notify("Archived founding circumstances loaded into the setup.");
  };
  const startGame = () => {
    if (foundingSetupOpen) {
      const freshWorld = createInitialSpaceState(Date.now(), selectedFoundingIds);
      spaceStateRef.current = freshWorld;
      lastProcessedWorldMinutesRef.current = 0;
      raceRef.current = newRace();
      setSpeed(0); setLapTime(0); setNos(100); setBoostActive(false);
      setSceneGeneration(generation => generation + 1);
      archiveFoundingChoice(selectedFoundingIds);
      setFoundingSetupOpen(false);
      setSpaceUiTick(n => n + 1);
    }
    neutralControls();
    raceRef.current.last = 0;
    phaseRef.current = "running";
    setPhase("running");
    writeAutoSnapshot();
  };
  const startRace = useCallback(() => reset(), [reset]);
  const saveManualGame = () => {
    const state = spaceStateRef.current;
    if (phaseRef.current === "running") {
      const elapsed = state.worldTimeMinutes - lastProcessedWorldMinutesRef.current;
      if (elapsed > 0) advanceSpaceWorld(state, elapsed);
    }
    lastProcessedWorldMinutesRef.current = state.worldTimeMinutes;
    const savedAt = Date.now();
    state.lastSimulatedAt = savedAt;
    const snapshot: SpaceGameSnapshot = { version: 1, savedAt, world: state, flight: { ...raceRef.current, last: 0 }, paused: phaseRef.current !== "running" };
    try {
      window.localStorage.setItem(SPACE_MANUAL_SAVE_KEY, JSON.stringify(snapshot));
      window.localStorage.setItem(SPACE_SAVE_KEY, JSON.stringify(state));
      window.localStorage.setItem(SPACE_AUTOSAVE_KEY, JSON.stringify(snapshot));
      setManualSaveAvailable(true);
      notify("Manual save secured. Your current civilisation and ship are recorded.");
    } catch { notify("Save failed. The existing run and previous manual save were left intact.", "error"); }
  };
  const loadManualGame = () => {
    let snapshot: SpaceGameSnapshot | null = null;
    try { snapshot = parseGameSnapshot(window.localStorage.getItem(SPACE_MANUAL_SAVE_KEY)); } catch { snapshot = null; }
    if (!snapshot) { notify("No valid manual save was found. Your current run has not changed.", "error"); return; }
    const restoredWorld = restoreSpaceState(snapshot.world, snapshot.paused ? snapshot.world.lastSimulatedAt : Date.now());
    const restoredRace = { ...snapshot.flight, last: 0 };
    spaceStateRef.current = restoredWorld;
    setFoundingSetupOpen(false);
    const restoredIds = restoredWorld.population?.foundingProfile?.circumstanceIds;
    if (Array.isArray(restoredIds) && restoredIds.length) setSelectedFoundingIds(restoredIds.slice(0,3));
    raceRef.current = restoredRace;
    lastProcessedWorldMinutesRef.current = restoredWorld.worldTimeMinutes;
    neutralControls();
    setSpeed(restoredRace.speed); setLapTime(restoredRace.elapsed); setNos(restoredRace.nos); setBoostActive(false);
    phaseRef.current = "ready";
    setPhase("ready");
    restoredWorld.lastSimulatedAt = Date.now();
    writeAutoSnapshot();
    setSpaceUiTick(n => n + 1);
    notify("Manual save loaded. The saved ship position and civilisation are restored.");
  };
  const restartCivilisation = () => {
    const freshWorld = createInitialSpaceState(Date.now(), selectedFoundingIds);
    spaceStateRef.current = freshWorld;
    lastProcessedWorldMinutesRef.current = freshWorld.worldTimeMinutes;
    reset();
    phaseRef.current = "ready";
    setPhase("ready");
    setSceneGeneration((generation) => generation + 1);
    setChronicleMenuOpen(false);
    setShipManifestOpen(false);
    setProximityMenuOpen(true);
    setTransferSignal(null);
    if (transferTimer.current) clearTimeout(transferTimer.current);
    setShowRestartConfirm(false);
    setFoundingSetupOpen(false);
    archiveFoundingChoice(selectedFoundingIds);
    try {
      const snapshot: SpaceGameSnapshot = { version: 1, savedAt: Date.now(), world: freshWorld, flight: { ...raceRef.current, last: 0 }, paused: true };
      window.localStorage.setItem(SPACE_SAVE_KEY, JSON.stringify(freshWorld));
      window.localStorage.setItem(SPACE_AUTOSAVE_KEY, JSON.stringify(snapshot));
      setSpaceUiTick(n => n + 1);
      notify("A fresh civilisation baseline is ready at Haven. Press START GAME when you are ready.");
    } catch { notify("The new run started, but browser autosave is unavailable.", "error"); }
  };
  const requestRestartCivilisation = () => {
    restartWasRunningRef.current = phaseRef.current === "running";
    if (restartWasRunningRef.current) {
      neutralControls();
      phaseRef.current = "paused";
      setPhase("paused");
    }
    setShowRestartConfirm(true);
  };
  const cancelRestartCivilisation = () => {
    setShowRestartConfirm(false);
    if (restartWasRunningRef.current) {
      raceRef.current.last = 0;
      phaseRef.current = "running";
      setPhase("running");
    }
  };
  const pauseRace = useCallback(() => {
    if (phaseRef.current === "running") {
      controlsRef.current = { steer: 0, flight: 0, accelerate: false, brake: false, boost: false, fire: false };
      setBoostActive(false); phaseRef.current = "paused"; setPhase("paused");
    } else if (phaseRef.current === "paused") {
      raceRef.current.last = 0; phaseRef.current = "running"; setPhase("running");
    }
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    const timer = window.setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(0); raceRef.current.last = 0; phaseRef.current = "running"; setPhase("running");
      } else setCountdown(n => n - 1);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [phase, countdown]);



  useEffect(() => {
    let raf = 0;
    let previous = 0;
    let lastUi = 0;

    const frame = (now: number) => {
      const race = raceRef.current;
      const dt = previous ? Math.min((now - previous) / 1000, 0.035) : 0;
      previous = now;
      if (phaseRef.current === "running" && dt > 0) {
        const controls = controlsRef.current;
        // Spacecraft controls are independent of speed and ground-vehicle tyre physics.
        // A thumb-left/right command rotates the nose left/right at a predictable rate,
        // even while stationary. The ship keeps world-space momentum while thrust
        // accelerates along the current nose direction, so steering changes the thrust
        // vector without teleporting the velocity or requiring an artificial track.
        const steerEase = 1 - Math.exp(-dt * (Math.abs(controls.steer) > Math.abs(race.steering) ? 16 : 10));
        race.steering += (controls.steer - race.steering) * steerEase;
        const yawRate = -race.steering * 2.45;
        race.worldYaw += yawRate * dt;
        race.worldYaw = Math.atan2(Math.sin(race.worldYaw), Math.cos(race.worldYaw));

        const throttleTarget = controls.flight;
        race.throttle += (throttleTarget - race.throttle)
          * (1 - Math.exp(-dt * (Math.abs(throttleTarget) > Math.abs(race.throttle) ? 9 : 7)));
        // Up/down thrust is handled on the world Y axis in the 3D scene. It is not
        // a car brake, and must not feed tyre grip, ABS or cornering calculations.
        race.brakePressure = 0;
        race.wheelLock = 0;
        race.longitudinalLoad += (0 - race.longitudinalLoad) * (1 - Math.exp(-dt * 4));

        const boost = controls.boost && race.nos > 0;
        const forwardX = -Math.sin(race.worldYaw);
        const forwardZ = -Math.cos(race.worldYaw);
        const boostDirection = race.throttle < -0.05 ? -1 : 1;
        const thrustAcceleration = race.throttle * 14 + (boost ? boostDirection * 18 : 0);
        race.velocityX += forwardX * thrustAcceleration * dt;
        race.velocityZ += forwardZ * thrustAcceleration * dt;

        // Station-keeping flight: the ship has no drifting momentum. Releasing forward/reverse
        // thrust or boost brings it to a complete stop, while steering can still turn it in place.
        if (Math.abs(controls.flight) < 0.01 && !controls.boost) {
          race.velocityX = 0;
          race.velocityZ = 0;
        } else {
          const worldVelocity = Math.hypot(race.velocityX, race.velocityZ);
          const drag = Math.exp(-dt * (0.22 + worldVelocity * 0.012));
          race.velocityX *= drag;
          race.velocityZ *= drag;
        }
        const maxWorldSpeed = boost ? 24.8 : 20.6;
        const updatedWorldSpeed = Math.hypot(race.velocityX, race.velocityZ);
        if (updatedWorldSpeed > maxWorldSpeed) {
          const speedScale = maxWorldSpeed / updatedWorldSpeed;
          race.velocityX *= speedScale;
          race.velocityZ *= speedScale;
        }
        race.worldX += race.velocityX * dt;
        race.worldZ += race.velocityZ * dt;
        race.speed = clamp(Math.hypot(race.velocityX, race.velocityZ) * 3.6 / 0.28, 0, boost ? 320 : 265);

        const lateralX = Math.cos(race.worldYaw);
        const lateralZ = -Math.sin(race.worldYaw);
        const lateralVelocity = race.velocityX * lateralX + race.velocityZ * lateralZ;
        race.heading = Math.atan2(race.velocityX, -race.velocityZ) - race.worldYaw;
        race.heading = Math.atan2(Math.sin(race.heading), Math.cos(race.heading));
        race.lateral = clamp(lateralVelocity, -18, 18);
        race.lateralVelocity = lateralVelocity;
        race.lateralG += (yawRate - race.lateralG) * (1 - Math.exp(-dt * 5));
        race.drift = clamp(race.heading * clamp(Math.abs(lateralVelocity) / 7, 0, 1) * 0.35, -0.5, 0.5);

        race.nos = boost ? Math.max(0, race.nos - 25 * dt) : Math.min(100, race.nos + 9 * dt);
        if (race.nos <= 0 && controls.boost) {
          controls.boost = false;
          setBoostActive(false);
        }

        // Free-flight has no track projection, boundary collision, lap invalidation,
        // or forced route-following. Position is driven only by the existing flight physics.
        race.trackT = 0;
        race.progress = 0;
        race.lateral = 0;
        race.offTrack = 0;
        race.lapInvalid = false;

        race.elapsed += dt;
        race.lapTime += dt;
        if (now - lastUi > 33) {
          lastUi = now;
          setSpeed(race.speed);
          setLapTime(race.lapTime);
          setNos(race.nos);
          setBoostActive(boost);
          const cue = { label: "OPEN SPACE · EXPLORE FREELY", tone: "go" as const };
          setSignal(cue);
        }
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [notify]);

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (embedded && !expanded) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s", " ", "e", "q"].includes(e.key.toLowerCase()) || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") controlsRef.current.steer = -1;
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") controlsRef.current.steer = 1;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") controlsRef.current.flight = 1;
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") controlsRef.current.flight = -1;
      if (e.key === " " || e.key === "Shift") controlsRef.current.boost = true;
      if (e.key.toLowerCase() === "f" || e.key === "Enter") controlsRef.current.fire = true;
      if (e.key.toLowerCase() === "e") controlsRef.current.accelerate = true;
      if (e.key.toLowerCase() === "q") controlsRef.current.brake = true;
      if ((e.key.toLowerCase() === "p" || e.key === "Escape") && !e.repeat) pauseRace();
    };
    const keyUp = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key) || ["a", "d"].includes(e.key.toLowerCase())) controlsRef.current.steer = 0;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") controlsRef.current.flight = 0;
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") controlsRef.current.flight = 0;
      if (e.key === " " || e.key === "Shift") { controlsRef.current.boost = false; setBoostActive(false); }
      if (e.key.toLowerCase() === "f" || e.key === "Enter") controlsRef.current.fire = false;
      if (e.key.toLowerCase() === "e") controlsRef.current.accelerate = false;
      if (e.key.toLowerCase() === "q") controlsRef.current.brake = false;
    };
    const release = () => { controlsRef.current = { steer: 0, flight: 0, accelerate: false, brake: false, boost: false, fire: false }; setBoostActive(false); };
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp); window.addEventListener("blur", release);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); window.removeEventListener("blur", release); };
  }, [pauseRace, embedded, expanded]);

  // Circular thumbstick follows the Shooters Trigger input pattern.
  // Horizontal displacement steers ship yaw; vertical displacement controls forward/reverse thrust.
  const steerStickPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // Use the full usable stick radius while keeping the knob inside the rim.
    const knob = event.currentTarget.querySelector<HTMLElement>(".steering-stick-knob");
    const knobRadius = (knob?.offsetWidth || 38) / 2;
    const maxX = Math.max(1, rect.width / 2 - knobRadius - 5);
    const maxY = Math.max(1, rect.height / 2 - knobRadius - 5);
    const rawX = (event.clientX - (rect.left + rect.width / 2)) / maxX;
    const rawY = (event.clientY - (rect.top + rect.height / 2)) / maxY;
    const magnitude = Math.hypot(rawX, rawY);
    const deadZone = 0.10;
    const activeMagnitude = magnitude <= deadZone ? 0 : Math.min(1, (magnitude - deadZone) / (1 - deadZone));
    const directionScale = magnitude > 0.001 ? activeMagnitude / magnitude : 0;
    const x = rawX * directionScale;
    const y = rawY * directionScale;
    controlsRef.current.steer = clamp(x, -1, 1);
    controlsRef.current.flight = clamp(-y, -1, 1);
    if (knob) knob.style.transform = `translate3d(${x * maxX}px, ${y * maxY}px, 0)`;
  };
  const releaseSteerStick = (event: { currentTarget: HTMLDivElement }) => {
    controlsRef.current.steer = 0;
    controlsRef.current.flight = 0;
    const knob = event.currentTarget.querySelector<HTMLElement>(".steering-stick-knob");
    if (knob) knob.style.transform = "translate3d(0, 0, 0)";
  };
  const hold = (key: "accelerate" | "brake", down: boolean) => {
    // These are vertical thrusters, not racing pedals. They can be used while boosting.
    controlsRef.current[key] = down;
  };
  // NOS is a compact tap-to-toggle burst, not a hold pedal.
  // Tap once to engage, tap again to cut it; vertical thrust remains independent.
  const minePlanetMaterials = () => {
    const state = spaceStateRef.current;
    const target = state.nearbyTarget;
    const ecology = target ? state.ecology?.[target] : undefined;
    if (!target || !ecology || (state.deployedEquipment[target] || 0) <= 0) {
      notify("Deploy a working machine on this world before mining its resources.", "info");
      return;
    }
    const amount = Math.min(5, 20 - (state.cargoMaterials || 0), Math.floor(ecology.resourceStock));
    if (amount <= 0) {
      notify((state.cargoMaterials || 0) >= 20 ? "Raw-material hold full. Deliver it to Haven." : "This world's accessible resource stock is depleted.", "info");
      return;
    }
    ecology.resourceStock -= amount;
    ecology.extractedResource += amount;
    state.cargoMaterials = (state.cargoMaterials || 0) + amount;
    recordSpaceChronicle(state, "production", target, "Raw materials extracted", amount + " units of " + ecology.resourceType + " loaded aboard the ship for Haven fabrication.");
    notify(amount + " units of " + ecology.resourceType + " loaded. Return to Haven to unload them.", "success");
    setSpaceUiTick(n => n + 1);
  };
  const startMachineProduction = () => {
    const state = spaceStateRef.current;
    if (state.dockedAt !== "GGL Haven") { notify("Dock at Haven before operating the station fabricator.", "info"); return; }
    if ((state.havenMaterials || 0) < 6) { notify("Fabrication requires 6 delivered material units. Mine a working colony world and bring the materials back.", "error"); return; }
    state.havenMaterials = (state.havenMaterials || 0) - 6;
    state.machineProductionQueue = (state.machineProductionQueue || 0) + 1;
    recordSpaceChronicle(state, "production", "GGL Haven", "Machine fabrication started", "Six material units entered the station fabricator. One machine will complete after four system hours.");
    notify("Machine fabrication started. Six material units committed; completion in four system hours.", "success");
    setSpaceUiTick(n => n + 1);
  };
  const surveyNearbyWorld = () => {
    const state = spaceStateRef.current;
    const targetId = state.nearbyTarget;
    const target = targetId ? getSurveyWorld(targetId) : undefined;
    if (!target) { notify("Fly closer to an unidentified planetary body before scanning.", "info"); return; }
    if ((state.discoveredWorlds || []).includes(target.id)) { notify(target.revealedName + " is already in Haven's survey archive.", "info"); return; }
    const completed = surveySpaceWorld(state, target.id);
    if (!completed) { notify("Survey could not be completed. Hold a stable close approach and try again.", "error"); return; }
    try { window.localStorage.removeItem(SPACE_SURVEY_TARGET_KEY); } catch {}
    signalTransfer("⌖", "PLANETARY SURVEY COMPLETE", target.revealedName + " identified. Findings transmitted to Haven's chronicle.", "SHIP  →  HAVEN ARCHIVE");
    notify(target.revealedName + " discovered. +" + target.scanReward + " archive acclaim. Haven's chronicle updated.", "success");
    setSpaceUiTick(n => n + 1);
  };

  const dockOrLand = () => {
    const state = spaceStateRef.current;
    const target = state.nearbyTarget;
    if (!target) { notify("Fly closer to GGL Haven or a planet to dock.", "info"); return; }
    if (target === "Floating Equipment") {
      if (state.cargoEquipment >= 4) { notify("Machine hold full. Return to Haven or deliver equipment before recovering more.", "info"); return; }
      state.cargoEquipment += 1;
      state.salvageRecovered = (state.salvageRecovered || 0) + 1;
      state.acclaim += 1;
      state.events.unshift("Recoverable station equipment recovered and secured aboard the ship.");
      state.events = state.events.slice(0, 6);
      recordSpaceChronicle(state, "recovery", "GGL Haven", "Equipment cache recovered", "The pilot recovered one floating machine module; ship cargo increased by one.");
      signalTransfer("🧰", "EQUIPMENT RECOVERED", "One floating machine module secured in the ship cargo.", "SPACE  →  SHIP");
      notify("Equipment module recovered. Cargo +1 machine; archive acclaim +1.", "success");
      setSpaceUiTick(n => n + 1);
      return;
    }

    if (target === "GGL Haven") {
      const newlyDocked = state.dockedAt !== "GGL Haven";
      state.dockedAt = "GGL Haven";
      if (newlyDocked) recordSpaceChronicle(state, "docking", "GGL Haven", "Ship docked at Haven", "The ship entered Haven safe harbour. Ordinary asteroid collision damage is suppressed while docked.");
      const returnedCrew = state.cargoPeople;
      const returnedMachines = state.cargoEquipment;
      const returnedMaterials = state.cargoMaterials || 0;
      if (returnedCrew > 0) { state.havenPopulation += returnedCrew; movePeople(state.population, "ship", "haven", returnedCrew); } // Returning citizens are never discarded at the station capacity threshold.
      if (returnedMachines > 0) state.machineInventory += returnedMachines;
      if (returnedMaterials > 0) state.havenMaterials = (state.havenMaterials || 0) + returnedMaterials;
      if (state.visitedPlanets.length) {
        const notes = state.visitedPlanets.map(planet => "Trip note: " + planet + " — " + (state.deployedEquipment[planet] || 0) + " machine(s) installed; " + state.asteroidsShot + " asteroid(s) destroyed on this trip.");
        state.travelNotes = [...notes, ...state.travelNotes].slice(0, 8);
        const award = state.visitedPlanets.length * 2;
        state.acclaim += award;
        notify("Trip logged. Haven archive gained " + state.visitedPlanets.length + " world report(s). Archive acclaim +" + award + ".", "success");
      } else if (returnedCrew || returnedMachines) {
        notify("Unused crew and machinery safely returned to Haven.", "success");
      } else {
        notify("Docked at GGL Haven. Load a mission when you are ready.", "success");
      }
      if (returnedCrew || returnedMachines || returnedMaterials) {
        signalTransfer("🧑‍🚀", "CARGO RETURNED TO HAVEN", returnedCrew + " crew · " + returnedMachines + " machine(s) · " + returnedMaterials + " raw material units returned.", "SHIP  →  STATION");
      }
      state.cargoPeople = 0;
      state.cargoEquipment = 0;
      state.cargoMaterials = 0;
      state.visitedPlanets = [];
      state.asteroidsShot = 0;
      setSpaceUiTick(n => n + 1);
      return;
    }

    const planet = WORLD_PLANETS.find(item => item.name === target);
    if (!planet) { notify("This target cannot receive a settlement delivery.", "info"); return; }
    if (!state.visitedPlanets.includes(target)) state.visitedPlanets.push(target);
    let delivered = 0;
    if (state.cargoEquipment > 0) {
      delivered = state.cargoEquipment;
      state.deployedEquipment[target] = (state.deployedEquipment[target] || 0) + delivered;
      state.cargoEquipment = 0;
      signalTransfer("🤖", "MACHINES DEPLOYED", delivered + " machine(s) installed on " + target + ". Operators will work while system time advances.", "SHIP  →  " + target.toUpperCase());
    }

    const progress = state.planetProgress[target] || 0;
    const installed = state.deployedEquipment[target] || 0;
    const existingColony = state.colonies[target];
    if (existingColony) {
      existingColony.lastContactWorldMinutes = state.worldTimeMinutes;
      existingColony.trustWithHaven = Math.min(100, existingColony.trustWithHaven + (delivered > 0 ? 3 : 1));
    }
    if (state.cargoPeople > 0) {
      if (progress < 80 || installed < planet.colonyMachineRequirement) {
        const missing = Math.max(0, planet.colonyMachineRequirement - installed);
        notify(target + ": crew remain aboard. Need HABITABLE air and " + planet.colonyMachineRequirement + " installed machines (" + missing + " more).", "info");
      } else {
        const capacity = habitatCapacity(progress);
        const currentPopulation = existingColony?.population || 0;
        const moved = Math.min(state.cargoPeople, Math.max(0, capacity - currentPopulation));
        if (moved > 0) {
          if (existingColony) {
            existingColony.population += moved;
            existingColony.founders += moved;
          } else {
            state.colonies[target] = {
              population: moved, founders: moved, operators: Math.max(1, Math.floor(moved / 4)),
              foundedAtWorldMinutes: state.worldTimeMinutes, independent: false,
              trustWithHaven: 70, autonomy: 15, governance: "provisional",
              lastContactWorldMinutes: state.worldTimeMinutes, factions: [],
            };
            state.colonyGrowthRemainders[target] = 0;
          }
          state.cargoPeople -= moved;
          movePeople(state.population, "ship", ("planet:" + target) as `planet:${string}`, moved);
          state.events.unshift(target + " settlement founded by " + moved + " people from GGL Haven.");
          recordSpaceChronicle(state, "settlement", target, target + " settlement founded", moved + " settlers from Haven established the first local community. Its history begins here.");
          state.events = state.events.slice(0, 6);
          notify(target + " settlement founded. " + moved + " Haven descendant(s) began local operations.", "success");
          signalTransfer("🧑‍🚀", "SETTLEMENT FOUNDED", moved + " person(s) established local operations on " + target + ".", "SHIP  →  " + target.toUpperCase());
        } else {
          notify(target + " has no safe living capacity remaining. Crew remain aboard.", "info");
        }
      }
    } else if (delivered > 0) {
      notify(delivered + " machine(s) deployed. Progress now follows the saved world clock.", "success");
    } else {
      notify(target + " · " + habitatStage(progress).label + " · " + Math.round(progress) + "% habitat restored.", "info");
    }
    setSpaceUiTick(n => n + 1);
  };
  const undockFromHaven = () => {
    const state = spaceStateRef.current;
    if (state.dockedAt !== "GGL Haven") return;
    state.dockedAt = null;
    recordSpaceChronicle(state, "docking", "GGL Haven", "Ship undocked", "The ship left safe harbour; ordinary open-space collision hazards are active again.");
    notify("Undocked from GGL Haven. Open-space collision hazards are active again.", "info");
    setSpaceUiTick(n => n + 1);
  };
  const repairShip = () => {
    const state = spaceStateRef.current;
    if (state.nearbyTarget !== "GGL Haven") { notify("Dock at GGL Haven before attempting hull repairs.", "info"); return; }
    const damage = raceRef.current.damage;
    if (damage <= 0) { notify("Hull integrity is already stable.", "info"); return; }
    const cost = Math.ceil(damage / 35);
    if (state.machineInventory < cost) { notify("Insufficient spare machinery. Repair requires " + cost + " machine unit(s).", "error"); return; }
    state.machineInventory -= cost;
    recordSpaceChronicle(state, "repair", "GGL Haven", "Ship hull repaired", "Haven consumed " + cost + " machine unit(s) to restore the ship hull.");
    raceRef.current.damage = 0;
    notify("Ship hull repaired at GGL Haven. " + cost + " finite machine unit(s) consumed.", "success");
    signalTransfer("🛠️", "SHIP REPAIRED", "Hull integrity restored using " + cost + " spare machine unit(s).", "HAVEN  →  SHIP");
    setSpaceUiTick(n => n + 1);
  };
  const boardCrewAtStation = () => {
    const state = spaceStateRef.current;
    if (state.nearbyTarget !== "GGL Haven") { notify("Fly close to GGL Haven before boarding crew.", "info"); return; }
    const available = Math.max(0, state.havenPopulation - 36);
    const added = Math.min(3, 6 - state.cargoPeople, available);
    if (added <= 0) {
      notify(state.cargoPeople >= 6 ? "Crew hold full. Deliver people before boarding more." : "Haven must retain its 36-person reserve.", "info");
      return;
    }
    state.cargoPeople += added;
    state.havenPopulation -= added;
    movePeople(state.population, "haven", "ship", added);
    notify(added + " descendant(s) of Haven's original 60 boarded. Their place is now on your ship.");
    signalTransfer("🧑‍🚀", "FOUNDING CREW ABOARD", added + " people transferred from Haven to the ship.", "HAVEN  →  SHIP");
    setSpaceUiTick(n => n + 1);
  };
  const loadMachinesAtStation = (requested: number) => {
    const state = spaceStateRef.current;
    if (state.nearbyTarget !== "GGL Haven") { notify("Fly close to GGL Haven before loading machinery.", "info"); return; }
    const added = Math.min(requested, 4 - state.cargoEquipment, state.machineInventory);
    if (added <= 0) {
      notify(state.cargoEquipment >= 4 ? "Machine hold full. Deliver machinery before collecting more." : "Haven's initial machine stock is exhausted.", "info");
      return;
    }
    state.cargoEquipment += added;
    state.machineInventory -= added;
    notify(added + " finite terraforming machine(s) loaded. Remaining Haven stock: " + state.machineInventory + ".");
    signalTransfer("🤖", "MACHINES LOADED", added + " machine(s) moved from Haven's finite stores into your cargo.", "STATION  →  SHIP");
    setSpaceUiTick(n => n + 1);
  };

  const engageBoost = () => {
    if (phaseRef.current !== "running" || raceRef.current.nos <= 0) return;
    controlsRef.current.boost = true;
    setBoostActive(true);
  };
  const releaseBoost = () => {
    controlsRef.current.boost = false;
    setBoostActive(false);
  };
  const world = spaceStateRef.current;
  const selectedSurvey = world.selectedSurveyTarget ? getSurveyWorld(world.selectedSurveyTarget) : undefined;
  const selectedSurveyRecord = selectedSurvey ? world.surveyRecords?.[selectedSurvey.id] : undefined;
  const mission = selectedSurvey
    ? { target: selectedSurvey.id, step: 1 as const, title: "Survey " + (selectedSurveyRecord?.revealedName || "unknown signal"), detail: "Follow the live map route to " + selectedSurvey.displayName + ". Enter planetary approach range, hold position and complete the close-range scan to send the report to Haven.", action: "Approach and scan", progress: 28 }
    : getFirstFootholdCue(world);
  const missionTargetLabel = selectedSurvey ? (selectedSurveyRecord?.revealedName || selectedSurvey.displayName) : mission.target;
  const chronicleLocations = ["GGL Haven", ...WORLD_PLANETS.map((planet) => planet.name), ...Object.values(world.surveyRecords || {}).map((record) => record.revealedName)];
  const chronicleEvents = world.chronicle || [];

  return <div className={"vula race-hub" + (embedded ? " race-hub-embedded" : "")}>
    {!embedded && <><div className="big-brothers-status"><span className="status-dot online" />GGL Space · free exploration</div><header className="big-brothers-nav"><Link href="/" className="big-brothers-brand"><span className="big-brothers-mark">GGL</span><span>GGL Space<small>OPEN SPACE EXPLORATION</small></span></Link><nav><Link href="/ggltournaments">Tournaments</Link><Link href="/ggltournaments">GGL home</Link></nav></header><section className="big-brothers-section warmup-intro"><p className="big-brothers-eyebrow">GGL SPACE · EXPLORE AT YOUR PACE</p><h1>Find your place among the stars.</h1><p>Take the ship into open space, steer between distant worlds, and explore at your own pace. The analog stick handles direction and forward/reverse flight; up/down thrusters handle altitude.</p><p className="warmup-family-note">Open space, a handful of planets, and room to explore.</p></section></>}
    {embedded && <div className="race-inline-heading"><div><p className="big-brothers-eyebrow">GGL / OPEN SPACE</p><h2>Explore the system.</h2><p>Use the analog stick to steer and fly forward or backward. UP THRUST raises altitude; DOWN THRUST lowers altitude.</p></div></div>}
    <section className="big-brothers-section warmup-game">
      <div className="warmup-hud warmup-circuit-hud"><div><span>Speed</span><strong>{Math.round(speed)} <small>km/h</small></strong></div><div><span>Flight</span><strong>Free roam</strong></div><div><span>Flight time</span><strong>{fmt(lapTime)}</strong></div><div><span>Worlds surveyed</span><strong>{5 + (world.discoveredWorlds?.length || 0)} / 20</strong></div></div>
      <div className="warmup-canvas-wrap warmup-circuit-wrap">
        <Racing3DScene key={sceneGeneration} raceRef={raceRef} controlsRef={controlsRef} phaseRef={phaseRef} spaceStateRef={spaceStateRef} />
        {(phase === "ready" || phase === "paused" || showRestartConfirm) && <div className="space-lifecycle-overlay" role="dialog" aria-modal="true" aria-labelledby="space-lifecycle-title">
          <div className="space-lifecycle-card">
            <span className="space-lifecycle-brand">ADMIN HUB CIPA · FLIGHT SYSTEM</span>
            {showRestartConfirm ? <>
              <h2 id="space-lifecycle-title">DESIGN A NEW CIVILISATION</h2>
              <div className="space-founding-setup">
                <p className="space-founding-intro">Choose up to three circumstances that brought the original 60 founders to Haven. These are starting conditions, not predetermined factions. The population, its five networks and their tensions are derived from your choices.</p>
                <div className="space-founding-categories">{FOUNDING_CATEGORIES.map(category => <button type="button" key={category.id} className={foundingCategory === category.id ? "is-active" : ""} onClick={() => setFoundingCategory(category.id)}>{category.label}</button>)}</div>
                <small>{FOUNDING_CATEGORIES.find(item => item.id === foundingCategory)?.description}</small>
                <div className="space-founding-cards">{FOUNDING_CIRCUMSTANCES.filter(item => item.category === foundingCategory).map(item => <button type="button" key={item.id} className={selectedFoundingIds.includes(item.id) ? "is-selected" : ""} onClick={() => toggleFoundingChoice(item.id)}><strong>{item.title}</strong><small>{item.period}</small><span>{item.summary}<br /><b>Founder experience:</b> {item.livedExperience}<br /><b>Likely tension:</b> {item.likelyTensions}</span><em>{selectedFoundingIds.includes(item.id) ? "SELECTED" : "ADD TO ORIGIN"}</em></button>)}</div>
                <small>{selectedFoundingIds.length}/3 selected · Select circumstances across categories to create a mixed beginning.</small><button type="button" className="space-founding-archive-action" onClick={() => archiveFoundingChoice(selectedFoundingIds)} disabled={selectedFoundingIds.length === 0}>ARCHIVE THIS ORIGIN</button>
                {foundingArchive.length > 0 && <div className="space-founding-archive"><strong>ARCHIVED FOUNDING PROFILES</strong>{foundingArchive.map(entry => <button type="button" key={entry.id} onClick={() => loadFoundingArchive(entry)}>{entry.title} <span>LOAD</span></button>)}</div>}
              </div>
              <div className="space-lifecycle-actions">
                <button type="button" className="space-lifecycle-secondary" onClick={cancelRestartCivilisation}>KEEP CURRENT RUN</button>
                <button type="button" className="space-lifecycle-primary" onClick={restartCivilisation} disabled={selectedFoundingIds.length === 0}>CREATE CIVILISATION</button>
              </div>
            </> : phase === "ready" ? <>
              <h2 id="space-lifecycle-title">{foundingSetupOpen ? "WHO CAME TO HAVEN?" : "GGL HAVEN AWAITS"}</h2>
              {foundingSetupOpen ? <div className="space-founding-setup">
                <p className="space-founding-intro">Choose up to three circumstances that brought the original 60 founders to Haven. These are starting conditions, not predetermined factions. The population, its five networks and their tensions are derived from your choices.</p>
                <div className="space-founding-categories">{FOUNDING_CATEGORIES.map(category => <button type="button" key={category.id} className={foundingCategory === category.id ? "is-active" : ""} onClick={() => setFoundingCategory(category.id)}>{category.label}</button>)}</div>
                <small>{FOUNDING_CATEGORIES.find(item => item.id === foundingCategory)?.description}</small>
                <div className="space-founding-cards">{FOUNDING_CIRCUMSTANCES.filter(item => item.category === foundingCategory).map(item => <button type="button" key={item.id} className={selectedFoundingIds.includes(item.id) ? "is-selected" : ""} onClick={() => toggleFoundingChoice(item.id)}><strong>{item.title}</strong><small>{item.period}</small><span>{item.summary}<br /><b>Founder experience:</b> {item.livedExperience}<br /><b>Likely tension:</b> {item.likelyTensions}</span><em>{selectedFoundingIds.includes(item.id) ? "SELECTED" : "ADD TO ORIGIN"}</em></button>)}</div>
                <small>{selectedFoundingIds.length}/3 selected · Select circumstances across categories to create a mixed beginning.</small>
                {foundingArchive.length > 0 && <div className="space-founding-archive"><strong>ARCHIVED FOUNDING PROFILES</strong>{foundingArchive.map(entry => <button type="button" key={entry.id} onClick={() => loadFoundingArchive(entry)}>{entry.title} <span>LOAD</span></button>)}</div>}
              </div> : <p>Your saved civilisation is ready. Resume the current run or create a new founding history. Saved profiles remain available in the archive.</p>}
              <div className="space-lifecycle-actions">
                <button type="button" className="space-lifecycle-primary" onClick={foundingSetupOpen ? startGame : startGame} disabled={foundingSetupOpen && selectedFoundingIds.length === 0}>{foundingSetupOpen ? "START NEW CIVILISATION ▶" : "START GAME ▶"}</button>
                {!foundingSetupOpen && <button type="button" className="space-lifecycle-secondary" onClick={() => { const ids = world.population?.foundingProfile?.circumstanceIds || DEFAULT_FOUNDING_IDS; setSelectedFoundingIds(ids); setFoundingCategory(getCircumstance(ids[0])?.category || "neutral"); setFoundingSetupOpen(true); }}>NEW CIVILISATION</button>}
                <button type="button" className="space-lifecycle-secondary" onClick={loadManualGame} disabled={!manualSaveAvailable}>LOAD SAVED GAME</button>
              </div>
            </> : <>
              <h2 id="space-lifecycle-title">PAUSED</h2>
              <p>Flight controls, world time and civilisation progression are on hold.</p>
              <div className="space-lifecycle-actions">
                <button type="button" className="space-lifecycle-primary" onClick={pauseRace}>RESUME GAME ▶</button>
                <button type="button" className="space-lifecycle-secondary" onClick={requestRestartCivilisation}>RESTART CIVILISATION ↻</button>
              </div>
            </>}
          </div>
        </div>}
        <div className="space-ship-manifest" aria-label="Ship manifest">
          <button type="button" className="space-ship-manifest-toggle" aria-expanded={shipManifestOpen} onClick={() => setShipManifestOpen(open => !open)}>
            <span>SHIP MANIFEST</span>
            <strong>{spaceStateRef.current.cargoPeople} crew · {spaceStateRef.current.cargoEquipment} machines</strong>
            <i aria-hidden="true">{shipManifestOpen ? "−" : "+"}</i>
          </button>
          {shipManifestOpen && <div className="space-ship-manifest-details">
            <div><span>CREW ON BOARD</span><b>{spaceStateRef.current.cargoPeople} / 6</b></div>
            <small className="space-people-roster">{(spaceStateRef.current.population?.people || []).filter(person => person.alive && person.location === "ship").map(person => person.name).join(" · ") || "No named crew aboard"}</small>
            <div><span>TERRAFORMING MACHINES</span><b>{spaceStateRef.current.cargoEquipment} / 4</b></div>
            <div><span>HAVEN POPULATION</span><b>{spaceStateRef.current.havenPopulation}</b></div>
            <div><span>HAVEN MACHINE STOCK</span><b>{spaceStateRef.current.machineInventory}</b></div>
            <div><span>SHIP HULL INTEGRITY</span><b>{Math.max(0, 100 - Math.round(raceRef.current.damage))}%</b></div>
            <div><span>WORLDS VISITED</span><b>{5 + (spaceStateRef.current.discoveredWorlds?.length || 0)} / 20</b></div>
            <div className="space-manifest-save-actions">
              <button type="button" onClick={saveManualGame}>SAVE RUN</button>
              <button type="button" onClick={loadManualGame} disabled={!manualSaveAvailable}>LOAD SAVE</button>
            </div>
            <small className="space-manifest-save-note">{manualSaveAvailable ? "MANUAL SAVE AVAILABLE · AUTOSAVE ACTIVE" : "AUTOSAVE ACTIVE · NO MANUAL SAVE"}</small>
          </div>}
        </div>
        <div className="space-flight-status" aria-label="Live flight status">
          <span><b>{spaceStateRef.current.cargoPeople}</b> crew</span>
          <i />
          <span><b>{spaceStateRef.current.cargoEquipment}</b> machines</span>
          <i />
          <span><b>{spaceStateRef.current.visitedPlanets.length}</b> worlds</span>
        </div>
        <div className="space-mission-cue" aria-label="Suggested mission: first foothold">
          <div className="space-mission-cue-top"><span>{selectedSurvey ? "ACTIVE SURVEY" : "FIRST FOOTHOLD"}</span><span>{selectedSurvey ? "DISCOVERY MISSION" : "STEP " + mission.step + " / 3"}</span></div>
          <strong>{mission.title}</strong>
          <p>{mission.detail}</p>
          <div className="space-mission-progress" aria-label={"Mission progress " + mission.progress + "%"}><span style={{ width: mission.progress + "%" }} /></div>
          <div className="space-mission-footer"><span>NAV TARGET</span><b>{missionTargetLabel}</b></div>
        </div>
        <div className="space-world-signal" aria-live="polite"><span>WORLD SIGNAL</span><strong>{world.events[0] || "Your actions are shaping the system."}</strong></div>
        <div className="space-chronicle-dock">
          <button type="button" className="space-chronicle-toggle" aria-expanded={chronicleMenuOpen} onClick={() => setChronicleMenuOpen((open) => !open)}>
            CHRONICLES <span>{chronicleEvents.length} EVENTS</span><i aria-hidden="true">{chronicleMenuOpen ? "−" : "+"}</i>
          </button>
          {chronicleMenuOpen && <div className="space-chronicle-drawer" aria-label="Haven and planet population chronicles">
            <div className="space-chronicle-drawer-heading"><strong>CIVILISATION HISTORY</strong><button type="button" onClick={() => setChronicleMenuOpen(false)} aria-label="Close chronicles">×</button></div>
            <details className="space-chronicle-group">
              <summary><span>THE FOUNDING NETWORKS</span><small>60 FOUNDERS · EMERGENT NETWORKS</small></summary>
              <div className="space-chronicle-list">
                <small><strong>OG HAVEN ORIGIN</strong><br />{world.population?.foundingProfile?.title || "Legacy founding profile"}<br />{world.population?.foundingProfile?.originSummary || "This saved civilisation predates the founding circumstance library."}<br /><b>Founding mix:</b> {world.population?.foundingProfile ? (Object.entries(world.population.foundingProfile.categoryMix).filter(([,count]) => count > 0).map(([category,count]) => category.toUpperCase() + " × " + count).join(" · ") || "LEGACY / UNATTRIBUTED") : "Legacy profile"}</small>
                {(world.population?.foundingNetworks || []).map((network) => {
                  const livingMembers = (world.population?.people || []).filter(person => person.alive && network.householdIds.includes(person.householdId)).length;
                  const links = network.linkedNetworks.map(id => world.population?.foundingNetworks?.find(item => item.id === id)?.name).filter(Boolean);
                  return <small key={network.id}><strong>{network.name}</strong> · {livingMembers} living members · {network.influence}% influence<br />{network.origin}<br /><b>Current agenda:</b> {network.agenda}<br /><b>Pressure point:</b> {network.pressurePoint}<br /><b>Connected with:</b> {links.join(" · ") || "Other Haven networks"}</small>;
                })}
                {(world.population?.foundingProfile?.circumstanceIds || []).map(id => { const circumstance = getCircumstance(id); return circumstance ? <small key={id}><b>Historical inspiration:</b> {circumstance.title} · <a href={circumstance.historicalUrl} target="_blank" rel="noreferrer">historical source</a> · <a href={circumstance.researchUrl} target="_blank" rel="noreferrer">research basis</a></small> : null; })}
                {!(world.population?.foundingNetworks || []).length && <small>The founding networks will be restored with the population archive.</small>}
              </div>
            </details>
            {chronicleLocations.map((location) => {
              const events = chronicleEvents.filter((event) => event.location === location).slice().reverse();
              return <details className="space-chronicle-group" key={location}>
                <summary><span>{location === "GGL Haven" ? "HAVEN" : location.toUpperCase()}</span><small>{events.length} EVENTS</small></summary>
                <div className="space-chronicle-list">
                  {events.length ? events.map((event) => <small key={event.id}>T+{Math.floor(event.atWorldMinutes / 60)}h · <strong>{event.title}</strong> — {event.detail}</small>) : <small>History begins when people, equipment and events reach this world.</small>}
                </div>
              </details>;
            })}
          </div>}
        </div>
        {world.nearbyTarget && <>
          <button type="button" className="space-proximity-toggle" aria-expanded={proximityMenuOpen} onClick={() => setProximityMenuOpen(open => !open)}>{proximityMenuOpen ? "CLOSE" : "PLANET MENU"} <span aria-hidden="true">{proximityMenuOpen ? "−" : "+"}</span></button>
          {proximityMenuOpen && <div className="space-proximity-actions" aria-label="Nearby interaction">
          <div className="space-proximity-copy"><span>{world.nearbyTarget === "GGL Haven" ? "HAVEN DOCKING BAY" : world.nearbyTarget === "Floating Equipment" ? "RECOVERY SIGNAL" : "PLANETARY APPROACH"}</span><strong>{world.nearbyTarget}</strong></div>
          {world.nearbyTarget === "Floating Equipment" ? <>
            <div className="space-proximity-data">Unattended equipment module detected. Recover it to replenish the ship equipment cargo.</div>
            <button type="button" onClick={dockOrLand} disabled={world.cargoEquipment >= 4}>Recover equipment <span>＋</span></button>
          </> : world.nearbyTarget === "GGL Haven" ? <>
            <div className="space-proximity-data"><b>{world.havenPopulation}</b> people at Haven <i /> <b>{world.machineInventory}</b> machines in storage<br /><small>{world.havenMaterials || 0} raw materials · {world.machineProductionQueue || 0} machine(s) queued · {Math.floor(world.machineProductionProgress || 0)}/4 system hours</small><br /><small>{(world.population?.people || []).filter(person => person.alive && person.location === "haven").slice(0, 4).map(person => person.name).join(" · ")}</small></div>
            
            <button type="button" onClick={world.dockedAt === "GGL Haven" ? undockFromHaven : dockOrLand}>{world.dockedAt === "GGL Haven" ? "Undock · safe harbour active" : "Dock / return cargo"} <span>{world.dockedAt === "GGL Haven" ? "↗" : "↙"}</span></button>
            {raceRef.current.damage > 0 && <button type="button" onClick={repairShip}>Repair ship · {Math.ceil(raceRef.current.damage / 35)} machine(s) <span>🛠</span></button>}
            <div className="space-machine-load-options" aria-label="Choose machinery load">
              <button type="button" onClick={() => loadMachinesAtStation(1)} disabled={world.machineInventory <= 0 || world.cargoEquipment >= 4}>Load 1 machine</button>
              <button type="button" onClick={() => loadMachinesAtStation(2)} disabled={world.machineInventory <= 0 || world.cargoEquipment >= 4}>Load 2 machines</button>
            </div>
            {world.dockedAt === "GGL Haven" && <button type="button" onClick={startMachineProduction} disabled={(world.havenMaterials || 0) < 6}>Fabricate 1 machine · 6 materials <span>⚙</span></button>}
            <button type="button" onClick={boardCrewAtStation} disabled={world.havenPopulation <= 36 || world.cargoPeople >= 6}>Board crew +3 <span>＋</span></button>
          </> : getSurveyWorld(world.nearbyTarget || "") ? (() => {
            const survey = getSurveyWorld(world.nearbyTarget!);
            if (!survey) return null;
            const record = world.surveyRecords?.[survey.id];
            return <>
              <div className="space-proximity-data">
                <b>{record ? record.revealedName : "UNIDENTIFIED PLANETARY BODY"}</b><br />
                {record ? "Survey complete · " + record.classification.replaceAll("-", " ") : "Long-range signature acquired. Close-range scan required."}<br />
                {record ? record.atmosphere + " · " + record.resources : "Atmosphere, resources, habitability and meteor exposure remain unknown."}
                {record && <><br />Meteor exposure: {record.meteorExposure}</>}
              </div>
              {!record
                ? <button type="button" onClick={surveyNearbyWorld}>Complete planetary scan <span>⌖</span></button>
                : <button type="button" onClick={() => { selectSpaceSurveyTarget(world, null); setSpaceUiTick(n => n + 1); }}>Clear navigation target <span>×</span></button>}
            </>;
          })() : <>
            {(() => { const planet = WORLD_PLANETS.find(item => item.name === world.nearbyTarget); if (!planet) return null; const progress = world.planetProgress[planet.name] ?? planet.initialProgress; const installed = world.deployedEquipment[planet.name] || 0; const stage = habitatStage(progress); const colony = world.colonies[planet.name]; const ecology = world.ecology?.[planet.name]; return <div className="space-proximity-data">
              <b style={{ color: stage.color }}>{stage.label}</b> · {Math.round(progress)}% restored<br />
              {installed}/{planet.colonyMachineRequirement} founding machines<br />{colony ? colony.population + " settlers · " + colony.operators + " local operators" : progress >= 80 ? "Safe capacity " + habitatCapacity(progress) + " people" : "No safe crew until 80%"}<br />{(world.population?.people || []).filter(person => person.alive && person.location === ("planet:" + planet.name)).slice(0, 3).map(person => person.name).join(" · ")}
              {ecology && <div className="space-ecology-data"><b>WORLD SYSTEMS</b><span>{Math.round(ecology.temperatureC)}°C · {Math.round(ecology.pressureKpa)} kPa · water {Math.round(ecology.accessibleWater)}%</span><span>Radiation {Math.round(ecology.radiation)}% · ecology {Math.round(ecology.biodiversity)}% · food {Math.round(ecology.foodProduction)}%</span><span>{ecology.resourceType}: {Math.round(ecology.resourceStock)} units · fabrication {Math.round(ecology.fabricationProgress)}%</span><span>Local modules produced: {ecology.manufacturedModules} · maintenance load {Math.round(ecology.maintenanceLoad)}%</span></div>}
              {(() => { {colony && <div className="space-society-data"><b>{colony.governance.replace("-", " ").toUpperCase()}</b><span>Haven trust {Math.round(colony.trustWithHaven)}% · local autonomy {Math.round(colony.autonomy)}%</span>{colony.factions.length > 0 ? colony.factions.map(faction => <small key={faction.id}>{faction.name} · {faction.influence}% influence — {faction.agenda}</small>) : <small>Local groups are still forming from settlers' shared experiences.</small>}</div>}const hazard = (world.hazards || []).find(item => item.target === planet.name && (item.status === "warning" || item.status === "mitigated")); if (!hazard) return null; const hours = Math.max(0, (hazard.impactAtWorldMinutes - world.worldTimeMinutes) / 60); return <div className="space-hazard-card"><b>{hazard.type === "power-dust" ? "POWER-DUST SIGNATURE" : "ORBITAL IMPACT WARNING"}</b><small>Estimated impact window: {hours.toFixed(1)} system hours · confidence {Math.round(hazard.confidence * 100)}%</small>{hazard.status === "warning" ? <button type="button" onClick={() => { const ok = mitigateSpaceHazard(world, planet.name); notify(ok ? "Mitigation deployed. One finite Haven machine was committed to the response." : "No machine stock is available for mitigation.", ok ? "success" : "error"); setSpaceUiTick(n => n + 1); }} disabled={world.machineInventory <= 0}>Deploy mitigation · 1 machine</button> : <small>Mitigation deployed · revised impact window active</small>}</div>; })()}
            </div>; })()}
            {WORLD_PLANETS.some(item => item.name === world.nearbyTarget && (world.deployedEquipment[item.name] || 0) > 0) && <button type="button" onClick={minePlanetMaterials} disabled={(world.cargoMaterials || 0) >= 20 || !WORLD_PLANETS.some(item => item.name === world.nearbyTarget && (world.ecology?.[item.name]?.resourceStock || 0) >= 1)}>Mine 5 raw materials · cargo {(world.cargoMaterials || 0)}/20</button>}
            <button type="button" onClick={dockOrLand}>{world.cargoEquipment > 0 ? (world.cargoPeople > 0 ? "Deliver machines + crew" : "Deploy machinery") : world.cargoPeople > 0 ? "Check settlement conditions" : "Inspect world"} <span>↗</span></button>
          </>}
          </div>}
        </>}
        <div className={"warmup-signal-chip " + signal.tone} aria-live="polite"><span />{signal.label}</div>
        {transferSignal && <div key={transferSignal.id} className="space-transfer-signal" role="status" aria-live="polite">
          <div className="space-transfer-emoji" aria-hidden="true">{transferSignal.emoji}</div>
          <div className="space-transfer-copy"><strong>{transferSignal.title}</strong><span>{transferSignal.detail}</span><div className="space-transfer-route">{transferSignal.route} <i aria-hidden="true">➜</i></div></div>
        </div>}
        {toast && <div className={"warmup-toast " + toast.kind} role="status">{toast.text}</div>}
        
      </div>

      <div className="warmup-nos"><div><strong>NOS</strong><span>{Math.round(nos)}%</span></div><div className="nos-track"><span style={{ width: nos + "%" }} /></div></div>
      <div className="warmup-controls warmup-circuit-controls">
        <div className="warmup-steering" aria-label="Analog steering">
          <span className="steering-caption">STEER</span>
          <div className={"steering-stick" + (phase !== "running" ? " is-disabled" : "")}
            role="slider" aria-label="Steering thumbstick" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(controlsRef.current.steer * 100)}
            tabIndex={phase === "running" ? 0 : -1}
            onPointerDown={e => { if (phase !== "running") return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); steerStickPointer(e); }}
            onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) steerStickPointer(e); }}
            onPointerUp={releaseSteerStick} onPointerCancel={releaseSteerStick} onLostPointerCapture={releaseSteerStick}
            onKeyDown={e => { if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) { e.preventDefault(); const steer = e.key === "ArrowLeft" ? -0.72 : e.key === "ArrowRight" ? 0.72 : controlsRef.current.steer; const flight = e.key === "ArrowUp" ? 0.85 : e.key === "ArrowDown" ? -0.85 : controlsRef.current.flight; controlsRef.current.steer = steer; controlsRef.current.flight = flight; const knob = e.currentTarget.querySelector<HTMLElement>(".steering-stick-knob"); if (knob) knob.style.transform = `translate3d(${steer * 25}px, ${-flight * 25}px, 0)`; } }}
            onKeyUp={e => { if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) releaseSteerStick({currentTarget:e.currentTarget}); }}>
            <span className="steering-stick-track" />
            <span className="steering-stick-knob"><span>●</span></span>
          </div>
          <span className="steering-caption">Steer · forward / reverse</span>
        </div>
        <div className="warmup-driving">
          <button type="button" className="down-thrust-button" aria-label="Down thrusters" disabled={phase !== "running"} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); hold("brake", true); }} onPointerUp={() => hold("brake", false)} onPointerCancel={() => hold("brake", false)} onLostPointerCapture={() => hold("brake", false)}>DOWN THRUST ↓</button>
          <button type="button" className="accelerate-button up-thrust-button" aria-label="Up thrusters" disabled={phase !== "running"} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); hold("accelerate", true); }} onPointerUp={() => hold("accelerate", false)} onPointerCancel={() => hold("accelerate", false)} onLostPointerCapture={() => hold("accelerate", false)}>UP THRUST ↑</button>
          <button type="button" className="nos-button" aria-label="Hold to engage NOS boost" aria-pressed={boostActive} disabled={phase !== "running" || nos <= 0}
            onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); engageBoost(); }}
            onPointerUp={releaseBoost} onPointerCancel={releaseBoost} onLostPointerCapture={releaseBoost}
            onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); engageBoost(); } }}
            onKeyUp={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); releaseBoost(); } }}
            onBlur={releaseBoost}>{boostActive ? "NOS ACTIVE ⚡" : "HOLD NOS ⚡"}</button>
          <button type="button" className="projectile-button" aria-label="Fire projectile" disabled={phase !== "running"} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); controlsRef.current.fire = true; }} onPointerUp={() => { controlsRef.current.fire = false; }} onPointerCancel={() => { controlsRef.current.fire = false; }} onLostPointerCapture={() => { controlsRef.current.fire = false; }}>FIRE ✦</button>
        </div>
        <div className="warmup-actions">{phase === "ready" ? <button type="button" className="big-brothers-button primary" onClick={startGame}>Start Game ▶</button> : phase === "countdown" ? <button type="button" className="big-brothers-button primary" disabled>Ready {countdown || 1}…</button> : phase === "running" ? <button type="button" className="big-brothers-button primary" onClick={pauseRace}>Pause Ⅱ</button> : phase === "paused" ? <button type="button" className="big-brothers-button primary" onClick={pauseRace}>Resume ▶</button> : <button type="button" className="big-brothers-button primary" onClick={startRace}>Try Again ↻</button>}<button type="button" className="big-brothers-button secondary" onClick={requestRestartCivilisation}>Restart ↻</button></div>
      </div>

      <p className="warmup-help">Phone: drag the analog stick left/right to steer and up/down to fly forward/back. UP THRUST ↑ raises altitude; DOWN THRUST ↓ lowers altitude. Hold NOS to engage a boost burst. Desktop: ← / → or A / D steer, ↑ / W forward, ↓ / S reverse, E up thrust, Q down thrust, Space / Shift NOS, F / Enter fire, P pause. Practice is free. This is a free exploration mode; no tournament prize is attached to this solo mode.</p>
    </section>
    {!embedded && <footer className="big-brothers-footer"><Link href="/" className="big-brothers-brand"><span className="big-brothers-mark">GGL</span><span>GGL Space<small>TOURNAMENTS · OPEN SPACE</small></span></Link><Link href="/ggltournaments">Tournaments</Link><Link href="/ggltournaments">GGL home</Link></footer>}
  </div>;
}
