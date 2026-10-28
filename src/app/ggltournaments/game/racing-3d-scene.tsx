"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Controls, Phase, Race } from "./racing-warmup";

type Props = { raceRef: RefObject<Race>; controlsRef: RefObject<Controls>; phaseRef: RefObject<Phase> };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function makeCar() {
  const ship = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: "#b9d9e8", metalness: .82, roughness: .24 });
  const darkHull = new THREE.MeshStandardMaterial({ color: "#17283f", metalness: .7, roughness: .3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#1a8bc2", metalness: .48, roughness: .12, clearcoat: 1, emissive: "#075078", emissiveIntensity: .8 });
  const cyan = new THREE.MeshStandardMaterial({ color: "#65f5ff", emissive: "#13cde8", emissiveIntensity: 2.4, metalness: .25, roughness: .2 });
  const magenta = new THREE.MeshStandardMaterial({ color: "#ff67d5", emissive: "#b31b8b", emissiveIntensity: 1.5, metalness: .35, roughness: .25 });
  const engine = new THREE.MeshStandardMaterial({ color: "#7cecff", emissive: "#32cfff", emissiveIntensity: 3.2, metalness: .4, roughness: .18 });
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(.25,.56,2.75,10,1),hull);
  fuselage.rotation.x=Math.PI/2; fuselage.position.set(0,.56,.05); fuselage.castShadow=true; ship.add(fuselage);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.34,1.18,10),hull);
  nose.rotation.x=-Math.PI/2; nose.position.set(0,.56,-1.9); nose.castShadow=true; ship.add(nose);
  const cockpit=new THREE.Mesh(new THREE.SphereGeometry(.34,12,8),glass);
  cockpit.scale.set(.78,.72,1.22); cockpit.position.set(0,.88,-.58); cockpit.castShadow=true; ship.add(cockpit);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(2.65,.12,.82),darkHull);
  wing.position.set(0,.42,.38); wing.rotation.y=-.04; wing.castShadow=true; ship.add(wing);
  for(const side of [-1,1]){
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.16,.34,.9),hull);
    fin.position.set(side*.91,.57,.92); fin.rotation.z=side*-.18; fin.castShadow=true; ship.add(fin);
    const wingLight=new THREE.Mesh(new THREE.SphereGeometry(.105,8,6),side<0?magenta:cyan);
    wingLight.position.set(side*1.18,.49,.02); ship.add(wingLight);
    const bell=new THREE.Mesh(new THREE.CylinderGeometry(.2,.28,.42,10),darkHull);
    bell.rotation.x=Math.PI/2; bell.position.set(side*.34,.45,1.43); ship.add(bell);
    const core=new THREE.Mesh(new THREE.SphereGeometry(.15,10,8),engine);
    core.position.set(side*.34,.45,1.65); ship.add(core);
  }
  const noseLight=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),cyan);
  noseLight.position.set(0,.56,-2.38); ship.add(noseLight);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.24,1.35,10),new THREE.MeshBasicMaterial({color:"#55eaff",transparent:true,opacity:.9}));
  flame.rotation.x=Math.PI/2; flame.position.set(0,.47,2.05); flame.visible=false; ship.add(flame);
  ship.userData.flame=flame;
  return ship;
}

export default function Racing3DScene({ raceRef, controlsRef, phaseRef }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const flightClockRef = useRef<HTMLDivElement>(null);
  const shipMapMarkerRef = useRef<SVGGElement>(null);
  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      host.dataset.webgl = "unavailable";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(host.clientWidth || 800, host.clientHeight || 480, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", "Three-dimensional open-space exploration with spacecraft flight controls and rear chase camera");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#030716");
    const camera = new THREE.PerspectiveCamera(63,(host.clientWidth||800)/(host.clientHeight||480),.1,900);
    scene.add(new THREE.HemisphereLight("#9ebdff","#080b18",0.42));
    // A shared star lights the worlds; local time and rotation move the day/night boundary.
    const sunPosition = new THREE.Vector3(-320, 130, -250);
    const solarLight = new THREE.DirectionalLight("#ffe0a0", 3.2);
    solarLight.position.copy(sunPosition); solarLight.target.position.set(0, 0, 0); scene.add(solarLight, solarLight.target);
    const starLight = new THREE.PointLight("#ffe0a0", 420, 1200, 1.5);
    starLight.position.copy(sunPosition); scene.add(starLight);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(24, 32, 24), new THREE.MeshBasicMaterial({ color: "#fff0bd" }));
    sun.position.copy(sunPosition); scene.add(sun);
    const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(32, 24, 16), new THREE.MeshBasicMaterial({ color: "#ffbd65", transparent: true, opacity: .12, side: THREE.BackSide }));
    sunHalo.position.copy(sunPosition); scene.add(sunHalo);
    const nebulaLight=new THREE.PointLight("#d04cff",90,420,2); nebulaLight.position.set(130,45,100); scene.add(nebulaLight);
    const planetaryBodies: Array<{ body: THREE.Group; periodHours: number }> = [];
    let simulationSeconds = 0;
    let flightElapsedSeconds = 0;
    const starPositions:number[]=[];
    for(let i=0;i<1250;i++){const angle=i*2.399963229728653;const y=((i*37.719)%1)*2-1;const radius=260+((i*71.13)%1)*520;const rr=Math.sqrt(Math.max(0,1-y*y));starPositions.push(Math.cos(angle)*rr*radius,y*radius*.68,Math.sin(angle)*rr*radius);}
    const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute("position",new THREE.Float32BufferAttribute(starPositions,3));
    scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:"#c5e8ff",size:1.35,sizeAttenuation:true,transparent:true,opacity:.92})));
    // Open space has landmarks, not a road, rail, or invisible track limits.
    const addPlanet = (name: string, position: [number, number, number], radius: number, color: string, glow: string, ringed = false) => {
      const world = new THREE.Group();
      world.name = name;
      world.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), new THREE.MeshStandardMaterial({ color, roughness: .9, metalness: .08, emissive: glow, emissiveIntensity: .055, flatShading: true })));
      world.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 28, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .12, side: THREE.BackSide })));
      if (ringed) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.32, Math.max(.6, radius * .025), 8, 96), new THREE.MeshBasicMaterial({ color: "#9b83ff", transparent: true, opacity: .58 }));
        ring.rotation.x = 1.08; ring.rotation.y = -.32; world.add(ring);
      }
      world.position.set(...position); scene.add(world);
      planetaryBodies.push({ body: world, periodHours: 18 + planetaryBodies.length * 7 });
    };
    addPlanet("Aster", [170, 25, 30], 31, "#4d438d", "#20165d", true);
    addPlanet("Cobalt", [290, -22, 145], 43, "#276f9f", "#103a70");
    addPlanet("Verdant", [460, 75, -85], 52, "#367b62", "#123f2d", true);
    addPlanet("Ember", [-170, 52, -80], 24, "#a75b42", "#512216");
    addPlanet("Frost", [120, -88, 400], 35, "#9ebdce", "#315a75");
    const moon = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 16), new THREE.MeshStandardMaterial({ color: "#7b9bb4", roughness: .95, metalness: .12, flatShading: true }));
    moon.position.set(-155, 12, -85); scene.add(moon);
    const car = makeCar();
    // Preserve the original spacecraft silhouette and its established scale.
    car.scale.setScalar(0.82);
    scene.add(car);
    let altitude = 0;
    const clock = new THREE.Clock();
    let lastClockPaint = -1;
    let raf = 0;
    const resize = () => {
      const w = Math.max(280, host.clientWidth), h = Math.max(320, host.clientHeight);
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const render = () => {
      const race = raceRef.current;
      const controls = controlsRef.current;
      const currentPhase = phaseRef.current;
      const frameDelta = Math.min(clock.getDelta(), .05);
      // Accelerated stellar time: four simulated minutes pass per real second.
      // One clock drives every planet's rotation and its changing sunlit hemisphere.
      if (currentPhase === "running") {
        simulationSeconds += frameDelta * 240;
        flightElapsedSeconds += frameDelta;
      }
      const simulationHours = simulationSeconds / 3600 + 6;
      for (const { body, periodHours } of planetaryBodies) {
        body.rotation.y = (simulationHours / periodHours) * Math.PI * 2;
      }
      if (flightClockRef.current && Math.floor(simulationSeconds / 60) !== lastClockPaint) {
        lastClockPaint = Math.floor(simulationSeconds / 60);
        const totalMinutes = (360 + Math.floor(simulationSeconds / 60)) % 1440;
        const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
        const minutes = (totalMinutes % 60).toString().padStart(2, "0");
        const flightMinutes = Math.floor(flightElapsedSeconds / 60).toString().padStart(2, "0");
        const flightSeconds = Math.floor(flightElapsedSeconds % 60).toString().padStart(2, "0");
        flightClockRef.current.textContent = `FLIGHT T+${flightMinutes}:${flightSeconds} · SYSTEM ${hours}:${minutes}`;
      }
      if (currentPhase === "running") {
        // GAS lifts the ship; BRAKE lowers it. The analog stick owns forward/reverse thrust.
        const verticalInput = (controls.accelerate ? 1 : 0) - (controls.brake ? 1 : 0);
        altitude = clamp(altitude + verticalInput * frameDelta * 8, -90, 90);
      }
      // Render the preserved spacecraft directly in unconstrained world space.
      const carWorld = new THREE.Vector3(race.worldX, .015 + altitude, race.worldZ);
      const forward = new THREE.Vector3(-Math.sin(race.worldYaw), 0, -Math.cos(race.worldYaw)).normalize();
      car.position.copy(carWorld);
      car.rotation.y = race.worldYaw;
      if (shipMapMarkerRef.current) {
        const mapX = 10 + ((race.worldX + 220) / 720) * 160;
        const mapY = 10 + ((race.worldZ + 120) / 540) * 108;
        const mapAngle = -race.worldYaw * 180 / Math.PI;
        shipMapMarkerRef.current.setAttribute("transform", `translate(${mapX.toFixed(2)} ${mapY.toFixed(2)}) rotate(${mapAngle.toFixed(1)})`);
      }
      // Subtle suspension response: braking transfers load forward and cornering
      // rolls the body. These are visual cues driven by the physics state.
      car.rotation.x = clamp(-race.longitudinalLoad * 0.12, -0.035, 0.015);
      car.rotation.z = clamp(-race.lateralG * 0.035 - race.drift * 0.12, -0.055, 0.055);
      const cameraTarget = new THREE.Vector3(carWorld.x + forward.x * 10, carWorld.y + 1.25, carWorld.z + forward.z * 10);
      const cameraPosition = new THREE.Vector3(carWorld.x - forward.x * 8.4, carWorld.y + 4.7, carWorld.z - forward.z * 8.4);
      camera.position.lerp(cameraPosition, 1 - Math.exp(-frameDelta * 5.5));
      camera.lookAt(cameraTarget);
      const flame = car.userData.flame as THREE.Object3D | undefined;
      if (flame) {
        flame.visible = controls.boost && race.nos > 0 && !controls.brake && currentPhase === "running";
        const pulse = .82 + Math.sin(clock.elapsedTime * 42) * .18;
        flame.scale.setScalar(pulse);
      }
      if (currentPhase === "running") {
        camera.fov = 63 + Math.min(8, race.speed / 28) + (controls.boost && race.nos > 0 && !controls.brake ? 5 : 0);
      } else camera.fov = 63;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    resize(); window.addEventListener("resize", resize); raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener("resize", resize);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, [raceRef, controlsRef, phaseRef]);

  return <div ref={mountRef} className="racing-3d-root" data-phase={phaseRef.current} data-braking={controlsRef.current.brake ? "true" : "false"}>
    <div className="space-flight-clock" aria-label="Flight elapsed time and accelerated system time" ref={flightClockRef}>FLIGHT T+00:00 · SYSTEM 06:00</div>
    <div aria-label="System map" className="space-mini-map">
      <div className="space-mini-map-title">SYSTEM MAP <span>FREE SPACE</span></div>
      <svg viewBox="0 0 180 128" role="img" aria-label="Live system map. The ship marker moves and turns with your flight.">
        <path d="M8 64H172 M90 8V120" stroke="rgba(156,204,255,.14)" strokeDasharray="3 5" fill="none" />
        <circle cx="21.1" cy="18" r="6.8" fill="#a75b42" stroke="#eab08b" strokeWidth="1.2" />
        <circle cx="96.7" cy="40" r="10.5" fill="#4d438d" stroke="#a6a0ff" strokeWidth="1.5" />
        <ellipse cx="96.7" cy="40" rx="16" ry="3.5" fill="none" stroke="#a6a0ff" strokeWidth="1.5" transform="rotate(-18 96.7 40)" />
        <circle cx="123.3" cy="63" r="13.5" fill="#276f9f" stroke="#77d7f5" strokeWidth="1.5" />
        <circle cx="161.1" cy="17" r="16" fill="#367b62" stroke="#85d8ad" strokeWidth="1.5" />
        <circle cx="85.6" cy="114" r="9.5" fill="#9ebdce" stroke="#ccefff" strokeWidth="1.2" />
        <g ref={shipMapMarkerRef} transform="translate(58.9 48.4)">
          <circle r="7.5" fill="rgba(102,242,255,.17)" stroke="#66f2ff" strokeOpacity=".7" />
          <path d="M0 -6 L4.2 5 L0 2.7 L-4.2 5 Z" fill="#ffffff" stroke="#66f2ff" strokeWidth="1.1" />
        </g>
      </svg>
      <div className="space-mini-map-legend"><span><i className="map-ship-dot" /> YOU</span><span><i className="map-world-dot" /> PLANETS</span></div>
    </div>
  </div>;
}
