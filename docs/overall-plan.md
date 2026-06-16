# K LinkSaaS Overall Plan

## Current Scope

The project is now a Cloudflare Worker + D1 SaaS MVP for electronic business cards. The system should follow this order:

1. Register a member.
2. Create the first card automatically.
3. Let the member edit and save the card.
4. Publish `/c/:slug`.
5. Track views, clicks, leads, and manual admin records.
6. Later bind LINE LIFF userId and LINE OA postback sources.

## Required Pages

- `/register`: member registration, LINE registration entry, first-card creation.
- `/login`: password login and member session creation.
- `/member`: logged-in member center for editing the member's own public card.
- `/`: mobile-first public and editing prototype.
- `/c/:slug`: public card route.
- `/admin`: internal operation dashboard, protected by member session.

## Implemented As Of 2026-06-16

- `/register` exists and writes to D1 through `POST /api/register`.
- Password registration creates `users`, `auth_accounts`, first `cards`, and an `admin_records` entry.
- LINE registration entry uses LIFF profile when opened inside LIFF.
- Google and Facebook are UI placeholders until OAuth callbacks are implemented.
- `/login` creates an HttpOnly session cookie through `POST /api/login`.
- `/api/session` verifies the current member session.
- `/api/logout` revokes the current session.
- `/member` is protected by member session.
- `/api/member/me` returns the current member, metrics, and first card.
- `/api/member/card` lets a logged-in member update only their own card.
- `/admin` and `/api/admin/*` require an owner or manager session.
- `/admin` shows the newly registered member and card through `/api/admin/overview` after login.

## Data Ownership

- `users` owns member identity, member number, points, role, and provider.
- `auth_accounts` owns password/OAuth login identities.
- `sessions` owns active login sessions for admin/member access.
- `cards` owns public card content and slug.
- `leads` owns visitor inquiries.
- `events` owns analytics and click/share actions.
- `admin_records` owns manual operation notes and issue tracking.

## MVP Flow

1. New user opens `/register`.
2. User chooses password registration or LINE registration.
3. API creates `users`, `auth_accounts`, first `cards`, and an `admin_records` note.
4. User logs in at `/login` and lands on `/member`.
5. User edits the public card and shares `/c/:slug`.
6. Admin logs in at `/login`.
7. Admin opens `/admin` to verify member, card, events, leads, and operation records.

## Next Security Tasks

- Replace SHA-256 password prototype with stronger password hashing or external auth provider.
- Add OAuth callbacks for LINE Login, Google, and Facebook.
- Bind LINE userId to existing user without duplicate accounts.
- Add rate limits for public write APIs.
