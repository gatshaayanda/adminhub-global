export type PopulationLocation = "haven" | "ship" | `planet:${string}`;
export type PersonLifeStage = "young" | "adult" | "elder";
export type PersonMotivation = "exploration" | "refuge" | "autonomy" | "science" | "family" | "service" | "opportunity" | "recognition";
export type PersonNeeds = {
  air: number; food: number; water: number; shelter: number; health: number; safety: number;
  belonging: number; purpose: number; autonomy: number; learning: number;
};
export type PersonSkills = { engineering: number; medicine: number; ecology: number; logistics: number; science: number; leadership: number; mediation: number; navigation: number };
export type SpacePerson = {
  id: string; name: string; ageYears: number; lifeStage: PersonLifeStage; location: PopulationLocation;
  householdId: string; motivation: PersonMotivation;
  traits: { curiosity: number; cooperation: number; ambition: number; resilience: number; autonomy: number };
  needs: PersonNeeds; skills: PersonSkills; health: number; alive: boolean;
  bornAtWorldMinutes: number; lastWarningAtWorldMinutes: number;
};
export type PersonRelationship = { id: string; personA: string; personB: string; kind: "kin" | "partner" | "friend" | "rival"; trust: number; affinity: number; lastChangedAtWorldMinutes: number };
export type SpaceHousehold = { id: string; memberIds: string[]; location: PopulationLocation; cohesion: number; lastBirthAtWorldMinutes: number };
import { buildFoundingProfile, DEFAULT_FOUNDING_IDS, deriveFoundingNetworks, type FoundingNetwork, type FoundingProfile } from "./space-founding";
export type { FoundingNetwork, FoundingProfile } from "./space-founding";
export type PopulationState = { version: 1; seed: number; lastUpdatedWorldMinutes: number; people: SpacePerson[]; relationships: PersonRelationship[]; households: SpaceHousehold[]; foundingNetworks: FoundingNetwork[]; foundingProfile: FoundingProfile };

const FIRST_NAMES = ["Ari","Bela","Cato","Dara","Eli","Fara","Galen","Hana","Imani","Jalen","Kesi","Luma","Miro","Nia","Oren","Pela","Quin","Rhea","Sami","Tala","Uma","Vero","Wren","Xavi","Yara","Zuri"];
const LAST_NAMES = ["Amani","Bako","Cedar","Dube","Ekon","Fenn","Gale","Hale","Ives","Juma","Kade","Lerato","Masego","Ndlovu","Osei","Pike","Quill","Radebe","Sato","Tebogo","Udo","Vale","Wekesa","Xaba","Yeboah","Zulu"];
const MOTIVATIONS: PersonMotivation[] = ["exploration","refuge","autonomy","science","family","service","opportunity","recognition"];
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const hash = (seed: number, index: number, salt: number) => {
  let x = (seed ^ Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt + 7, 0x27d4eb2d)) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
};
const unit = (seed: number, index: number, salt: number) => hash(seed, index, salt) / 0xffffffff;
const stage = (age: number): PersonLifeStage => age < 18 ? "young" : age >= 65 ? "elder" : "adult";
const initialNeeds = (): PersonNeeds => ({ air: 96, food: 88, water: 90, shelter: 92, health: 94, safety: 91, belonging: 68, purpose: 62, autonomy: 62, learning: 55 });
const initialSkills = (seed: number, index: number): PersonSkills => ({
  engineering: Math.round(unit(seed,index,1)*38), medicine: Math.round(unit(seed,index,2)*38),
  ecology: Math.round(unit(seed,index,3)*38), logistics: Math.round(unit(seed,index,4)*38),
  science: Math.round(unit(seed,index,5)*38), leadership: Math.round(unit(seed,index,6)*38),
  mediation: Math.round(unit(seed,index,7)*38), navigation: Math.round(unit(seed,index,8)*38),
});

export function createPopulationState(seed = 0x47474c, population = 60, worldMinute = 0, foundingIds: string[] = DEFAULT_FOUNDING_IDS): PopulationState {
  const count = Math.max(0, Math.min(10000, Math.floor(population)));
  const people: SpacePerson[] = [];
  const households: SpaceHousehold[] = [];
  for (let i = 0; i < count; i++) {
    const householdIndex = Math.floor(i / 3);
    const householdId = "household-" + String(householdIndex + 1).padStart(3, "0");
    const age = Math.round(5 + unit(seed,i,9)*70);
    const person: SpacePerson = {
      id: "haven-" + String(i + 1).padStart(3, "0"),
      name: FIRST_NAMES[hash(seed,i,10) % FIRST_NAMES.length] + " " + LAST_NAMES[hash(seed,i,11) % LAST_NAMES.length],
      ageYears: age, lifeStage: stage(age), location: "haven", householdId,
      motivation: MOTIVATIONS[hash(seed,i,12) % MOTIVATIONS.length],
      traits: {
        curiosity: Math.round(unit(seed,i,13)*100), cooperation: Math.round(unit(seed,i,14)*100),
        ambition: Math.round(unit(seed,i,15)*100), resilience: Math.round(unit(seed,i,16)*100),
        autonomy: Math.round(unit(seed,i,17)*100),
      },
      needs: initialNeeds(), skills: initialSkills(seed,i), health: 90 + Math.round(unit(seed,i,18)*10),
      alive: true, bornAtWorldMinutes: -age*525600, lastWarningAtWorldMinutes: -1,
    };
    people.push(person);
    let household = households[householdIndex];
    if (!household) { household = { id: householdId, memberIds: [], location: "haven", cohesion: 62 + Math.round(unit(seed,householdIndex,19)*25), lastBirthAtWorldMinutes: worldMinute }; households.push(household); }
    household.memberIds.push(person.id);
  }
  const relationships: PersonRelationship[] = [];
  for (const household of households) {
    for (let i = 0; i < household.memberIds.length; i++) {
      for (let j = i + 1; j < household.memberIds.length; j++) {
        const a = household.memberIds[i], b = household.memberIds[j];
        const index = relationships.length;
        const personA = people.find(person => person.id === a)!;
        const personB = people.find(person => person.id === b)!;
        const partnership = i === 0 && j === 1 && personA.ageYears >= 20 && personA.ageYears <= 45 && personB.ageYears >= 20 && personB.ageYears <= 45 && unit(seed,index,22) > .55;
        relationships.push({
          id: "rel-" + String(index + 1).padStart(4, "0"), personA: a, personB: b,
          kind: partnership ? "partner" : "kin", trust: 68 + Math.round(unit(seed,index,20)*25),
          affinity: 55 + Math.round(unit(seed,index,21)*40), lastChangedAtWorldMinutes: worldMinute,
        });
      }
    }
  }
  const foundingProfile = buildFoundingProfile(foundingIds, worldMinute || Date.now());
  const axes = foundingProfile.axes;
  const average = Math.max(1, foundingProfile.circumstanceIds.length);
  for (const person of people) {
    person.traits.cooperation = clamp(person.traits.cooperation + axes.solidarity * 5 / average);
    person.traits.autonomy = clamp(person.traits.autonomy + axes.autonomy * 5 / average);
    person.traits.ambition = clamp(person.traits.ambition + (axes.hierarchy + axes.extraction) * 3 / average);
    person.traits.curiosity = clamp(person.traits.curiosity + axes.knowledge * 5 / average);
    person.traits.resilience = clamp(person.traits.resilience + axes.trauma * 2 / average);
    person.needs.belonging = clamp(person.needs.belonging + axes.solidarity * 2 / average);
    person.needs.autonomy = clamp(person.needs.autonomy + axes.autonomy * 2 / average);
    if (unit(seed, Number(person.id.slice(-3)), 42) < .36) {
      const tendencies: Array<{ score: number; motivation: PersonMotivation }> = [
        { score: axes.solidarity, motivation: unit(seed, Number(person.id.slice(-3)), 43) > .5 ? "family" : "service" },
        { score: axes.autonomy, motivation: "autonomy" },
        { score: axes.hierarchy, motivation: "recognition" },
        { score: axes.extraction, motivation: "opportunity" },
        { score: axes.knowledge, motivation: unit(seed, Number(person.id.slice(-3)), 44) > .5 ? "science" : "exploration" },
        { score: axes.trauma, motivation: "refuge" },
      ].sort((a,b) => b.score - a.score);
      if (tendencies[0].score > 0) person.motivation = tendencies[0].motivation;
    }
  }
  for (const household of households) household.cohesion = clamp(household.cohesion + axes.solidarity * 2 / average - Math.max(0, -axes.trust) * 2 / average, 20, 98);
  for (const relationship of relationships) {
    relationship.trust = clamp(relationship.trust + axes.trust * 3 / average + axes.solidarity * 2 / average);
    relationship.affinity = clamp(relationship.affinity + axes.solidarity * 2 / average);
  }
  return { version: 1, seed, lastUpdatedWorldMinutes: worldMinute, people, relationships, households, foundingProfile, foundingNetworks: deriveFoundingNetworks(households, foundingProfile, seed) };
}

export function restorePopulationState(value: unknown, counts: { haven: number; ship: number; colonies: Record<string, number> }, worldMinute = 0): PopulationState {
  if (value && typeof value === "object") {
    const saved = value as Partial<PopulationState>;
    if (saved.version === 1 && Array.isArray(saved.people) && Array.isArray(saved.relationships) && Array.isArray(saved.households)) {
      const people = saved.people.filter((person): person is SpacePerson => Boolean(person && typeof person.id === "string" && typeof person.name === "string" && typeof person.ageYears === "number" && person.needs && person.skills && person.traits && typeof person.location === "string" && typeof person.alive === "boolean"));
      const known = new Set(people.map(person => person.id));
      const relationships = saved.relationships.filter(rel => rel && known.has(rel.personA) && known.has(rel.personB) && typeof rel.trust === "number" && typeof rel.affinity === "number").slice(0, 20000);
      const households = saved.households.filter(house => house && typeof house.id === "string" && Array.isArray(house.memberIds)).map(house => ({ ...house, memberIds: house.memberIds.filter(id => known.has(id)) })).slice(0, 5000);
      if (people.length) {
        const validHouseholds = new Set(households.map(household => household.id));
        const seed = Number.isFinite(saved.seed) ? Number(saved.seed) : 0x47474c;
        const savedProfile = saved.foundingProfile && Array.isArray(saved.foundingProfile.circumstanceIds) ? saved.foundingProfile : buildFoundingProfile(DEFAULT_FOUNDING_IDS, worldMinute);
        const savedNetworks = Array.isArray(saved.foundingNetworks) ? saved.foundingNetworks.filter(network => network && typeof network.id === "string" && typeof network.name === "string" && typeof network.agenda === "string" && typeof network.origin === "string" && typeof network.pressurePoint === "string" && Array.isArray(network.householdIds)).map(network => ({ ...network, householdIds: network.householdIds.filter(id => validHouseholds.has(id)), linkedNetworks: Array.isArray(network.linkedNetworks) ? network.linkedNetworks.filter(id => typeof id === "string") : [] })) : [];
        const foundingNetworks = savedNetworks.length ? savedNetworks : deriveFoundingNetworks(households, savedProfile, seed);
        return { version: 1, seed, lastUpdatedWorldMinutes: Number.isFinite(saved.lastUpdatedWorldMinutes) ? Number(saved.lastUpdatedWorldMinutes) : worldMinute, people, relationships, households, foundingProfile: savedProfile, foundingNetworks };
      }
    }
  }
  const total = Math.max(60, counts.haven + counts.ship + Object.values(counts.colonies).reduce((sum,n)=>sum+n,0));
  const state = createPopulationState(0x47474c, total, worldMinute);
  let cursor = 0;
  const assign = (location: PopulationLocation, amount: number) => {
    const safeAmount = Math.max(0, Math.floor(amount));
    for (let i = 0; i < safeAmount && cursor < state.people.length; i++, cursor++) state.people[cursor].location = location;
  };
  assign("haven", counts.haven);
  assign("ship", counts.ship);
  for (const [planet, amount] of Object.entries(counts.colonies)) assign(("planet:" + planet) as PopulationLocation, amount);
  for (; cursor < state.people.length; cursor++) state.people[cursor].alive = false;
  return state;
}

export function movePeople(population: PopulationState | undefined, from: PopulationLocation, to: PopulationLocation, count: number): number {
  if (!population || count <= 0) return 0;
  const movers = population.people.filter(person => person.alive && person.location === from).sort((a,b)=>a.id.localeCompare(b.id)).slice(0, Math.floor(count));
  for (const person of movers) person.location = to;
  for (const household of population.households) {
    const member = population.people.find(person => person.alive && person.householdId === household.id);
    if (member) household.location = member.location;
  }
  return movers.length;
}

export function advancePopulation(population: PopulationState | undefined, worldMinute: number, planetProgress: Record<string, number>, colonyPopulation: Record<string, number>, events: string[]): void {
  if (!population || worldMinute <= population.lastUpdatedWorldMinutes) return;
  const elapsed = Math.min(7 * 1440, worldMinute - population.lastUpdatedWorldMinutes);
  const days = elapsed / 1440;
  const environmentFor = (location: PopulationLocation) => {
    if (location === "haven") return { air: 98, safety: 94, food: 92, water: 93, shelter: 96, belonging: 70, purpose: 67, learning: 58 };
    if (location === "ship") return { air: 95, safety: 86, food: 78, water: 82, shelter: 76, belonging: 54, purpose: 75, learning: 60 };
    const planet = location.slice(7);
    const progress = planetProgress[planet] || 0;
    const populationCount = colonyPopulation[planet] || 0;
    const capacity = Math.max(1, 12 + Math.floor((progress - 80) * 1.6));
    const pressure = Math.max(0, populationCount / capacity - .78) * 48;
    const habitability = clamp(20 + (progress - 60) * 1.75, 20, 85);
    return { air: habitability - 3 - pressure, safety: habitability - pressure, food: habitability - pressure * .8, water: habitability - pressure * .65, shelter: habitability + 5 - pressure, belonging: 66 - pressure * .4, purpose: 68, learning: 52 + progress * .12 };
  };
  for (const person of population.people) {
    if (!person.alive) continue;
    const environment = environmentFor(person.location);
    person.ageYears += elapsed / 525600;
    person.lifeStage = stage(person.ageYears);
    const needs = person.needs;
    const materialKeys: Array<keyof PersonNeeds> = ["air","food","water","shelter","safety"];
    for (const key of materialKeys) needs[key] = clamp(needs[key] + (environment[key as keyof typeof environment] - needs[key]) * Math.min(.35, days * .12));
    needs.belonging = clamp(needs.belonging + (environment.belonging - needs.belonging) * Math.min(.2, days * .05));
    needs.purpose = clamp(needs.purpose + (environment.purpose - needs.purpose) * Math.min(.2, days * .04));
    needs.learning = clamp(needs.learning + (environment.learning - needs.learning) * Math.min(.2, days * .035));
    needs.autonomy = clamp(needs.autonomy + (person.traits.autonomy - needs.autonomy) * Math.min(.2, days * .025));
    const average = materialKeys.reduce((sum,key)=>sum+needs[key],0)/materialKeys.length;
    person.health = clamp(person.health + (average < 42 ? -days * .45 : average > 70 ? days * .025 : 0));
    needs.health = person.health;
    if (person.location === "ship") person.skills.navigation = clamp(person.skills.navigation + days * .008);
    else if (person.location === "haven") person.skills.logistics = clamp(person.skills.logistics + days * .004);
    else { person.skills.engineering = clamp(person.skills.engineering + days * .006); person.skills.ecology = clamp(person.skills.ecology + days * .004); }
    if (average < 32 && worldMinute - person.lastWarningAtWorldMinutes > 1440) {
      person.lastWarningAtWorldMinutes = worldMinute;
      events.unshift(person.name + " is experiencing unsafe living conditions at " + person.location.replace("planet:","") + ". Support is needed.");
    }
  }
  for (const relationship of population.relationships) {
    const a = population.people.find(person => person.id === relationship.personA);
    const b = population.people.find(person => person.id === relationship.personB);
    if (!a || !b || !a.alive || !b.alive) continue;
    if (a.location === b.location) {
      const wellbeing = (a.needs.belonging + b.needs.belonging + a.health + b.health) / 4;
      relationship.trust = clamp(relationship.trust + (wellbeing > 65 ? days * .012 : -days * .018));
      relationship.affinity = clamp(relationship.affinity + (wellbeing > 72 ? days * .006 : 0));
      relationship.lastChangedAtWorldMinutes = worldMinute;
    } else {
      relationship.trust = clamp(relationship.trust - days * .01);
    }
  }
  population.lastUpdatedWorldMinutes = worldMinute;
  if (events.length > 6) events.length = 6;
}
