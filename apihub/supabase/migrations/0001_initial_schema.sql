create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  email text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text
);

create table if not exists public.apis (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  category_id uuid references public.categories(id),
  provider text,
  website_url text,
  documentation_url text,
  base_url text,
  pricing_type text not null default 'Unverified',
  authentication_type text not null default 'Unknown',
  rate_limit_description text,
  supports_https boolean,
  cors_status text not null default 'Unknown',
  response_format text,
  beginner_friendly boolean not null default false,
  verification_status text not null default 'Needs review',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  api_id uuid not null references public.apis(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, api_id)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_apis (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  api_id uuid not null references public.apis(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(collection_id, api_id)
);

create table if not exists public.api_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) on delete set null,
  api_name text not null,
  website_url text not null,
  documentation_url text not null,
  description text not null,
  category_id uuid references public.categories(id),
  review_status text not null default 'Pending' check (review_status in ('Pending','Approved','Rejected','Needs More Information')),
  admin_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  api_id uuid references public.apis(id) on delete set null,
  http_method text not null,
  request_url text not null,
  request_configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_checks (
  id uuid primary key default gen_random_uuid(),
  api_id uuid not null references public.apis(id) on delete cascade,
  endpoint_checked text not null,
  status_code integer,
  response_time_ms integer,
  check_status text not null,
  checked_at timestamptz not null default now()
);

-- Metadata only. Never store secret API key values in this table.
create table if not exists public.api_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  api_id uuid references public.apis(id) on delete set null,
  credential_name text not null,
  environment text not null default 'Development',
  storage_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.apis enable row level security;
alter table public.categories enable row level security;
alter table public.favorites enable row level security;
alter table public.collections enable row level security;
alter table public.collection_apis enable row level security;
alter table public.api_submissions enable row level security;
alter table public.saved_requests enable row level security;
alter table public.api_checks enable row level security;
alter table public.api_credentials enable row level security;

create policy "Public can read categories" on public.categories for select using (true);
create policy "Public can read catalog APIs" on public.apis for select using (true);
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users manage own favorites" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own collections" on public.collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage APIs in own collections" on public.collection_apis for all using (
  exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
);
create policy "Users read own submissions" on public.api_submissions for select using (auth.uid() = submitted_by);
create policy "Authenticated users submit APIs" on public.api_submissions for insert with check (auth.uid() = submitted_by);
create policy "Users manage own saved requests" on public.saved_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Public can read check history" on public.api_checks for select using (true);
create policy "Users manage own credential metadata" on public.api_credentials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Admin catalog writes should be implemented with a trusted server-side role check.
-- Do not grant browser clients broad write access to catalog or moderation tables.
