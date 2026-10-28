"use client";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { SPACE_TARGETS } from "./space-world";
import type { Controls, Phase, Race } from "./racing-warmup";
type Props = { raceRef: RefObject<Race>; controlsRef: RefObject<Controls>; phaseRef: RefObject<Phase> };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function makeShip() {
  const ship = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: "#b9d9e8", metalness: .82, roughness: .24 });
  const dark = new THREE.MeshStandardMaterial({ color: "#17283f", metalness: .7, roughness: .3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#1a8bc2", metalness: .48, roughness: .12, clearcoat: 1, emissive: "#075078", emissiveIntensity: .8 });
  const cyan = new THREE.MeshStandardMaterial({ color: "#65f5ff", emissive: "#13cde8", emissiveIntensity: 2.4 });
  const pink = new THREE.MeshStandardMaterial({ color: "#ff67d5", emissive: "#b31b8b", emissiveIntensity: 1.5 });
  const engine = new THREE.MeshStandardMaterial({ color: "#7cecff", emissive: "#32cfff", emissiveIntensity: 3.2 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.25, .56, 2.75, 10), hull);
  body.rotation.x = Math.PI / 2; body.position.set(0, .56, .05); ship.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.34, 1.18, 10), hull);
  nose.rotation.x = -Math.PI / 2; nose.position.set(0, .56, -1.9); ship.add(nose);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.34, 12, 8), glass);
  cockpit.scale.set(.78, .72, 1.22); cockpit.position.set(0, .88, -.58); ship.add(cockpit);
  const wings = new THREE.Mesh(new THREE.BoxGeometry(2.65, .12, .82), dark); wings.position.set(0, .42, .38); ship.add(wings);
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.16, .34, .9), hull); fin.position.set(side * .91, .57, .92); fin.rotation.z = side * -.18; ship.add(fin);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.105, 8, 6), side < 0 ? pink : cyan); lamp.position.set(side * 1.18, .49, .02); ship.add(lamp);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(.2, .28, .42, 10), dark); bell.rotation.x = Math.PI / 2; bell.position.set(side * .34, .45, 1.43); ship.add(bell);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.15, 10, 8), engine); core.position.set(side * .34, .45, 1.65); ship.add(core);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.24, 1.35, 10), new THREE.MeshBasicMaterial({ color: "#55eaff", transparent: true, opacity: .9 }));
  flame.rotation.x = Math.PI / 2; flame.position.set(0, .47, 2.05); flame.visible = false; ship.add(flame); ship.userData.flame = flame;
  return ship;
}
function stars(count: number) {
  const a: number[] = [];
  for (let i = 0; i < count; i++) { const angle = i * 2.3999632297; const y = ((i * 37.719) % 1) * 2 - 1; const r = 250 + ((i * 71.13) % 1) * 720; const q = Math.sqrt(Math.max(0, 1 - y * y)); a.push(Math.cos(angle) * q * r, y * r, Math.sin(angle) * q * r); }
  return a;
}
export default function Racing3DScene({ raceRef, controlsRef, phaseRef }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = mountRef.current; if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" }); }
    catch { host.dataset.webgl = "unavailable"; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(host.clientWidth || 800, host.clientHeight || 480, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute("aria-label", "Open-world 3D space exploration with planetary landing, docking and life-pod recovery"); host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#030716"); scene.fog = new THREE.FogExp2("#030716", .00012);
    const camera = new THREE.PerspectiveCamera(66, (host.clientWidth || 800) / (host.clientHeight || 480), .1, 1800);
    scene.add(new THREE.HemisphereLight("#9ebdff", "#11112e", 1.25));
    const blueLight = new THREE.PointLight("#6a7dff", 850, 480, 2); blueLight.position.set(-110, 80, -90); scene.add(blueLight);
    const violetLight = new THREE.PointLight("#d04cff", 620, 420, 2); violetLight.position.set(130, 45, 100); scene.add(violetLight);
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(stars(1900), 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: "#c5e8ff", size: 1.25, sizeAttenuation: true, transparent: true, opacity: .92 })));
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? "#4c35a8" : "#126f9a", transparent: true, opacity: .035, side: THREE.BackSide, depthWrite: false }));
      cloud.position.set(Math.sin(i * 2.1) * 260, Math.cos(i * 1.7) * 110, -180 - i * 74); cloud.scale.set(100 + i % 4 * 40, 55 + i % 3 * 30, 95 + i % 5 * 28); scene.add(cloud);
    }
    const planetMeshes = new Map<string, THREE.Group>();
    for (const t of SPACE_TARGETS.filter(x => x.kind === "planet" || x.kind === "moon")) {
      const g = new THREE.Group(); g.position.set(...t.position);
      const verdant = t.id === "verdant", azure = t.id === "azure";
      const color = verdant ? "#267c78" : azure ? "#3157b7" : "#9a634d";
      g.add(new THREE.Mesh(new THREE.SphereGeometry(t.radius, 36, 28), new THREE.MeshStandardMaterial({ color, roughness: .92, metalness: .04, emissive: verdant ? "#0b413d" : azure ? "#0a164b" : "#31180f", emissiveIntensity: .55, flatShading: true })));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(t.radius * 1.045, 32, 24), new THREE.MeshBasicMaterial({ color: verdant ? "#42e4c7" : azure ? "#718aff" : "#ff9966", transparent: true, opacity: .12, side: THREE.BackSide })));
      if (azure) { const ring = new THREE.Mesh(new THREE.TorusGeometry(t.radius * 1.35, 1.15, 8, 120), new THREE.MeshBasicMaterial({ color: "#9b83ff", transparent: true, opacity: .58 })); ring.rotation.x = 1.08; ring.rotation.y = -.32; g.add(ring); }
      scene.add(g); planetMeshes.set(t.id, g);
    }
    const station = new THREE.Group(); station.position.set(0, 24, -118);
    const stationCore = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 15, 16), new THREE.MeshStandardMaterial({ color: "#283c57", metalness: .75, roughness: .32 })); stationCore.rotation.x = Math.PI / 2; station.add(stationCore);
    const stationRing = new THREE.Mesh(new THREE.TorusGeometry(13, 1.25, 10, 64), new THREE.MeshStandardMaterial({ color: "#76f5ff", emissive: "#1cc8ff", emissiveIntensity: 1.8, metalness: .55, roughness: .24 })); stationRing.rotation.x = Math.PI / 2; station.add(stationRing);
    for (let i = 0; i < 6; i++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 16), new THREE.MeshStandardMaterial({ color: "#8da9bd", metalness: .8, roughness: .3 })); arm.rotation.z = i * Math.PI / 3; station.add(arm); }
    scene.add(station);
    const markers = new Map<string, THREE.Group>(), pods = new Map<string, THREE.Group>();
    for (const t of SPACE_TARGETS) {
      const marker = new THREE.Group(); marker.position.set(...t.position);
      const color = t.kind === "pod" ? "#ffd66b" : t.kind === "station" ? "#65f5ff" : "#b2a4ff";
      const y = t.kind === "pod" ? 6 : t.radius + 12;
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(t.kind === "pod" ? 1.4 : 2.3, 0), new THREE.MeshBasicMaterial({ color })); beacon.position.y = y; marker.add(beacon);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(t.kind === "pod" ? 4.8 : 8, .16, 6, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7 })); ring.position.y = y; marker.add(ring);
      scene.add(marker); markers.set(t.id, marker);
      if (t.kind === "pod") {
        const pod = new THREE.Group(); const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 2.4, 4, 8), new THREE.MeshStandardMaterial({ color: "#e9e7da", metalness: .6, roughness: .3, emissive: "#59411b", emissiveIntensity: .45 })); capsule.rotation.z = Math.PI / 2; pod.add(capsule);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(.45, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffd66b" })); lamp.position.y = 1.1; pod.add(lamp); pod.position.set(...t.position); scene.add(pod); pods.set(t.id, pod);
      }
    }
    const ship = makeShip(); ship.scale.setScalar(.82); scene.add(ship);
    const engineGlow = new THREE.PointLight("#31cfff", 12, 15, 2); ship.add(engineGlow);
    const navGeometry = new THREE.BufferGeometry(); navGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const navLine = new THREE.Line(navGeometry, new THREE.LineBasicMaterial({ color: "#65f5ff", transparent: true, opacity: .48 })); scene.add(navLine);
    const clock = new THREE.Clock(); let raf = 0; let interactionLatch = false, scanLatch = false;
    const resize = () => { const w = Math.max(280, host.clientWidth), h = Math.max(320, host.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const render = () => {
      const race = raceRef.current, controls = controlsRef.current, running = phaseRef.current === "running", dt = Math.min(clock.getDelta(), .05);
      const target = SPACE_TARGETS.find(t => t.id === race.targetId) || SPACE_TARGETS[0];
      const targetPos = new THREE.Vector3(...target.position);
      const pos = new THREE.Vector3(race.worldX, race.worldY, race.worldZ);
      race.targetDistance = pos.distanceTo(targetPos);
      const forward = new THREE.Vector3(-Math.sin(race.worldYaw), 0, -Math.cos(race.worldYaw));
      ship.position.copy(pos); ship.rotation.y = race.worldYaw; ship.rotation.x = clamp(-race.velocityZ * .008, -.18, .18); ship.rotation.z = clamp(-race.steering * .14, -.24, .24);
      const camPos = pos.clone().add(forward.clone().multiplyScalar(-15)).add(new THREE.Vector3(0, 6.5, 0));
      const camLook = pos.clone().add(forward.clone().multiplyScalar(13)).add(new THREE.Vector3(0, 1.8, 0));
      camera.position.lerp(camPos, 1 - Math.exp(-dt * 3.5)); camera.lookAt(camLook);
      const flame = ship.userData.flame as THREE.Object3D | undefined;
      if (flame) { flame.visible = running && controls.boost && race.nos > 0; flame.scale.setScalar(.82 + Math.sin(clock.elapsedTime * 42) * .18); }
      engineGlow.intensity = controls.boost ? 28 : 12;
      const nav = navLine.geometry.getAttribute("position") as THREE.BufferAttribute; nav.setXYZ(0, pos.x, pos.y, pos.z); nav.setXYZ(1, targetPos.x, targetPos.y, targetPos.z); nav.needsUpdate = true; navLine.visible = race.targetDistance < 650;
      markers.forEach((m, id) => { m.scale.setScalar(1 + Math.sin(clock.elapsedTime * (id === target.id ? 3 : 2) + id.length) * (id === target.id ? .08 : .035)); });
      pods.forEach((pod, id) => { pod.rotation.y += dt * .3; pod.visible = !race.rescuedPods.includes(id); });
      planetMeshes.forEach((g, id) => { g.rotation.y += dt * (id === "verdant" ? .035 : .018); }); station.rotation.z += dt * .012;
      if (running && controls.scan && !scanLatch) {
        scanLatch = true;
        if (target.kind === "planet" || target.kind === "moon") {
          if (!race.discovered.includes(target.id)) race.discovered.push(target.id);
          race.message = target.id === "verdant" ? "SCAN COMPLETE · biosignatures detected. A careful landing may preserve a living ecosystem." : target.id === "azure" ? "SCAN COMPLETE · water traces and possible microbial signatures recorded." : "SCAN COMPLETE · mineral shelter found. No confirmed biosignatures yet.";
        } else if (target.kind === "pod") race.message = race.rescuedPods.includes(target.id) ? "This life pod has already been recovered." : "LIFE POD BEACON · approach within 19 units and select RECOVER.";
        else race.message = "GGL HAVEN · docking hub, preservation registry and mission supplies.";
      }
      if (!controls.scan) scanLatch = false;
      if (running && controls.interact && !interactionLatch) {
        interactionLatch = true; const d = pos.distanceTo(targetPos);
        if (target.kind === "pod") {
          if (race.rescuedPods.includes(target.id)) race.message = "Life pod already recovered.";
          else if (d <= 19) { race.rescuedPods.push(target.id); race.rescued = race.rescuedPods.length; race.message = `LIFE POD RECOVERED · ${race.rescued}/3 population groups preserved.`; }
          else race.message = `Life pod is ${Math.round(d)} units away. Follow its beacon to recover it.`;
        } else if (target.kind === "station") {
          if (d <= 26 && race.speed <= 14) { race.docked = !race.docked; race.message = race.docked ? "DOCKING CLAMPS SECURED · GGL Haven services available." : "UNDOCKED · clear to explore."; if (race.docked) { race.worldX = 0; race.worldY = 24; race.worldZ = -118; race.velocityX = 0; race.velocityZ = 0; race.speed = 0; } }
          else race.message = d > 26 ? "Approach GGL Haven's cyan ring to dock." : "Too fast to dock safely. Reduce speed below 14.";
        } else if (d <= target.radius + 18 && race.speed <= 11) {
          race.landed = race.landed === target.id ? null : target.id; race.docked = false; race.velocityX = 0; race.velocityZ = 0; race.speed = 0;
          race.message = race.landed ? `LANDED ON ${target.label.toUpperCase()} · survey the surface and preserve what lives here.` : `LIFT-OFF READY · leaving ${target.label} orbit.`;
          if (race.landed) { race.worldX = target.position[0]; race.worldY = target.position[1] + target.radius + 3; race.worldZ = target.position[2]; }
        } else race.message = d > target.radius + 18 ? `Too far to land. Close to ${target.label} and slow down.` : "Landing denied · slow to 11 or below before touchdown.";
      }
      if (!controls.interact) interactionLatch = false;
      renderer.render(scene, camera); raf = requestAnimationFrame(render);
    };
    resize(); window.addEventListener("resize", resize); raf = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); scene.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => x.dispose()); }); renderer.dispose(); if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement); };
  }, [raceRef, controlsRef, phaseRef]);
  return <div ref={mountRef} className="racing-3d-root space-world-canvas" data-phase={phaseRef.current} />;
}
