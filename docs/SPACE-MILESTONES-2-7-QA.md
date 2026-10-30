# GGL Space — Milestones 2–7 preview QA and ongoing playtest log

Branch: `feat/ggl-space-milestones-2-to-7`

This is an experimental feature branch based on the accepted 2026-10-30 lifecycle golden baseline. It is not merged or approved as the next golden version. The protected recovery point remains `golden/ggl-space-2026-10-30-lifecycle`.

## Previously confirmed by the product owner

The product owner has already QA'd an earlier preview and confirmed that these core lifecycle behaviours worked well:
- Pause and restart behaved as expected.
- Simulation time advanced during play.
- Population behaviour/progression was functioning.

Treat these as a positive regression checkpoint, not as a reason to skip retesting after new changes. Preserve the accepted flight controls, camera, pause/restart flow and time/save semantics. The exact deployment SHA for that earlier hands-on QA is not asserted here; do not infer that a later deployment was tested merely because it is READY.

## What this branch adds beyond the earlier lifecycle checkpoint

### Milestone 2 — contextual target assist and recovery
- Player-fired projectiles receive soft aim assistance toward visible planets or asteroids inside a forward cone and range.
- Assistance never fires automatically and does not change steering, thrust, NOS, camera or projectile cadence.
- Planets remain inspectable through their existing proximity console.
- Floating equipment caches appear in open space and can be recovered through the proximity console into finite machine cargo.
- Asteroids remain damageable with FIRE; recovery is a separate proximity action.

### Milestone 3 — named individual population foundation
- New games seed 60 stable, named people with deterministic IDs, ages/life stages, motivations, traits, needs, skills, households and relationships.
- Legacy saves without individual records are migrated from existing Haven/ship/colony counts without changing recorded population totals.
- Boarding, returning and settlement delivery move named people between Haven, ship and colony locations.
- The expanded Ship Manifest and existing contextual consoles reveal compact crew names.

### Milestone 4 — individual life simulation (partial)
- Needs, wellbeing, age/life stage, skill growth and relationship trust/affinity evolve with world time.
- Warnings are generated when material needs become unsafe.
- Full birth/death causality, family life histories, illness/accident/violence and personal event arcs remain incomplete.

### Milestone 5 — planetary ecology and production (partial)
- Each world has a distinct environmental/resource profile: temperature, pressure, water, radiation, contamination, biodiversity, energy, food, local resource stock and maintenance.
- Deployed machines and operators drive resource extraction, ecological change, maintenance load and local fabrication progress.
- Maintenance affects restoration reliability; ecological support affects colony growth.
- Local fabrication outputs are tracked. Full player-authored multi-step recipes, station manufacturing and maintenance repair workflows remain incomplete.

### Milestone 6 — collective society (partial)
- Colonies track trust with Haven, autonomy, governance stage and motivation-based civic groups.
- Local autonomy develops from operators and local production; governance can mature into a council and later self-government.
- Trust declines after prolonged lack of contact.
- Full household migration, faction negotiation, diplomacy, conflict and independent colony decisions remain incomplete.

### Milestone 7 — hazards and repair (partial)
- Asteroid collisions can damage the ship hull; hull integrity is shown in the existing expanded manifest.
- GGL Haven can repair the ship using finite machine stock.
- The simulation can generate orbital-impact warnings and a rare fictional charged power-dust warning after world development.
- The existing planet inspection console shows forecast window/confidence and allows a finite-machine mitigation action.
- Impacts damage habitat progress and ecological/production state.
- Full station damage, advanced sensors/study missions, evacuation accounting, shelter logistics and complete threat-response choices remain incomplete.

## First full preview QA sequence

1. **Regression checkpoint:** Confirm pause, restart, world-time progression, population progression, autosave/manual save/load and offline progression. Pause must freeze simulation time; restart must retain its intended meaning and must not silently corrupt the saved civilisation.
2. Confirm the golden flight baseline: analog steering, forward/reverse, vertical thrusters, NOS, FIRE, camera, collisions and mini-map remain intact.
3. Hold FIRE with a planet or asteroid ahead inside the assist cone. Confirm shots are gently guided only while firing; no autonomous shots occur.
4. Continue flying until a floating equipment cache appears. Approach it, recover it, and confirm machine cargo increases by one. Try again with a full hold and confirm recovery is blocked.
5. Open the Ship Manifest. Confirm the named crew roster is present. Board people at Haven, deliver them to a settlement-ready planet, and confirm the roster follows the transfer.
6. Inspect a planet after deploying machinery. Confirm its environmental/resource readings and fabrication progress change with world time.
7. Inspect a colony after founding it. Confirm trust, autonomy, governance and emerging civic groups are shown without a new permanent HUD panel.
8. Allow sufficient accelerated world time for an orbital warning. Open the target planet console, inspect the forecast, deploy mitigation if stock is available, and observe the eventual impact/aftermath.
9. Deliberately collide with an asteroid. Confirm hull integrity decreases; return to Haven and repair using finite machine stock.
10. Save manually, change world/ship state, then load. Confirm individuals, ecology, colony society, hazards, machine stock, hull damage and ship position restore together.
11. Refresh and verify autosave/offline progression. Pause and confirm simulation time does not progress while paused.

## Ongoing gameplay QA — no fixed end date

Milestone 7 is the start of extended hands-on QA, not the end of development. Keep this branch and PR open while the product owner continues playing.

For every reported observation, record:
- Date/session and the exact screen, planet, console or gameplay situation.
- Expected behaviour versus what actually happened.
- Whether it is a reproducible bug, balance issue, usability issue or proposed enhancement.
- The smallest relevant fix and the regression areas to retest.

After each fix, update this log, verify the affected systems, push to this same feature branch and provide a new READY preview. The owner may continue QA for as many sessions as needed; there is no automatic approval or merge at Milestone 7.

## Remaining work before describing Milestones 2–7 as complete

This branch is a substantial playable foundation, not yet a claim that every planned system is finished. Outstanding depth includes:
- Birth/death causality and meaningful family/person event arcs.
- Complete resource recipes, station production, machine repair and logistics loops.
- Household migration, faction negotiation/diplomacy/conflict and autonomous colony decisions.
- Station damage, sensor/study missions, evacuation accounting, shelter logistics and richer threat-response choices.

Continue implementation toward a coherent playable milestone set before presenting the next preview as the full Milestones 2–7 checkpoint. Do not hide known gaps in the QA handoff.

## Release and golden-baseline gate

- Work only on `feat/ggl-space-milestones-2-to-7` until the product owner explicitly approves merging.
- Never change the accepted golden branch or `main` as part of this work.
- Do not merge until the exact latest branch commit has a READY Vercel Preview and the product owner has completed hands-on QA and explicitly approved.
- A rate-limit failure is not a successful build and must not be presented as a preview. Do not create repeated empty commits merely to force builds.
- After explicit approval only: merge, update the golden recovery branch to the accepted merge commit, verify the matching production deployment and route, then branch fresh from the new accepted baseline.


---

## Product-owner gameplay QA — 2026-10-30 (exact preview commit 7d9291d)

The product owner tested the READY Vercel preview and reported:

| Area | Result | Observation |
|---|---|---|
| Combat target assistance | **Failed / not observed** | Firing near planets and asteroids did not demonstrate target assistance. Player-triggered only remains mandatory; no auto-fire. |
| Floating equipment recovery | **Failed / blocked** | Cache appeared, but the recovery button was not pressable, so recovery did not occur. |
| Colony settlement and governance | **Partial** | Settlement was founded and colony systems appeared, but there were no meaningful narrative histories/storylines. |
| Asteroid safety while docked | **Failed** | Asteroid impacts continued while docked at or near Haven. |
| Haven machine resupply / ship repair | **Usability and gameplay gap** | Player could not understand how to replenish Haven's machine stock to repair the ship. |
| Other tested systems | **Reported good** | Preserve the working systems and golden flight controls; continue regression testing. |

### Interpretation and required design

**Combat:** Trace the real projectile path from FIRE input through target acquisition, guidance and collision/impact. Ensure valid targets are selected in front of the ship within a clear range/cone, and that aim assistance visibly guides only shots the player fires. Add hit/near-miss feedback without changing firing cadence or flight controls.

**Equipment recovery:** Make the recovery action genuinely pressable on mobile (pointer/touch target, layering, disabled state, proximity threshold and event propagation). Show a success signal and machine cargo count change. A full cargo hold must produce a clear blocked reason.

**History and storylines:** Build a persistent, causal chronicle for Haven before expanding colony storylines. Haven's founding, original 60 people, named-person relationships, births/deaths, decisions, resource shortages, departures, arrivals and hazards should generate durable events. Each colony begins with its founding/settlement origin and develops its own history from recorded inhabitants, governance, resources, contact and events. No invented retrospective facts or arbitrary plot text: narratives are projections of structured events and should distinguish confirmed events from estimates, beliefs and rumours.

**Docking and hazards:** Add an explicit docking state/action and visible confirmation. While docked at Haven, ordinary asteroid collision damage to the ship must be suppressed by safe-harbour protection. Mere proximity is not docking. Define what happens during undocking and ensure hazards remain consequential in open flight and at exposed colonies/worlds.

**Machine economy:** Show the complete finite chain for machine stock: required inputs, available inputs, production queue/time, finished machine count, capacity, transfer/delivery to Haven and consumption during ship repairs. Explain repair cost and duration before confirming. Keep stock finite; no unexplained replenishment or free repair.

## Follow-up implementation branch

- The tested baseline was merged to `main` via PR #17, merge commit `93666216e30e0ab7a796d73dfea3ed4be7eaa24f`.
- The next branch is `feat/ggl-space-qa-followup`, created from that merge commit.
- The earlier `feat/ggl-space-milestones-2-to-7` branch and its PR #16 are historical; PR #16 was closed after its draft state prevented direct merge. PR #17 is the release record.
- The next branch must remain unmerged until its exact READY preview is tested and explicitly approved.

### Prioritized acceptance checklist

1. Recover cache on touch and mouse; confirm exactly +1 machine in finite cargo; test full hold and repeat tap.
2. Fire at multiple target distances/angles; confirm aim assistance works only on player input, targets the intended planet/asteroid, and produces visible impacts; verify no shots when FIRE is untouched.
3. Dock at Haven using an explicit interaction; confirm docked state and safe-harbour status; remain docked through an asteroid event with no ship collision damage; undock and verify ordinary hazards resume.
4. Inspect machine production: inputs, queue, elapsed time, output, stock transfer, repair cost, and stock decrement. Verify no resource duplication through save/load.
5. Confirm Haven chronicle appears from structured events; found a colony and confirm its chronicle starts with a settlement record and develops from that colony's own recorded events.
6. Regression: pause/restart, world-time progression, autosave/manual save/load, offline progression, golden flight controls, camera, collisions away from dock, minimap and mobile layout.

## Release and QA gate — supersedes earlier branch instructions

The earlier instruction to keep `feat/ggl-space-milestones-2-to-7` unmerged applied before the product owner approved release. It is superseded by the actual approval and PR #17 merge recorded above. For the current follow-up branch, keep all changes on `feat/ggl-space-qa-followup`; only merge after a READY preview for its exact latest commit, hands-on product-owner QA, and explicit approval. Always provide the direct `/ggltournaments` route in preview handoffs.


## Follow-up implementation checkpoint — current branch work

Implemented in the current follow-up branch (not yet product-owner QA-approved):
- Added an explicit persisted-compatible `dockedAt` state for GGL Haven. Docking is a deliberate menu action; flight input undocks the ship. Ordinary asteroid hull collision damage is suppressed while explicitly docked at Haven.
- Increased the target-assist acquisition range/cone and steering strength, and changed the aim point from the target centre to its near surface. It remains strictly player-FIRE-triggered.
- Raised proximity action stacking priority, restored pointer/touch events to the menu and buttons, made transient transfer signalers ignore pointer input, and strengthened focus/touch affordances.
- Added a persistent structured chronicle with an initial Haven origin entry and event-backed records for habitat stages, settlement founding, colony governance/independence, equipment recovery, docking/undocking, ship repairs, machine production and asteroid hull impacts. The existing contextual Haven/planet menu surfaces recent entries.
- Added a finite machine resupply loop: deploy machinery on a planet, mine its finite resource stock into a 20-unit ship material hold, return and dock at Haven to unload, then spend 6 material units to queue one machine. Fabrication takes four simulated system hours; completion adds one machine to Haven storage. Ship repairs continue to consume finite machine stock.

Still outstanding:
- Full family/person life histories with causal births/deaths, illness/accidents and meaningful personal arcs. Current chronicle records civilisation milestones and selected consequential events, not a complete biography system.
- Richer production recipes, station power/maintenance, logistics and multiple machine types. The current resupply loop is a deliberately bounded first playable chain.
- Narrative perspective distinctions (confirmed facts vs estimates, beliefs and rumours) and deeper faction diplomacy/migration remain later work.

The current branch preview must be tested for the implemented fixes before any claim of success. In particular, confirm a player can recover a cache on touch, observe assisted shots, explicitly dock and remain safe through an asteroid event, mine and deliver materials, queue and complete machine fabrication, repair a damaged ship, and inspect Haven/colony histories.
