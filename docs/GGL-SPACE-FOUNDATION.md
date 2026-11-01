# GGL Space — Foundation and QA Baseline

Status: approved starting-point direction, 2026-11-01.

This document protects the conceptual foundation while the first playable systems are QA'd. It does not authorize a redesign of the current flight experience or the addition of later hostile-alien systems.

## The four distinct identities

These concepts must remain separate in the data model, interface, history and future features.

1. **Pilot** — the human player operating the ship. The pilot name belongs to the flight licence, career, mission records and attribution for actions. A pilot name must never automatically rename or own a civilisation.
2. **Starting base** — the initial operational location from which the player begins. The current starting base is GGL Haven. It is a base/station, not a player-named kingdom and not a synonym for the whole civilisation.
3. **Civilisation** — the population and its continuing shared history. The 60 initial people and their selected founding circumstances establish the opening conditions. The civilisation's identity develops through population growth, survival, relationships, decisions, settlements, discoveries and historical events. Do not label it with the pilot's name by default.
4. **Factions / social groups** — groups that emerge from the population over time. Founding circumstances may shape early networks and tensions, but those networks are not fixed, prewritten factions. Future faction identities, leadership, beliefs, alliances, rivalries and influence must arise from population behaviour and events.

## Opening experience

- The player chooses the available founding circumstances for the initial population.
- Those choices describe why the 60 people came together and the conditions they bring with them.
- The player begins from the starting base and influences events through flight, exploration, resource and settlement decisions.
- The game must not assume that the player is the ruler, owner, namesake or sole author of the civilisation.
- Keep existing saved-game compatibility. Do not discard or silently overwrite an existing run when adding identity/history fields.

## History and records

Keep separate records for:
- pilot career and licence progression;
- civilisation history and development over time;
- starting-base operations and resources;
- emergent social networks and future factions;
- individual milestones and the events that caused them.

History entries should identify the relevant actor and context when known, without making the pilot the owner of every population or faction event. Starting a new civilisation must not erase the historical record of a previous run.

High-score and legacy work should eventually describe civilisation survival and development over time, not just arcade performance. Keep pilot career rank distinct from civilisation legacy. Do not introduce arbitrary composite scoring before the relevant metrics and QA expectations are agreed.

## Protected foundation for first QA

QA the current foundation before expanding the universe:
- flight controls, camera and navigation;
- starting-base / Haven operations;
- 60-person population and founding-circumstance selection;
- population simulation and emergent social networks;
- finite resources, equipment deployment and world restoration;
- settlement and colony continuity;
- in-flight system menu, system map, missions and chronicle;
- save, restore and time progression;
- pilot name, theory, licence and career as a separate pilot record.

Keep current accepted controls, ship presentation, HUD layout and playable flight baseline intact unless a specific defect is reported and approved for correction.

## Explicitly deferred

Do not add these as part of the first foundation QA checkpoint:
- hostile alien species or alien factions;
- Space Impact-style hostile encounters and combat progression;
- new enemy planets or external invasion arcs;
- broad new technology trees or unrelated gameplay expansions.

These are future expansion directions to consider after the foundation has been tested.

## Implementation rule

Before extending this foundation, inspect the current main implementation and saved-state shape. Prefer small additive changes, preserve existing saves, and verify the affected gameplay path. A GitHub merge/push is a source checkpoint, not proof of live QA: only give a QA link after the Vercel deployment for the exact commit is READY.
