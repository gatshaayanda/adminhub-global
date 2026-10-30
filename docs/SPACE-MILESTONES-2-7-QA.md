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
