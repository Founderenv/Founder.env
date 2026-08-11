-- ============================================================================
-- FOUNDER.ENV — PRODUCTION AUTH & SCHEMA REPAIR MIGRATION
-- File: project/supabase/migrations/20260812020000_repair_production_auth_schema.sql
-- Description: Completely safe, 100% idempotent repair script for Supabase.
-- Can be run safely multiple times in Supabase SQL Editor without errors.
-- ============================================================================

begin;

-- ============================================================================
-- 1. SCHEMAS & EXTENSIONS
-- ============================================================================
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- ============================================================================
-- 2. ENUM TYPES (Idempotent creation)
-- ============================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('customer', 'business_owner', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'business_lifecycle') then
    create type public.business_lifecycle as enum ('draft', 'pending_activation', 'active', 'grace_period', 'lite', 'suspended');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum ('draft', 'published', 'archived', 'removed');
  end if;
  if not exists (select 1 from pg_type where typname = 'follow_source') then
    create type public.follow_source as enum ('qr', 'profile', 'deal', 'referral', 'explore', 'share');
  end if;
  if not exists (select 1 from pg_type where typname = 'media_type') then
    create type public.media_type as enum ('image', 'video');
  end if;
  if not exists (select 1 from pg_type where typname = 'deal_claim_status') then
    create type public.deal_claim_status as enum ('claimed', 'redeemed', 'expired', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type public.review_status as enum ('pending', 'approved', 'removed');
  end if;
  if not exists (select 1 from pg_type where typname = 'reward_claim_status') then
    create type public.reward_claim_status as enum ('available', 'redeemed', 'expired', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'referral_status') then
    create type public.referral_status as enum ('pending', 'qualified', 'rewarded', 'expired', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'loyalty_type') then
    create type public.loyalty_type as enum ('visit', 'points', 'spend');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_plan') then
    create type public.subscription_plan as enum ('lite', 'pro');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('pending', 'active', 'grace_period', 'past_due', 'cancelled', 'expired');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_type') then
    create type public.payment_type as enum ('activation', 'subscription', 'promotion', 'template', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'success', 'failed', 'refunded', 'partially_refunded');
  end if;
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum ('pending', 'reviewed', 'dismissed', 'actioned');
  end if;
end $$;

-- ============================================================================
-- 3. PROFILES TABLE & COLUMNS (Idempotent column additions)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

alter table public.profiles add column if not exists role public.app_role not null default 'customer';
alter table public.profiles add column if not exists display_name text check (char_length(display_name) between 1 and 80);
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists email_private text;
alter table public.profiles add column if not exists status text not null default 'active' check (status in ('active', 'suspended'));
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- Default updated_at trigger helper
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

-- ============================================================================
-- 4. CORE SECURITY DEFINER FUNCTIONS (Authorization & Role Separation)
-- ============================================================================

-- Check if user is active admin
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.profiles p where p.id = user_id and p.role = 'admin' and p.status = 'active');
$$;

-- Check if user owns a specific business
create or replace function public.owns_business(target_business_id uuid, user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from public.businesses b join public.profiles p on p.id = b.owner_id
    where b.id = target_business_id and b.owner_id = user_id
      and p.role = 'business_owner' and p.status = 'active'
  );
$$;

-- Check if user is customer
create or replace function public.is_customer(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.profiles p where p.id = user_id and p.role = 'customer' and p.status = 'active');
$$;

-- Check if business is active & public
create or replace function public.is_public_business(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from public.businesses b
    where b.id = target_business_id and b.is_active and b.lifecycle in ('active','grace_period','lite')
  );
$$;

-- Check conversation access
create or replace function public.can_access_conversation(target_conversation_id uuid, user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_admin(user_id) or exists(
    select 1 from public.conversations c
    where c.id = target_conversation_id
      and (c.customer_id = user_id or public.owns_business(c.business_id, user_id))
  );
$$;

-- ============================================================================
-- 5. AUTH USER CREATION & ROLE INTENT TRIGGERS
-- ============================================================================
-- Handles auth.users insert. Ensures customers get customer profile, while
-- business_owner intent keeps onboarding_complete = false until setup finished.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'requested_role', '');
  resolved_role public.app_role;
  resolved_onboarding_complete boolean;
begin
  if requested = 'business_owner' then
    resolved_role := 'business_owner'::public.app_role;
    resolved_onboarding_complete := false;
  else
    resolved_role := 'customer'::public.app_role;
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

drop trigger if exists founder_env_on_auth_user_created on auth.users;
create trigger founder_env_on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Choose initial role RPC
create or replace function public.choose_initial_role(requested_role public.app_role)
returns public.profiles language plpgsql security definer set search_path = public, pg_temp as $$
declare
  result public.profiles;
  should_complete boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if requested_role = 'admin' then raise exception 'admin cannot be self-selected' using errcode = '42501'; end if;

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

-- Complete business onboarding RPC
create or replace function public.complete_business_onboarding()
returns public.profiles language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;

  if not exists(
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'business_owner' and p.status = 'active'
  ) then
    raise exception 'business owner account required' using errcode = '42501';
  end if;

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

-- Get owner business state RPC (for payment pending gate)
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

-- Admin activate early access RPC (payment_status = waived)
create or replace function public.admin_activate_early_access(target_business_id uuid, note text default null)
returns public.businesses language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.businesses;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;

  update public.businesses
    set lifecycle = 'active', is_active = true
  where id = target_business_id
  returning * into result;

  if result.id is null then raise exception 'business not found' using errcode = 'P0002'; end if;

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

-- ============================================================================
-- 6. PROFILE & BUSINESS PROTECTION TRIGGERS (Idempotent drop & create)
-- ============================================================================
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.role() <> 'service_role' and auth.uid() = old.id and not public.is_admin(auth.uid()) then
    new.role = old.role;
    new.status = old.status;
    new.email_private = old.email_private;
    new.onboarding_complete = old.onboarding_complete;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles for each row execute function public.protect_profile_fields();

create or replace function public.protect_business_system_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin(auth.uid()) then
    if tg_op = 'INSERT' then
      new.owner_id = auth.uid(); new.is_verified = false; new.is_active = false; new.lifecycle = 'draft'; new.subscription_status = 'pending';
    else
      new.owner_id = old.owner_id; new.is_verified = old.is_verified; new.is_active = old.is_active;
      new.lifecycle = old.lifecycle; new.subscription_status = old.subscription_status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_business_system_fields on public.businesses;
create trigger protect_business_system_fields before insert or update on public.businesses for each row execute function public.protect_business_system_fields();

-- ============================================================================
-- 7. VIEWS (Idempotent CREATE OR REPLACE VIEW)
-- ============================================================================
create or replace view public.public_profiles with (security_barrier = true) as
select id, display_name, avatar_url, created_at from public.profiles where status = 'active';

create or replace function public.public_follower_count(target_business_id uuid)
returns bigint language sql stable security definer set search_path = public, pg_temp as $$
  select case when exists(select 1 from public.businesses b where b.id = target_business_id and b.is_active)
    then (select count(*) from public.business_followers f where f.business_id = target_business_id) else 0 end;
$$;

create or replace view public.business_public with (security_invoker = true) as
select b.*,
  public.public_follower_count(b.id) as follower_count,
  (select count(*)::bigint from public.reviews r where r.business_id = b.id and r.status = 'approved') as review_count,
  coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.business_id = b.id and r.status = 'approved'), 0) as rating
from public.businesses b where b.is_active and b.lifecycle in ('active','grace_period','lite');

-- Data Audit View for identifying production inconsistencies safely
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

-- ============================================================================
-- 8. ROW LEVEL SECURITY & POLICIES (Idempotent drop policy & recreate)
-- ============================================================================
do $$ declare table_name text; begin
  foreach table_name in array array[
    'profiles','business_templates','businesses','business_gallery','business_followers','posts','post_media','post_likes','post_comments','saved_posts','reposts',
    'deals','deal_claims','saved_deals','stories','story_views','story_highlights','story_highlight_items','deal_clips','deal_clip_likes','saved_deal_clips',
    'reviews','review_replies','review_helpful','conversations','messages','notifications','qr_codes','qr_scans','reward_campaigns','reward_claims',
    'scratch_campaigns','scratch_plays','referral_campaigns','referrals','loyalty_programs','loyalty_members','loyalty_transactions','subscriptions',
    'payments','invoices','reports','analytics_events','admin_audit_logs'
  ] loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = table_name) then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using(id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using(id = auth.uid()) with check(id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists businesses_public_read on public.businesses;
create policy businesses_public_read on public.businesses for select to anon, authenticated using((is_active and lifecycle in ('active','grace_period','lite')) or owner_id = auth.uid() or public.is_admin());

drop policy if exists businesses_owner_insert on public.businesses;
create policy businesses_owner_insert on public.businesses for insert to authenticated with check(owner_id = auth.uid() and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'business_owner' and p.status = 'active'));

drop policy if exists businesses_owner_update on public.businesses;
create policy businesses_owner_update on public.businesses for update to authenticated using(owner_id = auth.uid()) with check(owner_id = auth.uid());

drop policy if exists businesses_admin_all on public.businesses;
create policy businesses_admin_all on public.businesses for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- ============================================================================
-- 9. PERMISSIONS & GRANTS
-- ============================================================================
revoke all on function public.choose_initial_role(public.app_role) from public, anon, authenticated, service_role;
grant execute on function public.choose_initial_role(public.app_role) to authenticated;

revoke all on function public.complete_business_onboarding() from public, anon, authenticated, service_role;
grant execute on function public.complete_business_onboarding() to authenticated;

revoke all on function public.get_owner_business_state() from public, anon, authenticated, service_role;
grant execute on function public.get_owner_business_state() to authenticated;

revoke all on function public.admin_activate_early_access(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.admin_activate_early_access(uuid, text) to authenticated;

grant select on public.profiles to authenticated;
grant update(display_name, avatar_url) on public.profiles to authenticated;
grant select on public.public_profiles to anon, authenticated;
grant select on public.business_public to anon, authenticated;
grant select on public.admin_auth_data_audit to authenticated;

-- Realtime publication safety
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when others then
  -- Ignore if realtime publication does not exist in environment
  null;
end $$;

commit;
