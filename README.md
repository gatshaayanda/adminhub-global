# BoardSignal v10

BoardSignal is a personal sports desk for everyday Chess.com players. The current v10 branch is a seeded product shell built on the existing Admin Hub Next.js, Firebase, analytics and PWA foundation.

## What this shell contains

- `/` and `/boardsignal` — universal player-first username entry
- `/player/[handle]` — approved seed when available; otherwise a live public-data Desk build for that Chess.com username
- `/api/boardsignal/[username]` — canonical player confirmation, archive retrieval, fixed-week selection, last-active fallback, factual processing and legal candidate reconstruction
- `/feed` — secondary approved public coverage moments
- `/how-it-works` — username-to-Desk methodology
- `/join` and `/connect` — username-only legacy entry aliases; no account form
- `/app` — Ayandakopano's seeded private Player Room
- `/app/desk/[episode]` — week, weakness, guidance and evidence experience
- `/app/archive`, `/app/feed`, `/app/profile`
- `/admin`, `/admin/desks`, `/admin/coverage`, `/admin/players`, `/admin/exceptions`

The 14 completed beta reports seed approved player-specific outcomes. Any other valid username uses the Chess.com PubAPI at runtime. Selected legal positions are reviewed in the player's browser using the included GPL-3.0 Stockfish WASM build. Membership, payments and forced account creation remain deliberately outside Shell 01.

The live processor is factual and restrained: it separates rating pools, discloses last-active periods, labels recorded rating boundaries honestly and does not infer tilt, motivation or psychology from result sequences.

## Preserved foundation

- Next.js 15.5.15 and TypeScript
- Firebase client/admin configuration structure
- Firebase Analytics, Vercel Analytics and Speed Insights
- middleware protection for `/admin`
- service worker, install prompt and web app manifest
- UploadThing and existing API patterns
- Chess.com public archive processing with `chess.js`
- Browser-side Stockfish WASM under GPL-3.0 (`public/stockfish/Copying.txt`)

Legacy routes remain in the source until they are deliberately mapped, migrated or retired. They are not linked from the BoardSignal navigation.

## Local setup

```bash
nvm use 20.19.0
npm install
npm run dev
```

Keep `.env.local` on your machine. It is ignored by Git. For now, use the existing variables only to load the shell; do not sign into or write to the old Firebase project.

## Verification

```bash
npx tsc --noEmit
npm run build
```

The baseline architecture includes older routes with lint warnings. The v10 shell compiles, passes TypeScript and completes a production build.
