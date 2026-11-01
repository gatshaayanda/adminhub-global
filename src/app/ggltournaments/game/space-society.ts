import { recordSpaceChronicle, WORLD_PLANETS, type SpaceState } from "./space-civilisation";

export type HavenCollectiveRead = {
  identity: string;
  tension: string;
  priorities: string[];
  recommendation: string;
  rationale: string;
  voices: { name: string; position: string; influence: number }[];
  opportunities: { title: string; detail: string; target: string }[];
  reportedCount: number;
  ratifiedWorld: string | null;
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
  const reportedIds = new Set(state.reportedSurveyWorlds || []);
  const surveyed = Object.values(state.surveyRecords || {}).filter(record => reportedIds.has(record.worldId));
  const candidates = WORLD_PLANETS.map(planet => {
    const ecology = state.ecology?.[planet.name];
    let score = 0;
    if (planet.name === "Cobalt") score += refuge > science ? 3 : 1;
    if (planet.name === "Verdant") score += science * .08 + curiosity * .025 + (ecology ? ecology.biodiversity * .025 : 0);
    if (planet.name === "Aster") score += people.reduce((sum, person) => sum + person.skills.engineering, 0) / Math.max(1, people.length) * .06;
    if (planet.name === "Frost") score += people.reduce((sum, person) => sum + person.skills.medicine + person.skills.logistics, 0) / Math.max(1, people.length) * .035;
    if (planet.name === "Ember") score += people.reduce((sum, person) => sum + person.skills.engineering, 0) / Math.max(1, people.length) * .04;
    score += solidarity * .012 - autonomy * .004 - planet.colonyMachineRequirement * .35;
    const character = planet.name === "Verdant" ? "Its reactive biosphere calls for ecological caution." : planet.name === "Frost" ? "Its buried water may support future life-support systems." : planet.name === "Ember" ? "Its heat and radiation demand a long-horizon industrial plan." : planet.name === "Aster" ? "Its mineral shelves favour engineering and materials work." : "Its lower machinery threshold makes it a practical early restoration candidate.";
    return { name: planet.name, score, why: planet.name + " requires " + planet.colonyMachineRequirement + " machines. " + character };
  });
  const bestCore = candidates.slice().sort((a, b) => b.score - a.score)[0];
  const recommendation = bestCore.name;
  const rationale = bestCore.why + (surveyed.length ? " The council has received " + surveyed.length + " verified field report(s), including " + surveyed.map(record => record.revealedName).slice(0, 3).join(", ") + ". The evidence informs its caution and priorities." : " No field reports have yet been presented. The council view remains provisional until the pilot returns with evidence.");
  const voices = networks.slice(0, 3).map(network => ({
    name: network.name,
    position: network.agenda + " " + network.pressurePoint,
    influence: clamp(network.influence),
  }));
  const opportunities: HavenCollectiveRead["opportunities"] = [];
  const undiscovered = (state.discoveredWorlds || []).length;
  if (undiscovered < 15) opportunities.push({ title: "Survey another unknown world", detail: "Bring Haven verified atmosphere, resource and hazard readings before the settlement debate advances.", target: "Deep-space survey" });
  if ((state.pendingSurveyReports || []).length) opportunities.push({ title: "Return and present field reports", detail: "Survey data is aboard the ship. Dock at Haven so the founding networks can examine the evidence.", target: "GGL Haven" });
  else if (surveyed.length) opportunities.push({ title: "Deliberate on the first settlement", detail: "The founding networks have received the field reports. Their provisional recommendation can now be ratified or challenged.", target: "GGL Haven" });
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
    reportedCount: surveyed.length,
    ratifiedWorld: state.havenSettlementWorld || null,
  };
}

/** Player arguments change the council balance; they never bypass evidence or commit a settlement. */
export function influenceHavenCouncil(state: SpaceState, stance: "care" | "science" | "industry"): boolean {
  if (!(state.reportedSurveyWorlds || []).length || state.havenSettlementWorld) return false;
  const delta = stance === "care" ? 1 : stance === "industry" ? -1 : 0;
  state.havenCouncilSupport = Math.max(-3, Math.min(3, (state.havenCouncilSupport || 0) + delta));
  const message = stance === "care" ? "The pilot argued that the first settlement must protect families and preserve a reliable reserve." : stance === "industry" ? "The pilot argued for a destination where engineering and production can build long-term independence." : "The pilot asked the council to keep its decision grounded in survey evidence and scientific uncertainty.";
  recordSpaceChronicle(state, "society", "GGL Haven", "Pilot addressed the founding networks", message + " Council balance: " + state.havenCouncilSupport + ".");
  state.events.unshift("HAVEN COUNCIL: " + message);
  state.events = state.events.slice(0, 6);
  return true;
}

/** Ratification is an explicit Haven act and only follows a completed field debrief. */
export function ratifyHavenSettlement(state: SpaceState): string | null {
  if (!(state.reportedSurveyWorlds || []).length || state.havenSettlementWorld) return null;
  const read = readHavenCollective(state);
  const support = state.havenCouncilSupport || 0;
  const preferred = support >= 2 ? "Verdant" : support <= -2 ? "Aster" : read.recommendation;
  const chosen = WORLD_PLANETS.some(planet => planet.name === preferred) ? preferred : "Cobalt";
  state.havenSettlementWorld = chosen;
  recordSpaceChronicle(state, "society", "GGL Haven", "Haven ratified its first settlement destination", "After reviewing " + read.reportedCount + " verified field report(s), the founding networks committed to " + chosen + ". The pilot council influence was " + support + ".");
  state.events.unshift("HAVEN DECISION: " + chosen + " is the first settlement destination. The pilot can coordinate finite machinery and founding crew.");
  state.events = state.events.slice(0, 6);
  return chosen;
}
