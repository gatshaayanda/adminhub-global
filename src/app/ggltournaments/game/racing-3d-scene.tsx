"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { getFirstFootholdCue, habitatStage, recordSpaceChronicle, WORLD_PLANETS } from "./space-civilisation";
import { SURVEY_WORLDS } from "./space-universe";
import type { Controls, Phase, Race, SpaceState } from "./racing-warmup";

type Props = { raceRef: RefObject<Race>; controlsRef: RefObject<Controls>; phaseRef: RefObject<Phase>; spaceStateRef: RefObject<SpaceState> };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mapPoint = (x: number, z: number): [number, number] => [10 + ((x + 650) / 1300) * 160, 10 + ((z + 600) / 1150) * 108];

function makeCar() {
  const ship = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: "#ff8acb", metalness: .48, roughness: .3, emissive: "#351027", emissiveIntensity: .22 });
  const darkHull = new THREE.MeshStandardMaterial({ color: "#202b40", metalness: .48, roughness: .36, emissive: "#101a2d", emissiveIntensity: .28 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#ffb7df", metalness: .28, roughness: .1, clearcoat: 1, emissive: "#a83d7a", emissiveIntensity: .9 });
  const cyan = new THREE.MeshStandardMaterial({ color: "#65f5ff", emissive: "#13cde8", emissiveIntensity: 2.4, metalness: .25, roughness: .2 });
  const magenta = new THREE.MeshStandardMaterial({ color: "#ff70bd", emissive: "#a82d69", emissiveIntensity: 1.25, metalness: .35, roughness: .25 });
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
  // Low-intensity navigation fill keeps the spacecraft silhouette readable in deep space.
  const pilotFill = new THREE.PointLight("#9cefff", 5.5, 18, 2);
  pilotFill.position.set(0, 1.4, -1.2);
  ship.add(pilotFill);
  const rearRim = new THREE.PointLight("#ff70bd", 3.5, 12, 2);
  rearRim.position.set(0, .7, 1.6);
  ship.add(rearRim);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.24,1.35,10),new THREE.MeshBasicMaterial({color:"#55eaff",transparent:true,opacity:.9}));
  flame.rotation.x=Math.PI/2; flame.position.set(0,.47,2.05); flame.visible=false; ship.add(flame);
  ship.userData.flame=flame;
  return ship;
}

export default function Racing3DScene({ raceRef, controlsRef, phaseRef, spaceStateRef }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const flightClockRef = useRef<HTMLDivElement>(null);
  const shipMapMarkerRef = useRef<SVGGElement>(null);
  const mapRouteRef = useRef<SVGLineElement>(null);
  const mapTargetMarkerRef = useRef<SVGCircleElement>(null);
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
    scene.add(new THREE.HemisphereLight("#b9d5ff", "#101729", 0.72));
    // One stable star illuminates every world; planetary rotation changes each world's day/night side.
    const sunPosition = new THREE.Vector3(-320, 130, -250);
    const solarLight = new THREE.DirectionalLight("#fff0cf", 4.2);
    solarLight.position.copy(sunPosition); solarLight.target.position.set(0, 0, 0); scene.add(solarLight, solarLight.target);
    const starLight = new THREE.PointLight("#ffe0a0", 680, 1500, 1.35);
    starLight.position.copy(sunPosition); scene.add(starLight);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(26, 40, 32), new THREE.MeshBasicMaterial({ color: "#fff6d6" }));
    sun.position.copy(sunPosition); scene.add(sun);
    const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(35, 32, 24), new THREE.MeshBasicMaterial({ color: "#ffbd65", transparent: true, opacity: .16, side: THREE.BackSide, depthWrite: false }));
    sunHalo.position.copy(sunPosition); scene.add(sunHalo);
    const sunCorona = new THREE.Mesh(new THREE.SphereGeometry(44, 32, 24), new THREE.MeshBasicMaterial({ color: "#ff8c42", transparent: true, opacity: .045, side: THREE.BackSide, depthWrite: false }));
    sunCorona.position.copy(sunPosition); scene.add(sunCorona);
    const nebulaLight=new THREE.PointLight("#d04cff",90,420,2); nebulaLight.position.set(130,45,100); scene.add(nebulaLight);
    const planetaryBodies: Array<{ body: THREE.Group; periodHours: number }> = [];
    const planetBarriers: Array<{ center: THREE.Vector3; radius: number }> = [];
    const planetVisuals: Record<string, { body: THREE.Group; surface: THREE.Mesh; atmosphere: THREE.Mesh; forcefield: THREE.Mesh; radius: number; baseColor: THREE.Color }> = {};
    const colonyVisuals: Record<string, { root: THREE.Group; buildings: THREE.Group[] }> = {};
    const deployedMachines: Record<string, THREE.Group[]> = {};
    const terraformPulses: Record<string, { mesh: THREE.Mesh; age: number; installed: number }> = {};
    const planetBeacons: Record<string, { root: THREE.Group; ring: THREE.Mesh; beam: THREE.Mesh; orb: THREE.Mesh }> = {};
    const worldOriginUp = new THREE.Vector3(0, 1, 0);
    let simulationSeconds = spaceStateRef.current.worldTimeMinutes * 60;
    let flightElapsedSeconds = 0;
    const starPositions:number[]=[];
    for(let i=0;i<1250;i++){const angle=i*2.399963229728653;const y=((i*37.719)%1)*2-1;const radius=260+((i*71.13)%1)*520;const rr=Math.sqrt(Math.max(0,1-y*y));starPositions.push(Math.cos(angle)*rr*radius,y*radius*.68,Math.sin(angle)*rr*radius);}
    const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute("position",new THREE.Float32BufferAttribute(starPositions,3));
    scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:"#c5e8ff",size:1.35,sizeAttenuation:true,transparent:true,opacity:.92})));
    // Open space has landmarks, not a road, rail, or invisible track limits.
    const addPlanet = (name: string, position: [number, number, number], radius: number, color: string, glow: string, ringed = false) => {
      const world = new THREE.Group();
      world.name = name;
      const surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), new THREE.MeshStandardMaterial({ color, roughness: .9, metalness: .08, emissive: glow, emissiveIntensity: .055, flatShading: true }));
      world.add(surface);
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 28, 20), new THREE.MeshBasicMaterial({ color: "#8ef2d0", transparent: true, opacity: .025, side: THREE.BackSide }));
      world.add(atmosphere);
      // Visible atmospheric forcefield and matching collision radius share one boundary.
      const forcefield = new THREE.Mesh(
        new THREE.SphereGeometry(radius + 7, 32, 24),
        new THREE.MeshBasicMaterial({ color: "#83eaff", transparent: true, opacity: .075, side: THREE.BackSide, depthWrite: false })
      );
      world.add(forcefield);
      planetBarriers.push({ center: new THREE.Vector3(...position), radius: radius + 7 });
      if (ringed) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.32, Math.max(.6, radius * .025), 8, 96), new THREE.MeshBasicMaterial({ color: "#9b83ff", transparent: true, opacity: .58 }));
        ring.rotation.x = 1.08; ring.rotation.y = -.32; world.add(ring);
      }
      world.position.set(...position); scene.add(world);
      planetVisuals[name] = { body: world, surface, atmosphere, forcefield, radius, baseColor: new THREE.Color(color) };
      const navBeacon = new THREE.Group();
      navBeacon.name = name + " navigation beacon";
      const beaconMaterial = new THREE.MeshBasicMaterial({ color: "#c5f36b", transparent: true, opacity: .72, depthWrite: false });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.18, .65, 13, 8), beaconMaterial);
      beam.position.y = radius + 5.6;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.1, .32, 8, 36), new THREE.MeshBasicMaterial({ color: "#c5f36b", transparent: true, opacity: .9, depthWrite: false }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = radius + 13;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(.8, 10, 8), new THREE.MeshBasicMaterial({ color: "#f4ffbe", transparent: true, opacity: .95 }));
      orb.position.y = radius + 16;
      navBeacon.add(beam, ring, orb);
      navBeacon.visible = false;
      world.add(navBeacon);
      planetBeacons[name] = { root: navBeacon, ring, beam, orb };
      const terraformPulse = new THREE.Mesh(
        new THREE.SphereGeometry(radius + 8, 22, 16),
        new THREE.MeshBasicMaterial({ color: "#78f0b1", wireframe: true, transparent: true, opacity: 0, depthWrite: false })
      );
      terraformPulse.position.set(...position);
      terraformPulse.visible = false;
      scene.add(terraformPulse);
      terraformPulses[name] = { mesh: terraformPulse, age: 2, installed: spaceStateRef.current.deployedEquipment[name] || 0 };
      // The settlement is a small, legible silhouette on the equator; its scale grows with the actual local population.
      const settlement = new THREE.Group();
      settlement.name = name + " settlement";
      const buildingMaterial = new THREE.MeshStandardMaterial({ color: "#b8d5e6", metalness: .5, roughness: .48, emissive: "#245d70", emissiveIntensity: .18 });
      const habitatGlass = new THREE.MeshStandardMaterial({ color: "#75f0e0", metalness: .22, roughness: .2, emissive: "#26d8c9", emissiveIntensity: 1.5 });
      const solarMaterial = new THREE.MeshStandardMaterial({ color: "#3e73a5", metalness: .62, roughness: .26, emissive: "#185187", emissiveIntensity: .6 });
      const settlementBuildings: THREE.Group[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const habitat = new THREE.Group();
        const surfaceNormal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        habitat.position.copy(surfaceNormal.clone().multiplyScalar(radius + .06));
        habitat.quaternion.setFromUnitVectors(worldOriginUp, surfaceNormal);
        const footing = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.65, .6, 8), buildingMaterial);
        footing.position.y = .3;
        habitat.add(footing);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.1, 2.2), buildingMaterial);
        tower.position.y = 2.0;
        habitat.add(tower);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 7), habitatGlass);
        dome.scale.y = .7;
        dome.position.y = 3.8;
        habitat.add(dome);
        const solar = new THREE.Mesh(new THREE.BoxGeometry(3.8, .12, 1.4), solarMaterial);
        solar.position.set(2.1, 1.5, .1);
        solar.rotation.z = -.1;
        habitat.add(solar);
        habitat.scale.setScalar(.01);
        settlement.add(habitat);
        settlementBuildings.push(habitat);
      }
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, 4.8, 6), habitatGlass);
      beacon.position.set(0, radius + 1.8, 0);
      settlement.add(beacon);
      settlement.visible = false;
      world.add(settlement);
      colonyVisuals[name] = { root: settlement, buildings: settlementBuildings };
      planetaryBodies.push({ body: world, periodHours: 18 + planetaryBodies.length * 7 });
      deployedMachines[name] = [];
      for (let i = 0; i < 12; i++) { const machine = new THREE.Group(); const metal = new THREE.MeshStandardMaterial({ color: "#b7c6d7", metalness: .72, roughness: .34, emissive: "#2c6d82", emissiveIntensity: .22 }); const core = new THREE.Mesh(new THREE.CylinderGeometry(.8, 1.05, 2.5, 8), metal); core.position.y = 1.25; machine.add(core); const cap = new THREE.Mesh(new THREE.CylinderGeometry(.35, .65, .45, 8), new THREE.MeshStandardMaterial({ color: "#24364b", metalness: .48, roughness: .5 })); cap.position.y = 2.65; machine.add(cap); const panel = new THREE.Mesh(new THREE.BoxGeometry(2.8, .12, 1.2), new THREE.MeshStandardMaterial({ color: "#4c86b5", metalness: .55, roughness: .32, emissive: "#102b4c", emissiveIntensity: .25 })); panel.position.set(1.6, 1.1, .1); panel.rotation.z = -.12; machine.add(panel); const angle = i * Math.PI / 6; const surfaceNormal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)); machine.position.copy(surfaceNormal.clone().multiplyScalar(radius + .15)); machine.quaternion.setFromUnitVectors(worldOriginUp, surfaceNormal); machine.visible = false; world.add(machine); deployedMachines[name].push(machine); }
    };
    addPlanet("Aster", [170, 25, 30], 31, "#4d438d", "#20165d", true);
    addPlanet("Cobalt", [290, -22, 145], 43, "#276f9f", "#103a70");
    addPlanet("Verdant", [460, 75, -85], 52, "#367b62", "#123f2d", true);
    addPlanet("Ember", [-170, 52, -80], 24, "#a75b42", "#512216");
    addPlanet("Frost", [120, -88, 400], 35, "#9ebdce", "#315a75"); 
    // Fifteen additional planetary bodies are physically present in the same navigable space.
    // Their names and environmental intelligence remain masked until a close-range scan.
    for (const worldData of SURVEY_WORLDS) {
      const world = new THREE.Group();
      world.name = worldData.id;
      const surface = new THREE.Mesh(new THREE.SphereGeometry(worldData.radius, 28, 20), new THREE.MeshStandardMaterial({ color: worldData.color, roughness: .92, metalness: .08, emissive: worldData.glow, emissiveIntensity: worldData.id === "signal-08" ? .42 : .07, flatShading: true }));
      world.add(surface);
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(worldData.radius * 1.045, 24, 18), new THREE.MeshBasicMaterial({ color: worldData.glow, transparent: true, opacity: worldData.id === "signal-08" ? .24 : .025, side: THREE.BackSide }));
      world.add(atmosphere);
      const forcefield = new THREE.Mesh(new THREE.SphereGeometry(worldData.radius + 7, 28, 20), new THREE.MeshBasicMaterial({ color: "#83eaff", transparent: true, opacity: .075, side: THREE.BackSide, depthWrite: false }));
      world.add(forcefield);
      world.position.set(...worldData.position);
      scene.add(world);
      planetVisuals[worldData.id] = { body: world, surface, atmosphere, forcefield, radius: worldData.radius, baseColor: new THREE.Color(worldData.color) };
      planetBarriers.push({ center: new THREE.Vector3(...worldData.position), radius: worldData.radius + 7 });
      planetaryBodies.push({ body: world, periodHours: 24 + planetaryBodies.length * 5 });
      const beacon = new THREE.Group();
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.16, .55, 12, 8), new THREE.MeshBasicMaterial({ color: "#c5f36b", transparent: true, opacity: .72, depthWrite: false }));
      beam.position.y = worldData.radius + 5;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.7, .28, 8, 32), new THREE.MeshBasicMaterial({ color: "#c5f36b", transparent: true, opacity: .9, depthWrite: false }));
      ring.rotation.x = Math.PI / 2; ring.position.y = worldData.radius + 12;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(.72, 10, 8), new THREE.MeshBasicMaterial({ color: "#f4ffbe" }));
      orb.position.y = worldData.radius + 15;
      beacon.add(beam, ring, orb); beacon.visible = false; world.add(beacon);
      planetBeacons[worldData.id] = { root: beacon, ring, beam, orb };
    }

    const station = new THREE.Group(); const stationMetal = new THREE.MeshStandardMaterial({ color: "#7c9ab8", metalness: .72, roughness: .35 }); const stationCore = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 10, 12), stationMetal); stationCore.rotation.x = Math.PI / 2; station.add(stationCore); const stationRing = new THREE.Mesh(new THREE.TorusGeometry(13, 1.2, 8, 48), new THREE.MeshStandardMaterial({ color: "#61d9ef", emissive: "#187b9a", emissiveIntensity: .6, metalness: .55, roughness: .32 })); stationRing.rotation.x = Math.PI / 2; station.add(stationRing); for (let i = 0; i < 4; i++) { const angle = i * Math.PI / 2; const spoke = new THREE.Mesh(new THREE.BoxGeometry(2,2,10), stationMetal); spoke.position.set(Math.cos(angle)*8,Math.sin(angle)*8,0); station.add(spoke); const pod = new THREE.Mesh(new THREE.BoxGeometry(4,3,5), stationMetal); pod.position.set(Math.cos(angle)*16,Math.sin(angle)*16,0); station.add(pod); const lamp = new THREE.PointLight("#65eaff",8,28,2); lamp.position.copy(pod.position); station.add(lamp); } station.position.set(-24, 0, 70); station.name = "GGL Haven"; scene.add(station); const stationCenter = station.position.clone();
    const havenNavigationBeacon = new THREE.Group();
    const havenBeaconBeam = new THREE.Mesh(new THREE.CylinderGeometry(.22, .7, 20, 8), new THREE.MeshBasicMaterial({ color: "#c5f36b", transparent: true, opacity: .72, depthWrite: false }));
    havenBeaconBeam.position.y = 13;
    const havenBeaconRing = new THREE.Mesh(new THREE.TorusGeometry(5.2, .38, 8, 40), new THREE.MeshBasicMaterial({ color: "#c5f36b", transparent: true, opacity: .9, depthWrite: false }));
    havenBeaconRing.rotation.x = Math.PI / 2;
    havenBeaconRing.position.y = 24;
    const havenBeaconOrb = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: "#f4ffbe" }));
    havenBeaconOrb.position.y = 27;
    havenNavigationBeacon.add(havenBeaconBeam, havenBeaconRing, havenBeaconOrb);
    havenNavigationBeacon.visible = false;
    station.add(havenNavigationBeacon);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 16), new THREE.MeshStandardMaterial({ color: "#7b9bb4", roughness: .95, metalness: .12, flatShading: true }));
    moon.position.set(-155, 12, -85); scene.add(moon);
    const moonBarrier = new THREE.Mesh(
      new THREE.SphereGeometry(16, 24, 18),
      new THREE.MeshBasicMaterial({ color: "#83eaff", transparent: true, opacity: .075, side: THREE.BackSide, depthWrite: false })
    );
    moon.add(moonBarrier);
    planetBarriers.push({ center: new THREE.Vector3(-155, 12, -85), radius: 16 });
    const car = makeCar();
    const projectiles: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; age: number }> = [];
    let nextProjectileAt = 0;
    // Small, occasional asteroid clusters drift across the flight path as shootable targets.
    const asteroids: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; radius: number; age: number }> = [];
    let activeCache: { mesh: THREE.Group; velocity: THREE.Vector3; age: number } | null = null;
    let nextCacheAt = 11;
    let observedRecovered = spaceStateRef.current.salvageRecovered || 0;
    const asteroidGeometry = new THREE.IcosahedronGeometry(1, 1);
    const asteroidMaterial = new THREE.MeshStandardMaterial({ color: "#777f8b", roughness: .96, metalness: .12, flatShading: true });
    const asteroidDustMaterial = new THREE.PointsMaterial({ color: "#a9b7c8", size: .8, transparent: true, opacity: .48, sizeAttenuation: true });
    let nextAsteroidAt = 1.8;
    const projectileGeometry = new THREE.SphereGeometry(0.22, 8, 6);
    const projectileMaterial = new THREE.MeshBasicMaterial({ color: "#7cf7ff" });
    const impactMaterial = new THREE.MeshBasicMaterial({ color: "#fff0a3", transparent: true, opacity: 0.9 });
    const impacts: Array<{ mesh: THREE.Mesh; age: number }> = [];
    const targetReticle = new THREE.Group();
    const targetRing = new THREE.Mesh(new THREE.TorusGeometry(1, .045, 8, 40), new THREE.MeshBasicMaterial({ color: "#c5f36b", depthTest: false, depthWrite: false }));
    targetReticle.add(targetRing);
    const targetCanvas = document.createElement("canvas"); targetCanvas.width = 512; targetCanvas.height = 80;
    const targetContext = targetCanvas.getContext("2d");
    const targetTexture = new THREE.CanvasTexture(targetCanvas);
    const targetSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: targetTexture, transparent: true, depthTest: false, depthWrite: false }));
    targetSprite.position.y = 1.5; targetSprite.scale.set(5.8, .9, 1); targetReticle.add(targetSprite);
    targetReticle.visible = false; scene.add(targetReticle);
    let targetReticleTime = 0;
    // Preserve the original spacecraft silhouette and its established scale.
    car.scale.setScalar(0.82);
    scene.add(car);
    const clock = new THREE.Clock();
    let lastClockPaint = -1;
    let raf = 0;
    const mapTargetPositions: Record<string, [number, number]> = {
      "GGL Haven": mapPoint(-24, 70),
      Ember: mapPoint(-170, -80), Aster: mapPoint(170, 30), Cobalt: mapPoint(290, 145), Verdant: mapPoint(460, -85), Frost: mapPoint(120, 400),
      ...Object.fromEntries(SURVEY_WORLDS.map(world => [world.id, mapPoint(world.position[0], world.position[2])])),
    };
    const resize = () => {
      const w = Math.max(280, host.clientWidth), h = Math.max(320, host.clientHeight);
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const render = () => {
      const race = raceRef.current;
      const controls = controlsRef.current;
      const currentPhase = phaseRef.current;
      const frameDelta = Math.min(clock.getDelta(), .05);
      // One saved simulation clock drives stellar rotation, settlements, and offline catch-up.
      const state = spaceStateRef.current;
      // Docking is an explicit safe-harbour state. Any deliberate flight input undocks first.
      if (state.dockedAt === "GGL Haven" && (Math.abs(controls.steer) > .04 || Math.abs(controls.flight) > .04 || controls.accelerate || controls.brake || controls.boost)) {
        state.dockedAt = null;
      }
      if (currentPhase === "running") {
        state.worldTimeMinutes += frameDelta * 4;
        simulationSeconds = state.worldTimeMinutes * 60;
        flightElapsedSeconds += frameDelta;
      } else {
        simulationSeconds = state.worldTimeMinutes * 60;
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
        // Vertical flight has its own velocity and damping on world Y, just like
        // horizontal thrust. Releasing a thruster slows the climb rather than
        // teleporting the ship to an immediate stop.
        const verticalInput = (controls.accelerate ? 1 : 0) - (controls.brake ? 1 : 0);
        race.velocityY = clamp(race.velocityY + verticalInput * 18 * frameDelta, -12, 12);
        // In this arcade-style flight model, releasing the vertical thrusters means hold position.
        // No residual momentum: the ship stays where the pilot leaves it.
        if (verticalInput === 0) race.velocityY = 0;
        else race.velocityY *= Math.exp(-frameDelta * 0.42);
        race.worldY = clamp(race.worldY + race.velocityY * frameDelta, -90, 90);
        if (Math.abs(race.worldY) >= 90 && Math.sign(race.worldY) === Math.sign(race.velocityY)) {
          race.velocityY = 0;
        }
      }
      // Planetary atmosphere is a soft-looking but solid boundary. Resolve the ship
      // against the same spheres shown to the player, and remove inward horizontal speed.
      const shipPosition = new THREE.Vector3(race.worldX, .015 + race.worldY, race.worldZ);
      let nearest: string | null = null; let nearestDistance = Infinity; const stationDistance = shipPosition.distanceTo(stationCenter); if (stationDistance < 34) { nearest = "GGL Haven"; nearestDistance = stationDistance; } for (const [planetName, visual] of Object.entries(planetVisuals)) { const distance = shipPosition.distanceTo(visual.body.position); if (distance < visual.radius + 25 && distance < nearestDistance) { nearest = planetName; nearestDistance = distance; } }
      if ((state.salvageRecovered || 0) !== observedRecovered) {
        observedRecovered = state.salvageRecovered || 0;
        if (activeCache) { scene.remove(activeCache.mesh); activeCache.mesh.traverse((item) => { const mesh = item as THREE.Mesh; mesh.geometry?.dispose(); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose()); }); activeCache = null; }
        nextCacheAt = flightElapsedSeconds + 28;
      }
      if (currentPhase === "running" && !activeCache && flightElapsedSeconds >= nextCacheAt) {
        const forwardForCache = new THREE.Vector3(-Math.sin(race.worldYaw), 0, -Math.cos(race.worldYaw)).normalize();
        const cross = new THREE.Vector3(-forwardForCache.z, 0, forwardForCache.x);
        const cache = new THREE.Group();
        const casing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.5, 2.1), new THREE.MeshStandardMaterial({ color: "#d8e2ee", metalness: .72, roughness: .28, emissive: "#1b536d", emissiveIntensity: .5 }));
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(.72, 0), new THREE.MeshBasicMaterial({ color: "#70f4ff" }));
        const halo = new THREE.Mesh(new THREE.TorusGeometry(2.2, .09, 6, 24), new THREE.MeshBasicMaterial({ color: "#c5f36b", transparent: true, opacity: .9 }));
        halo.rotation.x = Math.PI / 2;
        cache.add(casing, core, halo);
        cache.position.copy(shipPosition).addScaledVector(forwardForCache, 82).addScaledVector(cross, 13);
        cache.position.y += 8;
        scene.add(cache);
        activeCache = { mesh: cache, velocity: forwardForCache.multiplyScalar(-1.8).addScaledVector(cross, 1.1), age: 0 };
        nextCacheAt = flightElapsedSeconds + 52;
      }
      if (activeCache) {
        activeCache.age += frameDelta;
        activeCache.mesh.position.addScaledVector(activeCache.velocity, frameDelta);
        activeCache.mesh.rotation.y += frameDelta * .5;
        activeCache.mesh.rotation.x += frameDelta * .18;
        const cacheDistance = shipPosition.distanceTo(activeCache.mesh.position);
        if (cacheDistance < 17 && cacheDistance < nearestDistance) { nearest = "Floating Equipment"; nearestDistance = cacheDistance; }
        if (activeCache.age > 58 || cacheDistance > 230) {
          scene.remove(activeCache.mesh);
          activeCache.mesh.traverse((item) => { const mesh = item as THREE.Mesh; mesh.geometry?.dispose(); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose()); });
          activeCache = null;
        }
      }
      state.nearbyTarget = nearest;
      const navigationTarget = state.selectedSurveyTarget || getFirstFootholdCue(state).target;
      havenNavigationBeacon.visible = navigationTarget === "GGL Haven";
      havenBeaconRing.rotation.y += frameDelta * .55;
      // Habitat stages are real world-state signals: surface tint, atmosphere, forcefield and visible machinery transition together.
      for (const worldData of SURVEY_WORLDS) {
        const beacon = planetBeacons[worldData.id];
        if (beacon) {
          beacon.root.visible = navigationTarget === worldData.id;
          beacon.ring.rotation.y += frameDelta * .65;
          beacon.orb.scale.setScalar(.82 + (Math.sin(simulationSeconds * .004) + 1) * .14);
        }
      }
      for (const planet of WORLD_PLANETS) {
        const visual = planetVisuals[planet.name];
        if (!visual) continue;
        const progress = Math.max(0, Math.min(100, state.planetProgress[planet.name] ?? planet.initialProgress));
        const stage = habitatStage(progress);
        const navigationBeacon = planetBeacons[planet.name];
        if (navigationBeacon) {
          navigationBeacon.root.visible = navigationTarget === planet.name;
          const beaconColor = new THREE.Color(stage.color);
          (navigationBeacon.beam.material as THREE.MeshBasicMaterial).color.copy(beaconColor);
          (navigationBeacon.ring.material as THREE.MeshBasicMaterial).color.copy(beaconColor);
          navigationBeacon.ring.rotation.y += frameDelta * .65;
          navigationBeacon.orb.scale.setScalar(.82 + (Math.sin(simulationSeconds * .004) + 1) * .14);
        }
        const surfaceMaterial = visual.surface.material as THREE.MeshStandardMaterial;
        const atmosphereMaterial = visual.atmosphere.material as THREE.MeshBasicMaterial;
        const fieldMaterial = visual.forcefield.material as THREE.MeshBasicMaterial;
        surfaceMaterial.color.copy(visual.baseColor.clone().lerp(new THREE.Color(stage.color), Math.min(.96, .64 + progress * .003)));
        surfaceMaterial.emissive.set(stage.color);
        surfaceMaterial.emissiveIntensity = .035 + stage.index * .018 + progress * .00022;
        atmosphereMaterial.color.set(stage.atmosphereColor);
        atmosphereMaterial.opacity = .025 + stage.index * .018 + progress * .00072;
        fieldMaterial.color.set(stage.color);
        fieldMaterial.opacity = .025 + progress * .00055;
        const count = state.deployedEquipment[planet.name] || 0;
        const pulse = terraformPulses[planet.name];
        if (pulse) {
          if (count > pulse.installed) { pulse.age = 0; pulse.mesh.visible = true; }
          pulse.installed = count;
          if (pulse.age < 1.15) {
            pulse.age += frameDelta;
            const pulsePhase = Math.min(1, pulse.age / 1.15);
            pulse.mesh.visible = true;
            pulse.mesh.scale.setScalar(1 + pulsePhase * .2);
            const pulseMaterial = pulse.mesh.material as THREE.MeshBasicMaterial;
            pulseMaterial.color.set(stage.color);
            pulseMaterial.opacity = .7 * (1 - pulsePhase);
          } else {
            pulse.mesh.visible = false;
          }
        }
        deployedMachines[planet.name].forEach((machine, index) => {
          machine.visible = index < count;
          if (machine.visible && currentPhase === "running") machine.rotation.y += frameDelta * .34;
        });
        const settlement = colonyVisuals[planet.name];
        const colony = state.colonies[planet.name];
        if (settlement && colony) {
          settlement.root.visible = true;
          settlement.root.rotation.y += frameDelta * .025;
          const builtCount = Math.min(settlement.buildings.length, Math.max(1, Math.ceil(colony.population / 3)));
          settlement.buildings.forEach((building, index) => {
            const built = index < builtCount;
            building.visible = built;
            if (built) building.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-frameDelta * 1.8));
          });
        } else if (settlement) {
          settlement.root.visible = false;
        }
      }
      for (const barrier of planetBarriers) {
        const offset = shipPosition.clone().sub(barrier.center);
        const distance = offset.length();
        if (distance < barrier.radius) {
          const normal = distance > 0.001 ? offset.multiplyScalar(1 / distance) : new THREE.Vector3(0, 1, 0);
          shipPosition.copy(barrier.center).addScaledVector(normal, barrier.radius);
          const inwardSpeed = race.velocityX * normal.x + race.velocityY * normal.y + race.velocityZ * normal.z;
          if (inwardSpeed < 0) {
            race.velocityX -= normal.x * inwardSpeed;
            race.velocityY -= normal.y * inwardSpeed;
            race.velocityZ -= normal.z * inwardSpeed;
          }
          race.worldX = shipPosition.x;
          race.worldZ = shipPosition.z;
          race.worldY = shipPosition.y - .015;
        }
      }
      // Asteroid groups enter ahead of the ship occasionally, then drift past like space debris.
      if (currentPhase === "running" && flightElapsedSeconds >= nextAsteroidAt) {
        const travel = new THREE.Vector3(-Math.sin(race.worldYaw), 0, -Math.cos(race.worldYaw)).normalize();
        const across = new THREE.Vector3(-travel.z, 0, travel.x);
        const clusterCount = 3 + Math.floor(Math.random() * 4);
        const center = shipPosition.clone().addScaledVector(travel, 95 + Math.random() * 45)
          .addScaledVector(across, (Math.random() - .5) * 48);
        center.y += (Math.random() - .5) * 28;
        for (let i = 0; i < clusterCount && asteroids.length < 42; i++) {
          const radius = .65 + Math.random() * 1.5;
          const rock = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
          rock.scale.set(radius * (.75 + Math.random() * .65), radius * (.7 + Math.random() * .55), radius * (.75 + Math.random() * .6));
          rock.position.copy(center).add(new THREE.Vector3((Math.random() - .5) * 18, (Math.random() - .5) * 13, (Math.random() - .5) * 18));
          rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          scene.add(rock);
          const drift = travel.clone().multiplyScalar(-24 - Math.random() * 28)
            .addScaledVector(across, (Math.random() - .5) * 9);
          drift.y += (Math.random() - .5) * 5;
          asteroids.push({ mesh: rock, velocity: drift, radius: radius * 1.35, age: 0 });
        }
        // A brief trail of tiny dust points makes each debris pass feel like a field.
        const dustPositions: number[] = [];
        const dustVelocities: THREE.Vector3[] = [];
        for (let i = 0; i < 28; i++) {
          dustPositions.push((Math.random() - .5) * 25, (Math.random() - .5) * 18, (Math.random() - .5) * 25);
          // Every mote gets an independent speed and drift vector.
          dustVelocities.push(travel.clone().multiplyScalar(-(5 + Math.random() * 38))
            .addScaledVector(across, (Math.random() - .5) * 22)
            .add(new THREE.Vector3((Math.random() - .5) * 10, (Math.random() - .5) * 12, (Math.random() - .5) * 10)));
        }
        const dustGeometry = new THREE.BufferGeometry();
        dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
        const dust = new THREE.Points(dustGeometry, asteroidDustMaterial);
        dust.userData.velocities = dustVelocities;
        dust.position.copy(center);
        scene.add(dust);
        // Dust is intentionally short-lived; each point moves independently.
        asteroids.push({ mesh: new THREE.Mesh(dustGeometry, asteroidMaterial), velocity: new THREE.Vector3(), radius: 0, age: -0.35 });
        asteroids[asteroids.length - 1].mesh.visible = false;
        asteroids[asteroids.length - 1].mesh.userData.dust = dust;
        nextAsteroidAt = flightElapsedSeconds + 2.4 + Math.random() * 3.6;
      }
      for (let i = asteroids.length - 1; i >= 0; i--) {
        const rock = asteroids[i];
        const dust = rock.mesh.userData.dust as THREE.Points | undefined;
        if (dust) {
          const attribute = dust.geometry.getAttribute("position") as THREE.BufferAttribute;
          const velocities = dust.userData.velocities as THREE.Vector3[];
          for (let point = 0; point < attribute.count; point++) {
            attribute.setXYZ(point,
              attribute.getX(point) + velocities[point].x * frameDelta,
              attribute.getY(point) + velocities[point].y * frameDelta,
              attribute.getZ(point) + velocities[point].z * frameDelta);
          }
          attribute.needsUpdate = true;
          rock.age += frameDelta;
          if (rock.age >= 2.8 || dust.position.distanceTo(shipPosition) > 210) {
            scene.remove(dust); dust.geometry.dispose(); asteroids.splice(i, 1);
          }
          continue;
        }
        rock.mesh.position.addScaledVector(rock.velocity, frameDelta);
        rock.mesh.rotation.x += frameDelta * .32;
        rock.mesh.rotation.y += frameDelta * .48;
        if (currentPhase === "running" && state.dockedAt !== "GGL Haven" && rock.mesh.position.distanceTo(shipPosition) <= rock.radius + 2.4) {
          const hullDamage = Math.max(3, Math.round(rock.radius * 2.2));
          race.damage = clamp(race.damage + hullDamage, 0, 100);
          state.events.unshift("Asteroid collision damaged the ship hull by " + hullDamage + " points. Dock at GGL Haven for repairs.");
          recordSpaceChronicle(state, "hazard", "Ship", "Asteroid collision damaged the hull", "A drifting asteroid caused " + hullDamage + " hull damage while the ship was in open space.");
          state.events.length = Math.min(state.events.length, 6);
          const flash = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), impactMaterial);
          flash.position.copy(shipPosition); scene.add(flash); impacts.push({ mesh: flash, age: 0 });
          scene.remove(rock.mesh); asteroids.splice(i, 1);
          continue;
        }
        rock.age += frameDelta;
        if (rock.age > 8 || rock.mesh.position.distanceTo(shipPosition) > 230) {
          scene.remove(rock.mesh); asteroids.splice(i, 1);
        }
      }
      // Hold-to-fire launches fast, visible energy bolts from the ship nose.
      if (currentPhase === "running" && controls.fire && flightElapsedSeconds >= nextProjectileAt) {
        const shotForward = new THREE.Vector3(-Math.sin(race.worldYaw), 0, -Math.cos(race.worldYaw)).normalize();
        // Contextual aim assistance only bends a player-fired shot; it never fires on its own.
        // Aim at the near surface (not the body's centre) so the projectile actually intersects it.
        // A generous but bounded 42-degree / 340-unit acquisition window makes the assist perceptible.
        let assistedDirection = shotForward.clone();
        let bestAssistScore = Infinity;
        const aimCandidates: Array<{ position: THREE.Vector3; radius: number; name: string }> = [];
        for (const [name, visual] of Object.entries(planetVisuals)) aimCandidates.push({ position: visual.body.position, radius: visual.radius + 7, name });
        for (const rock of asteroids) if (rock.radius > 0) aimCandidates.push({ position: rock.mesh.position, radius: rock.radius, name: "ASTEROID" });
        let acquiredTargetName = "";
        let acquiredTargetSurface: THREE.Vector3 | null = null;
        let acquiredTargetRadius = 2;
        for (const candidate of aimCandidates) {
          const toCentre = candidate.position.clone().sub(shipPosition);
          const centreDistance = toCentre.length();
          if (centreDistance < 5 || centreDistance > 340) continue;
          const centreDirection = toCentre.normalize();
          const nearSurface = candidate.position.clone().addScaledVector(centreDirection, -candidate.radius * .82);
          const targetOffset = nearSurface.sub(shipPosition);
          const surfaceDistance = targetOffset.length();
          if (surfaceDistance < 3) continue;
          const direction = targetOffset.normalize();
          const alignment = shotForward.dot(direction);
          if (alignment < Math.cos(42 * Math.PI / 180)) continue;
          const score = surfaceDistance + (1 - alignment) * 125;
          if (score < bestAssistScore) {
            bestAssistScore = score;
            const strength = clamp(.9 - surfaceDistance / 520, .48, .82);
            assistedDirection = shotForward.clone().lerp(direction, strength).normalize();
            acquiredTargetName = candidate.name;
            acquiredTargetSurface = nearSurface.clone();
            acquiredTargetRadius = candidate.radius;
          }
        }
        if (acquiredTargetSurface) {
          targetReticle.position.copy(acquiredTargetSurface).addScaledVector(acquiredTargetSurface.clone().sub(shipPosition).normalize(), .8);
          targetReticle.scale.setScalar(clamp(acquiredTargetRadius * .16, 1.25, 7.5));
          if (targetContext) {
            targetContext.clearRect(0, 0, 512, 80);
            targetContext.fillStyle = "rgba(3,12,24,.9)"; targetContext.fillRect(0, 0, 512, 80);
            targetContext.strokeStyle = "#c5f36b"; targetContext.lineWidth = 4; targetContext.strokeRect(3, 3, 506, 74);
            targetContext.fillStyle = "#f4ffbe"; targetContext.font = "bold 34px Arial"; targetContext.textAlign = "center"; targetContext.textBaseline = "middle";
            targetContext.fillText("TARGET: " + acquiredTargetName.toUpperCase().slice(0, 22), 256, 40);
            targetTexture.needsUpdate = true;
          }
          targetSprite.scale.set(5.8 / targetReticle.scale.x, .9 / targetReticle.scale.x, 1);
          targetReticleTime = 1.3; targetReticle.visible = true;
        }
        const bolt = new THREE.Mesh(projectileGeometry, projectileMaterial);
        bolt.position.copy(shipPosition).addScaledVector(shotForward, 3.1);
        scene.add(bolt);
        projectiles.push({ mesh: bolt, velocity: assistedDirection.multiplyScalar(190), age: 0 });
        nextProjectileAt = flightElapsedSeconds + 0.13;
      }
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const shot = projectiles[i];
        const previousPosition = shot.mesh.position.clone();
        shot.mesh.position.addScaledVector(shot.velocity, frameDelta);
        shot.age += frameDelta;
        let hit = false;
        for (const barrier of planetBarriers) {
          if (shot.mesh.position.distanceTo(barrier.center) <= barrier.radius) { hit = true; break; }
        }
        let asteroidHitIndex = -1;
        if (!hit) {
          for (let j = asteroids.length - 1; j >= 0; j--) {
            const rock = asteroids[j];
            if (rock.radius > 0 && shot.mesh.position.distanceTo(rock.mesh.position) <= rock.radius + .35) {
              asteroidHitIndex = j; hit = true; break;
            }
          }
        }
        if (asteroidHitIndex >= 0) {
          const rock = asteroids[asteroidHitIndex];
          const flash = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), impactMaterial);
          flash.position.copy(rock.mesh.position); scene.add(flash); impacts.push({ mesh: flash, age: 0 });
          scene.remove(rock.mesh); asteroids.splice(asteroidHitIndex, 1); spaceStateRef.current.asteroidsShot += 1;
        }
        if (hit && asteroidHitIndex < 0) {
          const flash = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), impactMaterial);
          flash.position.copy(shot.mesh.position); scene.add(flash); impacts.push({ mesh: flash, age: 0 });
        }
        if (hit || shot.age > 2.8 || shot.mesh.position.distanceTo(shipPosition) > 520) {
          scene.remove(shot.mesh); projectiles.splice(i, 1);
        }
      }
      for (let i = impacts.length - 1; i >= 0; i--) {
        const impact = impacts[i]; impact.age += frameDelta;
        impact.mesh.scale.setScalar(1 + impact.age * 5);
        (impact.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - impact.age / 0.22));
        if (impact.age >= 0.22) { scene.remove(impact.mesh); impact.mesh.geometry.dispose(); impacts.splice(i, 1); }
      }
      // Render the preserved spacecraft directly in open world space.
      const carWorld = shipPosition;
      const forward = new THREE.Vector3(-Math.sin(race.worldYaw), 0, -Math.cos(race.worldYaw)).normalize();
      car.position.copy(carWorld);
      car.rotation.y = race.worldYaw;
      if (shipMapMarkerRef.current) {
        const mapX = mapPoint(race.worldX, race.worldZ)[0];
        const mapY = mapPoint(race.worldX, race.worldZ)[1];
        const mapAngle = -race.worldYaw * 180 / Math.PI;
        shipMapMarkerRef.current.setAttribute("transform", `translate(${mapX.toFixed(2)} ${mapY.toFixed(2)}) rotate(${mapAngle.toFixed(1)})`);
        const target = state.selectedSurveyTarget || getFirstFootholdCue(state).target;
        const targetPoint = mapTargetPositions[target] || mapTargetPositions["GGL Haven"];
        if (mapRouteRef.current) {
          mapRouteRef.current.setAttribute("x1", mapX.toFixed(2));
          mapRouteRef.current.setAttribute("y1", mapY.toFixed(2));
          mapRouteRef.current.setAttribute("x2", targetPoint[0].toFixed(2));
          mapRouteRef.current.setAttribute("y2", targetPoint[1].toFixed(2));
        }
        if (mapTargetMarkerRef.current) {
          mapTargetMarkerRef.current.setAttribute("cx", targetPoint[0].toFixed(2));
          mapTargetMarkerRef.current.setAttribute("cy", targetPoint[1].toFixed(2));
        }
      }
      // The spacecraft banks into turns and pitches slightly with vertical thrust.
      // Visual attitude follows pilot input; it never feeds back into flight physics.
      car.rotation.x = clamp(race.velocityY * 0.014, -0.2, 0.2);
      car.rotation.z = clamp(-race.steering * 0.16 - race.drift * 0.08, -0.22, 0.22);
      const cameraTarget = new THREE.Vector3(carWorld.x + forward.x * 14, carWorld.y + 1.6, carWorld.z + forward.z * 14);
      // Give the pilot more breathing room and a clearer view of the space ahead.
      const cameraPosition = new THREE.Vector3(carWorld.x - forward.x * 12.5, carWorld.y + 6.2, carWorld.z - forward.z * 12.5);
      camera.position.lerp(cameraPosition, 1 - Math.exp(-frameDelta * 4.5));
      camera.lookAt(cameraTarget);
      if (targetReticleTime > 0) { targetReticleTime = Math.max(0, targetReticleTime - frameDelta); targetReticle.visible = targetReticleTime > 0; targetReticle.quaternion.copy(camera.quaternion); }
      else targetReticle.visible = false;
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
      projectiles.forEach((shot) => scene.remove(shot.mesh));
      impacts.forEach((impact) => { scene.remove(impact.mesh); impact.mesh.geometry.dispose(); });
      projectileGeometry.dispose(); projectileMaterial.dispose(); impactMaterial.dispose();
      asteroidGeometry.dispose(); asteroidMaterial.dispose(); asteroidDustMaterial.dispose();
      asteroids.forEach((rock) => {
        const dust = rock.mesh.userData.dust as THREE.Points | undefined;
        if (dust) { scene.remove(dust); dust.geometry.dispose(); }
        else scene.remove(rock.mesh);
      });
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
  }, [raceRef, controlsRef, phaseRef, spaceStateRef]);

  return <div ref={mountRef} className="racing-3d-root" data-phase={phaseRef.current} data-braking={controlsRef.current.brake ? "true" : "false"}>
    <div className="space-flight-clock" aria-label="Flight elapsed time and accelerated system time" ref={flightClockRef}>FLIGHT T+00:00 · SYSTEM 06:00</div>
    <div aria-label="System map" className="space-mini-map">
      <div className="space-mini-map-title">SYSTEM MAP <span>FREE SPACE</span></div>
      <svg viewBox="0 0 180 128" role="img" aria-label="Live system map showing all twenty planetary bodies, the ship and the selected navigation target.">
        <path d="M8 64H172 M90 8V120" stroke="rgba(156,204,255,.14)" strokeDasharray="3 5" fill="none" />
        <line ref={mapRouteRef} x1={mapPoint(0, -35)[0]} y1={mapPoint(0, -35)[1]} x2={mapPoint(290, 145)[0]} y2={mapPoint(290, 145)[1]} stroke="#c5f36b" strokeWidth="1.2" strokeDasharray="3 2" opacity=".92" />
        <circle cx={mapPoint(-170, -80)[0]} cy={mapPoint(-170, -80)[1]} r="6.8" fill={habitatStage(spaceStateRef.current.planetProgress.Ember ?? 0).color} stroke="#eab08b" strokeWidth="1.2" />
        <circle cx={mapPoint(170, 30)[0]} cy={mapPoint(170, 30)[1]} r="10.5" fill={habitatStage(spaceStateRef.current.planetProgress.Aster ?? 0).color} stroke="#a6a0ff" strokeWidth="1.5" />
        <ellipse cx={mapPoint(170, 30)[0]} cy={mapPoint(170, 30)[1]} rx="16" ry="3.5" fill="none" stroke={habitatStage(spaceStateRef.current.planetProgress.Aster ?? 0).color} strokeWidth="1.5" transform={"rotate(-18 " + mapPoint(170, 30)[0] + " " + mapPoint(170, 30)[1] + ")"} />
        <circle cx={mapPoint(290, 145)[0]} cy={mapPoint(290, 145)[1]} r="13.5" fill={habitatStage(spaceStateRef.current.planetProgress.Cobalt ?? 0).color} stroke="#77d7f5" strokeWidth="1.5" />
        <circle cx={mapPoint(460, -85)[0]} cy={mapPoint(460, -85)[1]} r="16" fill={habitatStage(spaceStateRef.current.planetProgress.Verdant ?? 0).color} stroke="#85d8ad" strokeWidth="1.5" />
        <circle cx={mapPoint(120, 400)[0]} cy={mapPoint(120, 400)[1]} r="9.5" fill={habitatStage(spaceStateRef.current.planetProgress.Frost ?? 0).color} stroke="#ccefff" strokeWidth="1.2" />
        {SURVEY_WORLDS.map(world => {
          const [x, y] = mapPoint(world.position[0], world.position[2]);
          const discovered = (spaceStateRef.current.discoveredWorlds || []).includes(world.id);
          return <circle key={world.id} cx={x} cy={y} r={discovered ? 3.4 : 2.5} fill={discovered ? "#c5f36b" : "#8296a8"} stroke={discovered ? "#efffb8" : "#a4b6c5"} strokeWidth=".8" opacity={discovered ? .95 : .72} />;
        })}
        <g aria-label="GGL Haven station" transform={"translate(" + mapPoint(-24, 70).join(" ") + ")"}>
          <circle r="7.8" fill="rgba(255,208,107,.14)" stroke="#ffd06b" strokeWidth="1.4" />
          <circle r="3.2" fill="#ffd06b" />
          <path d="M-10 0H-5 M5 0H10 M0 -10V-5 M0 5V10" stroke="#ffd06b" strokeWidth="1.5" strokeLinecap="round" />
          <text x="9" y="12" fill="#ffe4a6" fontSize="6.5" fontWeight="800" letterSpacing=".2">HAVEN</text>
        </g>
        <circle ref={mapTargetMarkerRef} cx={mapPoint(290, 145)[0]} cy={mapPoint(290, 145)[1]} r="9.5" fill="none" stroke="#c5f36b" strokeWidth="1.6" strokeDasharray="3 2" className="space-map-target" />
        <g ref={shipMapMarkerRef} transform={"translate(" + mapPoint(0, -35).join(" ") + ")"}>
          <circle r="7.5" fill="rgba(102,242,255,.17)" stroke="#66f2ff" strokeOpacity=".7" />
          <path d="M0 -6 L4.2 5 L0 2.7 L-4.2 5 Z" fill="#ffffff" stroke="#66f2ff" strokeWidth="1.1" />
        </g>
      </svg>
      <div className="space-mini-map-legend"><span><i className="map-ship-dot" /> YOU</span><span><i className="map-world-dot" /> PLANETS</span><span><i className="map-station-dot" /> STATION</span></div>
    </div>
  </div>;
}
