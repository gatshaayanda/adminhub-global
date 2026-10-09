# Admin Hub — Agent Instructions

## Product identity
- Admin Hub is the parent/front door: Apps · Games · Products · Experiments.
- Admin Hub is its own brand/business. Do not turn the public site into a founder-led personal brand or imply that the site is primarily about Ayanda.
- Ayanda is the person who built Admin Hub and the projects behind it, but the homepage should present the work as Admin Hub work.
- The homepage is a commercial landing surface first: clear, confident, useful, and product/work focused.

## Evidence, payments, and identity verification
- When assessing Trustpilot or another review/dispute record, treat it as relevant context when the transaction or service under review actually occurred through that platform or is connected to the transaction being discussed. Do not assume Trustpilot itself processed a payment merely because a review exists.
- For payment tracing, preserve the exact payment-provider and account/display names as shown in the evidence (for example PayPal, Wise, or the relevant e-wallet name), alongside transaction dates, references, amounts, and counterparties where available. Distinguish verified records from recollection or inference.
- A police-certified copy of an identity card, Trustpilot account details, and WhatsApp-number details may be supporting identity/continuity evidence when legitimately relevant. Describe what each record can establish; do not imply that any one item proves a transaction or allegation by itself.
- Treat identity documents, phone numbers, payment-account details, transaction references, and private correspondence as sensitive. Do not put them in public website copy, public GitHub files, commit messages, issues, or other public-facing materials. Keep the full documents in an appropriately private, access-controlled evidence location and share only the minimum necessary with the relevant authorized recipient.
- In public copy, summarize the existence and relevance of supporting evidence without publishing document scans, ID numbers, full phone numbers, account identifiers, or private transaction details. Redact copies made for wider circulation.
- Do not upload the user's identity document or financial records to this repository. If these materials are needed for a review, ask for or use them only in a suitable private context and keep conclusions proportional to what the evidence actually shows.

## Homepage catalogue interaction — 2026-10-08
- The homepage `01 / THE PROBLEMS` section is intentionally compact: industries are presented as a truncated/accordion list rather than a wall of project cards.
- Each industry row shows the business problem in one concise line. Clicking the row expands only that industry's projects.
- Each expanded project is a compact row. Clicking it opens the project preview modal; the modal must be closable by its Close control, backdrop, or Escape.
- Keep real project links, statuses, roles, videos/images and descriptions from `src/data/publicProducts.ts`; do not invent URLs or claims.
- `02 / GAMES` remains a separate games surface.
- `03 / THE BUILD` uses the proof carousel. It must auto-advance on a timer when motion is allowed. Do not disable automatic cycling merely because the pointer is over the carousel; keyboard focus may pause it for accessibility.
- Homepage founder-name redaction remains mandatory.
- Current homepage interaction implementation checkpoint: compact problems accordion + project preview modal + automatic proof carousel.
- Deployment checkpoint: after the Vercel daily deployment limit clears, deploy the current main commit before production QA.

## Homepage direction
- The approved visual direction is the previous clean/light editorial style, not a dark flyer/campaign aesthetic.
- Use the existing light Admin Hub shell/header/footer language as the baseline.
- Keep the homepage simple: Apps + Games, concise explanation, real project links, build proof, and a direct CTA.
- Do not reintroduce the old corporate/control-platform catalogue feel.
- Do not use founder, founder-led, or similar positioning on the public homepage unless explicitly requested.
- Avoid unnecessary visual effects, heavy gradients, glass panels, oversized dark-canvas typography, or dark-flyer styling.
- Keep mobile-first and make the desktop composition feel intentional too.

## Golden baseline / scope lock
- The current Admin Hub homepage, shell, typography, layout, project presentation, and existing project destinations are the approved golden baseline.
- Do not redesign, refactor, reorder, rename, or "clean up" unrelated homepage content while making catalog/PWA changes.
- For the current catalog update, the only intended product changes are: (1) refresh/cache-bust the existing Admin Hub PWA logo/icon references and (2) add the two newly created app links listed below.
- Do not modify the two newly created products themselves from this repository.
- Unexpected result = STOP → inspect reality → then act. Do not make compensating or speculative changes.

## Hero video
- public/video/admin-ad.mp4 is the Admin Hub landing/showreel video.
- The video must preserve its native aspect ratio. Never crop it with object-fit: cover merely to fill a desktop rectangle.
- Desktop: give the video a proportionate, contained presentation so the full composition remains visible and does not look awkward or stretched/cropped.
- Mobile: keep the video large enough to be useful while preserving its proportions.
- Autoplay should remain muted, looping, and playsInline; respect reduced-motion/accessibility considerations.
- If the local video remains visually unsuitable after proportional treatment, evaluate an external hosted version (for example YouTube) before redesigning the entire page around it.

## Homepage content
- Core message:
  - ADMIN HUB
  - Apps · Games
  - Software and interactive experiences built for real use.
- Preferred narrative:
  - What Admin Hub builds
  - Apps
  - Games
  - Idea → build → test → improve
  - Direct "Have an idea? Let’s build it." CTA
- Keep copy factual. Do not exaggerate client outcomes, revenue, scale, or technical capability.

## Project links and evidence
Use real project destinations when a project is named. Current known destinations:
- BoardSignal: /boardsignal
- Translend: https://translend-tms.vercel.app/pipeline
- BOEMO Joos Food Deals: https://boemo-joos-food-deals.vercel.app/
- Meating Place: https://meating-place.vercel.app/
- Namane Tyres: http://namane-tyres.vercel.app/
- PurePress: https://purepress-omega.vercel.app/
- Admin Hub Games: https://admin-hub-games.vercel.app/
- Exquisite Waterproof Services: https://exquisite-waterproof-services.vercel.app/
- Atlas Service Centre: https://atlas-service-centre.vercel.app/
- Shooters Trigger currently lives within Admin Hub Games; do not invent a separate URL unless one is actually created.
- President's Shoes and Hall are games within the Admin Hub Games catalogue unless separate verified routes are available.

## Architecture / safety rails
- Preserve /boardsignal as its own product shell and do not merge its styling into the Admin Hub marketing surface.
- GitHub main is the source-of-truth branch.
- Inspect actual files, current branch/commit, and relevant routes before making changes.
- Build before checkpoint and verify deployed routes visually when possible.
- Prefer the smallest controlled change.
- Keep external project links accurate; never invent a project URL.
- Keep accessible focus states, usable touch targets, and prefers-reduced-motion support.
- The 25GB/500-user language is a planning model, not a universal quota or unlimited-capacity guarantee.

## Deployment checkpoint discipline
- A "push" is not complete for user QA until the intended commit is actually on main, Vercel has produced the corresponding deployment, the deployment is READY, and the production URL has been checked for the changed route(s) when practical.
- Do not report a push as ready to test while production is still serving an older deployment.
- If a deployment trigger does not fire, inspect Vercel/Git integration and resolve the deployment state before asking the user to test.
- Prefer promoting a verified READY deployment over creating unnecessary code changes.
- Never change Firebase rules or unrelated application code merely to force a deployment.

## Rates / business page copy and CTA lock — 2026-10-09
- Write Rates for ordinary small-business owners, not software developers. Use plain, concrete language; remove jargon, abstract commercial language, and long caveats that obscure the offer.
- Explain the idea simply: a branded app for the business, with $25/month as an illustrative running-cost example (roughly the price of airtime), not a universal promise or fixed price for every product.
- Explain the example clearly: 500 users × approximately 50 MB each per month = approximately 25 GB of monthly data transfer. State briefly that transfer is data moving through the app and is different from stored files. Do not bury this in infrastructure terminology.
- Explain one-time setup/build fees plainly: discussed and agreed before work starts; suitable pilot/partnership work may qualify for a reduced or waived fee. Never imply every custom app is automatically free.
- Keep other required Rates disclosures and evidence sections intact unless explicitly asked to change them.
- Do not add redundant enquiry/contact CTAs to the Rates page. The page's top hero must not have a competing "Start an enquiry" button, and the final proof section must not add "Ask Admin Hub a question". Preserve the relevant "Back to the work" and "Explore published work" links.
- For Rates copy corrections, change only the specifically identified copy and CTAs. Leave setup-fee policy, verification, reviews, payment disclosures, referrals, independent-reference carousel, and homepage content untouched unless requested.
- Verify the exact changed route and production deployment status after pushing. A commit being pushed is not proof that production is READY.
