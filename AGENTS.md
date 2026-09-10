# Translend TMS · Truck Division

## Product identity

Translend TMS is a purpose-built trucking and transport management application produced by Admin Hub Pty Ltd. The product is being developed from the Translend v19 product reference while using proven AdminHub Global infrastructure and stronger architectural/security discipline derived from the PurePress work.

Product objective:
> What is moving, what needs attention, what is costing money, and what can be billed.

The application must become a real operational system, not a page-by-page conversion of the v19 HTML mockup.

## Development system

**START → BUILD → CONTINUE/RECOVER**

Core loop:
> You decide → ChatGPT inspects/plans → Codex implements → verify → checkpoint

Golden rule:
> Unexpected result = STOP → inspect reality → then act.

Roles:
- Product owner + final reviewer: user
- Technical navigator: ChatGPT
- Hands-on coding agent: Codex
- Source of truth / save points: Git + GitHub
- Local workspace / inspection / review: VS Code

## Engineering rules

1. Inspect actual project state before changing it.
2. Do not make speculative changes or stack unrelated patches.
3. Preserve working infrastructure unless there is a demonstrated reason to change it.
4. For each feature: Inspect → Plan → One controlled change → Review diff → Run locally → Verify → Build → Commit → Push.
5. Never claim a feature is complete without implementation and verification.
6. Keep business modules separate from shared application infrastructure.
7. Never commit secrets, credentials, banking information, or private client documents.
8. Do not copy AdminHub or PurePress business schemas, authentication assumptions, middleware, or service workers blindly.

## Commercial / engagement context

Translend TMS · Truck Division is being produced by Admin Hub Pty Ltd as a client project.

The agreed development arrangement is an initial P1,200 advance followed by P200 per month for continued development through March 2027. The engagement also provides an opportunity to assess the product, working relationship, and potential next-stage opportunities as development progresses.

Commercial arrangements do not determine technical completion. Completion remains subject to implementation, review, verification, Git checkpointing, and product-owner acceptance.

External company/reputation reference: https://www.trustpilot.com/review/adminhub-global.com

No banking details or the contents of financial/account-confirmation documents belong in this repository.

## Current phase

**Foundation / START → BUILD**

Current branch: `feature/translend-foundation`

Foundation scope only:
- project skeleton
- living project documentation
- Firebase client/server boundaries
- authentication and authorization architecture
- protected application boundary
- no operational business modules yet

## Architecture

Runtime stack is locked unless a demonstrated project need requires a change:
- Next.js App Router
- TypeScript
- React 19
- Tailwind CSS
- Firebase Authentication
- Firestore
- Firebase Storage
- UploadThing
- Vercel
- PWA / Service Worker
- Lucide React
- jsPDF
- Vercel Analytics / Speed Insights

Architecture direction:

`v19 product specification → Translend design system → Next.js application → Firebase/Auth → organization-scoped data → operational modules`

AdminHub Global supplies reusable application infrastructure. PurePress supplies engineering/documentation/security patterns. Neither supplies Translend's business model.

## Authentication / authorization

Authentication uses Firebase Authentication.

Authorization is organization-scoped:

`authenticated user → organization membership → role/capabilities → route/API/data access`

Initial roles:
- owner
- operations_manager
- dispatcher
- fleet_manager
- finance
- driver
- viewer

Firestore rules and server-side authorization remain authoritative. Middleware is only an early request boundary and must not be treated as the complete authorization layer.

Server-only Firebase Admin code must never be imported into client components.

## Data architecture direction

Core operational spine:

`Customer → Transport Job → Route → Truck + Driver → Trip → Delivery → POD → Costs → Invoice → Receipt → Profitability`

Planned entities are documented, but are **not implemented in this foundation phase**.

## Application structure

Translend-specific code lives under dedicated namespaces rather than being mixed into legacy AdminHub business code.

Planned high-level areas:

`src/app/translend`
`src/components/*`
`src/lib/translend/firebase`
`src/lib/translend/auth`
`src/lib/translend/data`
`src/lib/translend/validation`

Business modules such as fleet, dispatch, delivery, finance, fuel, workshop, and reporting remain out of scope for this foundation checkpoint.

## PWA boundary

Use the safer PWA model established during architecture review:
- cache application shell/static assets where appropriate
- do not persist authenticated/private data in the service worker cache
- do not cache `/api/*`, protected application data, financial records, customer records, driver records, or fleet records as persistent offline content unless a later explicit design authorizes it

The inherited AdminHub service worker must not be copied blindly.

## Testing / verification

Required baseline verification:

```bash
npm install
npx tsc --noEmit
npm run lint
npm run build
```

Then perform local browser verification in VS Code/dev server.

Future targeted suites should cover core, auth, permissions, Firestore, operations, delivery, fleet, fuel, maintenance, finance, billing, PWA, and the critical end-to-end workflow.

## Git policy

Development occurs on feature branches and is merged deliberately.

Meaningful commits should describe the change, for example:

`feat(translend): establish application foundation`

Do not develop directly on `main`.

## Status

- 🟢 Translend v19 visual/product reference inspected
- 🟢 AdminHub Global infrastructure inspected
- 🟢 PurePress architecture patterns inspected
- 🟢 Product architecture established
- 🟡 Foundation implementation in progress
- ⚪ Business modules not started

## Last verified checkpoint

Base commit before foundation implementation:
`d6739aba41f4415561daa0f40726d1870cca8eb2`

No Translend business functionality is considered complete at this point.

## Recovery instructions

On CONTINUE / RECOVER:
1. Check `git status`.
2. Check current branch.
3. Check recent commits.
4. Inspect the current `AGENTS.md`.
5. Inspect the relevant files before changing them.
6. Run TypeScript/lint/build checks as appropriate.
7. Report current state, last verified checkpoint, working items, failures, uncommitted changes, and the next controlled action.

## Next controlled action

Complete and verify the foundation implementation only. Do not begin business modules until this checkpoint is reviewed and accepted.
