"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import "./space-game.css";

type GameStatus = "ready" | "running" | "paused" | "over";
type SpriteName = "ship_A" | "enemy_A" | "enemy_B" | "enemy_C" | "enemy_D" | "enemy_E" | "meteor_large" | "meteor_detailedLarge" | "satellite_A" | "station_A" | "star_large" | "star_medium" | "star_small" | "effect_yellow" | "effect_purple";
type SpriteObject = { x: number; z: number; kind: "enemy" | "meteor"; sprite: SpriteName; phase: number };
type Shot = { x: number; z: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string };
type GameData = { x: number; y: number; score: number; lives: number; time: number; wave: number; spawn: number; fire: number; boost: number; stars: { x: number; y: number; speed: number; size: number }[]; objects: SpriteObject[]; shots: Shot[]; particles: Particle[]; flash: number };
const SPRITES: SpriteName[] = ["ship_A", "enemy_A", "enemy_B", "enemy_C", "enemy_D", "enemy_E", "meteor_large", "meteor_detailedLarge", "satellite_A", "station_A", "star_large", "star_medium", "star_small", "effect_yellow", "effect_purple"];
const spritePath = (name: SpriteName) => `/game-assets/space/PNG/Retina/${name}.png`;

function freshGame(): GameData {
  return { x: 0, y: 0.74, score: 0, lives: 3, time: 0, wave: 1, spawn: 0.5, fire: 0, boost: 1, stars: Array.from({ length: 95 }, () => ({ x: Math.random(), y: Math.random(), speed: 0.12 + Math.random() * 0.7, size: 0.5 + Math.random() * 1.5 })), objects: [], shots: [], particles: [], flash: 0 };
}

export default function GGLSpaceShooterPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameData>(null as unknown as GameData);
  if (!gameRef.current) gameRef.current = freshGame();
  const statusRef = useRef<GameStatus>("ready");
  const keysRef = useRef<Record<string, boolean>>({});
  const pointerRef = useRef<Record<string, boolean>>({});
  const [status, setStatus] = useState<GameStatus>("ready");
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1, time: 0 });
  const [bestScore, setBestScore] = useState(0);
  const bestScoreRef = useRef(0);
  const [soundOn, setSoundOn] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [boostHeld, setBoostHeld] = useState(false);
  const steeringStartAngle = useRef<number | null>(null);
  const imagesRef = useRef<Partial<Record<SpriteName, HTMLImageElement>>>({});
  const soundRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);

  const changeStatus = useCallback((next: GameStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const startGame = useCallback(() => {
    gameRef.current = freshGame();
    keysRef.current = {};
    pointerRef.current = {};
    setHud({ score: 0, lives: 3, wave: 1, time: 0 });
    changeStatus("running");
  }, [changeStatus]);

  const steeringAngleAt = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2));
  };

  const startSteering = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    steeringStartAngle.current = steeringAngleAt(event);
  };

  const steerWheel = (event: PointerEvent<HTMLButtonElement>) => {
    if (steeringStartAngle.current === null) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(x, y) < 7) return;
    let delta = steeringAngleAt(event) - steeringStartAngle.current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const steering = Math.max(-1, Math.min(1, delta / (Math.PI * 0.62)));
    pointerRef.current.left = steering < -0.12;
    pointerRef.current.right = steering > 0.12;
    setWheelRotation(steering * 125);
  };

  const stopSteering = () => {
    steeringStartAngle.current = null;
    pointerRef.current.left = false;
    pointerRef.current.right = false;
    setWheelRotation(0);
  };

  const toggleSound = useCallback(() => {
    setSoundOn((current) => {
      soundOnRef.current = !current;
      if (!current && typeof window !== "undefined") {
        const Ctx = window.AudioContext;
        if (Ctx) {
          const context = soundRef.current ?? new Ctx();
          soundRef.current = context;
          if (context.state === "suspended") void context.resume();
        }
      }
      return !current;
    });
  }, []);

  useEffect(() => {
    setEmbedded(new URLSearchParams(window.location.search).get("embed") === "1");
  }, []);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("ggl-space-best") || 0);
    const best = Number.isFinite(saved) && saved > 0 ? saved : 0;
    bestScoreRef.current = best;
    setBestScore(best);
  }, []);

  useEffect(() => {
    for (const name of SPRITES) {
      const image = new Image();
      image.src = spritePath(name);
      image.onload = () => { imagesRef.current[name] = image; };
    }
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let frame = 0;
    let hudAccumulator = 0;
    const resize = () => {
      const rect = stage.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(320, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    const image = (name: SpriteName) => imagesRef.current[name];
    const drawSprite = (name: SpriteName, x: number, y: number, w: number, h: number, rotation = 0, alpha = 1) => {
      const img = image(name);
      if (!img?.complete || !img.naturalWidth) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    };
    const burst = (x: number, y: number, color: string, count = 15) => {
      const g = gameRef.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 180;
        g.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.45 + Math.random() * 0.45, max: 0.9, color });
      }
    };
    const playTone = (frequency: number, duration: number, wave: OscillatorType = "triangle") => {
      if (!soundOnRef.current || !soundRef.current) return;
      try {
        const audio = soundRef.current;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = wave;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.035, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + duration);
      } catch { /* Audio is optional; gameplay must never depend on it. */ }
    };

    const render = (timestamp: number) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min(0.035, last ? (timestamp - last) / 1000 : 0.016);
      last = timestamp;
      const g = gameRef.current;
      const running = statusRef.current === "running";
      if (running) {
        g.time += dt;
        g.wave = 1 + Math.floor(g.time / 18);
        const keys = keysRef.current;
        const ptr = pointerRef.current;
        const left = keys.ArrowLeft || keys.a || keys.A || ptr.left;
        const right = keys.ArrowRight || keys.d || keys.D || ptr.right;
        const up = keys.ArrowUp || keys.w || keys.W || ptr.up || ptr.thrust;
        const down = keys.ArrowDown || keys.s || keys.S || ptr.down || ptr.brake;
        const firing = keys[" "] || ptr.fire;
        const boosting = (keys.Shift || keys.x || keys.X || ptr.boost) && g.boost > 0.02;
        const thrusting = ptr.thrust;
        const braking = ptr.brake;
        const steer = (right ? 1 : 0) - (left ? 1 : 0);
        const lift = (down ? 1 : 0) - (up ? 1 : 0);
        g.x = Math.max(-0.94, Math.min(0.94, g.x + steer * dt * (boosting ? 1.1 : 0.82)));
        g.y = Math.max(0.48, Math.min(0.88, g.y + lift * dt * 0.5));
        g.boost = Math.max(0, Math.min(1, g.boost + (boosting ? -dt * 0.48 : dt * 0.18)));
        g.flash = Math.max(0, g.flash - dt * 2.8);
        g.spawn -= dt;
        if (g.spawn <= 0) {
          const meteor = Math.random() < 0.34;
          const sprite: SpriteName = meteor
            ? (Math.random() < 0.5 ? "meteor_large" : "meteor_detailedLarge")
            : (["enemy_A", "enemy_B", "enemy_C", "enemy_D", "enemy_E"] as SpriteName[])[Math.floor(Math.random() * 5)];
          g.objects.push({ x: (Math.random() * 1.7) - 0.85, z: 0.04, kind: meteor ? "meteor" : "enemy", sprite, phase: Math.random() * 6.28 });
          g.spawn = Math.max(0.36, 1.05 - g.wave * 0.07) + Math.random() * 0.42;
        }
        g.fire -= dt;
        if (firing && g.fire <= 0) {
          g.shots.push({ x: g.x, z: 0.86 });
          g.fire = 0.19;
          playTone(580, 0.07, "square");
        }
        const travelSpeed = boosting ? 1.04 : thrusting ? 0.76 : braking ? 0.36 : 0.56 + g.wave * 0.018;
        g.stars.forEach((star) => {
          star.y += dt * star.speed * (boosting ? 1.9 : 1) * (0.25 + star.size);
          if (star.y > 1) { star.y = 0; star.x = Math.random(); }
        });
        for (const shot of g.shots) shot.z -= dt * 1.9;
        g.shots = g.shots.filter((shot) => shot.z > 0);
        for (const obj of g.objects) {
          obj.z += dt * travelSpeed;
          obj.phase += dt * 1.8;
        }
        for (const obj of g.objects) {
          if (obj.z > 0.94 && Math.abs(obj.x - g.x) < 0.15 && Math.abs((0.67 + obj.z * 0.16) - g.y) < 0.18) {
            obj.z = 1.5;
            g.lives -= 1;
            g.flash = 1;
            const px = width / 2 + g.x * width * 0.34;
            burst(px, height * g.y, "#ff6b5f", 22);
            playTone(130, 0.22, "sawtooth");
            if (g.lives <= 0) {
              setHud({ score: g.score, lives: g.lives, wave: g.wave, time: Math.floor(g.time) });
              if (g.score > bestScoreRef.current) {
                bestScoreRef.current = g.score;
                setBestScore(g.score);
                window.localStorage.setItem("ggl-space-best", String(g.score));
              }
              changeStatus("over");
            }
          }
          if (obj.kind === "enemy" && obj.z < 0.92) {
            for (let i = g.shots.length - 1; i >= 0; i--) {
              const shot = g.shots[i];
              if (Math.abs(shot.z - obj.z) < 0.055 && Math.abs(shot.x - obj.x) < 0.14) {
                const scale = 0.18 + obj.z * 1.12;
                const y = height * (0.24 + obj.z * 0.7);
                const x = width / 2 + obj.x * width * (0.1 + obj.z * 0.34);
                burst(x, y, "#b7f36b", 12);
                obj.z = 1.5;
                g.shots.splice(i, 1);
                g.score += 100;
                playTone(880, 0.09);
                break;
              }
            }
          }
        }
        g.objects = g.objects.filter((obj) => obj.z < 1.35);
        g.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985; p.life -= dt; });
        g.particles = g.particles.filter((p) => p.life > 0);
        hudAccumulator += dt;
        if (hudAccumulator > 0.12) {
          hudAccumulator = 0;
          setHud({ score: g.score, lives: g.lives, wave: g.wave, time: Math.floor(g.time) });
        }
      } else {
        g.stars.forEach((star) => { star.y += dt * star.speed * 0.22; if (star.y > 1) { star.y = 0; star.x = Math.random(); } });
      }

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#080d1a");
      bg.addColorStop(0.55, "#111b30");
      bg.addColorStop(1, "#080c13");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      const haze = ctx.createRadialGradient(width * 0.52, height * 0.28, 1, width * 0.52, height * 0.28, width * 0.62);
      haze.addColorStop(0, "rgba(75,105,160,.22)");
      haze.addColorStop(0.55, "rgba(40,74,98,.09)");
      haze.addColorStop(1, "rgba(8,13,26,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);
      for (const star of g.stars) {
        ctx.fillStyle = star.size > 1.55 ? "rgba(220,236,255,.9)" : "rgba(178,204,235,.55)";
        ctx.fillRect(star.x * width, star.y * height, star.size, star.size);
        if (running && (keysRef.current.Shift || keysRef.current.x || pointerRef.current.boost) && star.size > 1.1) {
          ctx.strokeStyle = "rgba(183,243,107,.35)";
          ctx.lineWidth = star.size * 0.8;
          ctx.beginPath();
          ctx.moveTo(star.x * width, star.y * height);
          ctx.lineTo(star.x * width, star.y * height - 10 - star.speed * 15);
          ctx.stroke();
        }
      }
      const horizon = height * 0.24;
      const planetPalettes = [
        { base: "#b56f56", light: "#f1c19a", dark: "#56374c", ring: "#d8bb8c" },
        { base: "#4b8e9a", light: "#9ce0d1", dark: "#203d68", ring: "#b2d8d0" },
        { base: "#a28a52", light: "#e5d99a", dark: "#4c3b65", ring: "#e9d5a0" },
        { base: "#765da6", light: "#c2a6ed", dark: "#2a315f", ring: "#9dc5dd" },
      ];
      const drawPlanet = (x: number, y: number, radius: number, palette: typeof planetPalettes[number], ring = false) => {
        ctx.save();
        ctx.translate(x, y);
        if (ring) {
          ctx.strokeStyle = palette.ring + "aa";
          ctx.lineWidth = Math.max(2, radius * 0.08);
          ctx.beginPath();
          ctx.ellipse(0, radius * 0.16, radius * 1.48, radius * 0.34, -0.14, Math.PI * 1.05, Math.PI * 1.95);
          ctx.stroke();
        }
        const surface = ctx.createRadialGradient(-radius * 0.34, -radius * 0.38, radius * 0.04, 0, 0, radius * 1.08);
        surface.addColorStop(0, palette.light);
        surface.addColorStop(0.5, palette.base);
        surface.addColorStop(1, palette.dark);
        ctx.fillStyle = surface;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.98, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = palette.dark;
        for (let band = 0; band < 4; band++) {
          ctx.beginPath();
          ctx.ellipse(Math.sin(band * 1.7) * radius * 0.2, -radius * 0.6 + band * radius * 0.4, radius * (0.7 + (band % 2) * 0.18), radius * 0.11, -0.16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        if (ring) {
          ctx.strokeStyle = palette.ring + "dd";
          ctx.lineWidth = Math.max(2, radius * 0.045);
          ctx.beginPath();
          ctx.ellipse(0, radius * 0.16, radius * 1.48, radius * 0.34, -0.14, Math.PI * 0.05, Math.PI * 0.95);
          ctx.stroke();
        }
        ctx.restore();
      };
      const currentPlanet = planetPalettes[(g.wave - 1) % planetPalettes.length];
      drawPlanet(width * 0.79, horizon + height * 0.015, Math.min(width * 0.135, height * 0.15), currentPlanet, true);
      drawPlanet(width * 0.14, horizon + height * 0.105, Math.min(width * 0.065, height * 0.075), planetPalettes[(g.wave + 1) % planetPalettes.length]);
      ctx.strokeStyle = "rgba(121,158,187,.16)";
      ctx.lineWidth = 1;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(width * 0.5 + i * width * 0.008, horizon);
        ctx.lineTo(width * 0.5 + i * width * 0.075, height);
        ctx.stroke();
      }
      const gridOffset = (g.time * (running ? 0.38 : 0.08)) % 1;
      for (let i = 0; i < 15; i++) {
        const t = ((i / 15) + gridOffset) % 1;
        const y = horizon + (height - horizon) * t * t;
        ctx.strokeStyle = `rgba(112,153,180,${0.05 + t * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      drawSprite("station_A", width * 0.19, horizon + 3, Math.min(width * 0.12, 92), Math.min(width * 0.12, 92), -0.08, 0.8);
      drawSprite("satellite_A", width * 0.82, horizon + height * 0.07, Math.min(width * 0.08, 54), Math.min(width * 0.08, 54), g.time * 0.1, 0.85);

      for (const obj of [...g.objects].sort((a, b) => a.z - b.z)) {
        const z = Math.min(1.1, obj.z);
        const scale = 0.17 + z * 1.22;
        const x = width / 2 + obj.x * width * (0.1 + z * 0.34);
        const y = horizon + (height - horizon) * z * z * 0.84;
        const size = Math.min(width * 0.18, 36 + scale * Math.min(width, height) * 0.12);
        drawSprite(obj.sprite, x, y, size, size, obj.kind === "meteor" ? obj.phase * 0.3 : Math.sin(obj.phase) * 0.08, Math.min(1, 0.6 + z));
      }
      for (const shot of g.shots) {
        const x = width / 2 + shot.x * width * (0.1 + shot.z * 0.34);
        const y = horizon + (height - horizon) * shot.z * shot.z * 0.84;
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#b7f36b";
        ctx.strokeStyle = "#d6ff9f";
        ctx.lineWidth = Math.max(2, width * 0.003);
        ctx.beginPath();
        ctx.moveTo(x, y + 18);
        ctx.lineTo(x, y - 17);
        ctx.stroke();
        ctx.restore();
      }
      for (const p of g.particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 + (1 - p.life / p.max) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      const playerX = width / 2 + g.x * width * 0.34;
      const playerY = height * g.y;
      const boostVisual = keysRef.current.Shift || keysRef.current.x || keysRef.current.X || pointerRef.current.boost;
      if (running && (boostVisual || g.boost > 0.05)) drawSprite("effect_yellow", playerX, playerY + 30, 45 + g.boost * 25, 65 + g.boost * 30, Math.PI, 0.35 + g.boost * 0.5);
      const shipTilt = (pointerRef.current.right || keysRef.current.ArrowRight || keysRef.current.d || keysRef.current.D ? -0.24 : 0) + (pointerRef.current.left || keysRef.current.ArrowLeft || keysRef.current.a || keysRef.current.A ? 0.24 : 0);
      drawSprite("ship_A", playerX, playerY, Math.min(width * 0.19, 90), Math.min(width * 0.19, 90), shipTilt, 1);
      if (g.flash > 0) {
        ctx.fillStyle = `rgba(255,70,78,${g.flash * 0.17})`;
        ctx.fillRect(0, 0, width, height);
      }
      frame++;
      if (frame % 240 === 0 && statusRef.current === "over") setHud({ score: g.score, lives: g.lives, wave: g.wave, time: Math.floor(g.time) });
    };
    raf = requestAnimationFrame(render);
    const keyDown = (event: KeyboardEvent) => {
      const key = event.key === " " ? " " : event.key;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Shift"].includes(key)) event.preventDefault();
      keysRef.current[key] = true;
      if (key === "Escape") {
        if (statusRef.current === "running") changeStatus("paused");
        else if (statusRef.current === "paused") changeStatus("running");
      }
    };
    const keyUp = (event: KeyboardEvent) => { keysRef.current[event.key === " " ? " " : event.key] = false; };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      soundRef.current?.close().catch(() => undefined);
    };
  }, [changeStatus]);

  const press = (key: string) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current[key] = true;
  };
  const release = (key: string) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    pointerRef.current[key] = false;
  };

  return (
    <main className={embedded ? "ggl-space is-embedded" : "ggl-space"}>
      <header className="space-nav">
        <Link href="/ggltournaments" className="space-back">← GGL Tournaments</Link>
        <div className="space-brand"><span>GGL</span> SPACE FLIGHT</div>
        <button className="space-sound" onClick={toggleSound} aria-pressed={soundOn}>{soundOn ? "Sound on" : "Sound off"}</button>
      </header>
      <section className="space-intro">
        <p className="space-kicker"><span /> GGL ARCADE · FLIGHT TRAINING</p>
        <h1>Take the fight <em>to space.</em></h1>
        <p>Fly the sector, line up your shots, dodge incoming debris and see how long you can hold the line.</p>
      </section>
      <section className="space-game-shell" aria-label="Playable space shooter">
        <div className="space-hud">
          <div><small>SCORE</small><strong>{hud.score.toLocaleString()}</strong></div>
          <div><small>BEST</small><strong>{bestScore.toLocaleString()}</strong></div>
          <div><small>SECTOR</small><strong>{String(hud.wave).padStart(2, "0")}</strong></div>
          <div><small>HULL</small><strong className={hud.lives < 2 ? "critical" : ""}>{"◆".repeat(Math.max(0, hud.lives))}<span>{"◇".repeat(Math.max(0, 3 - hud.lives))}</span></strong></div>
          <div><small>FLIGHT TIME</small><strong>{Math.floor(hud.time / 60).toString().padStart(2, "0")}:{(hud.time % 60).toString().padStart(2, "0")}</strong></div>
        </div>
        <div className="space-stage" ref={stageRef}>
          <canvas ref={canvasRef} aria-label="Space flight game view" />
          {status !== "running" && <div className="space-overlay">
            <div className="space-overlay-card">
              <p className="space-kicker">{status === "over" ? "MISSION ENDED" : status === "paused" ? "FLIGHT PAUSED" : "PILOT BRIEFING"}</p>
              <h2>{status === "over" ? "Sector lost." : status === "paused" ? "Catch your breath." : "Ready for launch?"}</h2>
              <p>{status === "over" ? `You scored ${hud.score.toLocaleString()} points across ${hud.wave} sector${hud.wave === 1 ? "" : "s"}. Run it back and beat your record.` : status === "paused" ? "Your ship is holding position. Resume when you're ready." : "Steer through the field, shoot enemy craft and avoid the meteors. Each sector gets faster."}</p>
              <button className="space-launch" onClick={status === "paused" ? () => changeStatus("running") : startGame}>{status === "over" ? "Fly again" : status === "paused" ? "Resume flight" : "Launch mission"} <span>↗</span></button>
              <div className="space-key-help"><span>MOVE <b>WASD / ARROWS</b></span><span>SHOOT <b>SPACE</b></span><span>BOOST <b>SHIFT</b></span></div>
            </div>
          </div>}
          <div className="space-stage-label"><span>GGL FLIGHT SYSTEMS</span><span>LIVE SIMULATION</span></div>
        </div>
        <div className="space-controls" aria-label="Touch controls">
          <div className="space-dpad">
            <button aria-label="Fly up" onPointerDown={press("up")} onPointerUp={release("up")} onPointerCancel={release("up")}>↑</button>
            <div><button aria-label="Fly left" onPointerDown={press("left")} onPointerUp={release("left")} onPointerCancel={release("left")}>←</button><button aria-label="Fly down" onPointerDown={press("down")} onPointerUp={release("down")} onPointerCancel={release("down")}>↓</button><button aria-label="Fly right" onPointerDown={press("right")} onPointerUp={release("right")} onPointerCancel={release("right")}>→</button></div>
          </div>
          <div className="space-action-controls">
            <button className="space-fire" onPointerDown={press("fire")} onPointerUp={release("fire")} onPointerCancel={release("fire")}>FIRE</button>
            <button className="space-boost" onPointerDown={press("boost")} onPointerUp={release("boost")} onPointerCancel={release("boost")}>BOOST</button>
          </div>
        </div>
        <div className="space-bottom-bar"><span>KENNEY SIMPLE SPACE · CC0 ASSETS</span><button onClick={() => changeStatus(status === "running" ? "paused" : status === "paused" ? "running" : status)}>{status === "running" ? "Pause flight Ⅱ" : status === "paused" ? "Resume flight ▶" : status === "over" ? "Mission complete" : "Training mode"}</button><span>PERSONAL SCORE · LOCAL SESSION</span></div>
      </section>
      <section className="space-howto">
        <div><p className="space-kicker">THE CONTROLS</p><h2>Fly smart.<br /><em>Fire clean.</em></h2></div>
        <div className="space-howto-grid">
          <article><span>01</span><strong>Fly</strong><p>Use the direction pad or WASD / arrow keys to line up your ship and avoid incoming debris.</p></article>
          <article><span>02</span><strong>Fire</strong><p>Hold FIRE or Space to send a steady burst downrange. Lead the target as it approaches.</p></article>
          <article><span>03</span><strong>Boost</strong><p>Hold BOOST or Shift to accelerate through the sector. The field gets faster as you survive.</p></article>
        </div>
      </section>
      <footer className="space-footer"><Link href="/ggltournaments">← Back to GGL</Link><span>PLAY FAIR. RESPECT THE GAME.</span></footer>
    </main>
  );
}
