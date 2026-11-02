export type PlanetEcology = {
  temperatureC: number;
  pressureKpa: number;
  accessibleWater: number;
  radiation: number;
  contamination: number;
  biodiversity: number;
  energyPotential: number;
  foodProduction: number;
  resourceType: string;
  resourceStock: number;
  extractedResource: number;
  maintenanceLoad: number;
  fabricationProgress: number;
  manufacturedModules: number;
};
export type PlanetEcologyMap = Record<string, PlanetEcology>;

const PROFILES: Record<string, Omit<PlanetEcology, "extractedResource" | "maintenanceLoad" | "fabricationProgress" | "manufacturedModules">> = {
  Ember: { temperatureC: 210, pressureKpa: 8, accessibleWater: 5, radiation: 82, contamination: 74, biodiversity: 0, energyPotential: 78, foodProduction: 0, resourceType: "iron ore", resourceStock: 88 },
  Frost: { temperatureC: -145, pressureKpa: 12, accessibleWater: 82, radiation: 42, contamination: 18, biodiversity: 0, energyPotential: 24, foodProduction: 0, resourceType: "water ice", resourceStock: 76 },
  Aster: { temperatureC: -58, pressureKpa: 24, accessibleWater: 18, radiation: 68, contamination: 52, biodiversity: 1, energyPotential: 51, foodProduction: 0, resourceType: "silicate", resourceStock: 62 },
  Cobalt: { temperatureC: -18, pressureKpa: 48, accessibleWater: 58, radiation: 44, contamination: 34, biodiversity: 8, energyPotential: 69, foodProduction: 2, resourceType: "copper", resourceStock: 70 },
  Verdant: { temperatureC: 17, pressureKpa: 76, accessibleWater: 78, radiation: 22, contamination: 48, biodiversity: 36, energyPotential: 55, foodProduction: 22, resourceType: "rare crystal", resourceStock: 34 },
  "signal-06": { temperatureC: -42, pressureKpa: 3, accessibleWater: 8, radiation: 38, contamination: 24, biodiversity: 0, energyPotential: 42, foodProduction: 0, resourceType: "nickel silicate", resourceStock: 58 },
  "signal-07": { temperatureC: -72, pressureKpa: 0, accessibleWater: 2, radiation: 24, contamination: 12, biodiversity: 0, energyPotential: 36, foodProduction: 0, resourceType: "rare earth alloy", resourceStock: 74 },
  "signal-08": { temperatureC: 6, pressureKpa: 91, accessibleWater: 88, radiation: 18, contamination: 8, biodiversity: 76, energyPotential: 22, foodProduction: 42, resourceType: "bioluminescent biomass", resourceStock: 46 },
  "signal-09": { temperatureC: 184, pressureKpa: 6, accessibleWater: 1, radiation: 72, contamination: 86, biodiversity: 0, energyPotential: 92, foodProduction: 0, resourceType: "geothermal iron", resourceStock: 82 },
  "signal-10": { temperatureC: -118, pressureKpa: 14, accessibleWater: 64, radiation: 32, contamination: 16, biodiversity: 0, energyPotential: 18, foodProduction: 0, resourceType: "ammonia ice", resourceStock: 68 },
  "signal-11": { temperatureC: -24, pressureKpa: 19, accessibleWater: 12, radiation: 96, contamination: 22, biodiversity: 0, energyPotential: 31, foodProduction: 0, resourceType: "cobalt glass", resourceStock: 54 },
  "signal-12": { temperatureC: 34, pressureKpa: 42, accessibleWater: 0, radiation: 88, contamination: 78, biodiversity: 0, energyPotential: 48, foodProduction: 0, resourceType: "silica crystal", resourceStock: 77 },
  "signal-13": { temperatureC: 0, pressureKpa: 0, accessibleWater: 0, radiation: 50, contamination: 50, biodiversity: 0, energyPotential: 50, foodProduction: 0, resourceType: "anomalous matter", resourceStock: 12 },
  "signal-14": { temperatureC: 246, pressureKpa: 4, accessibleWater: 0, radiation: 64, contamination: 92, biodiversity: 0, energyPotential: 98, foodProduction: 0, resourceType: "volcanic iron glass", resourceStock: 86 },
  "signal-15": { temperatureC: -166, pressureKpa: 8, accessibleWater: 92, radiation: 28, contamination: 10, biodiversity: 0, energyPotential: 12, foodProduction: 0, resourceType: "subsurface ice salts", resourceStock: 73 },
  "signal-16": { temperatureC: -8, pressureKpa: 68, accessibleWater: 44, radiation: 38, contamination: 48, biodiversity: 2, energyPotential: 39, foodProduction: 0, resourceType: "carbon waterstone", resourceStock: 49 },
  "signal-17": { temperatureC: -36, pressureKpa: 28, accessibleWater: 16, radiation: 26, contamination: 35, biodiversity: 0, energyPotential: 58, foodProduction: 0, resourceType: "aluminium silicate", resourceStock: 62 },
  "signal-18": { temperatureC: 12, pressureKpa: 0, accessibleWater: 0, radiation: 34, contamination: 18, biodiversity: 0, energyPotential: 46, foodProduction: 0, resourceType: "conductive iron nickel", resourceStock: 88 },
  "signal-19": { temperatureC: 4, pressureKpa: 82, accessibleWater: 26, radiation: 30, contamination: 62, biodiversity: 1, energyPotential: 44, foodProduction: 0, resourceType: "catalytic nitrogen mineral", resourceStock: 57 },
  "signal-20": { temperatureC: -2, pressureKpa: 74, accessibleWater: 96, radiation: 22, contamination: 14, biodiversity: 68, energyPotential: 16, foodProduction: 8, resourceType: "armoured bio-mineral", resourceStock: 31 },
};
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export function createPlanetEcology(): PlanetEcologyMap {
  return Object.fromEntries(Object.entries(PROFILES).map(([name, profile]) => [name, {
    ...profile, extractedResource: 0, maintenanceLoad: 0, fabricationProgress: 0, manufacturedModules: 0,
  }]));
}

export function restorePlanetEcology(value: unknown): PlanetEcologyMap {
  const defaults = createPlanetEcology();
  if (!value || typeof value !== "object") return defaults;
  const saved = value as Record<string, unknown>;
  for (const [name, profile] of Object.entries(defaults)) {
    const raw = saved[name];
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<PlanetEcology>;
    const keys: Array<keyof PlanetEcology> = ["temperatureC","pressureKpa","accessibleWater","radiation","contamination","biodiversity","energyPotential","foodProduction","resourceStock","extractedResource","maintenanceLoad","fabricationProgress","manufacturedModules"];
    for (const key of keys) {
      const numeric = item[key];
      if (typeof numeric === "number" && Number.isFinite(numeric)) Object.assign(profile, { [key]: numeric });
    }
    if (typeof item.resourceType === "string") profile.resourceType = item.resourceType.slice(0, 40);
    profile.pressureKpa = clamp(profile.pressureKpa, 0, 150);
    profile.accessibleWater = clamp(profile.accessibleWater);
    profile.radiation = clamp(profile.radiation);
    profile.contamination = clamp(profile.contamination);
    profile.biodiversity = clamp(profile.biodiversity);
    profile.energyPotential = clamp(profile.energyPotential);
    profile.foodProduction = clamp(profile.foodProduction);
    profile.resourceStock = clamp(profile.resourceStock);
    profile.extractedResource = clamp(profile.extractedResource, 0, 100000);
    profile.maintenanceLoad = clamp(profile.maintenanceLoad);
    profile.fabricationProgress = clamp(profile.fabricationProgress);
    profile.manufacturedModules = Math.max(0, Math.min(10000, Math.floor(profile.manufacturedModules)));
  }
  return defaults;
}

export function advancePlanetEcology(
  ecology: PlanetEcologyMap,
  elapsedWorldMinutes: number,
  machinesByPlanet: Record<string, number>,
  operatorsByPlanet: Record<string, number>,
): void {
  if (!Number.isFinite(elapsedWorldMinutes) || elapsedWorldMinutes <= 0) return;
  const hours = Math.min(24 * 7, elapsedWorldMinutes / 60);
  for (const [name, planet] of Object.entries(ecology)) {
    const machines = Math.max(0, machinesByPlanet[name] || 0);
    const operators = Math.max(0, operatorsByPlanet[name] || 0);
    if (machines <= 0) continue;
    const effort = machines * (1 + Math.min(operators, 8) * .12);
    const reliability = planet.maintenanceLoad >= 85 ? .35 : planet.maintenanceLoad >= 65 ? .65 : 1;
    const rate = hours * effort * .018 * reliability;
    planet.energyPotential = clamp(planet.energyPotential + rate * .7);
    planet.accessibleWater = clamp(planet.accessibleWater + rate * (name === "Frost" ? 1.5 : .55));
    planet.temperatureC += (15 - planet.temperatureC) * Math.min(.02, rate * .0018);
    planet.pressureKpa = Math.min(100, planet.pressureKpa + rate * .035);
    planet.radiation = clamp(planet.radiation - rate * .28);
    planet.contamination = clamp(planet.contamination - rate * .22);
    if (planet.accessibleWater > 28 && planet.contamination < 60 && planet.pressureKpa > 35) {
      planet.biodiversity = clamp(planet.biodiversity + rate * .24);
    }
    if (planet.biodiversity > 18 && planet.accessibleWater > 35) {
      planet.foodProduction = clamp(planet.foodProduction + rate * .16);
    }
    const extraction = Math.min(planet.resourceStock, hours * effort * .012);
    planet.resourceStock = clamp(planet.resourceStock - extraction);
    planet.extractedResource += extraction;
    planet.maintenanceLoad = clamp(planet.maintenanceLoad + hours * machines * .018 - hours * operators * .026);
    if (operators > 0 && planet.resourceStock >= 18 && planet.energyPotential >= 25 && planet.maintenanceLoad < 75) {
      planet.fabricationProgress += hours * Math.min(operators, 6) * .035;
      if (planet.fabricationProgress >= 100) {
        planet.fabricationProgress -= 100;
        planet.resourceStock = clamp(planet.resourceStock - 18);
        planet.energyPotential = clamp(planet.energyPotential - 8);
        planet.manufacturedModules += 1;
      }
    }
  }
}
