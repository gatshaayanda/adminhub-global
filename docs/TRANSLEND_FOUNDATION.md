# Translend TMS · Foundation Architecture

## Purpose

This document defines the technical foundation for Translend TMS · Truck Division. It is intentionally limited to infrastructure, application boundaries, authentication, authorization, and project conventions. Operational business modules are not part of this checkpoint.

## Source strategy

### AdminHub Global

Used as the reusable application chassis: Next.js conventions, Firebase integration patterns, UI/PWA infrastructure, deployment conventions, and reusable components where they are actually generic.

### PurePress

Used as an engineering reference for documentation discipline, Firebase security patterns, protected-route boundaries, testing discipline, and safer PWA caching.

### Translend v19

Used as the product and visual specification. The HTML reference is not treated as the application architecture.

## Runtime

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

## Firebase boundaries

### Client

`src/lib/translend/firebase/client.ts`

May be imported by client components. It exposes the browser Firebase app, Auth, Firestore, and Storage instances using `NEXT_PUBLIC_FIREBASE_*` configuration.

### Server

`src/lib/translend/firebase/admin.ts`

Server-only module. It initializes Firebase Admin and exposes trusted server-side Firestore access. It must never be imported into client components.

### Authentication

Firebase Auth establishes identity. It does not by itself establish access to a Translend organization.

### Authorization

Access is resolved as:

`identity → organization membership → role → capability → resource authorization`

Firestore rules and trusted server checks enforce this boundary.

## Initial role model

| Role | Intended responsibility |
|---|---|
| Owner | Full organization control |
| Operations Manager | Operational oversight |
| Dispatcher | Jobs, trips, dispatch and delivery coordination |
| Fleet Manager | Trucks, drivers, maintenance and compliance |
| Finance | Commercial and operational finance |
| Driver | Driver-facing assigned work |
| Viewer | Read-only access |

These roles are foundation contracts, not UI-only labels. Capability checks should be preferred over scattering role comparisons throughout the application.

## Organization model

The data model is organization-first even if the first deployment serves one company:

`organizations/{orgId}`

All future operational records should carry or inherit an `organizationId` boundary. A user's membership in an organization must be established before access to that organization's resources is granted.

## Protected application boundary

Public routes remain public where appropriate. Translend application routes and APIs require an authenticated identity, with authorization applied after authentication.

Middleware is an early boundary for request handling. It is not the final security mechanism.

## Data model direction

The operational spine is:

`Customer → Job → Route → Truck → Driver → Trip → Delivery → POD → Costs → Invoice → Receipt → Profitability`

Future collections/entities include customers, suppliers, trucks, drivers, routes, transport jobs, trips, deliveries, delivery notes, PODs, rate cards, invoices, receipts, expenses, fuel transactions, maintenance records, work orders, inspections, compliance records, tyre records, notifications, and audit logs.

These entities are deliberately not implemented in the foundation checkpoint.

## PWA security boundary

The service worker may cache static application resources and a safe shell. It must not persist authenticated business data by default. Authenticated API responses, financial records, customer records, fleet records, driver records, and other private operational data remain network-backed.

## Documents / uploads

Upload infrastructure can be reused for Translend documents, but document records must eventually be organization-scoped and carry metadata such as entity type, entity ID, document type, uploader, timestamps, MIME type, size, and URL.

No client banking documents, credentials, secrets, or private financial letters are to be committed to Git.

## Verification contract

A foundation checkpoint is not accepted until:

1. TypeScript passes.
2. Lint passes or documented existing lint issues are explicitly reviewed.
3. Production build passes.
4. The Translend route loads locally.
5. Auth boundaries do not expose server credentials to the browser.
6. The diff contains no unrelated business-module work.
7. Git status is clean after the checkpoint commit.

## Next phase

After foundation acceptance, the next controlled phase is the shared Translend UI/application shell. Business modules begin only after that foundation is verified.
