# Brevo emails for Supabase Auth

BoardSports sends account confirmation, resend confirmation, and password recovery emails through Supabase Auth. Configure Supabase Auth SMTP to use Brevo.

## Brevo SMTP values

Use these values in Supabase Auth SMTP settings:

```text
SMTP host: smtp-relay.brevo.com
SMTP port: 587
SMTP user: your Brevo SMTP login
SMTP password: your Brevo SMTP key
Sender email: a verified Brevo sender/domain email
Sender name: BoardSports
```

Brevo recommends port `587` for SMTP relay. The SMTP server is `smtp-relay.brevo.com`.

## Supabase production setup

In the hosted Supabase project, open:

```text
Authentication -> Emails -> SMTP Settings
```

Set the Brevo SMTP values above. Also confirm the redirect URLs include the production Netlify URL and the local dev URL:

```text
https://wondrous-choux-fb5a96.netlify.app
https://boardsports.netlify.app
http://127.0.0.1:3000
http://localhost:3000
```

## Local Supabase setup

For local Supabase, export these variables before starting Supabase:

```powershell
$env:BREVO_SMTP_USER="your-brevo-smtp-login"
$env:BREVO_SMTP_KEY="your-brevo-smtp-key"
$env:BREVO_FROM_EMAIL="noreply@your-domain.com"
supabase start
```

Do not put the Brevo SMTP key in `env.js` or any frontend file.
