# Archive

## Supabase setup

Copy `.env.example` to `.env` and fill in the Supabase project values. The
preflight reads `.env` directly; do not paste `KEY=value` lines into
PowerShell. Keep `SUPABASE_USER_JWT` empty when using the secret-key and user
email flow for an OAuth-only account.

Apply the SQL files in `supabase/migrations` in filename order, then verify the
database and authenticated RLS visibility:

```powershell
npm run preflight:supabase
```

The current Supabase database is the data baseline. Neon is not used by the
app or the preflight.
