import { advancePlanetEcology, createPlanetEcology, restorePlanetEcology, type PlanetEcologyMap } from "./space-ecology";
import { advancePopulation, createPopulationState, restorePopulationState, type PopulationState } from "./space-people";
import { DEFAULT_FOUNDING_IDS } from "./space-founding";
import { getSurveyWorld, SURVEY_WORLDS } from "./space-universe";

export const SPACE_SAVE_KEY = "ggl-space-world-v1";
export const SYSTEM_SURVEY_TARGETS = [
  { id: "aster", name: "Aster", signal: "ESTABLISHED WORLD" }, { id: "cobalt", name: "Cobalt", signal: "ESTABLISHED WORLD" }, { id: "verdant", name: "Verdant", signal: "ESTABLISHED WORLD" }, { id: "ember", name: "Ember", signal: "ESTABLISHED WORLD" }, { id: "frost", name: "Frost", signal: "ESTABLISHED WORLD" },
  ...Array.from({ length: 15 }, (_, index) => ({ id: "signal-" + String(index + 6).padStart(2, "0"), name: "Signal " + String(index + 6).padStart(2, "0"), signal: "UNIDENTIFIED PLANETARY BODY" })),
] as const;

export const WORLD_PLANETS = [
  { name: "Ember", initialProgress: 0, colonyMachineRequirement: 6, identityColor: "#a75b42", summary: "Sterile rock · full rebuild" },
  { name: "Frost", initialProgress: 0, colonyMachineRequirement: 5, identityColor: "#9ebdce", summary: "Toxic ice · atmosphere work" },
  { name: "Aster", initialProgress: 0, colonyMachineRequirement: 4, identityColor: "#4d438d", summary: "Trace atmosphere · heavy support" },
  { name: "Cobalt", initialProgress: 0, colonyMachineRequirement: 3, identityColor: "#276f9f", summary: "Thin air · settlement prep" },
  { name: "Verdant", initialProgress: 0, colonyMachineRequirement: 2, identityColor: "#367b62", summary: "Reactive biosphere · ecological balancing" },
] as const;

export type PlanetName = (typeof WORLD_PLANETS)[number]["name"];

export const PLANET_ORIGIN_STORIES: Record<PlanetName, { title: string; discovery: string; unresolved: string }> = {
  Aster: { title: "Aster — the fractured silicate frontier", discovery: "The first long-range survey found a cold, low-pressure world shaped by ancient impacts. Its exposed silicate shelves and buried mineral seams make it useful for structural materials, but the surface offers no safe air or dependable open-water cycle.", unresolved: "Subsurface voids and heat pockets remain poorly mapped. Survey teams do not yet know whether they can support stable underground industry or conceal volatile deposits." },
  Cobalt: { title: "Cobalt — the copper-bearing pressure basin", discovery: "Orbital instruments traced extensive copper-bearing formations beneath a thin, unstable atmosphere. The world is less thermally extreme than the outer planets, but pressure, radiation exposure and the absence of a safe biosphere still make every unprotected landing lethal.", unresolved: "The extent of accessible copper and the behaviour of buried water deposits are uncertain. Its lower initial machinery requirement makes it a practical first restoration candidate, not a habitable world." },
  Verdant: { title: "Verdant — the reactive living world", discovery: "Verdant's temperate readings and dense biological signatures initially looked promising. Close observation revealed an unfamiliar, reactive ecology and atmospheric chemistry that cannot be assumed safe for humans. Its rare crystalline deposits may help future power and sensor systems.", unresolved: "The ecology's seasonal cycles, chemical signalling and response to industrial disturbance are not understood. Any restoration must begin with containment and study, not uncontrolled terraforming." },
  Ember: { title: "Ember — the furnace beneath the dust", discovery: "Ember is a superheated, high-radiation world with almost no useful atmospheric pressure. Orbital scans identified iron-rich deposits and signs of persistent geological activity. It is a long-horizon industrial prospect, not an early settlement destination.", unresolved: "The safest extraction windows, depth of stable mineral seams and long-term behaviour of its active crust remain unknown. Heavy shielding and specialised thermal equipment will be required." },
  Frost: { title: "Frost — the buried-water world", discovery: "Frost is an extreme cold trap with a hostile, thin atmosphere. Survey returns indicate substantial water ice locked below fractured surface layers, making it strategically important for future life-support chemistry despite its severe temperature and radiation hazards.", unresolved: "The depth, purity and accessibility of the ice are not yet confirmed. Heating and drilling could destabilise the surface, so extraction methods must be tested before large-scale deployment." },
};

const createOpeningChronicle = (population: PopulationState): SpaceChronicleEvent[] => [
  { id: "haven-origin-0", atWorldMinutes: 0, kind: "origin", location: "GGL Haven", title: "The founding of Haven: " + (population.foundingProfile?.title || "A new beginning"), detail: (population.foundingProfile?.originSummary || "Sixty founders establish a shared refuge.") + " Five social networks now take shape from their shared circumstances, different interpretations and competing priorities. Their identities are starting conditions, not fixed factions." },
  ...WORLD_PLANETS.map((planet) => ({ id: "planet-origin-" + planet.name.toLowerCase(), atWorldMinutes: 0, kind: "origin" as const, location: planet.name, title: PLANET_ORIGIN_STORIES[planet.name].title, detail: PLANET_ORIGIN_STORIES[planet.name].discovery + " Unresolved frontier: " + PLANET_ORIGIN_STORIES[planet.name].unresolved })),
];

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

export type SpaceChronicleEvent = { id: string; atWorldMinutes: number; kind: "origin" | "discovery" | "settlement" | "habitat" | "recovery" | "docking" | "repair" | "hazard" | "society" | "production"; location: string; title: string; detail: string };

export type SpaceSurveyRecord = { worldId: string; revealedName: string; classification: string; atmosphere: string; resources: string; meteorExposure: string; surveyedAtWorldMinutes: number };

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
  discoveredPlanets?: string[];
  surveyRecords?: Record<string, { surveyedAtWorldMinutes: number; report: string; orbitalNotes: string }>;
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
  /** Unknown system bodies become known only after a successful close-range survey. */
  discoveredWorlds?: string[];
  selectedSurveyTarget?: string | null;
  surveyRecords?: Record<string, SpaceSurveyRecord>;
};

export function habitatStage(progress: number): HabitatStage {
  const index = progress >= 80 ? 4 : progress >= 60 ? 3 : progress >= 40 ? 2 : progress >= 20 ? 1 : 0;
  return HABITAT_STAGES[index];
}

export function habitatCapacity(progress: number): number {
  return progress < 80 ? 0 : 12 + Math.floor((progress - 80) * 1.6);
}

export function createInitialSpaceState(now = Date.now(), foundingIds: string[] = DEFAULT_FOUNDING_IDS): SpaceState {
  const population = createPopulationState(0x47474c, 60, 0, foundingIds);
  return {
    version: 1,
    nearbyTarget: null,
    dockedAt: null,
    cargoMaterials: 0,
    havenMaterials: 12,
    machineProductionQueue: 0,
    machineProductionProgress: 0,
    chronicle: createOpeningChronicle(population),
    discoveredWorlds: [],
    selectedSurveyTarget: null,
    surveyRecords: {},
    cargoPeople: 0,
    cargoEquipment: 0,
    visitedPlanets: [],
    discoveredPlanets: [],
    surveyRecords: {},
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
    population,
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

export function selectSpaceSurveyTarget(state: SpaceState, worldId: string | null): boolean {
  if (worldId !== null && !getSurveyWorld(worldId) && !WORLD_PLANETS.some(planet => planet.name === worldId)) return false;
  state.selectedSurveyTarget = worldId;
  return true;
}

export function surveySpaceWorld(state: SpaceState, worldId: string): boolean {
  const world = getSurveyWorld(worldId);
  if (!world || (state.discoveredWorlds || []).includes(worldId)) return false;
  state.discoveredWorlds = [...(state.discoveredWorlds || []), worldId];
  const record: SpaceSurveyRecord = {
    worldId,
    revealedName: world.revealedName,
    classification: world.classification,
    atmosphere: world.atmosphere,
    resources: world.resources,
    meteorExposure: world.meteorExposure,
    surveyedAtWorldMinutes: state.worldTimeMinutes,
  };
  state.surveyRecords = { ...(state.surveyRecords || {}), [worldId]: record };
  state.acclaim += world.scanReward;
  state.events.unshift("SURVEY COMPLETE: " + world.revealedName + " identified. " + world.surveyFinding);
  state.events = state.events.slice(0, 6);
  recordSpaceChronicle(
    state,
    "discovery",
    world.revealedName,
    "New world discovered: " + world.revealedName,
    world.surveyFinding + " Survey reward: " + world.scanReward + " archive acclaim. Meteor exposure: " + world.meteorExposure + ".",
  );
  if (state.selectedSurveyTarget === worldId) state.selectedSurveyTarget = null;
  return true;
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
    const foundingGroups = (state.population?.foundingNetworks || []).map(network => {
      const count = residents.filter(person => network.householdIds.includes(person.householdId)).length;
      return { count, faction: { id: planet.name.toLowerCase() + "-network-" + network.id, name: network.name, agenda: network.agenda, influence: residents.length ? Math.round(count / residents.length * network.influence) : 0 } };
    }).filter(group => group.count >= 2);
    const motivationGroups = [...motiveCounts.entries()].filter(([,count]) => count >= 2).map(([motivation,count]) => ({
      count,
      faction: {
        id: planet.name.toLowerCase() + "-interest-" + motivation,
        name: motivationNames[motivation]?.[0] || "Local group",
        agenda: motivationNames[motivation]?.[1] || "Represent local interests",
        influence: residents.length ? Math.round(count / residents.length * 100) : 0,
      },
    }));
    colony.factions = [...foundingGroups, ...motivationGroups].sort((a,b) => b.faction.influence - a.faction.influence).slice(0,5).map(group => group.faction);
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
  const savedChronicle = Array.isArray(saved.chronicle) ? saved.chronicle.filter((event): event is SpaceChronicleEvent => Boolean(event && typeof event === "object" && typeof (event as SpaceChronicleEvent).id === "string" && typeof (event as SpaceChronicleEvent).atWorldMinutes === "number" && typeof (event as SpaceChronicleEvent).location === "string" && typeof (event as SpaceChronicleEvent).title === "string" && typeof (event as SpaceChronicleEvent).detail === "string")) : [];

  const state: SpaceState = {
    ...initial,
    nearbyTarget: typeof saved.nearbyTarget === "string" ? saved.nearbyTarget : null,
    dockedAt: saved.dockedAt === "GGL Haven" ? "GGL Haven" : null,
    cargoMaterials: boundedInteger(saved.cargoMaterials, 0, 0, 20),
    havenMaterials: boundedInteger(saved.havenMaterials, 12, 0, 100000),
    machineProductionQueue: boundedInteger(saved.machineProductionQueue, 0, 0, 1000),
    machineProductionProgress: Math.max(0, Math.min(3.999, finiteNumber(saved.machineProductionProgress, 0))),
    chronicle: [],
    discoveredWorlds: Array.isArray(saved.discoveredWorlds) ? saved.discoveredWorlds.filter((id): id is string => typeof id === "string" && Boolean(getSurveyWorld(id))) : [],
    selectedSurveyTarget: typeof saved.selectedSurveyTarget === "string" && (Boolean(getSurveyWorld(saved.selectedSurveyTarget)) || WORLD_PLANETS.some(planet => planet.name === saved.selectedSurveyTarget)) ? saved.selectedSurveyTarget : null,
    surveyRecords: {},
    cargoPeople: boundedInteger(saved.cargoPeople, 0, 0, 6),
    cargoEquipment: boundedInteger(saved.cargoEquipment, 0, 0, 4),
    visitedPlanets: Array.isArray(saved.visitedPlanets) ? saved.visitedPlanets.filter((name): name is string => typeof name === "string" && WORLD_PLANETS.some((planet) => planet.name === name)) : [],
    discoveredPlanets: Array.isArray(saved.discoveredPlanets) ? saved.discoveredPlanets.filter((id): id is string => typeof id === "string" && SYSTEM_SURVEY_TARGETS.some((target) => target.id === id)) : [],
    surveyRecords: saved.surveyRecords && typeof saved.surveyRecords === "object" ? Object.fromEntries(Object.entries(saved.surveyRecords).filter(([id, value]) => SYSTEM_SURVEY_TARGETS.some((target) => target.id === id) && value && typeof value === "object" && typeof (value as { report?: unknown }).report === "string").map(([id, value]) => [id, value])) : {},
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
  const rawSurveyRecords = saved.surveyRecords && typeof saved.surveyRecords === "object" ? saved.surveyRecords : {};
  for (const id of state.discoveredWorlds || []) {
    const world = getSurveyWorld(id);
    if (!world) continue;
    const raw = (rawSurveyRecords as Record<string, unknown>)[id];
    const record = raw && typeof raw === "object" ? raw as Partial<SpaceSurveyRecord> : {};
    state.surveyRecords![id] = {
      worldId: id,
      revealedName: typeof record.revealedName === "string" ? record.revealedName : world.revealedName,
      classification: typeof record.classification === "string" ? record.classification : world.classification,
      atmosphere: typeof record.atmosphere === "string" ? record.atmosphere : world.atmosphere,
      resources: typeof record.resources === "string" ? record.resources : world.resources,
      meteorExposure: typeof record.meteorExposure === "string" ? record.meteorExposure : world.meteorExposure,
      surveyedAtWorldMinutes: Math.max(0, finiteNumber(record.surveyedAtWorldMinutes, 0)),
    };
  }
  const restoredPopulation = restorePopulationState(saved.population, {
    haven: state.havenPopulation,
    ship: state.cargoPeople,
    colonies: Object.fromEntries(Object.entries(state.colonies).map(([name, colony]) => [name, colony.population])),
  }, state.worldTimeMinutes);
  state.population = restoredPopulation;
  const openingEvents = createOpeningChronicle(restoredPopulation).map(event => savedChronicle.find(savedEvent => savedEvent.id === event.id) || event);
  const openingEventIds = new Set(openingEvents.map(event => event.id));
  const savedHistoryEvents = savedChronicle.filter(event => !openingEventIds.has(event.id));
  state.chronicle = [...openingEvents, ...savedHistoryEvents].slice(-1200);
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



export function recordPlanetSurvey(state: SpaceState, targetId: string): boolean {
  const target = SYSTEM_SURVEY_TARGETS.find((item) => item.id === targetId);
  if (!target) return false;
  if (!state.discoveredPlanets) state.discoveredPlanets = [];
  if (!state.surveyRecords) state.surveyRecords = {};
  if (state.surveyRecords[targetId]) return false;
  const report = target.id === "aster" ? "Cold, low-pressure silicate terrain confirmed. Mineral seams and subsurface voids require deeper study."
    : target.id === "cobalt" ? "Copper-bearing formations and a thin, unstable atmosphere confirmed. No safe biosphere detected."
    : target.id === "verdant" ? "Reactive biological signatures confirmed. Atmospheric chemistry remains unsafe and requires controlled research."
    : target.id === "ember" ? "Extreme heat, radiation and iron-rich deposits confirmed. Surface operations require specialised shielding."
    : target.id === "frost" ? "Deep water-ice signatures confirmed beneath fractured terrain. Extraction depth and purity remain uncertain."
    : "A planetary body is confirmed. Initial scan captured surface composition, atmospheric readings and orbital conditions; a full expedition is still required.";
  const orbitalNotes = "Orbital pass recorded at system time " + Math.floor(state.worldTimeMinutes) + " minutes. Meteor exposure and long-term habitability remain unverified.";
  state.discoveredPlanets.push(targetId);
  state.surveyRecords[targetId] = { surveyedAtWorldMinutes: state.worldTimeMinutes, report, orbitalNotes };
  state.events.unshift(target.name + " is now confirmed in Haven's system chart. Survey findings have been transmitted.");
  state.events = state.events.slice(0, 6);
  recordSpaceChronicle(state, "origin", target.name, "Survey report recorded", report + " " + orbitalNotes);
  return true;
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
