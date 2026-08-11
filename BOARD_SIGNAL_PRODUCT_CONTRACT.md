# BoardSignal product contract

## Product promise

BoardSignal is the personal sports desk for everyday Chess.com players. A player gives BoardSignal one public Chess.com username. BoardSignal retrieves the available public games, closes one fixed seven-day episode, reconstructs the chess evidence, reviews selected positions, and returns a player-centred story, diagnosis, and useful action.

The customer experience must not depend on BAT or PowerShell downloads, routine PGN uploads, Founder Lab chats, or the player understanding the internal pipeline. Manual PGN upload remains an exceptional recovery tool for the Founder.

## Permanent priority

`PLAYER → THEIR WEEK → THEIR SIGNALS → THEIR ACTION → BOARDSIGNAL UNIVERSE`

The brand, other players, product proof, pricing, and community features must never displace the current player from the centre of their experience.

## Complete player journey

### 1. Find me

- The first primary action is `Enter your Chess.com username`.
- Ask for no Chess.com password, API key, PGN file, email address, or payment before the player sees their first useful Desk.
- Confirm Chess.com's canonical username and stable player ID when available.
- Surface ambiguous-character corrections for confirmation; never silently assume identity.

### 2. Build my Desk

- Retrieve only the Chess.com monthly archives overlapping the required period.
- Select the latest completed fixed seven-calendar-day episode according to the configured cadence.
- Never create sliding daily duplicates.
- If the newest completed period has no games, search backward through non-overlapping complete periods and clearly label the result as the last active week.
- Validate games, separate pools, reconstruct positions, calculate the factual record, and review ranked candidate positions with Stockfish.
- Show calm, useful progress language. Do not expose internal chat names, Fact Pack filenames, seed status, beta case numbers, engine plumbing, or implementation phases.

### 3. My Room

The Player Room is the private home of the product. It contains:

- Player identity and Chess.com confirmation.
- The newest Desk and its week headline.
- A short week-at-a-glance scoreboard.
- Clear paths to `My week`, `My weakness`, `My guidance`, and `My evidence`.
- A moving archive of up to four monthly episodes when persistence is enabled.
- Player-controlled sharing and profile settings when those capabilities are enabled.

The Room must provide direction. It must not feel like a database, admin dashboard, PDF folder, or gallery of other people.

### 4. My Desk

Each Desk is one complete progressive reading experience:

1. Replay — what kind of week it was and how it moved.
2. Turning point — the most meaningful change supported by the evidence.
3. Green — what to preserve.
4. Amber — what to monitor or keep in context.
5. Red — what to fix first.
6. Blue — the short action to carry into the next games.
7. Evidence — selected positions, game links, evaluation context, and limitations.
8. Pocket card — the shortest usable reminder from the episode.

The Blue Signal is advice from this episode. The base workflow is stateless and does not grade it as a cross-week mission.

### 5. BoardSignal Universe, public player pages, and share cards

- Public pages are opt-in athlete pages, not public weakness files.
- A public page may show chosen identity, avatar, current/recent positive coverage, weekly headline, scoreboard, Moment of the Week, and selected share cards.
- Never auto-publish Red weaknesses, Amber concerns, private Blue guidance, detailed development positions, reflections, journal entries, or embarrassing negative material.
- The player chooses whether a post uses their Chess.com username, a display name, or another allowed identity.
- Other-player coverage appears only after the current player's personal journey and remains secondary.
- `BoardSignal Universe` is the permanent name of the public player-centred sports world. The main navigation label is `Universe`.
- The Universe grows from approved highlights into featured players, rivalries, rankings, Player of the Week, and later player voting. These features must remain grounded in completed Desk evidence and player sharing choices.

### 6. Founder control tower

Founder/admin surfaces manage:

- Player identity exceptions.
- Collection and processing status.
- Validation failures and rate limits.
- Low-confidence interpretation and quality review.
- Publishing and private-link delivery.
- Privacy controls and public-highlight approval.

The Founder control tower is never presented as part of the player's Desk. Terms such as `Founder beta`, `seeded`, `case`, `Fact Pack`, `Data Lab`, and internal game IDs belong only in development/admin contexts.

## Core pipeline

```text
Username
→ identity confirmation
→ archive collector
→ period engine
→ PGN validator and legal reconstruction
→ factual analytics
→ candidate-position finder
→ Stockfish review
→ week-shape interpreter
→ Replay compiler
→ Signal and Action selector
→ quality and privacy validator
→ private Desk publication
→ optional player-approved public highlight
```

Calculations, chess claims, decision rules, confidence, privacy, and validation must be reproducible from stored inputs. Controlled editorial templates may write the Desk from approved facts. An LLM may later polish prose, but it must never be the factual authority, product memory, or only way a Desk can be produced.

## Player-facing language rules

Use product language:

- `Your latest Desk`
- `My week`
- `My signals`
- `My weakness`
- `My guidance`
- `My evidence`
- `Position review complete`
- `Find my Desk`

Do not show development language:

- `Founder beta`
- `Completed beta Desk`
- `Live Desk built`
- `Private session Desk`
- `Check another username`
- `Seeded Desk`
- `Next conversion pass`
- `Founder Lab engine review`

When a game sequence ID is useful to a player, render `Game 8`, not unexplained shorthand such as `G08`.

## Commercial boundary

Membership, account creation, payments, and email claiming belong after the username-to-beta-quality-Desk loop is reliable. They remain part of the planned full product, but they do not interrupt the first useful experience.

## Definition of a complete core

The core is complete only when a newly entered non-seeded username can automatically produce a Desk comparable in factual depth, position evidence, narrative specificity, Signal quality, privacy safety, and presentation to the best manually produced beta reports—without moving files or instructions through ChatGPT conversations.

## Binary publication gate

A Desk has only two publication outcomes:

- `PASS`: identity and fixed period are complete; W/D/L totals reconcile; all seven dates are present; rating pools remain separate; every game legally reconstructs; selected positions finish review; Red and Blue are supported by the same evidence; no placeholder, internal, tutorial, or development copy remains.
- `FAIL`: the Desk is not published. It enters the private exception path with stable failure codes. The product must never turn missing sessions, streaks, ratings, positions, or engine results into zeroes, filler, or a generic diagnosis.

Termination counts, streaks, volume, rating movement, openings, and opponent bands may nominate questions. None of them alone proves a chess weakness. A resignation becomes guidance only when the reviewed final position was still playable; a timeout becomes clock guidance only when the reviewed board retained practical chances; a tactical theme becomes Red only after the engine-supported position evidence clears the configured threshold.

## Cadence and later episodes

- The first Desk fixes a player's cadence anchor.
- Later episodes advance in exact seven-day blocks from that anchor; they never slide with the visit date.
- A completed active block creates the next Desk idempotently.
- A completed zero-game block records no activity and does not republish an older Desk as new.
- The device-local beta cache retains at most four passing Desks per player. Durable cross-device persistence remains part of the account/persistence layer.

