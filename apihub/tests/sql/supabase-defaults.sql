-- Supabase grants broad table privileges to anon/authenticated by default; RLS is what restricts them.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
