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
- Search rule for future opportunity research: start from the current date and work backwards; prefer small/founder-led/global companies and direct human routes; exclude generic job boards, faceless recruiter routes, US-only/region-locked roles, and opportunities that are only vaguely described as "remote." Verify global eligibility and a direct official company route before presenting an opportunity as confirmed global. Include games/browser/Phaser opportunities alongside apps, SaaS, product, technical operations, support, and systems work.

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

## Customer acquisition / buyer-priority refinement — 2026-10-03
- The direct-business search is now a **customer-acquisition search**, not merely a search for businesses that could theoretically use software. Rank prospects by likelihood of becoming the user's **first/next paying customer**.
- Prioritize businesses that combine: (1) obvious recurring operational pain, (2) an owner/founder/manager who can decide directly, (3) existing evidence that they spend money on software/services/equipment/marketing, (4) a workflow that can be improved incrementally, (5) a small enough organization to avoid procurement friction, and (6) a concrete ROI story that can be demonstrated quickly.
- The first target market should generally be **small owner-operated field-service businesses** in Europe and North America: trades, maintenance, specialist contractors, equipment/tool rental, mobile service businesses, small repair/service companies, and similar businesses with jobs, customers, quotes, scheduling, follow-ups, recurring work, or field operations.
- Next prioritize **small equipment/tool rental businesses** because inventory → availability → booking → deposit → delivery/pickup → return → maintenance is a clear software workflow with established commercial willingness to pay.
- Then prioritize **small commercial contractors/maintenance businesses**, followed by **small heavy-truck/equipment/mobile repair businesses**, then transport/fleet, cleaning, hospitality, professional services, and other categories according to concrete evidence of buying readiness.
- Do not assume a generic automotive repair shop is an easy sale: established shop-management software is common in that market. Prefer smaller heavy-duty/mobile/service operations where a focused customer/job layer can complement existing accounting or repair software rather than attempting to replace a mature system.
- Treat games as a **secondary specialist sales engine**, not the default first-customer market. Pursue games/interactive experiences when there is an obvious commercial use such as training, education, promotion, branded engagement, events, customer loyalty, or an interactive product.
- Search for **buying signals**, not only vacancies: owner-led business, recent growth, multiple staff/vehicles/assets, active service booking, recurring jobs, customer enquiries, manual/WhatsApp/phone workflows, spreadsheets/paper processes, weak customer portals, fragmented booking/request handling, recent expansion, or evidence of spending on existing software/services.
- A prospect with no published vacancy can still be a valid direct sales target. Clearly label it as a **direct business-development/contract prospect**, not a job opportunity.
- Rank prospects using descriptive factors rather than arbitrary scores: **pain visibility, owner accessibility, spending capacity/evidence, workflow fit, implementation simplicity, urgency/buying trigger, and expansion potential**. Do not invent financial capacity; use observable evidence.
- The user's commercial model should be treated as **low-risk entry → prove value → expand**. Botswana P100/P200 30-day starter packages are evidence of a low-friction approach, not a fixed international price. For Europe/North America, compare against current category software pricing and position the first engagement around a small useful workflow rather than trying to sell the entire system immediately.
- The reusable business-app/PWA engine should be framed as modular stages: **customer/request → pipeline → job/workflow → staff/scheduling → quotes/invoices → customer-facing URL/portal → integrations/automation**. The ideal mature product is a branded customer/pipeline URL for that business, but do not require every first sale to reach that stage.
- Infrastructure economics must be measured rather than guessed. The user's 25GB/month planning figure is a current internal planning model, not a customer-facing price or universal quota. Track database records separately from heavy media/storage, because photos, videos, PDFs and other uploads can dominate storage costs.
- When prospecting, prefer businesses where the user's existing repo evidence maps directly to the problem: Atlas/Namane for automotive/tyre/heavy-service workflows; Translend for transport/fleet; Richmore Construction for construction; SuperShine for cleaning; Meating Place/BOEMO for food/hospitality/order workflows; PurePress for publishing/production; invoice/dashboard/admin systems for general business operations; Admin Hub Games/Shooters Trigger for browser-game/interactive opportunities.
- The user's strongest commercial positioning is: **build and operate practical business systems**, not simply "freelance developer." The search should favor prospects where the user can investigate the workflow, build the first useful slice, troubleshoot it, operate/support it after launch, and expand it as the business proves value.
- For every future customer-prospect search, work from current date backwards and return the **highest buyer-readiness targets first**, with a concise reason for why each is likely to buy, what specific workflow to pitch, the likely entry-level offer, and the direct human contact route. Continue permanent exclusions and never repeat researched/applied prospects.

## Strict no-web-app / no-digital-system prospect filter — 2026-10-03
- The direct customer-acquisition search must now favor businesses that are **behind the digital curve**, not businesses that already have a web app, customer portal, online booking system, quote/request platform, scheduling dashboard, ecommerce workflow, or other substantial custom digital product.
- A polished website alone is **not** disqualifying. The key question is whether the business already has a meaningful software system serving its operational/customer workflow.
- **Strong positive signal:** no website at all, only a Google/Maps/local listing, Facebook/Instagram page, directory listing, phone number, WhatsApp, email, or word-of-mouth presence. These should be searched aggressively because they are more likely to have a real digitisation gap.
- **Also strong:** a basic brochure website with static pages, phone/email contact, opening hours, photos, and no customer portal, booking workflow, account area, live availability, job tracking, quote workflow, online ordering, scheduling, or other app-like functionality.
- **Do not return as priority prospects:** businesses with an existing customer-facing web app/PWA, online portal, online booking/request workflow, ecommerce system, customer login/account area, live inventory/availability, job-status tracking, integrated CRM/customer portal, or a sophisticated scheduling/operations platform. If such a system exists, the prospect is normally excluded from the first-customer search rather than pitched a replacement.
- **Do not be fooled by a modern marketing site:** inspect the actual customer journey. A company can have an attractive website and still be an excellent prospect if customers are ultimately told to call, email, WhatsApp, visit, or fill out a simple static contact form.
- **Explicit negative signals:** "Book online", "Schedule service", "Customer portal", "Client login", "Track my job/order", "Request a quote" with a structured workflow, online checkout, live stock/availability, app download, customer dashboard, self-service account, or obvious SaaS-backed operations.
- **Positive workflow signals:** "Call us", "Text us", "WhatsApp us", "email us", "walk-ins welcome", "appointments by phone", paper forms, spreadsheet references, manual quotes, phone-based dispatch, manual follow-up, or no visible digital workflow beyond basic communication.
- **No-website rule:** when a verified business has **no independent website**, elevate it substantially in the prospecting queue if there is enough evidence of an active business, direct human contact, and a plausible workflow pain. Do not automatically assume that no website means they need software; verify activity and identify the specific operational gap.
- **Do not substitute weak websites with hidden apps:** search results that show a business through a directory, marketplace, booking aggregator, or social page must be checked for whether the underlying business has its own app-like workflow. Do not treat an aggregator listing as evidence that the business itself has a digital system.
- **Discovery method:** use local/business search plus web search where useful. For each serious prospect, inspect the official website if one exists, then inspect its actual customer/contact flow. If there is no official website, use the strongest available business listing/social/contact evidence and explicitly mark "no independent website found" rather than inventing one.
- **First-customer bias:** if two otherwise similar prospects exist, prefer the one with the **less developed digital presence** but a clearer operational workflow to digitise. The purpose is to find a business that can plausibly say, "we currently do this by phone/WhatsApp/paper/spreadsheet; can you make it easier?"
- **Do not pitch software where software is already the core product:** SaaS/software companies with mature internal/customer platforms belong in employment/contract searches, not this no-web-app first-customer prospect pool.
- **Required prospect evidence before returning a target:** identify (a) current digital presence level, (b) whether a meaningful app-like workflow already exists, (c) the concrete manual workflow visible from public evidence, (d) the owner/human contact route, and (e) why the first small PWA/app slice would solve a real problem. If these cannot be established, do not return the business as a high-priority prospect.

## Direct-business prospect exclusions — 2026-10-01
- Permanently exclude the first 16 prospects from the 2026-10-01 direct-business search batch; do not return them as new targets unless explicitly requested.
- The excluded first 16 are: Truck Doctor; Wrench Power Truck Repair; Pooni Truck Repair; Central Truck and Tire; Sahlani's Truck Centre; Tridem Services; Coates Contracting & Rentals; RTT Equipment Rental; Outcrop Equipment Sales & Rental; Wawa Rent-All; Steves Rental; BDM Equipment; Cockerham Commercials; Alltrucks Aberdeen / Kirkside Garage; Richmond Plant & Tool Hire; Walker Hire.

## Permanent direct-business prospect exclusions — 2026-10-03
- Treat BOTH previously researched direct-business prospect sets as permanently excluded from all future customer-acquisition searches unless the user explicitly asks for a follow-up, re-contact, different opportunity, or materially new development.
- Set 1: LJ Cannings; Eurotool Hire & Sales; Enfield Hire; Macroom Tool Hire; Kelly Plant Hire; Boss Plant Hire; Ovenden Allworks; Express Plant Hire; RSD Tool Hire; Prime Equipment Rentals; Riverside Equipment Rentals; Affordable Equipment Rental; NorthPoint Equipment Rentals; Equipment Rental Service; Five Star Equipment Rental & Supply; B&W Rental; Disaster Equipment Inc. (DEI); Superior Gear LLC; Ready Rental & Contracting LLC; Mike's Diesel Repair; Cannon Heavy Truck Repair; Phantom Works Diesel & Auto; Derrell's Garage & Equipment Sales; Roy's Trucks & Equipment; Diesel Dynamics; Wrench 'Em Auto & Diesel; Diesels of Dallas; GTC Services; Legacy Diesel Repair; Hex 6 and Co Diesel Repair; Integrity Auto & Diesel Repair; ADF Diesel Toronto; KT Motor-UK Ltd; Adrenaline Diesel; Central Power.
- Set 2: Toucan Hire; Castlegate UK Ltd; FJC Hire; North London Plant Hire; T.Handley Plant Hire; ADG Plant Hire; Dulwich Diggers; DAP Hire; Breckland Plant & Tool Hire; Purple Hire Solutions; S.E. Davis & Son; Teward Bros; CanLift Equipment; ANT Equipment Group; Bercon Rentals; Pacific Truck & Trailer Service; DK Auto & Diesel Services; Flawless Diesel Repair; Modern Diesel; Rapid Rescue; Kinetic Repair Services; RentX; Austin Rent Way.
- These exclusions apply whether the future search is for a vacancy, contract opportunity, direct software/PWA pitch, business-development prospect, or game/interactive-service pitch. Never recycle them as "new" targets.
- Future direct-business searches must maintain a separate exclusion check against both sets before returning any prospect, while employment/application searches must continue using their existing separate exclusion list.

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

## Build Log presentation
- Public /updates is a visible Admin Hub evidence surface and must be CV/client-safe: light editorial styling, strong contrast, clear chronology, restrained status/category metadata, readable summaries, and responsive mobile layout.
- Public update detail pages at /updates/[slug] use the same light editorial system and must not fall back to the legacy dark operations UI.
- The homepage BUILDING NOW block may show the latest update's aggregate recorded view count; /updates may show aggregate recorded update views. These are Firestore Build Log read counts, not Vercel site-traffic totals.
- Vercel Web Analytics remains a separate aggregate traffic system. Do not label Build Log read counts as visitors or Vercel analytics.


## Mandatory two-track fresh opportunity search — 2026-10-03
- **EVERY fresh opportunity search must contain BOTH tracks. Never return only one.**
- **TRACK A — JOBS / CONTRACT WORK:** actual current global employment or contract opportunities the user can apply/contact for, including small/founder-led software companies, SaaS, product, technical operations, implementation, support, QA, frontend/product development, research/content, and indie/browser/game/Phaser work.
- **TRACK B — DIRECT CUSTOMER PITCHES:** actual new businesses the user can directly approach as a potential paying customer for Admin Hub's business-app/PWA or relevant game/interactive capability, using the strict no-web-app/no-digital-system filter and all permanent prospect exclusions.
- The final answer must visibly separate the two tracks with headings such as **JOBS / CONTRACTS** and **DIRECT CUSTOMER PITCHES**.
- A search is **incomplete** if either track is missing, even when one track produces fewer results. If one track has no verified new targets, explicitly say so rather than silently omitting it.
- Apply the appropriate exclusion list to each track: employment/application exclusions for TRACK A; all permanent direct-business exclusions plus the no-web-app/no-digital-system filter for TRACK B.
- Do not let the direct-customer search replace the jobs search. Do not let the jobs search replace the direct-customer search.
- For TRACK A, verify global/Botswana compatibility before calling an opportunity confirmed global; for TRACK B, verify the business and its digital-presence/workflow gap before calling it a serious pitch prospect.

## Opportunity search correction — direct-contact + role-fit standard — 2026-10-03
- **Direct customer contact:** For every TRACK B prospect, explicitly investigate whether WhatsApp is publicly available before presenting the target. Check the official site, Google/Maps/business listings, Facebook/Instagram, directory listings, and publicly displayed phone/contact details for a WhatsApp button, click-to-chat link, or explicit WhatsApp wording.
- Label WhatsApp evidence precisely:
  - **WhatsApp confirmed** = an explicit WhatsApp link/button or business source explicitly identifies WhatsApp.
  - **WhatsApp likely** = a publicly listed mobile number appears suitable, but there is no public proof the business uses WhatsApp.
  - **WhatsApp not found** = searched relevant public sources and found no reliable WhatsApp route.
- Never convert a phone number into a claimed WhatsApp contact without evidence. If a wa.me link is found, preserve the exact public route rather than inventing or modifying it.
- For each serious TRACK B target, provide the preferred first-contact channel in this order where evidence supports it: **WhatsApp → direct phone → direct social DM → direct email/contact form**. Include the actual human/owner name when publicly documented.
- A WhatsApp route is a buyer-access signal, not proof that the business needs software. Continue to require the existing no-web-app/no-digital-system and concrete-workflow evidence before ranking a prospect highly.

## Opportunity search correction — jobs must be materially relevant, current, and directly actionable — 2026-10-03
- **TRACK A must not be a generic list of "remote software jobs."** Search specifically for roles that use the user's combined profile: **product systems builder + technical operations/product operator + implementation/support + business systems + frontend/PWA + QA/troubleshooting + research/documentation + browser/game development**.
- Search current openings **starting from the current date and working backwards**. Prefer openings that are newly posted, recently updated, explicitly still open, or have a live official application/contact route. Do not pad results with old/stale listings merely to increase the count.
- For every TRACK A role, verify before presenting it:
  1. The company is real and the role is genuinely open/current.
  2. The role's geography explicitly permits **Botswana/worldwide/international remote** or the company explicitly accepts contractors worldwide. Do not infer this from a generic "remote" label.
  3. The application/contact route actually works or is visibly maintained on the company's official site. Prefer a direct company careers page, official application email, founder/hiring-manager contact, or official application form.
  4. The role materially overlaps with the user's evidence. Explain the overlap in concrete terms rather than using generic "good fit" language.
  5. The opportunity has not already been applied to, researched, excluded, or returned as fresh in a prior search.
- **Role families to search aggressively:** Product Operations; Technical Product Operations; Product Specialist; Product Support Specialist; Technical Customer Success; Technical Customer Support; Implementation Specialist; Implementation Consultant; Solutions/Implementation Engineer; Customer Operations; SaaS Operations; Technical Operations; Business Systems / Systems Operations; Product QA / QA Engineer; Manual QA / QA Analyst; Release / Deployment / Support Operations; Technical Account/Customer Operations where genuinely hands-on; Application Support; Support Engineer; Solutions Engineer where the role is practical rather than senior-sales-heavy; Product Coordinator / Associate Product roles; Junior/Mid Product Manager roles where experience requirements are realistic; Product/UX research operations; Technical Writer / Documentation Specialist; Developer Relations / Developer Advocate where the role values building + explaining; frontend/product developer roles involving React/Next.js/TypeScript/PWA; web application developer roles; automation/integration roles; AI automation implementation/solutions roles; browser-game/HTML5/Canvas/Phaser/JavaScript game roles; indie game production/technical design/support roles; game QA/playtesting/community roles where technical/product evidence is useful.
- **Hybrid roles are especially valuable:** prioritize positions where one person can investigate a customer/business problem, translate it into a workable system, implement/configure it, test it, support it after launch, document it, and iterate from feedback. This is the user's strongest combined evidence and should be searched as a deliberate role family rather than treated as an accidental fit.
- **Do not over-index on conventional senior software engineering or senior product management.** Include them only when the actual requirements match the user's evidence. Prefer practical builder/operator roles where commercial delivery, troubleshooting, customer communication, and independent ownership matter.
- **Do not over-index on sales roles.** Sales/client-success work is relevant when it is technical, implementation-oriented, product-led, or directly connected to customer systems. Pure commission-only cold-sales roles should not crowd out technical/product opportunities.
- **Games are a real employment/contract engine, not a token category.** Search indie studios, browser-game companies, HTML5/Canvas studios, Phaser/JavaScript shops, interactive agencies, educational-game companies, game QA/community/technical support, and small studios hiring remote contractors. Search for both development and adjacent technical/product roles.
- **Small-business software is also a real employment/contract engine:** search small SaaS, vertical software, agencies, automation companies, MSPs, product studios, and founder-led software companies for implementation, support, product operations, QA, customer success, and technical operations roles—not just developers.
- **Direct human route requirement:** when an official application is available, give it. Also look for a public founder/hiring/team contact or company email when legitimately published. If the official application is broken, stale, or dead, do not present it as an actionable opportunity; look for a working direct route or exclude it.
- **Application health check:** explicitly distinguish:
  - **Confirmed actionable** = official live application/contact route verified.
  - **Direct contact alternative** = official route is live and a direct human/company route is also available.
  - **Unclear/broken** = route appears stale, dead, erroring, or unverifiable; do not recommend as a primary target.
- **Current-date discipline:** every new search should begin with the current date, then move backwards through recent postings/updates. Search engines, official career pages, company announcements, GitHub/community hiring posts, and other direct sources may be used to discover opportunities, but the final route should be official/direct whenever possible.
- **Freshness is not enough:** a newly posted role that is geographically wrong, seniority-mismatched, technically irrelevant, or impossible to apply to is not a useful result. Relevance + geography + current status + actionable route all have to pass.
- **Search output standard for TRACK A:** each serious result should contain: **Company / Role / Posted or verified date / Global eligibility / Why it matches the user's evidence / Exact direct application or human route / Application-health status**. Keep the explanation concise but evidence-based.
- **Search output standard for TRACK B:** each serious result should contain: **Business / Location / Digital-presence level / Existing app-like workflow? / Concrete manual workflow / WhatsApp status / Owner/human route / Specific first PWA slice / Why the buyer may plausibly pay**.
- **No-result honesty:** if a search period/category produces no verified opportunity after applying these filters, say so. Never fill the list with stale, vague, region-locked, broken, or weakly related opportunities.

## Opportunity search exclusion ledger — freshness
- Maintain separate ledgers for **employment/application targets** and **direct customer prospects**.
- A company is not "fresh" merely because a different generic role appears. If the user has already applied to/researched the company, do not return it as a fresh company unless the user explicitly asks for a follow-up, a materially different role, or a materially new opening.
- A prospect is not "fresh" merely because a different branch/location appears. Treat previously researched business groups/owners as excluded unless there is a genuinely separate business and a materially different buying opportunity.
- Never use a broken application link as a recommendation simply because the job title is a strong match. Find the official current route or discard it.
- Never claim a direct human route unless the contact is publicly documented. Do not invent likely email formats, WhatsApp numbers, founder names, or social handles.

## Opportunity search correction — owner-scale + WhatsApp/no-website intersection — 2026-10-03
- **Mom-and-pop means genuinely small and human-accessible, not merely "remote-first."** For TRACK A, strongly prefer founder/owner-led companies, indie studios, family businesses, micro-SaaS, boutique agencies, and teams small enough that a founder/owner/hiring manager can plausibly see the approach. Do not use a large or mid-sized company merely because its role is worldwide.
- **Track A freshness is now two-dimensional:** verify both (1) a current actionable opportunity and (2) credible small-company/human-route evidence. If a role is global but the employer is a large corporate organization, it may be reported only when it is unusually strong for the user's exact profile and there are not enough genuinely small targets; it must not be presented as the default "mom-and-pop" result.
- **Direct-customer prospecting has a specific target intersection:** actively hunt for **small owner-operated businesses with no independent website or only a basic social/directory presence + WhatsApp explicitly confirmed + a visible manual workflow + no meaningful customer-facing app/digital system**.
- **WhatsApp-first discovery:** do not merely check WhatsApp after finding a prospect. Search deliberately for combinations such as "WhatsApp" + "no website"/"Facebook"/"call or WhatsApp" + equipment hire, tool rental, mobile repair, trades, maintenance, specialist contractors, field service, party/event rental, cleaning, and similar small businesses in Europe/North America.
- **Website absence must be verified, not assumed.** If the business is found through Google/Maps, Facebook, Instagram, Yellow Pages, Yell, Yelp, local directories, or other listings, inspect whether an independent business website actually exists. Mark **No independent website found** only after checking the relevant public sources.
- **WhatsApp confirmation must be explicit.** Accept only an explicit WhatsApp button/link, a visible wa.me/click-to-chat route, or a public business source that explicitly says WhatsApp. A phone/mobile number alone remains **WhatsApp likely**, never confirmed.
- **The strongest Track B target is the intersection, not any single signal:** small owner-operated + no independent website/basic social presence + WhatsApp confirmed + manual phone/WhatsApp/paper/spreadsheet workflow + jobs/customers/assets/scheduling/rental/quotes/follow-up to manage + no existing app-like workflow.
- **Do not pad the first-customer list with businesses that merely have WhatsApp.** A WhatsApp route is valuable because it makes the owner/customer reachable; it does not prove software need. The no-web-app/no-digital-system and concrete workflow tests remain mandatory.
- **Direct-contact output must make the evidence auditable:** show exactly where WhatsApp was confirmed, how no independent website was checked, the visible manual workflow, and the direct human route. Never fabricate a WhatsApp link from a phone number.
- **First set quality over quantity:** return fewer targets rather than weakening the intersection. A first set of 3–5 genuinely strong prospects is preferable to 10 generic businesses.


## JOBS + DIRECT PITCH SEARCH — REPLACEMENT STANDARD — 2026-10-03

**This section supersedes all earlier opportunity-search parameters that conflict with it.** The older narrow "no website + WhatsApp + no web app" intersection is no longer the master filter.

### PRIMARY OBJECTIVE
Every fresh opportunity search starts with **actual JOBS / CONTRACT WORK first**. The second lane is **DIRECT HUMAN BUSINESS PITCHES** for small businesses that could realistically hire or contract Ayanda. Never present a pitch prospect as a job vacancy.

### HARD EXCLUSIONS
Never return:
- "might be global", "probably worldwide", "remote so maybe Botswana", or any inferred geography.
- Roles whose location eligibility is not explicitly compatible with Botswana or explicitly worldwide/international/contractor-friendly.
- Faceless job boards, scraped job aggregators, generic remote-job lists, mass-application funnels, signup-first marketplaces, or intermediary approaches when a direct employer route exists.
- Upwork, Fiverr, OnlineJobs.ph, Wellfound-style marketplace hunting, or equivalent intermediary marketplaces.
- Anonymous recruiters where the actual employer/opportunity cannot be established.
- Mass/faceless corporations as the default target.
- Roles materially incompatible with Ayanda's real experience, evidence, seniority or technical/product direction.
- Commission-only sales, unpaid work disguised as employment, speculative assessments, stale/closed vacancies, or broken application routes.
- Any company already in the employment/application exclusion ledger.
- Any business already in the direct-pitch exclusion ledger.
- Recycled targets presented as new because a different generic role, branch, location, repost or title appeared.

### WHAT COUNTS AS A REAL JOB
A JOB must have:
1. A real employer.
2. A currently open role or credible current hiring need.
3. Explicit Botswana/worldwide/international eligibility or explicit worldwide contractor acceptance.
4. A verified direct employer application/contact route.
5. Material overlap with Ayanda's evidence.

Preferred routes: official company careers page, official employer ATS, official application form, public company hiring email, named founder/hiring manager/team contact, or a direct company hiring/social route. Job boards may be discovery clues only; they are not the final route when the employer's direct route can be found.

### WHO TO SEARCH FOR
Search aggressively for **small owner-led, founder-led, family-run, independent, boutique, micro-SaaS, indie studio, small agency, specialist software company, educational company, digital publisher, interactive/game company and other genuinely small teams**. The objective is human accessibility + realistic hiring/contracting + work that matches Ayanda, not "small" as a meaningless label.

### AYANDA'S ACTUAL ROLE PROFILE
Search the whole profile, not just "developer":
- Technical Operations & Product Systems Specialist
- Product builder / product operator
- Business-systems implementation
- PWA/app systems
- React / Next.js / TypeScript / JavaScript
- QA, troubleshooting and release verification
- Technical customer support
- Implementation / onboarding / customer operations
- SaaS/product operations
- Research, documentation and process improvement
- Independent client delivery
- Browser games / HTML5 / Canvas / Phaser / JavaScript
- Game QA, production, technical design and interactive experiences
- Practical AI/automation implementation

Prioritize hybrid roles where one person can investigate a customer/business problem, translate it into a workable system, build/configure it, test it, explain it, support it and iterate from feedback. Do not force conventional senior software-engineering or senior-product-management roles when the actual requirements are a poor match.

### COMMERCIAL EVIDENCE
Use as concrete matching evidence:
- 10+ years as an independent remote contractor for a UK web-app company.
- Paid ongoing, preliminary/pilot and complete client work including Markee, RedPlanet and current Admin Hub client systems.
- Two reusable engines: a business-app/PWA engine and a browser/PWA game engine.
- Existing paid client systems and real product builds.
- Ability to produce additional apps/games from reusable systems rather than starting from zero.
- Canadian New Media Journalism education.
- International publication through Canadian student presses.
- Certificates and continuing learning/development.
- Research, documentation, interviewing, source evaluation, communication and practical product ownership.
- Playable games and an engine designed to accelerate future game production.

Do not exaggerate revenue, scale, users or outcomes.

### DIRECT HUMAN BUSINESS PITCHES
When there is no vacancy, search for **real small businesses with real humans** that could plausibly hire/contract Ayanda. They may have a proper website, basic website, Facebook/Instagram, Google/Maps listing, online catalogue, WhatsApp, email/phone, or a mixture.

**A website is NOT a disqualifier.** Do not automatically prefer "no website" over a stronger business. The business, human access, workflow and buying reason come first.

Search businesses including workshops/repair, field service, trades, contractors, transport/fleet, specialist retail, equipment/service, hospitality/food, education/training, publishing/media, independent agencies, tourism/events, small online businesses, small software/product companies and indie games/interactive businesses.

### DIRECT-PITCH TEST
Before returning a serious pitch target, establish:
1. Real and active business.
2. Human owner/founder/manager or clearly human contact route.
3. Genuine operational/customer workflow.
4. Plausible reason to hire/contract someone.
5. Direct mapping to Ayanda's capability.
6. Public direct contact route.
7. Not already excluded.

Do **not** require no website, no software, or confirmed WhatsApp. Those are signals, not master criteria.

### WHAT TO PITCH
Lead with the business problem, not "I am a developer." Potential entry points include customer/request intake, jobs/work orders, customer progress/status, quotes/follow-up, field workflows, customer portals, dashboards, offline mobile workflows, document/photo collection, ordering, booking/request handling, automation/integrations, technical support/implementation, product QA, product operations, interactive customer experiences, training/education games and promotional/engagement games.

The reusable PWA engine is the main commercial engine. The game engine is a real second capability and should be used when the business has a genuine game/interactive use case.

### SEARCH ORDER
For every new search:
1. **START WITH JOBS / CONTRACTS.**
2. Search current opportunities from the current date backwards.
3. Find small human-led employers first.
4. Verify role, geography and direct route.
5. Match against the complete evidence.
6. Only then search direct-pitch businesses.
7. Check the separate employment and direct-pitch exclusion ledgers.
8. Return strongest verified opportunities first.
9. Never pad the count.
10. If a category has no genuine result, say so.

### REQUIRED OUTPUT
**JOBS / CONTRACTS**
- Company
- Exact role
- Current/open evidence and date
- Explicit Botswana/worldwide eligibility
- Concrete match to Ayanda's evidence
- Direct application or human route
- Application-health status

**DIRECT HUMAN PITCHES**
- Business
- Location
- Human/owner route
- Existing online presence
- Concrete workflow/opportunity
- What Ayanda could offer first
- Direct contact route
- Why the business could plausibly hire/contract him

Never substitute one section for the other.

### QUALITY CONTROL
The governing question is:

> **"Is there a real human on the other end who could actually hire Ayanda, contract him, or buy the capability — and is there evidence that the opportunity exists now?"**

If the evidence does not support that answer, do not present the target as actionable. The goal is not a long list; it is **real, reachable, compatible opportunities that can actually turn into paid work**.


## Opportunity search hardening — ZERO BOARD / ZERO STALE / ZERO OUT-OF-REACH — 2026-10-03
This is a mandatory refinement of the opportunity-search standard above.

### SOURCE ROUTE IS A HARD FILTER
- **Wellfound is explicitly prohibited**, including when the underlying employer is a small company. Do not use Wellfound as the presented application route or as the basis for calling a prospect actionable.
- Also prohibit LinkedIn Jobs, Indeed, Glassdoor, ZipRecruiter, Remote OK, We Work Remotely, FlexJobs, Remote.co, Remotive, Relomote, job aggregators, recruiter marketplaces, scraped vacancy sites, and equivalent intermediary/faceless job boards as final routes.
- Discovery through a search engine or third-party source is allowed only to find a company; once found, verify the opening on the **company's own current careers/hiring page or direct human route**. If that cannot be verified, discard it.
- A small company does **not** become acceptable merely because it appears on a prohibited board. The route must be direct.

### FRESHNESS HAS TO BE PROVEN
- "Found today" does NOT mean "fresh."
- Record the actual **posted/updated date** where available.
- For a job search on 2026-10-03, a listing posted months earlier is not a fresh result merely because it remains indexed.
- Do not return a listing with an obviously stale date as a current prospect unless the employer's own page clearly confirms it is still actively hiring/open.
- If the company page says the vacancy is closed, filled, expired, archived, or no longer accepts applications, exclude it.
- If an aggregator shows a role but the employer page does not, exclude it.
- If a role was previously surfaced to Ayanda, treat it as processed even if a search engine presents it again with a different title, repost date, location tag, or board.
- **Fresh = not previously returned/applied + current employer confirmation + actionable direct route.**

### FIT HAS TO BE DEMONSTRABLE
Do not return a role because Ayanda could theoretically learn the skills.
The role must map to work he can point to now:
- PWA/web-app building
- React/Next.js/TypeScript/JavaScript
- product systems / technical operations
- implementation / onboarding
- technical support / troubleshooting
- QA / release verification
- customer/product operations
- documentation/research
- HTML5/Canvas/Phaser/browser games
- practical automation/AI implementation

Reject roles that primarily require:
- advanced ML/AI research
- senior infrastructure/DevOps/SRE
- deep security engineering
- advanced native mobile engineering
- senior enterprise architecture
- 5–10+ years in a narrowly specialized stack
- senior sales/business development where technical product work is incidental
- credentials or geography Ayanda does not have

A role can be a realistic stretch only when the **core work** is demonstrably close to his existing work.

### COMPANY SCALE
- Do not call a role "small-team" without evidence.
- Prefer owner/founder-led, micro-SaaS, indie studios, boutique agencies, specialist software companies and genuinely small teams.
- A larger employer may appear only when the role is an unusually direct match and the employer's route is direct, but it must not crowd out genuinely small targets.
- Do not turn a conventional corporate engineering vacancy into a "mom-and-pop" prospect merely because it is remote.

### OUTPUT DISCIPLINE
Before returning a job, internally verify this exact chain:
**NEW → CURRENT → DIRECT → WORLDWIDE/BOTSWANA → DEMONSTRABLE FIT → REALISTIC SENIORITY → NOT EXCLUDED.**
If any link fails, do not return it.

Do not tell Ayanda what was rejected unless he asks. Do not fill space with rejected listings, stale listings, or "almost" opportunities. The user wants the **clean result set only**.

For direct pitches, use the equivalent chain:
**NEW BUSINESS → HUMAN ACCESS → ACTIVE → CONCRETE WORKFLOW → BUYING REASON → CAPABILITY FIT → DIRECT CONTACT.**

### SEARCH BEHAVIOUR
- Search deeply rather than broadly.
- Prefer official company pages, small-team hiring pages, founder posts on the company's own site, GitHub project hiring pages, and direct company contact pages.
- Search multiple role families matching the profile instead of repeatedly searching "full stack developer."
- Search browser-game/Phaser/HTML5 opportunities as a genuine lane.
- Search implementation, support, product operations and technical customer work as genuine lanes.
- Search small agencies and vertical SaaS companies where Ayanda's ability to build + implement + support is the differentiator.
- For pitches, look for businesses where the PWA engine can solve a visible workflow quickly; do not send generic web-development prospects.

### PREVIOUSLY MISSED / BAD RESULT PROTECTION
The following are explicitly processed/excluded and must not reappear as fresh:
- PMSuite
- Zinex Solutions
- KrissDevHub
- Careerswift
- LaunchBrightly
- AI Scaling / the Wellfound Senior Full-Stack Product Engineer listing
- Any Wellfound listing regardless of employer

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

