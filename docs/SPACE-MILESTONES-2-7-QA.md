# GGL Space — Milestones 2–7 preview QA checkpoint

Branch: `feat/ggl-space-milestones-2-to-7`

This is an experimental feature checkpoint based on the accepted golden baseline `golden/ggl-space-2026-10-30-lifecycle`. It is not merged or approved as the next golden version.

## Implemented in this slice

### Milestone 2 — contextual target assist
- Player-fired projectiles receive soft aim assistance toward visible planets or asteroids inside a forward cone and range.
- Assistance never fires automatically and does not change steering, thrust, NOS, camera or projectile cadence.
- Planets remain inspectable through their existing proximity console.
- Floating equipment caches appear in open space and can be recovered through the proximity console into finite machine cargo.
- Asteroids remain damageable with FIRE; recovery is a separate proximity action.

### Milestone 3 — typed individual foundation
- New games seed 60 stable, named people with deterministic IDs, ages/life stages, motivations, traits, needs, skills, households and relationships.
- Legacy saves without individual records are migrated from existing Haven/ship/colony counts without changing the recorded population totals.
- Boarding, returning and settlement delivery move the named people between Haven, ship and colony locations.
- The expanded Ship Manifest and existing contextual consoles reveal compact crew names.

### Milestone 4 — life simulation foundation (partial)
- Needs, wellbeing, age/life stage, skill growth and relationship trust/affinity evolve with world time.
- Warnings are generated when material needs become unsafe.
- Full births/deaths, family life histories and hero-event causality are not complete in this checkpoint.

### Milestone 5 — planetary ecology and production foundation (partial)
- Each world has a distinct environmental/resource profile: temperature, pressure, water, radiation, contamination, biodiversity, energy, food, local resource stock and maintenance.
- Deployed machines and operators drive resource extraction, ecological change, maintenance load and local fabrication progress.
- Maintenance affects restoration reliability; ecological support affects colony growth.
- Local fabrication outputs are tracked. Full player-authored multi-step recipes, station manufacturing and maintenance repair workflows remain incomplete.

### Milestone 6 — collective society foundation (partial)
- Colonies track trust with Haven, autonomy, governance stage and motivation-based civic groups.
- Local autonomy develops from operators and local production; governance can mature into a council and later self-government.
- Trust declines after prolonged lack of contact.
- Full household migration, faction negotiation, diplomacy, conflict and independent colony decisions remain incomplete.

### Milestone 7 — hazards and repair foundation (partial)
- Asteroid collisions can damage the ship hull; hull integrity is shown in the existing expanded manifest.
- GGL Haven can repair the ship using finite machine stock.
- The simulation can generate orbital-impact warnings and a rare fictional charged power-dust warning after world development.
- The existing planet inspection console shows forecast window/confidence and allows a finite-machine mitigation action.
- Impacts damage habitat progress and ecological/production state.
- Full station damage, advanced sensors/study missions, evacuation accounting, shelter logistics and complete threat-response choices remain incomplete.

## QA sequence

1. Confirm the golden flight baseline: analog steering, forward/reverse, vertical thrusters, NOS, FIRE, camera, collisions and mini-map remain intact.
2. Hold FIRE with a planet or asteroid ahead inside the assist cone. Confirm shots are gently guided only while firing; no autonomous shots occur.
3. Continue flying until a floating equipment cache appears. Approach it, recover it, and confirm machine cargo increases by one. Try again with a full hold and confirm recovery is blocked.
4. Open the Ship Manifest. Confirm the named crew roster is present. Board people at Haven, deliver them to a settlement-ready planet, and confirm the roster follows the transfer.
5. Inspect a planet after deploying machinery. Confirm its environmental/resource readings and fabrication progress change with world time.
6. Inspect a colony after founding it. Confirm trust, autonomy, governance and any emerging civic groups are shown without a new permanent HUD panel.
7. Allow sufficient accelerated world time for an orbital warning. Open the target planet console, inspect the forecast, deploy mitigation if stock is available, and observe the eventual impact/aftermath.
8. Deliberately collide with an asteroid. Confirm hull integrity decreases; return to Haven and repair using finite machine stock.
9. Save manually, change the world/ship state, then load. Confirm individuals, ecology, colony society, hazards, machine stock, hull damage and ship position restore together.
10. Refresh and verify autosave/offline progression. Pause and confirm simulation time does not progress while paused.

## Release gate

- Do not merge this branch until the exact Vercel Preview is READY and the product owner approves hands-on QA.
- Current Vercel status for the latest branch commit may be blocked by the project's build-rate limit. A rate-limit failure is not a successful build and must not be presented as a preview.
- If the preview cannot be produced, wait for the platform limit to clear; do not create repeated commits merely to force builds.
- After owner approval: merge, update the golden recovery branch, verify the matching production deployment and route, then branch fresh from the new accepted baseline.
