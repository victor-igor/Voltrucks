-- Create tags table
create table if not exists public.tags (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  color text default 'blue',
  created_at timestamptz default now()
);

-- Add tags column to contatos
alter table public.contatos 
add column if not exists tags text[] default array[]::text[];

-- Enable RLS
alter table public.contatos enable row level security;
alter table public.tags enable row level security;

-- Policies for Contatos
create policy "Authenticated users can view contacts"
on public.contatos for select
to authenticated
using (true);

create policy "Authenticated users can insert contacts"
on public.contatos for insert
to authenticated
with check (true);

create policy "Authenticated users can update contacts"
on public.contatos for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete contacts"
on public.contatos for delete
to authenticated
using (true);

-- Policies for Tags
create policy "Authenticated users can view tags"
on public.tags for select
to authenticated
using (true);

create policy "Authenticated users can insert tags"
on public.tags for insert
to authenticated
with check (true);

create policy "Authenticated users can update tags"
on public.tags for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete tags"
on public.tags for delete
to authenticated
using (true);
