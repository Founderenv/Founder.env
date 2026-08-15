-- Persist the Cashfree subscription session so an in-progress (pending)
-- activation can resume/reuse the same checkout without creating a duplicate
-- subscription. Safe, additive, provider-scoped.

begin;

alter table public.subscriptions add column if not exists subscription_session text;

create or replace function public.register_cashfree_subscription(
  target_business_id uuid,
  target_subscription_id text,
  target_plan_id text,
  target_start_at timestamptz,
  target_session text default null
) returns public.subscriptions
language plpgsql security definer set search_path = public
as $$
declare result public.subscriptions;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  if nullif(target_subscription_id, '') is null then raise exception 'subscription identifier required'; end if;
  if exists (
    select 1 from public.subscriptions
    where business_id = target_business_id
      and activation_type in ('early_access','complimentary','trial')
      and status = 'active'
  ) then raise exception 'manual activation already active'; end if;

  insert into public.subscriptions (
    business_id, plan, status, provider, provider_subscription_id, provider_plan_id,
    provider_status, setup_fee_amount_paise, monthly_amount_paise, subscription_start_at,
    total_count, paid_count, activation_type, subscription_session
  ) values (
    target_business_id, 'pro', 'pending', 'cashfree', target_subscription_id,
    nullif(target_plan_id,''), 'initialised', 29900, 19900, target_start_at, 24, 0, 'cashfree',
    nullif(target_session,'')
  )
  on conflict (business_id) do update set
    plan = 'pro', status = 'pending', provider = 'cashfree',
    provider_subscription_id = excluded.provider_subscription_id,
    provider_plan_id = excluded.provider_plan_id, provider_status = 'initialised',
    setup_fee_amount_paise = 29900, monthly_amount_paise = 19900,
    setup_fee_paid = false, setup_payment_id = null, cashfree_payment_id = null,
    autopay_authorized = false, subscription_start_at = excluded.subscription_start_at,
    total_count = 24, paid_count = 0, cancel_at_period_end = false,
    activation_type = 'cashfree', subscription_session = excluded.subscription_session,
    updated_at = timezone('utc', now())
  returning * into result;
  return result;
end;
$$;

revoke all on function public.register_cashfree_subscription(uuid,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.register_cashfree_subscription(uuid,text,text,timestamptz,text) to service_role;

commit;
