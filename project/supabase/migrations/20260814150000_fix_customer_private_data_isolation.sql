-- P0 privacy hardening for customer billing, notifications, FE wallets and
-- customer/business relationship history. Existing data is preserved.
begin;

-- Google/OAuth identities are always customers. Business-owner intent is
-- accepted only during the existing email/password signup path.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'requested_role', '');
  auth_provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  resolved_role public.app_role;
  resolved_onboarding_complete boolean;
begin
  if auth_provider = 'email' and requested = 'business_owner' then
    resolved_role := 'business_owner'::public.app_role;
    resolved_onboarding_complete := false;
  else
    resolved_role := 'customer'::public.app_role;
    resolved_onboarding_complete := (requested = 'customer');
  end if;
  insert into public.profiles(id,role,display_name,avatar_url,email_private,onboarding_complete)
  values(
    new.id,resolved_role,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''),nullif(split_part(coalesce(new.email,''),'@',1),''),'Founder.env user'),
    new.raw_user_meta_data ->> 'avatar_url',new.email,resolved_onboarding_complete
  ) on conflict(id) do nothing;
  return new;
end;
$$;

create or replace function public.choose_initial_role(requested_role public.app_role)
returns public.profiles language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.profiles; should_complete boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if requested_role = 'admin' then raise exception 'admin cannot be self-selected' using errcode = '42501'; end if;
  if requested_role = 'business_owner' and not exists(
    select 1 from auth.users user_row
    where user_row.id = auth.uid() and coalesce(user_row.raw_app_meta_data ->> 'provider','email') = 'email'
  ) then raise exception 'business owners must register with email and password' using errcode = '42501'; end if;
  should_complete := (requested_role = 'customer');
  update public.profiles set role=requested_role,onboarding_complete=should_complete
  where id=auth.uid() and onboarding_complete=false returning * into result;
  if result.id is null then raise exception 'role already selected or profile missing' using errcode = '23505'; end if;
  return result;
end;
$$;
revoke all on function public.choose_initial_role(public.app_role) from public,anon,authenticated,service_role;
grant execute on function public.choose_initial_role(public.app_role) to authenticated;

-- This legacy helper accepts an arbitrary profile id and is needed only by
-- trusted billing functions. It must never be a directly callable client RPC.
revoke all on function public.v2_customer_account(uuid) from public, anon, authenticated;
grant execute on function public.v2_customer_account(uuid) to service_role;

drop policy if exists bill_requests_customer_read on public.bill_requests;
drop policy if exists bill_requests_customer_select on public.bill_requests;
drop policy if exists bill_requests_owner_select on public.bill_requests;
drop policy if exists bill_requests_admin_select on public.bill_requests;
create policy bill_requests_customer_select on public.bill_requests for select to authenticated
  using (customer_id = (select auth.uid()));
create policy bill_requests_owner_select on public.bill_requests for select to authenticated
  using (public.owns_business(business_id));
create policy bill_requests_admin_select on public.bill_requests for select to authenticated
  using (public.is_admin());

drop policy if exists bills_private_read on public.bills;
drop policy if exists bills_customer_select on public.bills;
drop policy if exists bills_owner_select on public.bills;
drop policy if exists bills_admin_select on public.bills;
create policy bills_customer_select on public.bills for select to authenticated
  using (customer_id = (select auth.uid()));
create policy bills_owner_select on public.bills for select to authenticated
  using (public.owns_business(business_id));
create policy bills_admin_select on public.bills for select to authenticated
  using (public.is_admin());

drop policy if exists notifications_own_read on public.notifications;
drop policy if exists notifications_own_update on public.notifications;
drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_own_read on public.notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));
create policy notifications_admin_all on public.notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists coin_accounts_private_read on public.fe_coin_accounts;
drop policy if exists coin_accounts_participant_select on public.fe_coin_accounts;
create policy coin_accounts_participant_select on public.fe_coin_accounts for select to authenticated
  using (
    public.is_admin()
    or (account_type = 'customer' and user_id = (select auth.uid()) and business_id is null)
    or (account_type = 'business' and user_id = (select auth.uid()) and public.owns_business(business_id))
  );

drop policy if exists coin_transactions_private_read on public.fe_coin_transactions;
drop policy if exists coin_transactions_account_select on public.fe_coin_transactions;
create policy coin_transactions_account_select on public.fe_coin_transactions for select to authenticated
  using (
    exists (
      select 1 from public.fe_coin_accounts account
      where account.id = fe_coin_transactions.account_id
        and (
          public.is_admin()
          or (account.account_type = 'customer' and account.user_id = (select auth.uid()) and account.business_id is null)
          or (account.account_type = 'business' and account.user_id = (select auth.uid()) and public.owns_business(account.business_id))
        )
    )
  );

drop policy if exists relationships_participant_read on public.customer_business_relationships;
drop policy if exists relationships_customer_select on public.customer_business_relationships;
drop policy if exists relationships_owner_select on public.customer_business_relationships;
drop policy if exists relationships_admin_select on public.customer_business_relationships;
create policy relationships_customer_select on public.customer_business_relationships for select to authenticated
  using (customer_id = (select auth.uid()));
create policy relationships_owner_select on public.customer_business_relationships for select to authenticated
  using (public.owns_business(business_id));
create policy relationships_admin_select on public.customer_business_relationships for select to authenticated
  using (public.is_admin());

-- Keep realtime useful while making the replica identity unambiguous for RLS.
alter table public.bill_requests replica identity full;
alter table public.bills replica identity full;
alter table public.notifications replica identity full;

commit;
