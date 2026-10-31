# GGL Space — Founding Circumstance Library

## Product rule

The player chooses what brought the original 60 people to OG Haven. The simulation derives the population's social starting conditions from those choices. Never hard-code five named moral factions or present authored network agendas as inevitable facts.

Founding circumstances are an extensible catalogue grouped into four player-facing categories:

- **Beneficial** — mutual aid, protection, cooperative institutions, shared purpose.
- **Harmful** — coercion, exploitation, domination, exclusion, repression.
- **Mixed** — meaningful gains alongside unequal costs, contradictions or unresolved harm.
- **Neutral** — practical circumstances without a prescribed moral direction.

The category is a framing of the founding event, not a moral label applied to every founder. A selected circumstance can contain different experiences and interpretations within the same population.

## Player flow

1. New civilisation opens the founding setup before simulation time begins.
2. Player can select up to three circumstances, including choices across categories.
3. The profile is generated from the selected circumstance IDs and stored in the population state.
4. Five interconnected social networks are derived from the profile's aggregate axes and the 20 founding households. Their origin, agenda, pressure point, influence and links are generated from the selected circumstances.
5. The profile is archived locally when the new civilisation is created. Archived profiles can be loaded into the setup.
6. Manual and autosaves include the complete founding profile, network data, people, relationships, world and flight state. Loading restores the saved origin; it does not regenerate it.
7. Civilisation History records the selected origin and exposes the historical and research sources behind each selected circumstance.

## Simulation influence

Each catalogue entry provides weighted starting axes: solidarity, autonomy, hierarchy, extraction, knowledge, scarcity, trust and trauma. The selected entries are aggregated. The resulting profile shapes:

- founder cooperation, autonomy, ambition, curiosity and resilience;
- needs, household cohesion, relationship trust and affinity;
- the distribution of motivations among founders;
- the five initial network agendas, origins, pressure points, links and influence.

Colony-level interest groups continue to emerge from the motivations of the people who actually settle there. These are not fixed good/evil teams. Their composition and influence can change as people move, relationships change and the world advances.

## Adding a new circumstance

Add one object to `FOUNDING_CIRCUMSTANCES` in `src/app/ggltournaments/game/space-founding.ts`.

Required fields:
- stable unique `id` (never rename IDs already present in saved profiles);
- one of the four `category` values;
- player-facing `title`, `period`, `summary`, `livedExperience`, and `likelyTensions`;
- weighted `axes` values;
- `historicalBasis` and `historicalUrl` describing the real-world historical pattern or event that inspired the scenario;
- `researchBasis` and `researchUrl` grounding the behavioural mechanism.

Use reliable primary, institutional or peer-reviewed sources. Distinguish documented history from fictional scenario extrapolation. Do not copy real people's private experiences into game biographies, imply that a single historical event has one universal psychological outcome, or label populations as inherently virtuous or villainous. Add a source record when a new research or historical claim is introduced.

## Current starter catalogue and sources

The starter library is a first curated slice, not a closed list. It includes mutual aid after disaster, peaceful scientific compact, refuge and resettlement, negotiated commons, coercive extraction, authoritarian escape, engineered exclusion, unequal rescue, prosperity with hidden costs, revolutionary coalition, long-range survey, commercial opportunity and planned relocation.

Research anchors:
- Collective narratives can shape identity, norms and behaviour ranging from cooperation to conflict: https://compass.onlinelibrary.wiley.com/doi/10.1111/spc3.12670
- Collective memory can support group cohesion and cooperation: https://pubmed.ncbi.nlm.nih.gov/40753833/
- Collective trauma can reshape shared meaning and identity: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01441/full
- Intergroup relations require context-sensitive interventions: https://www.nature.com/articles/s44159-024-00330-z
- Forced migration and collective trauma have diverse outcomes, including resilience and intergenerational effects: https://pubmed.ncbi.nlm.nih.gov/40625174/

Historical anchors:
- UNHCR history and post-war displacement/resettlement: https://www.unhcr.org/history-of-unhcr
- Antarctic Treaty, signed in 1959, peaceful use and scientific cooperation: https://www.ats.aq/e/antarctictreaty.html
- International Geophysical Year and Antarctic scientific cooperation: https://www.ats.aq/e/science.html
- Berlin Airlift, 1948–1949, as a documented example of a blockade and large-scale supply response: https://history.state.gov/milestones/1945-1952/berlin-airlift

## Protected design constraints

- The 60 founders remain at OG Haven at the start.
- Exactly five initial social networks are generated, interconnected and assigned across the 20 households.
- Network names may be stable social-role labels, but origins, agendas, pressure points, influence and later faction emergence must respond to the selected profile.
- No predetermined good/evil faction alignment.
- Faction emergence remains causal: population motivations, household and interpersonal relationships, migration, local resource conditions, governance and player actions.
- Preserve the five planet origins, 0% restoration start, existing flight controls, finite machinery, ecology, save lifecycle and mobile interactions.
- Existing saves retain their progress and history. Legacy saves receive a compatibility profile only when their old data lacks one; do not overwrite their population or saved events.
