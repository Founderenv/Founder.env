-- Founder.env pilot: merchant-funded benefits, direct-to-merchant UPI attempts,
-- merchant confirmation and atomic FE settlement. No Founder.env money movement.
begin;

alter table public.business_reward_settings
  alter column member_discount_value set default 5,
  alter column maximum_discount set default 150,
  alter column minimum_bill set default 1000,
  alter column max_fe_coin_redemption_percent set default 2,
  alter column customer_coin_rate set default 0.01,
  alter column merchant_coin_rate set default 0.005;

-- Repair untouched zero-value pilot rows and provide defaults to participating businesses.
update public.business_reward_settings set
  member_discount_type='percentage', member_discount_value=5, maximum_discount=150,
  minimum_bill=1000, max_fe_coin_redemption_percent=2,
  customer_coin_rate=0.01, merchant_coin_rate=0.005, enabled=true, updated_at=now()
where member_discount_value=0 and coalesce(maximum_discount,0)=0 and minimum_bill=0
  and max_fe_coin_redemption_percent=0;
insert into public.business_reward_settings(
  business_id,member_discount_type,member_discount_value,maximum_discount,minimum_bill,
  max_fe_coin_redemption_percent,customer_coin_rate,merchant_coin_rate,enabled
)
select id,'percentage',5,150,1000,2,0.01,0.005,true from public.businesses
where status='active' on conflict(business_id) do nothing;

create table public.merchant_payment_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  merchant_upi text not null check (merchant_upi ~* '^[a-z0-9._-]{2,256}@[a-z0-9.-]{2,64}$'),
  payee_name text not null check (char_length(btrim(payee_name)) between 2 and 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.merchant_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  customer_display_name text not null,
  original_amount numeric(12,2) not null check(original_amount>0),
  founder_benefit numeric(12,2) not null check(founder_benefit>=0),
  fe_discount numeric(12,2) not null check(fe_discount>=0),
  expected_final_amount numeric(12,2) not null check(expected_final_amount>=0),
  merchant_upi text not null,
  payee_name text not null,
  unique_reference text not null unique,
  status text not null default 'initiated' check(status in ('initiated','awaiting_confirmation','verified','not_received','failed')),
  confirmed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), confirmed_at timestamptz,
  unique(bill_id,unique_reference)
);
create index merchant_payment_attempts_customer_created_idx on public.merchant_payment_attempts(customer_id,created_at desc);
create index merchant_payment_attempts_business_status_idx on public.merchant_payment_attempts(business_id,status,created_at desc);

alter table public.merchant_payment_settings enable row level security;
alter table public.merchant_payment_attempts enable row level security;
create policy merchant_payment_settings_owner_select on public.merchant_payment_settings for select to authenticated
  using(public.owns_business(business_id) or public.is_admin());
create policy merchant_payment_attempts_participant_select on public.merchant_payment_attempts for select to authenticated
  using(customer_id=(select auth.uid()) or public.owns_business(business_id) or public.is_admin());
revoke all on public.merchant_payment_settings,public.merchant_payment_attempts from anon,authenticated;
grant select on public.merchant_payment_settings,public.merchant_payment_attempts to authenticated;
revoke insert,update,delete on public.business_reward_settings from authenticated;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check(type in (
  'new_follower','new_review','review_reply','new_message','new_deal','new_story','reward','referral','subscription',
  'bill_requested','bill_ready','payment_confirmation_request','payment_success','payment_not_received',
  'fe_coins_earned','reward_unlocked'
));

create or replace function public.save_founder_benefit_settings(
  target_business_id uuid,target_enabled boolean,target_percentage numeric,target_minimum numeric,
  target_maximum numeric,target_redemption_percent numeric,target_customer_rate numeric,target_business_rate numeric
) returns public.business_reward_settings language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.business_reward_settings;
begin
  if not public.owns_business(target_business_id) then raise exception 'business ownership required' using errcode='42501'; end if;
  if target_percentage<0 or target_percentage>100 or target_minimum<0 or target_maximum<0
    or target_redemption_percent<0 or target_redemption_percent>100 or target_customer_rate<0 or target_business_rate<0 then
    raise exception 'invalid benefit settings' using errcode='22023';
  end if;
  insert into public.business_reward_settings(business_id,member_discount_type,member_discount_value,minimum_bill,maximum_discount,max_fe_coin_redemption_percent,customer_coin_rate,merchant_coin_rate,enabled)
  values(target_business_id,'percentage',target_percentage,target_minimum,target_maximum,target_redemption_percent,target_customer_rate,target_business_rate,target_enabled)
  on conflict(business_id) do update set member_discount_type='percentage',member_discount_value=excluded.member_discount_value,
    minimum_bill=excluded.minimum_bill,maximum_discount=excluded.maximum_discount,max_fe_coin_redemption_percent=excluded.max_fe_coin_redemption_percent,
    customer_coin_rate=excluded.customer_coin_rate,merchant_coin_rate=excluded.merchant_coin_rate,enabled=excluded.enabled,updated_at=now()
  returning * into result; return result;
end $$;

create or replace function public.save_merchant_upi_settings(target_business_id uuid,target_upi text,target_payee_name text)
returns public.merchant_payment_settings language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.merchant_payment_settings; clean_upi text:=lower(btrim(target_upi)); clean_name text:=btrim(target_payee_name);
begin
  if not public.owns_business(target_business_id) then raise exception 'business ownership required' using errcode='42501'; end if;
  if clean_upi !~ '^[a-z0-9._-]{2,256}@[a-z0-9.-]{2,64}$' then raise exception 'invalid merchant UPI ID' using errcode='22023'; end if;
  if char_length(clean_name) not between 2 and 100 then raise exception 'invalid payee name' using errcode='22023'; end if;
  insert into public.merchant_payment_settings(business_id,merchant_upi,payee_name,enabled) values(target_business_id,clean_upi,clean_name,true)
  on conflict(business_id) do update set merchant_upi=excluded.merchant_upi,payee_name=excluded.payee_name,enabled=true,updated_at=now()
  returning * into result; return result;
end $$;

-- Owner supplies only the legitimate original amount. Eligible FE is selected by the server.
create or replace function public.owner_create_bill(target_request_id uuid,amount numeric,bill_description text default null,invoice_ref text default null,bill_note text default null,requested_coin_discount numeric default 0)
returns public.bills language plpgsql security definer set search_path=public,pg_temp as $$
declare req public.bill_requests; settings public.business_reward_settings; bill_row public.bills; customer_account public.fe_coin_accounts;
  member_amount numeric(12,2):=0; coin_amount numeric(12,2):=0; max_coin numeric(12,2):=0;
begin
  if amount is null or amount<=0 then raise exception 'bill amount must be greater than zero'; end if;
  select * into req from public.bill_requests where id=target_request_id for update;
  if req.id is null or req.status<>'pending' then raise exception 'pending bill request not found' using errcode='P0002'; end if;
  if not public.owns_business(req.business_id) then raise exception 'business ownership required' using errcode='42501'; end if;
  insert into public.business_reward_settings(business_id) values(req.business_id) on conflict do nothing;
  select * into settings from public.business_reward_settings where business_id=req.business_id;
  if settings.enabled and amount>=settings.minimum_bill then
    member_amount:=case when settings.member_discount_type='percentage' then round(amount*settings.member_discount_value/100,2) else settings.member_discount_value end;
    if settings.maximum_discount is not null then member_amount:=least(member_amount,settings.maximum_discount); end if;
  end if;
  customer_account:=public.v2_customer_account(req.customer_id);
  max_coin:=round(amount*settings.max_fe_coin_redemption_percent/100,2);
  coin_amount:=least(max_coin,customer_account.balance,greatest(amount-member_amount,0));
  insert into public.bills(business_id,customer_id,bill_request_id,original_amount,member_discount,fe_coin_discount,final_amount,description,invoice_number,note,created_by)
  values(req.business_id,req.customer_id,req.id,amount,member_amount,coin_amount,amount-member_amount-coin_amount,bill_description,invoice_ref,bill_note,auth.uid()) returning * into bill_row;
  update public.bill_requests set status='accepted',handled_at=now(),created_bill_id=bill_row.id where id=req.id;
  insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id)
  values(req.customer_id,'bill_ready','Your bill is ready','A Founder.env bill of ₹'||bill_row.final_amount||' is ready.',req.business_id,'bill',bill_row.id);
  return bill_row;
end $$;

create or replace function public.get_merchant_payment_readiness(target_bill_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare target_bill public.bills; settings public.merchant_payment_settings;
begin
  select * into target_bill from public.bills where id=target_bill_id;
  if target_bill.id is null or not(target_bill.customer_id=auth.uid() or public.owns_business(target_bill.business_id)) then raise exception 'bill access denied' using errcode='42501'; end if;
  select * into settings from public.merchant_payment_settings where business_id=target_bill.business_id and enabled;
  return jsonb_build_object('available',settings.business_id is not null,'payeeName',coalesce(settings.payee_name,''));
end $$;

create or replace function public.initiate_merchant_payment(target_bill_id uuid) returns public.merchant_payment_attempts
language plpgsql security definer set search_path=public,pg_temp as $$
declare target_bill public.bills; settings public.merchant_payment_settings; account public.fe_coin_accounts; reserved numeric(14,2); result public.merchant_payment_attempts; customer_name text;
begin
  if not public.is_customer() then raise exception 'customer account required' using errcode='42501'; end if;
  select * into target_bill from public.bills where id=target_bill_id and customer_id=auth.uid() for update;
  if target_bill.id is null then raise exception 'bill not found' using errcode='P0002'; end if;
  if target_bill.status='paid' or target_bill.payment_status='paid' then raise exception 'bill already paid'; end if;
  if target_bill.status='cancelled' then raise exception 'cancelled bill cannot be paid'; end if;
  select * into result from public.merchant_payment_attempts where bill_id=target_bill.id and status in('initiated','awaiting_confirmation') order by created_at desc limit 1;
  if result.id is not null then return result; end if;
  select * into settings from public.merchant_payment_settings where business_id=target_bill.business_id and enabled;
  if settings.business_id is null then raise exception 'merchant_upi_not_configured' using errcode='P0001'; end if;
  account:=public.v2_customer_account(auth.uid()); select * into account from public.fe_coin_accounts where id=account.id for update;
  select coalesce(sum(fe_discount),0) into reserved from public.merchant_payment_attempts where customer_id=auth.uid() and status in('initiated','awaiting_confirmation');
  if target_bill.fe_coin_discount>greatest(account.balance-reserved,0) then raise exception 'FE balance is reserved by another payment' using errcode='P0001'; end if;
  select coalesce(nullif(display_name,''),'Founder.env customer') into customer_name from public.profiles where id=auth.uid();
  insert into public.merchant_payment_attempts(bill_id,customer_id,business_id,customer_display_name,original_amount,founder_benefit,fe_discount,expected_final_amount,merchant_upi,payee_name,unique_reference)
  values(target_bill.id,auth.uid(),target_bill.business_id,customer_name,target_bill.original_amount,target_bill.member_discount,target_bill.fe_coin_discount,target_bill.final_amount,settings.merchant_upi,settings.payee_name,
    'FE-'||upper(substr(replace(target_bill.id::text,'-',''),1,8))||'-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,12))) returning * into result;
  return result;
end $$;

create or replace function public.mark_merchant_payment_awaiting(target_attempt_id uuid) returns public.merchant_payment_attempts
language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.merchant_payment_attempts; owner_id uuid;
begin
  update public.merchant_payment_attempts set status='awaiting_confirmation',updated_at=now()
  where id=target_attempt_id and customer_id=auth.uid() and status='initiated' returning * into result;
  if result.id is null then select * into result from public.merchant_payment_attempts where id=target_attempt_id and customer_id=auth.uid() and status='awaiting_confirmation'; end if;
  if result.id is null then raise exception 'payment attempt not found' using errcode='42501'; end if;
  update public.bills set payment_status='processing' where id=result.bill_id and payment_status='pending';
  select b.owner_id into owner_id from public.businesses b where b.id=result.business_id;
  if not exists(select 1 from public.notifications where recipient_user_id=owner_id and type='payment_confirmation_request' and entity_id=result.id) then
    insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id)
    values(owner_id,'payment_confirmation_request','Payment confirmation request',result.customer_display_name||' may have paid ₹'||result.expected_final_amount||'. Reference '||result.unique_reference,result.business_id,'payment_attempt',result.id);
  end if; return result;
end $$;

create or replace function public.owner_confirm_merchant_payment(target_attempt_id uuid) returns public.merchant_payment_attempts
language plpgsql security definer set search_path=public,pg_temp as $$
declare attempt public.merchant_payment_attempts; target_bill public.bills; settings public.business_reward_settings; customer_account public.fe_coin_accounts; business_account public.fe_coin_accounts; merchant_owner_id uuid; customer_reward numeric(14,2); business_reward numeric(14,2); relationship_count integer;
begin
  select * into attempt from public.merchant_payment_attempts where id=target_attempt_id for update;
  if attempt.id is null or not public.owns_business(attempt.business_id) then raise exception 'payment ownership required' using errcode='42501'; end if;
  if attempt.status='verified' then return attempt; end if;
  if attempt.status<>'awaiting_confirmation' then raise exception 'payment is not awaiting confirmation'; end if;
  select * into target_bill from public.bills where id=attempt.bill_id for update;
  if target_bill.id is null or target_bill.business_id<>attempt.business_id or target_bill.customer_id<>attempt.customer_id
    or target_bill.original_amount<>attempt.original_amount or target_bill.member_discount<>attempt.founder_benefit
    or target_bill.fe_coin_discount<>attempt.fe_discount or target_bill.final_amount<>attempt.expected_final_amount then raise exception 'trusted bill amount mismatch' using errcode='42501'; end if;
  customer_account:=public.v2_customer_account(target_bill.customer_id); select * into customer_account from public.fe_coin_accounts where id=customer_account.id for update;
  if customer_account.balance<target_bill.fe_coin_discount then raise exception 'customer FE balance no longer available'; end if;
  select * into settings from public.business_reward_settings where business_id=target_bill.business_id;
  customer_reward:=round(target_bill.original_amount*coalesce(settings.customer_coin_rate,0),2);
  business_reward:=round(target_bill.original_amount*coalesce(settings.merchant_coin_rate,0),2);
  select b.owner_id into merchant_owner_id from public.businesses b where b.id=target_bill.business_id;
  insert into public.fe_coin_accounts(user_id,business_id,account_type) values(merchant_owner_id,target_bill.business_id,'business') on conflict do nothing;
  select * into business_account from public.fe_coin_accounts where user_id=merchant_owner_id and business_id=target_bill.business_id and account_type='business' for update;
  if target_bill.fe_coin_discount>0 then insert into public.fe_coin_transactions(account_id,bill_id,type,amount,description) values(customer_account.id,target_bill.id,'redeem',-target_bill.fe_coin_discount,'FE Coins redeemed at participating business') on conflict do nothing; end if;
  if customer_reward>0 then insert into public.fe_coin_transactions(account_id,bill_id,type,amount,description) values(customer_account.id,target_bill.id,'earn',customer_reward,'FE Coins earned from verified original spend') on conflict do nothing; end if;
  if business_reward>0 then insert into public.fe_coin_transactions(account_id,bill_id,type,amount,description) values(business_account.id,target_bill.id,'earn',business_reward,'Business FE earned from verified original spend') on conflict do nothing; end if;
  update public.fe_coin_accounts a set balance=(select coalesce(sum(t.amount),0) from public.fe_coin_transactions t where t.account_id=a.id),updated_at=now() where a.id in(customer_account.id,business_account.id);
  update public.bills set payment_status='paid',status='paid',payment_reference=attempt.unique_reference,paid_at=now() where id=target_bill.id;
  update public.bill_requests set status='completed',handled_at=now() where id=target_bill.bill_request_id;
  insert into public.customer_business_relationships(business_id,customer_id,paid_bill_count,total_spend,total_savings,fe_coins_earned,last_purchase_at,loyalty_level)
  values(target_bill.business_id,target_bill.customer_id,1,target_bill.final_amount,target_bill.member_discount+target_bill.fe_coin_discount,customer_reward,now(),'new')
  on conflict(business_id,customer_id) do update set paid_bill_count=customer_business_relationships.paid_bill_count+1,total_spend=customer_business_relationships.total_spend+excluded.total_spend,total_savings=customer_business_relationships.total_savings+excluded.total_savings,fe_coins_earned=customer_business_relationships.fe_coins_earned+excluded.fe_coins_earned,last_purchase_at=excluded.last_purchase_at,updated_at=now();
  select paid_bill_count into relationship_count from public.customer_business_relationships where business_id=target_bill.business_id and customer_id=target_bill.customer_id;
  update public.customer_business_relationships set loyalty_level=case when relationship_count>=10 then'elite' when relationship_count>=5 then'vip' when relationship_count>=3 then'regular' else'new' end where business_id=target_bill.business_id and customer_id=target_bill.customer_id;
  update public.merchant_payment_attempts set status='verified',confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now() where id=attempt.id returning * into attempt;
  insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id) values
    (target_bill.customer_id,'payment_success','Payment Confirmed ✓','Paid ₹'||target_bill.final_amount||'. You saved ₹'||(target_bill.member_discount+target_bill.fe_coin_discount)||' and earned '||customer_reward||' FE.',target_bill.business_id,'bill',target_bill.id),
    (target_bill.customer_id,'fe_coins_earned','FE Coins earned','+'||customer_reward||' FE is ready for a future participating business.',target_bill.business_id,'bill',target_bill.id);
  return attempt;
end $$;

create or replace function public.owner_reject_merchant_payment(target_attempt_id uuid) returns public.merchant_payment_attempts
language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.merchant_payment_attempts;
begin
  update public.merchant_payment_attempts set status='not_received',confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
  where id=target_attempt_id and status='awaiting_confirmation' and public.owns_business(business_id) returning * into result;
  if result.id is null then raise exception 'payment attempt not found or not permitted' using errcode='42501'; end if;
  update public.bills set payment_status='pending' where id=result.bill_id and status<>'paid';
  insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id)
  values(result.customer_id,'payment_not_received','Payment not received','The merchant could not confirm '||result.unique_reference||'. You can retry safely.',result.business_id,'bill',result.bill_id);
  return result;
end $$;

revoke all on function public.save_founder_benefit_settings(uuid,boolean,numeric,numeric,numeric,numeric,numeric,numeric),public.save_merchant_upi_settings(uuid,text,text),public.get_merchant_payment_readiness(uuid),public.initiate_merchant_payment(uuid),public.mark_merchant_payment_awaiting(uuid),public.owner_confirm_merchant_payment(uuid),public.owner_reject_merchant_payment(uuid) from public,anon,authenticated;
grant execute on function public.save_founder_benefit_settings(uuid,boolean,numeric,numeric,numeric,numeric,numeric,numeric),public.save_merchant_upi_settings(uuid,text,text),public.get_merchant_payment_readiness(uuid),public.initiate_merchant_payment(uuid),public.mark_merchant_payment_awaiting(uuid),public.owner_confirm_merchant_payment(uuid),public.owner_reject_merchant_payment(uuid) to authenticated;

do $$ begin alter publication supabase_realtime add table public.merchant_payment_attempts; exception when duplicate_object then null; end $$;
commit;
