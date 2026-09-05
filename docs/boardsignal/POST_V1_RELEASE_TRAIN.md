# BoardSignal Post-V1 Release Train

This file is the durable continuation contract for BoardSignal post-V1 work. New chats should read this file, `docs/boardsignal/CURRENT_CARRIAGE.md`, and the active carriage manifest before proposing or mutating code.

## Canonical repository and production branch

- Repository: `gatshaayanda/adminhub-global`
- Production branch: `boardsignal-v10`
- Production host: `adminhub-global.com`
- Vercel project: `adminhub-global`

Never assume a historical SHA is still current. At execution start, re-read the branch and Vercel Production. Mutation authority exists only when:

1. `boardsignal-v10` is known exactly;
2. Vercel Production is `READY`;
3. Vercel Production Git SHA equals `boardsignal-v10`;
4. the working tree is clean and based on that SHA.

If branch and Production differ, stop and reconcile the release line before new product mutation.

## Reference state when this train was established

On 5 September 2026, the identity-resilience release was reconciled to:

`92c8ab9440bef22f3d7a77960243a81a6f87b193`

This is a historical reference, not a permanent future baseline.

The product change itself is commit `864d82f09391449e553141f20477062d6098216f` (`Harden Chess.com identity resolution`), with the validation workflow commit `92c8ab9...` on top. The reconciled branch/Production state includes both.

## Train order

### V1-R0 — Release Harness

Purpose: make releases terminal-first, baseline-aware, reproducible, and independent of dashboard refreshing.

Owns:

- this durable train document;
- current-carriage pointer;
- machine-readable carriage manifests;
- `scripts/boardsignal-release.mjs`;
- the generic `BoardSignal Release Guard` GitHub Actions workflow;
- npm release helper commands.

No BoardSignal runtime behavior should change in R0.

### V1-R1 — Chess.com Source Truth & Identity Continuity

Purpose: make Chess.com identity and activity truth stable enough that BoardSignal never turns source uncertainty into fake inactivity.

Required outcomes:

- `player_id` remains the stable Chess.com identity authority;
- usernames become mutable aliases/metadata;
- rename repair is allowed only when a newly supplied current profile resolves to the same stored `player_id`;
- different `player_id` means hard stop: no merge, no automatic reassignment;
- one low-level Chess.com client sits beneath onboarding, Current, History and future adapters;
- remove duplicated resolver ownership where the identity layer depends on the high-level processor;
- typed collection states distinguish verified games, verified empty, variants only, identity attention, rate limit, temporary upstream failure, network failure and last-known-good fallback;
- only verified empty may become `0 games`;
- activity seen but not safely attributable must not be erased as zero;
- Current remains strictly period-bounded;
- an older last-known Chess.com game may appear only as freshness context, never as Current coaching evidence;
- empty Current becomes explicit (`NO GAMES THIS PERIOD`, period dates, last known game when safely available);
- standard-chess filtering is disclosed as such rather than saying the player did not play anything;
- 404/410/429/5xx/timeout/network states never masquerade as zero games;
- Founder Newsroom exposes source-health truth (`verified empty`, `temporarily unavailable`, `identity attention`, etc.);
- no Review cadence, coaching, P1/P2, Friends, Universe, PWA/privacy or deletion drift.

### V1-R2 — Session Continuity

Purpose: reproduce and eliminate the tester-reported repeated-login friction without rewriting working authentication blindly.

Proof matrix:

- sign in -> reload -> still signed in;
- new tab -> still signed in;
- browser close/reopen -> still signed in;
- installed PWA reopen -> still signed in;
- Android Chrome reopen -> still signed in;
- audit every custom-token entry path;
- canonical-origin check for bare domain / `www` / Vercel aliases because Firebase web persistence is origin-scoped;
- if browser persistence is unavailable, tell the player instead of silently forcing repeated auth.

### V1-R3 — Social Identity Continuity

Purpose: let Friends/Rivals consume the same stable identity model instead of inventing another username-repair system.

Required behavior:

- same stable player + renamed username can recover the existing relationship;
- provisional/review-needed identities preserve relationships with restricted interactions;
- revoked/deleted identities remain safely unavailable;
- genuine mapping mismatch hard-stops interaction;
- never bulk-delete legacy unavailable relationships merely because the UI cannot currently expose the identity;
- preserve the existing safety win: relationships must not silently disappear.

### V1-M1 — Multi-Source / Lichess

Purpose: integrate Lichess only after the source contract exists.

The earlier Lichess work based on historical SHA `c728d4f763b65ce07d2be4953458431b47384a82` is specification evidence only. Do not overlay or cherry-pick old implementation files onto the post-V1 tree.

Re-preflight from the actual landed Production SHA and rebuild against the normalized source adapter contract.

The existing Lichess acceptance matrix remains required: Chess.com UID preservation, existing-player connect, one-time prompt, permanent Profile option, Chess-only/Lichess-only/both onboarding, Google return, profile validation, unique source mapping, conflict safety, Chess.com adapter, Lichess adapter, normalized game pipeline, cross-source merge and dedupe, standard-chess filter, source-separated ratings, clock evidence, mid-period connect, completed Review immutability, Review source finalization, source-failure isolation, zero-vs-error truth, 429 cooldown, Founder source health without per-card API fanout, disconnect/change, deletion, privacy, offline, coaching, M7/M7.1, M8, Google/fallback access, Chrome, TypeScript, build and live Lichess contract proofs.

### V1-UX1 — Scan-First Companion

Purpose: continue the Companion shift without discarding the deeper editorial layer.

Principle: `more visual` means encode information visually, not decorate the page.

Priorities:

- compact result/opponent/time-control rows;
- W/D/L and source badges;
- board-position thumbnails where useful;
- Review-forming progress indicator;
- compact seven-day activity / freshness treatment;
- simple trend sparklines where data supports them;
- progressive disclosure for explanatory prose;
- preserve evidence/editorial depth lower in the page;
- fix mobile wrapping defects such as vertically broken `Refresh` controls;
- preserve tab IDs, URLs, badges, keyboard behavior and ARIA semantics.

### P4 — Public Performance History

Purpose: publish a traceable BoardSignal history book, not a Founder diagnostics dashboard.

Model:

`TODAY -> CURRENT 7 DAYS (FORMING) -> COMPLETED 7-DAY PERIODS -> EARLIER HISTORY`

Do not silently drop flat or inactive periods. Public output is aggregate/public-safe only. Individual weaknesses, notes, identity problems, source failures and Founder diagnostics remain private.

## Core invariants for every carriage

- Re-read branch + Production immediately before mutation and again before landing.
- No obsolete-baseline mutation.
- One carriage = one machine-readable manifest under `docs/boardsignal/carriages/`.
- Candidate must descend directly from the verified production baseline recorded in its manifest.
- Candidate may change only manifest-allowed paths.
- `package-lock.json` changes only when explicitly authorized by the carriage manifest.
- Prefer normal Git commits/patches. Do not transfer BoardSignal source via ZIP overlays, Base64 payloads, giant GitHub blob strings or old-tree reconstruction.
- Binary-asset ZIP workflows are reserved for real binary media cases, not ordinary BoardSignal source patches.
- Completed Review truth is immutable unless a carriage explicitly owns a migration with proof.
- Never weaken UID/player identity boundaries to make onboarding easier.
- Unknown/upstream-error state must never be represented as factual zero activity.
- A source-specific failure should degrade only that source when multi-source support exists.
- No new Founder API fanout that scales per visible player card.
- Preserve deletion, privacy, offline UID isolation, Friends safety, Universe safety and coaching regressions.

## Terminal-first release protocol

R0 installs the helper script and generic CI guard. The intended operator flow after R0 is:

```bash
# 1. Start from canonical production branch
npm run bs:preflight

# 2. After verifying Vercel Production is READY on the printed SHA,
# create a local candidate branch and implement exactly one carriage.

# 3. Prove scope + carriage-local checks
npm run bs:prove -- V1-R1

# 4. Push the candidate branch. The generic release guard runs remotely.

# 5. Wait in the terminal instead of refreshing GitHub UI
npm run bs:watch-ci

# 6. Find the READY Vercel deployment for the exact candidate SHA
npm run bs:find-deployment

# 7. Land only the exact proved commit + exact READY deployment
npm run bs:land -- V1-R1 <deployment-url-or-id>

# 8. Return to boardsignal-v10, pull/fetch, then re-run preflight and confirm
# Vercel Production reports the same SHA.
```

The release script intentionally refuses to force-push production. If `boardsignal-v10` moved after a carriage baseline was recorded, landing stops.

## Candidate branch convention

Use:

`boardsignal-v1-<carriage>-<short-purpose>`

Examples:

- `boardsignal-v1-r1-source-truth`
- `boardsignal-v1-r2-session-continuity`
- `boardsignal-v1-r3-social-identity`
- `boardsignal-v1-m1-lichess`
- `boardsignal-v1-ux1-scan-first`

The permanent release guard triggers on `boardsignal-v1-*` candidate branches. The production branch is not used as a test branch.

## Continuation protocol for future chats

Before continuing BoardSignal post-V1 work:

1. read this file;
2. read `docs/boardsignal/CURRENT_CARRIAGE.md`;
3. read the relevant manifest in `docs/boardsignal/carriages/`;
4. re-read `boardsignal-v10` from GitHub;
5. re-read Vercel Production and require `READY` + SHA equality;
6. only then continue the authorized carriage.

If conversation memory disagrees with the repository or live Production, the repository + verified live Production win.
