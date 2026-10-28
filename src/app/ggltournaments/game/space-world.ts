export type SpaceTarget = { id: string; label: string; kind: "station" | "planet" | "moon" | "pod"; position: [number, number, number]; radius: number; description: string };
export const SPACE_TARGETS: SpaceTarget[] = [
  { id: "station", label: "GGL Haven", kind: "station", position: [0, 24, -118], radius: 15, description: "Population preservation hub and docking port" },
  { id: "verdant", label: "Verdant", kind: "planet", position: [0, 0, -310], radius: 43, description: "Ocean world · scan for biosignatures and land carefully" },
  { id: "azure", label: "Azure Reach", kind: "planet", position: [190, 58, -535], radius: 55, description: "Blue super-world · survey the water traces" },
  { id: "ember", label: "Ember Moon", kind: "moon", position: [-170, -28, -390], radius: 24, description: "Rocky moon · scout a safe landing shelf" },
  { id: "pod-1", label: "Life pod 01", kind: "pod", position: [20, 7, -76], radius: 3, description: "Distress beacon · recover this life pod" },
  { id: "pod-2", label: "Life pod 02", kind: "pod", position: [-42, 16, -188], radius: 3, description: "Distress beacon · recover this life pod" },
  { id: "pod-3", label: "Life pod 03", kind: "pod", position: [76, 5, -255], radius: 3, description: "Distress beacon · recover this life pod" },
];
