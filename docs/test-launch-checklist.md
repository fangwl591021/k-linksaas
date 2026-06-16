# Test And Launch Checklist

## Product Checks

- Public card opens on mobile and desktop.
- Unpublished card is not publicly accessible.
- Custom slug cannot collide.
- Required lead fields are enforced.
- Empty optional fields do not break layout.
- Buttons support URL, phone, email, LINE, lead form, and vCard.

## CRM Checks

- Lead source is recorded.
- Lead status can be changed.
- Lead list filters by card, source, status, and date.
- CSV export excludes internal-only fields unless admin explicitly requests them.
- Member role cannot view another member's leads unless permission allows it.

## LINE Checks

- LIFF URL opens in LINE app and external browser fallback.
- LINE signature verification rejects invalid webhook requests.
- LINE retry event does not create duplicate records.
- Postback data is parsed safely.
- LINE userId is stored only after a clear business purpose.

## Security Checks

- No secrets in repository.
- No access tokens in logs.
- Public lead endpoint has anti-spam protection.
- Admin API requires authentication.
- Export endpoints require owner or manager role.
- Raw IP is not stored unless legally and operationally justified.
- Personal data deletion path exists.

## Launch Checks

- D1 migration applied.
- Worker environment variables configured.
- R2 bucket configured for uploads.
- Error logging enabled.
- Backup/export procedure documented.
- Smoke test performed on production URL.
- At least one tenant, one card, one lead, and one analytics event verified.

