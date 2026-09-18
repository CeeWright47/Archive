begin;

alter table public.user_profile
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro', 'lifetime'));

alter table public.preferences
  alter column app_settings set default
    '{"units":"imperial","auto_tag":true,"auto_assess":false,"onboarding_completed":false,"assessment_paywall_shown":false}'::jsonb;

update public.preferences
set app_settings = app_settings
  || jsonb_build_object(
    'onboarding_completed', coalesce((app_settings->>'onboarding_completed')::boolean, false),
    'assessment_paywall_shown', coalesce((app_settings->>'assessment_paywall_shown')::boolean, false)
  );

commit;