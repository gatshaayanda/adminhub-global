# Admin Hub: Spaceship Hub — playable vertical slice

## Player promise
Pilot a courier ship through a peaceful, explorable star system. Establish settlements, invest in terraforming, move supplies, protect people through evacuation, and watch cultures and ecosystems change over time. This first slice focuses on exploration and civilisation stewardship, not combat.

## Current systems
- Phaser 3.90 scene, camera follow, keyboard and pointer/touch steering, cruise boost, four distinct worlds.
- Haven begins settled; Cinder, Tide and Verdant can be settled.
- Founding costs 70 credits and introduces 120 settlers; terraforming costs 45 credits; cargo trade earns credits and restores food; evacuation relocates 35% of a settlement to Haven.
- Every 10 seconds of active simulation represents a year. Food, pollution, habitability and population change through deterministic rules. Technology increases productivity and environmental pressure.
- Credits measure trade capacity; legacy counts settlements. A lost settlement is not automatic campaign failure.

## Research-informed decisions
- Phaser's unified pointer/keyboard input and responsive scale manager support mobile and desktop control: https://docs.phaser.io/phaser/concepts/input and https://docs.phaser.io/phaser/concepts/scale-manager
- Game-learning research found autonomy, competence and relatedness each matter for motivation and outcomes. This slice provides choices, readable metrics and population/migration consequences: https://pubmed.ncbi.nlm.nih.gov/17761025/
- Social-ecological resilience research highlights interacting pressures and collapse risks. Trade can relieve shortages while development increases pollution; evacuation offers recovery rather than an automatic game-over: https://doi.org/10.1016/j.tree.2017.04.011 and https://doi.org/10.1016/j.gloenvcha.2023.102704
- NASA's ISRU work frames local resources as support for long-duration exploration; settlement and terraforming are investments rather than instant free upgrades: https://www.nasa.gov/technology/in-situ-resource-utilization-isru/

## Known limitations
- This uses Phaser's 2D renderer with layered planetary artwork and a camera-follow galaxy map. It is not yet a true Three.js 3D planetary fly-through like the visual reference in Big Brothers Car Wash.
- Culture and diplomacy are currently simple culture labels. The next slice should add deterministic trust, trade dependence, alliances, disputes, peace treaties and several non-terminal outcomes.
- Phaser is loaded from jsDelivr to avoid a lockfile-only dependency edit through the remote GitHub editor. Production hardening should bundle Phaser through npm and verify offline behaviour.
- State is in-memory and resets on reload or a new expedition.
