"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import "./racing-warmup.css";
import Racing3DScene from "./racing-3d-scene";

export type Phase = "ready" | "countdown" | "running" | "paused" | "finished" | "crashed";
export type Controls = { steer: number; flight: number; accelerate: boolean; brake: boolean; boost: boolean; fire: boolean };
export type SpaceState = { nearbyTarget: string | null; cargoPeople: number; cargoEquipment: number; visitedPlanets: string[]; deployedEquipment: Record<string, number>; planetProgress: Record<string, number>; travelNotes: string[]; acclaim: number; asteroidsShot: number };
const newSpaceState = (): SpaceState => ({ nearbyTarget: null, cargoPeople: 0, cargoEquipment: 0, visitedPlanets: [], deployedEquipment: { Aster: 0, Cobalt: 0, Verdant: 0, Ember: 0, Frost: 0 }, planetProgress: { Aster: 0, Cobalt: 0, Verdant: 0, Ember: 0, Frost: 0 }, travelNotes: [], acclaim: 0, asteroidsShot: 0 });
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
  const spaceStateRef = useRef<SpaceState>(newSpaceState());
  const [, setSpaceUiTick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setSpaceUiTick(n => n + 1), 500); return () => window.clearInterval(timer); }, []);
  const phaseRef = useRef<Phase>("ready");
  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [speed, setSpeed] = useState(0);
  const [lapTime, setLapTime] = useState(0);
  const [nos, setNos] = useState(100);
  const [signal, setSignal] = useState({ label: "GREEN LIGHT · BUILD SPEED", tone: "go" });
  const cornerSkillRef = useRef({ brakedForCorner: false, turnedIn: false, exitBoostUntil: 0 });
  const [boostActive, setBoostActive] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" | "info" } | null>(null);
  const businessName = "GGL Racing";
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  phaseRef.current = phase;

  const notify = useCallback((text: string, kind: "success" | "error" | "info" = "success") => {
    setToast({ text, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  useEffect(() => { if (!embedded) document.title = "GGL Space · Open-space exploration"; }, [embedded]);

  const reset = useCallback((start: boolean) => {
    raceRef.current = newRace();
    cornerSkillRef.current = { brakedForCorner: false, turnedIn: false, exitBoostUntil: 0 };
    controlsRef.current = { steer: 0, flight: 0, accelerate: false, brake: false, boost: false, fire: false };
    setSpeed(0); setLapTime(0); setNos(100); setBoostActive(false);
    setCountdown(3); phaseRef.current = start ? "countdown" : "ready"; setPhase(start ? "countdown" : "ready");
  }, []);
  const startRace = useCallback(() => reset(true), [reset]);
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

        // Apply smooth space drag to world-space velocity, not the ship's heading
        // basis. This preserves controllable inertia when the player turns.
        const worldVelocity = Math.hypot(race.velocityX, race.velocityZ);
        const drag = Math.exp(-dt * (0.22 + worldVelocity * 0.012));
        race.velocityX *= drag;
        race.velocityZ *= drag;
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
  const dockOrLand = () => {
    const state = spaceStateRef.current; const target = state.nearbyTarget;
    if (!target) { notify("Fly closer to GGL Haven or a planet to dock.", "info"); return; }
    if (target === "GGL Haven") {
      if (state.cargoPeople > 0 && state.visitedPlanets.length) {
        const notes = state.visitedPlanets.map(planet => "Trip note: " + planet + " — the crew saw the world up close; " + state.asteroidsShot + " asteroid(s) destroyed on this trip.");
        state.travelNotes = [...notes, ...state.travelNotes].slice(0, 8); const award = Math.max(1, state.visitedPlanets.length * 2); state.acclaim += award;
        notify("Crew notes published. Station media acclaim +" + award + ".", "success"); state.cargoPeople = 0; state.visitedPlanets = []; state.asteroidsShot = 0;
      } else notify("Docked at GGL Haven. Read the news or board a mission.", "success");
      setSpaceUiTick(n => n + 1); return;
    }
    if (target in state.deployedEquipment) {
      if (!state.visitedPlanets.includes(target)) state.visitedPlanets.push(target);
      if (state.cargoEquipment > 0) { const count = state.cargoEquipment; state.deployedEquipment[target] += count; state.cargoEquipment = 0; notify(count + " terraforming machine(s) deployed on " + target + "."); }
      else notify("Planet visit logged. No equipment aboard — you can still explore and take passengers.", "info");
      setSpaceUiTick(n => n + 1);
    }
  };
  const boardAtStation = () => { const state = spaceStateRef.current; if (state.nearbyTarget !== "GGL Haven") { notify("Fly close to GGL Haven first.", "info"); return; } state.cargoPeople = Math.min(6, state.cargoPeople + 3); state.cargoEquipment = Math.min(4, state.cargoEquipment + 2); notify("3 passengers and 2 terraforming machines boarded."); setSpaceUiTick(n => n + 1); };
  const toggleBoost = () => {
    if (phaseRef.current !== "running" || raceRef.current.nos <= 0) return;
    const next = !controlsRef.current.boost;
    controlsRef.current.boost = next;
    setBoostActive(next);
  };

  return <div className={"vula race-hub" + (embedded ? " race-hub-embedded" : "")}>
    {!embedded && <><div className="big-brothers-status"><span className="status-dot online" />GGL Space · free exploration</div><header className="big-brothers-nav"><Link href="/" className="big-brothers-brand"><span className="big-brothers-mark">GGL</span><span>GGL Space<small>OPEN SPACE EXPLORATION</small></span></Link><nav><Link href="/ggltournaments">Tournaments</Link><Link href="/ggltournaments">GGL home</Link></nav></header><section className="big-brothers-section warmup-intro"><p className="big-brothers-eyebrow">GGL SPACE · EXPLORE AT YOUR PACE</p><h1>Find your place among the stars.</h1><p>Take the ship into open space, steer between distant worlds, and explore at your own pace. The analog stick handles direction and forward/reverse flight; up/down thrusters handle altitude.</p><p className="warmup-family-note">Open space, a handful of planets, and room to explore.</p></section></>}
    {embedded && <div className="race-inline-heading"><div><p className="big-brothers-eyebrow">GGL / OPEN SPACE</p><h2>Explore the system.</h2><p>Use the analog stick to steer and fly forward or backward. UP THRUST raises altitude; DOWN THRUST lowers altitude.</p></div></div>}
    <section className="big-brothers-section warmup-game">
      <div className="warmup-hud warmup-circuit-hud"><div><span>Speed</span><strong>{Math.round(speed)} <small>km/h</small></strong></div><div><span>Flight</span><strong>Free roam</strong></div><div><span>Flight time</span><strong>{fmt(lapTime)}</strong></div><div><span>Worlds nearby</span><strong>05</strong></div></div>
      <div className="warmup-canvas-wrap warmup-circuit-wrap">
        <Racing3DScene raceRef={raceRef} controlsRef={controlsRef} phaseRef={phaseRef} spaceStateRef={spaceStateRef} />
        <div className="space-flight-status" aria-label="Live flight status">
          <span><b>{spaceStateRef.current.cargoPeople}</b> crew</span>
          <i />
          <span><b>{spaceStateRef.current.cargoEquipment}</b> machines</span>
          <i />
          <span><b>{spaceStateRef.current.visitedPlanets.length}</b> worlds</span>
        </div>
        <div className="space-radio-ticker" aria-live="polite"><span>RADIO</span> Outer routes report drifting debris · Keep your eyes open</div>
        {spaceStateRef.current.nearbyTarget && <div className="space-proximity-actions" aria-label="Nearby interaction">
          <div className="space-proximity-copy"><span>{spaceStateRef.current.nearbyTarget === "GGL Haven" ? "STATION IN RANGE" : "PLANET IN RANGE"}</span><strong>{spaceStateRef.current.nearbyTarget}</strong></div>
          <button type="button" onClick={dockOrLand}>{spaceStateRef.current.nearbyTarget === "GGL Haven" ? "Dock" : "Visit world"} <span>↗</span></button>
          {spaceStateRef.current.nearbyTarget === "GGL Haven" && <button type="button" onClick={boardAtStation}>Board crew + equipment <span>＋</span></button>}
        </div>}
        <div className={"warmup-signal-chip " + signal.tone} aria-live="polite"><span />{signal.label}</div>
        {toast && <div className={"warmup-toast " + toast.kind} role="status">{toast.text}</div>}
        <div className="warmup-3d-overlay" hidden={phase === "running"} aria-live="polite">
          <span>GGL SPACE · FREE EXPLORATION</span>
          <strong>{phase === "ready" ? "Ready for launch" : phase === "countdown" ? String(countdown || 1) : phase === "paused" ? "Paused" : phase === "crashed" ? "Car disabled" : "Nice driving!"}</strong>
          <p>{phase === "ready" ? "Use the familiar controls to fly through open space and look around the nearby planets." : phase === "countdown" ? "Get set. Smooth steering beats sudden corrections." : phase === "paused" ? "Take a breath. Resume when you're ready." : "Enjoy the open space. You can pause or restart whenever you like."}</p>
        </div>
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
          <button type="button" className="projectile-button" aria-label="Fire projectile" disabled={phase !== "running"} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); controlsRef.current.fire = true; }} onPointerUp={() => { controlsRef.current.fire = false; }} onPointerCancel={() => { controlsRef.current.fire = false; }} onLostPointerCapture={() => { controlsRef.current.fire = false; }}>FIRE ✦</button>
          <button type="button" className="nos-button" aria-label="Toggle NOS burst" aria-pressed={boostActive} disabled={phase !== "running" || nos <= 0} onClick={toggleBoost}>{boostActive ? "NOS ON ⚡" : "TAP NOS ⚡"}</button>
        </div>
        <div className="warmup-actions">{phase === "ready" ? <button type="button" className="big-brothers-button primary" onClick={startRace}>Start exploring ↗</button> : phase === "countdown" ? <button type="button" className="big-brothers-button primary" disabled>Ready {countdown || 1}…</button> : phase === "running" ? <button type="button" className="big-brothers-button primary" onClick={pauseRace}>Pause Ⅱ</button> : phase === "paused" ? <button type="button" className="big-brothers-button primary" onClick={pauseRace}>Resume ▶</button> : <button type="button" className="big-brothers-button primary" onClick={startRace}>Try Again ↻</button>}<button type="button" className="big-brothers-button secondary" onClick={() => reset(false)}>Restart ↻</button></div>
      </div>

      <p className="warmup-help">Phone: drag the analog stick left/right to steer and up/down to fly forward/back. UP THRUST ↑ raises altitude; DOWN THRUST ↓ lowers altitude. Tap NOS to toggle a burst. Desktop: ← / → or A / D steer, ↑ / W forward, ↓ / S reverse, E up thrust, Q down thrust, Space / Shift NOS, F / Enter fire, P pause. Practice is free. This is a free exploration mode; no tournament prize is attached to this solo mode.</p>
    </section>
    {!embedded && <footer className="big-brothers-footer"><Link href="/" className="big-brothers-brand"><span className="big-brothers-mark">GGL</span><span>GGL Space<small>TOURNAMENTS · OPEN SPACE</small></span></Link><Link href="/ggltournaments">Tournaments</Link><Link href="/ggltournaments">GGL home</Link></footer>}
  </div>;
}
