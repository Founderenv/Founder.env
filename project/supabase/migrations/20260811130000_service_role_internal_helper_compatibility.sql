begin;

-- Project trigger guards call is_admin() even for trusted service-role writes.
-- Restore only this internal helper privilege so server-authorized setup and
-- maintenance operations do not fail before their service-role bypass applies.
grant execute on function public.is_admin(uuid) to service_role;

commit;
