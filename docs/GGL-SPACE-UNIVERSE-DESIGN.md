# GGL Space — 20-World Solar System, Cataclysm & Civilisation Economy

**Status:** Approved product direction and staged implementation plan  
**Current implementation base:** `feat/ggl-dynamic-founding-library` at `092335a650cfaef9234075dff66ff31a474277f0`  
**Release rule:** Keep work on the feature branch. Do not merge to `main` without explicit product-owner approval. A GitHub push is not a QA-ready preview; the exact commit must have a READY deployment first.

## Product vision

GGL Space is a hands-on open-space adventure with the discovery and narrative pull of classic choose-your-own-adventure games, the exploratory feel of 2D Star Traders, and the physical movement, challenge and immediacy of games such as Lode Runner and racing games. It must feel like a game the product owner would genuinely have wanted to play as a child, not merely a technical civilisation simulator.

The player begins with OG Haven, its original 60 people, their selected founding circumstances, five interconnected social networks and a ship. The people at Haven do not begin with a complete understanding of the solar system. The player and civilisation discover it together through flight, scanning, reports, missions, chronicles and consequential choices.

## 1. Initial universe: one solar system, 20 planets

- The initial playable universe contains **20 planets**, arranged as **four quadrants with five planetary locations per quadrant**.
- The map is a navigational and discovery instrument, not a replacement for physical flight. The player should be able to see the system's broad structure, known orbits, travel distances, discovered routes, signals, hazards and unknown regions.
- Discovery is progressive. A location may appear as an unidentified orbital signature before its name, atmosphere, ecology, resources, habitability, hazards and history are known.
- The five existing authored worlds remain the first established planetary identities and must not be discarded or silently renamed: Aster, Cobalt, Verdant, Ember and Frost. Their current distinct origin stories, ecological identities, 0% restoration and legacy-save progress must be preserved.
- The proposed habitability distribution across the 20 worlds is:
  - **15 worlds** begin at restoration level 0, with different degrees and kinds of extreme uninhabitability.
  - **2 worlds** begin slightly above zero, but remain completely unsafe for human settlement.
  - **1 rare naturally habitable world** exists. It is dark, but the player must still be able to see terrain, landmarks, water, vegetation, resources and navigation cues through deliberate visual design (bioluminescence, luminous minerals/water, atmospheric light, ship illumination and scanning).
  - **2 remaining worlds** are reserved for distinctive frontier/anomaly identities. Their exact habitability and environmental classifications remain an authored design decision; do not silently turn them into ordinary copies or count them twice.
- This totals 20. The rare habitable world and its special status must not be revealed to the player before discovery.

### Meteor-safe worlds

- Exactly **three worlds** are positioned outside the established meteor-shower impact corridors. The naturally habitable dark world is one of these three.
- Their relative safety means they do not require routine meteor evacuation missions. It does **not** make settled populations invulnerable: food, water, health, infrastructure, political stability and defence remain relevant.
- The other worlds can occupy different exposure levels and meteor paths. The map and survey process should progressively reveal impact corridors, forecasts and confidence rather than showing every answer at the beginning.
- Do not contradict this initial three-world safety rule with later unlock ideas. Any additional safe worlds beyond the initial solar system are a future expansion and must be clearly distinguished from these three.

## 2. The first playable milestone: discovery of the whole solar system

The first new milestone is **Solar System Discovery**, not immediate full-scale conquest, family simulation or advanced war.

The opening loop:
1. The player selects the OG Haven founding circumstances (existing feature) and begins with the original 60 founders at Haven.
2. Haven's archive, news/media and personal chronicle introduce the people, their histories, competing interpretations, needs and interests. The population does not already know the planetary system.
3. The player receives an initial survey assignment and uses the ship to explore the system.
4. The player inspects and scans planetary bodies, records their names and orbital data, learns travel routes, discovers environmental conditions and resources, and identifies meteor trajectories and unusual signals.
5. Each discovery becomes a durable entry in the relevant planetary and Haven chronicles. The mission board evolves from what has actually been discovered.
6. Only after the discovery foundation is established does the game progressively open deeper terraforming, settlement and civilisation missions.

The initial map should distinguish:
- surveyed and named worlds;
- detected but unidentified planetary signatures;
- unknown routes and unscanned regions;
- confirmed data versus estimates, rumours or incomplete readings;
- known meteor paths versus unverified danger;
- discovered resources and unresolved questions.

Do not make the map falsely imply that an unscanned planet has been fully investigated. Discovery should be earned through play and recorded in the persistent world save.

## 3. Haven chronicle, media and mission generation

OG Haven is the narrative headquarters. Its media/archive should provide readable and eventually listenable:
- founding accounts and personal testimonies;
- conflicting accounts of the same event;
- household and network perspectives;
- scientific reports, rumours, warnings and requests;
- news about discoveries, colony events, meteor forecasts, impacts, evacuations and wars;
- records of player decisions and their consequences.

The selected founding circumstances shape how people interpret events and what they ask the player to do. Mission offers should emerge from actual population interests, discoveries, resource conditions, relationships and recorded events—not from a disconnected random task list.

Early mission sequence:
1. Inspect and scan unknown worlds.
2. Survey routes, orbital conditions, resources and meteor paths.
3. Report discoveries to Haven.
4. Begin restoration/terraforming where appropriate.
5. Establish settlements only when habitat and machinery conditions permit.
6. Follow the evolving interests of Haven and its colonies: cooperation, research, trade, autonomy, self-preservation, isolation, political influence or conflict.

## 4. Meteor catastrophe and planetary destruction

The meteor/cataclysm system is a major causal world event, not just a generic damage meter.

- Meteor showers and large impactors follow authored or seeded trajectories through the system. Forecasts have lead time and confidence; players can investigate, prepare, mitigate or ignore them.
- After sufficient world time and an established warning/impact sequence, a major meteor can destroy a planet. The timing must be deterministic/reproducible from saved world state rather than an arbitrary surprise on every reload.
- A destroyed planet is a permanent civilisation-history event. Its loss changes the map, future routes, resource access, population distribution and the wider catastrophe narrative.
- **If a settlement exists on the threatened planet**, Haven and the settlement receive news/warnings. Evacuation becomes a high-stakes mission with a deadline, passenger capacity, transport logistics, destination choices and consequences for people who cannot be evacuated.
- A successful large-scale evacuation pays a **major reward in the game's currency**. This is intentionally a substantial source of income because the player has saved an entire population and completed a difficult, time-sensitive operation.
- Evacuation rewards enter the player's personal/ship economy and can fund current ship repairs and later ship upgrades, equipment and family-life systems. Do not award the same evacuation payout repeatedly through reloads or duplicate event processing.
- The three meteor-safe worlds do not receive routine evacuation pressure from the established meteor corridors, though they can still face non-meteor social, ecological and political risks.
- A planet's destruction may feed the larger black-hole/cataclysm arc. Preserve the earlier design direction in which catastrophic events can escalate into black-hole threats and force the player to make escape/survival decisions. Exact black-hole trigger count, timing and physics remain a balance/design item; do not invent a final rule in code without approval.

## 5. Conquest, leadership, naming and taxation

Conquest is a possible player-created political outcome, not a pre-assigned alignment.

- The player may eventually recruit/hire people such as soldiers, intervene in a conflict and conquer a planet.
- A successful conquest grants the player the right to rename that planet.
- The conquered population recognises the player as its leader/ruler under the resulting governance arrangement. This should be reflected in local media, chronicles, faction positions, mission requests and the planet's identity.
- A conquered world pays recurring taxes/tribute to the player in its own or shared currency while the player remains alive and the world remains under that rule.
- Tax collection must be visible and auditable: rate/basis, treasury ledger, payment dates, population/economic condition, resistance or unrest, and any interruptions. Avoid infinite money disconnected from the colony's actual ability to pay.
- Leadership is consequential. Extraction, neglect, coercion, fair governance, protection and investment can change trust, stability, autonomy, resistance and the likelihood of revolt or war.
- If the player dies, the current rule that recurring taxes are paid while the player is alive ends. A future family/heir/succession system may extend the political story, but must be designed as a separate later milestone rather than assumed to exist now.

## 6. War, defence and population-built bot ships

- Populations and colonies are not passive scenery. During war, a population can organise, manufacture or commission increasingly capable bot/automated ships using its actual resources, industrial capacity, technology and political support.
- These ships can attack the player's ship and/or other targets according to the conflict's causes and objectives.
- Bot-ship capability must emerge progressively from the population's industrial and technological development. Do not spawn arbitrary unlimited fleets.
- War can arise from player actions, conquest, resource pressure, competing interests, broken agreements, defensive responses or faction politics. It must not be a random universal hostility switch.
- Cooperation, neutrality, isolation, diplomacy, trade and war are all valid outcomes.
- Preserve player-triggered firing and existing flight-control behaviour. Do not introduce autonomous player weapons or alter the protected controls as a side effect of adding enemy ships.

## 7. Currency, missions and player progression

### Initial economy
- Mission rewards are paid in the game's currency.
- In the initial playable economy, money is used primarily for ship repairs.
- Repair costs, hull condition, available balance and transaction history should be visible. Do not grant free repairs or duplicate mission rewards.
- Existing finite machinery/material production remains a separate physical logistics economy. Money must not silently create machines from nothing.

### Later economy
Mission income and other legitimate revenue can later support:
- ship upgrades and better navigation/scanning;
- improved engines, NOS, defence and weapons;
- equipment and specialist tools;
- family formation, partner relationships and raising children;
- housing, household needs, education and family security;
- wider personal and civilisation progression.

Family raising is a later system, but it belongs to the intended game vision. It should have real consequences, relationships, time, inheritance and personal history—not just a cosmetic counter.

## 8. Previous design decisions to preserve

- OG Haven starts with 60 people; all initial colonies originate from Haven.
- Player-selected founding circumstances in Beneficial, Harmful, Mixed and Neutral categories shape the founders' initial social conditions.
- Five interconnected founding networks span the original 20 households. Their agendas and influence evolve; they are not fixed good/evil factions.
- Saved simulation time advances while closed according to the existing pause/offline-time rules.
- Colonies can emerge early with explicit risks and consequences.
- Trust and culture evolve gradually through behaviour and shared events.
- Colony independence, cooperation, neutrality and conflict emerge from actual conditions and player actions.
- Five existing planetary identities and their origin stories are protected. Existing saves retain their progress and history.
- Haven's machine stock is finite; machinery is delivered, consumed and manufactured through a time/resource chain.
- Existing flight controls, camera, start/pause/save/restart, mobile layout, target assist, docking safety, equipment recovery, ship repair and offline simulation are protected golden behaviour.
- The game remains embedded above the GGL page footer; do not move it to a separate fullscreen experience.
- The chronicles distinguish confirmed events from estimates, beliefs and rumours. Never invent retrospective history for a legacy save.

## 9. Staged build sequence

### Stage A — Solar System Discovery (next playable base)
- Build the 20-world / four-quadrant map and integrate it into the existing game flow.
- Preserve the five current world identities and show the remaining planetary signatures as unknown until surveyed.
- Add the first survey mission flow and persistent discovery records.
- Record discoveries in Haven and planetary chronicles.
- Show discovered routes, distance, signals and confirmed/estimated data.
- Do not claim all 20 planets are physically explorable until ship navigation and world simulation support all 20.

### Stage B — Planet inspection and first restoration
- Add distinct data for all 20 worlds, including the 15 level-zero worlds, two near-zero but uninhabitable worlds, rare dark habitable world, two reserved frontier/anomaly worlds and three meteor-safe worlds.
- Expand environmental/ecological simulation and finite equipment requirements without changing existing five-world save data.
- Make inspect, terraform, settle and deliver missions causal and chronicle-backed.

### Stage C — Settlement and civilian economies
- Population growth, household migration, family histories, local production, colony currency and trade.
- Mission economy, ship repairs and later upgrade progression.
- Evacuation logistics, rescue rewards and the permanent consequences of planet loss.

### Stage D — Politics, conquest and conflict
- Governance, diplomacy, player leadership, renaming, recurring taxes, resistance and revolt.
- War causes, population-built bot ships, defence and player response.
- Distinct media/chronicle perspectives for each settlement and governance state.

### Stage E — Cataclysm endgame and generational play
- Major meteor events and planet destruction.
- Black-hole/cataclysm escalation and survival choices.
- Family, children, inheritance and succession.
- Long-term survival/thriving score and civilisation history.

## 10. QA and release discipline

- Start QA with Stage A only. The first test should be the system map and discovery loop, not unimplemented conquest, tax, family or planetary-destruction systems.
- Preserve all existing game functions and save compatibility.
- Add migration defaults for new map/discovery state; never reset a legacy save.
- Test map usability on mobile and desktop, all four quadrants, 20 distinct world identities/signatures, known versus unknown status, selected survey target, and chronicle persistence.
- Regression-test the existing 3D flight controls, pause/resume, restart, manual/autosave, offline time, target assist, docking safety, cache recovery, finite machinery and ship repair.
- Keep all changes on the active feature branch until the product owner tests the exact READY preview and explicitly approves merging.
