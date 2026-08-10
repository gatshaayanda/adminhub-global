# BoardSignal v10 working rules

## Product boundary

Work layer by layer. Finish and verify the current layer before starting the next one.

Current sequence:

1. Shareable responsive shell using real beta evidence.
2. Structured Desk data and manual founder import.
3. Private beta Desk links and player-specific views.
4. Public player pages and deliberate share cards.
5. Authentication, persistence and PWA hardening.
6. Automated Chess.com retrieval and Founder Lab processing.
7. Payments only after the experience and delivery loop work.

Do not add authentication writes, payments or an automated processing engine while Layer 1 is still being reviewed.

## Architecture to preserve

- Next.js App Router, TypeScript and Tailwind/PostCSS configuration.
- Firebase configuration structure and the local `.env.local` boundary.
- Vercel Analytics and Speed Insights.
- Existing middleware, admin protection, APIs and UploadThing integration.
- PWA manifest and service-worker foundation.
- Existing legacy routes until they are audited and deliberately migrated.

Do not replace the stack or delete a legacy system merely because it is not yet used by BoardSignal.

## Product and UX rules

- BoardSignal is a premium digital sports publication and personal athlete desk.
- Use editorial hierarchy, story ranking and varied card scale; never imitate a printed newspaper literally.
- Player > their week > BoardSignal brand.
- Mobile first. No horizontal page overflow at supported widths.
- Use restrained motion to guide focus and preserve continuity. Respect `prefers-reduced-motion`.
- A Desk is a progressive web experience, not eight PDF pages placed on one route.
- Public highlight, private weakness. Public coverage may show positive evidence anonymously. Red, Amber, Blue guidance, private reflections and detailed positions remain private unless the player deliberately shares them.
- Do not persistently service-worker-cache private `/app` or founder `/admin` responses.
- The base weekly loop is stateless: one fixed completed seven-day period produces one episode. A Blue Signal is advice, not a cross-week mission to grade.
- Normal onboarding is Chess.com username only. Manual PGN upload is an exceptional recovery path.

## Data rules

- Seed the interface from the real completed beta Desks in `src/data/boardsignal.ts`.
- Preserve factual caveats: pool separation, opponent context, sample size, historical last-active periods and unavailable rating boundaries.
- Never invent emotions, motivation, tilt, resilience, causality or engine claims not supported by the source.
- Public pages consume only each Desk's anonymous `publicStory`. Private/founder views may use the full seed.

## Safe change and deployment rules

- Work only on the `boardsignal-v10` branch. Never merge or push directly to `main` during beta shell iteration.
- Keep `.env.local`, `.next`, `node_modules` and local logs out of Git.
- Before each branch update, run `npx tsc --noEmit` and `npm run build` with the normal local Firebase environment available.
- Review the diff before committing. Do not remove Analytics, Firebase, middleware, PWA or APIs without a specific approved migration.
- Each pushed `boardsignal-v10` commit should produce a Vercel Preview deployment. Review that Preview on phone and desktop before starting the next layer.

## Installation/update rules

The local repository is the working copy. A source-only handoff may be extracted over it, but must never contain or overwrite `.git`, `.env.local`, `.next` or `node_modules`.

After applying a handoff:

```bash
npm install
npx tsc --noEmit
npm run build
git status --short
```

Only after those checks pass:

```bash
git add -A
git commit -m "Describe the completed BoardSignal layer"
git push
```
