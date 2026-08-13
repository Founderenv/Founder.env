-- Deferred Razorpay subscription billing for business owners.
-- Monetary values used by the provider are stored in paise.

alter table public.subscriptions
  add column if not exists provider text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_plan_id text,
  add column if not exists provider_status text,
  add column if not exists setup_fee_amount_paise bigint not null default 29900 check (setup_fee_amount_paise = 29900),
  add column if not exists monthly_amount_paise bigint not null default 19900 check (monthly_amount_paise = 19900),
  add column if not exists setup_fee_paid boolean not null default false,
  add column if not exists setup_payment_id text,
  add column if not exists autopay_authorized boolean not null default false,
  add column if not exists subscription_start_at timestamptz,
  add column if not exists total_count integer not null default 24 check (total_count = 24),
  add column if not exists paid_count integer not null default 0 check (paid_count >= 0),
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists activation_type text not null default 'pending'
    check (activation_type in ('pending','razorpay','early_access','complimentary','trial'));

create unique index if not exists subscriptions_provider_subscription_unique
  on public.subscriptions(provider_subscription_id)
  where provider_subscription_id is not null;
create unique index if not exists subscriptions_setup_payment_unique
  on public.subscriptions(setup_payment_id)
  where setup_payment_id is not null;

alter table public.payments add column if not exists amount_paise bigint check (amount_paise is null or amount_paise >= 0);
alter table public.notifications add column if not exists source_event_id text;
create unique index if not exists notifications_source_event_unique
  on public.notifications(source_event_id) where source_event_id is not null;

create table if not exists public.razorpay_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.razorpay_webhook_events enable row level security;
revoke all on public.razorpay_webhook_events from anon, authenticated;

create or replace function public.register_razorpay_subscription(
  target_business_id uuid,
  target_provider_subscription_id text,
  target_provider_plan_id text,
  target_start_at timestamptz
) returns public.subscriptions
language plpgsql security definer set search_path = public
as $$
declare result public.subscriptions;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  if nullif(target_provider_subscription_id, '') is null or nullif(target_provider_plan_id, '') is null then
    raise exception 'provider identifiers required';
  end if;
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
    target_business_id, 'pro', 'pending', 'razorpay', target_provider_subscription_id,
    target_provider_plan_id, 'created', 29900, 19900, target_start_at, 24, 0, 'razorpay'
  )
  on conflict (business_id) do update set
    plan = 'pro', status = 'pending', provider = 'razorpay',
    provider_subscription_id = excluded.provider_subscription_id,
    provider_plan_id = excluded.provider_plan_id, provider_status = 'created',
    setup_fee_amount_paise = 29900, monthly_amount_paise = 19900,
    setup_fee_paid = false, setup_payment_id = null, autopay_authorized = false,
    subscription_start_at = excluded.subscription_start_at, total_count = 24, paid_count = 0,
    cancel_at_period_end = false, activation_type = 'razorpay', updated_at = timezone('utc', now())
  returning * into result;
  return result;
end;
$$;

create or replace function public.apply_razorpay_subscription_event(
  target_event_id text,
  target_event_type text,
  target_subscription_id text,
  target_payment_id text default null,
  target_provider_status text default null,
  target_payment_status text default null,
  target_payment_amount_paise bigint default null,
  target_paid_count integer default null,
  target_period_start timestamptz default null,
  target_period_end timestamptz default null,
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
    'subscription.authenticated','subscription.activated','subscription.charged',
    'subscription.completed','subscription.updated','subscription.pending',
    'subscription.halted','subscription.cancelled','subscription.paused','subscription.resumed'
  ) then raise exception 'unsupported Razorpay event'; end if;

  insert into public.razorpay_webhook_events(provider_event_id,event_type,payload)
  values(target_event_id,target_event_type,coalesce(target_payload,'{}'::jsonb))
  on conflict(provider_event_id) do nothing;
  if not found then return false; end if;

  select * into sub from public.subscriptions
  where provider_subscription_id = target_subscription_id and activation_type = 'razorpay'
  for update;
  if not found then raise exception 'unknown Razorpay subscription'; end if;
  select b.owner_id into owner_id from public.businesses b where b.id = sub.business_id;

  update public.subscriptions set
    provider_status = coalesce(target_provider_status, provider_status),
    paid_count = greatest(paid_count, coalesce(target_paid_count, paid_count)),
    current_period_start = coalesce(target_period_start, current_period_start),
    current_period_end = coalesce(target_period_end, current_period_end),
    updated_at = timezone('utc', now())
  where id = sub.id;

  if target_event_type = 'subscription.authenticated'
     and target_provider_status in ('authenticated','active')
     and target_payment_status = 'captured'
     and target_payment_amount_paise = 29900
     and target_payment_id is not null then
    insert into public.payments(business_id,external_payment_id,amount,amount_paise,currency,type,status,provider,provider_payload)
    values(sub.business_id,target_payment_id,299,29900,'INR','activation','success','razorpay',target_payload)
    on conflict(external_payment_id) do update set status='success', provider_payload=excluded.provider_payload, updated_at=timezone('utc',now());
    update public.subscriptions set status='active', started_at=coalesce(started_at,timezone('utc',now())),
      setup_fee_paid=true, setup_payment_id=target_payment_id, autopay_authorized=true,
      provider_status=target_provider_status, updated_at=timezone('utc',now()) where id=sub.id;
    update public.businesses set lifecycle='active',is_active=true,subscription_status='active',updated_at=timezone('utc',now()) where id=sub.business_id;
    insert into public.notifications(recipient_user_id,type,title,body,business_id,source_event_id)
    values(owner_id,'subscription','Subscription authorised','Your ₹299 setup payment is complete. The first ₹199 monthly payment is scheduled one calendar month after authorisation.',sub.business_id,target_event_id)
    on conflict(source_event_id) where source_event_id is not null do nothing;
  elsif target_event_type = 'subscription.charged'
     and target_payment_status = 'captured'
     and target_payment_amount_paise = 19900
     and coalesce(target_paid_count,0) >= 1
     and target_payment_id is not null then
    insert into public.payments(business_id,external_payment_id,amount,amount_paise,currency,type,status,provider,provider_payload)
    values(sub.business_id,target_payment_id,199,19900,'INR','subscription','success','razorpay',target_payload)
    on conflict(external_payment_id) do update set status='success', provider_payload=excluded.provider_payload, updated_at=timezone('utc',now());
    update public.subscriptions set status='active',provider_status=coalesce(target_provider_status,'active'),updated_at=timezone('utc',now()) where id=sub.id;
    update public.businesses set subscription_status='active',updated_at=timezone('utc',now()) where id=sub.business_id;
    insert into public.notifications(recipient_user_id,type,title,body,business_id,source_event_id)
    values(owner_id,'subscription','Monthly payment received','Your ₹199 Founder.env monthly subscription payment was received. ' || coalesce(target_paid_count,0) || ' of 24 payments completed.',sub.business_id,target_event_id)
    on conflict(source_event_id) where source_event_id is not null do nothing;
  elsif target_event_type in ('subscription.pending','subscription.halted') then
    if target_payment_id is not null and target_payment_amount_paise = 19900 then
      insert into public.payments(business_id,external_payment_id,amount,amount_paise,currency,type,status,provider,provider_payload)
      values(sub.business_id,target_payment_id,199,19900,'INR','subscription','failed','razorpay',target_payload)
      on conflict(external_payment_id) do update set status='failed',provider_payload=excluded.provider_payload,updated_at=timezone('utc',now());
    end if;
    update public.subscriptions set status='past_due',updated_at=timezone('utc',now()) where id=sub.id;
    update public.businesses set subscription_status='past_due',updated_at=timezone('utc',now()) where id=sub.business_id;
    insert into public.notifications(recipient_user_id,type,title,body,business_id,source_event_id)
    values(owner_id,'subscription','Subscription payment needs attention','Razorpay could not collect the monthly payment. Please update your payment method; automatic retries may continue.',sub.business_id,target_event_id)
    on conflict(source_event_id) where source_event_id is not null do nothing;
  elsif target_event_type = 'subscription.cancelled' then
    update public.subscriptions set status='cancelled',cancelled_at=timezone('utc',now()),updated_at=timezone('utc',now()) where id=sub.id;
    update public.businesses set subscription_status='cancelled',updated_at=timezone('utc',now()) where id=sub.business_id;
  elsif target_event_type = 'subscription.completed' then
    update public.subscriptions set status='expired',provider_status='completed',updated_at=timezone('utc',now()) where id=sub.id;
    update public.businesses set subscription_status='expired',updated_at=timezone('utc',now()) where id=sub.business_id;
  elsif target_event_type in ('subscription.activated','subscription.resumed') and sub.setup_fee_paid and sub.autopay_authorized then
    update public.subscriptions set status='active',updated_at=timezone('utc',now()) where id=sub.id;
    update public.businesses set subscription_status='active',updated_at=timezone('utc',now()) where id=sub.business_id;
  end if;
  return true;
end;
$$;

revoke all on function public.register_razorpay_subscription(uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.register_razorpay_subscription(uuid,text,text,timestamptz) to service_role;
revoke all on function public.apply_razorpay_subscription_event(text,text,text,text,text,text,bigint,integer,timestamptz,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.apply_razorpay_subscription_event(text,text,text,text,text,text,bigint,integer,timestamptz,timestamptz,jsonb) to service_role;

-- Preserve previously approved pilot accounts as manual activations.
update public.subscriptions s set activation_type='early_access'
from public.businesses b
where b.id=s.business_id and b.lifecycle='active' and b.is_active and s.provider_subscription_id is null;

-- Keep the established admin-only activation path explicit for future pilot accounts.
create or replace function public.admin_activate_early_access(target_business_id uuid, note text default null)
returns public.businesses language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.businesses;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  update public.businesses set lifecycle='active',is_active=true,subscription_status='active',updated_at=timezone('utc',now())
  where id=target_business_id returning * into result;
  if result.id is null then raise exception 'business not found' using errcode = 'P0002'; end if;
  insert into public.subscriptions(business_id,plan,status,started_at,activation_type)
  values(target_business_id,'lite','active',timezone('utc',now()),'early_access')
  on conflict(business_id) do update set plan='lite',status='active',started_at=coalesce(subscriptions.started_at,timezone('utc',now())),
    activation_type='early_access',provider=null,provider_subscription_id=null,provider_plan_id=null,provider_status=null,
    setup_fee_paid=false,autopay_authorized=false,updated_at=timezone('utc',now());
  insert into public.admin_audit_logs(admin_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'early_access_activation','business',target_business_id,jsonb_build_object('note',coalesce(note,'Early Access waiver')));
  return result;
end;
$$;
revoke all on function public.admin_activate_early_access(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.admin_activate_early_access(uuid,text) to authenticated;
