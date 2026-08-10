begin;

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.profiles p where p.id = user_id and p.role = 'admin' and p.status = 'active');
$$;

create or replace function public.owns_business(target_business_id uuid, user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from public.businesses b join public.profiles p on p.id = b.owner_id
    where b.id = target_business_id and b.owner_id = user_id
      and p.role = 'business_owner' and p.status = 'active'
  );
$$;

create or replace function public.is_customer(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.profiles p where p.id = user_id and p.role = 'customer' and p.status = 'active');
$$;

create or replace function public.is_public_business(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from public.businesses b
    where b.id = target_business_id and b.is_active and b.lifecycle in ('active','grace_period','lite')
  );
$$;

create or replace function public.can_access_conversation(target_conversation_id uuid, user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_admin(user_id) or exists(
    select 1 from public.conversations c
    where c.id = target_conversation_id
      and (c.customer_id = user_id or public.owns_business(c.business_id, user_id))
  );
$$;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.owns_business(uuid, uuid) from public;
revoke all on function public.is_customer(uuid) from public;
revoke all on function public.is_public_business(uuid) from public;
revoke all on function public.can_access_conversation(uuid, uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.owns_business(uuid, uuid) to authenticated;
grant execute on function public.is_customer(uuid) to authenticated;
grant execute on function public.is_public_business(uuid) to anon, authenticated;
grant execute on function public.can_access_conversation(uuid, uuid) to authenticated;

alter table public.profiles add column onboarding_complete boolean not null default false;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare requested text := coalesce(new.raw_user_meta_data ->> 'requested_role', '');
begin
  insert into public.profiles(id, role, display_name, avatar_url, email_private, onboarding_complete)
  values (
    new.id,
    case when requested = 'business_owner' then 'business_owner'::public.app_role else 'customer'::public.app_role end,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Founder.env user'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email,
    requested in ('customer', 'business_owner')
  ) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public;

create trigger founder_env_on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.choose_initial_role(requested_role public.app_role)
returns public.profiles language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if requested_role = 'admin' then raise exception 'admin cannot be self-selected' using errcode = '42501'; end if;
  update public.profiles set role = requested_role, onboarding_complete = true
  where id = auth.uid() and onboarding_complete = false returning * into result;
  if result.id is null then raise exception 'role already selected or profile missing' using errcode = '23505'; end if;
  return result;
end;
$$;
revoke all on function public.choose_initial_role(public.app_role) from public;
grant execute on function public.choose_initial_role(public.app_role) to authenticated;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.role() <> 'service_role' and auth.uid() = old.id and not public.is_admin(auth.uid()) then
    new.role = old.role; new.status = old.status; new.email_private = old.email_private; new.onboarding_complete = old.onboarding_complete;
  end if;
  return new;
end;
$$;
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
create trigger protect_business_system_fields before insert or update on public.businesses for each row execute function public.protect_business_system_fields();

create or replace function public.protect_review_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    if tg_op = 'UPDATE' then
      new.business_id = old.business_id;
      new.customer_id = old.customer_id;
      new.status = old.status;
    end if;
  end if;
  return new;
end;
$$;
create trigger protect_review_fields before update on public.reviews for each row execute function public.protect_review_fields();

create or replace function public.validate_review_reply()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' and auth.role() <> 'service_role' and not public.is_admin() then
    new.review_id = old.review_id;
    new.business_id = old.business_id;
  end if;
  if not exists(select 1 from public.reviews r where r.id = new.review_id and r.business_id = new.business_id) then
    raise exception 'review reply business mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_review_reply before insert or update on public.review_replies for each row execute function public.validate_review_reply();

create or replace function public.validate_post_comment()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' and auth.role() <> 'service_role' and not public.is_admin() then
    new.post_id = old.post_id;
    new.author_id = old.author_id;
    new.status = old.status;
  end if;
  if new.parent_comment_id is not null and not exists(
    select 1 from public.post_comments parent where parent.id = new.parent_comment_id and parent.post_id = new.post_id
  ) then
    raise exception 'parent comment belongs to another post' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_post_comment before insert or update on public.post_comments for each row execute function public.validate_post_comment();

create or replace function public.protect_message_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    new.conversation_id = old.conversation_id;
    new.sender_user_id = old.sender_user_id;
    new.body = old.body;
    new.media_path = old.media_path;
    new.shared_deal_id = old.shared_deal_id;
    new.shared_post_id = old.shared_post_id;
    new.created_at = old.created_at;
  end if;
  return new;
end;
$$;
create trigger protect_message_fields before update on public.messages for each row execute function public.protect_message_fields();

create or replace function public.protect_notification_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    new.recipient_user_id = old.recipient_user_id;
    new.type = old.type;
    new.title = old.title;
    new.body = old.body;
    new.business_id = old.business_id;
    new.entity_type = old.entity_type;
    new.entity_id = old.entity_id;
    new.created_at = old.created_at;
  end if;
  return new;
end;
$$;
create trigger protect_notification_fields before update on public.notifications for each row execute function public.protect_notification_fields();

create or replace view public.public_profiles with (security_barrier = true) as
select id, display_name, avatar_url, created_at from public.profiles where status = 'active';

create or replace function public.public_follower_count(target_business_id uuid)
returns bigint language sql stable security definer set search_path = public, pg_temp as $$
  select case when exists(select 1 from public.businesses b where b.id = target_business_id and b.is_active)
    then (select count(*) from public.business_followers f where f.business_id = target_business_id) else 0 end;
$$;
grant execute on function public.public_follower_count(uuid) to anon, authenticated;

create or replace view public.business_public with (security_invoker = true) as
select b.*,
  public.public_follower_count(b.id) as follower_count,
  (select count(*)::bigint from public.reviews r where r.business_id = b.id and r.status = 'approved') as review_count,
  coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.business_id = b.id and r.status = 'approved'), 0) as rating
from public.businesses b where b.is_active and b.lifecycle in ('active','grace_period','lite');

create or replace function public.get_business_followers(target_business_id uuid)
returns table(customer_id uuid, display_name text, avatar_url text, followed_at timestamptz, source public.follow_source)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (public.owns_business(target_business_id) or public.is_admin()) then raise exception 'permission denied' using errcode = '42501'; end if;
  return query select f.customer_id, p.display_name, p.avatar_url, f.created_at, f.source
  from public.business_followers f join public.profiles p on p.id = f.customer_id
  where f.business_id = target_business_id order by f.created_at desc;
end;
$$;
revoke all on function public.get_business_followers(uuid) from public;
grant execute on function public.get_business_followers(uuid) to authenticated;

-- RLS is enabled on every application table, including join tables.
do $$ declare table_name text; begin
  foreach table_name in array array[
    'profiles','business_templates','businesses','business_gallery','business_followers','posts','post_media','post_likes','post_comments','saved_posts','reposts',
    'deals','deal_claims','saved_deals','stories','story_views','story_highlights','story_highlight_items','deal_clips','deal_clip_likes','saved_deal_clips',
    'reviews','review_replies','review_helpful','conversations','messages','notifications','qr_codes','qr_scans','reward_campaigns','reward_claims',
    'scratch_campaigns','scratch_plays','referral_campaigns','referrals','loyalty_programs','loyalty_members','loyalty_transactions','subscriptions',
    'payments','invoices','reports','analytics_events','admin_audit_logs'
  ] loop execute format('alter table public.%I enable row level security', table_name); end loop;
end $$;

create policy profiles_self_read on public.profiles for select to authenticated using(id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using(id = auth.uid()) with check(id = auth.uid());
create policy profiles_admin_all on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy templates_public_read on public.business_templates for select to anon, authenticated using(is_active or public.is_admin());
create policy templates_admin_write on public.business_templates for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy businesses_public_read on public.businesses for select to anon, authenticated using((is_active and lifecycle in ('active','grace_period','lite')) or owner_id = auth.uid() or public.is_admin());
create policy businesses_owner_insert on public.businesses for insert to authenticated with check(owner_id = auth.uid() and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'business_owner' and p.status = 'active'));
create policy businesses_owner_update on public.businesses for update to authenticated using(owner_id = auth.uid()) with check(owner_id = auth.uid());
create policy businesses_admin_all on public.businesses for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy gallery_public_read on public.business_gallery for select to anon, authenticated using(public.is_public_business(business_id) or public.owns_business(business_id) or public.is_admin());
create policy gallery_owner_write on public.business_gallery for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());

create policy follows_customer_read on public.business_followers for select to authenticated using(customer_id = auth.uid());
create policy follows_owner_read on public.business_followers for select to authenticated using(public.owns_business(business_id) or public.is_admin());
create policy follows_customer_insert on public.business_followers for insert to authenticated with check(customer_id = auth.uid() and public.is_customer() and public.is_public_business(business_id));
create policy follows_customer_delete on public.business_followers for delete to authenticated using(customer_id = auth.uid() and public.is_customer());

create policy posts_read on public.posts for select to anon, authenticated using((status = 'published' and public.is_public_business(business_id)) or public.owns_business(business_id) or public.is_admin());
create policy posts_owner_write on public.posts for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy post_media_read on public.post_media for select to anon, authenticated using(exists(select 1 from public.posts p where p.id = post_id and ((p.status = 'published' and public.is_public_business(p.business_id)) or public.owns_business(p.business_id) or public.is_admin())));
create policy post_media_owner_write on public.post_media for all to authenticated using(exists(select 1 from public.posts p where p.id = post_id and (public.owns_business(p.business_id) or public.is_admin()))) with check(exists(select 1 from public.posts p where p.id = post_id and (public.owns_business(p.business_id) or public.is_admin())));
create policy post_likes_read on public.post_likes for select to anon, authenticated using(exists(select 1 from public.posts p where p.id = post_id and p.status = 'published' and public.is_public_business(p.business_id)));
create policy post_likes_own_insert on public.post_likes for insert to authenticated with check(customer_id = auth.uid() and public.is_customer() and exists(select 1 from public.posts p where p.id = post_id and p.status = 'published' and public.is_public_business(p.business_id)));
create policy post_likes_own_delete on public.post_likes for delete to authenticated using(customer_id = auth.uid());
create policy comments_read on public.post_comments for select to anon, authenticated using((status = 'published' and exists(select 1 from public.posts p where p.id = post_id and p.status = 'published' and public.is_public_business(p.business_id))) or author_id = auth.uid() or public.is_admin());
create policy comments_own_insert on public.post_comments for insert to authenticated with check(author_id = auth.uid() and exists(select 1 from public.posts p where p.id = post_id and p.status = 'published' and public.is_public_business(p.business_id)));
create policy comments_own_update on public.post_comments for update to authenticated using(author_id = auth.uid()) with check(author_id = auth.uid());
create policy comments_own_delete on public.post_comments for delete to authenticated using(author_id = auth.uid() or public.is_admin());
create policy saved_posts_own on public.saved_posts for all to authenticated using(customer_id = auth.uid()) with check(customer_id = auth.uid() and public.is_customer() and exists(select 1 from public.posts p where p.id = post_id and p.status = 'published' and public.is_public_business(p.business_id)));
create policy reposts_read on public.reposts for select to authenticated using(customer_id = auth.uid() or public.is_admin());
create policy reposts_own_write on public.reposts for insert to authenticated with check(customer_id = auth.uid() and public.is_customer() and exists(select 1 from public.posts p where p.id = post_id and p.status = 'published' and public.is_public_business(p.business_id)));
create policy reposts_own_delete on public.reposts for delete to authenticated using(customer_id = auth.uid());

create policy stories_read on public.stories for select to anon, authenticated using((status = 'published' and expires_at > now() and public.is_public_business(business_id)) or public.owns_business(business_id) or public.is_admin());
create policy stories_owner_write on public.stories for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy story_views_own_insert on public.story_views for insert to authenticated with check(viewer_id = auth.uid() and public.is_customer() and exists(select 1 from public.stories s where s.id = story_id and s.status = 'published' and s.expires_at > now() and public.is_public_business(s.business_id)));
create policy story_views_own_or_owner_read on public.story_views for select to authenticated using(viewer_id = auth.uid() or exists(select 1 from public.stories s where s.id = story_id and public.owns_business(s.business_id)) or public.is_admin());
create policy highlights_read on public.story_highlights for select to anon, authenticated using(public.is_public_business(business_id) or public.owns_business(business_id) or public.is_admin());
create policy highlights_owner_write on public.story_highlights for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy highlight_items_read on public.story_highlight_items for select to anon, authenticated using(exists(select 1 from public.story_highlights h where h.id = highlight_id));
create policy highlight_items_owner_write on public.story_highlight_items for all to authenticated using(exists(select 1 from public.story_highlights h join public.stories s on s.id = story_highlight_items.story_id where h.id = story_highlight_items.highlight_id and s.business_id = h.business_id and (public.owns_business(h.business_id) or public.is_admin()))) with check(exists(select 1 from public.story_highlights h join public.stories s on s.id = story_highlight_items.story_id where h.id = story_highlight_items.highlight_id and s.business_id = h.business_id and (public.owns_business(h.business_id) or public.is_admin())));

create policy deals_read on public.deals for select to anon, authenticated using((status = 'published' and public.is_public_business(business_id)) or public.owns_business(business_id) or public.is_admin());
create policy deals_owner_write on public.deals for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy deal_claims_customer_read on public.deal_claims for select to authenticated using(customer_id = auth.uid());
create policy deal_claims_owner_read on public.deal_claims for select to authenticated using(exists(select 1 from public.deals d where d.id = deal_id and public.owns_business(d.business_id)) or public.is_admin());
create policy saved_deals_own on public.saved_deals for all to authenticated using(customer_id = auth.uid()) with check(customer_id = auth.uid() and public.is_customer() and exists(select 1 from public.deals d where d.id = deal_id and d.status = 'published' and public.is_public_business(d.business_id)));

create policy clips_read on public.deal_clips for select to anon, authenticated using((status = 'published' and public.is_public_business(business_id)) or public.owns_business(business_id) or public.is_admin());
create policy clips_owner_write on public.deal_clips for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy clip_likes_read on public.deal_clip_likes for select to anon, authenticated using(exists(select 1 from public.deal_clips c where c.id = clip_id and c.status = 'published' and public.is_public_business(c.business_id)));
create policy clip_likes_own_insert on public.deal_clip_likes for insert to authenticated with check(customer_id = auth.uid() and public.is_customer() and exists(select 1 from public.deal_clips c where c.id = clip_id and c.status = 'published' and public.is_public_business(c.business_id)));
create policy clip_likes_own_delete on public.deal_clip_likes for delete to authenticated using(customer_id = auth.uid());
create policy saved_clips_own on public.saved_deal_clips for all to authenticated using(customer_id = auth.uid()) with check(customer_id = auth.uid() and public.is_customer() and exists(select 1 from public.deal_clips c where c.id = clip_id and c.status = 'published' and public.is_public_business(c.business_id)));

create policy reviews_public_read on public.reviews for select to anon, authenticated using((status = 'approved' and public.is_public_business(business_id)) or customer_id = auth.uid() or public.is_admin());
create policy reviews_customer_insert on public.reviews for insert to authenticated with check(customer_id = auth.uid() and public.is_customer() and public.is_public_business(business_id) and (photo_path is null or photo_path like 'user/' || auth.uid()::text || '/%'));
create policy reviews_customer_update on public.reviews for update to authenticated using(customer_id = auth.uid()) with check(customer_id = auth.uid() and (photo_path is null or photo_path like 'user/' || auth.uid()::text || '/%'));
create policy reviews_customer_delete on public.reviews for delete to authenticated using(customer_id = auth.uid());
create policy reviews_admin_update on public.reviews for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy replies_public_read on public.review_replies for select to anon, authenticated using(exists(select 1 from public.reviews r where r.id = review_id and r.status = 'approved' and public.is_public_business(r.business_id)));
create policy replies_owner_write on public.review_replies for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) and exists(select 1 from public.reviews r where r.id = review_id and r.business_id = business_id) or public.is_admin());
create policy helpful_read on public.review_helpful for select to anon, authenticated using(exists(select 1 from public.reviews r where r.id = review_id and r.status = 'approved' and public.is_public_business(r.business_id)));
create policy helpful_own on public.review_helpful for all to authenticated using(customer_id = auth.uid()) with check(customer_id = auth.uid() and public.is_customer() and exists(select 1 from public.reviews r where r.id = review_id and r.status = 'approved' and public.is_public_business(r.business_id)));

create policy conversations_participant_read on public.conversations for select to authenticated using(customer_id = auth.uid() or public.owns_business(business_id) or public.is_admin());
create policy conversations_customer_insert on public.conversations for insert to authenticated with check(customer_id = auth.uid() and public.is_customer() and public.is_public_business(business_id));
create policy conversations_owner_insert on public.conversations for insert to authenticated with check(public.owns_business(business_id) and exists(select 1 from public.profiles p where p.id = customer_id and p.role = 'customer' and p.status = 'active'));
create policy messages_participant_read on public.messages for select to authenticated using(public.can_access_conversation(conversation_id));
create policy messages_participant_insert on public.messages for insert to authenticated with check(sender_user_id = auth.uid() and public.can_access_conversation(conversation_id) and (media_path is null or media_path like 'user/' || auth.uid()::text || '/%'));
create policy messages_participant_update_read_at on public.messages for update to authenticated using(public.can_access_conversation(conversation_id)) with check(public.can_access_conversation(conversation_id) and sender_user_id <> auth.uid());

create policy notifications_own_read on public.notifications for select to authenticated using(recipient_user_id = auth.uid() or public.is_admin());
create policy notifications_own_update on public.notifications for update to authenticated using(recipient_user_id = auth.uid()) with check(recipient_user_id = auth.uid());
create policy notifications_admin_all on public.notifications for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy qr_public_read on public.qr_codes for select to anon, authenticated using(exists(select 1 from public.businesses b where b.id = business_id and (b.is_active or b.owner_id = auth.uid() or public.is_admin())));
create policy qr_owner_read on public.qr_scans for select to authenticated using(exists(select 1 from public.qr_codes q where q.id = qr_code_id and public.owns_business(q.business_id)) or public.is_admin());

create policy reward_campaigns_read on public.reward_campaigns for select to anon, authenticated using((status = 'published' and public.is_public_business(business_id)) or public.owns_business(business_id) or public.is_admin());
create policy reward_campaigns_owner_write on public.reward_campaigns for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy reward_claims_customer_read on public.reward_claims for select to authenticated using(customer_id = auth.uid());
create policy reward_claims_owner_read on public.reward_claims for select to authenticated using(exists(select 1 from public.reward_campaigns c where c.id = campaign_id and public.owns_business(c.business_id)) or public.is_admin());
create policy scratch_campaigns_read on public.scratch_campaigns for select to authenticated using((status = 'published' and public.is_public_business(business_id)) or public.owns_business(business_id) or public.is_admin());
create policy scratch_campaigns_owner_write on public.scratch_campaigns for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy scratch_plays_customer_read on public.scratch_plays for select to authenticated using(customer_id = auth.uid());
create policy scratch_plays_owner_read on public.scratch_plays for select to authenticated using(exists(select 1 from public.scratch_campaigns c where c.id = campaign_id and public.owns_business(c.business_id)) or public.is_admin());

create policy referral_campaigns_read on public.referral_campaigns for select to authenticated using((status = 'published' and public.is_public_business(business_id)) or public.owns_business(business_id) or public.is_admin());
create policy referral_campaigns_owner_write on public.referral_campaigns for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy referrals_participant_read on public.referrals for select to authenticated using(referrer_customer_id = auth.uid() or referred_customer_id = auth.uid() or public.owns_business(business_id) or public.is_admin());

create policy loyalty_programs_read on public.loyalty_programs for select to authenticated using((status = 'published' and public.is_public_business(business_id)) or public.owns_business(business_id) or public.is_admin());
create policy loyalty_programs_owner_write on public.loyalty_programs for all to authenticated using(public.owns_business(business_id) or public.is_admin()) with check(public.owns_business(business_id) or public.is_admin());
create policy loyalty_members_participant_read on public.loyalty_members for select to authenticated using(customer_id = auth.uid() or exists(select 1 from public.loyalty_programs p where p.id = program_id and public.owns_business(p.business_id)) or public.is_admin());
create policy loyalty_members_customer_insert on public.loyalty_members for insert to authenticated with check(customer_id = auth.uid() and public.is_customer() and exists(select 1 from public.loyalty_programs p where p.id = program_id and p.status = 'published' and public.is_public_business(p.business_id)));
create policy loyalty_transactions_participant_read on public.loyalty_transactions for select to authenticated using(exists(select 1 from public.loyalty_members m join public.loyalty_programs p on p.id = m.program_id where m.id = member_id and (m.customer_id = auth.uid() or public.owns_business(p.business_id))) or public.is_admin());
create policy loyalty_transactions_owner_insert on public.loyalty_transactions for insert to authenticated with check(exists(select 1 from public.loyalty_members m join public.loyalty_programs p on p.id = m.program_id where m.id = member_id and public.owns_business(p.business_id)) or public.is_admin());

create policy subscriptions_owner_read on public.subscriptions for select to authenticated using(public.owns_business(business_id) or public.is_admin());
create policy subscriptions_admin_write on public.subscriptions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy payments_owner_read on public.payments for select to authenticated using(public.owns_business(business_id) or public.is_admin());
create policy invoices_owner_read on public.invoices for select to authenticated using(public.owns_business(business_id) or public.is_admin());
create policy reports_own_insert on public.reports for insert to authenticated with check(reporter_id = auth.uid());
create policy reports_own_read on public.reports for select to authenticated using(reporter_id = auth.uid() or public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy analytics_event_insert on public.analytics_events for insert to anon, authenticated with check((user_id is null or user_id = auth.uid()) and exists(select 1 from public.businesses b where b.id = business_id and b.is_active));
create policy analytics_owner_read on public.analytics_events for select to authenticated using(public.owns_business(business_id) or public.is_admin());
create policy admin_audit_admin_read on public.admin_audit_logs for select to authenticated using(public.is_admin());
create policy admin_audit_admin_insert on public.admin_audit_logs for insert to authenticated with check(public.is_admin() and admin_user_id = auth.uid());

-- Explicit grants prevent private profile columns and financial state writes from leaking through PostgREST.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name, avatar_url) on public.profiles to authenticated;
grant select on public.public_profiles to anon, authenticated;
grant select on public.business_public to anon, authenticated;
revoke insert, update, delete on public.subscriptions, public.payments, public.invoices from anon, authenticated;
revoke insert, update, delete on public.reward_claims, public.scratch_plays from anon, authenticated;
revoke insert, update, delete on public.qr_scans from anon, authenticated;
revoke update on public.messages, public.notifications from anon, authenticated;
grant update(read_at) on public.messages, public.notifications to authenticated;
revoke select on public.payments from anon, authenticated;
grant select(id, business_id, external_payment_id, amount, currency, type, status, provider, created_at, updated_at) on public.payments to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

commit;
