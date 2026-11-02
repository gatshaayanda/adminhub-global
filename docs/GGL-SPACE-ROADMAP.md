# GGL Space — gameplay roadmap checkpoint

Last reviewed: 2026-11-02

This document tracks the approved gameplay direction and separates working foundations from unfinished playable systems. The latest accepted ship, camera, controls, save lifecycle, PWA behaviour and in-game layout remain protected.

## Established foundations

- Haven begins with 60 founders; colonies originate from Haven.
- Individual people have needs, health, skills, motivations, relationships, households and life stages.
- Population simulation responds to living conditions at Haven, aboard the ship and in settlements.
- **2026-11-02:** household births now require a healthy adult partner pair, stable household cohesion, adequate air/food/water/shelter/safety and settlement capacity. Children inherit a moderated profile of parental traits and skills and enter the household and relationship graph.
- **2026-11-02:** people age continuously; advanced age adds a gradual health burden, while sustained unsafe needs can also cause death. Deaths and births are recorded in the event feed.
- Planet ecology, finite resources, machine deployment, habitat restoration, local industry, hazards and settlement growth are simulated.
- Colonies develop governance, local factions, trust/autonomy relationships, missions, robotics and sequential spacecraft programmes.
- Colony bots can receive mission instructions remotely; spacecraft and bot construction are paced by skills, knowledge, population and finite materials.
- Pilot theory/licensing and the annual renewal/grace-period foundation are present.
- Survey discoveries, xenobiology first-contact records, Haven decisions and civilisation events are chronicle-backed.

## Existing gameplay feedback

- Planet appearance, atmosphere and forcefield colour change with habitat restoration progress.
- Deployed machines physically appear on the planet; a deployment pulse marks new machinery.
- Settlements visibly grow buildings with population.
- Player-fired projectiles already create impact flashes; asteroid hits remove the asteroid and update the hazard counter.
- Asteroid collisions can damage the ship and create a collision flash.

## Next priorities

1. Improve weapon impact feedback so hits read clearly against asteroids and planetary surfaces without changing flight controls or introducing arbitrary planet damage.
2. Make restoration progress more legible in the physical world over time, using the existing ecology and habitat state rather than decorative progress that is disconnected from simulation.
3. Complete station resilience: station damage, repair consequences and evacuation accounting while preserving Haven's safe-docking rules.
4. Finish population lifecycle presentation and edge cases: household migration, orphaned dependants, population summaries and explicit settlement capacity feedback.
5. Build a coherent trade/economy loop from local resource extraction, manufactured modules, inter-colony needs and finite logistics.
6. Complete the chronicle/high-score layer around survival duration, population wellbeing and civilisation continuity.

## Explicitly unfinished / do not overstate

- Birth/death simulation is a first causal foundation, not a complete family-life or social-care simulation.
- Alien cephalopod discoveries are currently survey/contact events; animated creatures emerging from planets and active creature encounters are not complete.
- Autonomous colony bot/spacecraft production is simulated; full physical bot deployment, bot combat, autonomous spacecraft flight and playable rival-pilot interception are not complete.
- The rival-pilot system currently commissions a simulation event/flag after an expired licence and grace period; it does not yet spawn a complete hostile AI ship encounter.
- Trade, a complete economy, full station damage/evacuation, and final high-score/chronicle systems remain future work.

## Preservation rules

- Do not alter the approved ship controls, camera feel, mobile control layout, save/continue/new-game order, or PWA install/offline behaviour without explicit approval.
- Do not replace the current baseline with an older snapshot.
- Keep simulation outcomes causal: skills, needs, relationships, resources, time, hazards and player choices should explain outcomes.
- Keep the game playable as a self-contained experience; do not add panels or dashboards as substitutes for visible world behaviour.
- Do not merge this roadmap branch into main until code review, verification and owner approval.
