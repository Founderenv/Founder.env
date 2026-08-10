begin;

create or replace function public.claim_deal(target_deal_id uuid)
returns public.deal_claims language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare target public.deals; result public.deal_claims; claim_total bigint;
begin
  if auth.uid() is null or not public.is_customer() then raise exception 'customer authentication required' using errcode = '42501'; end if;
  select * into target from public.deals where id = target_deal_id for update;
  if target.id is null or target.status <> 'published' or now() not between target.starts_at and target.ends_at then
    raise exception 'deal unavailable' using errcode = 'P0002';
  end if;
  select count(*) into claim_total from public.deal_claims where deal_id = target.id and status in ('claimed','redeemed');
  if target.max_claims is not null and claim_total >= target.max_claims then raise exception 'claim limit reached' using errcode = '23514'; end if;
  insert into public.deal_claims(deal_id, customer_id) values(target.id, auth.uid())
  on conflict(deal_id, customer_id) do update set deal_id = excluded.deal_id returning * into result;
  return result;
end;
$$;
revoke all on function public.claim_deal(uuid) from public;
grant execute on function public.claim_deal(uuid) to authenticated;

create or replace function public.play_scratch(target_campaign_id uuid, target_eligibility_key text, target_customer_id uuid)
returns public.scratch_plays language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare campaign public.scratch_campaigns; chosen jsonb; total_weight numeric; ticket numeric; result public.scratch_plays; reward_id uuid; reward_campaign uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'server authorization required' using errcode = '42501'; end if;
  if not public.is_customer(target_customer_id) then raise exception 'eligible customer required' using errcode = '42501'; end if;
  if target_eligibility_key is null or char_length(target_eligibility_key) < 8 then raise exception 'invalid eligibility key' using errcode = '22023'; end if;
  select * into campaign from public.scratch_campaigns where id = target_campaign_id for update;
  if campaign.id is null or campaign.status <> 'published' or now() not between campaign.starts_at and campaign.ends_at then raise exception 'campaign unavailable' using errcode = 'P0002'; end if;
  if campaign.max_plays is not null and (select count(*) from public.scratch_plays where campaign_id = campaign.id) >= campaign.max_plays then raise exception 'campaign play limit reached' using errcode = '23514'; end if;
  if exists(select 1 from public.scratch_plays where campaign_id = campaign.id and customer_id = target_customer_id and eligibility_key = target_eligibility_key) then raise exception 'eligible event already scratched' using errcode = '23505'; end if;
  select sum(greatest(coalesce((value->>'weight')::numeric, 0), 0)) into total_weight from jsonb_array_elements(campaign.outcomes);
  if coalesce(total_weight, 0) <= 0 then raise exception 'campaign outcomes invalid' using errcode = '22023'; end if;
  ticket := random() * total_weight;
  with weighted as (
    select value, sum(greatest(coalesce((value->>'weight')::numeric, 0), 0)) over(order by ordinality) as ceiling
    from jsonb_array_elements(campaign.outcomes) with ordinality
  ) select value into chosen from weighted where ceiling >= ticket order by ceiling limit 1;
  if coalesce((chosen->>'is_win')::boolean, false) and chosen ? 'reward_campaign_id' then
    reward_campaign := (chosen->>'reward_campaign_id')::uuid;
    insert into public.reward_claims(campaign_id, customer_id)
    values(reward_campaign, target_customer_id) on conflict(campaign_id, customer_id) do nothing returning id into reward_id;
    if reward_id is null then select id into reward_id from public.reward_claims where campaign_id = reward_campaign and customer_id = target_customer_id; end if;
  end if;
  insert into public.scratch_plays(campaign_id, customer_id, eligibility_key, outcome_key, outcome_label, is_win, reward_claim_id)
  values(campaign.id, target_customer_id, target_eligibility_key, chosen->>'key', chosen->>'label', coalesce((chosen->>'is_win')::boolean, false), reward_id)
  returning * into result;
  return result;
end;
$$;
revoke all on function public.play_scratch(uuid, text, uuid) from public;
grant execute on function public.play_scratch(uuid, text, uuid) to service_role;

create or replace function public.create_referral(target_campaign_id uuid, target_referred_customer_id uuid default null)
returns public.referrals language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare campaign public.referral_campaigns; result public.referrals;
begin
  if auth.uid() is null or not public.is_customer() then raise exception 'customer authentication required' using errcode = '42501'; end if;
  if target_referred_customer_id = auth.uid() then raise exception 'self referral is not allowed' using errcode = '23514'; end if;
  select * into campaign from public.referral_campaigns where id = target_campaign_id and status = 'published' and now() between starts_at and ends_at;
  if campaign.id is null then raise exception 'campaign unavailable' using errcode = 'P0002'; end if;
  insert into public.referrals(business_id, campaign_id, referrer_customer_id, referred_customer_id, referral_code)
  values(campaign.business_id, campaign.id, auth.uid(), target_referred_customer_id, upper(encode(gen_random_bytes(6), 'hex')))
  returning * into result;
  return result;
end;
$$;
revoke all on function public.create_referral(uuid, uuid) from public;
grant execute on function public.create_referral(uuid, uuid) to authenticated;

create or replace function public.resolve_and_track_qr(target_code text, target_source text default 'qr', target_metadata jsonb default '{}'::jsonb)
returns table(business_id uuid, username text, scan_id uuid) language plpgsql security definer set search_path = public, pg_temp as $$
declare target_qr public.qr_codes; target_business public.businesses; new_scan uuid;
begin
  select * into target_qr from public.qr_codes where code = target_code;
  select * into target_business from public.businesses where id = target_qr.business_id and is_active and lifecycle in ('active','grace_period','lite');
  if target_business.id is null then return; end if;
  insert into public.qr_scans(qr_code_id, viewer_user_id, source, metadata)
  values(target_qr.id, auth.uid(), case when target_source in ('qr','shared','direct') then target_source else 'qr' end, coalesce(target_metadata, '{}'::jsonb) - 'email' - 'token')
  returning id into new_scan;
  insert into public.analytics_events(business_id, user_id, event_type, entity_id, metadata)
  values(target_business.id, auth.uid(), 'qr_scan', target_qr.id, jsonb_build_object('source', target_source));
  return query select target_business.id, target_business.username::text, new_scan;
end;
$$;
revoke all on function public.resolve_and_track_qr(text, text, jsonb) from public;
grant execute on function public.resolve_and_track_qr(text, text, jsonb) to anon, authenticated;

create or replace function public.admin_update_business(target_business_id uuid, target_action text, target_value text default null)
returns public.businesses language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.businesses;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if target_action = 'verify_business' then update public.businesses set is_verified = true where id = target_business_id returning * into result;
  elsif target_action = 'suspend_business' then update public.businesses set lifecycle = 'suspended', is_active = false where id = target_business_id returning * into result;
  elsif target_action = 'activate_business' then update public.businesses set lifecycle = 'active', is_active = true where id = target_business_id returning * into result;
  elsif target_action = 'change_plan' and target_value in ('lite','pro') then
    insert into public.subscriptions(business_id, plan, status, started_at) values(target_business_id, target_value::public.subscription_plan, 'active', now())
    on conflict(business_id) do update set plan = excluded.plan, status = excluded.status;
    select * into result from public.businesses where id = target_business_id;
  else raise exception 'unsupported admin action' using errcode = '22023'; end if;
  if result.id is null then select * into result from public.businesses where id = target_business_id; end if;
  insert into public.admin_audit_logs(admin_user_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), target_action, 'business', target_business_id, jsonb_build_object('value', target_value));
  return result;
end;
$$;
revoke all on function public.admin_update_business(uuid, text, text) from public;
grant execute on function public.admin_update_business(uuid, text, text) to authenticated;

create or replace function public.notify_new_follower() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id)
select b.owner_id,'new_follower','New follower',p.display_name || ' followed ' || b.name,b.id,'profile',new.customer_id
from public.businesses b join public.profiles p on p.id = new.customer_id where b.id = new.business_id; return new; end; $$;
create trigger notify_new_follower after insert on public.business_followers for each row execute function public.notify_new_follower();

create or replace function public.notify_review_event() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id)
select b.owner_id,'new_review','New review',p.display_name || ' reviewed ' || b.name,b.id,'review',new.id
from public.businesses b join public.profiles p on p.id = new.customer_id where b.id = new.business_id; return new; end; $$;
create trigger notify_new_review after insert on public.reviews for each row execute function public.notify_review_event();

create or replace function public.notify_review_reply() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id)
select r.customer_id,'review_reply','Business replied','A business replied to your review',new.business_id,'review',new.review_id from public.reviews r where r.id = new.review_id; return new; end; $$;
create trigger notify_review_reply after insert on public.review_replies for each row execute function public.notify_review_reply();

create or replace function public.notify_message() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare conversation public.conversations; owner_id uuid; recipient uuid;
begin select * into conversation from public.conversations where id = new.conversation_id; select b.owner_id into owner_id from public.businesses b where b.id = conversation.business_id;
recipient := case when new.sender_user_id = conversation.customer_id then owner_id else conversation.customer_id end;
insert into public.notifications(recipient_user_id,type,title,body,business_id,entity_type,entity_id)
values(recipient,'new_message','New message',coalesce(left(new.body,120),'Shared attachment'),conversation.business_id,'conversation',conversation.id); return new; end; $$;
create trigger notify_message after insert on public.messages for each row execute function public.notify_message();

commit;
