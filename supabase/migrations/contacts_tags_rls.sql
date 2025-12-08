-- Enable RLS on tables
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
