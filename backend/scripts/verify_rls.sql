-- Run in the Supabase SQL Editor AFTER enable_rls.sql. Read-only: changes nothing.

-- 1) Every UniRide table must show rls_enabled = true.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'alembic_version'
order by c.relname;

-- 2) Policies. The backend uses the database owner, so no policy is needed and this should be EMPTY.
--    Any row here is an extra way in for the public key: read it carefully.
select tablename, policyname, roles, cmd from pg_policies where schemaname = 'public';

-- 3) What the public key can actually see: every count must be 0 (or the query errors with
--    "permission denied", which is also fine). A non-zero count means that table is exposed.
begin;
set local role anon;
select 'anon' as role, 'bicycles' as tbl, count(*) from public.bicycles
union all select 'anon', 'rides', count(*) from public.rides
union all select 'anon', 'profiles', count(*) from public.profiles
union all select 'anon', 'problem_reports', count(*) from public.problem_reports;
rollback;

begin;
set local role authenticated;   -- a logged-in student using the public key directly, not through your API
select 'authenticated' as role, 'bicycles' as tbl, count(*) from public.bicycles
union all select 'authenticated', 'rides', count(*) from public.rides
union all select 'authenticated', 'profiles', count(*) from public.profiles
union all select 'authenticated', 'maintenance_records', count(*) from public.maintenance_records
union all select 'authenticated', 'audit_logs', count(*) from public.audit_logs;
rollback;
