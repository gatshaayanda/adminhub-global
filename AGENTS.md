# Admin Hub — Agent Instructions

## APPROVED PRODUCT DIRECTION — DIGITAL BUSINESS TOOLS & INTERACTIVE EXPERIENCES — 2026-10-26

This section is the current source of truth for the Admin Hub Global product and homepage direction. Where earlier homepage instructions below conflict (including Apps · Games positioning, homepage founder-name redaction, the old Rates-first handoff, or prior homepage section order), this approved direction supersedes them. Preserve unrelated technical and safety instructions.

### Product identity and positioning
- Public positioning: **Digital Business Tools & Interactive Experiences**.
- Admin Hub Global is both the public introduction to the work and the working platform used to intake, qualify, communicate about, and manage business/partner opportunities. Do not treat the public landing page and the account platform as separate destinations.
- Do not lead with a conventional portfolio wall, founder biography, or public rate card. The first visible action is the input channels through which a person shares information and enters their account.
- Keep the visual language clean, light, editorial, mobile-first, and consistent with the existing Admin Hub shell. Make only controlled changes that serve this approved direction.

### Landing-page flow and content hierarchy
1. **Business and partner input channels first.** Visitors choose the relevant entry channel and create/use a visitor account to submit information and communicate. Do not require the portfolio/video to be viewed before account entry.
2. **Qualification and offer.** Reuse the existing AdHubMVP-style qualification approach rather than inventing a new lengthy questionnaire. A visitor can upload an existing PDF company profile and share relevant website/social links and contact preferences, with project requirements and commercial readiness captured through the account flow. Admin assigns each account its Business or Partner classification; visitors must not grant themselves elevated/partner status. Do not display a public rates page/rate card as the primary offer. The minimum offer is US$25 for an app running for 30 days; higher investment receives higher priority. Explain payment details and project-specific terms in the appropriate account/business relationship. Do not imply that US$25 buys every custom system outright or guarantees unlimited scope.
3. **Proof-of-capability video.** After the input/qualification area, show the video explaining the development process, tools, apps and games/interactive experiences, and the results it can produce. Include the founder's development journey as a plain-English proof point: 1,000+ commits represent more than 1,000 recorded development steps contributing to building, fixing, connecting, testing and improving software since 2020. Use the house-building analogy if helpful. Be accurate: commits do not mean 1,000 apps or 1,000 major features; do not inflate outcomes. The video preserves native aspect ratio and must not be awkwardly cropped.
4. **Digital Business Tools & Interactive Experiences evidence.** Below the video, present selected examples in compact, truncated project modals that can be explored without turning the page into a wall of cards. The owner/admin must be able to CRUD which tools and interactive experiences appear, including titles, descriptions, category, status, real destination links and supporting video/image evidence. Seed the initial selection only with real projects chosen as the best current examples; never invent URLs, clients, statuses, results, or endorsements. Organize evidence into the two trust contexts:
   - **Neighbourhood Trust:** real local business relationships and the specific tools built for their needs.
   - **Beyond the Neighbourhood:** work organized by the business's actual operating reach and needs, including mobile businesses, online stores and opportunities capable of national, international or global reach. Do not classify only by physical location, and do not imply global reach without evidence.
   Evidence belongs inside its respective category/modal; these are not separate extra steps in the page flow. Each modal should be compact and closable by its close control, backdrop and Escape; support keyboard/touch access and reduced motion.
5. **Meet the Founder.** Below the project evidence, include a sliding carousel of reference quotations that teases the person behind the work and links to a fuller founder information/profile page. This is the place for founder background, not the first thing visitors must encounter. Use only genuine, appropriately attributed quotations and do not fabricate endorsements.

### Account and opportunity management
- Visitor accounts support both business owners and people who partner with Admin Hub Global to refer/sell services to businesses. Both need an account-based way to submit information and communicate with Admin.
- Keep the account type/classification under Admin control, with Admin CRUD for Business / Partner; do not trust a self-selected client-side role as authorization.
- Keep submissions, uploaded company profiles, relevant links, conversations, referrals/partner attribution, opportunities, project scope/status, and agreed commercial/payment details associated with the correct account/opportunity.
- Protect private business documents and conversations from unrelated accounts and referrers. A partner referral does not automatically grant access to the referred business's private information.
- Admin needs to review and manage accounts, classifications, submissions, partner relationships, conversations, opportunities and featured evidence from the application. Prefer reusing existing project patterns and infrastructure over rebuilding existing flows.

### Evidence, status and claims
- Keep actual paid work, completed delivery, active use, testing, pending payment, proposals and templates clearly distinct. Do not describe a proposal as a customer deployment or claim a business is paid/live unless evidence supports it.
- Every featured project must be admin-manageable and use verified project destinations. No placeholder or fabricated project links in production.
- The homepage should explain capability through actual video and product evidence, not unsupported claims about revenue, customers, reach or delivery guarantees.

### Implementation discipline
- Inspect current repository state, routes, data sources and existing account/auth flows before editing. Treat the existing repo as the source of truth; do not assume a new auth system is required.
- Implement the approved product direction with the smallest coherent change, preserve unrelated working behaviour, and verify the affected routes/build before checkpointing.
- Do not claim deployed/production-ready until the matching commit is on main, the corresponding Vercel deployment is READY, and the relevant live routes have been checked when practical.


## Product identity
- Admin Hub is the parent/front door: Apps · Games · Products · Experiments.
- Admin Hub is its own brand/business. Do not turn the public site into a founder-led personal brand or imply that the site is primarily about Ayanda.
- Ayanda is the person who built Admin Hub and the projects behind it, but the homepage should present the work as Admin Hub work.
- The homepage is a commercial landing surface first: clear, confident, useful, and product/work focused.


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
## Newest golden version / rollback rule (2026-10-29)

- The newest explicitly accepted golden version is the protected baseline. A newer accepted version supersedes the previous golden; never restore an older snapshot merely because it is familiar or easier to work from.
- Before changing a protected app/game, inspect the current GitHub `main` state and relevant docs. Keep the newest golden's working behaviour and visual decisions; make only the smallest requested, additive change.
- If a change regresses the experience, compare against and restore the newest accepted golden version, not an older historical version. Never reset/revert the whole app or overwrite newer unrelated work to recover one feature.
- For GGL Space, the new golden includes the GGL Haven system-map marker and the event-triggered crew boarding, equipment deployment, and crew-return signals added on 2026-10-29. Preserve these alongside the existing playable flight baseline. Interaction prompts must stay off the central ship/flight view, and NOS must remain a small, touch-responsive button beside FIRE unless the product owner explicitly approves a different control layout.
- A GitHub push is not production QA completion: inspect the exact commit, wait for its Vercel deployment to reach READY, and verify the affected live route when practical. Report code verification and live QA as separate statuses.

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

## PORTFOLIO CATALOG ADDITION — 2026-10-07
- Added the verified live product **Tripple S Wellness Spa** to the public Apps catalogue.
  - URL: https://tripple-s-wellness-spa.vercel.app/
  - Industry: Health & Wellness.
  - Status shown publicly: CLIENT WORK · ACTIVE.
  - Positioning: Tripple S's digital receptionist + client-care system for medical aesthetics, IV wellness, skin health and body contouring.
- The catalogue uses a locally coded editorial preview graphic for Tripple S rather than inventing a client-supplied logo or relying on a missing video asset.
- The Wall now also has a locally coded editorial preview graphic so its existing live catalogue entry is visually represented in the same card/media treatment as projects with video.
- Preserve the verified live URLs and existing catalogue structure; do not claim unsupported outcomes or commercial status.

## Homepage narrative / ecosystem direction — 2026-10-08

This is the current approved direction for the next Admin Hub public-surface iteration. It supersedes the older homepage narrative while preserving the light editorial visual system, existing project modals, real project destinations, and the separation of BoardSignal from the public marketing shell.

### Core product story

Admin Hub is the parent ecosystem/front door for real software and interactive experiences. The public domain should communicate:

- people and businesses have different problems;
- Admin Hub builds different digital products around those problems;
- each product is specific to the business/workflow rather than a generic template;
- repeated projects have accumulated a reusable way of building, but this iteration/reusable-framework story belongs primarily on /ayanda and in supporting evidence, not as a dominant homepage section;
- a product can become part of the wider Admin Hub ecosystem once it exists and is useful;
- a business can either use an existing product or ask Admin Hub to build something new that can join the ecosystem.

Do not describe Admin Hub as a single proprietary platform that all client products are instances of. Do not imply BOEMO or any one project is the origin of every other project.

### Approved landing-page narrative

The homepage should be a progressive story, not a CV:

1. INTRO / ACCESS
   - Establish Admin Hub immediately.
   - Keep Apps · Games and the concise line: Software and interactive experiences built for real use.
   - Make the product-access/install experience clear early.
   - PWA/install UI must be customer-facing language, not technical PWA/service-worker language.

2. 01 / THE PROBLEMS
   - This is where the current industry/project catalogue belongs.
   - Show different industries and the real problems/workflows they brought.
   - Keep the existing modal model. Do not replace it with a giant list or remove the modals.
   - Use compact/truncated industry/product presentation so the page remains scannable.
   - Opening a project should progressively disclose the fuller product story, media, role, tags and live project link.
   - The project modal is a deliberate information architecture choice, not a defect to remove.

3. 02 / GAMES
   - Keep Games as a distinct part of the Admin Hub ecosystem.
   - The current playable catalogue and existing preview modals remain useful evidence.

4. 03 / PROOF / THE PERSON BEHIND THE WORK
   - Do not make the homepage a founder profile.
   - Present a rotating/advancing sequence of short personal highlights derived from independent reference evidence.
   - The highlight should continue changing whether the visitor scrolls or remains still; the visitor should not have to scroll to receive the next highlight.
   - Include a clear route to /ayanda so visitors who want the full evidence can follow it.
   - The homepage does not need to display the full reference letters; it should surface concise, attributable qualities/themes and invite deeper verification on /ayanda.
   - Do not overuse the founder's name in the landing narrative.

5. 04 / THE INVITATION / START
   - The post-proof CTA should make the ecosystem proposition explicit: Your business can have its own software too.
   - Route this CTA to /#start.
   - Keep the existing Ask Admin Hub enquiry/chat capability, but align its quick actions and copy with Apps, Games, Rates & support, and Start a project.

6. RATES / BUSINESS
   - Rates is the commercial explanation, not the main Admin Hub story.
   - It should explain scope-led setup/build, practical operating/support costs, pilots/partnerships, verification, payment and support.
   - The $25 / 25 GB concept is an illustrative commercial translation device, not a universal Admin Hub price and not a claim that infrastructure universally costs $25.
   - Use it to explain what a familiar recurring amount can mean when translated into useful software capacity/usage and repeated customer interactions.
   - The commercial page should make clear that actual cost depends on scope, expected usage, support and business budget.
   - Do not let the old Ask Admin Hub response claim a universal $7–$18 per app/month price if the public Rates page does not make that the current universal offer. Chat content must match the final published commercial model.

7. /#start
   - This is the canonical conversion destination after the narrative.
   - The homepage CTA, Ask Admin Hub, and relevant navigation should converge on this start/enquiry surface.
   - Do not create a second competing contact destination unless there is a clear product reason.

### /ayanda evidence architecture

/ayanda is the deep evidence layer, not a conventional CV dump.

The page should eventually make it easy to inspect:

- professional references and recommendation letters;
- CommissionCrowd long-term relationship and independent evidence;
- education and academic record;
- journalism and published work;
- creative/film/theatre work;
- technical development history and GitHub;
- Odin Project / technical learning;
- BoardSignal and the chess-analysis-to-productisation story;
- client product evidence;
- Admin Hub business/company evidence;
- reports, documents, screenshots, certificates and other supplied Google Drive/Docs/Sheets links.

Use progressive disclosure and truncated lists. A visitor should see what a record is and why it matters without being forced through a huge wall of documents. Evidence links can open Google Drive/Docs/Sheets or verified public destinations in a focused, understandable way.

The narrative theme is accumulated capability rather than I learned to code: understanding people/information → communication/research → operations → technical development → product ownership → real production systems.

The repeated independent reference themes are useful evidence themes, including adaptability, independence, communication/listening, discipline, persistence, professionalism, process reliability, creative production and technical curiosity. Do not invent quotations or attribute qualities beyond the supplied evidence.

### PWA / install hardening

The public Admin Hub shell already registers one service worker and has an install component. The next PWA pass must harden the public experience rather than merely adding another install button.

Requirements:

- customer-facing language such as Install Admin Hub, never Install PWA or service-worker terminology;
- show install UI only when native installation is actually available;
- capture beforeinstallprompt, retain it for an explicit user action, and call prompt() only from that action;
- clear/suppress the invitation after appinstalled;
- detect standalone/installed mode and do not show an install invitation when already installed;
- provide a simple iOS Safari Add to Home Screen fallback where native prompting is unavailable;
- unsupported browsers/devices must not receive a dead install control;
- do not promise offline/private functionality that the public Admin Hub shell does not actually provide;
- keep one existing service worker; do not add a second worker or a PWA package merely for install UI;
- audit the current public/sw.js before changing it. It currently contains legacy Sparkle insurance routes/cache names and is not yet an acceptable final Admin Hub public worker;
- preserve BoardSignal's separate product-shell/service-worker safety model and do not let public-shell PWA changes alter BoardSignal privacy/offline behavior;
- keep manifest, icon, metadata and install copy aligned with the Admin Hub public identity;
- verify install behavior on Chromium/Android, desktop Chromium where supported, Safari/iOS fallback, already-installed/standalone state, dismissal, and unsupported browsers;
- keep reduced-motion, keyboard, focus and touch-target behavior intact.

### UX / research principles for this iteration

The page can be long because this is a narrative/portfolio surface, but it must remain scannable and oriented. Use:

- progressive disclosure: high-level problem/product information first, deeper project evidence in the existing modal;
- meaningful section headings and compact copy;
- clear information scent for links and buttons;
- limited simultaneous choices;
- functional motion rather than decorative motion;
- no essential information dependent on animation;
- mobile-first composition;
- accessibility and reduced-motion support.

The rotating proof/highlight component is allowed to advance on a timer, but must remain readable, pause/stop-able where appropriate, accessible to keyboard/screen-reader users, and must not become the only route to the underlying evidence. The /ayanda link remains available independently of the animation.

### Final public-site architecture target

- / = Admin Hub ecosystem story: access → problems/work → games → personal proof highlights → invitation → /#start
- /apps = fuller app catalogue/work surface
- /games = fuller games surface
- /ayanda = deep personal evidence/archive
- /business = Rates/commercial model
- /#start = canonical enquiry/start destination
- Ask Admin Hub = persistent navigation/help layer that can route users to Apps, Games, Rates & support, or Start a project
- /boardsignal = isolated product shell

The homepage should not duplicate the entire /ayanda archive or entire Rates page. It should create enough understanding and evidence that the visitor knows where to go next.


## Homepage correction checkpoint — 2026-10-08

- The homepage is an Admin Hub company/account surface, not a founder profile.
- The public homepage header must not contain an Ayanda navigation item.
- Do not surface the founder’s name anywhere on the homepage. This includes navigation, proof copy, carousel quotes/statements, source labels, CTA labels, metadata displayed in the page, or other homepage narrative. If source material contains the founder’s name, redact/rephrase it for homepage display rather than reproducing it. The homepage may link to `/ayanda` as the deeper evidence/archive destination, but the link should be framed around the evidence, not as a personal-brand CTA.

## Homepage implementation checkpoint — 2026-10-08

- Baseline preserved before the homepage narrative implementation: commit `1d18930d14c73ca17ae7c5db33efa397ebc60d93`.
- A protected baseline branch was created at `baseline/homepage-redesign-2026-10-08` from that commit. Do not delete or rewrite it; use it as the rollback reference if the landing-page iteration is rejected.
- Homepage implementation target for this pass is locked to: INTRO / ACCESS → **01 / THE PROBLEMS** → **02 / GAMES** → **03 / THE BUILD** (independent human/documentary proof highlights) → **04 / START SOMETHING**.
- `03 / THE BUILD` is not a process/framework explanation and must not be reduced to build metrics. It is the homepage proof/identity bridge: rotating evidence highlights from independent references and the early published record, with a route to the deeper evidence archive for visitors who want to inspect the underlying records.
- The approved proof evidence currently surfaced by the homepage includes CommissionCrowd, Dr Teresa Howell, Stuart Entwistle, Insurance Training Institute, The Other Press / Douglas College, EduKick Manchester, and the 26 Jan 2011 Mmegi / Rainbow High School record. Keep the carousel focused on the reference/document itself; do not turn it into a founder-profile panel, add the founder’s name to the homepage navigation, or invent additional quotes or attribution.
- The homepage retains the existing Apps/Games project modal architecture and real project links. Do not replace the modals with a generic list.
- The homepage conversion surface is `/#start`; its primary action opens the existing Ask Admin Hub guided enquiry flow. Ask Admin Hub remains the shared intelligence/context layer rather than a separate contact system.
- This homepage pass is intentionally prepared as one final production commit after inspection/verification. Avoid intermediate commits on `main` so Vercel production deployments are not consumed by partial iterations.


<!-- chore checkpoint: modal restoration is committed on main; deployment trigger can resume when Vercel daily limit clears. -->


## /ayanda profile + Museum of Success — 2026-10-08
- /ayanda is a professional/founder record surface, separate from the Admin Hub commercial homepage.
- The bottom of /ayanda must be **Rates**. Do not insert a Contact / Availability section before or after Rates. Rates is the handoff to /business.
- The Success Museum uses progressive disclosure: compact category chips + scannable evidence rows; source material opens in a modal document/PDF viewer with backdrop click, Escape and Close support.
- Keep the museum compact. Do not turn /ayanda into a document dump. Evidence should be opened on demand.
- Research basis for this pattern: users primarily scan web content; concise/scannable/objective copy reduces cognitive load; progressive disclosure keeps secondary detail available without overwhelming the primary page; external evidence supports credibility. See Nielsen Norman Group research on scanning, progressive disclosure, cognitive load and trust/credibility.
- Current supplied museum source material:
  - References & Records: https://drive.google.com/file/d/1ywlV2F8vnfIedIQtg2_Dd5kucRrxBtLZ/view?usp=sharing
  - References & Records: https://drive.google.com/file/d/1x84eV1mFPOYxTPsainsRxq30LB_o576Q/view
  - References & Records: https://drive.google.com/file/d/1ggTtLxo7xV6THxgs3GMdXYCnCmReSCe_/view
  - Published / newspaper: https://drive.google.com/file/d/1uybb5ic9Ixqk74BQg2lcIVPksd4aZzMg/view — Ayanda is second-last row, first from the right.
  - Art & Creative Work: https://drive.google.com/file/d/12voudI4goOx2wxLa6dAetXLYoris3eDN/view
  - Art & Creative Work: https://drive.google.com/file/d/1HusCy1-nxz1HuuLx6SHVhHS56vkj0-u0/view
  - Art & Creative Work: https://drive.google.com/file/d/1TJjSmCobfHNmmRAXAGbDnEyLQXVWFl1N/view
  - Art & Creative Work: https://drive.google.com/file/d/1ojNvvtAJ_rMU_QMuBvSaQ22WiKbpXF42/view
  - Art & Creative Work: https://drive.google.com/file/d/1VgNVOW0lu457EMXNApC8mmzpZspppRHA/view
  - Art & Creative Work: https://drive.google.com/file/d/1jEhbApDkHPCJwV146RzDn63QVewnbOEf/view
- The Google Drive connector was not available in this session, so the source links are stored as supplied and opened directly in the browser/modal. Do not invent document titles until the actual source material is inspectable.


## Museum modal readability fix — 2026-10-09
- Keep `/ayanda` museum modal content inside viewport at all widths. The dialog must use `min-w-0`, `break-words`, a responsive one-column-to-two-column header, wrapped action controls, bounded dynamic viewport height, and a scrollable viewer region. Never allow long titles/descriptions or action buttons to force horizontal overflow.
- Match the landing page's editorial readability: light `#f7f7f3` shell, dark `#111318` text, clear label/title/description hierarchy, readable line-height, understated borders, and obvious Close/Open original actions.
- Verify the final JSX nesting after edits. Ensure the bottom CTA remains **Rates → /business**; do not restore Start here or Contact/Availability as the final CTA.

## Museum of Success — identified source metadata — 2026-10-09
- The ten museum records on /ayanda now use the supplied document identifications rather than generic archive labels:
  1. **Youth Development Fund — LEA consultation** — Government Endorsement Confirmation from LEA Gaborone acknowledging consultation on a Youth Development Fund business plan. Category: Company & Public Records. Source: https://drive.google.com/file/d/1ywlV2F8vnfIedIQtg2_Dd5kucRrxBtLZ/view?usp=sharing
  2. **Admin Hub — Certificate of Incorporation** — Certificate of Incorporation for Admin Hub Proprietary Limited. Category: Company & Public Records. Source: https://drive.google.com/file/d/1x84eV1mFPOYxTPsainsRxq30LB_o576Q/view
  3. **Insurance Training Institute — reference** — Reference letter acknowledging completion of long-term and short-term insurance certifications. Category: Credentials & Training. Source: https://drive.google.com/file/d/1ggTtLxo7xV6THxgs3GMdXYCnCmReSCe_/view
  4. **Mmegi — Rainbow High School Class of 2010** — Newspaper feature on the high-achieving class; Ayanda is in the second-last row, first from the right. Category: Published Record. Source: https://drive.google.com/file/d/1uybb5ic9Ixqk74BQg2lcIVPksd4aZzMg/view
  5. **Myerscough College — football and BTEC Sport** — Award certificate recognizing completion of study in football and BTEC Sport and Excellence. Category: Education & Achievements. Source: https://drive.google.com/file/d/12voudI4goOx2wxLa6dAetXLYoris3eDN/view
  6. **Dr. Teresa Howell — Psychology 1200 recommendation** — Academic recommendation letter for Psychology 1200. Category: References & Recommendations. Source: https://drive.google.com/file/d/1HusCy1-nxz1HuuLx6SHVhHS56vkj0-u0/view
  7. **Stuart Entwistle — character reference** — Personal character reference letter. Category: References & Recommendations. Source: https://drive.google.com/file/d/1TJjSmCobfHNmmRAXAGbDnEyLQXVWFl1N/view
  8. **Rainbow High School — academic and athletic reference** — Character reference highlighting academic and athletic achievements. Category: References & Recommendations. Source: https://drive.google.com/file/d/1ojNvvtAJ_rMU_QMuBvSaQ22WiKbpXF42/view
  9. **EduKick Manchester — programme recommendation** — Recommendation letter summarizing participation in the 2012–2013 programme. Category: References & Recommendations. Source: https://drive.google.com/file/d/1VgNVOW0lu457EMXNApC8mmzpZspppRHA/view
  10. **Chess.com — 9,745-game statistical report** — Statistical and narrative analysis of Chess.com history spanning 2013–2026. Category: Technical & Product Work. Source: https://drive.google.com/file/d/1jEhbApDkHPCJwV146RzDn63QVewnbOEf/view
- Museum rows now show the actual document titles and concise descriptions, wrap rather than truncate source details on narrow screens, and use item-specific accessible button labels.
- The final /ayanda handoff is **Rates → /business**. Do not replace it with Start here or Contact/Availability.
- UX rationale: preserve progressive disclosure and scannability rather than embedding ten full documents into the page. References: https://www.nngroup.com/articles/progressive-disclosure/ and https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/
- Modal accessibility reference for future work: WAI-ARIA dialog pattern requires focus to move into the dialog, remain within it while modal, support Escape, and return to the invoking control when closed: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- Implementation commits on 2026-10-09: c227251fa0bb39326101b0bf2cb6a5902ed14478 (item-specific trigger labels) and a0cfcf4809898b031b0816b5ca8a633ab5e7ad64 (identified museum metadata, wrapping, and Rates handoff).

## Rates / business page copy and CTA lock — 2026-10-09

- Write Rates for ordinary small-business owners, not software developers. Use plain, concrete language; remove jargon, abstract commercial language, and long caveats that obscure the offer.
- Explain the idea simply: a branded app for the business, with **$25/month as an illustrative running-cost example** (roughly the price of airtime), not a universal promise or fixed price for every product.
- Explain the example clearly: 500 users × approximately 50 MB each per month = approximately 25 GB of monthly data transfer. State briefly that transfer is data moving through the app and is different from stored files. Do not bury this in infrastructure terminology.
- Explain one-time setup/build fees plainly: discussed and agreed before work starts; suitable pilot/partnership work may qualify for a reduced or waived fee. Never imply every custom app is automatically free.
- Keep other required Rates disclosures and evidence sections intact unless explicitly asked to change them.
- Do not add redundant enquiry/contact CTAs to the Rates page. The page's top hero must not have a competing “Start an enquiry” button, and the final proof section must not add “Ask Admin Hub a question”. Preserve the relevant “Back to the work” and “Explore published work” links.
- For Rates copy corrections, change only the specifically identified copy and CTAs. Leave setup-fee policy, verification, reviews, payment disclosures, referrals, independent-reference carousel, and homepage content untouched unless requested.
- Verify the exact changed route and production deployment status after pushing. A commit being pushed is not proof that production is READY.

## Transaction, payment, and identity evidence handling — 2026-10-09
- When assessing Trustpilot or another review/dispute record, treat it as relevant context when the transaction or service under review actually occurred through that platform or is connected to the transaction being discussed. Do not assume Trustpilot itself processed a payment merely because a review exists.
- For payment tracing, preserve the exact payment-provider and account/display names as shown in the evidence (for example PayPal, Wise, or the relevant e-wallet name), alongside transaction dates, references, amounts, and counterparties where available. Distinguish verified records from recollection or inference.
- A police-certified copy of an identity card, Trustpilot account details, and WhatsApp-number details may be supporting identity/continuity evidence when legitimately relevant. Describe what each record can establish; do not imply that any one item proves a transaction or allegation by itself.
- Treat identity documents, phone numbers, payment-account details, transaction references, and private correspondence as sensitive. Do not put them in public website copy, public GitHub files, commit messages, issues, or other public-facing materials. Keep full documents in an appropriately private, access-controlled evidence location and share only the minimum necessary with the relevant authorized recipient.
- In public copy, summarize the existence and relevance of supporting evidence without publishing document scans, ID numbers, full phone numbers, account identifiers, or private transaction details. Redact copies made for wider circulation.
- Do not upload identity documents or financial records to this repository. If these materials are needed for a review, use them only in a suitable private context and keep conclusions proportional to what the evidence actually shows.

## Deployment trigger test — 2026-10-09
- A fresh commit on `main` is being used to test whether the GitHub-to-Vercel production deployment trigger is functioning. Confirm the matching commit SHA in Vercel and verify the production deployment reaches READY before considering the test complete.


## CURRENT PORTFOLIO EVIDENCE AND COMMERCIAL STATUS — 2026-10-28

Use these owner-supplied updates when preparing the initial featured project catalogue and its evidence. Treat them as current working notes, not permission to exaggerate outcomes. The owner/admin must be able to edit all labels and statuses.

### High-priority businesses entering their 30-day use period
These are the highest-priority examples because they have paid, made a partial payment, or are about to begin using their repurposed systems with real customers. Feature them prominently in the initial evidence catalogue, with accurate per-project status:
- **The Plug** — retailer app. Paid; preparing to start its 30-day use period with existing and new customers.
- **Africhiko** — steel fabrication and project enquiries. Paid; starting its 30-day use period.
- **John the Stylist BW** — stylist booking and customer experience. Partial deposit paid; preparing to start its 30-day use period.
- **Big Brothers Car Wash** — car wash business app. Expected to begin using it with customers this coming weekend; verify the actual start before labelling the 30-day period active.
- **Admin Hub Global GGL Tournaments** (https://www.adminhub-global.com/ggltournaments) — consultation paid; remaining deposit expected next week and 30-day use is being prepared. Do not label as fully paid or as having started the 30-day period until confirmed.

### Other current business pipeline evidence
- **PurePress** — embroidery business app; preparing to pay and begin using the app.
- **Grandynamic Pty Ltd** — business website/app; expected to pay the deposit and begin its 30-day period.
- **Tripple-S Wellness Spa** — wellness spa booking and business app. Keep its exact payment/start status editable and confirm before claiming the 30-day period is active.
- **Padre Pio** — medical practice. One of three medical practices the owner says are onboard; Padre Pio has said it needs to address in-house infrastructure before paying and starting its 30-day period.
- **Two additional medical practices** — described by the owner as highly interested and preparing to pay. Their identities and exact statuses should be supplied/confirmed by the owner before being publicly named.
- The owner also reports **two welding businesses** in the pipeline. Africhiko is one confirmed example; confirm the other business's identity and status before naming or describing it publicly.

### How to present status honestly
- The owner wants businesses entering their 30-day use period to receive high prominence as evidence of systems being adopted by real businesses. Use clear, editable labels such as **Paid · onboarding**, **Starting 30-day use**, **Preparing to launch**, **Deposit pending**, or **Waiting on business infrastructure**.
- Use **Active 30-day use** only after the owner confirms that the period has actually started. Do not imply that a pending deposit is paid, that a prospective customer is already using the system, or that a proposal is a live deployment.
- Explain the shared delivery model accurately: systems are adapted from the reusable foundation/codebase to address each business's distinct needs. Demonstrated capabilities may include translation features, interactive/game experiences, utility-backed operations for customers, admin insight/operations, and easier handling of customers and transactions. Only mention a capability on an individual project when that project actually includes it.
- The value story is not merely that a business has an app. Show the business problem, the adapted digital system, the relevant customer-facing utility and business/admin operational benefit, and evidence of real use when available.
- Do not publicly expose private payment negotiations, infrastructure issues, unnamed prospects, or internal pipeline details. Public labels and named case studies require the owner's approval and must be grounded in confirmed facts.


## GGL Space — planetary restoration and civilization simulation (approved direction, 2026-10-29)

### Product promise and implementation boundary
- GGL Space is now the active direction for the GGL Tournaments game: a peaceful open 3D space exploration and planetary stewardship experience. It is not a racing game reskin and combat is not the core loop. The current live implementation is a Three.js/WebGL scene in `src/app/ggltournaments/game/racing-warmup.tsx` and `racing-3d-scene.tsx`; historical Phaser 3.90 prototype material in `docs/SPACE-SHIP-HUB-DESIGN.md` is reference/design history, not the current engine or a feature-complete implementation.
- Preserve the current 3D free-flight world, pink high-visibility ship with dark accents, corrected intuitive analog directions, boosted flight, shooting/asteroid interactions, planets and responsive touch controls unless a specific approved feature requires a change. The ship must remain visibly distinct against dark space.
- The current Three.js scene includes Aster, Cobalt, Verdant, Ember and Frost plus a moon. They are currently visual worlds with collision boundaries, not five completed terraforming simulations. Do not claim planetary state, settlement, radio/news, docking, persistence or civilization systems are implemented until verified in code and live behaviour.
- Keep scope incremental: research/design and AGENTS updates do not authorize gameplay code changes. For implementation, inspect the current repo and build small, testable slices; preserve unrelated working behaviour. GitHub main is source of truth. A pushed commit is not a successful live release until Vercel is READY and the affected route is checked. Current known deployment risk: Vercel has returned a build-rate-limit failure; do not spam commits/build triggers to work around it.

### Core loop: travel, deliver, restore, settle, observe, respond
1. Fly freely and select a destination.
2. Use one forgiving, reusable proximity interaction for docking/landing at GGL Haven or a planet. Docking is simple, not a piloting challenge: when the ship enters the target's generous interaction radius, show one clear action such as DOCK / LAND; confirm with one tap/click and transition to the appropriate docked/landed state. Share the interaction contract across station and planets; target-specific outcomes differ. Do not require tight alignment, precise velocity windows or hidden success conditions. Keep a visible cancel/undock/take-off path and never trap the player.
3. At GGL Haven, choose people, supplies and terraforming equipment to transport. Cargo/mission selection should be understandable and capacity-limited only if the game has a clear, useful capacity mechanic.
4. Deploy equipment at a world. It stays behind and contributes over simulated time; progress is not instant. Equipment requires appropriate power, local resources, maintenance and/or complementary systems. The ship can return with further modules, supplies or population.
5. When a planet reaches a clearly signalled safe settlement threshold, allow a founding population to be left there. A colony develops over time according to life-support reliability, food/water/energy, health, safety, housing, ecology, relationships, governance and knowledge.
6. Observe the world and civilization through visible changes, status summaries, and radio/news reports at GGL Haven. Reports travel only when a communications path is available; delay or lost contact should create uncertainty rather than omniscient, instant updates.
7. Respond to shortages, ecological damage, social instability, technological opportunity or catastrophe warnings by sending supplies, equipment, expertise or evacuation support. A damaged colony should not automatically end the entire campaign.

### Planet states: five worlds must have distinct identities
- Give Aster, Cobalt, Verdant, Ember and Frost distinct initial environmental profiles and different restoration pathways. Keep these as game-design profiles rather than pretending they are real measured planets.
- Suggested starting profiles (tune to the actual scene art and gameplay once implementation begins):
  - **Aster — cold, thin-air rocky world:** scarce stable surface liquid water, cold nights and radiation exposure; good first demonstration of heat retention, atmospheric processing and sheltered water systems.
  - **Cobalt — ocean/ice potential, hostile surface:** abundant frozen water or subsurface reservoirs but severe storms/pressure/temperature constraints; prioritize water extraction, energy and protected coastal/ice-edge habitats.
  - **Verdant — biologically promising but ecologically unstable:** more water and a thicker atmosphere, but toxic/imbalanced chemistry, fragile native ecology or severe seasonal variability; prioritize environmental surveys, remediation and protected biospheres rather than assuming green means safe.
  - **Ember — hot, dry, high-energy stress world:** extreme heat, dust/chemical exposure and scarce accessible water; prioritize thermal shielding, cooling, sealed habitats, water prospecting and resilient power.
  - **Frost — frozen low-energy world:** abundant ice but extreme cold, low light and difficult energy/logistics; prioritize geothermal/nuclear/other reliable power, ice mining and insulated habitats.
- Each profile must expose readable values/labels, at minimum: temperature range, pressure/atmosphere, accessible water, radiation/weather hazard, energy potential, local resources, ecology/contamination and current habitability. Values can be abstract game indices, but definitions and thresholds must be consistent.
- Do not make all planets the same difficulty with different colours. Their conditions should change which equipment is useful, the order of upgrades, time-to-progress and risks. Keep more than one viable strategy where practical.

### Terraforming and equipment progression
- Terraforming is a staged, long-duration process. Do not flip a planet from hostile to Earth-like in one action. Model local environmental suitability separately from whether an enclosed habitat can safely support people.
- Proposed progression:
  0. **Surveyed / unknown:** probes and scans reveal atmosphere, temperature, water, hazards and resource deposits. Unknowns create risk; research reduces it.
  1. **Robotic preparation:** autonomous surveyors, excavation rigs, landing beacons and power units establish access and basic infrastructure.
  2. **Power and resource extraction:** dependable generation, storage, ice/water extraction, processing and local-material fabrication enable other equipment.
  3. **Protected outpost:** sealed habitat, air/water recycling, radiation and thermal shielding, medical/emergency supplies. Humans may survive inside before the outside is habitable.
  4. **Environmental remediation:** planet-specific systems slowly alter heat balance, pressure/atmosphere, water availability, soil chemistry or contaminant levels. Avoid a single generic “terraform” button.
  5. **Stable biosphere / outdoor safety:** establish contained agriculture and carefully tested microbial/plant ecosystems where appropriate; monitor contamination, soil and water. Outdoor human habitability requires multiple thresholds, not a single score.
  6. **Settlement-ready:** a sustained safety margin for air/pressure, temperature, water, food production, radiation protection and ecological stability allows the first founding population to live beyond a small sealed outpost.
  7. **Self-reliant world:** local production, maintenance, health services, education, governance and ecological monitoring reduce dependence on shipments from Haven.
- Equipment must have visible world placement and a persistent functional purpose. Each module should declare: required prior systems, power/resource draw, what environmental or social variable it changes, output, operating range, maintenance/failure risk and expected progress timescale. Add new equipment only when it creates a meaningful decision; avoid a large inventory of cosmetic items.
- Keep terraforming speculative and clearly game-fiction. NASA research indicates Mars cannot be made Earth-like with currently accessible CO2 and present-day technology; do not present the game's planetary engineering as near-term real-world feasibility. Reference: https://www.nasa.gov/news-release/mars-terraforming-not-possible-using-present-day-technology/ and https://science.nasa.gov/resource/terraforming-the-martian-atmosphere/
- Visual feedback is mandatory: the player should be able to see and recognize stages at a distance. Show deployed machines, lights/power links, habitat clusters, water/ice works, atmospheric/sky changes, test domes, vegetation/contained farms and later settlement lights as appropriate to the planet. Do not promise global colour/sky transformation before the underlying environment variables justify it. Use strong before/after visual milestones plus concise status labels.

### Human population and civilization growth
- People are not cargo counters only. Track a compact, legible set of population and community indicators. At minimum: population, health, food/water, shelter, energy/life-support, safety, belonging/trust, work/meaning, knowledge/education, and ecological pressure. Add governance/inequality or conflict only when those systems can be explained and acted upon.
- Use Maslow as an accessible communication metaphor, not a rigid rule that nobody can care about higher needs until every lower need is full. Empirical research challenges strict sequential satisfaction; social connection, esteem, autonomy and meaning can affect wellbeing alongside material needs. Prefer an integrated needs model with feedback between dimensions. Research: https://doi.org/10.1016/0030-5073(76)90038-6 ; https://pubmed.ncbi.nlm.nih.gov/23858951/ ; https://www.sciencedirect.com/science/article/pii/S0305750X23000037
- Civilization phases are descriptive milestones, not hard levels that automatically solve a society:
  1. **Survival outpost:** safety, sealed shelter, air/water/food, health and emergency resilience.
  2. **Stable settlement:** reliable supply loops, homes, agriculture/food systems, maintenance and community trust.
  3. **Growing community:** births/arrival, roles, education, shared spaces, local production and stronger social bonds; growth increases demand.
  4. **Industrial/connected society:** advanced energy, manufacturing, transport, communications and research; productivity rises but resource extraction and pollution can rise too.
  5. **Mature civilization:** robust infrastructure, cultural life, science, governance, trade and capacity to adapt; success means resilience and wellbeing, not maximum population or technology alone.
  6. **Peak / fragile prosperity:** high population, production and complexity can create tightly coupled dependencies, resource overshoot, inequality, ecological strain or neglected maintenance. This is a risk state, not a guaranteed moral punishment or inevitable collapse.
  7. **Renewal, stagnation, fragmentation or collapse:** outcomes depend on pressures, preparation, choices, resilience, migration and recovery investments. Societies may recover or reorganize; avoid a single terminal game-over.
- Population growth must be constrained by carrying capacity and the real capacity of food, water, habitat, energy, healthcare and ecosystem services. Sending more people to an unsafe or under-supplied planet should create visible demand and risk, not instant settlement success.
- Preserve agency: players can invest in balanced needs, community spaces, education, maintenance, ecological safeguards, redundancy, local production, trade, diplomacy, migration or evacuation. Show what is improving, what is strained and which interventions could help.

### Catastrophe, uncertainty and early warnings
- A mature/peak civilization may eventually face a catastrophe countdown, but it must not be a fixed timer that always starts at the same civilization level. Compute risk from interacting pressures: environmental overshoot, food/water/energy buffers, infrastructure maintenance, health, social trust, inequality, governance response, technology dependence and external shocks.
- Use an explainable risk window and changing estimate (for example, “elevated risk: 8–20 simulated years”) rather than pretending to predict an exact date. A miscalculation or hidden factor may make the event arrive earlier or later than the central estimate. The countdown can narrow, widen or jump after new evidence, and strong interventions can lower risk.
- Build early warnings from observable signals: declining reserve buffers, rising resource demand, increasing pollution, recurring shortages, slower recovery after shocks, falling trust, infrastructure failures and correlated disruptions. Reports should distinguish measured facts, forecast ranges, uncertainty/confidence and rumours. Do not use arbitrary randomness alone; uncertainty should arise from imperfect surveys, delayed communications, model error and stochastic events layered over understandable causes.
- Catastrophes should emerge from causal systems and have varied outcomes: severe storm, ecological tipping point, infrastructure cascade, epidemic, supply-chain failure, political fracture or resource collapse. Give players warning signs and a chance to mitigate, evacuate, preserve knowledge or help recovery, but do not guarantee that every disaster can be prevented. Keep outcomes proportionate to world state and avoid deterministic “success causes punishment.”
- Research basis: social-ecological collapse is multi-causal and system-dependent; ecological tipping points can cascade, and warning indicators are probabilistic rather than exact prophecy. References: https://pubmed.ncbi.nlm.nih.gov/28734593/ ; https://www.nature.com/articles/s41561-021-00790-5 ; https://www.nature.com/articles/nature08227

### GGL Haven, radio/news and communications
- GGL Haven is the central physical station and operational hub. The player docks there simply using the same reusable interaction system as landing on planets. Haven is where the player can choose settlers, equipment, supplies and later missions; it is not a substitute for physically travelling through the system.
- The station news/radio service summarizes colony status, discoveries, milestones, requests for help, environmental warnings, technology breakthroughs, trade disruptions, cultural developments and catastrophe forecasts. Reports must be generated from the simulation state, not authored as disconnected flavour text.
- Treat communications as a game system: each world has a communications status and last-contact time; reports may be delayed, incomplete or stale when a relay is unavailable, a station/planet antenna is down, or distance/conditions interfere. Show report timestamp/source and uncertainty. The station cannot report events it has not yet detected.
- News should be readable at a glance on mobile: short headline, affected world, severity/status, what is known, uncertainty, and available response. Detailed history/chronology can live behind a tap. Use varied report types rather than a wall of generic text.
- The first implementation can use deterministic local simulation and a simple radio report queue; do not build online multiplayer or real-time server infrastructure merely to simulate in-world radio.

### Simulation, persistence and player trust
- Separate visual scene objects from authoritative simulation state. Planet conditions, equipment, population, civilization metrics, communications and risk forecasts should be represented as structured data rather than inferred from mesh colour or UI text.
- Use a bounded simulation timestep and a clear game-time scale. Progress should advance predictably during active play; offline/background progression and cross-session persistence are future decisions and must not be claimed until implemented and tested.
- Keep system rules explainable and inspectable. News, visual changes and metrics must agree with the same state model. Avoid hidden state changes that contradict player feedback.
- Design mobile-first: short readable reports, large touch targets, minimal overlays while flying, and more detailed management panels when docked/landed. Respect reduced motion and avoid unnecessary rendering/animation costs.
- The first playable vertical slice should prove the entire loop with one world before scaling the simulation across all five: simple dock/land → deliver one equipment tier and settlers → watch slow measurable progress → reach a safe founding threshold → see obvious visual change and settlement milestone → receive a radio report at Haven. Then generalize the data-driven system to the remaining four distinct worlds.
- Preserve `docs/SPACE-SHIP-HUB-DESIGN.md` as historical design context and update it when a future implementation plan is explicitly approved. Do not treat its older Phaser 2D mechanics, old prices or timers as current requirements without reviewing them against this direction.

### Research references
- NASA environmental control/life support (air, water recovery, oxygen, waste): https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/
- NASA deep-space habitation (habitat, health, radiation and long-duration needs): https://www.nasa.gov/humans-in-space/deep-space-habitation-overview/
- NASA habitable zone / liquid-water context: https://science.nasa.gov/exoplanets/habitable-zone/
- NASA terraforming limitations: https://www.nasa.gov/news-release/mars-terraforming-not-possible-using-present-day-technology/
- Maslow hierarchy empirical review and later measurement research: https://doi.org/10.1016/0030-5073(76)90038-6 ; https://pubmed.ncbi.nlm.nih.gov/23858951/ ; https://www.sciencedirect.com/science/article/pii/S0305750X23000037
- Social-ecological resilience and collapse: https://pubmed.ncbi.nlm.nih.gov/28734593/ ; https://www.nature.com/articles/nature08227


## Graphics, rendering and visual-direction decision gate

When the user asks about a game's graphics, rendering, visual style, appearance, or “look”, treat this as a **decision stage before implementation**, not automatic permission to change the game.

- Pause before coding and inspect the current game's actual renderer, scene structure, available assets, and existing visual baseline.
- Explain the current approach in plain English and compare only relevant alternatives, including what each makes easier/harder, asset requirements, mobile performance, and implementation cost. Use visual references or examples when useful, clearly distinguishing generic references from screenshots of our actual game.
- Agree on the intended player-facing look and rendering approach before implementation: for example, Phaser, Three.js, PixiJS, regular HTML/CSS, Canvas 2D, or a hybrid. Do not assume that a library alone determines the game's quality.
- For interactive decision narratives, preserve this principle: **This can use Phaser, regular HTML/CSS, or a hybrid. The important work is the quality of the decisions, causal consequences and narrative—not the rendering engine.**
- For **PixiJS**, preserve this description: **A 2D rendering library focused on fast graphics, sprites, filters and visual effects. Like Three.js, it isn't a complete game engine by itself. Good for visually rich 2D worlds, effects-heavy scenes and custom interfaces where we want to build the game systems ourselves.**
- Choose based on the intended experience, causal/gameplay needs, real available assets, and device constraints—not novelty or engine popularity. Prefer a strong, asset-backed result over a flashy concept made from placeholder shapes.
- Do not migrate engines, replace assets, or change the established game's look/control layout as an exploratory step. Present the trade-offs and get the user's direction first; then implement the smallest approved slice and verify it.

## GGL Space — gameplay and controls preservation lock (2026-10-29)

- **The existing playable experience is the baseline.** Preserve the gameplay, flight behaviour, game controls, control placement, camera/viewport, game layout, and interaction flow across the entire experience. Do not redesign or rearrange them while working on another feature.
- **No unsolicited additions.** Do not add new controls, panels, dashboards, overlays, prompts, menus, mechanics, notifications, or decorative effects just because they seem useful or impressive. No “funny things” that change the established experience. Add or change something only when the user explicitly requests it or approves a clearly scoped proposal.
- **What happens in the game is what happens.** Feedback, effects, HUD values, radio/news, mission notes, and progression must reflect actual game state and events. Never fake impacts, discoveries, progress, docking, deliveries, or rewards. Visual improvements must communicate real gameplay, not replace it with UI.
- Keep flight uninterrupted: do not require the player to stop flying, open/collapse a board, read a panel, or scroll the page to continue normal gameplay. Any already-approved essential contextual action must remain in-world, concise, and appear only when relevant; do not let it cover the ship, aim, or critical flight view.
- Keep controls stable and usable on mobile and desktop. Do not change their labels, input behaviour, position, sizing, or layout as collateral work. Do not remove or remap working inputs. Preserve touch and keyboard paths that already work.
- Before any requested gameplay change, inspect the actual current implementation and state what will change. Make the smallest isolated change, preserve all unrelated behaviour, and verify the affected interactions. If a request appears to require changing a protected control/layout, stop and ask for approval rather than guessing.
- These rules apply to every future GGL Space task and take precedence over speculative feature ideas or broad redesign suggestions. Existing GGL Space delivery/discovery requirements below remain in force, but they do not authorize changing the protected controls or experience.

## GGL Space — simplified playable delivery and discovery loop (2026-10-29)

- Player loop: dock at GGL Haven → accept passengers and terraforming machines → fly → dock at a planet → drop off machines → watch the planet change during active play → return to Haven → publish passenger travel notes and earn station acclaim.
- Docking is proximity plus one clear action, reused at Haven and planets. No precision landing, speed/orientation tests, or hidden prerequisites. Planet visits are allowed without equipment; equipment deployment requires carried equipment.
- GGL Haven must be a physical 3D object near spawn, with readable station news/radio and a simple cargo board. First board can provide a small fixed bundle of passengers and machines.
- Terraforming machines must be physical scene objects left on the surface after delivery, not icons or UI-only counters. They appear only after delivery. Active-play time advances restoration gradually, and planet appearance changes from that same progress state. Do not claim offline progress or persistence until implemented and tested.
- Passengers accompany the player; visited worlds and notable events are recorded. Returning to Haven publishes short passenger travel notes and awards station media acclaim. Do not describe passengers as settlers if they remained aboard.
- First version may use authored note templates and local state; no AI-generated reports, permanent saves or server radio claims until implemented. Current planets: Aster, Cobalt, Verdant, Ember and Frost.
- Future after QA: passenger personalities, skills/relationships, morale/health/sleep/recreation, discoveries, settlement population, needs/production, delayed radio contact and civilization development. Do not add these before docking/cargo/deployment/travel-notes are verified.
- Human-behaviour basis: NASA crew journal studies cover work, communications, adjustment, crew interactions, recreation, equipment, organization, sleep and food. Keep journaling short and tied to actual trips; isolation and communication delay can later affect morale/teamwork.
- Research: https://www.nasa.gov/missions/station/iss-research/mental-well-being-in-space/ ; https://ntrs.nasa.gov/citations/20100026549 ; https://www.nasa.gov/directorates/esdmd/hhp/team-risk/ ; https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/


## GGL Space — simple station-to-planet delivery loop (2026-10-29)

- ELI5 loop: dock at GGL Haven → board passengers and terraforming machines → fly → dock at a planet → leave machines physically visible on the surface → planet appearance changes gradually while machines are active → return to Haven → publish crew trip notes and earn media acclaim.
- Docking is proximity plus one obvious action. The same principle applies at Haven and planets; no precision landing challenge or hidden prerequisite. Planet visits are never blocked by having no equipment. Only equipment deployment requires equipment aboard.
- Haven is a physical 3D station close to the starting ship position, paired with a simple station board: current bulletin, passenger/equipment pickup and return-note publication. Keep the first cargo offer fixed and understandable, not a complex inventory system.
- Equipment must be actual visible 3D scene objects left at a planet after delivery, not icons or UI-only counters. Planet changes must be driven by the same state as delivered equipment and restoration progress. Machines are only revealed after delivery.
- Passenger loop: passengers travel with the player, visited planets are logged, and returning to Haven publishes short trip notes. Notes may mention planet visits and later verified events such as asteroid destruction. Reward modest station media acclaim. Do not imply passengers become settlers if they merely rode on the ship.
- First implementation may use local state and authored note templates. Do not claim permanent saves, AI-authored notes, server-backed radio or offline progression unless implemented and tested.
- Later evolution after this loop is QA'd: individual crew voices and roles; skills; morale affected by recreation, sleep, workload, isolation and crew relationships; discoveries and science logs; planet settlers and basic needs; local food/water/energy production; social trust and governance; eventually civilization development and uncertain catastrophe forecasting. Keep these out of the first slice until docking, cargo, visible deployment and return notes work.
- NASA astronaut journal research found recurring themes in work, outside communication, adjustment, group interaction, recreation, equipment, events, management, sleep and food. NASA also highlights isolation, communication delays and team cohesion as risks on long missions. These make good later crew systems, not prerequisites for the first loop: https://www.nasa.gov/missions/station/iss-research/mental-well-being-in-space/ ; https://www.nasa.gov/reference/risk-of-inadequate-teamwork/ ; https://www.nasa.gov/directorates/esdmd/hhp/team-risk/


## GGL Space — trip-specific passenger group and media reporting (2026-10-29)

- Passengers must be named individuals, not only a cargo count. Each has a clear reason for travelling and a preferred discovery type (for example astronomy, travel writing, geology/unusual rocks, biology, engineering or history). Keep the first group compact and legible.
- Passenger reactions and published notes must be grounded in events recorded for that trip: worlds actually visited, machines delivered, restoration visibly achieved, asteroids actually destroyed, and other discoveries only when the game has observed them. Never fabricate a discovery or use interchangeable generic praise.
- Represent the travelling party as a group with a collective assessment derived from the trip's actual outcomes. Individual passengers can support that assessment or disagree for a character-specific reason tied to their interests, evidence, priorities or risk tolerance. Dissent is meaningful interpretation, not random contrarian dialogue.
- Example: an astronomer comments on a celestial observation actually encountered; a travel writer describes the route and events; a geologist reacts to an asteroid/rock only if one was actually observed or destroyed; an engineer assesses machines actually deployed. If a preferred discovery did not occur, the passenger can express disappointment or focus on something else that genuinely happened.
- The station's logistics news/media-acclaim loop should turn these trip facts and differing perspectives into a short report: headline, factual mission summary, collective verdict, one or two grounded individual perspectives (including dissent when appropriate), and earned acclaim. Reports should reflect actual deliveries and discoveries, not generic flavour text. Do not imply a reporter or passenger witnessed events beyond recorded game state.
- First implement deterministic, data-driven profiles and report templates from local trip facts; no external AI or server infrastructure is required. Keep the state and evidence behind each line inspectable so the text cannot contradict gameplay. Add persistence only when explicitly implemented and tested.
- QA this after the basic dock/board/fly/deliver/return loop is working. For each retry after a Vercel build-rate-limit failure, confirm the new main commit's own deployment reaches READY and verify the live GGL Tournaments route before calling it testable. Do not claim named passengers, individualized voices or trip-grounded media are implemented until the live game demonstrates them.

## GGL Space — approved living-civilisation foundation (2026-10-29)

This is the product owner's approved direction for GGL Space. It supersedes any earlier wording that treats conflict as something the player should be discouraged from creating. Preserve the newest golden flight/visual baseline and implement incrementally.

### Core identity and player freedom
- GGL Space is a hands-on space-pilot civilisation sandbox: the player physically flies, chooses cargo, delivers people and finite machinery, and influences a living world whose societies act independently.
- GGL Haven begins with 60 people. All starting civilisation lineages originate from Haven. Settlements may branch off and later become independent; there is no pre-existing unrelated faction that is the default source of all other populations.
- There is no mandatory moral path or single authored victory condition. The player may sustain civilisation, build thriving colonies, remain neutral, provoke conflicts, betray populations or deliberately destroy civilisation. The world should model consequences rather than block a chosen play style.
- Primary game-over is extinction of the entire civilisation population. Losing GGL Haven is a severe but recoverable crisis if any colony population survives.
- Survival time is the primary high-score dimension; population thriving, resilience, colonies, discoveries and other outcomes can provide supporting records. Do not make peacefulness, hostility, expansion or a single alignment the sole scoring objective.

### Planet restoration and finite logistics
- Planet habitability is represented by visible, distinct levels and progress-to-next-level on the system map and nearby-target console.
- A planet that cannot sustain people requires machinery deliveries first. Repeated deliveries plus elapsed simulation time move it through the required restoration stages.
- Restoration has a deliberate logistics trade-off: deploying more finite, time-limited machinery should accelerate terraforming, while consuming more of the player's scarce equipment stock. Do not allow equipment to be infinite or make one delivery instantly finish a world.
- Once a planet reaches the relevant safe-enough stage, the player can deliver crew with equipment to establish operations. The crew subset is responsible for operating/maintaining the installed machinery; later progress should not be treated as passive equipment magically working without local people.
- After establishment, later deliveries may carry people, machinery, or both, chosen by the player. Account for cargo capacity, station/colony stock, replenishment time, local manufacturing and environmental resources.
- Population grows over time. Conditions of peace and adequate resources generally support faster growth; war, casualties, shortages and damaged infrastructure reduce it. Settlements have carrying capacity and can suffer overcrowding if the player transfers too many people.
- Colonies gradually become capable of producing their own equipment and spacecraft. Manufacturing requires time, local resources and functioning infrastructure; it can be delayed or interrupted by conflict, damage or player actions. Colonies are not merely passive extensions of Haven.

### Relationships, conflict and ship encounters
- Social relationships emerge from a settlement's experiences, interests, resources, trust and remembered player actions. Cooperative, neutral, strained and hostile are all valid states; neutrality is not an error state.
- Abandoning crews on planets that cannot sustain them can kill them. After a failed crew mission and no contact, Haven should investigate and lose trust; repeated incidents can cause Haven to close docking access, develop its own spacecraft and potentially become hostile toward the player.
- Docking access and relationships must affect available actions. If a population has an enemy, the player may choose to dock with that enemy and offer support, including risky or illegal crew/equipment offboarding to attack another settlement. This can alter the war and make the player a target of retaliation.
- Conflict can escalate into destruction; cooperation can also leave societies vulnerable if they neglect preparation. Do not force the player to initiate conflict, and do not automatically punish peaceful but resilient societies. A larger uncertain system-level catastrophe should reward observation and preparation rather than arbitrary unavoidable death.
- Keep early encounters with occasional stray/foreign enemy ships manageable but engaging: the player should have a credible chance of winning, taking damage and retreating. Damage can be repaired at GGL Haven. Ships built and fielded by hostile planetary settlements should be tougher and more consequential than basic stray encounters. Scale difficulty through readable signals and gameplay, not dense stat sheets.
- Preserve hands-on flight and projectile combat. Combat should be readable in the 3D world: enemy approach, attack telegraph, hit/damage feedback, retreat/defeat, and repair opportunity at Haven.

### Time, persistence and truthfulness
- The simulation advances while the game is closed. Implement this with persisted world state plus a last-simulation timestamp and bounded/capped catch-up steps so long absences cannot cause unbounded computation or instant inexplicable extinction.
- Distinguish active gameplay time from elapsed world time. Explain important offline consequences on return and provide sensible warnings before irreversible losses where the game rules permit.
- Do not claim offline progression, persistence, independent colonies, construction, diplomacy, ship combat, or a feature's completion until it is implemented and tested in the live game.
- Keep the world state and cause-and-effect inspectable in code. Prefer deterministic, testable rules before adding random events. Randomness must be bounded, explainable through clues and not erase player agency.

### Staged implementation and QA-to-play discipline
1. **Control correction first:** NOS must sit immediately to the LEFT of FIRE on the mobile control grid. Preserve existing flight physics, input behaviour, projectile mechanics, touch targets and the newest golden visuals.
2. **Document foundation:** keep these rules in AGENTS.md as the source of truth; do not broaden scope or revert to an older golden version.
3. **World model:** implement typed state for the 60-person origin population, where populations live, cargo and finite machinery inventory, production/replenishment, planet stages, local operators, carrying capacity, relationships, spacecraft construction and simulation timestamps.
4. **Planet/logistics loop:** make machinery quantity affect restoration speed and inventory consumption; gate ordinary settlement on habitability while allowing explicit risky choices only when the UI communicates the danger; make crew operate machinery after settlement.
5. **Population and society loop:** growth, needs, local production, independence, trust and docking permissions; make consequences derive from recorded events.
6. **Ship encounters and conflict:** basic foreign ships first, then colony-built ships, combat feedback, damage and repair at Haven; support player-instigated escalation without requiring it.
7. **Offline simulation and save:** persist state, apply bounded elapsed-time simulation, report what happened while away, and handle extinction/recovery/high-score rules.
8. **Playable checkpoint:** complete an end-to-end run from Haven cargo selection through multiple equipment deliveries, elapsed terraforming, crew establishment, return, population/faction consequences and a ship encounter/repair. Then run focused regression checks and prepare a concise user QA report. Do not add unrelated features before this loop is sound.

After every implementation push, inspect the exact GitHub commit, verify the affected code/build where available, check the matching Vercel deployment until READY, and verify the production GGL Space route when practical. Report each state separately: commit pushed, code/build verification, deployment status, and live QA status. If the deployment is queued or blocked by a platform limit, say so clearly and do not tell the user the new version is ready to test. Continue short implementation/QA cycles until the owner confirms the world is alive enough to save and play; after that, prefer small targeted updates.

### Clarification — deterministic opening and the original 60 (2026-10-29)
- All future independent settlements must be founded from people who originate in the initial GGL Haven population of 60. Do not seed unrelated independent groups or unrelated starting populations.
- The opening state is deterministic: GGL Haven has 60 people; the five existing planets begin at deliberately authored, visibly distinct habitability levels and with defined machinery requirements. The player learns the system by inspecting these planets and choosing the first deliveries.
- The first playable mission loop is: inspect planet states; select a finite cargo load of machinery, people, or both where permitted; fly and deliver; let simulation time pass; observe readable environmental/habitability changes and progress to the next stage; return for more supplies; establish an operating crew when the world reaches the required threshold; then observe the colony grow and eventually branch into an independent society.
- Do not make the opening dependent on random planet states or random starting factions. Deterministic rules should make the first run reproducible and understandable. Emergent behaviour comes later from player actions, elapsed time, population, production, remembered events and relationships.
- Visual communication is a core feature, not polish to defer: each habitability stage must be immediately distinguishable in the system map and near-planet view through coordinated colour, atmosphere/surface treatment, machinery/colony silhouettes, progress-to-next-stage indicators and clear interaction prompts. The player should understand what a planet needs without reading long technical panels.
- Machinery is a finite time/throughput trade-off: more compatible machines deployed can increase restoration speed but consume more stock and may need local operators, power, maintenance or environmental resources. Equipment type and quantity requirements must be authored per planet/stage rather than using one generic counter as the final model.
- Crew are the seed of the colony and its local capability. A settlement cannot become independent before crew have arrived and established operations. Future faction identity and spacecraft emerge from the descendant population, resources, history and choices—not from unrelated pre-created factions.
- The first complete playable release is this opening-to-emergence loop, with enough visible world changes, population/logistics rules, independent-colony consequences and approachable ship encounters to feel alive. Avoid expanding scope into dense simulation screens; prioritize hands-on flight, legible visuals, simple side-console decisions and causal feedback.

## GGL Space — living-world simulation checkpoint — 2026-10-29

- The implementation source of truth is `src/app/ggltournaments/game/space-civilisation.ts`, used by `racing-warmup.tsx` and `racing-3d-scene.tsx`. Preserve the existing flight physics, ship camera, station marker, flight controls, transfer signals and NOS placement.
- The opening world is deterministic. Haven starts with 60 people and 12 finite terraforming machines. The ship holds at most 6 people and 4 machines; loading transfers people out of Haven's on-station population and machinery out of stock. Haven retains a 36-person reserve when boarding. Returned unused crew/machines go back to stock.
- The five worlds begin in five different authored habitat bands: Ember 6% / 6 machines to found; Frost 26% / 5; Aster 46% / 4; Cobalt 66% / 3; Verdant 86% / 2. Habitat thresholds are 20/40/60/80%; each stage has a distinct colour. The ship may found a settlement only at 80%+ habitat and once that planet has its own required installed machine count. This leaves meaningful choices about where the finite initial stock goes.
- Suggested first foothold: guide the player to Cobalt at 66% THIN AIR so delivery of its required three machines visibly moves it across the 80% HABITABLE threshold. This is a suggested first mission, not a lock: the player can visit and develop any planet. Objective logic must distinguish loading missing machinery, delivering it, waiting while installed machinery advances habitat, collecting crew, and founding a settlement; do not send the player back to load machines when the world only needs simulated time.
- Terraforming progresses only with deployed machines and simulated time. Local operators add a smaller efficiency bonus. Haven and descendant settlements grow over time, bounded by capacity. A colony may become self-governing only after reaching 18 people and existing for at least 7 simulated days; every colony originates from people who left Haven.
- The 3D view ties surface tint, atmospheric glow, forcefield colour/opacity, visible machine arrays and revealed settlement silhouettes to the same state. Do not display a static five-card civilisation dashboard below the game. Teach through a compact mission cue over the flight view, an animated system-map route/target, a pulsing 3D navigation beacon, brief world-change signals, and a contextual station/planet console only when in range. The proximity console shows Haven population/remaining machine stock or planet stage/progress/installed-vs-required machines/safe crew capacity. At Haven, crew and machinery are separate actions; machine load quantity is selectable so stock is not wasted automatically.
- Save key: `ggl-space-world-v1` in browser `localStorage`, including the world clock and last-simulated timestamp. On reopen/resume, offline catch-up follows the accelerated clock but is capped at 7 simulated days. This checkpoint is browser/profile-local, not cloud/cross-device save.
- This is the first simulation checkpoint, not the entire planned game. Resource extraction/manufacturing, richer colony requests/culture/diplomacy, combat consequences and extinction/Quiet Threat logic are not yet implemented. Do not describe them as complete.
- Deployment/QA note for this checkpoint: GitHub's Vercel status is failing with the project's build-rate-limit upgrade page. Do not ask the owner to judge this checkpoint on production until a matching Vercel deployment can build and the changed route is verified.

## GGL Space — individual lives, planetary hazards and emergent civilisation design (2026-10-30)

This is the next approved design direction for GGL Space. It extends the living-civilisation foundation above; it does not authorize immediate gameplay changes. Preserve the latest accepted golden version of the playable flight game, controls, camera, NOS/FIRE, HUD placement, station/planet interactions and existing saved-world compatibility. Design and review each implementation slice before coding.

### Core design principle
- The player experiences a living civilisation from inside the existing spaceship. The simulation should become deeper over time without making the flight screen busier.
- Model life from the individual upward: individual people → families and social networks → local groups/institutions → colony populations → inter-colony relationships and civilisation-wide outcomes.
- Individual events must causally contribute to collective outcomes. Population-level reports must be traceable to the people, conditions and events that produced them.
- Use detailed individual simulation for the original 60 Haven people and important named characters. As populations grow, use cohorts/aggregated demographic calculations for routine people while retaining individual identities, family links, life histories and consequential named agents. Do not require expensive frame-by-frame AI for every resident.
- Simulate on bounded world-time ticks, not every render frame. Keep rules deterministic and testable first; add bounded uncertainty only where it improves replayability and is explainable.

### New-game opening and the psychological seed of Haven
- A deliberate New Game creates a deterministic opening seed; loading an existing save never silently regenerates it. Existing saved runs must not be overwritten by a new-game implementation.
- Haven begins with the original population of 60. Every future colony, family lineage and independent society must descend from this original Haven population; do not seed unrelated factions.
- The 60 must be individual people, not 60 interchangeable units. Give each a stable identity and a compact profile: age/life stage, a small set of personality tendencies, capabilities/skills, needs, values/priorities, social ties, family ties where applicable, origin experience and personal reason for joining the Haven project.
- Personality is probabilistic, contextual and capable of change. It is not a moral label, a fixed destiny or a clinical diagnosis. Examples of useful tendencies include curiosity, caution/risk tolerance, cooperation, independence, ambition, empathy, fairness, attachment to tradition, adaptability and need for security. People with the same tendency can behave differently because of their skills, relationships, memories, resources and circumstances.
- Give the founding population a mixed psychological/cultural seed rather than making Haven uniformly good, bad, peaceful, aggressive, brave or selfish. The founding story may contain several motives for pioneering: refuge/survival, freedom/autonomy, exploration/curiosity, scientific purpose, family opportunity, resource opportunity, duty/service, escape from conflict or pursuit of status. These motives can coexist and disagree.
- Treat recurring themes in human media/history as narrative lenses and fictional cultural archetypes, not as evidence that a real nationality, ethnicity, religion, class or population has one personality. Do not stereotype real groups or infer psychological truth from a headline. The simulation should show how inherited beliefs and stories are challenged or reinforced by lived experience.
- Preserve a visible distinction between inherited starting conditions and later choices. People inherit family, skills, beliefs, resources and memories; relationships, education, hardship, success, migration and institutions can change their future behaviour. The initial seed influences probabilities, never dictates a single outcome.
- The opening five planets should be in their harshest authored habitability band, with at most one planet beginning one stage above the others; that slightly better world must still be unsafe for ordinary settlement. This replaces the older 6/26/46/66/86 opening values for a newly generated run only, after an explicit reset design and migration plan. Do not silently alter an existing golden save. Exact per-world values, environmental identities and equipment recipes must be authored and reviewed before implementation.
- The opening station and ship remain functional but vulnerable. The first hours should teach inspection, survival logistics, equipment delivery, observation and preparation; no unrelated starting populations or instant thriving colonies.

### Individual life simulation
- Each individual can have a life course: birth/childhood, learning, work/service, relationships, family/care responsibilities, ageing, illness/injury, recovery, contribution, death and remembered legacy. Not every person must experience every stage in one run.
- Needs and wellbeing should be multidimensional: air/food/water/shelter/health/safety plus belonging, purpose, autonomy, recognition, learning and meaningful activity. Do not implement a rigid Maslow ladder where higher needs are impossible until lower needs are perfect.
- People develop relationships through proximity, shared work, communication, trust, compatibility, conflict, mutual help and remembered events. Relationships can become friendship, partnership/love, family, mentorship, rivalry, estrangement, reconciliation or hostility. Do not make relationship changes random or instantaneous.
- Families and offspring emerge from consenting adult partnerships and the social/environmental conditions that make family life possible. Children inherit a blended set of tendencies and family/social context, not a deterministic copy of parents. Births require suitable care capacity and affect food, shelter, education and long-term population structure.
- Death is a real possibility from age, illness, accidents, violence, environmental exposure, shortages, disasters or failed missions. Causes must be recorded. Do not use arbitrary invisible death rolls; show warning signs and allow prevention/rescue where the world state makes it possible. Death changes families, friendships, work capacity, leadership and collective memory.
- Skills and roles should emerge from aptitudes, education, experience and opportunity: engineering, medicine, agriculture/ecology, logistics, science, leadership, security, mediation, construction, navigation and other useful roles. No role is a permanent class.
- Hero moments are consequential events grounded in a real crisis or opportunity: a rescue, sacrifice, discovery, successful repair, mediation, courageous warning, breakthrough or defence. They can change trust, morale, skills, relationships, institutions and future storylines. Do not award a generic hero score for routine actions or force every story to have a hero.
- Important personal events should be remembered in a compact life-history/event record. Narrative should select a few consequential events, not publish every relationship tick or daily activity.

### From individuals to collective populations
- People form households, friendships, work teams, interest groups, civic institutions and political subgroups. Membership may overlap and change; do not reduce each colony to one personality or one faction.
- Collective identity emerges from shared origin, leaders, common experiences, environment, institutions, resource conditions, communications, victories, losses and stories told about the past.
- Population dynamics include births, deaths, ageing, migration, immigration, emigration, displacement, settlement capacity, health, education, labour, skills and social cohesion. Growth is not automatically good; decline is not automatically failure.
- Carrying capacity is dynamic and multi-factorial: safe habitat, food, water, energy, housing, healthcare, ecological productivity, maintenance, waste handling and social capacity. As population approaches or exceeds sustainable limits, show specific pressures (shortages, overcrowding, ecological decline, disease risk, infrastructure wear, inequality or conflict). Do not make a single magic population number cause instant planetary death.
- A planet can support a temporary population above its sustainable capacity, but the cost compounds. Population may adapt through better technology, changed consumption, production, trade, migration, family planning choices, restoration or governance. Different groups may disagree about who bears the cost.
- Colony-level culture and institutions should develop from individual histories. A colony can contain cooperative, ambitious, cautious, independent, traditional, reformist, security-focused or other subgroups. These are contextual tendencies, not fixed alignments.
- Independent colonies may cooperate, trade, remain neutral, compete, fracture, ally, become hostile, reunify or recover. Their relationship with Haven is based on remembered actions and current incentives: promises kept/broken, supplies, rescue, neglect, fair/unfair exchange, security, autonomy, representation and shared threats.
- Conflict may include disputes, sabotage, discrimination, organized violence, civil fracture or war. It must have identifiable causes, actors, incentives and consequences. Cooperation is also a strategic choice and can fail if dependencies or risks are neglected. Do not make war an arbitrary random event or a required stage.
- Migration decisions must consider both push and pull factors, family/social ties, information, resources, travel risk, receiving capacity and individual choice. Do not treat settlers as anonymous cargo once they arrive.

### Planet ecology, asteroids and the dangerous power-dust threat
- Planets remain environmentally harsh at the beginning. Terraforming is difficult, slow and conditional; machines require compatible resources, energy, operators, maintenance and time. Equipment does not make a planet permanently safe by itself.
- Planets can be struck by ordinary asteroids/debris and larger impact events. Asteroid effects should be physically and ecologically meaningful: surface damage, crater/debris, atmospheric dust, blocked light, temperature/precipitation changes, damaged infrastructure, disrupted power, crop/ecosystem decline, casualties and habitat setbacks according to event severity and planet properties.
- Small impacts may be survivable and locally damaging; larger events can damage the ship or Haven station, disable machinery, destroy habitats, cause mass casualties or reset a planet's living ecosystem. The most severe events can render a world uninhabitable for a long recovery period. Do not make every impact extinction-level.
- The ship and GGL Haven station are also vulnerable to dust/asteroid damage. Track damage by subsystem (hull, propulsion, navigation/sensors, weapons, life support, power/communications) only to the level that creates clear repair choices. Show actual effects in flight/station operations and allow repair using finite materials, time and suitable specialists.
- Introduce a rare fictional high-energy/charged "power-dust" body or field as a major system threat. Its severity can range from sensor/equipment disruption and local damage through major habitat collapse, mass casualties and near-total biosphere reset. Make clear in the fiction that this is a designed speculative hazard, not a claim that ordinary asteroid dust behaves like a supernatural targeted force.
- The user's "happier planets attract it more" direction should be represented as prosperous, active, highly terraformed worlds emitting stronger detectable energy/industrial/biosphere signatures that can increase exposure or encounter probability. Do not make happiness or wellbeing itself a punishment variable. A thriving world may have more to lose and a more visible signature, but preparation, shielding, monitoring and mitigation can reduce risk.
- Threat occurrence is not a fixed timer or a guaranteed punishment for success. After an initial period of world development, risk can emerge from orbital conditions, observed debris, energy signatures, planetary activity and uncertainty. Some threats may be detected early; others may be discovered late. Risk estimates should be ranges with confidence, not false precision.
- The threat must be studyable. Telescope/sensor upgrades, asteroid tracking, dust sampling, scientific teams, probes, observatories, historical impact records and inter-colony data-sharing improve detection and forecasting. Reports should distinguish confirmed observation, hypothesis, forecast and rumour.
- A major threat creates a legible warning and response window when detection permits: observe → assess likely impact and uncertainty → choose deflection/shielding/repair/stockpiling/underground shelter/evacuation or accept risk → countdown/update → impact and aftermath. New evidence can change the estimate. Never force an evacuation countdown without a discoverable cause or any possible response.
- Evacuation is a real logistical and social decision. The player may transport a limited number in the current ship; later colony-built or upgraded vessels can expand capacity. People may refuse or delay leaving because of family, beliefs, leadership, distrust, lack of information, scarce seats or confidence in local protection. Groups may disagree; leaders and trusted messengers affect response. Track who is evacuated, who remains, where they go, available shelter/capacity and family separation. Do not imply a planet was evacuated if only a few passengers boarded.
- Planetary destruction does not automatically end the game if descendants survive elsewhere. Preserve the established rule: loss of Haven is recoverable if another descendant population survives; game-over occurs only when the entire civilisation population is extinct.

### Trade, immigration and the spaceship as a civilisation service
- Mature populations can develop distinct resource systems, currencies or exchange units based on their own production and institutions. Avoid inventing interchangeable currencies before trade is actually available.
- Colonies may request passenger/settler transport, evacuation, specialist delivery, equipment freight, scientific surveys, diplomacy/courier work, repairs, defence or emergency aid. They may pay the player in their local currency/resources, offer contracts or provide reciprocal services depending on trust and economic capacity.
- The spaceship becomes a useful link between ecosystems: transport people, goods, knowledge, specialists, messages and emergency support. Its value to each population emerges from what that population needs and can afford.
- Player earnings can fund ship upgrades. Separate cosmetic customisation (hull colours, paint, visual effects, engine/fire appearance, NOS visual style) from performance upgrades (cargo capacity, sensors, shielding, propulsion, repair systems, defensive systems). Cosmetic changes must not secretly change balance; performance upgrades must have clear costs, trade-offs and visual feedback.
- Ship appearance and upgrade UI must be contextual and compact, preferably through the existing Haven/colony interaction when docked. Do not add a permanent new HUD panel, page or scrolling dashboard. Preserve the current flight controls and screen layout.
- Services, payments, currencies and upgrades must be recorded in the same simulation economy and event history. Do not award money or reputation for work not completed.

### Narrative, news and chronicle
- The narrative engine is event-driven. It consumes verified simulation events from individual lives, family/social networks, population groups, planet ecology, economy, relationships, hazards, ship services and player decisions.
- Use three information depths: (1) one short in-world signal for urgent/current events; (2) contextual planet/station inspection for what is happening and what can be done; (3) a chronological civilisation chronicle for consequential histories and high-score recaps.
- Storylines should connect causes and consequences over time: a person’s rescue can become a hero story; their leadership may later shape a colony; a resource discovery can create prosperity and rivalry; a family split during evacuation can affect trust for generations. Every report must be grounded in recorded events and known information.
- Media in the fictional world can disagree and frame the same event differently according to their interests, access to evidence, trust, political alignment and audience. Separate fact, interpretation, opinion, rumour and propaganda. Media must not know events that their source has not observed or received.
- Population changes are newsworthy when they cross meaningful thresholds or alter the society: births/ageing, notable deaths, migration, overcrowding, recovery, skills shortages, family/leadership changes, faction formation, resource stress and shifts in colony independence. Avoid daily spam.
- High scores are timeline-based civilisation records, not only a number. Preserve survival time as the primary dimension; include population wellbeing, resilience, habitable worlds, discoveries, trade, migration, hero moments, recoveries, conflicts, deaths and other milestones as supporting evidence. Recap what happened, why, who was affected and which player decisions mattered. Do not reward one moral alignment exclusively.

### Clutterless interface and implementation order
- Preserve the current golden flight view, ship controls, NOS/FIRE, camera, map, mini-map, station marker and existing contextual menu placement. Do not add persistent panels or move controls to make room for simulation features.
- Main flight view shows the world and urgent signals only. Use the existing contextual planet/station menus for local inspection and actions. Use the existing collapsible Ship Manifest only for concise status and explicitly approved save/load or deeper details; keep it collapsed by default.
- Use short headlines and one-line consequences in flight. Detailed biographies, relationship histories, production recipes, population breakdowns, impact studies, diplomacy and chronicle entries appear only when the player deliberately opens the relevant existing menu/context.
- Prefer one relevant next decision over a large list of stats. Group information by the player's current task: inspect, deliver, repair, settle, negotiate, trade, study or evacuate.
- Development order:
  1. Protect the latest golden version and complete the agreed Pause/Restart/Save/Load flow without disrupting flight.
  2. Introduce contextual target assist for planets, asteroids and recoverable floating equipment; targeting assists aim but does not auto-fire. Preserve projectile/physics baseline and define distinct scan/recover/damage interactions.
  3. Establish the typed individual/person/family/event model for Haven's 60 and a deterministic new-game psychological seed; keep old saves safe and versioned.
  4. Add basic life-course needs, relationships, skills, births/deaths and causal personal story events for a small population slice; validate that events affect the collective.
  5. Add planet ecology, finite recipes/manufacturing, operators, maintenance, carrying capacity and resource production.
  6. Scale individual histories into households, subgroups, colony identity, governance, migration and relationships with Haven/other colonies.
  7. Add asteroid damage and repair, then the studyable power-dust threat with warning, response and evacuation.
  8. Add trade, currencies, colony contracts, immigration and ship-service/upgrades.
  9. Add the event-driven news/chronicle and timeline high-score recap across all systems.
- Each stage must have a playable, testable checkpoint before the next is started. Do not implement every system at once. Use focused simulation tests for births/deaths, relationship changes, capacity/shortage feedback, asteroid severity, evacuation accounting, event causality, offline time and save migration. Keep population calculations bounded and performant on mobile.
- No implementation is authorized merely by this design update. Before gameplay code changes, inspect current main and the latest accepted golden branch, compare actual code to this design, propose the smallest first slice and its acceptance tests, then proceed only within the approved scope.
- Research grounding and caveats:
  - Agent-based modelling supports heterogeneous individuals with bounded information, memory, local interactions and environmental feedback; it is a modelling approach, not a claim that simulated agents reproduce real human psychology. https://arxiv.org/abs/1806.04359 ; https://arxiv.org/abs/2306.03446
  - Migration decisions involve interacting push/pull factors, individual and household ties, resources, social networks and intervening constraints; do not reduce pioneers to one motive. https://publications.jrc.ec.europa.eu/repository/bitstream/JRC112622/imd_report_final_online.pdf ; https://publications.iom.int/system/files/pdf/migration_trends_web.pdf
  - Game motivation research supports autonomy, competence and relatedness as useful design lenses, but recent critique warns against applying Self-Determination Theory as a shallow checklist. Use it to test meaningful choices, understandable mastery and believable social connection, not as a formula. https://selfdeterminationtheory.org/wp-content/uploads/2017/01/2016_Uysal_Yildirim_Gamer_Psych_Beh.pdf ; https://arxiv.org/abs/2405.12639
  - Asteroid impacts can create dust, atmospheric and ecological effects that vary by impact scale and planetary conditions. Earth impact research is a scientific analogy; the fictional high-energy power-dust threat and its attraction/signature rules are game fiction. https://www.nasa.gov/wp-content/uploads/2023/06/nasa_-_planetary_defense_strategy_-_final-508.pdf ; https://www.pnas.org/doi/10.1073/pnas.2408721121
  - Carrying capacity is context-dependent and includes infrastructure, resources, ecological and social quality-of-life constraints; avoid one universal population cap. https://academic.oup.com/ieam/advance-article/doi/10.1093/inteam/vjaf021/62178396
  - Evacuation behaviour depends on personal attributes, environment, procedures, communication and social ties; information networks and trust affect collective response. https://arxiv.org/abs/2310.15761
  - Media frames can shape how the same event is interpreted; distinguish event facts from framing and opinion. https://arxiv.org/abs/2410.03151



## GGL Space — golden baseline and mandatory development workflow (2026-10-30)

### Latest accepted golden baseline
- The product owner explicitly QA-approved the Pause / Restart / Save / Load lifecycle preview on 2026-10-30.
- The approved implementation was merged by PR #15. Golden merge commit: `457ae87145cc220e4eca47bfd8e69e0d231bb8b1`.
- This commit is the accepted GGL Space golden baseline for the next development cycle. Preserve it as a recoverable reference branch named `golden/ggl-space-2026-10-30-lifecycle`; do not rewrite or delete it.
- It includes the existing pink ship and protected flight baseline, GGL Haven map marker, event-triggered crew/equipment signals, existing civilization foundation, centred pause overlay, confirmed civilisation restart, versioned world+flight autosave, manual save/load in the expanded Ship Manifest, and paused-aware offline progression.
- The accepted QA preview was tested and approved by the product owner. Production release still requires the matching Vercel deployment to reach READY and route verification; do not conflate merge approval with deployment verification.
- If later work regresses, recover only the affected feature/files from this golden baseline. Never reset all of main or discard unrelated later work.

### Mandatory workflow for every future GGL Space chat/session
1. Read this AGENTS.md and the GGL Space roadmap below before touching code. Do not ask the product owner to restate decisions already recorded here.
2. Inspect current GitHub `main`, the current golden reference branch, relevant game source, simulation modules, tests, and QA docs. Verify the actual latest commit; do not rely on chat summaries alone.
3. Treat `main` as the accepted production baseline and create a fresh feature branch from current `main` for each coherent milestone/slice. Never develop directly on `main`.
4. Preserve the golden baseline and all protected flight behaviour: ship handling, steering, thrust/reverse, altitude, NOS, FIRE, projectiles, camera, collision, rendering, mini-map, GGL Haven marker, crew/equipment signals, contextual menus and panel placement. Do not refactor or redesign these while implementing simulation features.
5. Implement one coherent, playable, testable slice at a time. The product owner may authorize work across several roadmap milestones, but each milestone must still have its own acceptance checks and working checkpoint. Do not mark a milestone complete merely because its types or UI exist.
6. Add/update focused automated tests for deterministic simulation rules, save migration, offline progression, event causality, resource accounting, damage severity and evacuation accounting as applicable. Run the repository's actual lint/typecheck/test/build scripts; report any check that cannot be run rather than implying it passed.
7. Deploy the feature branch to a Vercel Preview. Verify the preview build is READY and the exact GGL route responds. Give the product owner the preview URL and a concise mobile/desktop QA checklist.
8. Do not merge a feature branch to `main` until the product owner explicitly approves that preview. After approval, merge, preserve the resulting accepted golden checkpoint, verify the matching production deployment and live route, then create a fresh feature branch from the new accepted baseline for the next cycle.
9. Report branch, PR, commit SHA, test/build status, preview URL, production deployment status and QA status separately. Never claim implementation, merge, deployment or QA that has not actually happened.
10. Unexpected result = STOP → inspect actual state → identify first failing assumption → make the smallest correction → rerun relevant checks. Do not compensate with speculative changes or repeatedly trigger builds.

### Roadmap numbering and current scope
The detailed design below contains **nine** development-order items, not seven. The product owner's current requested scope is to progress through item 7; items 8 and 9 remain later roadmap work unless separately approved.

1. **Accepted / golden:** pause, restart confirmation, complete world+flight save/load, autosave and offline/pause-safe progression. Keep this as the recovery baseline.
2. **Contextual target assist:** proximity-aware aim assistance for planets, asteroids and recoverable floating equipment. Assistance may guide/align aim but must never auto-fire. Preserve projectile and flight physics. Give scan, recover and damage interactions distinct, understandable outcomes.
3. **Typed individual foundation:** model Haven's original 60 people as typed, persistent individuals with stable IDs, deterministic new-game psychological/cultural seeds, family/person/event relationships and save-version migration. Existing saves must remain safe; do not silently regenerate or overwrite them.
4. **Life-course simulation:** introduce a bounded first slice of needs, relationships, skills, work, births/deaths and causal personal events. Events must affect people and the collective state; no arbitrary invisible rolls or narrative claims unsupported by recorded simulation events.
5. **Planet ecology and production:** distinct planet conditions; finite equipment recipes/manufacturing; operators, power/material inputs, maintenance, carrying capacity, resource production and visible consequences. A machine must have a defined cost, function, output, timescale and failure/maintenance conditions.
6. **Collective societies:** households, subgroups, colony identity, governance, migration and evolving relationships with Haven/other colonies. Cooperation, neutrality, independence, competition and conflict must emerge from recorded incentives/actions rather than random mandatory plot beats.
7. **Asteroid damage, repair and power-dust threat:** proportionate impacts on planets, habitats, ship and station; repair choices using finite materials/time/specialists; a rare fictional power-dust hazard that can be studied and forecast with uncertainty; legible warning/response windows and honest evacuation accounting. The power-dust attraction/signature mechanism is explicitly speculative game fiction, not real astrophysics. Destruction of Haven is not game-over while descendant populations survive elsewhere.
8. **Later / not in current scope:** trade, local currencies, colony contracts, immigration and ship-service/upgrades.
9. **Later / not in current scope:** event-driven news/chronicle and timeline high-score recap across all simulation systems.

### Cross-milestone acceptance rules
- Keep the game an inhabitable, observable "aquarium" rather than turning it into a dashboard. Flight view stays uncluttered; use existing planet/station contextual menus and the existing collapsible Ship Manifest for deliberate detail. No new page, persistent HUD panel or scrolling dashboard without explicit approval.
- Simulation is authoritative structured state; scene meshes and UI are projections, never the source of truth. Use bounded deterministic updates and stable IDs. Seeded variation may influence outcomes but must not dictate them.
- Every consequential event needs a cause, affected entities, timestamp, and durable event record. Separate confirmed facts, estimates, opinions and rumours.
- Save compatibility is mandatory. Version every schema change; migrate older saves deliberately; never destroy a valid manual save when autosave/restart fails.
- Keep population simulation bounded and mobile performant. Avoid pretending 60 people require an expensive high-fidelity agent simulation; use compact state and event-driven updates.
- Never silently alter starting planet conditions, Haven's 60-person origin, initial stock, or existing save meaning. New-game balancing changes require explicit migration/reset design and product-owner review.
- Test new-game seed determinism, old-save migration, pause/resume, offline progression, save/load round trips, restart preserving manual saves, simulation determinism, causal events, capacity/shortage feedback, impacts, repair, warning/forecast updates and evacuation accounting as each applies.


## Current GGL feature branch checkpoint — 2026-10-30

Active branch: `feat/ggl-space-milestones-2-to-7`, based directly on the accepted `eff5d936311b5e66747fc9b72455b6889661bea4` main checkpoint and its golden recovery branch.

Implementation progress (do not overstate completion):
- **Item 2 — implemented slice:** soft aim assist for player-fired shots toward planets/asteroids in a forward range/cone; no auto-fire. Added a floating equipment cache with a separate proximity recovery action. Existing planet inspection and asteroid FIRE damage remain distinct interactions.
- **Item 3 — foundation implemented:** deterministic named records for the original 60 people; stable IDs, ages/life stages, motivations, traits, needs, skills, households and relationships; migration from legacy count-only saves; named-person transfers on boarding/return/settlement; compact names in existing manifest/contextual console.
- **Item 4 — partial:** needs, age, life stage, skills and relationship trust/affinity evolve with world time. Unsafe material needs create warnings. Birth/death causality, full family histories, illness/accident/violence systems and event-driven personal arcs remain outstanding.
- **Item 5 — partial:** planet-specific environmental and resource profiles, extraction, maintenance load, fabrication progress/modules, maintenance-dependent restoration reliability and ecology-dependent colony growth. Full recipe chains, station production, supply logistics and maintenance action/repair workflows remain outstanding.
- **Item 6 — partial:** colony trust with Haven, autonomy, provisional/local-council/self-governing states and motivation-based civic groups; support visits update trust and prolonged absence reduces it. Migration, faction negotiation, diplomacy, conflict, independent decisions and docking permissions remain outstanding.
- **Item 7 — partial:** asteroid collision hull damage, finite-machine ship repair at Haven, orbital/power-dust forecasts, mitigation using finite machines, and planet/ecology impact aftermath. Full station damage, advanced threat study/sensor upgrades, evacuation accounting and shelter/transport response remain outstanding.
- Full scope and hands-on QA steps are in `docs/SPACE-MILESTONES-2-7-QA.md`.

Do not merge this feature branch or call items 2–7 complete. First obtain a READY preview for the exact latest branch commit, run the QA checklist, correct any regressions, and get explicit owner approval. The Vercel build-rate limit can block preview creation; wait for it to clear rather than spamming commits/builds. Item 8 and item 9 remain outside this branch's requested scope.


## GGL Space — post-preview QA findings and active follow-up (2026-10-30)

The product owner QA-tested the READY preview at commit `7d9291d42f3a52cc5128ed788d67f75181975101`. It was merged to `main` through PR #17; merge commit: `93666216e30e0ab7a796d73dfea3ed4be7eaa24f`. The active follow-up branch is `feat/ggl-space-qa-followup`, created from that merge commit. This section supersedes the earlier pre-approval instruction that the Milestones 2–7 branch must remain unmerged.

### QA findings — failures and partial results
- **Combat assist — failed/not observed:** firing near planets and asteroids did not demonstrate aim assistance. Trace FIRE input → target acquisition → projectile guidance → collision/impact. Only guide shots the player fires; never auto-fire.
- **Cache recovery — failed/blocked:** floating cache appeared but its recovery button was not pressable. Fix touch/pointer hit testing, layering, disabled/proximity state and event propagation. Confirm recovery with a visible signal and exactly +1 finite machine cargo; test full cargo and repeated taps.
- **Colonies/history — partial:** settlement founding worked, but no meaningful history/storylines appeared. Build a durable Haven chronicle first, then colony-specific histories derived from founding, people, family relationships, resource/governance decisions and hazards. All narrative must be projections of structured, causal event records, not fabricated story facts.
- **Docking/hazards — failed:** asteroid impacts continued while docked at or near Haven. Add an explicit docking action/state and clear safe-harbour feedback. Docked ships must be excluded from ordinary asteroid collision damage. Proximity alone is not docking.
- **Machine resupply/repair — gameplay gap:** the player could not understand how to replenish Haven machine stock to repair the ship. Build a clear finite chain for inputs, production queue/time, output, storage, transfer and repair consumption. Explain costs and duration; no infinite or unexplained stock.
- Other tested systems were reported good. Preserve golden flight handling, camera, steering, thrust/reverse, altitude, NOS, FIRE cadence, rendering, map, pause/save/time and settlement flow; retest after relevant changes.

### Required implementation order
1. Make equipment recovery reliably touch-accessible and verifiable.
2. Fix combat assist/projectile feedback while proving no autonomous fire.
3. Implement explicit docking and safe-harbour hazard rules.
4. Implement understandable finite Haven machine production/resupply and ship repair.
5. Implement persistent Haven history and causal personal/family events, then colony-specific chronicles.
6. Continue deeper life-course causality, migration/diplomacy, colony autonomy, station damage and evacuation in later coherent slices.

### Acceptance gates
- Add focused automated tests for touch interaction, target selection/guidance, docking collision exclusion, resource conservation/production timing, event persistence and save migration.
- Preserve save compatibility; test pause/resume, offline progression, save/load, restart, mobile controls and golden flight behaviour.
- Keep work on `feat/ggl-space-qa-followup` until the exact latest preview is READY and the product owner completes hands-on QA and explicitly approves merge.
- Preview handoffs must link directly to `/ggltournaments`, not the Admin Hub root. Verify deployment commit, READY status and route response before sharing.
- Detailed findings and acceptance checklist: `docs/SPACE-MILESTONES-2-7-QA.md`.


### Follow-up implementation checkpoint (branch `feat/ggl-space-qa-followup`, 2026-10-30)
- Equipment recovery UI now explicitly restores pointer/touch interaction and ignores transient transfer-signal pointer events; still requires mobile QA.
- Player-fired aim assist now acquires within a 42-degree / 340-unit window and guides toward the near target surface with stronger bounded steering. No auto-fire; still requires gameplay QA.
- Explicit Haven docking is persisted compatibly. Flight inputs undock; ordinary asteroid hull collision is suppressed while docked at Haven. Mere proximity is not docking.
- Structured chronicle records Haven origin, habitat stage changes, settlement founding, governance/independence changes, equipment recovery, docking/undocking, ship repair, machine production and asteroid hull impacts. Contextual station/planet menus show recent records. Full family/personal life histories remain incomplete.
- First finite machine loop: deployed planet machinery enables mining finite resource stock into 20-unit ship material cargo; return/dock at Haven to unload; 6 materials queue one machine; 4 simulated system hours complete it into finite Haven stock. Repairs consume machine stock.
- Do not describe these as QA-passed. Exact preview for latest branch commit must be READY and tested by the product owner before merge. Vercel reported its API deployment allowance exhausted for 24 hours during preview creation; do not retry or spam builds before the limit resets.

### QA handoff refresh (2026-10-31)
- Fresh documentation-only chore checkpoint; preserve all gameplay implementation and keep PR #18 unmerged pending exact-commit READY preview and product-owner QA.


## GGL Space — product-owner direction and current main checkpoint (2026-10-31)

This section is authoritative where earlier roadmap wording or workflow instructions conflict.

### Main release checkpoint
- PR #18 was explicitly directed by the product owner to be merged and was merged to `main` on 2026-10-31.
- Squash merge commit: `74c7910eeade5478108bc628eb34174f96c6d2a6`.
- Source branch: `feat/ggl-space-qa-followup`, source head: `83a2632a5e5f90ba153eb926df481d339383c5e0`.
- The merged implementation includes touch-accessible equipment recovery, bounded player-fired aim assist (never auto-fire), explicit persisted Haven docking/safe harbour, structured persistent Haven/colony chronicle records, and finite planetary resource mining → ship cargo → Haven delivery → machine fabrication → repair consumption.
- The finite mining-and-delivery loop is already the beginning of resource logistics and trade-related gameplay. Do NOT describe roadmap item 8 (trade and ship services) as wholly unstarted or outside the user's scope. It is **started / partial**: resource extraction, cargo transport and delivery to Haven exist. Further trade systems such as exchange, contracts, currencies, inter-colony commerce and ship services may still be developed, but do not erase or discount the working resource-delivery loop.
- Item 9 (full event-driven news/chronicle and timeline high-score recap) is also not wholly unstarted: structured persistent event records and contextual chronicle presentation have begun. Full personal/family histories, richer narrative perspectives, civilisation-wide news and timeline/high-score recap remain incomplete.
- Do not repeat obsolete instructions that PR #18 must remain unmerged. It is merged.

### Product-owner's requested GGL Space refinements — implementation status
- **Chronicles:** implemented as a dedicated, independently openable/closeable Civilisation History drawer, separate from the contextual Planet Menu. Haven and each of the five planets have their own collapsible history group; each history has an internally scrollable event list. Do not put the histories back inside the planet operation panel or create a full-screen dashboard.
- **Target feedback:** implemented as a temporary world-space acquisition reticle and target identity label on the actual aim-assist target for player-fired shots only. Never add autonomous firing.
- **Toast stacking:** notifications and transfer signals are layered above menus and remain non-interactive so they cannot steal taps from game controls.
- Preserve the approved ship/flight controls, camera, mini-map, Haven marker, manifest, proximity actions and mobile layout while making any further changes.

### Workflow instruction — obey explicit product-owner release direction
- The product owner is the final decision-maker for scope, merge and release. The assistant is the technical implementer/navigator.
- When the product owner explicitly instructs "merge and push to main", do not substitute an assistant-created QA gate, preview requirement, or preference for a different sequence. Execute the requested merge/push directly, unless GitHub itself blocks it or a genuine technical/security constraint prevents it. Report the actual blocker plainly; do not silently decide not to merge.
- Do not ask the product owner to repeat decisions already stated. Do not respond to a direct implementation instruction with a plan telling the owner what they should do.
- Continue to report deployment readiness and QA status accurately and separately from Git merge status. A merge is not proof that Vercel production has deployed or that the owner has tested the latest version.
- For this requested UI refinement, inspect current `main` after merge, implement the three requested changes, run available checks, commit and push to `main` as directed. Do not expand scope into unrelated milestone redesigns.


### GGL Space UI refinement implementation checkpoint — 2026-10-31
- The first chronicle accordion pass was superseded by the owner-requested cleaner information architecture: a dedicated Civilisation History drawer is now independent of the collapsible Planet Menu. Haven and each planet's chronicle are separate collapsible groups inside that drawer; long histories scroll internally.
- Implemented a temporary world-space acquisition ring and target-identity label on the actual aim-assist target when a player-fired projectile acquires it. It remains tied to player FIRE; no autonomous firing was added.
- Raised toast and transfer-signal stacking above game menus and made these transient overlays non-interactive so they do not intercept menu controls.

### GGL Space — player-start lifecycle and exact new-civilisation baseline — 2026-10-31 (supersedes the active-entry wording above)
- Opening or re-entering GGL Space must show the current world in a **READY** state with a clear **START GAME** action. The simulation, flight physics and active-play world clock must not start until the player explicitly chooses START GAME. Do not auto-start on page entry and do not use racing terminology such as "Start Racing".
- Re-entry restores the latest autosaved world and ship, then waits for START GAME. Apply offline catch-up only when the previous saved session was actively running; a previously paused or ready world remains frozen. Loading a manual save restores that saved civilisation/ship and also waits for START GAME. Manual saves remain separate from the active autosave.
- Restart Civilisation returns to the exact authored new-game baseline, not the previous run's state: Haven has its original 60 named founding people, 12 finite machines and 12 stored materials; ship cargo is empty; there are no colonies, deployed machines, visits, progress, accumulated ecology changes or later chronicles; world time is zero; hazards and production queues are reset; the ship returns to its authored spawn. The separate manual save is preserved.
- **Every planet begins at 0% restoration** on a new game and after restart. Preserve their distinct environmental identities, resource/ecology profiles and machinery requirements: Ember 6 machines, Frost 5, Aster 4, Cobalt 3, Verdant 2. Zero restoration does not mean identical planets. Cobalt remains the suggested first foothold because its machinery requirement is the lowest practical entry point, not because it starts partly restored.
- The original 60 people are the founding seed of the civilisation; every future colony descends from them through actual player-led transfers and settlement. The intended demographic simulation is a plausible future human civilisation, not a permanent population total of 60 and not an arbitrary fixed cap. Model household/family formation, age and life stages, births/deaths, health and integrated needs, skills/education, work/meaning, resource and infrastructure capacity, ecological pressure, migration and social development as causal systems with visible consequences. The current simple Haven growth formula and 240-person cap are transitional placeholders, not the approved long-term demographic model; do not present them as completion of this roadmap or silently invent a replacement population target.
- Confirming restart pauses the current run while confirmation is open. Cancelling restores the exact prior state (running, paused or ready). Confirming resets the flight scene as well as authoritative simulation data, so cached 3D objects cannot visually survive the new-world reset.
- Keep the opening self-explanatory without a mandatory racing-style tutorial: show Haven, the original founding population, finite starting inventory and five untouched worlds; after START GAME, the first loop is inspect worlds → load finite people/machines at Haven → fly and deliver machinery → observe timed habitat restoration → return for crew/material logistics → establish descendant settlements.
- Preserve the dedicated Civilisation History drawer, contextual Planet Menu, flight controls, camera, mini-map, Haven marker, manifest, proximity actions and mobile layout.
- Latest implementation commits before this correction: `c63ba71c9cc59907775a6c9b0cb681a5ae23e61f`, `2b8194aeb28251de3e9b66ca25e01aaa2e04d842`, and `59d2a6e816693f9eae76355743318bc34a091114`. Current baseline correction commits are recorded in Git history and must be verified before QA.
- Build and live-route verification remain separate from the GitHub commit. Product-owner hands-on QA remains separate.


## GGL Space — macro founding networks and authored world origins — 2026-10-31

- The original 60 are a living founding population, not 60 separate biography assignments. Their authored social starting point is five interconnected population networks, each spanning founding households and carrying a distinct shared agenda, origin, pressure point and links to other networks. Household and person simulation remains causal and emergent; do not turn every resident into a chronicle entry.
- Civilisation History must present these macro agendas and their connections. Chronicle entries are reserved for civilisation-scale turning points and notable people whose actions materially affect the population. Do not narrate every person or manufacture personal events to fill a timeline.
- Aster, Cobalt, Verdant, Ember and Frost each have a distinct authored survey-origin account, known conditions and unresolved frontier questions. All five begin at 0% restoration and remain uninhabitable. Their different ecology/resource profiles and machine requirements are preserved; Cobalt is only a lower-cost first investment, never a partly habitable starting world.
- Canonical network seeds live in src/app/ggltournaments/game/space-people.ts; planet-origin canon and opening chronicle events live in src/app/ggltournaments/game/space-civilisation.ts. The dedicated Civilisation History drawer surfaces networks and per-world origins. Legacy saves retain their recorded chronicle and receive any missing canonical origin entries; existing planet progress is not reset during save migration.
- Preserve the golden flight controls, camera, start/pause/save/restart lifecycle, mobile interactions, finite machine loop and existing QA fixes. This feature branch is for owner QA; do not merge until its exact preview is READY and the owner approves after testing.
