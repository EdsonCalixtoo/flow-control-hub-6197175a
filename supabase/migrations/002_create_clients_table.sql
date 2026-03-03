-- Create clients table for storing customer information
-- This table stores clients associated with users (vendors)

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  cpf_cnpj text not null,
  phone text not null,
  email text not null,
  address text not null,
  bairro text,
  city text not null,
  state text not null,
  cep text not null,
  notes text,
  consignado boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for faster lookups
create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists clients_cpf_cnpj_idx on public.clients(cpf_cnpj);
create index if not exists clients_email_idx on public.clients(email);

-- Enable Row Level Security (RLS) on clients table
alter table public.clients enable row level security;

-- Policy: Users can read their own clients
create policy "Users can read own clients"
  on public.clients
  for select
  using (user_id = auth.uid());

-- Policy: Users can insert their own clients
create policy "Users can insert own clients"
  on public.clients
  for insert
  with check (user_id = auth.uid());

-- Policy: Users can update their own clients
create policy "Users can update own clients"
  on public.clients
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policy: Users can delete their own clients
create policy "Users can delete own clients"
  on public.clients
  for delete
  using (user_id = auth.uid());

-- Policy: Service role can manage all clients
create policy "Service role can manage clients"
  on public.clients
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Function to automatically update updated_at timestamp
create or replace function public.update_clients_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to call the update function before each update
drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at
  before update on public.clients
  for each row
  execute function public.update_clients_updated_at();
