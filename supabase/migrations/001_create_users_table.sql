-- Create users table for storing user profile information
-- This table extends the Supabase auth.users table with additional profile fields

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create the users table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'vendedor',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index on email for faster lookups
create index if not exists users_email_idx on public.users(email);

-- Create an index on role for faster filtering
create index if not exists users_role_idx on public.users(role);

-- Enable Row Level Security (RLS) on users table
alter table public.users enable row level security;

-- Policy: Users can read their own data
create policy "Users can read own profile"
  on public.users
  for select
  using (auth.uid() = id);

-- Policy: Users can update their own data
create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id);

-- Policy: New users can insert their own profile during signup
create policy "Users can insert own profile"
  on public.users
  for insert
  with check (auth.uid() = id);

-- Policy: Admins can read all users (we'll check role in application logic)
create policy "Service role can manage users"
  on public.users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Function to automatically update updated_at timestamp
create or replace function public.update_users_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to call the update function before each update
drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row
  execute function public.update_users_updated_at();
