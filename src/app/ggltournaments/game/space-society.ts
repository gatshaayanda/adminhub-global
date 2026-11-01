import type { SpaceState } from "./space-civilisation";

export type HavenCollectiveRead = {
  identity: string;
  tension: string;
  priorities: string[];
  recommendation: string;
  rationale: string;
  voices: { name: string; position: string; influence: number }[];
  opportunities: { title: string; detail: string; target: string }[];
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/** A deterministic read of the actual Haven population, not a random personality roll. */
export function readHavenCollective(state: SpaceState): HavenCollectiveRead {
  const population = state.population;
  const networks = (population?.foundingNetworks || []).slice().sort((a, b) => b.influence - a.influence);
  const people = (population?.people || []).filter(person => person.alive && person.location === "haven");
  const avg = (key: "curiosity" | "cooperation" | "ambition" | "resilience" | "autonomy") =>
    people.length ? people.reduce((sum, person) => sum + person.traits[key], 0) / people.length : 50;
  const science = people.filter(person => person.motivation === "science" || person.motivation === "exploration").length;
  const refuge = people.filter(person => person.motivation === "refuge" || person.motivation === "family").length;
  const autonomy = avg("autonomy");
  const solidarity = avg("cooperation");
  const curiosity = avg("curiosity");
  const identity = curiosity > 58 && solidarity > 54
    ? "A curious, mutually dependent frontier society"
    : autonomy > 58 && solidarity < 48
      ? "An independent-minded society still negotiating its common purpose"
      : solidarity > 58
        ? "A care-led society shaped by shared survival"
        : "A plural society whose common identity is still being negotiated";
  const tension = autonomy > solidarity + 8
    ? "People want a meaningful say over their own future, while others argue that shared risk requires coordinated decisions."
    : refuge > science
      ? "Families and people seeking safety are wary of a settlement plan that puts discovery ahead of dependable shelter."
      : science > people.length * .28
        ? "Research-minded residents want stronger evidence before committing scarce people and machinery."
        : "Residents disagree about how much risk is acceptable and who should carry the cost of the first settlement.";
  const priorities = [
    ...(refuge > people.length * .2 ? ["Reliable shelter and safety for families"] : []),
    ...(science > people.length * .18 ? ["Evidence-led research and ecological caution"] : []),
    ...(curiosity > 52 ? ["Exploration and access to new knowledge"] : []),
    ...(solidarity > 52 ? ["Fair sharing of risk, supplies and opportunity"] : []),
    ...(autonomy > 52 ? ["Local choice and limits on central control"] : []),
  ].slice(0, 4);
  const surveyed = Object.values(state.surveyRecords || {});
  const candidates = [
    { name: "Cobalt", score: 0, why: "A lower machinery threshold makes it a practical restoration candidate, but it is not yet habitable." },
    { name: "Verdant", score: 0, why: "A living but reactive ecology offers research value and demands restraint." },
    { name: "Aster", score: 0, why: "Mineral shelves and subsurface voids could support industry after further study." },
    { name: "Frost", score: 0, why: "Water-bearing deposits may support long-term life-support systems, with substantial atmospheric work." },
    { name: "Ember", score: 0, why: "Industrial potential is high, but heat and radiation make it a long-horizon choice." },
  ];
  for (const c of candidates) {
    if (c.name === "Cobalt") c.score += 2 + (refuge > science ? 1 : 0);
    if (c.name === "Verdant") c.score += (science > 0 ? 2 : 0) + (curiosity > 55 ? 1 : 0);
    if (c.name === "Aster") c.score += (people.some(p => p.skills.engineering > 24) ? 2 : 0);
    if (c.name === "Frost") c.score += (people.some(p => p.skills.medicine > 24) ? 2 : 0);
    if (c.name === "Ember") c.score += (people.some(p => p.skills.engineering > 32) ? 1 : 0);
  }
  const surveyIntel = surveyed.map(record => ({
    name: record.revealedName,
    score: (record.classification === "naturally-habitable" ? 8 : record.classification === "near-zero-unsafe" ? 3 : 1)
      + (record.meteorExposure === "safe" ? 2 : 0)
      + (/water|ice/i.test(record.resources) ? 2 : 0)
      + (/breathable/i.test(record.atmosphere) ? 2 : 0),
    why: record.revealedName + " has verified survey data: " + record.atmosphere + "; " + record.resources + "."
  }));
  const bestCore = candidates.slice().sort((a, b) => b.score - a.score)[0];
  const bestSurvey = surveyIntel.sort((a, b) => b.score - a.score)[0];
  const recommendation = bestSurvey && bestSurvey.score > bestCore.score ? bestSurvey.name : bestCore.name;
  const rationale = bestSurvey && bestSurvey.score > bestCore.score
    ? bestSurvey.why + " The population wants this evidence reviewed before committing the founding crew."
    : bestCore.why + " This is a provisional recommendation, not an automatic settlement order.";
  const voices = networks.slice(0, 3).map(network => ({
    name: network.name,
    position: network.agenda + " " + network.pressurePoint,
    influence: clamp(network.influence),
  }));
  const opportunities: HavenCollectiveRead["opportunities"] = [];
  const undiscovered = (state.discoveredWorlds || []).length;
  if (undiscovered < 15) opportunities.push({ title: "Survey another unknown world", detail: "Bring Haven verified atmosphere, resource and hazard readings before the settlement debate advances.", target: "Deep-space survey" });
  if (surveyed.length) opportunities.push({ title: "Present the latest survey evidence", detail: "Haven's networks can weigh the recorded findings against their priorities. The recommendation changes as evidence and population needs change.", target: bestSurvey?.name || "Haven" });
  if (state.machineInventory < 3) opportunities.push({ title: "Secure restoration capacity", detail: "The first settlement will consume finite machinery. Recover modules or develop Haven's material supply before promising a launch.", target: "GGL Haven" });
  if (state.havenPopulation > 0) opportunities.push({ title: "Listen to the founding households", detail: "People with different motivations, skills and relationships will not all support the same destination or risk.", target: "GGL Haven" });
  return {
    identity,
    tension,
    priorities: priorities.length ? priorities : ["Safety, belonging and a shared future"],
    recommendation,
    rationale,
    voices,
    opportunities,
  };
}
