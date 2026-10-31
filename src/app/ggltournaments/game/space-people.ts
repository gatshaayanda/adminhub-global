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
export type FoundingNetwork = { id: string; name: string; agenda: string; origin: string; pressurePoint: string; householdIds: string[]; linkedNetworks: string[] };
export type PopulationState = { version: 1; seed: number; lastUpdatedWorldMinutes: number; people: SpacePerson[]; relationships: PersonRelationship[]; households: SpaceHousehold[]; foundingNetworks: FoundingNetwork[] };

const FOUNDING_NETWORK_SEEDS: Omit<FoundingNetwork, "householdIds">[] = [
  { id: "long-arc-survey", name: "Long Arc Survey Compact", agenda: "Map unknown systems, share discoveries and avoid committing people to worlds before their risks are understood.", origin: "Survey crews and navigators joined Haven after years of fragmented deep-range missions. They brought incomplete star charts, instrument logs and a promise to make exploration a shared public resource.", pressurePoint: "Their appetite for discovery can compete with the immediate need to protect and supply people already at Haven.", linkedNetworks: ["continuity-guild", "commons-charter"] },
  { id: "hearthline-mutual", name: "Hearthline Mutual", agenda: "Put life support, family continuity, health and dependable shelter ahead of prestige or speed.", origin: "Medical teams, care workers and families arrived through a sequence of evacuation transports. They agreed to pool scarce supplies only if no household was treated as expendable.", pressurePoint: "A cautious settlement threshold can frustrate groups willing to accept greater personal risk for faster expansion.", linkedNetworks: ["commons-charter", "continuity-guild"] },
  { id: "commons-charter", name: "Commons Charter Assembly", agenda: "Keep shared infrastructure, rationing and major settlement decisions accountable to the people affected by them.", origin: "Delegates from several station communities negotiated the founding compact that made Haven a common refuge rather than the property of one expedition or sponsor.", pressurePoint: "Consensus takes time, especially when urgent technical decisions cannot wait for every household to agree.", linkedNetworks: ["hearthline-mutual", "long-arc-survey", "resource-cooperative"] },
  { id: "continuity-guild", name: "Continuity and Learning Guild", agenda: "Preserve knowledge, education, cultural memory and the ability of future generations to understand the choices that shaped them.", origin: "Teachers, archivists, researchers and cultural workers carried records from settlements that had lost their institutions during the long migration. Their work became Haven's first shared archive.", pressurePoint: "Long-term research and preservation compete with immediate production demands when materials and machine time are scarce.", linkedNetworks: ["long-arc-survey", "hearthline-mutual"] },
  { id: "resource-cooperative", name: "Resource and Works Cooperative", agenda: "Build practical extraction, repair, manufacturing and fair exchange so settlements can become materially self-reliant.", origin: "Fabricators, miners, mechanics and logistics crews joined from industrial outposts whose supply lines had become unreliable. They brought repair knowledge and a belief that every colony must learn to make what it needs.", pressurePoint: "Production targets can put pressure on ecological safeguards and on communities that do not want their world treated only as a resource.", linkedNetworks: ["commons-charter", "long-arc-survey"] },
];

function seedFoundingNetworks(households: SpaceHousehold[]): FoundingNetwork[] {
  return FOUNDING_NETWORK_SEEDS.map((seed, index) => ({
    ...seed,
    householdIds: households.filter((_, householdIndex) => householdIndex % FOUNDING_NETWORK_SEEDS.length === index).map(household => household.id),
  }));
}

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

export function createPopulationState(seed = 0x47474c, population = 60, worldMinute = 0): PopulationState {
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
  return { version: 1, seed, lastUpdatedWorldMinutes: worldMinute, people, relationships, households, foundingNetworks: seedFoundingNetworks(households) };
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
        const savedNetworks = Array.isArray(saved.foundingNetworks) ? saved.foundingNetworks.filter(network => network && typeof network.id === "string" && typeof network.name === "string" && typeof network.agenda === "string" && typeof network.origin === "string" && typeof network.pressurePoint === "string" && Array.isArray(network.householdIds)).map(network => ({ ...network, householdIds: network.householdIds.filter(id => validHouseholds.has(id)), linkedNetworks: Array.isArray(network.linkedNetworks) ? network.linkedNetworks.filter(id => typeof id === "string") : [] })) : [];
        return { version: 1, seed: Number.isFinite(saved.seed) ? Number(saved.seed) : 0x47474c, lastUpdatedWorldMinutes: Number.isFinite(saved.lastUpdatedWorldMinutes) ? Number(saved.lastUpdatedWorldMinutes) : worldMinute, people, relationships, households, foundingNetworks: savedNetworks.length ? savedNetworks : seedFoundingNetworks(households) };
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
