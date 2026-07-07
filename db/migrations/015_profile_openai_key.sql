-- Per-user encrypted OpenAI API key for BYOK resume AI features.

alter table public.profiles
  add column if not exists openai_api_key_enc bytea;

comment on column public.profiles.openai_api_key_enc is
  'AES-GCM encrypted OpenAI API key; never exposed in public profile reads.';
