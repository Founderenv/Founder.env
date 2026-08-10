begin;

-- Future project-owned functions must be granted explicitly. This is scoped to
-- functions created by the postgres migration role in the public schema only.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

-- Reset every current SECURITY DEFINER function to a deny-by-default ACL.
revoke execute on function public.admin_update_business(uuid, text, text) from public, anon, authenticated, service_role;
revoke execute on function public.can_access_conversation(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.can_write_business_path(text) from public, anon, authenticated, service_role;
revoke execute on function public.choose_initial_role(public.app_role) from public, anon, authenticated, service_role;
revoke execute on function public.claim_deal(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.create_referral(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.get_business_followers(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;
revoke execute on function public.is_admin(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.is_customer(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.is_public_business(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.notify_message() from public, anon, authenticated, service_role;
revoke execute on function public.notify_new_follower() from public, anon, authenticated, service_role;
revoke execute on function public.notify_review_event() from public, anon, authenticated, service_role;
revoke execute on function public.notify_review_reply() from public, anon, authenticated, service_role;
revoke execute on function public.owns_business(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.play_scratch(uuid, text, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.public_follower_count(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.resolve_and_track_qr(text, text, jsonb) from public, anon, authenticated, service_role;

-- AUTHENTICATED_RPC: direct frontend operations for signed-in users.
grant execute on function public.choose_initial_role(public.app_role) to authenticated;
grant execute on function public.claim_deal(uuid) to authenticated;
grant execute on function public.create_referral(uuid, uuid) to authenticated;
grant execute on function public.get_business_followers(uuid) to authenticated;

-- ADMIN_ONLY: application admins use the authenticated database role; the
-- function's is_admin() check remains the database authorization boundary.
grant execute on function public.admin_update_business(uuid, text, text) to authenticated;

-- INTERNAL_HELPER: required while evaluating RLS/storage rules. is_admin and
-- owns_business are also referenced by anon public-read policies. Those policy
-- calls use auth.uid() (NULL for anon) and return false; retaining the grant
-- avoids breaking policy evaluation for public queries.
grant execute on function public.can_access_conversation(uuid, uuid) to authenticated;
grant execute on function public.can_write_business_path(text) to authenticated;
grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.is_customer(uuid) to authenticated;
grant execute on function public.owns_business(uuid, uuid) to anon, authenticated;

-- PUBLIC_RPC / public-policy helper: deliberately safe for signed-out reads.
grant execute on function public.is_public_business(uuid) to anon, authenticated;
grant execute on function public.public_follower_count(uuid) to anon, authenticated;
grant execute on function public.resolve_and_track_qr(text, text, jsonb) to anon, authenticated;

-- SERVER_ONLY: the internal auth.role() check remains as defense in depth.
grant execute on function public.play_scratch(uuid, text, uuid) to service_role;

-- Trigger-only functions are never directly executable by API roles. Trigger
-- invocation does not require the row-changing client to hold EXECUTE.
revoke execute on function public.protect_business_system_fields() from public, anon, authenticated, service_role;
revoke execute on function public.protect_message_fields() from public, anon, authenticated, service_role;
revoke execute on function public.protect_notification_fields() from public, anon, authenticated, service_role;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated, service_role;
revoke execute on function public.protect_review_fields() from public, anon, authenticated, service_role;
revoke execute on function public.set_updated_at() from public, anon, authenticated, service_role;
revoke execute on function public.validate_post_comment() from public, anon, authenticated, service_role;
revoke execute on function public.validate_review_reply() from public, anon, authenticated, service_role;

-- Non-definer storage helper required only by authenticated storage policies.
revoke execute on function public.is_own_user_path(text) from public, anon, authenticated, service_role;
grant execute on function public.is_own_user_path(text) to authenticated;

-- Preserve trigger behavior while removing mutable object resolution.
alter function public.set_updated_at() set search_path = public, pg_temp;

commit;
