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
    if (surveyed.some(record => /water|ice/i.test(record.resources)) && planet.name === "Frost") score += 2.4;
    if (surveyed.some(record => /copper|silicate|mineral|metal/i.test(record.resources)) && planet.name === "Aster") score += 1.8;
    if (surveyed.some(record => record.meteorExposure === "safe") && planet.name === "Cobalt") score += 1.2;
    if (surveyed.some(record => record.classification === "naturally-habitable") && planet.name === "Verdant") score += .8;
    if (surveyed.some(record => /iron|ore|metal/i.test(record.resources)) && planet.name === "Ember") score += 1.2;
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
  const delta = stance === "industry" ? -1 : 1;
  state.havenCouncilPosition = stance;
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
  const preferred = state.havenCouncilPosition === "care" ? "Cobalt" : state.havenCouncilPosition === "science" ? "Verdant" : state.havenCouncilPosition === "industry" ? "Aster" : read.recommendation;
  const chosen = WORLD_PLANETS.some(planet => planet.name === preferred) ? preferred : "Cobalt";
  state.havenSettlementWorld = chosen;
  recordSpaceChronicle(state, "society", "GGL Haven", "Haven ratified its first settlement destination", "After reviewing " + read.reportedCount + " verified field report(s), the founding networks committed to " + chosen + ". The pilot council influence was " + support + ".");
  state.events.unshift("HAVEN DECISION: " + chosen + " is the first settlement destination. The pilot can coordinate finite machinery and founding crew.");
  state.events = state.events.slice(0, 6);
  return chosen;
}

export type ColonySituation = { world: string; title: string; detail: string; need: string; urgency: number; identity: string; production: string; customs: string[] };

export function readColonySituation(state: SpaceState): ColonySituation | null {
  const candidates = Object.entries(state.colonies || {}).map(([world, colony]) => {
    const residents = (state.population?.people || []).filter(person => person.alive && person.location === ("planet:" + world));
    if (!residents.length) return null;
    const keys = ["air", "food", "water", "shelter", "health", "safety", "belonging", "purpose", "autonomy", "learning"] as const;
    const needs = keys.map(key => ({ key, value: residents.reduce((sum, person) => sum + person.needs[key], 0) / residents.length })).sort((a,b) => a.value - b.value);
    const weakest = needs[0];
    const ecology = state.ecology?.[world];
    const urgency = 100 - weakest.value;
    const title = weakest.value < 48 ? "Residents need immediate support" : ecology && ecology.maintenanceLoad > 72 ? "Local infrastructure needs maintenance" : "A new local priority is emerging";
    const detail = weakest.value < 48
      ? "The residents' average " + weakest.key + " need is " + Math.round(weakest.value) + "%. Their wellbeing is deteriorating; the pilot should return with practical support."
      : ecology && ecology.maintenanceLoad > 72
        ? "Maintenance load has reached " + Math.round(ecology.maintenanceLoad) + "%. Local operators need materials and time before further expansion."
        : "Residents are developing their own priorities, customs and production focus. A visit can strengthen the relationship with Haven.";
    return { world, title, detail, need: weakest.key, urgency, identity: colony.collectiveIdentity || "A new frontier community", production: colony.productionFocus || "Local production and repair", customs: colony.customs || [] };
  }).filter((item): item is ColonySituation => Boolean(item));
  return candidates.sort((a,b) => b.urgency - a.urgency)[0] || null;
}
export type ColonyConversationResult = { ok: boolean; message: string };

export function engageColonyCouncil(state: SpaceState, world: string, approach: "support" | "autonomy" | "logistics"): ColonyConversationResult {
  const colony = state.colonies?.[world];
  if (!colony) return { ok: false, message: "There is no established local council to contact here." };
  const residents = (state.population?.people || []).filter(person => person.alive && person.location === ("planet:" + world));
  if (!residents.length) return { ok: false, message: "No residents are available for a local council conversation." };
  let message = "";
  if (approach === "support") {
    if ((state.cargoMaterials || 0) < 1) return { ok: false, message: "Practical support requires one raw material unit in ship cargo." };
    state.cargoMaterials = (state.cargoMaterials || 0) - 1;
    const keys = ["air", "food", "water", "shelter", "health", "safety", "belonging", "purpose", "autonomy", "learning"] as const;
    const weakest = keys.map(key => ({ key, value: residents.reduce((sum, person) => sum + person.needs[key], 0) / residents.length })).sort((a,b) => a.value - b.value)[0];
    for (const person of residents) person.needs[weakest.key] = Math.min(100, person.needs[weakest.key] + 9);
    colony.trustWithHaven = Math.min(100, colony.trustWithHaven + 5);
    message = "You delivered one material unit and the local residents prioritised " + weakest.key + " support. Their average need improved and trust in Haven increased.";
  } else if (approach === "autonomy") {
    colony.autonomy = Math.min(100, colony.autonomy + 7);
    colony.trustWithHaven = Math.min(100, colony.trustWithHaven + 1);
    message = "You recognised the settlement's right to shape its own decisions. Local autonomy increased; the council will remember that Haven listened.";
  } else {
    if ((state.cargoMaterials || 0) < 1) return { ok: false, message: "A logistics agreement requires one raw material unit in ship cargo." };
    state.cargoMaterials = (state.cargoMaterials || 0) - 1;
    const ecology = state.ecology?.[world];
    if (ecology) ecology.maintenanceLoad = Math.max(0, ecology.maintenanceLoad - 9);
    colony.trustWithHaven = Math.min(100, colony.trustWithHaven + 4);
    colony.lastContactWorldMinutes = state.worldTimeMinutes;
    message = "You coordinated a maintenance delivery with local operators. One material unit was consumed, maintenance pressure eased and the Haven relationship strengthened.";
  }
  colony.lastContactWorldMinutes = state.worldTimeMinutes;
  recordSpaceChronicle(state, "society", world, "Pilot held a local council conversation", message);
  state.events.unshift(world + " council: " + message);
  state.events = state.events.slice(0, 6);
  return { ok: true, message };
}

