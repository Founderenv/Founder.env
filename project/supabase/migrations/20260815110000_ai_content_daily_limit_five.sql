-- Temporary testing quota. The function remains the single server-authoritative
-- policy point so this can later return 1 or use subscription entitlements.
begin;

create or replace function public.ai_content_daily_limit(target_business_id uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select case when public.owns_business(target_business_id) then 5 else 0 end;
$$;

revoke all on function public.ai_content_daily_limit(uuid) from public,anon,authenticated,service_role;
grant execute on function public.ai_content_daily_limit(uuid) to authenticated;

commit;
