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
