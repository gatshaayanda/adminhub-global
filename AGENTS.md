# Admin Hub — Agent Instructions

## Product identity
- Admin Hub is the parent/front door: Apps · Games · Products · Experiments.
- Admin Hub is its own brand/business. Do not turn the public site into a founder-led personal brand or imply that the site is primarily about Ayanda.
- Ayanda is the person who built Admin Hub and the projects behind it, but the homepage should present the work as Admin Hub work.
- The homepage is a commercial landing surface first: clear, confident, useful, and product/work focused.

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
  - Direct “Have an idea? Let’s build it.” CTA
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

## Project origin notes for future context
These are factual background notes for writing project descriptions/case-study copy:
- BOEMO Joos Food Deals: a mobile kitchen project. The operator wanted students to place orders in class so orders could be collected together and meals prepared in an organised batch. Ayanda was referred by someone and agreed to split gross profit on the work.
- Translend: the client had an HTML design/workflow they were struggling to make function as intended. They asked Admin Hub to take over implementation because they knew Ayanda built applications. The current pipeline is the resulting working system. The client paid for the work and can continue using it and consult Admin Hub for revisions.
- Meating Place: employees advocated for a system like this and pushed it to the owner for review as a possible product to buy/use.
- Namane Tyres: the client wanted customers to book services and monitor work progress. The client has paid for and uses the application, including its offline-capable version, and is happy with it and its customer use.
- PurePress: the client likes the application and has indicated willingness to pay P100/month. Other projects have similar real-use, paid, pilot, or pipeline status; do not collapse these into one unsupported claim.
- Shooters Trigger: inspired by Ayanda’s experience playing paintball on his birthday and by his interest in games. It combines the Wardrobe, Hall, President’s Shoes, and the reusable game-mechanics system. The current 11th-iteration game engine is intended to make it faster to create future games with different themes, styles, and stories.
- Paintball reference/video supplied by Ayanda: https://www.youtube.com/shorts/h6PBHpHkZgg. Treat it as inspiration/source context, not as a required homepage link.

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

## Opportunity search — already applied / do not repeat
- Added 2026-09-30 as an application-tracking checkpoint.
- The following companies were already researched and applied to. Do not return them as new opportunities unless the user explicitly asks for a follow-up, a different role, or a materially new opening:
  - Banzena — https://www.banzena.com/careers
  - Crawlability.ai — https://crawlability.ai/company/careers
  - Gleam — https://gleam.io/jobs
  - Meza AI — https://meza.ai/careers
  - Channlize — https://landing.channlize.com/careers
  - TheDeskMonitor — https://thedeskmonitor.com/careers
  - Passion.io — https://passion.io/
  - Stat Sniper — https://statsniper.com/tr/careers/
  - Pickar — https://www.pickar.ng/careers
  - DashRDP — https://dashrdp.com/careers
  - Kwamle Media — https://kwamlemedia.com/careers
  - Nastrum — https://nastrum.com/careers
  - SecureCheap — https://securecheap.com/careers
  - Cartlytics — https://cartlytics.co/careers
  - Nexa — https://www.nexa.courses/careers
  - QueryWing — https://querywing.com/careers
  - NexCode Nova / ExiusCart — https://www.exiuscart.com/careers
- Search rule for future opportunity research: start from the current date and work backwards; prefer small/founder-led/global companies and direct human routes; exclude generic job boards, faceless recruiter routes, US-only/region-locked roles, and opportunities that are only vaguely described as “remote.” Verify global eligibility and a direct official company route before presenting an opportunity as confirmed. Include games/browser/Phaser opportunities alongside apps, SaaS, product, technical operations, support, and systems work.

- Additional 2026-09-30 application checkpoint: user has now applied to the relevant opportunities from the next search batch. Do not return these as new opportunities unless the user explicitly asks for a follow-up, a different role, or a materially new opening:
  - Nexorlio — https://nexorlio.com/careers
  - New Machine — https://newmachine.com.ph/careers/
  - Vision Game Studios — https://www.visiongst.com/careers.html
  - Games Mostly — https://games-mostly.com/careers/
  - Wysera — https://wysera.ai/careers
  - Hopsule — https://hopsule.com/careers
  - Ziploy — https://ziploy.io/careers
  - Shally.io — https://shally.io/careers
  - SaaSTweaks — https://saastweaks.com/careers
  - CodeLearn Academy — https://www.codelearnacademy.com/careers
  - Fyutrex — https://www.fyutrex.com/careers
  - Shally.app — https://shally.app/career

## Permanent opportunity-search exclusions and requirements
- Never return "might be global" opportunities. If worldwide/global eligibility is not explicitly verified, do not present it as a confirmed global opportunity.
- Do not use generic job boards, faceless recruiter routes, anonymous application funnels, mass-application platforms, or intermediary approaches when a direct company/human route is available.
- Do not prioritize mass faceless corporations. Prefer small owner-led, founder-led, family-run, independent, boutique, indie, or genuinely small online businesses and product companies where a real person can realistically see the full application.
- Do not recommend approaches that require pretending to be a different seniority, specialization, location, or experience level.
- Search for actual businesses that have a real online presence or operate an online/digital business and could benefit from someone who can both build and operate practical software/products.
- The user's target is broader than conventional developer jobs: identify small businesses that could hire or contract a hybrid product builder / technical operator / customer-support or implementation person.
- Search context for the user must include both reusable engines: (1) the business-app/PWA engine that can produce installable mobile-first business/customer systems and (2) the browser/PWA game engine that can produce additional games/interactive experiences.
- Treat the user's 10+ years as an independent remote contractor for a UK web-app company, plus shorter paid projects/contracts such as Markee and RedPlanet, as relevant operational evidence.
- Treat paid client work as evidence of real commercial delivery, distinguishing ongoing, preliminary/pilot, and complete work rather than collapsing all projects into one status.
- Treat the user's Canadian New Media Journalism education, international publication through Canadian student presses, certificates and continuing learning/development as evidence of research, communication, documentation, source evaluation, interviewing and learning ability.
- Include small businesses that may need product implementation, technical customer success, support engineering, SaaS operations, business systems, frontend/product development, QA, research/content, game development, community/customer work, or a hybrid role.
- When searching, work from the current date backwards and favor newly active opportunities first. For each result, verify the business/company itself, the actual opportunity or plausible direct hiring need, the human/direct route, and why the user's combined evidence is relevant.

## Small-business direct-offering search expansion
- Additional opportunity-search expansion (2026-10-01): in addition to software companies and indie game studios, search for small real-world businesses in Europe and North America that have the same characteristics as businesses such as Atlas Service Centre: owner-operated or independently run service businesses, workshops, repair shops, trades, automotive/trucking, transport/logistics, equipment/service companies, local professional services, specialist retailers, and other established small businesses with a real online/local presence but weak or missing digital systems.
- These businesses are potential direct-offering targets, not only conventional job vacancies. Look for businesses that could plausibly benefit from a custom customer-facing app/PWA, booking/request workflow, job/status tracking, ordering, CRM/customer portal, dashboard, notifications, offline-capable field workflow, or branded interactive/game experience.
- Europe and North America are specifically in scope for this business-prospecting search. Prefer businesses where an owner/founder/manager can be contacted directly through an official website email, contact form, phone/WhatsApp where publicly provided, or another clearly human route.
- Treat a Google Maps/local-business profile with a real business name, address, phone, category, operating presence, reviews/photos, and/or missing website as a useful lead signal. A missing website is not proof that the business needs software; verify the business and look for a concrete digital opportunity before presenting it.
- Search these small-business prospect categories alongside software/game companies: truck/auto repair and service centres; mechanics and garages; transport/fleet businesses; tyre and parts shops; construction/trades; equipment rental/service; industrial/service workshops; cleaning/maintenance companies; local wholesalers/distributors; specialist retailers; clinics/professional practices where appropriate; hospitality/food operators; schools/training providers; independent agencies; and other small service businesses whose workflow could reasonably be improved by software.
- The offering to test against each prospect is the user's reusable business-app/PWA engine first, with the browser/PWA game engine as a secondary angle where a branded game, training experience, promotion, customer engagement, or interactive product makes sense. Do not force a game pitch onto businesses where it is irrelevant.
- For these business prospects, do not require a published job vacancy. The search should identify businesses that could plausibly buy/contract the user's capability or create a hybrid implementation/operations role. Clearly label the distinction between an advertised job and a direct business-development/contract prospect.
- Continue to apply all existing exclusions: never return a business/company already researched or applied to as a new target; never use generic job boards or faceless intermediaries when a direct route exists; never describe a prospect as globally accessible/hiring unless that is verified. For Europe/North America prospecting, the geographic requirement means the business itself is located/operating there; it does not mean the business is required to advertise a global job.

## Build Log feature
- The approved Build Log is a contained evidence feature: public /updates chronological history, public /updates/[slug] detail pages, and a restrained latest-update signal near the homepage hero.
- Admin CRUD lives at /admin/updates and uses the existing protected admin area.
- Build Log records use the server-side Firebase Admin SDK through Next.js route handlers. Public visitors never receive Firebase credentials and the new buildUpdates collection intentionally falls through to the existing deny-all rule.
- Do not seed Build Log content. The first public entry should be created deliberately through the admin UI.
- View counts are aggregate counts only. A short-lived first-party cookie prevents the same browser from incrementing the same update repeatedly within a 15-minute window; no IP addresses or visitor identities are stored.
- Status lifecycle: Exploring → Building → Testing → Live → Paused → Archived.
- Categories: Build / Release / Research / Client / Platform.
- Preserve the existing homepage golden baseline. Build Log is an additive evidence layer; do not redesign the homepage around it.
- The existing Firestore rules for legacy blogs / projects are not part of this feature's migration. Do not broaden or replace those rules while implementing Build Log.
