# Reminder: Add Resend details

**TODO:** Configure Resend for FitClub email features.

1. **Get a Resend API key** at [resend.com](https://resend.com) and set in backend env:
   - `RESEND_API_KEY=re_...`

2. **Optional (recommended for production):**
   - `INVITE_FROM_EMAIL` — e.g. `FitClub <noreply@yourdomain.com>` (verify domain in Resend)
   - `INVITE_APP_URL` — app or web link shown in invite emails
   - `SUPPORT_EMAIL` — address that receives Report Bug and Contact Us submissions

Without `RESEND_API_KEY`, club invite-by-email and feedback emails will fail with a clear error.
