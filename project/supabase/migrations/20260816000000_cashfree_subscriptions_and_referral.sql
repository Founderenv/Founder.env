-- Cashfree subscriptions for business owners, added alongside the existing
-- Razorpay provider. The billing model is provider-independent:
--   setup ₹299 today · ₹199/month from one calendar month later · 24 cycles.
-- Cashfree amounts arrive in rupees; the shared schema stores paise, so the
-- Cashfree edge function converts to paise before calling these functions.

begin;

-- Provider-agnostic activation type: allow cashfree alongside razorpay and
-- the manual/early_access activations.
alter table public.subscriptions drop constraint if exists subscriptions_activation_type_check;
alter table public.subscriptions
  add constraint subscriptions_activation_type_check
  check (activation_type in ('pending','razorpay','cashfree','early_access','complimentary','trial'));

-- The provider event dedup table now also records Cashfree events.
-- provider_event_id stays globally unique (Cashfree ids are prefixed), so the
-- existing unique index on provider_event_id continues to guard idempotency.
alter table public.razorpay_webhook_events add column if not exists provider text not null default 'razorpay';

-- Cashfree identifier for the authorisation/setup payment (idempotent activation).
alter table public.subscriptions add column if not exists cashfree_payment_id text;

create or replace function public.register_cashfree_subscription(
  target_business_id uuid,
  target_subscription_id text,
  target_plan_id text,
  target_start_at timestamptz
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
    total_count, paid_count, activation_type
  ) values (
    target_business_id, 'pro', 'pending', 'cashfree', target_subscription_id,
    nullif(target_plan_id,''), 'initialised', 29900, 19900, target_start_at, 24, 0, 'cashfree'
  )
  on conflict (business_id) do update set
    plan = 'pro', status = 'pending', provider = 'cashfree',
    provider_subscription_id = excluded.provider_subscription_id,
    provider_plan_id = excluded.provider_plan_id, provider_status = 'initialised',
    setup_fee_amount_paise = 29900, monthly_amount_paise = 19900,
    setup_fee_paid = false, setup_payment_id = null, cashfree_payment_id = null,
    autopay_authorized = false, subscription_start_at = excluded.subscription_start_at,
    total_count = 24, paid_count = 0, cancel_at_period_end = false,
    activation_type = 'cashfree', updated_at = timezone('utc', now())
  returning * into result;
  return result;
end;
$$;

create or replace function public.apply_cashfree_subscription_event(
  target_event_id text,
  target_event_type text,
  target_subscription_id text,
  target_payment_id text default null,
  target_provider_status text default null,
  target_payment_status text default null,
  target_payment_amount_paise bigint default null,
  target_paid_count integer default null,
  target_payload jsonb default '{}'::jsonb
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  sub public.subscriptions;
  owner_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  if target_event_type not in (
    'SUBSCRIPTION_STATUS_CHANGED','SUBSCRIPTION_AUTH_STATUS','SUBSCRIPTION_PAYMENT_SUCCESS',
    'SUBSCRIPTION_PAYMENT_FAILED','SUBSCRIPTION_PAYMENT_CANCELLED'
  ) then raise exception 'unsupported Cashfree event'; end if;

  insert into public.razorpay_webhook_events(provider_event_id,event_type,payload,provider)
  values(target_event_id,target_event_type,coalesce(target_payload,'{}'::jsonb),'cashfree')
  on conflict(provider_event_id) do nothing;
  if not found then return false; end if;

  select * into sub from public.subscriptions
  where provider_subscription_id = target_subscription_id and activation_type = 'cashfree'
  for update;
  if not found then raise exception 'unknown Cashfree subscription'; end if;
  select b.owner_id into owner_id from public.businesses b where b.id = sub.business_id;

  update public.subscriptions set
    provider_status = coalesce(target_provider_status, provider_status),
    updated_at = timezone('utc', now())
  where id = sub.id;

  -- Day-1 activation: ₹299 setup payment captured AND mandate authorised.
  if target_event_type = 'SUBSCRIPTION_AUTH_STATUS'
     and target_payment_status in ('SUCCESS','ACTIVE')
     and target_payment_amount_paise = 29900
     and target_payment_id is not null then
    insert into public.payments(business_id,external_payment_id,amount,amount_paise,currency,type,status,provider,provider_payload)
    values(sub.business_id,target_payment_id,299,29900,'INR','activation','success','cashfree',target_payload)
    on conflict(external_payment_id) do update set status='success',provider_payload=excluded.provider_payload,updated_at=timezone('utc',now());
    update public.subscriptions set status='active', started_at=coalesce(started_at,timezone('utc',now())),
      setup_fee_paid=true, setup_payment_id=target_payment_id, cashfree_payment_id=target_payment_id,
      autopay_authorized=true, provider_status=coalesce(target_provider_status,provider_status),
      updated_at=timezone('utc',now()) where id=sub.id;
    update public.businesses set lifecycle='active', is_active=true, subscription_status='active', updated_at=timezone('utc',now()) where id=sub.business_id;
    insert into public.notifications(recipient_user_id,type,title,body,business_id,source_event_id)
    values(owner_id,'subscription','Subscription authorised','Your ₹299 setup payment is complete. The first ₹199 monthly payment is scheduled one calendar month after authorisation.',sub.business_id,target_event_id)
    on conflict(source_event_id) where source_event_id is not null do nothing;
  -- Recurring: ₹199 captured → record payment, increment cycle (once, guarded by event dedup).
  elsif target_event_type = 'SUBSCRIPTION_PAYMENT_SUCCESS'
     and target_payment_status = 'SUCCESS'
     and target_payment_amount_paise = 19900
     and target_payment_id is not null then
    insert into public.payments(business_id,external_payment_id,amount,amount_paise,currency,type,status,provider,provider_payload)
    values(sub.business_id,target_payment_id,199,19900,'INR','subscription','success','cashfree',target_payload)
    on conflict(external_payment_id) do update set status='success',provider_payload=excluded.provider_payload,updated_at=timezone('utc',now());
    update public.subscriptions set status='active', provider_status=coalesce(target_provider_status,'active'),
      paid_count=paid_count+1, updated_at=timezone('utc',now()) where id=sub.id;
    update public.businesses set subscription_status='active',updated_at=timezone('utc',now()) where id=sub.business_id;
    insert into public.notifications(recipient_user_id,type,title,body,business_id,source_event_id)
    values(owner_id,'subscription','Monthly payment received','Your ₹199 Founder.env monthly subscription payment was received.',sub.business_id,target_event_id)
    on conflict(source_event_id) where source_event_id is not null do nothing;
  -- Recurring failure → past due.
  elsif target_event_type in ('SUBSCRIPTION_PAYMENT_FAILED','SUBSCRIPTION_PAYMENT_CANCELLED') then
    update public.subscriptions set status='past_due', updated_at=timezone('utc',now()) where id=sub.id;
    update public.businesses set subscription_status='past_due',updated_at=timezone('utc',now()) where id=sub.business_id;
    insert into public.notifications(recipient_user_id,type,title,body,business_id,source_event_id)
    values(owner_id,'subscription','Subscription payment needs attention','Cashfree could not collect the monthly payment. Please update your payment method.',sub.business_id,target_event_id)
    on conflict(source_event_id) where source_event_id is not null do nothing;
  -- Subscription lifecycle sync.
  elsif target_event_type = 'SUBSCRIPTION_STATUS_CHANGED' then
    if target_provider_status in ('CANCELLED','CUSTOMER_CANCELLED','CUSTOMER_PAUSED') then
      update public.subscriptions set status='cancelled',cancelled_at=timezone('utc',now()),updated_at=timezone('utc',now()) where id=sub.id;
      update public.businesses set subscription_status='cancelled',updated_at=timezone('utc',now()) where id=sub.business_id;
    elsif target_provider_status in ('COMPLETED','EXPIRED','LINK_EXPIRED') then
      update public.subscriptions set status='expired',provider_status=target_provider_status,updated_at=timezone('utc',now()) where id=sub.id;
      update public.businesses set subscription_status='expired',updated_at=timezone('utc',now()) where id=sub.business_id;
    elsif target_provider_status in ('ACTIVE','BANK_APPROVAL_PENDING') and sub.setup_fee_paid and sub.autopay_authorized then
      update public.subscriptions set status='active',updated_at=timezone('utc',now()) where id=sub.id;
      update public.businesses set subscription_status='active',updated_at=timezone('utc',now()) where id=sub.business_id;
    elsif target_provider_status in ('ON_HOLD','INITIALISED') then
      update public.subscriptions set status='pending',updated_at=timezone('utc',now()) where id=sub.id;
    end if;
  end if;
  return true;
end;
$$;

-- The referral reward trigger is provider-independent: a verified activation is
-- a verified activation whether it came from Razorpay or Cashfree.
create or replace function public.issue_verified_business_referral_reward()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare referral public.business_owner_referrals; setup_payment text; inserted_id uuid; available_before integer; available_after integer;
begin
  if not new.is_active or new.lifecycle<>'active' then return new; end if;
  select s.setup_payment_id into setup_payment from public.subscriptions s
  where s.business_id=new.id and s.activation_type in ('razorpay','cashfree') and s.setup_fee_paid and s.setup_fee_amount_paise=29900 and s.setup_payment_id is not null;
  if setup_payment is null then return new; end if;
  select * into referral from public.business_owner_referrals where business_id=new.id for update;
  if not found or referral.status not in ('applied','payment_pending') then return new; end if;
  select coalesce(sum(amount_paise),0)::integer into available_before from public.referral_earnings
  where referrer_customer_id=referral.referrer_customer_id and payout_status='available';
  update public.business_owner_referrals set status='reward_earned',locked_at=coalesce(locked_at,timezone('utc',now())),verified_at=timezone('utc',now()),provider_setup_payment_id=setup_payment,updated_at=timezone('utc',now()) where id=referral.id;
  insert into public.referral_earnings(business_id,referrer_customer_id,referral_id,provider_setup_payment_id)
  values(new.id,referral.referrer_customer_id,referral.id,setup_payment)
  on conflict do nothing returning id into inserted_id;
  if inserted_id is not null then
    insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id,source_event_id)
    values(referral.referrer_customer_id,'referral','Referral verified',new.name||' completed Founder.env setup. You earned ₹25.',new.id,'referral_earning',inserted_id,'referral-earned:'||referral.id::text)
    on conflict(source_event_id) where source_event_id is not null do nothing;
    available_after:=available_before+2500;
    if available_before<15000 and available_after>=15000 then
      insert into public.notifications(recipient_user_id,type,title,body,entity_type,source_event_id)
      values(referral.referrer_customer_id,'referral','Payout unlocked','You''ve reached ₹150. Your referral payout is ready to request.','referral_payout','referral-unlocked:'||inserted_id::text)
      on conflict(source_event_id) where source_event_id is not null do nothing;
    end if;
  end if;
  return new;
end; $$;

revoke all on function public.register_cashfree_subscription(uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.register_cashfree_subscription(uuid,text,text,timestamptz) to service_role;
revoke all on function public.apply_cashfree_subscription_event(text,text,text,text,text,text,bigint,integer,jsonb) from public, anon, authenticated;
grant execute on function public.apply_cashfree_subscription_event(text,text,text,text,text,text,bigint,integer,jsonb) to service_role;

commit;
