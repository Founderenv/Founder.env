begin;

-- Customer avatars reuse the established user/{auth.uid()} storage convention.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('customer-avatars','customer-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy customer_avatars_public_read on storage.objects for select to anon,authenticated
using(bucket_id='customer-avatars');
create policy customer_avatars_own_insert on storage.objects for insert to authenticated
with check(bucket_id='customer-avatars' and public.is_own_user_path(name));
create policy customer_avatars_own_update on storage.objects for update to authenticated
using(bucket_id='customer-avatars' and public.is_own_user_path(name))
with check(bucket_id='customer-avatars' and public.is_own_user_path(name));
create policy customer_avatars_own_delete on storage.objects for delete to authenticated
using(bucket_id='customer-avatars' and public.is_own_user_path(name));

create or replace function public.validate_customer_avatar_path()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null
     and new.avatar_url !~ ('^user/' || new.id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$') then
    raise exception 'invalid customer avatar path' using errcode='22023';
  end if;
  return new;
end; $$;
create trigger validate_customer_avatar_path before update of avatar_url on public.profiles
for each row execute function public.validate_customer_avatar_path();

create table public.customer_referral_profiles (
  customer_id uuid primary key references public.profiles(id) on delete cascade,
  referral_code extensions.citext not null unique,
  payout_upi text not null,
  payee_name text,
  enrolled_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  check(referral_code ~ '^FE-[A-Z0-9]{2,10}-[A-Z0-9]{6}$'),
  check(payout_upi ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,255}@[A-Za-z][A-Za-z0-9.-]{1,63}$'),
  check(payee_name is null or char_length(payee_name) between 1 and 80)
);

create table public.business_owner_referrals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete restrict,
  referrer_customer_id uuid not null references public.customer_referral_profiles(customer_id) on delete restrict,
  referral_code extensions.citext not null,
  status text not null default 'applied' check(status in ('applied','payment_pending','verified','reward_earned','cancelled','reversed')),
  applied_at timestamptz not null default timezone('utc',now()),
  locked_at timestamptz,
  verified_at timestamptz,
  provider_setup_payment_id text,
  updated_at timestamptz not null default timezone('utc',now()),
  unique(business_id,referrer_customer_id)
);

create table public.referral_payout_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_referral_profiles(customer_id) on delete restrict,
  amount_paise integer not null default 15000 check(amount_paise=15000),
  destination_upi_snapshot text not null,
  payee_name_snapshot text,
  status text not null default 'pending' check(status in ('pending','needs_review','paid','rejected')),
  requested_at timestamptz not null default timezone('utc',now()),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  operator_note text,
  paid_at timestamptz,
  updated_at timestamptz not null default timezone('utc',now())
);

create table public.referral_earnings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete restrict,
  referrer_customer_id uuid not null references public.customer_referral_profiles(customer_id) on delete restrict,
  referral_id uuid not null unique references public.business_owner_referrals(id) on delete restrict,
  amount_paise integer not null default 2500 check(amount_paise=2500),
  source text not null default 'verified_business_setup' check(source='verified_business_setup'),
  provider_setup_payment_id text not null unique,
  earned_at timestamptz not null default timezone('utc',now()),
  payout_status text not null default 'available' check(payout_status in ('available','reserved','paid','reversed')),
  payout_request_id uuid references public.referral_payout_requests(id) on delete restrict
);

create index business_owner_referrals_referrer_idx on public.business_owner_referrals(referrer_customer_id,applied_at desc);
create index referral_earnings_customer_idx on public.referral_earnings(referrer_customer_id,earned_at desc);
create index referral_payout_customer_idx on public.referral_payout_requests(customer_id,requested_at desc);

alter table public.customer_referral_profiles enable row level security;
alter table public.business_owner_referrals enable row level security;
alter table public.referral_earnings enable row level security;
alter table public.referral_payout_requests enable row level security;

create policy customer_referral_profile_own_read on public.customer_referral_profiles for select to authenticated
using(customer_id=auth.uid() or public.is_admin());
create policy business_referral_participant_read on public.business_owner_referrals for select to authenticated
using(referrer_customer_id=auth.uid() or public.owns_business(business_id) or public.is_admin());
create policy referral_earnings_own_read on public.referral_earnings for select to authenticated
using(referrer_customer_id=auth.uid() or public.is_admin());
create policy referral_payout_own_read on public.referral_payout_requests for select to authenticated
using(customer_id=auth.uid() or public.is_admin());

revoke all on public.customer_referral_profiles,public.business_owner_referrals,public.referral_earnings,public.referral_payout_requests from anon,authenticated;
grant select on public.customer_referral_profiles,public.business_owner_referrals,public.referral_earnings,public.referral_payout_requests to authenticated;

create or replace function public.enroll_customer_referral(target_upi text,target_payee_name text default null)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare result public.customer_referral_profiles; prefix text; candidate text; attempt integer:=0;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='customer' and status='active') then
    raise exception 'active customer account required' using errcode='42501';
  end if;
  target_upi:=lower(trim(target_upi)); target_payee_name:=nullif(trim(target_payee_name),'');
  if target_upi !~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,255}@[A-Za-z][A-Za-z0-9.-]{1,63}$' then raise exception 'invalid UPI ID' using errcode='22023'; end if;
  select * into result from public.customer_referral_profiles where customer_id=auth.uid() for update;
  if found then
    update public.customer_referral_profiles set payout_upi=target_upi,payee_name=target_payee_name,updated_at=timezone('utc',now())
    where customer_id=auth.uid() returning * into result;
  else
    select upper(left(regexp_replace(coalesce(display_name,'USER'),'[^A-Za-z0-9]','','g'),10)) into prefix from public.profiles where id=auth.uid();
    if char_length(prefix)<2 then prefix:='USER'; end if;
    loop
      attempt:=attempt+1;
      candidate:='FE-'||prefix||'-'||upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,6));
      begin
        insert into public.customer_referral_profiles(customer_id,referral_code,payout_upi,payee_name)
        values(auth.uid(),candidate,target_upi,target_payee_name) returning * into result;
        exit;
      exception when unique_violation then if attempt>=8 then raise; end if;
      end;
    end loop;
  end if;
  return jsonb_build_object('customerId',result.customer_id,'referralCode',result.referral_code,'payoutUpi',result.payout_upi,'payeeName',result.payee_name);
end; $$;

create or replace function public.apply_business_referral(target_business_id uuid,target_referral_code text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare ref_profile public.customer_referral_profiles; existing public.business_owner_referrals; business_name text; owner_email text; ref_email text;
begin
  if not public.owns_business(target_business_id) then raise exception 'business ownership required' using errcode='42501'; end if;
  if exists(select 1 from public.subscriptions where business_id=target_business_id and setup_fee_paid) or exists(select 1 from public.businesses where id=target_business_id and is_active) then
    raise exception 'referral is locked after verified setup payment' using errcode='55000';
  end if;
  select * into existing from public.business_owner_referrals where business_id=target_business_id for update;
  if existing.locked_at is not null then raise exception 'referral is locked' using errcode='55000'; end if;
  if nullif(trim(target_referral_code),'') is null then
    delete from public.business_owner_referrals where business_id=target_business_id;
    return jsonb_build_object('applied',false);
  end if;
  select * into ref_profile from public.customer_referral_profiles where referral_code=upper(trim(target_referral_code));
  if not found then raise exception 'Invalid referral code.' using errcode='22023'; end if;
  if ref_profile.customer_id=auth.uid() then raise exception 'self-referral is not allowed' using errcode='22023'; end if;
  select lower(coalesce(email_private,'')) into owner_email from public.profiles where id=auth.uid();
  select lower(coalesce(email_private,'')) into ref_email from public.profiles where id=ref_profile.customer_id;
  if owner_email<>'' and owner_email=ref_email then raise exception 'self-referral is not allowed' using errcode='22023'; end if;
  select name into business_name from public.businesses where id=target_business_id;
  insert into public.business_owner_referrals(business_id,referrer_customer_id,referral_code,status)
  values(target_business_id,ref_profile.customer_id,ref_profile.referral_code,'payment_pending')
  on conflict(business_id) do update set referrer_customer_id=excluded.referrer_customer_id,referral_code=excluded.referral_code,status='payment_pending',applied_at=timezone('utc',now()),updated_at=timezone('utc',now())
  returning * into existing;
  insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id)
  values(ref_profile.customer_id,'referral','Referral applied',business_name||' used your referral code.',target_business_id,'business_referral',existing.id);
  return jsonb_build_object('applied',true,'message','Referral code applied');
end; $$;

create or replace function public.issue_verified_business_referral_reward()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare referral public.business_owner_referrals; setup_payment text; inserted_id uuid; available_before integer; available_after integer;
begin
  if not new.is_active or new.lifecycle<>'active' then return new; end if;
  select s.setup_payment_id into setup_payment from public.subscriptions s
  where s.business_id=new.id and s.activation_type='razorpay' and s.setup_fee_paid and s.setup_fee_amount_paise=29900 and s.setup_payment_id is not null;
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
create trigger issue_verified_business_referral_reward after update of is_active,lifecycle on public.businesses
for each row when(new.is_active and new.lifecycle='active') execute function public.issue_verified_business_referral_reward();

create or replace function public.get_customer_referral_dashboard()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; profile public.customer_referral_profiles; earned integer; available integer; reserved integer; verified integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into profile from public.customer_referral_profiles where customer_id=auth.uid();
  if not found then return jsonb_build_object('enrolled',false); end if;
  select coalesce(sum(amount_paise),0)::integer,coalesce(sum(amount_paise) filter(where payout_status='available'),0)::integer,coalesce(sum(amount_paise) filter(where payout_status='reserved'),0)::integer,count(*)::integer
  into earned,available,reserved,verified from public.referral_earnings where referrer_customer_id=auth.uid() and payout_status<>'reversed';
  select jsonb_build_object('enrolled',true,'referralCode',profile.referral_code,'payoutUpi',profile.payout_upi,'payeeName',profile.payee_name,'earnedPaise',earned,'availablePaise',available,'reservedPaise',reserved,'verifiedBusinesses',verified,
    'recentReferrals',coalesce((select jsonb_agg(x order by x.applied_at desc) from (select r.id,r.status,r.applied_at,b.name as business_name from public.business_owner_referrals r join public.businesses b on b.id=r.business_id where r.referrer_customer_id=auth.uid() order by r.applied_at desc limit 10)x),'[]'::jsonb),
    'payoutRequests',coalesce((select jsonb_agg(x order by x.requested_at desc) from (select id,amount_paise,status,requested_at,paid_at from public.referral_payout_requests where customer_id=auth.uid() order by requested_at desc limit 10)x),'[]'::jsonb)) into result;
  return result;
end; $$;

create or replace function public.request_referral_payout()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare profile public.customer_referral_profiles; payout public.referral_payout_requests; selected_count integer;
begin
  select * into profile from public.customer_referral_profiles where customer_id=auth.uid() for update;
  if not found then raise exception 'referral enrollment required' using errcode='42501'; end if;
  with chosen as (select id from public.referral_earnings where referrer_customer_id=auth.uid() and payout_status='available' order by earned_at,id for update limit 6)
  select count(*) into selected_count from chosen;
  if selected_count<6 then raise exception '₹150 available balance required' using errcode='22023'; end if;
  insert into public.referral_payout_requests(customer_id,destination_upi_snapshot,payee_name_snapshot)
  values(auth.uid(),profile.payout_upi,profile.payee_name) returning * into payout;
  with chosen as (select id from public.referral_earnings where referrer_customer_id=auth.uid() and payout_status='available' order by earned_at,id for update limit 6)
  update public.referral_earnings set payout_status='reserved',payout_request_id=payout.id where id in(select id from chosen);
  insert into public.notifications(recipient_user_id,type,title,body,entity_type,entity_id,source_event_id)
  values(auth.uid(),'referral','Payout requested','Your ₹150 payout request has been submitted.','referral_payout',payout.id,'referral-payout-requested:'||payout.id::text);
  return jsonb_build_object('id',payout.id,'amountPaise',payout.amount_paise,'status',payout.status,'requestedAt',payout.requested_at);
end; $$;

create or replace function public.admin_update_referral_payout(target_payout_id uuid,target_status text,target_note text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare payout public.referral_payout_requests;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  if target_status not in('paid','rejected','needs_review') then raise exception 'unsupported payout status' using errcode='22023'; end if;
  select * into payout from public.referral_payout_requests where id=target_payout_id for update;
  if not found then raise exception 'payout not found' using errcode='P0002'; end if;
  if payout.status in('paid','rejected') then raise exception 'payout already finalized' using errcode='55000'; end if;
  update public.referral_payout_requests set status=target_status,operator_note=nullif(trim(target_note),''),reviewed_at=timezone('utc',now()),reviewed_by=auth.uid(),paid_at=case when target_status='paid' then timezone('utc',now()) else null end,updated_at=timezone('utc',now()) where id=target_payout_id returning * into payout;
  if target_status='paid' then
    update public.referral_earnings set payout_status='paid' where payout_request_id=target_payout_id and payout_status='reserved';
    insert into public.notifications(recipient_user_id,type,title,body,entity_type,entity_id,source_event_id)
    values(payout.customer_id,'referral','Payout paid','Your ₹150 referral payout has been completed.','referral_payout',payout.id,'referral-payout-paid:'||payout.id::text);
  elsif target_status='rejected' then
    update public.referral_earnings set payout_status='available',payout_request_id=null where payout_request_id=target_payout_id and payout_status='reserved';
  end if;
  insert into public.admin_audit_logs(admin_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'referral_payout_'||target_status,'referral_payout',payout.id,jsonb_build_object('note',target_note,'amount_paise',payout.amount_paise));
  return jsonb_build_object('id',payout.id,'status',payout.status,'paidAt',payout.paid_at);
end; $$;

revoke all on function public.enroll_customer_referral(text,text),public.apply_business_referral(uuid,text),public.get_customer_referral_dashboard(),public.request_referral_payout(),public.admin_update_referral_payout(uuid,text,text) from public,anon;
grant execute on function public.enroll_customer_referral(text,text),public.apply_business_referral(uuid,text),public.get_customer_referral_dashboard(),public.request_referral_payout(),public.admin_update_referral_payout(uuid,text,text) to authenticated;
revoke all on function public.issue_verified_business_referral_reward() from public,anon,authenticated;

commit;
