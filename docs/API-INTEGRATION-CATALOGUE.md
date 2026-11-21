# API & Integration Catalogue — Botswana Client PWAs

**Status:** Research backlog / readiness reference only.  
**Owner:** Admin Hub  
**Scope:** Iteration 13 Business OS, Iteration 14 BACKPACK OS where relevant, and Admin Hub Global.  
**Decision:** This catalogue records candidates for later investigation. It does not authorise installing SDKs, creating accounts, collecting credentials, enabling live payments, or changing any existing product workflow.

## Purpose

Maintain one reusable view of external services that may improve Botswana-focused client PWAs. Select integrations per project; do not make every client inherit every provider or dependency.

The priorities are:
1. Botswana payment options and reconciliation.
2. Customer communication (WhatsApp, SMS and email).
3. Location and service-area capabilities.
4. Carefully selected business data such as weather and exchange rates.
5. Workflow automation and document signing only when a real client need justifies them.

## Candidate catalogue

| Area | Candidate | Potential use | Readiness | Official starting point |
|---|---|---|---|---|
| Payments | Orange Money / Orange Botswana | Customer deposits, checkout and payment status | Investigate local merchant/API eligibility, product scope, fees, settlement and callbacks | https://developer.orange.com/ |
| Payments | BTC SMEGA | Botswana merchant payments and website/app integration | Investigate current merchant onboarding, API access, callback verification, settlement and fees | https://www.btc.bw/ |
| Payments | DPO Pay | Card and other supported online payment methods | Investigate Botswana merchant support, supported methods, pricing, settlement and integration documentation | https://dpogroup.com/ |
| Payments | MyZaka / Mascom | Local mobile-money acceptance | Confirm whether a supported merchant API exists; do not assume USSD/SMS merchant services provide an API checkout | https://www.mascom.bw/ |
| Messaging | WhatsApp Business Platform (Cloud API) | Customer-scoped confirmations, updates and approved notifications | Investigate business verification, opt-in, template approval, conversation pricing and webhook handling | https://developers.facebook.com/docs/whatsapp/cloud-api/ |
| Messaging | Africa's Talking | SMS notifications and OTP options | Confirm Botswana coverage, sender ID rules, delivery reporting and local pricing | https://africastalking.com/sms |
| Email | Resend | Transactional email, quotes, receipts and account notices | Validate domain authentication, sending limits, deliverability and commercial pricing | https://resend.com/docs |
| Maps | Google Maps Platform | Address lookup, pins, directions and service areas | Validate Botswana coverage for each required API, billing, quotas and key restrictions | https://developers.google.com/maps |
| Weather | Open-Meteo | Weather-aware event and outdoor-service planning | Commercial use requires checking the applicable licence/plan; do not assume the free tier permits commercial client use | https://open-meteo.com/en/pricing |
| Currency | Frankfurter | Reference exchange rates for international quotations | Check available BWP pairs, data timestamps, source and permitted use; not a trading or guaranteed settlement rate | https://frankfurter.dev/ |
| CRM | Twenty | Optional central lead/customer relationship management | Evaluate only if Admin Hub needs an external CRM; self-hosting and AGPL-3.0 obligations need review | https://github.com/twentyhq/twenty |
| Automation | Activepieces | Optional workflows between approved services | Evaluate hosting, connector permissions, data residency, secrets and licence for the intended deployment | https://github.com/activepieces/activepieces |
| Support inbox | Chatwoot | Shared support inbox and website chat | Evaluate hosting, channel availability, data handling and plan/licence boundaries | https://github.com/chatwoot/chatwoot |
| Document signing | Documenso | Proposal, agreement and approval signing | Evaluate identity/evidence requirements, legal suitability, hosting and AGPL-3.0 obligations | https://github.com/documenso/documenso |
| Mailing lists | Listmonk | Opt-in newsletters and campaign management | Evaluate consent, unsubscribe handling, email delivery provider, hosting and AGPL-3.0 obligations | https://github.com/knadh/listmonk |

**Important:** A provider's general website or global developer portal is not proof that a particular API product is available to Botswana merchants. Availability, commercial terms, onboarding and supported payment rails must be confirmed directly with the provider before promising a feature.

## Project fit

| Project type | Potentially useful modules |
|---|---|
| Car wash / vehicle services | Payment deposits, WhatsApp/SMS updates, maps/service-area details |
| Salon / spa | Appointment reminders, deposits, transactional email |
| Events / rentals / production | Weather, maps, quotes, deposits, document signing |
| Solar / air-conditioning / installations | Enquiry notifications, customer location, quote approvals, deposits |
| Retail / delivery | Payment confirmation, delivery location, order updates |
| Creative / agency work | Proposals, document signing, email, project notifications |
| BACKPACK OS | Optional outbound notifications or links only where they genuinely serve a personal engagement; do not turn it into a business storefront or CRM |

## Integration readiness checklist

Before adopting a provider for any client, record:

- [ ] Exact API product and official documentation URL.
- [ ] Botswana availability confirmed directly with the provider.
- [ ] Merchant/business eligibility and onboarding requirements.
- [ ] Commercial licence, terms, fees, quotas and billing model.
- [ ] Supported currencies, payment methods and settlement timing (where relevant).
- [ ] Authentication model, secret storage and key rotation.
- [ ] Webhook signature verification, replay protection and idempotency (where relevant).
- [ ] Data collected, retention, privacy and cross-border processing implications.
- [ ] Rate limits, timeout/retry strategy and provider outage behaviour.
- [ ] Offline and reconnection behaviour; pending must remain distinct from confirmed.
- [ ] Monitoring, support owner and a safe disable/fallback path.
- [ ] Project-specific acceptance tests and owner approval.

## Non-negotiable implementation safeguards

1. **No secrets in client code.** Keep private API keys and signing secrets on trusted server-side endpoints or approved server functions. Restrict public keys by origin/API where the provider supports it.
2. **Never trust a browser success screen as payment proof.** Verify provider callbacks/signatures server-side, validate amount/currency/reference, protect against duplicate callbacks and reconcile against provider records.
3. **Keep payment states truthful.** Requested, initiated, pending, failed, expired and confirmed are distinct. A receipt becomes paid only after authoritative verification.
4. **Offline means queued or unavailable, not successful.** Queue only safe retryable actions. Do not queue or replay payment capture blindly; use provider-supported idempotency and reconciliation.
5. **Scope data per client.** Each business has its own provider configuration and credentials. Do not leak one client's customer data, messages, keys or payment records into another project.
6. **Respect consent and channel rules.** Record WhatsApp/SMS/email opt-in where required, honour opt-outs and use approved templates for business-initiated WhatsApp messages.
7. **Avoid unnecessary dependencies.** Prefer a small server-side adapter with a documented interface over coupling every PWA to a provider SDK.
8. **Keep the existing foundation intact.** Do not replace Firebase, UploadThing, PWA install behaviour, offline caching, account flows or current navigation as part of a future integration without a separate, explicitly approved change.
9. **Separate provider charges from Admin Hub fees.** Disclose transaction, messaging, hosting and other usage costs; never present a provider's free tier as unlimited or guaranteed.
10. **Do not claim integration readiness until tested.** A catalogue entry is research only, not a connected integration or production capability.

## Suggested reusable adapter contract

When an integration is approved for implementation, isolate it behind a project-configured server-side adapter. The application should depend on business actions (for example, create payment request, verify payment, send notification, geocode address), not provider-specific details.

Each adapter should document:
- Provider and API version.
- Enabled client/project and environment (test/live).
- Required server-side configuration names (never values).
- Request/response mapping and error categories.
- Webhook/callback verification.
- Idempotency and reconciliation strategy.
- Retry, timeout, rate-limit and outage handling.
- Logs/metrics that exclude secrets and unnecessary personal data.
- Disable switch and manual fallback.

## Current decision

**No provider is approved or connected by this document.** This is a shortlist for later investigation. Start a separate, scoped research task before selecting a provider; start an implementation task only after availability, commercial terms, security and acceptance criteria are confirmed.


## API discovery directories — shared research sources

Use these repositories and directories to discover candidate APIs. **Public APIs is the primary discovery catalogue; the remaining repositories are supplementary research sources.** These are directories, not vetted providers and not production dependencies.

### Primary source

| Resource | Purpose | Link |
|---|---|---|
| Public APIs | Main community-maintained directory of public APIs across many categories | https://github.com/public-apis/public-apis |

### Supplementary GitHub catalogues

| Resource | Purpose | Link |
|---|---|---|
| Public API Lists | Searchable API collection; inspect its JSON API, maintenance status and licence before relying on it | https://github.com/public-api-lists/public-api-lists |
| Free Public APIs | Additional categorized API collection | https://github.com/free-public-apis/apis |
| BM804 Free Public APIs | Supplementary directory with access notes and documentation references | https://github.com/BM804/free-public-apis |
| APIs Hub | Curated API discovery across developer categories | https://github.com/kabishS/APIs-Hub |

### Direct discovery links

- Public APIs searchable website: https://publicapis.lol/
- No-API-key discovery: https://publicapis.lol/no-api-key
- GitHub public-apis topic: https://github.com/topics/public-apis
- GitHub free-api topic: https://github.com/topics/free-api

### How to use these sources

1. Start with **Public APIs** when researching a new capability.
2. Use the supplementary lists to discover alternatives or fill category gaps.
3. Follow each listing to the provider's own official documentation and verify that the API is still maintained.
4. Record the exact API product, provider, documentation URL, licence/terms, authentication, CORS behaviour, quotas, pricing and commercial-use restrictions in this catalogue.
5. Confirm Botswana availability and local business eligibility where relevant.
6. Test the actual endpoint and intended production architecture before recommending implementation.

**Discovery is not approval.** A listing described as free, public or requiring no API key does not guarantee unlimited access, commercial-use permission, uptime, data quality, Botswana availability or suitability for browser use. Check the provider's current terms, licence, rate limits, CORS policy, privacy requirements and costs. Never expose a secret API key in frontend code. A no-key API still needs security, reliability and data-quality review.

These discovery sources are shared references for Iteration13, Iteration14 and Admin Hub Global. They do not add runtime dependencies, fetch APIs automatically or authorise changes to any existing app behaviour.
