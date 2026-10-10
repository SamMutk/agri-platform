# AgriShare backend

## SMS password reset

Password-reset codes are sent through Twilio. Configure these backend environment
variables before enabling the forgot-password flow:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE` — a Twilio-enabled sender number

Keep credentials out of source control. The migration creates the
`password_reset_codes` table used for hashed, expiring verification codes and
must be run against the configured database:

```powershell
npm run migrate
```

Codes expire after 10 minutes, can be requested once per minute, and allow at
most five verification attempts.
