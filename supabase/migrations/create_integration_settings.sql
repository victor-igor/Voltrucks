-- Create integration_settings table
create table if not exists public.integration_settings (
    id uuid not null default gen_random_uuid(),
    service_name text not null,
    config jsonb null,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint integration_settings_pkey primary key (id),
    constraint integration_settings_service_name_key unique (service_name)
);

-- Enable RLS
alter table public.integration_settings enable row level security;

-- Create policies (assuming authenticated users can read/write for now, or use specific roles)
create policy "Enable read access for all users" on "public"."integration_settings"
as PERMISSIVE for SELECT
to public
using (true);

create policy "Enable insert/update for authenticated users" on "public"."integration_settings"
as PERMISSIVE for ALL
to authenticated
using (true)
with check (true);
