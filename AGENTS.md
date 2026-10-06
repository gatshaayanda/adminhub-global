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

## OPPORTUNITY TRIGGER

**Trigger word: `HUNT`**

When the user sends exactly **HUNT** (case-insensitive), immediately execute the complete Opportunity Research protocol below.

Do not ask what the user means.
Do not explain the protocol.
Do not provide commentary before the results.
Do not repeat old results.
Do not return a planning response.

A **HUNT** must produce a fresh set using the current repository/live-site inspection, exclusion ledgers, job filters and business-pitch filters defined below.

The response must contain only the resulting opportunity set:
1. **JOBS / CONTRACTS**
2. **DIRECT BUSINESS PITCHES**

For every returned opportunity, include its direct link(s) and the required verification details defined below.

After producing the new set, update this AGENTS.md in the same working session with the new results:
- add each returned company/job to the relevant job exclusion ledger so it will not be returned as a fresh result in a later HUNT;
- add each returned business to the business exclusion ledger;
- record the HUNT date and the result status where useful;
- do not overwrite or remove earlier exclusion entries;
- do not add rejected candidates to the exclusion ledger merely because they were considered;
- only add candidates actually returned to the user.

If the user says **HUNT** again in a new chat, treat it as a completely new search cycle: inspect the current Admin Hub repo/live site first, read the accumulated exclusion ledgers, search today backwards, and return only new qualifying results.

## Opportunity research — RESET / STRICT OPERATING PROTOCOL — 2026-10-05

This section replaces all previous opportunity-search parameters. The old search strategy is scrapped. Keep the exclusion ledger below, but do not inherit old search assumptions, categories, rankings, or prospecting preferences.

### MANDATORY FIRST STEP IN EVERY NEW OPPORTUNITY CHAT

Before searching for a single job or business prospect, inspect the current Admin Hub product reality in this order:

1. **Inspect the Admin Hub landing page in the GitHub repo.**
   - Start with the actual homepage route/component and its current project data.
   - Inspect the current Apps, Games, build-proof, CTA and visible positioning.
   - Inspect enough related project/showcase files to understand what the public portfolio actually proves.
2. **Inspect the live landing page:** https://www.adminhub-global.com/
3. **Compare GitHub vs live.**
   - Record meaningful differences in project order, projects shown, games shown, descriptions, positioning, videos, links, claims and current public proof.
   - Treat the repository as the implementation source of truth and the live site as the public-market reality.
   - Do not claim the live site demonstrates something it does not currently show.
4. **Inspect the exclusion ledger below before searching.**
5. Only then search the web for new opportunities.

This inspection is mandatory for every new chat/session that performs opportunity research. Do not skip it because a previous conversation already inspected the site.

### CURRENT ADMIN HUB POSITIONING TO MATCH AGAINST

The current landing page presents Admin Hub as:
- ADMIN HUB
- Apps · Games
- Software and interactive experiences built for real use.
- Real business/product applications.
- Playable games and interactive experiences.
- Idea → build → test → improve.
- A reusable app framework and Phaser-based game development capability.
- Direct build work for real businesses and products.
- A public portfolio that should be used as evidence, not merely described abstractly.

The opportunity search must use the **actual current landing-page evidence** after performing the mandatory GitHub/live comparison. Do not rely on an old portfolio description stored in this file when the current landing page has changed.

### USER'S REAL WORK PROFILE

Match opportunities against the complete evidence, not a generic developer label:

- Technical Operations & Product Systems Specialist.
- Product builder / product operator.
- 10+ years as an independent remote contractor for a UK web-app company.
- Additional paid/project work including Markee and RedPlanet.
- Real paid/ongoing/pilot/preliminary/completed client product work through Admin Hub.
- Reusable business-app/PWA engine capable of producing additional installable mobile-first business/customer systems.
- Reusable browser/PWA game engine capable of producing additional games and interactive experiences.
- React / Next.js / TypeScript / JavaScript.
- PWA/service-worker/offline-capable product work.
- QA, troubleshooting, release verification and production debugging.
- Technical customer support, implementation and onboarding.
- Product/system design from business problem → workflow → build → test → iteration.
- Business systems, dashboards, booking/order/request flows, customer progress/status, notifications and operational workflows.
- Browser games / HTML5 / Canvas / Phaser / JavaScript.
- Game production, game QA, interactive experiences and reusable game mechanics.
- Practical AI/automation implementation.
- Canadian New Media Journalism education, international publication through Canadian student presses, certificates and continuing learning/development.
- Research, documentation, interviewing, source evaluation, communication and practical product ownership.

Never inflate client count, revenue, users, scale, employment status or project status.

### LANE 1 — JOBS / CONTRACT WORK

This is always searched **first**.

#### REQUIRED HUNT RESULT COUNT — JOBS

Every HUNT must aim to return a **set of 10 qualifying jobs/contracts**.

- Search deeply enough to identify 10 real qualifying opportunities, not merely the first 10 search results.
- Search from **today backwards** and continue through additional queries/pages/sources as needed until 10 candidates pass every hard filter.
- Do not substitute weaker candidates just to reach 10. If fewer than 10 genuinely pass every hard filter after a thorough current search, return only the number that actually pass and state that the qualifying pool was exhausted.
- Every returned job must have a working, current direct link that leads to the **exact live vacancy/application page** for the named role.

### ACTUAL JOB LINK VERIFICATION — HARD FILTER

Before returning a job, open/check the direct link itself. It must resolve, match the exact company and role, show the role is currently open, and be usable as the actual application route. Reject links to generic careers pages, company homepages, search results, aggregators, expired/closed postings, 404s, or unrelated roles. Search snippets and URL appearance are not proof.

### Geography — HARD FILTER

Only search:
- **North America:** United States and Canada.
- **Europe:** European countries.

The role must be **remote**.

The employer must explicitly state that the remote role accepts international applicants/contractors or otherwise explicitly permits someone based in Botswana to work the role. Do not infer eligibility from the word "remote."

Do not return:
- Africa-based roles.
- Asia-based roles.
- Latin America-based roles.
- Middle East-based roles.
- "Remote" with no geographic eligibility.
- US-only/Canada-only/EU-country-only roles unless the stated eligibility actually permits Ayanda to work from Botswana.
- "Remote within X timezone/region" when Botswana is excluded.

#### Employer profile — HARD PREFERENCE

Prefer:
- mom-and-pop businesses;
- founder-led businesses;
- family-run businesses;
- independent software companies;
- micro-SaaS;
- boutique digital/product agencies;
- small educational/learning companies;
- independent publishers/media businesses;
- indie game studios;
- small interactive/product companies;
- genuinely small teams where a real person can evaluate the CV and portfolio.

Do not use "small" as a reason by itself. There must be evidence of a real small/human-led operation.

#### Actual role — HARD FILTER

There must be a **specific current role or concrete current contract opportunity**.

Acceptable lanes include:
- product builder;
- product/technical operations;
- technical customer success;
- implementation/onboarding;
- technical support;
- support engineering;
- product operations;
- business systems;
- frontend/product development;
- React/Next.js/TypeScript/JavaScript;
- PWA/web-app development;
- QA/release/product testing;
- browser game/HTML5/Canvas/Phaser development;
- game production/technical game work;
- documentation/research where the technical/product combination is genuinely relevant;
- practical AI/automation implementation.

Reject:
- "Don't see your role? Reach out anyway."
- Open/speculative applications.
- General talent pools.
- "We're always hiring."
- No current role.
- A role that is materially outside Ayanda's evidence.
- Roles where the core requirement is advanced ML research, deep DevOps/SRE, advanced security, advanced native mobile, enterprise architecture, or another narrow specialization Ayanda cannot demonstrate now.
- Roles requiring seniority/credentials materially beyond the evidence.
- Commission-only sales or unpaid work.
- Stale/closed/broken roles.

A job is not a fit merely because Ayanda could theoretically learn it.

#### Human route — HARD FILTER

The final route must be direct:
- official company careers page;
- official employer ATS;
- official company application form;
- official company hiring email;
- named founder/hiring manager/team route;
- direct company hiring post where the employer can be established and the application route is real.

Third-party sources may be used only for discovery. Verify the role on the employer's own current source before returning it.

Never use as the final application route:
- Wellfound;
- LinkedIn Jobs;
- Indeed;
- Glassdoor;
- ZipRecruiter;
- Remote OK;
- We Work Remotely;
- FlexJobs;
- Remote.co;
- Remotive;
- generic remote-job boards;
- scraped aggregators;
- recruiter marketplaces;
- mass application platforms.

#### Freshness

Search from **today backwards**.

For every returned role verify:
- exact company;
- exact role;
- current/open status;
- posted/updated date where available;
- current direct application route;
- explicit remote geography;
- material fit;
- not already in the exclusion ledger.

"Found today" is not the same as "new." A search-engine result is not evidence that a role is current.

Never pad the list. If only two jobs survive, return two.

### JOB EXCLUSION LEDGER — DO NOT RETURN AS NEW

These are already researched/applied/processed and must not be returned as fresh opportunities unless Ayanda explicitly asks for a follow-up, materially different role, or new opening:

- Banzena
- Crawlability.ai
- Gleam
- Meza AI
- Channlize
- TheDeskMonitor
- Passion.io
- Stat Sniper
- Pickar
- DashRDP
- Kwamle Media
- Nastrum
- SecureCheap
- Cartlytics
- Nexa
- QueryWing
- NexCode Nova / ExiusCart
- Nexorlio
- New Machine
- Vision Game Studios
- Games Mostly
- Wysera
- Hopsule
- Ziploy
- Shally.io
- SaaSTweaks
- CodeLearn Academy
- Fyutrex
- Shally.app
- PMSuite
- Zinex Solutions
- KrissDevHub
- Careerswift
- LaunchBrightly
- AI Scaling / Wellfound Senior Full-Stack Product Engineer
- Any Wellfound listing, regardless of employer
- LeadJourney
- AMEWIX
- Koast.ai
- Orderna POS
- ConveyThis
- GoodTime
- arenaflex
- Robinzone
- Hiveku
- ArtX Studio

Also treat any company already returned/applied to in prior opportunity research as excluded even if a search engine presents a repost, renamed vacancy, different branch, different location tag or generic new title.

If there is uncertainty about whether a company was already processed, search the existing project/conversation context before returning it.

### LANE 2 — DIRECT BUSINESS PITCHES

Only search this lane **after the job search**.

This is a **customer-acquisition / direct-contract search**, not a job search.

### REQUIRED HUNT RESULT COUNT — BUSINESSES

Every HUNT must then aim to return a **set of 5 qualifying direct business prospects**.

- Search deeply enough to identify 5 real qualifying businesses, not merely the first 5 directory results.
- Search from **today backwards** for current activity and continue through additional queries/sources as needed until 5 businesses pass every hard filter.
- Do not substitute weaker businesses just to reach 5. If fewer than 5 genuinely pass every hard filter after a thorough current search, return only the number that actually pass and state that the qualifying pool was exhausted.
- Every returned business must have verified current public contact/social links that actually lead to the business.

### BUSINESS LINK VERIFICATION — HARD FILTER

Before returning a business, verify each required route itself: the business identity/location matches, the public WhatsApp route resolves to the business/contact route, the other social profile belongs to the business and is active, and the no-website condition has been checked against the business's current public presence. Generic directory/search pages are not sufficient.

### BUSINESS TARGET — HARD FILTER

The target must be:
1. A real, active small business.
2. Located/operating in **North America or Europe**.
3. **No official business website** at the time of research.
4. Has a **public WhatsApp route**.
5. Has at least **one other active public social presence**, such as Facebook, Instagram, TikTok or similar.
6. Has a real human/owner/manager-accessible route.
7. Has a visible business workflow that could plausibly benefit from software.
8. Is not already in the business exclusion ledger.

Do not relax the "no website + WhatsApp + other social" rule. These are now deliberate prospecting parameters.

A Facebook page alone is not enough if there is no evidence of an active business.

### BUSINESS TYPES TO PRIORITIZE

Prioritize owner-operated or small businesses where the PWA engine can solve a visible operational problem:

- field-service businesses;
- trades and contractors;
- equipment/tool rental;
- specialist repair/service;
- mobile mechanics;
- heavy-truck/equipment service;
- tyre/service businesses;
- cleaning/maintenance;
- landscaping/property maintenance;
- construction subcontractors;
- small transport/fleet businesses;
- specialist retailers;
- wholesalers/distributors;
- event/equipment businesses;
- hospitality/food operators;
- education/training providers;
- independent agencies;
- small online/social-commerce businesses.

Do not force the game engine onto a business where it has no obvious commercial use.

### BUSINESS BUYING SIGNALS

Look for observable evidence such as:
- many customer enquiries handled through WhatsApp;
- booking/request activity;
- jobs/work orders;
- quotes and follow-ups;
- recurring service;
- staff/vehicle/equipment coordination;
- manual customer-status communication;
- customer photos/documents;
- appointment scheduling;
- delivery/pickup;
- inventory/availability;
- active Facebook/Instagram marketing;
- growth/expansion;
- multiple staff/assets;
- obvious use of spreadsheets/paper/manual messaging.

Do not invent pain. State only what the public evidence supports.

### BUSINESS PITCH

Lead with one small, credible first workflow rather than selling a giant system.

Potential first builds:
- customer/request intake;
- booking;
- quote/request pipeline;
- job/work-order tracking;
- customer progress/status;
- scheduling;
- customer portal;
- photo/document collection;
- notifications;
- ordering;
- inventory/availability;
- field/offline workflow;
- dashboard;
- automation/integrations.

The business-app/PWA engine is the default commercial offer.

The browser/PWA game engine is secondary and should only be proposed for a real use case such as:
- training;
- education;
- promotional engagement;
- branded interactive experience;
- event activation;
- customer loyalty;
- entertainment/product experience.

### BUSINESS EXCLUSION LEDGER

Keep and extend a separate exclusion list for every direct-pitch business researched or contacted.

Never return a business as new if it was already:
- researched in a previous prospecting batch;
- contacted;
- pitched;
- rejected;
- marked unsuitable;
- already a client;
- already part of an active client pipeline.

When a new business is presented and the user subsequently confirms it was contacted, add it to this ledger in the next AGENTS.md checkpoint.

### REQUIRED RESULT SET

The normal target is **10 jobs/contracts followed by 5 direct business pitches** in every HUNT. Never pad with weak candidates: fewer are acceptable only after a genuinely thorough search has exhausted qualifying opportunities.

### REQUIRED OUTPUT ORDER

Always return:

## JOBS / CONTRACTS
For each:
- Company
- Exact role
- Posted/updated date
- North America/Europe location
- Explicit remote eligibility for Ayanda/Botswana
- Why the actual role fits his evidence
- Direct application link
- Human/company route
- Freshness/application-health status

Then:

## DIRECT BUSINESS PITCHES
For each:
- Business
- City/region/country
- Why it is real and active
- No-website verification
- WhatsApp verification
- Other social verification
- Human/owner route
- Concrete visible workflow
- Best first PWA offer
- Why the owner could plausibly buy/contract it
- Direct contact/social link

### QUALITY GATE — MANDATORY BEFORE RETURNING ANY RESULT

For a JOB:
**NEW → CURRENT → DIRECT → NORTH AMERICA/EUROPE → REMOTE → EXPLICITLY ELIGIBLE FOR BOTSWANA → DEMONSTRABLE FIT → HUMAN-REVIEWABLE → NOT EXCLUDED.**

For a BUSINESS:
**NEW → NORTH AMERICA/EUROPE → ACTIVE → NO WEBSITE → WHATSAPP → OTHER SOCIAL → HUMAN ACCESS → CONCRETE WORKFLOW → BUYING REASON → PWA FIT → NOT EXCLUDED.**

If any link fails, do not return the target.

Do not pad the list.
Do not recycle.
Do not convert weak evidence into a recommendation.
Do not show rejected candidates merely to make the search look comprehensive.

The goal is **the smallest set of real opportunities most likely to turn into paid work because a human can actually see and evaluate Ayanda's CV, Admin Hub landing page, GitHub work and shipped products.**

## Game showcase video import protocol — 2026-10-05
- The Games catalogue is four entries in this fixed order: Wardrobe, Shooters Trigger, President's Shoes, Hall.
- The existing `src/components/GameShowcase.tsx` already has the correct card/modal architecture and a `video` field on each game. Do not redesign or rebuild the showcase when adding the videos.
- When the prepared game preview videos are available, move the actual supplied video files into `public/video/games/` in `adminhub-global`, preserve their exact supplied filenames, then wire those exact paths into the matching game entry.
- Do not invent filenames, substitute unrelated gameplay footage, screen-record the live game, or use placeholder/poster content when the real supplied video is unavailable.
- Keep the four-game order unchanged and keep all four games linked to `https://admin-hub-games.vercel.app/` unless verified separate routes are created.
- After the files and mappings are added: verify every referenced file exists, run the production build, confirm the modal/card video behavior, update this AGENTS.md only with confirmed decisions, commit to `main`, wait for the corresponding Vercel deployment to become READY, and verify the production Games section.
- Current inspection on 2026-10-05 found no game `.mp4`, `.webm`, `.mov`, or `.m4v` files in the connected `gatshaayanda/admin-hub-games` source repository or the relevant connected Admin Hub repositories. Do not claim the game-video import is complete until the actual source video files are available to the connected workspace.

## Homepage catalog structure — current direction — 2026-10-05
- The homepage no longer uses the 02 / HOW WE BUILD process section. Do not reintroduce it unless explicitly requested.
- Current homepage sequence is:
  - 01 / APPS — real business/product showcase using the existing project-card format with video previews where available.
  - 02 / GAMES — game showcase using the same project-card visual format as Apps.
  - 03 / THE BUILD — concise technical/build proof.
  - 04 / START SOMETHING — direct CTA.
- The Games catalogue currently contains exactly these four entries, in this order:
  1. Wardrobe
  2. Shooters Trigger
  3. President's Shoes
  4. Hall
- All four games currently live within Admin Hub Games at https://admin-hub-games.vercel.app/; do not invent separate game URLs unless verified routes are actually created.
- Game cards should use the same editorial media-row/card treatment as Apps. Do not revert Games to the older plain text-only project-row list.
- Final game preview videos are not yet supplied. When Ayanda provides them, add them to the game showcase data using the exact supplied filenames/paths; do not invent filenames or substitute unrelated videos.
- Keep the game order above unless Ayanda explicitly changes it.
- Wardrobe is a real part of the current Admin Hub Games catalogue and must not be omitted from the homepage games list.

## Cost-effective browser notification architecture reference — October 2026
- **Do not rediscover notification architecture from scratch for every Admin Hub app.** There are now two proven reference cases: **BoardSignal** and **BOEMO Joos Food Deals**.
- **BoardSignal reference:** its frontend initializes Firebase Cloud Messaging, gets an FCM web token with a VAPID key, remembers the token locally, and sends the token to its backend. Its Firebase messaging service worker handles background messaging. This establishes the standard client-side FCM registration/service-worker pattern.
- **BOEMO reference:** browser push is delivered with Firebase Cloud Messaging using the server-side Firebase Admin SDK from the Next.js/Vercel runtime. FCM registration tokens are stored per authenticated user. A protected Next.js API endpoint sends notifications, while GitHub Actions provides the scheduled trigger. The Firebase Admin service-account JSON is kept in Vercel environment variables and is never committed.
- **Preferred low-cost pattern for future suitable PWAs:** browser/device → FCM token → private token storage → server-side Firebase Admin SDK → FCM → service worker/browser notification. For scheduled notifications, use a lightweight external scheduler such as GitHub Actions calling a protected production endpoint when the required cadence fits that approach.
- **Do not introduce Firebase Cloud Functions automatically.** First inspect whether the notification can be handled by the existing Next.js/Vercel + Firebase Admin + FCM + GitHub Actions pattern. Use Functions only when the actual requirement cannot be satisfied by the lower-cost architecture.
- **Do not use Vercel Hobby Cron as a minute-level notification scheduler.** Inspect the required cadence first and choose the scheduler that actually fits.
- **Notification permission must remain opt-in and user-triggered.** Never make push permission a prerequisite for core ordering, booking, account access or other essential product actions.
- **When debugging notifications, inspect in this order:** client permission → FCM registration token → service worker → token storage/security → server-side Firebase Admin credentials → send endpoint → scheduler/trigger → actual device delivery. Do not rewrite working notification infrastructure before identifying the failing layer.
- **Security:** FCM tokens are private user/device data. Store them under the authenticated user's scope, never expose another user's tokens, never commit Firebase Admin credentials, and keep scheduler secrets in environment variables/secrets.
- **Reuse the proven architecture, not another project's branding/data model.** BoardSignal and BOEMO are technical reference cases only. Every new Admin Hub product must use its own Firebase project/configuration, auth model, collections and rules unless an explicit architecture decision says otherwise.
- **Source-of-truth references:** BoardSignal FCM registration: `src/hooks/useInitializeFCM.ts`; BoardSignal background service worker: `public/firebase-messaging-sw.js`; BOEMO server sender: `src/lib/server/pickup-reminder-runner.ts`; BOEMO test endpoint: `src/app/api/notifications/test/route.ts`; BOEMO reminder endpoint/workflow: `src/app/api/notifications/reminders/route.ts` and `.github/workflows/pickup-reminders.yml`.
- **Verified lesson:** BOEMO's test notification has now been proven end-to-end on a real device with the tab closed. Treat this as verified architecture. BoardSignal independently confirms the FCM client/service-worker pattern. Future notification work should start from these references and only change what the new product actually requires.



## HUNT RESULT — 2026-10-05

Fresh HUNT completed after current repo/live inspection and exclusion-ledger review.

Returned jobs:
- Whippy — Software Engineer: Frontend — Remote Worldwide — direct Ashby application: https://jobs.ashbyhq.com/whippy/da02ad44-9668-4f93-94e3-bf1a6e09ad8b
- Clipboard — Technical Support Engineer — Remote Global / Non-U.S. — direct company application route verified through Clipboard's current ATS listing.

Business lane: no new direct-pitch business passed every hard gate with sufficient current evidence for no website + public WhatsApp + active additional social presence. No business added to the exclusion ledger.

The returned job companies are now excluded from future fresh HUNT results unless Ayanda explicitly requests a follow-up or materially different opening.


## HUNT RESULT — 2026-10-05 — SECOND CYCLE

Fresh HUNT completed after current repo/live inspection and exclusion-ledger review.

Returned jobs:
- fal — Technical Support Engineer — Remote Global — direct Ashby application: https://jobs.ashbyhq.com/fal-ai/03249a74-11b8-4049-b432-2ee72bfccb32

Business lane: no new direct-pitch business passed every hard gate with sufficient current evidence for no website + public WhatsApp + active additional social presence. No business added to the exclusion ledger.

The returned job company is now excluded from future fresh HUNT results unless Ayanda explicitly requests a follow-up or materially different opening.


## HUNT RESULT — 2026-10-05 — THIRD CYCLE

Fresh HUNT completed after current Admin Hub GitHub/live inspection and exclusion-ledger review.

Returned jobs:
- Canonical — Enterprise Customer Success Manager — Home based / Worldwide — direct current Canonical vacancy verified: https://canonical.com/careers/6856788/enterprise-customer-success-manager-remote
- Automattic — Experienced Software Engineer — Remote worldwide — direct current Automattic vacancy verified: https://automattic.com/work-with-us/job/experienced-software-engineer/

Returned direct business prospect:
- Galadent Prim SRL — Cahul, Moldova — active dental practice; current public Facebook page with recent 2026 activity; no website listed/confirmed; public WhatsApp +373 601 01 110; owner/administrator Valeriu Galațanu identified in public company records. Direct social/contact route: https://www.facebook.com/galadentprim/

The returned job companies and business are now excluded from future fresh HUNT results unless Ayanda explicitly requests a follow-up or materially different opening.


## GOLDEN BASELINE — ADMIN HUB VISITOR EXPERIENCE — 2026-10-06

A rollback baseline has been preserved before the visitor-experience redesign:
- Golden branch: `golden/adminhub-global-pre-visitor-experience-2026-10-06`
- Baseline source: the `main` state immediately before the visitor-experience work began.
- If the redesign produces an unexpected result, STOP → inspect reality → compare against the golden branch before making further changes.
- Do not delete or rewrite the golden branch unless the product owner explicitly requests it.

## ADMIN HUB PUBLIC EXPERIENCE RULES — 2026-10-06

The Admin Hub public site is a commercial product/work showcase, not a generic agency portfolio.

### Published work hierarchy
- Organize client products primarily by visitor-relevant industry/use case, not an arbitrary featured-project ranking.
- Current categories: Food & Hospitality (BOEMO); Transport & Automotive (Translend, Namane Tyres, Atlas Service Centre); Education & Tutoring (TutorMe); Events & Equipment Hire (Avram Kids); Business & Operations (PurePress).
- BoardSignal is a personal/independent project and must remain visually subordinate/buried. Do not repeatedly feature it as a lead commercial proof point.
- Preserve the distinction between paid/client work and personal/experimental work.
- Each published product should explain the industry/problem, what it does, and where the visitor can open/try it.
- Prefer dedicated, indexable product/work pages over relying only on modal previews when practical.

### Visitor relevance
- Help visitors self-identify: “this is relevant to my industry/problem.”
- Do not force every visitor through a single featured-project sequence.
- Use category headings, short context, product previews, and clear Open product / See how it works actions.
- Product descriptions must remain factual; do not invent outcomes, testimonials, customer counts, or performance claims.

### Admin Hub Assistant
- The public chatbot is Ask Admin Hub, an on-site guide to published work and project enquiries.
- It should help visitors explore products, find relevant work by industry/use case, or start a project enquiry.
- It must not pretend to be Ayanda.
- Primary enquiry fields: Name; Company/Project; What I'd like to discuss; Best way to contact me; Preferred contact details; Reference request (if applicable).
- Collect progressively where possible instead of presenting a large intimidating form immediately.
- With explicit visitor understanding/permission, persist lightweight visitor/project memory in the browser so returning visitors can resume. Do not silently claim cross-device memory.
- Persist submitted enquiries to the existing Firebase inquiries collection with useful source/page/transcript metadata. Never store secrets.
- The assistant must remain useful even without an enquiry.

### Cinematic intelligence layer
- Use restrained original Admin Hub cues: small signalers, status lights, subtle entrance/section motion, preview motion, and responsive micro-interactions.
- Motion must guide attention or communicate state, not compete with product content.
- Respect prefers-reduced-motion.
- Do not copy Tony Stark/Iron Man/Marvel visual identity.
- Existing light editorial Admin Hub public styling remains the baseline; do not reintroduce dark admin-dashboard styling into the public homepage.

### Evidence and implementation discipline
- Inspect GitHub source and deployment state before public UX changes.
- Preserve working project links, media, and existing functionality unless explicitly replaced.
- For substantial public UX changes, verify the build and visually inspect the result before declaring completion.
- Use research as design evidence; prioritize clarity, relevance, progressive disclosure, accessibility, and real product evidence.

## PUBLIC HOMEPAGE READABILITY LOCK — 2026-10-06

This is a permanent design-system rule for the public Admin Hub homepage.

- The public homepage uses the approved light/editorial golden baseline: #f7f7f3 background and #111318 primary text.
- All normal body/supporting text must use an explicitly readable dark neutral. Use #30343a / #4d5057 or darker; do not use faint grey text for meaningful content.
- Small labels, kickers, metadata and dates must use a readable neutral (#5f636b or darker). Do not use the old #777a82, #73756f, #858890, or similar low-contrast values for meaningful public copy.
- Headings, product names, status text, descriptions and calls to action must remain explicitly scoped to readable colors and must not inherit the global dark-theme variables accidentally.
- Do not solve readability by randomly changing individual colors. Add/maintain the scoped .admin-home readability lock in src/app/home.css.
- Do not introduce transparent text, low-opacity text, gradients used as text, or theme-inherited text on the public homepage.
- Treat readability as locked baseline behavior: if a future change makes public text faint or inconsistent, STOP, compare against the golden baseline, and restore the readability lock before continuing.
- WCAG contrast is the floor, not the design target: meaningful normal text should visibly read as solid dark editorial copy on the light background. WCAG AA requires at least 4.5:1 for normal text and 3:1 for large text.

## BUILD LOG SOURCE REPAIR — 2026-10-06

- The stale admin-hub-build-log-live Firestore record was repaired at the data source on 06 Oct 2026.
- Its publishedAt and updatedAt now reflect 06 Oct 2026.
- The temporary one-time repair logic was removed immediately after the production read confirmed the persisted source date.
- Do not hard-code a BUILDING NOW date in the UI. BuildNow must continue to render the publishedAt returned by /api/updates/latest.

## COMMERCIAL / TRUST SURFACE — 2026-10-06
- Public commercial information is now consolidated at `/business` so pricing/payment/trust details do not clutter the homepage.
- Public ongoing app support range is **USD $7–$18 per app/month**, the USD presentation of the previously agreed BWP 100–250 range. Do not silently change the range; update it only as an explicit commercial decision.
- Position the monthly amount as an operating/support contribution after a useful product exists — not as the cost of building custom software.
- Suitable small-business pilot/partnership work may have initial setup/build labour waived. Larger or unusual scope must be quoted and agreed in writing before work begins. Never imply that all custom development is free.
- Use a low-friction, transparent sequence: start with the smallest useful workflow → evaluate real use for 30 days → agree whether to continue/improve/change scope. Do not manufacture urgency, fake discounts, or manipulative scarcity.
- Competitor research on 2026-10-06 found a broad Botswana/Southern Africa market: low-cost website packages and care plans sit far below full custom-app work, while published custom-app offers/guides range from roughly low-thousands of USD into several-thousand-dollar builds and higher. Admin Hub's $7–$18 monthly figure must be framed as ongoing support/operation, not as a competitor-style custom-build price.
- Pricing psychology guidance: use transparent framing, a clear reference point, and visible value; avoid deceptive anchoring, fake discounts, or pressure. The published work itself is the primary proof.
- Business verification surface: `/business` identifies **ADMIN HUB PTY LTD** as CIPA-registered and links to the official CIPA site. Do not invent a CIPA registration number or an unverified deep-search URL.
- Payment details are intentionally behind a disclosure on `/business`: ADMIN HUB PTY LTD, FNB Botswana, BUSINESS CHEQUE ACCOUNT, AIRPORT JUNCTION, branch code 288267, account 62936626467, SWIFT FIRNBWGX, plus the supplied FNB eWallet/Orange Money route. Keep the instruction to confirm the agreed scope/invoice/reference before payment.
- Ask Admin Hub now answers basic pricing, setup-fee, CIPA and payment questions and routes visitors to `/business`. Keep the assistant factual and do not impersonate Ayanda.
- Games modal is intentionally aligned with the Apps modal architecture: Escape/backdrop/close control, contained media, role/context, tags and Open game action. Preserve the four-game order and existing URLs/media.
- Homepage Games section has a stable `#games` anchor for assistant navigation.
- Do not remove the existing Apps categorization/modal work when touching these surfaces.



## PORTFOLIO CATALOG ADDITIONS — 2026-10-06
- Added the verified live product **The Meating Place** to the public Apps catalogue.
  - URL: https://meating-place.vercel.app/
  - Industry: Food & Hospitality.
  - Status shown publicly: CLIENT WORK · FOLLOW-UP.
  - Positioning: customer-facing product for a real car-wash, food and braai business, including booking flows.
- Added the verified live product **The Wall** to the public Apps catalogue.
  - URL: https://the-wall-ruby.vercel.app/
  - Industry: Local Commerce & Experiences.
  - Status shown publicly: INDEPENDENT · PROTOTYPE.
  - Positioning: digital destination ecosystem connecting events, businesses, food, markets and opportunities around The Wall / Great Wall, Molepolole.
- The two products are grouped by visitor-relevant industry rather than appended to a generic project list: Meating Place sits with BOEMO under Food & Hospitality; The Wall has its own Local Commerce & Experiences category because its verified live product spans events, discovery, market and participation rather than equipment hire alone.
- Verified live URLs directly on 2026-10-06 before catalog implementation. Do not invent separate routes or claim client/payment status beyond the labels above.
- Preserve all existing project order/content unless a future explicit product-owner request changes it.
