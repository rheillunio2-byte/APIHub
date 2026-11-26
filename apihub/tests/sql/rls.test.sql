-- Run after 0001 + 0002. Each block raises an exception on failure; success prints PASS lines.
\set ON_ERROR_STOP on
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111','user@example.com'), ('22222222-2222-2222-2222-222222222222','admin@example.com');
-- signup trigger created profiles
do $$ begin assert (select count(*) from public.profiles) = 2, 'signup trigger should create profiles'; raise notice 'PASS signup trigger creates profiles'; end $$;
update public.profiles set role='admin' where id='22222222-2222-2222-2222-222222222222';

-- ---- as a normal user -------------------------------------------------------
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$ begin
  begin update public.profiles set role='admin' where id = auth.uid(); raise exception 'ESCALATION SUCCEEDED';
  exception when insufficient_privilege then raise notice 'PASS user cannot update own role (permission denied)'; end;
end $$;
do $$ begin
  update public.profiles set username='alice' where id = auth.uid();
  assert (select username from public.profiles where id = auth.uid()) = 'alice'; raise notice 'PASS user can update username';
end $$;
do $$ begin
  begin insert into public.apis (name, slug, description) values ('X','x','d'); raise exception 'USER INSERTED API';
  exception when insufficient_privilege or sqlstate '42501' then raise notice 'PASS user cannot write catalog'; end;
end $$;
do $$ begin
  begin insert into public.api_submissions (submitted_by, api_name, website_url, documentation_url, description, review_status)
    values (auth.uid(), 'n', 'https://a.io', 'https://a.io/d', 'd', 'Approved'); raise exception 'SELF-APPROVED';
  exception when insufficient_privilege or sqlstate '42501' then raise notice 'PASS user cannot self-approve a submission'; end;
end $$;
do $$ begin
  begin insert into public.api_submissions (submitted_by, api_name, website_url, documentation_url, description)
    values ('22222222-2222-2222-2222-222222222222', 'n', 'https://a.io', 'https://a.io/d', 'd'); raise exception 'IMPERSONATED';
  exception when insufficient_privilege or sqlstate '42501' then raise notice 'PASS user cannot submit as someone else'; end;
end $$;
do $$ begin
  begin insert into public.api_submissions (submitted_by, api_name, website_url, documentation_url, description)
    values (auth.uid(), 'n', 'javascript:alert(1)', 'https://a.io/d', 'd'); raise exception 'BAD URL ACCEPTED';
  exception when check_violation then raise notice 'PASS non-http URLs rejected'; end;
end $$;
insert into public.api_submissions (submitted_by, api_name, website_url, documentation_url, description)
  values (auth.uid(), 'ok', 'https://a.io', 'https://a.io/d', 'd');
do $$ begin assert (select count(*) from public.api_submissions) = 1; raise notice 'PASS user can submit as self (Pending)'; end $$;
do $$ begin assert (select count(*) from public.profiles) = 1, 'user must only see own profile'; raise notice 'PASS user sees only own profile'; end $$;
insert into public.collections (user_id, name) values (auth.uid(), 'mine');

-- ---- as another user: cannot see first user's data --------------------------
reset role; insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333','other@example.com');
set role authenticated; set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
do $$ begin
  assert (select count(*) from public.collections) = 0 and (select count(*) from public.api_submissions) = 0;
  raise notice 'PASS other users cannot read collections or submissions';
end $$;

-- ---- as admin ---------------------------------------------------------------
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin assert public.is_admin(); raise notice 'PASS is_admin() true for admin'; end $$;
insert into public.categories (name, slug) values ('Weather','weather');
insert into public.apis (name, slug, description, website_url) values ('Open-Meteo','open-meteo','Weather API','https://open-meteo.com');
do $$ begin assert (select count(*) from public.api_submissions) = 1; raise notice 'PASS admin can read all submissions'; end $$;
update public.api_submissions set review_status='Approved', admin_notes='ok';
do $$ begin assert (select count(*) from public.profiles) = 3; raise notice 'PASS admin can read all profiles'; end $$;

-- ---- anonymous --------------------------------------------------------------
reset role; set role anon; reset request.jwt.claim.sub;
do $$ begin assert (select count(*) from public.apis) = 1; raise notice 'PASS anon can read catalog'; end $$;
do $$ begin assert not public.is_admin(); raise notice 'PASS is_admin() false for anon'; end $$;
do $$ begin
  begin insert into public.apis (name, slug, description) values ('Y','y','d'); raise exception 'ANON INSERTED';
  exception when insufficient_privilege or sqlstate '42501' then raise notice 'PASS anon cannot write catalog'; end;
end $$;
reset role;
-- updated_at trigger
do $$ declare a timestamptz; b timestamptz; begin
  select updated_at into a from public.apis limit 1; perform pg_sleep(0.05);
  update public.apis set description='changed'; select updated_at into b from public.apis limit 1;
  assert b > a, 'updated_at should advance'; raise notice 'PASS updated_at trigger'; end $$;
