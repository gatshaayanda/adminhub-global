# AdminHub Business Demo

## Boundary

The business demo is a standalone route family inside the existing AdminHub application. It is intentionally additive, like `/ayanda`.

- Public demo: `/demo`
- Customer booking: `/demo/book`
- Demo owner dashboard: `/demo/admin`
- Demo PWA manifest: `/demo/manifest.webmanifest`

Existing AdminHub, BoardSignal, `/admin`, `/ayanda`, Firebase collections, and production routes remain outside the demo boundary.

## Data isolation

Demo data uses dedicated collections:

- `demo_business`
- `demo_services`
- `demo_bookings`

The browser talks to `/api/demo`; the API uses the existing Firebase Admin connection and only addresses those three collections. This avoids changing the existing Firestore rules for the first demo slice and prevents demo access from sharing the existing AdminHub browser-side admin conventions.

## Current workflow

Public website → service selection → booking request → owner dashboard → status lifecycle.

The owner dashboard can edit business identity, upload a logo through the existing UploadThing image uploader, add/edit/hide/show/delete services, change prices/descriptions, review booking requests, change statuses, and reset the demo to seeded data.

## PWA

The demo has its own nested web manifest while continuing to use the application's existing PWA/service-worker infrastructure. The demo route family is treated as standalone public chrome, so the main AdminHub/BoardSignal header and footer are not injected into it.

## Safety rule

Do not move demo data into existing production collections. Do not modify the existing `/admin` protection or BoardSignal middleware to accommodate the demo.
