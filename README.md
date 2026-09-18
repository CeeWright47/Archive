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

## AI Edge Functions

The seven AI workflows run in Supabase Edge Functions. Configure
`ANTHROPIC_API_KEY` as a Supabase project secret; do not add it to `.env` or any
`EXPO_PUBLIC_*` variable.

Deploy the functions from the repository root:

```powershell
supabase functions deploy catalog-garment
supabase functions deploy suggest-pairings
supabase functions deploy style-assessment
supabase functions deploy generate-fit
supabase functions deploy scan-item
supabase functions deploy analyze-wardrobe-gaps
supabase functions deploy distill-inspiration
```

All functions require a valid user JWT and use the caller's RLS-scoped
Supabase client for database access.
