"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createRacingTrack, getTrackTurn } from "./racing-track";
import type { Controls, Phase, Race } from "./racing-warmup";

type Props = { raceRef: RefObject<Race>; controlsRef: RefObject<Controls>; phaseRef: RefObject<Phase> };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, segments: number, y: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    positions.push(p.x + side.x * width / 2, y, p.z + side.z * width / 2);
    positions.push(p.x - side.x * width / 2, y, p.z - side.z * width / 2);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function box(parent: THREE.Group, material: THREE.Material, size: [number, number, number], pos: [number, number, number], radius = 0) {
  const geometry = new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos);
  if (radius) mesh.rotation.y = radius;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roundedCarBox(parent: THREE.Group, material: THREE.Material, size: [number, number, number], pos: [number, number, number], radius = .12) {
  const geometry = new RoundedBoxGeometry(...size, 4, radius);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

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
    renderer.domElement.setAttribute("aria-label", "Three-dimensional racing circuit with rear chase camera");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#030716");
    const camera = new THREE.PerspectiveCamera(63,(host.clientWidth||800)/(host.clientHeight||480),.1,900);
    scene.add(new THREE.HemisphereLight("#9ebdff","#11112e",1.25));
    const starLight=new THREE.PointLight("#6a7dff",850,480,2); starLight.position.set(-110,80,-90); scene.add(starLight);
    const nebulaLight=new THREE.PointLight("#d04cff",620,420,2); nebulaLight.position.set(130,45,100); scene.add(nebulaLight);
    const track=createRacingTrack();
    const roadBase=new THREE.Mesh(ribbon(track,12,600,.015),new THREE.MeshStandardMaterial({color:"#101a31",roughness:.32,metalness:.82,emissive:"#07152d",emissiveIntensity:.85,side:THREE.DoubleSide}));
    roadBase.receiveShadow=true; scene.add(roadBase);
    scene.add(new THREE.Mesh(ribbon(track,12.72,600,.028),new THREE.MeshBasicMaterial({color:"#11d9f2",transparent:true,opacity:.76,side:THREE.DoubleSide})));
    scene.add(new THREE.Mesh(ribbon(track,11.72,600,.032),new THREE.MeshBasicMaterial({color:"#4258b9",transparent:true,opacity:.46,side:THREE.DoubleSide})));
    const starPositions:number[]=[];
    for(let i=0;i<1250;i++){const angle=i*2.399963229728653;const y=((i*37.719)%1)*2-1;const radius=260+((i*71.13)%1)*520;const rr=Math.sqrt(Math.max(0,1-y*y));starPositions.push(Math.cos(angle)*rr*radius,y*radius*.68,Math.sin(angle)*rr*radius);}
    const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute("position",new THREE.Float32BufferAttribute(starPositions,3));
    scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:"#c5e8ff",size:1.35,sizeAttenuation:true,transparent:true,opacity:.92})));
    const planet=new THREE.Mesh(new THREE.SphereGeometry(35,32,24),new THREE.MeshStandardMaterial({color:"#4d438d",roughness:.88,metalness:.08,emissive:"#20165d",emissiveIntensity:.55,flatShading:true}));
    planet.position.set(155,76,-225);scene.add(planet);
    const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(36.8,32,24),new THREE.MeshBasicMaterial({color:"#6a67ff",transparent:true,opacity:.17,side:THREE.BackSide}));
    atmosphere.position.copy(planet.position);scene.add(atmosphere);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(47,1.05,8,96),new THREE.MeshBasicMaterial({color:"#9b83ff",transparent:true,opacity:.68}));
    ring.position.copy(planet.position);ring.rotation.x=1.08;ring.rotation.y=-.32;scene.add(ring);
    const moon=new THREE.Mesh(new THREE.SphereGeometry(13,20,16),new THREE.MeshStandardMaterial({color:"#7b9bb4",roughness:.95,metalness:.12,flatShading:true}));
    moon.position.set(-175,-18,-260);scene.add(moon);
    const pylonPink=new THREE.MeshBasicMaterial({color:"#ff53d4"}),pylonCyan=new THREE.MeshBasicMaterial({color:"#56efff"});
    for(let i=0;i<150;i++){const t=i/150,p=track.getPointAt(t),tangent=track.getTangentAt(t).normalize();const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();for(const sign of [-1,1]){const pylon=new THREE.Group();const material=i%3===0?pylonPink:pylonCyan;const stem=new THREE.Mesh(new THREE.BoxGeometry(.14,1.65,.14),material);stem.position.y=.78;pylon.add(stem);const beacon=new THREE.Mesh(new THREE.OctahedronGeometry(.25,0),material);beacon.position.y=1.72;pylon.add(beacon);pylon.position.set(p.x+side.x*sign*8.1,-.1,p.z+side.z*sign*8.1);scene.add(pylon);}}
    const car = makeCar();
    // Keep the car's proportions credible against the 12-unit road and leave
    // more visual room around it for steering on narrow mobile screens.
    car.scale.setScalar(0.82);
    scene.add(car);
    const groundShadow=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:"#1f5fff",transparent:true,opacity:.22,depthWrite:false}));
    groundShadow.rotation.x=-Math.PI/2;groundShadow.scale.set(1.5,2.4,1);groundShadow.position.y=-.12;scene.add(groundShadow);

    // Physical barrier boundary: this is the car-centre limit offset inward from
    // the visible rail by half the car width. Swept collision prevents tunnelling
    // across a rail between rendered/physics frames, including at tight hairpins.
    const barrierSamples = 960;
    const barrierLimit = 7.42;
    const barrierLines: { ax: number; az: number; bx: number; bz: number }[] = [];
    for (let i = 0; i < barrierSamples; i++) {
      const t0 = i / barrierSamples;
      const t1 = (i + 1) / barrierSamples;
      const p0 = track.getPointAt(t0);
      const p1 = track.getPointAt(t1);
      const tangent0 = track.getTangentAt(t0).normalize();
      const tangent1 = track.getTangentAt(t1).normalize();
      const side0x = -tangent0.z, side0z = tangent0.x;
      const side1x = -tangent1.z, side1z = tangent1.x;
      for (const sign of [-1, 1]) {
        barrierLines.push({
          ax: p0.x + side0x * sign * barrierLimit,
          az: p0.z + side0z * sign * barrierLimit,
          bx: p1.x + side1x * sign * barrierLimit,
          bz: p1.z + side1z * sign * barrierLimit,
        });
      }
    }
    const segmentHit = (px: number, pz: number, qx: number, qz: number, ax: number, az: number, bx: number, bz: number) => {
      const rx = qx - px, rz = qz - pz;
      const sx = bx - ax, sz = bz - az;
      const denominator = rx * sz - rz * sx;
      if (Math.abs(denominator) < 1e-8) return null;
      const apx = ax - px, apz = az - pz;
      const t = (apx * sz - apz * sx) / denominator;
      const u = (apx * rz - apz * rx) / denominator;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, x: px + rx * t, z: pz + rz * t } : null;
    };
    let previousCarX = raceRef.current.worldX;
    let previousCarZ = raceRef.current.worldZ;
    const clock = new THREE.Clock();
    let raf = 0;
    const resize = () => {
      const w = Math.max(280, host.clientWidth), h = Math.max(320, host.clientHeight);
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const render = () => {
      const race = raceRef.current;
      const controls = controlsRef.current;
      const currentPhase = phaseRef.current;
      // Treat the same continuous offset curves as physical walls. Test the whole
      // previous-to-current movement segment so the car cannot step through a wall.
      if (currentPhase === "running") {
        let earliestHit: { t: number; x: number; z: number; ax: number; az: number; bx: number; bz: number } | null = null;
        for (const wall of barrierLines) {
          const hit = segmentHit(previousCarX, previousCarZ, race.worldX, race.worldZ, wall.ax, wall.az, wall.bx, wall.bz);
          if (hit && (!earliestHit || hit.t < earliestHit.t)) earliestHit = { ...hit, ...wall };
        }
        if (earliestHit) {
          const wallX = earliestHit.bx - earliestHit.ax;
          const wallZ = earliestHit.bz - earliestHit.az;
          const wallLength = Math.hypot(wallX, wallZ) || 1;
          let normalX = -wallZ / wallLength;
          let normalZ = wallX / wallLength;
          if ((previousCarX - earliestHit.ax) * normalX + (previousCarZ - earliestHit.az) * normalZ < 0) {
            normalX = -normalX; normalZ = -normalZ;
          }
          race.worldX = earliestHit.x + normalX * 0.08;
          race.worldZ = earliestHit.z + normalZ * 0.08;
          const outwardSpeed = race.velocityX * normalX + race.velocityZ * normalZ;
          if (outwardSpeed < 0) {
            race.velocityX -= normalX * outwardSpeed * 1.08;
            race.velocityZ -= normalZ * outwardSpeed * 1.08;
            race.speed *= 0.78;
          }
        }
      }
      previousCarX = race.worldX;
      previousCarZ = race.worldZ;
      // Render the independent world-space spacecraft state; the circuit remains a visual and collision reference.
      const carWorld = new THREE.Vector3(race.worldX, .015, race.worldZ);
      const forward = new THREE.Vector3(-Math.sin(race.worldYaw), 0, -Math.cos(race.worldYaw)).normalize();
      car.position.copy(carWorld);
      car.rotation.y = race.worldYaw;
      // Subtle suspension response: braking transfers load forward and cornering
      // rolls the body. These are visual cues driven by the physics state.
      car.rotation.x = clamp(-race.longitudinalLoad * 0.12, -0.035, 0.015);
      car.rotation.z = clamp(-race.lateralG * 0.035 - race.drift * 0.12, -0.055, 0.055);
      groundShadow.position.x = carWorld.x;
      groundShadow.position.z = carWorld.z;
      groundShadow.rotation.z = -car.rotation.y;
      const cameraTarget = new THREE.Vector3(carWorld.x + forward.x * 10, 1.25, carWorld.z + forward.z * 10);
      const cameraPosition = new THREE.Vector3(carWorld.x - forward.x * 8.4, 4.7, carWorld.z - forward.z * 8.4);
      const frameDelta = Math.min(clock.getDelta(), .05);
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

  return <div ref={mountRef} className="racing-3d-root" data-phase={phaseRef.current} data-braking={controlsRef.current.brake ? "true" : "false"} />;
}
