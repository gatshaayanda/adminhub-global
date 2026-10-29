export const SPACE_SAVE_KEY = "ggl-space-world-v1";

export const WORLD_PLANETS = [
  { name: "Ember", initialProgress: 6, colonyMachineRequirement: 6, identityColor: "#a75b42", summary: "Sterile rock · full rebuild" },
  { name: "Frost", initialProgress: 26, colonyMachineRequirement: 5, identityColor: "#9ebdce", summary: "Toxic ice · atmosphere work" },
  { name: "Aster", initialProgress: 46, colonyMachineRequirement: 4, identityColor: "#4d438d", summary: "Trace atmosphere · heavy support" },
  { name: "Cobalt", initialProgress: 66, colonyMachineRequirement: 3, identityColor: "#276f9f", summary: "Thin air · settlement prep" },
  { name: "Verdant", initialProgress: 86, colonyMachineRequirement: 2, identityColor: "#367b62", summary: "Stable biosphere · ready to seed" },
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

export type SpaceColony = {
  population: number;
  founders: number;
  operators: number;
  foundedAtWorldMinutes: number;
  independent: boolean;
};

export type SpaceState = {
  version: 1;
  nearbyTarget: string | null;
  cargoPeople: number;
  cargoEquipment: number;
  visitedPlanets: string[];
  deployedEquipment: Record<string, number>;
  planetProgress: Record<string, number>;
  travelNotes: string[];
  acclaim: number;
  asteroidsShot: number;
  havenPopulation: number;
  machineInventory: number;
  worldTimeMinutes: number;
  lastSimulatedAt: number;
  havenGrowthRemainder: number;
  colonies: Record<string, SpaceColony>;
  colonyGrowthRemainders: Record<string, number>;
  events: string[];
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
    cargoPeople: 0,
    cargoEquipment: 0,
    visitedPlanets: [],
    deployedEquipment: Object.fromEntries(WORLD_PLANETS.map((planet) => [planet.name, 0] as const)),
    planetProgress: Object.fromEntries(WORLD_PLANETS.map((planet) => [planet.name, planet.initialProgress] as const)),
    travelNotes: [],
    acclaim: 0,
    asteroidsShot: 0,
    havenPopulation: 60,
    machineInventory: 12,
    worldTimeMinutes: 0,
    lastSimulatedAt: now,
    havenGrowthRemainder: 0,
    colonies: {},
    colonyGrowthRemainders: {},
    events: ["Mission signal: Cobalt is 66% restored. Three machines can move it from thin air toward a safe habitat."],
  };
}

const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const boundedInteger = (value: unknown, fallback: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(finiteNumber(value, fallback))));

export function advanceSpaceWorld(state: SpaceState, elapsedWorldMinutes: number): void {
  if (!Number.isFinite(elapsedWorldMinutes) || elapsedWorldMinutes <= 0) return;
  const hours = elapsedWorldMinutes / 60;

  for (const planet of WORLD_PLANETS) {
    const machines = state.deployedEquipment[planet.name] || 0;
    const operators = state.colonies[planet.name]?.operators || 0;
    if (machines > 0 && (state.planetProgress[planet.name] || 0) < 100) {
      // Preserve the prototype's visible pace while tying it to simulation time: 3.3% per simulated hour per machine.
      const previousProgress = state.planetProgress[planet.name] || 0;
      const previousStage = habitatStage(previousProgress);
      const rate = machines + operators * 0.18;
      const nextProgress = Math.min(100, previousProgress + hours * 3.3 * rate);
      state.planetProgress[planet.name] = nextProgress;
      const nextStage = habitatStage(nextProgress);
      if (nextStage.index > previousStage.index) {
        state.events.unshift(planet.name + " has entered " + nextStage.label + " conditions. " + (nextProgress >= 80 ? "Safe settlement capacity: " + habitatCapacity(nextProgress) + " people." : "More restoration is needed before people can settle safely."));
        state.events = state.events.slice(0, 6);
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
    const previousRemainder = state.colonyGrowthRemainders[planet.name] || 0;
    if (colony.population < capacity) {
      let remainder = previousRemainder + colony.population * (0.018 + colony.operators * 0.0005) * hours;
      while (remainder >= 1 && colony.population < capacity) {
        colony.population += 1;
        remainder -= 1;
      }
      state.colonyGrowthRemainders[planet.name] = colony.population >= capacity ? 0 : remainder;
    } else {
      state.colonyGrowthRemainders[planet.name] = 0;
    }
    if (!colony.independent && colony.population >= 18 && state.worldTimeMinutes - colony.foundedAtWorldMinutes >= 7 * 1440) {
      colony.independent = true;
      state.events.unshift(`${planet.name} has become self-governing, founded by people from Haven.`);
      state.events = state.events.slice(0, 6);
    }
  }
}

export function restoreSpaceState(value: unknown, now = Date.now()): SpaceState {
  const initial = createInitialSpaceState(now);
  if (!value || typeof value !== "object") return initial;
  const saved = value as Partial<SpaceState>;
  if (saved.version !== 1) return initial;

  const state: SpaceState = {
    ...initial,
    nearbyTarget: typeof saved.nearbyTarget === "string" ? saved.nearbyTarget : null,
    cargoPeople: boundedInteger(saved.cargoPeople, 0, 0, 6),
    cargoEquipment: boundedInteger(saved.cargoEquipment, 0, 0, 4),
    visitedPlanets: Array.isArray(saved.visitedPlanets) ? saved.visitedPlanets.filter((name): name is string => typeof name === "string" && WORLD_PLANETS.some((planet) => planet.name === name)) : [],
    travelNotes: Array.isArray(saved.travelNotes) ? saved.travelNotes.filter((note): note is string => typeof note === "string").slice(0, 8) : [],
    acclaim: boundedInteger(saved.acclaim, 0, 0, 1000000),
    asteroidsShot: boundedInteger(saved.asteroidsShot, 0, 0, 1000000),
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
        state.colonies[planet.name] = {
          population,
          founders: boundedInteger(colony.founders, population, 0, 60),
          operators: boundedInteger(colony.operators, Math.max(1, Math.floor(population / 4)), 1, population),
          foundedAtWorldMinutes: Math.max(0, finiteNumber(colony.foundedAtWorldMinutes, 0)),
          independent: Boolean(colony.independent),
        };
      }
    }
    const remainders = saved.colonyGrowthRemainders as Record<string, unknown> | undefined;
    state.colonyGrowthRemainders[planet.name] = Math.max(0, Math.min(0.999999, finiteNumber(remainders?.[planet.name], 0)));
  }

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
  // Make the first guided investment produce a readable stage change: Cobalt begins at thin-air (66%), so restoration visibly crosses into habitable conditions. This is a suggestion, not a lock; other planets remain interactable.
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
        detail: candidate.name + " is " + Math.round(progress) + "% restored and needs " + needMachines + " machines before a settlement can be founded. Choose an exact load quantity, then deliver it.",
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
