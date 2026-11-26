-- 0002: security fixes, admin policies, signup trigger, indexes, updated_at triggers.
-- Safe to run once after 0001. Review before applying to a production project.

-- ---------------------------------------------------------------------------
-- 1. FIX: privilege escalation.
-- 0001 let any user UPDATE their own profile row, including the `role` column,
-- so a user could promote themselves to admin with one API call.
-- ---------------------------------------------------------------------------
drop policy if exists "Users update own profile" on public.profiles;

revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

create policy "Users update own profile (non-privileged columns)" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. Admin check. SECURITY DEFINER so policies can read profiles without recursion.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Admin-only catalog and moderation writes (browser clients get nothing else).
create policy "Admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage catalog APIs" on public.apis for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins read all submissions" on public.api_submissions for select using (public.is_admin());
create policy "Admins review submissions" on public.api_submissions for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins read all profiles" on public.profiles for select using (public.is_admin());
-- api_checks are written by trusted server-side jobs using the service role (which bypasses RLS).

-- ---------------------------------------------------------------------------
-- 3. Submission integrity: users may only submit as themselves, as Pending.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users submit APIs" on public.api_submissions;
create policy "Authenticated users submit APIs" on public.api_submissions
  for insert with check (auth.uid() = submitted_by and review_status = 'Pending' and admin_notes is null);

alter table public.api_submissions
  add constraint api_submissions_urls_http check (website_url ~* '^https?://' and documentation_url ~* '^https?://');
alter table public.apis
  add constraint apis_urls_http check (
    (website_url is null or website_url ~* '^https?://') and
    (documentation_url is null or documentation_url ~* '^https?://') and
    (base_url is null or base_url ~* '^https?://'));

-- ---------------------------------------------------------------------------
-- 4. Catalog data-quality columns (all nullable / defaulted; nothing is invented).
-- ---------------------------------------------------------------------------
alter table public.apis
  add column if not exists tags text[] not null default '{}',
  add column if not exists provenance text not null default 'community' check (provenance in ('community','verified','imported')),
  add column if not exists source_url text,
  add column if not exists source_license text;

-- ---------------------------------------------------------------------------
-- 5. Profile row on signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. updated_at maintenance.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists apis_touch on public.apis;
create trigger apis_touch before update on public.apis for each row execute function public.touch_updated_at();
drop trigger if exists saved_requests_touch on public.saved_requests;
create trigger saved_requests_touch before update on public.saved_requests for each row execute function public.touch_updated_at();
drop trigger if exists api_credentials_touch on public.api_credentials;
create trigger api_credentials_touch before update on public.api_credentials for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Indexes for the access patterns the app uses.
-- ---------------------------------------------------------------------------
create index if not exists apis_category_idx on public.apis (category_id);
create index if not exists apis_verification_idx on public.apis (verification_status);
create index if not exists apis_created_idx on public.apis (created_at desc);
create index if not exists apis_tags_gin on public.apis using gin (tags);
create index if not exists apis_search_idx on public.apis
  using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(provider,'')));
create index if not exists favorites_user_idx on public.favorites (user_id);
create index if not exists favorites_api_idx on public.favorites (api_id);
create index if not exists collections_user_idx on public.collections (user_id);
create index if not exists collection_apis_collection_idx on public.collection_apis (collection_id);
create index if not exists collection_apis_api_idx on public.collection_apis (api_id);
create index if not exists submissions_status_idx on public.api_submissions (review_status, created_at desc);
create index if not exists submissions_user_idx on public.api_submissions (submitted_by);
create index if not exists saved_requests_user_idx on public.saved_requests (user_id, created_at desc);
create index if not exists api_checks_api_idx on public.api_checks (api_id, checked_at desc);
create index if not exists api_credentials_user_idx on public.api_credentials (user_id);
