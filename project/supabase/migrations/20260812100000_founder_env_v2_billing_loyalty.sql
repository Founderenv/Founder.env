-- Founder.env V2: bills, benefits, FE Coin ledger and relationship history.
-- All mutable financial state is written through the RPCs below, never the client.
begin;

alter table public.businesses add column if not exists business_type text not null default 'shop'
  check (business_type in ('shop','service','startup','freelancer'));
alter table public.businesses add column if not exists services jsonb not null default '[]'::jsonb;
alter table public.businesses add column if not exists portfolio_url text;
alter table public.businesses add column if not exists starting_price numeric(12,2);

create table if not exists public.business_reward_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  member_discount_type text not null default 'percentage' check (member_discount_type in ('percentage','flat')),
  member_discount_value numeric(12,2) not null default 0 check (member_discount_value >= 0),
  maximum_discount numeric(12,2), minimum_bill numeric(12,2) not null default 0 check (minimum_bill >= 0),
  max_fe_coin_redemption_percent numeric(5,2) not null default 0 check (max_fe_coin_redemption_percent between 0 and 100),
  customer_coin_rate numeric(12,4) not null default 0.01 check (customer_coin_rate >= 0),
  merchant_coin_rate numeric(12,4) not null default 0.005 check (merchant_coin_rate >= 0),
  enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.bill_requests (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','completed','cancelled')),
  created_at timestamptz not null default now(), handled_at timestamptz, created_bill_id uuid
);
create unique index if not exists bill_requests_one_active_per_customer_business on public.bill_requests(business_id, customer_id)
  where status in ('pending','accepted');
create index if not exists bill_requests_business_status_idx on public.bill_requests(business_id, status, created_at desc);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  bill_request_id uuid unique references public.bill_requests(id) on delete set null,
  original_amount numeric(12,2) not null check (original_amount > 0), member_discount numeric(12,2) not null default 0 check (member_discount >= 0),
  fe_coin_discount numeric(12,2) not null default 0 check (fe_coin_discount >= 0), final_amount numeric(12,2) not null check (final_amount >= 0),
  currency text not null default 'INR', status text not null default 'ready' check (status in ('draft','pending','ready','paid','cancelled')),
  description text, invoice_number text, note text, payment_reference text,
  payment_status text not null default 'pending' check (payment_status in ('pending','processing','paid','failed')),
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(), paid_at timestamptz
);
alter table public.bill_requests add constraint bill_requests_created_bill_fk foreign key (created_bill_id) references public.bills(id) on delete set null;
create index if not exists bills_customer_created_idx on public.bills(customer_id, created_at desc);
create index if not exists bills_business_status_idx on public.bills(business_id, status, created_at desc);

create table if not exists public.fe_coin_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  account_type text not null check (account_type in ('customer','business')),
  balance numeric(14,2) not null default 0 check (balance >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, account_type, business_id)
);
create unique index if not exists fe_customer_account_unique on public.fe_coin_accounts(user_id) where account_type = 'customer' and business_id is null;
create table if not exists public.fe_coin_transactions (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.fe_coin_accounts(id) on delete restrict,
  bill_id uuid references public.bills(id) on delete restrict, type text not null check (type in ('earn','redeem','bonus','referral','subscription_credit','adjustment')),
  amount numeric(14,2) not null check (amount <> 0), description text not null, created_at timestamptz not null default now(),
  unique(account_id, bill_id, type)
);
create table if not exists public.customer_business_relationships (
  business_id uuid not null references public.businesses(id) on delete cascade, customer_id uuid not null references public.profiles(id) on delete cascade,
  paid_bill_count integer not null default 0, total_spend numeric(14,2) not null default 0, total_savings numeric(14,2) not null default 0,
  fe_coins_earned numeric(14,2) not null default 0, last_purchase_at timestamptz, loyalty_level text not null default 'new' check (loyalty_level in ('new','regular','vip','elite')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(business_id, customer_id)
);

-- Existing V1 notifications are extended without replacing the table or its data.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('new_follower','new_review','review_reply','new_message','new_deal','new_story','reward','referral','subscription','bill_requested','bill_ready','payment_success','fe_coins_earned','reward_unlocked'));

create or replace function public.v2_customer_account(target_user_id uuid) returns public.fe_coin_accounts
language plpgsql security definer set search_path = public, pg_temp as $$
declare account_row public.fe_coin_accounts;
begin
  insert into public.fe_coin_accounts(user_id, account_type) values (target_user_id, 'customer')
  on conflict do nothing;
  select * into account_row from public.fe_coin_accounts where user_id = target_user_id and account_type = 'customer' and business_id is null;
  return account_row;
end $$;

create or replace function public.request_bill(target_business_id uuid) returns public.bill_requests
language plpgsql security definer set search_path = public, pg_temp as $$
declare request_row public.bill_requests; owner_name text;
begin
  if not public.is_customer() then raise exception 'customer account required' using errcode = '42501'; end if;
  if not exists(select 1 from public.business_followers where business_id = target_business_id and customer_id = auth.uid()) then
    raise exception 'follow this business before requesting a bill' using errcode = '42501';
  end if;
  insert into public.bill_requests(business_id, customer_id) values(target_business_id, auth.uid()) returning * into request_row;
  select display_name into owner_name from public.profiles where id = auth.uid();
  insert into public.notifications(recipient_user_id, type, title, body, business_id, entity_type, entity_id)
  select b.owner_id, 'bill_requested', 'New bill request', coalesce(owner_name, 'A customer') || ' requested a bill.', b.id, 'bill_request', request_row.id from public.businesses b where b.id = target_business_id;
  return request_row;
exception when unique_violation then
  raise exception 'You already have an active bill request for this business' using errcode = '23505';
end $$;

create or replace function public.owner_create_bill(target_request_id uuid, amount numeric, bill_description text default null, invoice_ref text default null, bill_note text default null, requested_coin_discount numeric default 0)
returns public.bills language plpgsql security definer set search_path = public, pg_temp as $$
declare req public.bill_requests; settings public.business_reward_settings; bill_row public.bills; customer_account public.fe_coin_accounts;
  member_amount numeric(12,2) := 0; coin_amount numeric(12,2) := 0; max_coin numeric(12,2) := 0;
begin
  if amount is null or amount <= 0 then raise exception 'bill amount must be greater than zero'; end if;
  select * into req from public.bill_requests where id = target_request_id for update;
  if req.id is null or req.status <> 'pending' then raise exception 'pending bill request not found' using errcode = 'P0002'; end if;
  if not public.owns_business(req.business_id) then raise exception 'business ownership required' using errcode = '42501'; end if;
  select * into settings from public.business_reward_settings where business_id = req.business_id;
  if settings.business_id is not null and settings.enabled and amount >= settings.minimum_bill then
    member_amount := case when settings.member_discount_type = 'percentage' then round(amount * settings.member_discount_value / 100, 2) else settings.member_discount_value end;
    if settings.maximum_discount is not null then member_amount := least(member_amount, settings.maximum_discount); end if;
  end if;
  customer_account := public.v2_customer_account(req.customer_id);
  if settings.business_id is not null then max_coin := round(amount * settings.max_fe_coin_redemption_percent / 100, 2); end if;
  coin_amount := least(greatest(coalesce(requested_coin_discount, 0), 0), max_coin, customer_account.balance, greatest(amount - member_amount, 0));
  insert into public.bills(business_id, customer_id, bill_request_id, original_amount, member_discount, fe_coin_discount, final_amount, description, invoice_number, note, created_by)
  values(req.business_id, req.customer_id, req.id, amount, member_amount, coin_amount, amount-member_amount-coin_amount, bill_description, invoice_ref, bill_note, auth.uid()) returning * into bill_row;
  update public.bill_requests set status = 'accepted', handled_at = now(), created_bill_id = bill_row.id where id = req.id;
  insert into public.notifications(recipient_user_id, type, title, body, business_id, entity_type, entity_id)
  values(req.customer_id, 'bill_ready', 'Your bill is ready', 'A bill of ₹' || bill_row.final_amount || ' is ready to pay.', req.business_id, 'bill', bill_row.id);
  return bill_row;
end $$;

-- Called only by a verified provider webhook / trusted server using service_role.
create or replace function public.verify_bill_payment(target_bill_id uuid, provider_reference text)
returns public.bills language plpgsql security definer set search_path = public, pg_temp as $$
declare bill_row public.bills; settings public.business_reward_settings; customer_account public.fe_coin_accounts; business_account public.fe_coin_accounts;
  customer_reward numeric(14,2); merchant_reward numeric(14,2); owner_user_id uuid; relationship_count integer;
begin
  if auth.role() <> 'service_role' then raise exception 'verified payment service required' using errcode = '42501'; end if;
  select * into bill_row from public.bills where id = target_bill_id for update;
  if bill_row.id is null then raise exception 'bill not found' using errcode = 'P0002'; end if;
  if bill_row.payment_status = 'paid' then return bill_row; end if;
  if bill_row.status = 'cancelled' then raise exception 'cancelled bill cannot be paid'; end if;
  update public.bills set payment_status='paid', status='paid', payment_reference=provider_reference, paid_at=now() where id=target_bill_id returning * into bill_row;
  update public.bill_requests set status='completed', handled_at=now() where id=bill_row.bill_request_id and status <> 'completed';
  select * into settings from public.business_reward_settings where business_id=bill_row.business_id;
  customer_reward := round(bill_row.final_amount * coalesce(settings.customer_coin_rate,0), 2);
  merchant_reward := round(bill_row.final_amount * coalesce(settings.merchant_coin_rate,0), 2);
  customer_account := public.v2_customer_account(bill_row.customer_id);
  select owner_id into owner_user_id from public.businesses where id=bill_row.business_id;
  insert into public.fe_coin_accounts(user_id,business_id,account_type) values(owner_user_id,bill_row.business_id,'business') on conflict do nothing;
  select * into business_account from public.fe_coin_accounts where user_id=owner_user_id and business_id=bill_row.business_id and account_type='business';
  insert into public.fe_coin_transactions(account_id,bill_id,type,amount,description) values(customer_account.id,bill_row.id,'earn',customer_reward,'FE Coins earned from verified bill') on conflict do nothing;
  insert into public.fe_coin_transactions(account_id,bill_id,type,amount,description) values(business_account.id,bill_row.id,'earn',merchant_reward,'Business FE Coins earned from verified bill') on conflict do nothing;
  update public.fe_coin_accounts a set balance = (select coalesce(sum(t.amount),0) from public.fe_coin_transactions t where t.account_id=a.id), updated_at=now() where a.id in (customer_account.id,business_account.id);
  insert into public.customer_business_relationships(business_id,customer_id,paid_bill_count,total_spend,total_savings,fe_coins_earned,last_purchase_at,loyalty_level)
  values(bill_row.business_id,bill_row.customer_id,1,bill_row.final_amount,bill_row.member_discount+bill_row.fe_coin_discount,customer_reward,now(),'new')
  on conflict(business_id,customer_id) do update set paid_bill_count=customer_business_relationships.paid_bill_count+1,total_spend=customer_business_relationships.total_spend+excluded.total_spend,total_savings=customer_business_relationships.total_savings+excluded.total_savings,fe_coins_earned=customer_business_relationships.fe_coins_earned+excluded.fe_coins_earned,last_purchase_at=excluded.last_purchase_at,updated_at=now();
  select paid_bill_count into relationship_count from public.customer_business_relationships where business_id=bill_row.business_id and customer_id=bill_row.customer_id;
  update public.customer_business_relationships set loyalty_level=case when relationship_count >= 10 then 'elite' when relationship_count >= 5 then 'vip' when relationship_count >= 3 then 'regular' else 'new' end where business_id=bill_row.business_id and customer_id=bill_row.customer_id;
  insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id) values
    (bill_row.customer_id,'payment_success','Payment successful','Your ₹' || bill_row.final_amount || ' payment was verified.',bill_row.business_id,'bill',bill_row.id),
    (bill_row.customer_id,'fe_coins_earned','FE Coins earned','You earned ' || customer_reward || ' FE Coins.',bill_row.business_id,'bill',bill_row.id),
    (owner_user_id,'payment_success','Payment received','A customer payment of ₹' || bill_row.final_amount || ' was verified.',bill_row.business_id,'bill',bill_row.id);
  return bill_row;
end $$;

alter table public.business_reward_settings enable row level security; alter table public.bill_requests enable row level security; alter table public.bills enable row level security; alter table public.fe_coin_accounts enable row level security; alter table public.fe_coin_transactions enable row level security; alter table public.customer_business_relationships enable row level security;
create policy reward_settings_read on public.business_reward_settings for select to anon,authenticated using(public.is_public_business(business_id) or public.owns_business(business_id) or public.is_admin());
create policy reward_settings_owner_write on public.business_reward_settings for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy bill_requests_customer_read on public.bill_requests for select to authenticated using(customer_id=auth.uid() or public.owns_business(business_id) or public.is_admin());
create policy bills_private_read on public.bills for select to authenticated using(customer_id=auth.uid() or public.owns_business(business_id) or public.is_admin());
create policy coin_accounts_private_read on public.fe_coin_accounts for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy coin_transactions_private_read on public.fe_coin_transactions for select to authenticated using(exists(select 1 from public.fe_coin_accounts a where a.id=account_id and (a.user_id=auth.uid() or public.is_admin())));
create policy relationships_participant_read on public.customer_business_relationships for select to authenticated using(customer_id=auth.uid() or public.owns_business(business_id) or public.is_admin());

revoke all on public.bill_requests, public.bills, public.fe_coin_accounts, public.fe_coin_transactions, public.customer_business_relationships from anon,authenticated;
grant select on public.bill_requests, public.bills, public.fe_coin_accounts, public.fe_coin_transactions, public.customer_business_relationships to authenticated;
grant select,insert,update,delete on public.business_reward_settings to authenticated;
revoke all on function public.request_bill(uuid), public.owner_create_bill(uuid,numeric,text,text,text,numeric), public.verify_bill_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.request_bill(uuid), public.owner_create_bill(uuid,numeric,text,text,text,numeric) to authenticated;
grant execute on function public.verify_bill_payment(uuid,text) to service_role;

do $$ begin
  alter publication supabase_realtime add table public.bill_requests;
  alter publication supabase_realtime add table public.bills;
exception when duplicate_object then null; end $$;
commit;
