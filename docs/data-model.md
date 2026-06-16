# Data Model

## tenants

| Field | Purpose |
| --- | --- |
| id | Tenant id |
| name | Business name |
| slug | Tenant slug |
| plan | free, starter, team, enterprise |
| brand_json | Logo, colors, typography preferences |
| line_channel_id | Optional LINE channel id |
| line_liff_id | Optional LIFF id |
| created_at | Audit |
| updated_at | Audit |

## users

| Field | Purpose |
| --- | --- |
| id | User id |
| tenant_id | Tenant ownership |
| email | Login identity |
| display_name | Admin display name |
| member_no | SaaS member number, for support and point lookup |
| points | Member points balance |
| role | owner, manager, member, viewer |
| status | active, invited, disabled |
| created_at | Audit |

Current MVP note: `tenant_id` and `status` are planned fields. The live D1 MVP currently uses `auth_provider`, `provider_user_id`, `member_no`, `points`, and `role`.

## auth_accounts

| Field | Purpose |
| --- | --- |
| id | Auth account id |
| user_id | Linked user |
| provider | password, line, google, facebook |
| provider_user_id | Provider identity |
| email | Password login identity |
| password_hash | Prototype password hash |
| salt | Prototype password salt |
| created_at | Audit |
| last_login_at | Last login time |

## sessions

| Field | Purpose |
| --- | --- |
| id | Session id |
| user_id | Linked user |
| token_hash | SHA-256 hash of the cookie token |
| user_agent | Browser/device hint |
| ip_hint | Cloudflare connecting IP hint |
| expires_at | Session expiry |
| created_at | Audit |
| revoked_at | Logout/revocation time |

## cards

| Field | Purpose |
| --- | --- |
| id | Card id |
| tenant_id | Tenant ownership |
| owner_user_id | Member who owns card |
| slug | Public card URL slug |
| display_name | Public card name |
| title | Job title |
| company | Company name |
| bio | Short introduction |
| avatar_asset_id | R2 asset reference |
| cover_asset_id | R2 asset reference |
| theme_json | Per-card theme settings |
| contact_json | Phone, email, address, website |
| social_json | Facebook, Instagram, LinkedIn, etc. |
| line_friend_url | LINE OA or personal LINE link |
| published_at | Null when unpublished |
| created_at | Audit |
| updated_at | Audit |

Current MVP note: logged-in members can update their own first card through `/api/member/card`; admins can update any card through `/api/admin/cards/:id`.

## card_buttons

| Field | Purpose |
| --- | --- |
| id | Button id |
| card_id | Parent card |
| label | Button text |
| type | url, phone, email, line, lead_form, booking, vcard |
| value | Target URL or action data |
| sort_order | Display order |
| enabled | Visibility |

## leads

| Field | Purpose |
| --- | --- |
| id | Lead id |
| tenant_id | Tenant ownership |
| card_id | Source card |
| name | Lead name |
| phone | Optional phone |
| email | Optional email |
| line_user_id | Optional LINE identity |
| message | Inquiry content |
| source | QR, LINE, share, ad, event, direct |
| campaign | Campaign code |
| status | new, contacted, qualified, won, lost |
| assigned_user_id | Owner for follow-up |
| created_at | Submission time |
| updated_at | Last status update |

## events

| Field | Purpose |
| --- | --- |
| id | Event id |
| tenant_id | Tenant ownership |
| card_id | Source card |
| lead_id | Optional lead relation |
| event_type | view, click, form_submit, vcard_download, line_follow_click |
| source | Entry source |
| campaign | Campaign code |
| button_id | Optional clicked button |
| anonymous_id | Browser/session id |
| line_user_id | Optional LIFF user id |
| user_agent | Basic device analysis |
| ip_hash | Abuse detection without storing raw IP |
| created_at | Event time |

## audit_logs

| Field | Purpose |
| --- | --- |
| id | Log id |
| tenant_id | Tenant ownership |
| actor_user_id | Admin user |
| action | update_card, export_leads, change_status, etc. |
| target_type | card, lead, tenant |
| target_id | Target id |
| metadata_json | Non-sensitive context |
| created_at | Audit time |
