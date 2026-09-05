# BoardSignal Current Post-V1 Carriage

Canonical train: `docs/boardsignal/POST_V1_RELEASE_TRAIN.md`

## Current state

`V1-R0 — Release Harness`

R0 establishes the durable release train, carriage manifests, terminal-first release helper and generic release guard. It has no intended BoardSignal runtime behavior change.

Historical baseline used to prepare R0:

`92c8ab9440bef22f3d7a77960243a81a6f87b193`

That SHA was verified as both `boardsignal-v10` and Vercel Production `READY` immediately before R0 mutation authority.

## Next authorized product carriage after R0 lands

`V1-R1 — Chess.com Source Truth & Identity Continuity`

Do not begin R1 mutation until R0 is landed and branch/Production parity has been re-proven from the actual live SHA.

R1 must incorporate the current Chess.com identity-resilience behavior rather than replace it, and must preserve stable numeric `player_id` ownership, Google onboarding collision safety and all existing Review/social/privacy/offline invariants.

## Known subsequent train

`V1-R2 Session Continuity -> V1-R3 Social Identity Continuity -> V1-M1 Multi-Source/Lichess -> V1-UX1 Scan-First Companion -> P4 Public Performance`

The old Lichess implementation baseline `c728d4f...` is not executable mutation authority. Its acceptance matrix survives as specification only.
