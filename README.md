# SAAS Electronic Business Card

This repo contains the product design and first HTML prototype for a SaaS electronic business card platform.

## Product Positioning

The platform helps small businesses, sales teams, consultants, event organizers, and local service providers turn a business card scan into a measurable lead journey:

1. Visitor opens a public card from QR code, LINE Rich Menu, LIFF, event poster, or share link.
2. Visitor saves contact, follows LINE OA, sends an inquiry, books a consultation, or leaves contact info.
3. The owner sees leads, source attribution, card views, clicks, tags, and follow-up status in a simple CRM.
4. The tenant can refine card content, team members, CTA buttons, and automation without engineering help.

## MVP Scope

### Must Have

- Multi-tenant account model for businesses.
- Public electronic card page with owner profile, contact links, CTA buttons, QR code area, and lead form.
- Card management dashboard for profile, theme, buttons, and publish status.
- Lead capture with source tracking.
- Basic CRM list with follow-up status.
- Analytics for views, button clicks, and leads.
- LINE-aware fields for LIFF URL, LINE OA friend link, LINE user id mapping, and postback source.

### Should Have

- Team cards under one tenant.
- Custom slug and share URL.
- vCard download.
- QR code export.
- Basic tag rules.
- CSV export.

### Later

- Subscription billing.
- AI follow-up suggestions.
- RAG-powered service Q&A.
- LINE broadcast segmentation.
- Appointment calendar integration.
- Referral tracking and partner campaigns.

## Current Build Strategy

Start with a pure HTML version first:

- Validate the sales page, public card page, card editor, lead form, CRM list, and pricing model.
- Keep event names and source fields compatible with future LINE integration.
- Avoid LIFF, webhook, LINE Login, and Messaging API until the HTML flow is approved.
- Current target site URL: `https://k-linksaas.fangwl591021.workers.dev/`
- Future LIFF ID: `2007221311-jwiMeoXT`
- Future LIFF URL: `https://liff.line.me/2007221311-jwiMeoXT`

When the business flow is confirmed, convert the same screens into LINE-aware routes:

- Public card page becomes a LIFF-friendly page.
- CTA clicks become event records and optional LINE postbacks.
- Lead form can attach LINE userId after user consent.
- Rich Menu links point to the approved card, lead, and CRM routes.
- Login can support LINE Login, Google, Facebook, and custom email/password, with LINE and Google as first-priority providers.

## Recommended Runtime Later

For a small-team MVP:

- Frontend: static HTML/CSS/JS or Cloudflare Pages.
- Backend: Cloudflare Worker.
- Database: Cloudflare D1.
- Assets: R2 for uploaded avatars, logos, and card images.
- Optional LINE modules: LINE Login, LIFF, Messaging API, Rich Menu, postback events.

The formal AI/multi-agent workflow is used for planning, QA, and documentation. It should not be a runtime dependency for customer production traffic.

## Documents

- [Product PRD](docs/product-prd.md)
- [Architecture](docs/architecture.md)
- [Data Model](docs/data-model.md)
- [LINE Journey](docs/line-journey.md)
- [Test And Launch Checklist](docs/test-launch-checklist.md)

## Prototype

Open [prototype/index.html](prototype/index.html) in a browser. This is the current HTML MVP demo.
