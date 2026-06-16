# LINE Journey

## MVP LINE-Aware Flow

1. Visitor scans a QR code or taps a LINE Rich Menu item.
2. The link opens the public card or LIFF card page with source parameters.
3. If inside LIFF, the system can request LINE profile permission after clear user action.
4. Visitor taps a CTA:
   - Add LINE OA
   - Send inquiry
   - Book consultation
   - Download vCard
5. The system records event source and campaign.
6. If the visitor submits a form, the CRM lead is created and optionally linked to LINE userId.
7. Admin sees lead source and status in CRM.

## Rich Menu Draft

- My Card: opens member card editor or own public card.
- Inquiry: opens lead form.
- Services: opens service section or catalog.
- Appointment: opens booking CTA.
- Contact: opens LINE chat or phone CTA.
- Admin: opens dashboard for authorized users.

## Postback Design

Use compact postback data:

- `action=open_card&slug={slug}&src=rich_menu`
- `action=lead_form&slug={slug}&src=rich_menu`
- `action=service_click&card={card_id}&service={service_id}`

Rules:

- Never include secrets or personal data in postback data.
- Always validate card ownership server-side.
- Store original LINE event id to avoid duplicate retry processing.

## Tag Rules

Suggested tags:

- `card_viewed`
- `line_from_card`
- `lead_submitted`
- `booking_intent`
- `event_qr_{campaign}`
- `high_intent_click`

Tagging should remain optional in MVP because LINE tag sync and tenant-specific policy can add operational risk.

