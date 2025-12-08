-- Enable RLS on usuarios
alter table public.usuarios enable row level security;

-- Policy: Users can view their own profile
create policy "Users can view own profile"
on public.usuarios for select
to authenticated
using ( (select auth.uid()) = auth_id );

-- Policy: Admins and Gestores can view all profiles
create policy "Admins and Guestores can view all profiles"
on public.usuarios for select
to authenticated
using ( 
  exists (
    select 1 from public.usuarios
    where auth_id = (select auth.uid())
    and role in ('admin', 'gestor')
  )
);

-- Policy: Users can update their own profile
create policy "Users can update own profile"
on public.usuarios for update
to authenticated
using ( (select auth.uid()) = auth_id )
with check ( (select auth.uid()) = auth_id );

-- Policy: Admins can update any profile
create policy "Admins can update any profile"
on public.usuarios for update
to authenticated
using ( 
  exists (
    select 1 from public.usuarios
    where auth_id = (select auth.uid())
    and role = 'admin'
  )
);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (auth_id, email, nome, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'nome', new.email),
    'user' -- Default role
  );
  return new;
end;
$$;

-- Trigger to call the function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
