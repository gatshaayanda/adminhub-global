import { advancePlanetEcology, createPlanetEcology, restorePlanetEcology, type PlanetEcologyMap } from "./space-ecology";
import { advancePopulation, createPopulationState, restorePopulationState, type PopulationState } from "./space-people";

export const SPACE_SAVE_KEY = "ggl-space-world-v1";

export const WORLD_PLANETS = [
  { name: "Ember", initialProgress: 0, colonyMachineRequirement: 6, identityColor: "#a75b42", summary: "Sterile rock · full rebuild" },
  { name: "Frost", initialProgress: 0, colonyMachineRequirement: 5, identityColor: "#9ebdce", summary: "Toxic ice · atmosphere work" },
  { name: "Aster", initialProgress: 0, colonyMachineRequirement: 4, identityColor: "#4d438d", summary: "Trace atmosphere · heavy support" },
  { name: "Cobalt", initialProgress: 0, colonyMachineRequirement: 3, identityColor: "#276f9f", summary: "Thin air · settlement prep" },
  { name: "Verdant", initialProgress: 0, colonyMachineRequirement: 2, identityColor: "#367b62", summary: "Stable biosphere · ready to seed" },
] as const;

export type PlanetName = (typeof WORLD_PLANETS)[number]["name"];

export type HabitatStage = {
  index: number;
  key: "sterile" | "toxic" | "trace" | "thin-air" | "habitable";
  label: string;
  color: string;
  atmosphereColor: string;
  description: string;
};

export const HABITAT_STAGES: HabitatStage[] = [
  { index: 0, key: "sterile", label: "STERILE", color: "#ed7b62", atmosphereColor: "#b64c42", description: "No safe settlement yet" },
  { index: 1, key: "toxic", label: "TOXIC", color: "#d985ed", atmosphereColor: "#b34dd4", description: "Atmosphere remains hostile" },
  { index: 2, key: "trace", label: "TRACE AIR", color: "#f4c56f", atmosphereColor: "#ed9b51", description: "Pressure and air still unstable" },
  { index: 3, key: "thin-air", label: "THIN AIR", color: "#65cbed", atmosphereColor: "#4b9fe4", description: "Close to settlement conditions" },
  { index: 4, key: "habitable", label: "HABITABLE", color: "#78f0b1", atmosphereColor: "#49dcb8", description: "Crew can establish a settlement" },
];

export type SpaceChronicleEvent = { id: string; atWorldMinutes: number; kind: "origin" | "settlement" | "habitat" | "recovery" | "docking" | "repair" | "hazard" | "society" | "production"; location: string; title: string; detail: string };

export type SpaceHazard = { id: string; type: "asteroid-impact" | "power-dust"; target: string; severity: 1 | 2 | 3; forecastStartWorldMinutes: number; impactAtWorldMinutes: number; confidence: number; status: "warning" | "mitigated" | "impact"; mitigation: number };

export type SpaceFaction = { id: string; name: string; agenda: string; influence: number };
export type SpaceColony = {
  population: number;
  founders: number;
  operators: number;
  foundedAtWorldMinutes: number;
  independent: boolean;
  trustWithHaven: number;
  autonomy: number;
  governance: "provisional" | "local-council" | "self-governing";
  lastContactWorldMinutes: number;
  factions: SpaceFaction[];
};

export type SpaceState = {
  version: 1;
  nearbyTarget: string | null;
  /** Explicit station docking state; proximity alone never implies docking. */
  dockedAt?: string | null;
  cargoMaterials?: number;
  havenMaterials?: number;
  machineProductionQueue?: number;
  machineProductionProgress?: number;
  cargoPeople: number;
  cargoEquipment: number;
  visitedPlanets: string[];
  deployedEquipment: Record<string, number>;
  planetProgress: Record<string, number>;
  travelNotes: string[];
  acclaim: number;
  asteroidsShot: number;
  salvageRecovered: number;
  havenPopulation: number;
  machineInventory: number;
  worldTimeMinutes: number;
  lastSimulatedAt: number;
  havenGrowthRemainder: number;
  colonies: Record<string, SpaceColony>;
  colonyGrowthRemainders: Record<string, number>;
  events: string[];
  population?: PopulationState;
  hazards?: SpaceHazard[];
  nextHazardAtWorldMinutes?: number;
  ecology?: PlanetEcologyMap;
  chronicle?: SpaceChronicleEvent[];
};

export function habitatStage(progress: number): HabitatStage {
  const index = progress >= 80 ? 4 : progress >= 60 ? 3 : progress >= 40 ? 2 : progress >= 20 ? 1 : 0;
  return HABITAT_STAGES[index];
}

export function habitatCapacity(progress: number): number {
  return progress < 80 ? 0 : 12 + Math.floor((progress - 80) * 1.6);
}

export function createInitialSpaceState(now = Date.now()): SpaceState {
  return {
    version: 1,
    nearbyTarget: null,
    dockedAt: null,
    cargoMaterials: 0,
    havenMaterials: 12,
    machineProductionQueue: 0,
    machineProductionProgress: 0,
    chronicle: [{ id: "haven-origin-0", atWorldMinutes: 0, kind: "origin", location: "GGL Haven", title: "Haven established", detail: "The original 60 inhabitants begin the first chapter of the GGL civilisation at Haven. All five worlds await their first restoration investment." }],
    cargoPeople: 0,
    cargoEquipment: 0,
    visitedPlanets: [],
    deployedEquipment: Object.fromEntries(WORLD_PLANETS.map((planet) => [planet.name, 0] as const)),
    planetProgress: Object.fromEntries(WORLD_PLANETS.map((planet) => [planet.name, planet.initialProgress] as const)),
    travelNotes: [],
    acclaim: 0,
    asteroidsShot: 0,
    salvageRecovered: 0,
    havenPopulation: 60,
    machineInventory: 12,
    worldTimeMinutes: 0,
    lastSimulatedAt: now,
    havenGrowthRemainder: 0,
    colonies: {},
    colonyGrowthRemainders: {},
    events: ["Mission signal: Cobalt is awaiting its first restoration investment. Three machines are required to begin its path toward a safe habitat."],
    population: createPopulationState(0x47474c, 60, 0),
    hazards: [],
    nextHazardAtWorldMinutes: 14 * 1440,
    ecology: createPlanetEcology(),
  };
}

const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const boundedInteger = (value: unknown, fallback: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(finiteNumber(value, fallback))));

export function recordSpaceChronicle(state: SpaceState, kind: SpaceChronicleEvent["kind"], location: string, title: string, detail: string): void {
  if (!state.chronicle) state.chronicle = createInitialSpaceState().chronicle || [];
  state.chronicle.push({ id: "event-" + Math.round(state.worldTimeMinutes) + "-" + state.chronicle.length, atWorldMinutes: state.worldTimeMinutes, kind, location, title, detail });
  if (state.chronicle.length > 1200) state.chronicle.splice(0, state.chronicle.length - 1200);
}

export function advanceSpaceWorld(state: SpaceState, elapsedWorldMinutes: number): void {
  if (!Number.isFinite(elapsedWorldMinutes) || elapsedWorldMinutes <= 0) return;
  const hours = elapsedWorldMinutes / 60;
  // Haven's finite fabricator converts six delivered material units into one machine over four system hours.
  if ((state.machineProductionQueue || 0) > 0) {
    state.machineProductionProgress = (state.machineProductionProgress || 0) + hours;
    while ((state.machineProductionQueue || 0) > 0 && (state.machineProductionProgress || 0) >= 4) {
      state.machineProductionProgress = (state.machineProductionProgress || 0) - 4;
      state.machineProductionQueue = (state.machineProductionQueue || 0) - 1;
      state.machineInventory += 1;
      recordSpaceChronicle(state, "production", "GGL Haven", "Machine completed", "Haven's fabricator completed one machine unit from six delivered material units.");
      state.events.unshift("Haven completed one machine unit. Storage now holds " + state.machineInventory + ".");
      state.events = state.events.slice(0, 6);
    }
  }
  if (!state.ecology) state.ecology = createPlanetEcology();
  advancePlanetEcology(
    state.ecology,
    elapsedWorldMinutes,
    state.deployedEquipment,
    Object.fromEntries(Object.entries(state.colonies).map(([name, colony]) => [name, colony.operators])),
  );

  for (const planet of WORLD_PLANETS) {
    const machines = state.deployedEquipment[planet.name] || 0;
    const operators = state.colonies[planet.name]?.operators || 0;
    if (machines > 0 && (state.planetProgress[planet.name] || 0) < 100) {
      // Preserve the prototype's visible pace while tying it to simulation time: 3.3% per simulated hour per machine.
      const previousProgress = state.planetProgress[planet.name] || 0;
      const previousStage = habitatStage(previousProgress);
      const ecology = state.ecology?.[planet.name];
      const maintenanceReliability = ecology ? (ecology.maintenanceLoad >= 85 ? .35 : ecology.maintenanceLoad >= 65 ? .65 : 1) : 1;
      const rate = (machines + operators * 0.18) * maintenanceReliability;
      const nextProgress = Math.min(100, previousProgress + hours * 3.3 * rate);
      state.planetProgress[planet.name] = nextProgress;
      const nextStage = habitatStage(nextProgress);
      if (nextStage.index > previousStage.index) {
        state.events.unshift(planet.name + " has entered " + nextStage.label + " conditions. " + (nextProgress >= 80 ? "Safe settlement capacity: " + habitatCapacity(nextProgress) + " people." : "More restoration is needed before people can settle safely."));
        state.events = state.events.slice(0, 6);
        recordSpaceChronicle(state, "habitat", planet.name, planet.name + " reached " + nextStage.label, "Habitat restoration moved from " + previousStage.label + " to " + nextStage.label + " conditions at " + Math.round(state.worldTimeMinutes / 60) + " system hours.");
      }
    }
  }

  state.havenGrowthRemainder += state.havenPopulation * 0.0008 * hours;
  while (state.havenGrowthRemainder >= 1 && state.havenPopulation < 240) {
    state.havenPopulation += 1;
    state.havenGrowthRemainder -= 1;
  }
  if (state.havenPopulation >= 240) state.havenGrowthRemainder = 0;

  for (const planet of WORLD_PLANETS) {
    const colony = state.colonies[planet.name];
    if (!colony) continue;
    const progress = state.planetProgress[planet.name] || 0;
    const capacity = habitatCapacity(progress);
    colony.operators = Math.max(1, Math.min(colony.population, Math.floor(colony.population / 4)));
    const ecologySupport = state.ecology?.[planet.name]
      ? Math.max(.25, Math.min(1.1, .25 + state.ecology[planet.name].foodProduction * .004 + state.ecology[planet.name].accessibleWater * .002 + (100 - state.ecology[planet.name].contamination) * .001))
      : 1;
    const previousRemainder = state.colonyGrowthRemainders[planet.name] || 0;
    if (colony.population < capacity) {
      let remainder = previousRemainder + colony.population * (0.018 + colony.operators * 0.0005) * hours * ecologySupport;
      while (remainder >= 1 && colony.population < capacity) {
        colony.population += 1;
        remainder -= 1;
      }
      state.colonyGrowthRemainders[planet.name] = colony.population >= capacity ? 0 : remainder;
    } else {
      state.colonyGrowthRemainders[planet.name] = 0;
    }
    const ecology = state.ecology?.[planet.name];
    colony.autonomy = Math.min(100, colony.autonomy + hours * (colony.operators * .08 + (ecology?.manufacturedModules || 0) * .02));
    if (state.worldTimeMinutes - colony.lastContactWorldMinutes > 3 * 1440) colony.trustWithHaven = Math.max(0, colony.trustWithHaven - hours * .025);
    const residents = (state.population?.people || []).filter(person => person.alive && person.location === ("planet:" + planet.name));
    const motivationNames: Record<string, [string,string]> = {
      exploration: ["Exploration Circle","Map and study the unknown"],
      refuge: ["Safety Coalition","Protect people and preserve reserves"],
      autonomy: ["Free Settlers","Increase local decision-making"],
      science: ["Research Guild","Invest in knowledge and discovery"],
      family: ["Community Network","Prioritise care and belonging"],
      service: ["Stewardship Council","Maintain shared systems and habitats"],
      opportunity: ["Resource Cooperative","Develop local production fairly"],
      recognition: ["Pioneer Assembly","Recognise contribution and achievement"],
    };
    const motiveCounts = new Map<string, number>();
    for (const person of residents) motiveCounts.set(person.motivation, (motiveCounts.get(person.motivation) || 0) + 1);
    colony.factions = [...motiveCounts.entries()].filter(([,count]) => count >= 2).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([motivation,count]) => ({
      id: planet.name.toLowerCase() + "-" + motivation,
      name: motivationNames[motivation]?.[0] || "Local group",
      agenda: motivationNames[motivation]?.[1] || "Represent local interests",
      influence: residents.length ? Math.round(count / residents.length * 100) : 0,
    }));
    const previousGovernance = colony.governance;
    colony.governance = colony.independent ? "self-governing" : colony.population >= 8 && colony.autonomy >= 35 ? "local-council" : "provisional";
    if (previousGovernance !== colony.governance) recordSpaceChronicle(state, "society", planet.name, planet.name + " governance changed", "Local governance matured from " + previousGovernance + " to " + colony.governance + " as population and autonomy changed.");
    if (!colony.independent && colony.population >= 18 && colony.autonomy >= 55 && state.worldTimeMinutes - colony.foundedAtWorldMinutes >= 7 * 1440) {
      colony.independent = true;
      colony.governance = "self-governing";
      state.events.unshift(planet.name + " has become self-governing after local capacity and autonomy matured.");
      state.events = state.events.slice(0, 6);
      recordSpaceChronicle(state, "society", planet.name, planet.name + " became self-governing", "The colony reached its population, autonomy and time thresholds for independence from Haven.");
    }
  }
  const populationCounts = Object.fromEntries(Object.entries(state.colonies).map(([name, colony]) => [name, colony.population]));
  populationCounts.Haven = state.havenPopulation;
  advancePopulation(state.population, state.worldTimeMinutes, state.planetProgress, populationCounts, state.events);

  const activeHazard = (state.hazards || []).find(hazard => hazard.status === "warning" || hazard.status === "mitigated");
  const developedWorld = WORLD_PLANETS.find(planet => (state.planetProgress[planet.name] || 0) >= 92 && Boolean(state.colonies[planet.name]));
  if (!activeHazard && state.worldTimeMinutes >= (state.nextHazardAtWorldMinutes || 14 * 1440) && (Object.keys(state.colonies).length > 0 || Object.values(state.deployedEquipment).some(count => count >= 2))) {
    const powerDust = Boolean(developedWorld && (state.deployedEquipment[developedWorld.name] || 0) >= 4 && state.worldTimeMinutes >= 30 * 1440);
    const target = powerDust ? developedWorld!.name : WORLD_PLANETS[(Math.floor(state.worldTimeMinutes / 1440) + state.asteroidsShot) % WORLD_PLANETS.length].name;
    const severity = (powerDust ? 3 : 1 + (Math.floor(state.worldTimeMinutes / 1440) % 3)) as 1|2|3;
    const warningHours = powerDust ? 16 : 8 + (Math.floor(state.worldTimeMinutes / 60) % 8);
    const hazard: SpaceHazard = {
      id: "hazard-" + Math.floor(state.worldTimeMinutes).toString(36),
      type: powerDust ? "power-dust" : "asteroid-impact",
      target,
      severity,
      forecastStartWorldMinutes: state.worldTimeMinutes + warningHours * 60 * .5,
      impactAtWorldMinutes: state.worldTimeMinutes + warningHours * 60,
      confidence: powerDust ? .58 : .72,
      status: "warning",
      mitigation: 0,
    };
    state.hazards = [...(state.hazards || []), hazard].slice(-24);
    state.events.unshift(powerDust
      ? "SENSOR WARNING: a rare charged power-dust field is converging on " + target + ". Forecast confidence is limited; inspect and prepare before the impact window."
      : "ORBITAL WARNING: debris trajectory may impact " + target + ". A response window is available; forecast confidence may change.");
    state.nextHazardAtWorldMinutes = state.worldTimeMinutes + 21 * 1440;
  }
  for (const hazard of state.hazards || []) {
    if ((hazard.status === "warning" || hazard.status === "mitigated") && state.worldTimeMinutes >= hazard.impactAtWorldMinutes) {
      const damage = Math.max(0, hazard.severity * (hazard.type === "power-dust" ? 5 : 2.2) - hazard.mitigation * 2);
      state.planetProgress[hazard.target] = Math.max(0, (state.planetProgress[hazard.target] || 0) - damage);
      const ecology = state.ecology?.[hazard.target];
      if (ecology) {
        ecology.biodiversity = Math.max(0, ecology.biodiversity - damage * (hazard.type === "power-dust" ? 2.2 : .55));
        ecology.contamination = Math.min(100, ecology.contamination + damage * (hazard.type === "power-dust" ? 1.8 : .35));
        ecology.foodProduction = Math.max(0, ecology.foodProduction - damage * .7);
        ecology.energyPotential = Math.max(0, ecology.energyPotential - damage * .9);
        ecology.maintenanceLoad = Math.min(100, ecology.maintenanceLoad + damage * 1.2);
      }
      hazard.status = "impact";
      state.events.unshift(hazard.type === "power-dust"
        ? hazard.target + " was struck by charged power-dust. Habitat and ecological systems suffered " + damage.toFixed(1) + " points of damage."
        : hazard.target + " was struck by orbital debris. Habitat restoration lost " + damage.toFixed(1) + " points.");
    }
  }
  if (state.events.length > 6) state.events.length = 6;
}

export function mitigateSpaceHazard(state: SpaceState, target: string): boolean {
  const hazard = (state.hazards || []).find(item => item.target === target && item.status === "warning");
  if (!hazard || state.machineInventory <= 0) return false;
  state.machineInventory -= 1;
  hazard.mitigation = Math.min(3, hazard.mitigation + 1);
  hazard.status = "mitigated";
  hazard.impactAtWorldMinutes += 4 * 60;
  state.events.unshift("A finite Haven machine was diverted to mitigation at " + target + ". The forecast window widened; impact severity is reduced.");
  state.events = state.events.slice(0, 6);
  return true;
}

export function restoreSpaceState(value: unknown, now = Date.now()): SpaceState {
  const initial = createInitialSpaceState(now);
  if (!value || typeof value !== "object") return initial;
  const saved = value as Partial<SpaceState>;
  if (saved.version !== 1) return initial;

  const state: SpaceState = {
    ...initial,
    nearbyTarget: typeof saved.nearbyTarget === "string" ? saved.nearbyTarget : null,
    dockedAt: saved.dockedAt === "GGL Haven" ? "GGL Haven" : null,
    cargoMaterials: boundedInteger(saved.cargoMaterials, 0, 0, 20),
    havenMaterials: boundedInteger(saved.havenMaterials, 12, 0, 100000),
    machineProductionQueue: boundedInteger(saved.machineProductionQueue, 0, 0, 1000),
    machineProductionProgress: Math.max(0, Math.min(3.999, finiteNumber(saved.machineProductionProgress, 0))),
    chronicle: Array.isArray(saved.chronicle) ? saved.chronicle.filter((event): event is SpaceChronicleEvent => Boolean(event && typeof event === "object" && typeof (event as SpaceChronicleEvent).id === "string" && typeof (event as SpaceChronicleEvent).atWorldMinutes === "number" && typeof (event as SpaceChronicleEvent).location === "string" && typeof (event as SpaceChronicleEvent).title === "string" && typeof (event as SpaceChronicleEvent).detail === "string")).slice(-1200) : initial.chronicle,
    cargoPeople: boundedInteger(saved.cargoPeople, 0, 0, 6),
    cargoEquipment: boundedInteger(saved.cargoEquipment, 0, 0, 4),
    visitedPlanets: Array.isArray(saved.visitedPlanets) ? saved.visitedPlanets.filter((name): name is string => typeof name === "string" && WORLD_PLANETS.some((planet) => planet.name === name)) : [],
    travelNotes: Array.isArray(saved.travelNotes) ? saved.travelNotes.filter((note): note is string => typeof note === "string").slice(0, 8) : [],
    acclaim: boundedInteger(saved.acclaim, 0, 0, 1000000),
    asteroidsShot: boundedInteger(saved.asteroidsShot, 0, 0, 1000000),
    salvageRecovered: boundedInteger((saved as Partial<SpaceState> & { salvageRecovered?: number }).salvageRecovered, 0, 0, 1000000),
    havenPopulation: boundedInteger(saved.havenPopulation, 60, 0, 1000000),
    machineInventory: boundedInteger(saved.machineInventory, 12, 0, 10000),
    worldTimeMinutes: Math.max(0, finiteNumber(saved.worldTimeMinutes, 0)),
    lastSimulatedAt: Math.max(0, finiteNumber(saved.lastSimulatedAt, now)),
    havenGrowthRemainder: Math.max(0, Math.min(0.999999, finiteNumber(saved.havenGrowthRemainder, 0))),
    deployedEquipment: { ...initial.deployedEquipment },
    planetProgress: { ...initial.planetProgress },
    colonies: {},
    colonyGrowthRemainders: {},
    events: Array.isArray(saved.events) ? saved.events.filter((event): event is string => typeof event === "string").slice(0, 6) : initial.events,
  };

  for (const planet of WORLD_PLANETS) {
    const deployed = (saved.deployedEquipment as Record<string, unknown> | undefined)?.[planet.name];
    const progress = (saved.planetProgress as Record<string, unknown> | undefined)?.[planet.name];
    state.deployedEquipment[planet.name] = boundedInteger(deployed, 0, 0, 10000);
    state.planetProgress[planet.name] = Math.max(0, Math.min(100, finiteNumber(progress, planet.initialProgress)));
    const rawColony = (saved.colonies as Record<string, unknown> | undefined)?.[planet.name];
    if (rawColony && typeof rawColony === "object") {
      const colony = rawColony as Partial<SpaceColony>;
      const population = boundedInteger(colony.population, 0, 0, habitatCapacity(state.planetProgress[planet.name]));
      if (population > 0) {
        const foundedAt = Math.max(0, finiteNumber(colony.foundedAtWorldMinutes, 0));
        state.colonies[planet.name] = {
          population,
          founders: boundedInteger(colony.founders, population, 0, 60),
          operators: boundedInteger(colony.operators, Math.max(1, Math.floor(population / 4)), 1, population),
          foundedAtWorldMinutes: foundedAt,
          independent: Boolean(colony.independent),
          trustWithHaven: Math.max(0, Math.min(100, finiteNumber((colony as Partial<SpaceColony>).trustWithHaven, 70))),
          autonomy: Math.max(0, Math.min(100, finiteNumber((colony as Partial<SpaceColony>).autonomy, 15))),
          governance: (["provisional","local-council","self-governing"].includes(String((colony as Partial<SpaceColony>).governance)) ? (colony as Partial<SpaceColony>).governance : (colony.independent ? "self-governing" : "provisional")) as SpaceColony["governance"],
          lastContactWorldMinutes: Math.max(foundedAt, finiteNumber((colony as Partial<SpaceColony>).lastContactWorldMinutes, foundedAt)),
          factions: Array.isArray((colony as Partial<SpaceColony>).factions) ? (colony as Partial<SpaceColony>).factions!.filter(faction => faction && typeof faction.id === "string" && typeof faction.name === "string" && typeof faction.agenda === "string" && Number.isFinite(faction.influence)).slice(0, 5) : [],
        };
      }
    }
    const remainders = saved.colonyGrowthRemainders as Record<string, unknown> | undefined;
    state.colonyGrowthRemainders[planet.name] = Math.max(0, Math.min(0.999999, finiteNumber(remainders?.[planet.name], 0)));
  }
  state.population = restorePopulationState(saved.population, {
    haven: state.havenPopulation,
    ship: state.cargoPeople,
    colonies: Object.fromEntries(Object.entries(state.colonies).map(([name, colony]) => [name, colony.population])),
  }, state.worldTimeMinutes);
  const savedHazards = Array.isArray((saved as Partial<SpaceState>).hazards) ? (saved as Partial<SpaceState>).hazards! : [];
  state.hazards = savedHazards.filter(hazard => hazard && typeof hazard.id === "string" && (hazard.type === "asteroid-impact" || hazard.type === "power-dust") && typeof hazard.target === "string" && Number.isFinite(hazard.impactAtWorldMinutes) && Number.isFinite(hazard.severity) && ["warning","mitigated","impact"].includes(hazard.status)).slice(-24).map(hazard => ({ ...hazard, severity: Math.max(1, Math.min(3, Math.round(hazard.severity))) as 1|2|3, confidence: Math.max(0, Math.min(1, Number(hazard.confidence) || .5)), mitigation: Math.max(0, Math.min(3, Math.round(Number(hazard.mitigation) || 0))) }));
  state.nextHazardAtWorldMinutes = Math.max(state.worldTimeMinutes, finiteNumber((saved as Partial<SpaceState>).nextHazardAtWorldMinutes, 14 * 1440));
  state.ecology = restorePlanetEcology((saved as Partial<SpaceState>).ecology);

  // Offline catch-up follows the accelerated world clock, capped at seven simulated days.
  const elapsedWallSeconds = Math.max(0, Math.min(30 * 24 * 60 * 60, (now - state.lastSimulatedAt) / 1000));
  const catchUpMinutes = Math.min(7 * 24 * 60, elapsedWallSeconds * 4);
  if (catchUpMinutes > 0) {
    state.worldTimeMinutes += catchUpMinutes;
    advanceSpaceWorld(state, catchUpMinutes);
  }
  state.lastSimulatedAt = now;
  return state;
}

export function formatWorldTime(worldTimeMinutes: number): string {
  const totalMinutes = (360 + Math.floor(worldTimeMinutes)) % 1440;
  const day = Math.floor(worldTimeMinutes / 1440) + 1;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `DAY ${day} · ${hours}:${minutes}`;
}

export type FirstFootholdCue = {
  target: string;
  step: 1 | 2 | 3;
  title: string;
  detail: string;
  action: string;
  progress: number;
};

export function getFirstFootholdCue(state: SpaceState): FirstFootholdCue {
  // Cobalt remains the suggested first foothold because its three-machine requirement is the lowest practical entry point. Every world begins at 0% restoration; their environmental identities and machine requirements remain distinct.
  const candidate = !state.colonies.Cobalt
    ? WORLD_PLANETS.find((planet) => planet.name === "Cobalt")
    : WORLD_PLANETS
      .filter((planet) => !state.colonies[planet.name])
      .sort((a, b) => (state.planetProgress[b.name] ?? b.initialProgress) - (state.planetProgress[a.name] ?? a.initialProgress))[0];

  if (!candidate) {
    return {
      target: "GGL Haven",
      step: 3,
      title: "Your descendants are spreading",
      detail: "Every established settlement descends from Haven's original 60. Choose another world and invest in its future.",
      action: "Choose the next world",
      progress: 100,
    };
  }

  const progress = state.planetProgress[candidate.name] ?? candidate.initialProgress;
  const installed = state.deployedEquipment[candidate.name] || 0;
  const needMachines = candidate.colonyMachineRequirement;
  const hasMachinesOnShip = state.cargoEquipment > 0;
  const habitatReady = progress >= 80;
  const machinesReady = installed >= needMachines;
  const crewOnShip = state.cargoPeople > 0;

  if (crewOnShip && habitatReady && machinesReady) {
    return {
      target: candidate.name,
      step: 3,
      title: "Found the settlement",
      detail: candidate.name + " is ready. Deliver your crew to begin a society descended from Haven.",
      action: "Deliver founding crew",
      progress: 86,
    };
  }

  if (hasMachinesOnShip && (!machinesReady || !habitatReady)) {
    return {
      target: candidate.name,
      step: 2,
      title: "Deliver the machinery",
      detail: candidate.name + " has " + installed + "/" + needMachines + " required machines installed. Delivering more machinery can restore habitat faster.",
      action: "Visit world to deploy",
      progress: 42,
    };
  }

  if (!machinesReady) {
    if (!hasMachinesOnShip && state.machineInventory > 0) {
      return {
        target: "GGL Haven",
        step: 1,
        title: "Load your next investment",
        detail: candidate.name + " is " + Math.round(progress) + "% restored; " + installed + "/" + needMachines + " required machines are installed. Load " + (needMachines - installed) + " more, then deliver it.",
        action: "Load machines at Haven",
        progress: 14,
      };
    }
    return {
      target: candidate.name,
      step: 2,
      title: "Restore " + candidate.name,
      detail: "Machines installed: " + installed + "/" + needMachines + ". Habitat: " + Math.round(progress) + "%. Deliver the missing machinery when available.",
      action: "Continue restoration",
      progress: 42,
    };
  }

  if (!habitatReady) {
    return {
      target: candidate.name,
      step: 2,
      title: "Watch the atmosphere change",
      detail: installed + " machines are working on " + candidate.name + ". Habitat is " + Math.round(progress) + "%; keep system time moving until the world turns habitable.",
      action: "Wait for habitat threshold",
      progress: 60,
    };
  }

  if (!crewOnShip) {
    return {
      target: "GGL Haven",
      step: 3,
      title: "Collect a founding crew",
      detail: candidate.name + " has safe air and its required machinery. Return to Haven and board people from the original population.",
      action: "Board crew at Haven",
      progress: 72,
    };
  }

  return {
    target: candidate.name,
    step: 3,
    title: "Found the settlement",
    detail: "Bring the crew to " + candidate.name + " to begin local operations.",
    action: "Deliver founding crew",
    progress: 86,
  };
}
