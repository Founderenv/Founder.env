begin;

-- ============================================================
-- FIX 1: handle_new_user trigger
-- ============================================================
-- ROOT CAUSE: The original trigger set onboarding_complete=true
-- for both 'customer' and 'business_owner' signups via email.
-- Google OAuth (no requested_role in meta) would create a
-- customer profile with onboarding_complete=false — correct for
-- Google OAuth, but business_owner email signups also get
-- onboarding_complete=true, bypassing the onboarding wizard.
--
-- FIX:
-- • customer (email or Google): onboarding_complete = true
--   (customers need no extra onboarding step)
-- • business_owner (email): onboarding_complete = false
--   (must complete business profile setup before activation)
-- • no requested_role (Google OAuth): role = 'customer',
--   onboarding_complete = false
--   (frontend sets role + flags after callback via choose_initial_role)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'requested_role', '');
  resolved_role public.app_role;
  resolved_onboarding_complete boolean;
begin
  -- Resolve role: only 'business_owner' is promoted; everything else → customer
  if requested = 'business_owner' then
    resolved_role := 'business_owner'::public.app_role;
    -- Business owners must complete onboarding wizard before going live
    resolved_onboarding_complete := false;
  else
    resolved_role := 'customer'::public.app_role;
    -- Customers (including Google OAuth with no requested_role) are immediately ready
    -- BUT: if no requested_role at all (Google OAuth), leave onboarding_complete=false
    -- so the callback page can assign role intent. If explicitly 'customer', set true.
    resolved_onboarding_complete := (requested = 'customer');
  end if;

  insert into public.profiles(id, role, display_name, avatar_url, email_private, onboarding_complete)
  values (
    new.id,
    resolved_role,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Founder.env user'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email,
    resolved_onboarding_complete
  ) on conflict (id) do nothing;
  return new;
end;
$$;

-- ============================================================
-- FIX 2: choose_initial_role RPC
-- ============================================================
-- ROOT CAUSE: choose_initial_role set onboarding_complete=true
-- for BOTH customer and business_owner, meaning business owners
-- skipped onboarding immediately after role selection.
--
-- FIX:
-- • customer: onboarding_complete = true  (no setup needed)
-- • business_owner: onboarding_complete = false  (must run wizard)
-- ============================================================
create or replace function public.choose_initial_role(requested_role public.app_role)
returns public.profiles language plpgsql security definer set search_path = public, pg_temp as $$
declare
  result public.profiles;
  should_complete boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if requested_role = 'admin' then
    raise exception 'admin cannot be self-selected' using errcode = '42501';
  end if;

  -- Customers are immediately onboarded; owners need the wizard
  should_complete := (requested_role = 'customer');

  update public.profiles
    set role = requested_role,
        onboarding_complete = should_complete
  where id = auth.uid() and onboarding_complete = false
  returning * into result;

  if result.id is null then
    raise exception 'role already selected or profile missing' using errcode = '23505';
  end if;
  return result;
end;
$$;

-- Re-grant execute (ACL reset migration already set deny-by-default)
grant execute on function public.choose_initial_role(public.app_role) to authenticated;

-- ============================================================
-- FIX 3: complete_business_onboarding RPC
-- ============================================================
-- Called by the frontend after the business profile is created
-- and the onboarding wizard is finished. Marks the profile as
-- onboarding_complete=true so the owner can access the dashboard.
-- ============================================================
create or replace function public.complete_business_onboarding()
returns public.profiles language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;

  -- Only business_owners can call this
  if not exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'business_owner' and p.status = 'active'
  ) then
    raise exception 'business owner account required' using errcode = '42501';
  end if;

  -- Require that at least one business record exists for this owner
  if not exists(
    select 1 from public.businesses b where b.owner_id = auth.uid()
  ) then
    raise exception 'no business profile found — complete business setup first' using errcode = '42501';
  end if;

  update public.profiles
    set onboarding_complete = true
  where id = auth.uid()
  returning * into result;

  return result;
end;
$$;
revoke all on function public.complete_business_onboarding() from public, anon, authenticated, service_role;
grant execute on function public.complete_business_onboarding() to authenticated;

-- ============================================================
-- FIX 4: get_owner_payment_status helper
-- ============================================================
-- Returns the effective payment/activation status for the
-- authenticated owner's business. Used by the frontend to route
-- owners to: onboarding | payment-pending | dashboard
--
-- Returns:
--   'no_business'  — owner has no business record yet
--   'pending'      — business exists, subscription_status = 'pending'
--   'waived'       — subscription_status = 'active' set by admin
--                    with lifecycle != 'suspended' (early access)
--   'paid'         — subscription_status = 'active' via payment
--   'suspended'    — business is suspended
-- For simplicity the frontend treats 'waived' and 'paid' the same
-- (full dashboard access). Only admins can set status to 'active'.
-- ============================================================
create or replace function public.get_owner_business_state()
returns table(
  business_id uuid,
  business_name text,
  business_username text,
  lifecycle public.business_lifecycle,
  subscription_status public.subscription_status,
  is_active boolean,
  payment_gate text
) language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not exists(
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'business_owner' and p.status = 'active'
  ) then
    raise exception 'business owner account required' using errcode = '42501';
  end if;

  return query
  select
    b.id,
    b.name,
    b.username::text,
    b.lifecycle,
    b.subscription_status,
    b.is_active,
    case
      when b.lifecycle = 'suspended' then 'suspended'
      when b.is_active and b.lifecycle in ('active','grace_period','lite') then 'paid'
      else 'pending'
    end as payment_gate
  from public.businesses b
  where b.owner_id = auth.uid()
  order by b.created_at desc
  limit 1;
end;
$$;
revoke all on function public.get_owner_business_state() from public, anon, authenticated, service_role;
grant execute on function public.get_owner_business_state() to authenticated;

-- ============================================================
-- FIX 5: admin_activate_early_access RPC
-- ============================================================
-- Allows admins to waive payment for approved Early Access
-- businesses by setting lifecycle='active', is_active=true,
-- and creating/updating the subscription record to status='active'.
-- This represents payment_status = 'waived' in the UI.
-- ============================================================
create or replace function public.admin_activate_early_access(target_business_id uuid, note text default null)
returns public.businesses language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.businesses;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;

  update public.businesses
    set lifecycle = 'active', is_active = true
  where id = target_business_id
  returning * into result;

  if result.id is null then
    raise exception 'business not found' using errcode = 'P0002';
  end if;

  insert into public.subscriptions(business_id, plan, status, started_at)
  values(target_business_id, 'lite', 'active', now())
  on conflict(business_id)
  do update set status = 'active', started_at = coalesce(subscriptions.started_at, now());

  insert into public.admin_audit_logs(admin_user_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'early_access_activation', 'business', target_business_id,
         jsonb_build_object('note', coalesce(note, 'Early Access waiver')));

  return result;
end;
$$;
revoke all on function public.admin_activate_early_access(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.admin_activate_early_access(uuid, text) to authenticated;

-- ============================================================
-- FIX 6: Bad-data diagnostic (no auto-delete, manual review)
-- ============================================================
-- The following view surfaces potentially problematic records
-- created by earlier bugs. Review in Supabase SQL editor.
-- DO NOT auto-delete — manual review required.
-- ============================================================
create or replace view public.admin_auth_data_audit with (security_barrier = true) as
select
  p.id,
  p.role,
  p.display_name,
  p.email_private,
  p.onboarding_complete,
  p.status,
  p.created_at,
  (select count(*)::int from public.businesses b where b.owner_id = p.id) as business_count,
  case
    when p.role = 'business_owner' and not exists(select 1 from public.businesses b where b.owner_id = p.id)
      then 'owner_no_business'
    when p.role = 'customer' and exists(select 1 from public.businesses b where b.owner_id = p.id)
      then 'customer_has_business'
    when p.role = 'business_owner' and p.onboarding_complete and not exists(select 1 from public.businesses b where b.owner_id = p.id)
      then 'owner_marked_complete_no_business'
    else 'ok'
  end as audit_flag
from public.profiles p
where public.is_admin();

grant select on public.admin_auth_data_audit to authenticated;

commit;
