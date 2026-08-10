# BoardSignal v10

BoardSignal is a personal sports desk for everyday Chess.com players. The current v10 branch is a seeded product shell built on the existing Admin Hub Next.js, Firebase, analytics and PWA foundation.

## What this shell contains

- `/` — newspaper-style BoardSignal Universe
- `/feed` — approved public coverage moments
- `/how-it-works` — username-to-Desk methodology
- `/pricing` — seeded membership model
- `/join` and `/connect` — onboarding preview
- `/app` — private Player Room
- `/app/desk/[episode]` — seven-day Desk episode
- `/app/archive`, `/app/feed`, `/app/profile`
- `/player/[handle]` — public positive-only player page
- `/admin`, `/admin/desks`, `/admin/coverage`, `/admin/players`, `/admin/exceptions`

The reports and processing engine are not connected yet. Seeded data demonstrates the intended information architecture and privacy rules.

## Preserved foundation

- Next.js 15.5.15 and TypeScript
- Firebase client/admin configuration structure
- Firebase Analytics, Vercel Analytics and Speed Insights
- middleware protection for `/admin`
- service worker, install prompt and web app manifest
- UploadThing and existing API patterns

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
