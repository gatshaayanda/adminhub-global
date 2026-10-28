"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import "./racing-warmup.css";
import Racing3DScene from "./racing-3d-scene";
import { SPACE_TARGETS } from "./space-world";
export type Phase = "ready" | "running" | "paused";
export type Controls = { steer: number; accelerate: boolean; brake: boolean; boost: boolean; ascend: boolean; descend: boolean; interact: boolean; scan: boolean };
export type Race = { worldX: number; worldY: number; worldZ: number; worldYaw: number; velocityX: number; velocityZ: number; speed: number; nos: number; steering: number; last: number; targetId: string; targetDistance: number; rescued: number; rescuedPods: string[]; discovered: string[]; landed: string | null; docked: boolean; message: string };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const newRace = (): Race => ({ worldX: 0, worldY: 2, worldZ: 8, worldYaw: 0, velocityX: 0, velocityZ: 0, speed: 0, nos: 100, steering: 0, last: 0, targetId: "station", targetDistance: 126, rescued: 0, rescuedPods: [], discovered: [], landed: null, docked: false, message: "MISSION BRIEF · Explore freely, scan worlds and recover the three missing life pods." });
export default function RacingWarmup({ embedded = false }: { embedded?: boolean }) {
  const raceRef = useRef<Race>(newRace());
  const controlsRef = useRef<Controls>({ steer: 0, accelerate: false, brake: false, boost: false, ascend: false, descend: false, interact: false, scan: false });
  const phaseRef = useRef<Phase>("ready");
  const [phase, setPhase] = useState<Phase>("ready");
  const [readout, setReadout] = useState({ speed: 0, altitude: 2, nos: 100, distance: 126, rescued: 0, discovered: 0, x: 0, z: 8, message: raceRef.current.message, landed: false, docked: false });
  const [targetId, setTargetId] = useState("station");
  const [boostActive, setBoostActive] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" | "info" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  phaseRef.current = phase;
  const target = SPACE_TARGETS.find(t => t.id === targetId) || SPACE_TARGETS[0];
  const notify = useCallback((text: string, kind: "success" | "error" | "info" = "info") => { setToast({ text, kind }); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2600); }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  useEffect(() => { if (!embedded) document.title = "GGL Space Hub · Population Preservation"; }, [embedded]);
  const reset = useCallback((start: boolean) => {
    raceRef.current = newRace(); controlsRef.current = { steer: 0, accelerate: false, brake: false, boost: false, ascend: false, descend: false, interact: false, scan: false };
    setTargetId("station"); setReadout({ speed: 0, altitude: 2, nos: 100, distance: 126, rescued: 0, discovered: 0, x: 0, z: 8, message: raceRef.current.message, landed: false, docked: false }); setBoostActive(false);
    phaseRef.current = start ? "running" : "ready"; setPhase(start ? "running" : "ready"); if (start) notify("Launch systems online · explore at your own pace.", "success");
  }, [notify]);
  const togglePause = useCallback(() => {
    if (phaseRef.current === "running") { controlsRef.current = { steer: 0, accelerate: false, brake: false, boost: false, ascend: false, descend: false, interact: false, scan: false }; setBoostActive(false); phaseRef.current = "paused"; setPhase("paused"); }
    else if (phaseRef.current === "paused") { raceRef.current.last = 0; phaseRef.current = "running"; setPhase("running"); }
  }, []);
  const pulse = useCallback((key: "interact" | "scan") => { if (phaseRef.current !== "running") return; controlsRef.current[key] = true; window.setTimeout(() => { controlsRef.current[key] = false; }, 120); }, []);
  useEffect(() => {
    let raf = 0, previous = 0, lastUi = 0;
    const frame = (now: number) => {
      const r = raceRef.current, c = controlsRef.current, dt = previous ? Math.min((now - previous) / 1000, .04) : 0; previous = now;
      if (phaseRef.current === "running" && dt > 0) {
        if (!r.docked && !r.landed) {
          r.steering += (c.steer - r.steering) * (1 - Math.exp(-dt * 7));
          r.worldYaw += -r.steering * (.92 + Math.min(r.speed, 70) * .003) * dt;
          const fx = -Math.sin(r.worldYaw), fz = -Math.cos(r.worldYaw);
          const forwardSpeed = r.velocityX * fx + r.velocityZ * fz, boost = c.boost && r.nos > 0 && !c.brake;
          const accel = c.accelerate && !c.brake ? 22 : 0, boostAccel = boost ? 34 : 0, brake = c.brake ? 35 : 0;
          const drag = forwardSpeed * (.16 + Math.abs(forwardSpeed) * .009);
          const speed = clamp(forwardSpeed + (accel + boostAccel - brake - drag) * dt, -8, boost ? 76 : 52);
          r.velocityX = fx * speed; r.velocityZ = fz * speed; r.worldX += r.velocityX * dt; r.worldZ += r.velocityZ * dt;
          r.worldY = clamp(r.worldY + ((c.ascend ? 1 : 0) - (c.descend ? 1 : 0)) * dt * 16, -70, 160);
          r.speed = Math.abs(speed); r.nos = boost ? Math.max(0, r.nos - 18 * dt) : Math.min(100, r.nos + (c.accelerate ? 2 : 6) * dt);
          if (r.nos <= 0 && c.boost) { c.boost = false; setBoostActive(false); }
        }
        const selected = SPACE_TARGETS.find(t => t.id === r.targetId) || SPACE_TARGETS[0];
        r.targetDistance = Math.hypot(r.worldX - selected.position[0], r.worldY - selected.position[1], r.worldZ - selected.position[2]);
        if (now - lastUi > 100) { lastUi = now; setReadout({ speed: r.speed, altitude: r.worldY, nos: r.nos, distance: r.targetDistance, rescued: r.rescued, discovered: r.discovered.length, x: r.worldX, z: r.worldZ, message: r.message, landed: Boolean(r.landed), docked: r.docked }); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key) || ["w", "a", "s", "d", "r", "f"].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") controlsRef.current.steer = -1;
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") controlsRef.current.steer = 1;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") controlsRef.current.accelerate = true;
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") controlsRef.current.brake = true;
      if (e.key === " " || e.key === "Shift") controlsRef.current.boost = true;
      if (e.key.toLowerCase() === "r") controlsRef.current.ascend = true;
      if (e.key.toLowerCase() === "f") controlsRef.current.descend = true;
      if ((e.key.toLowerCase() === "p" || e.key === "Escape") && !e.repeat) togglePause();
      if (e.key.toLowerCase() === "e" && !e.repeat) pulse("interact");
      if (e.key.toLowerCase() === "q" && !e.repeat) pulse("scan");
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || ["a", "d"].includes(e.key.toLowerCase())) controlsRef.current.steer = 0;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") controlsRef.current.accelerate = false;
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") controlsRef.current.brake = false;
      if (e.key === " " || e.key === "Shift") { controlsRef.current.boost = false; setBoostActive(false); }
      if (e.key.toLowerCase() === "r") controlsRef.current.ascend = false;
      if (e.key.toLowerCase() === "f") controlsRef.current.descend = false;
    };
    const release = () => { controlsRef.current = { steer: 0, accelerate: false, brake: false, boost: false, ascend: false, descend: false, interact: false, scan: false }; setBoostActive(false); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", release);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", release); };
  }, [pulse, togglePause]);
  const hold = (key: "accelerate" | "brake" | "ascend" | "descend", down: boolean) => { if (phaseRef.current !== "running") return; controlsRef.current[key] = down; if (key === "brake" && down) { controlsRef.current.boost = false; setBoostActive(false); } };
  const toggleBoost = () => { if (phaseRef.current !== "running" || raceRef.current.nos <= 0 || raceRef.current.docked) return; const next = !controlsRef.current.boost; controlsRef.current.boost = next; setBoostActive(next); };
  const chooseTarget = (id: string) => { setTargetId(id); raceRef.current.targetId = id; const t = SPACE_TARGETS.find(x => x.id === id); if (t) { raceRef.current.message = `NAV TARGET SET · ${t.label.toUpperCase()} · ${t.description}.`; notify(`Navigation locked: ${t.label}`); } };
  const steerPointer = (e: ReactPointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); controlsRef.current.steer = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * .34), -1, 1); const knob = e.currentTarget.querySelector<HTMLElement>(".space-stick-knob"); if (knob) knob.style.transform = `translate3d(${controlsRef.current.steer * r.width * .25}px,0,0)`; };
  const releaseSteer = (e: { currentTarget: HTMLDivElement }) => { controlsRef.current.steer = 0; const knob = e.currentTarget.querySelector<HTMLElement>(".space-stick-knob"); if (knob) knob.style.transform = "translate3d(0,0,0)"; };
  const mapX = (x: number) => clamp(50 + x / 250 * 42, 4, 96);
  const mapY = (z: number) => clamp(88 - ((z + 8) / 600) * 78, 4, 96);
  const actionLabel = target.kind === "pod" ? "RECOVER LIFE POD" : target.kind === "station" ? (readout.docked ? "UNDOCK" : "DOCK AT HAVEN") : readout.landed ? "LIFT OFF" : "LAND / TAKE OFF";
  return <div className={"vula race-hub space-hub" + (embedded ? " race-hub-embedded" : "")}>
    {!embedded && <><div className="big-brothers-status"><span className="status-dot online" />GGL Space Hub · Population Preservation Initiative</div><header className="big-brothers-nav"><Link href="/" className="big-brothers-brand"><span className="big-brothers-mark">GGL</span><span>GGL Space Hub<small>EXPLORE · PRESERVE · CONNECT</small></span></Link><nav><Link href="/ggltournaments">Tournaments</Link><Link href="/ggltournaments">GGL home</Link></nav></header><section className="big-brothers-section warmup-intro space-intro"><p className="big-brothers-eyebrow">GGL POPULATION PRESERVATION INITIATIVE</p><h1>A living universe needs explorers.</h1><p>Fly beyond the hub, discover worlds, scan for signs of life, and bring stranded life pods home. This is open space to explore at your own pace—no track, no laps, no combat.</p></section></>}
    {embedded && <div className="race-inline-heading space-inline-heading"><div><p className="big-brothers-eyebrow">GGL / POPULATION PRESERVATION</p><h2>Space Hub: explore and preserve.</h2><p>Free-flight exploration, planetary scans, careful landings and life-pod recovery. The universe is yours to navigate.</p></div></div>}
    <section className="big-brothers-section warmup-game space-game">
      <div className="space-hud"><div><span>Velocity</span><strong>{Math.round(readout.speed)} <small>u/s</small></strong></div><div><span>Altitude</span><strong>{Math.round(readout.altitude)} <small>u</small></strong></div><div><span>Life pods</span><strong>{readout.rescued}/3</strong></div><div><span>Worlds scanned</span><strong>{readout.discovered}</strong></div></div>
      <div className="warmup-canvas-wrap space-canvas-wrap"><Racing3DScene raceRef={raceRef} controlsRef={controlsRef} phaseRef={phaseRef} /><div className="space-mission-chip"><span />{readout.docked ? "DOCKED · GGL HAVEN" : readout.landed ? "PLANETARY SURFACE" : "DEEP SPACE EXPLORATION"}</div>{toast && <div className={"warmup-toast " + toast.kind} role="status">{toast.text}</div>}
        {phase !== "running" && <div className="warmup-3d-overlay space-overlay" aria-live="polite"><span>GGL SPACE HUB · POPULATION PRESERVATION</span><strong>{phase === "ready" ? "The universe is waiting." : "Flight paused"}</strong><p>{phase === "ready" ? "Launch when ready. Set a destination, use the navigation beacon, and fly wherever curiosity takes you." : "Your ship is holding position. Resume whenever you're ready."}</p><button type="button" className="big-brothers-button primary" onClick={() => phase === "ready" ? reset(true) : togglePause()}>{phase === "ready" ? "Launch expedition ↗" : "Resume flight ▶"}</button></div>}
      </div>
      <div className="space-message" aria-live="polite"><strong>MISSION LOG</strong><p>{readout.message}</p></div>
      <div className="space-map-shell"><div className="space-section-label"><span>02 / SYSTEM MAP</span><strong>Tap a marker to set your course</strong></div><div className="space-map" role="group" aria-label="Interactive top-down system map">
        <svg className="space-map-svg" viewBox="0 0 100 100" aria-hidden="true"><path d="M0 25H100 M0 50H100 M0 75H100 M25 0V100 M50 0V100 M75 0V100" /><ellipse cx="50" cy="49" rx="24" ry="31" /><path d="M50 88 L50 49 L50 12" /></svg>
        {SPACE_TARGETS.map(t => <button type="button" key={t.id} className={"space-map-marker " + t.kind + (targetId === t.id ? " selected" : "") + (t.kind === "pod" && raceRef.current.rescuedPods.includes(t.id) ? " recovered" : "")} style={{ left: mapX(t.position[0]) + "%", top: mapY(t.position[2]) + "%" }} onClick={() => chooseTarget(t.id)} aria-label={"Navigate to " + t.label} title={t.label}><span>{t.kind === "station" ? "⌂" : t.kind === "pod" ? "◇" : "◉"}</span><small>{t.label}</small></button>)}
        <div className="space-map-ship" style={{ left: mapX(readout.x) + "%", top: mapY(readout.z) + "%" }} aria-label="Your ship position"><span>▲</span><small>YOU</small></div>
      </div><p className="space-map-caption">Map is a navigation aid, not a boundary. Fly off the plotted system and keep exploring.</p></div>
      <div className="space-nav"><div className="space-section-label"><span>01 / NAVIGATION</span><strong>Choose a destination</strong></div><div className="space-targets">{SPACE_TARGETS.map(t => <button type="button" key={t.id} className={targetId === t.id ? "selected" : ""} onClick={() => chooseTarget(t.id)}><span>{t.kind === "station" ? "⌂" : t.kind === "pod" ? "◇" : "◉"}</span><strong>{t.label}</strong><small>{t.kind === "pod" && raceRef.current.rescuedPods.includes(t.id) ? "Recovered" : t.description}</small></button>)}</div><p className="space-distance">TARGET RANGE <strong>{Math.round(readout.distance)} units</strong></p></div>
      <div className="space-interactions"><button type="button" disabled={phase !== "running" || readout.docked} onClick={() => pulse("scan")}>⌕ <span>SCAN TARGET <small>Q / survey data</small></span></button><button type="button" disabled={phase !== "running" || (readout.docked && target.kind !== "station")} onClick={() => pulse("interact")}>↗ <span>{actionLabel}<small>E / close approach + low speed</small></span></button><button type="button" className="space-pause" onClick={() => phase === "ready" ? reset(true) : togglePause()}>{phase === "running" ? "Ⅱ PAUSE" : phase === "paused" ? "▶ RESUME" : "↗ LAUNCH"}</button></div>
      <div className="space-nos"><div><strong>QUANTUM BOOST</strong><span>{Math.round(readout.nos)}%</span></div><div className="nos-track"><span style={{ width: readout.nos + "%" }} /></div></div>
      <div className="warmup-controls space-controls"><div className="warmup-steering space-steering" aria-label="Flight steering"><span className="steering-caption">PILOT</span><div className={"space-stick" + (phase !== "running" ? " is-disabled" : "")} role="slider" aria-label="Flight steering" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(controlsRef.current.steer * 100)} tabIndex={phase === "running" ? 0 : -1} onPointerDown={e => { if (phase !== "running") return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); steerPointer(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) steerPointer(e); }} onPointerUp={releaseSteer} onPointerCancel={releaseSteer} onLostPointerCapture={releaseSteer}><span className="space-stick-track" /><span className="space-stick-knob">✦</span></div><span className="steering-caption">Turn left / right</span></div>
        <div className="space-flight-grid"><button type="button" disabled={phase !== "running" || readout.docked || readout.landed} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); hold("ascend", true); }} onPointerUp={() => hold("ascend", false)} onPointerCancel={() => hold("ascend", false)} onLostPointerCapture={() => hold("ascend", false)}>▲<span>ASCEND</span></button><button type="button" disabled={phase !== "running" || readout.docked || readout.landed} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); hold("descend", true); }} onPointerUp={() => hold("descend", false)} onPointerCancel={() => hold("descend", false)} onLostPointerCapture={() => hold("descend", false)}>▼<span>DESCEND</span></button><button type="button" disabled={phase !== "running" || readout.docked || readout.landed} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); hold("brake", true); }} onPointerUp={() => hold("brake", false)} onPointerCancel={() => hold("brake", false)} onLostPointerCapture={() => hold("brake", false)}>◀<span>THRUST BRAKE</span></button><button type="button" className="space-accelerate" disabled={phase !== "running" || readout.docked || readout.landed} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); hold("accelerate", true); }} onPointerUp={() => hold("accelerate", false)} onPointerCancel={() => hold("accelerate", false)} onLostPointerCapture={() => hold("accelerate", false)}>▶<span>THRUST</span></button><button type="button" className="space-boost" aria-pressed={boostActive} disabled={phase !== "running" || readout.docked || readout.landed || readout.nos <= 0} onClick={toggleBoost}>✧<span>{boostActive ? "BOOST ON" : "QUANTUM BOOST"}</span></button></div></div>
      <p className="warmup-help space-help">Phone: pilot with the left thumbstick; use thrust, brake and altitude buttons with the other thumb. Desktop: ← / → or A / D steer, ↑ / W thrust, ↓ / S brake, R / F ascend / descend, Space / Shift boost, Q scan, E interact, P / Esc pause. Select a destination to set navigation. Approach a planet slowly to land, approach GGL Haven to dock, and recover all three life pods to complete the preservation mission.</p>
    </section>
    {!embedded && <footer className="big-brothers-footer"><Link href="/" className="big-brothers-brand"><span className="big-brothers-mark">GGL</span><span>GGL Space Hub<small>EXPLORE · PRESERVE · CONNECT</small></span></Link><Link href="/ggltournaments">Tournaments</Link><Link href="/ggltournaments">GGL home</Link></footer>}
  </div>;
}
