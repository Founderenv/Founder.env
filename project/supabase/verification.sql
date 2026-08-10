-- Founder.env post-deployment verification. This script is read-only.
-- Every query returns zero rows when its check passes.

-- 1. Expected application tables.
select expected.table_name as missing_table
from (values
 ('profiles'),('business_templates'),('businesses'),('business_gallery'),('business_followers'),
 ('posts'),('post_media'),('post_likes'),('post_comments'),('saved_posts'),('reposts'),
 ('deals'),('deal_claims'),('saved_deals'),('stories'),('story_views'),('story_highlights'),('story_highlight_items'),
 ('deal_clips'),('deal_clip_likes'),('saved_deal_clips'),('reviews'),('review_replies'),('review_helpful'),
 ('conversations'),('messages'),('notifications'),('qr_codes'),('qr_scans'),
 ('reward_campaigns'),('reward_claims'),('scratch_campaigns'),('scratch_plays'),
 ('referral_campaigns'),('referrals'),('loyalty_programs'),('loyalty_members'),('loyalty_transactions'),
 ('subscriptions'),('payments'),('invoices'),('reports'),('analytics_events'),('admin_audit_logs')
) expected(table_name)
left join information_schema.tables actual
  on actual.table_schema = 'public' and actual.table_name = expected.table_name
where actual.table_name is null;

-- 2. RLS must be enabled and every application table must have at least one policy.
select c.relname as table_without_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'spatial_ref_sys' and not c.relrowsecurity;

select t.tablename as table_without_policy
from pg_tables t
where t.schemaname = 'public' and t.tablename <> 'spatial_ref_sys'
  and not exists(select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename);

-- 3. Critical foreign keys.
select expected.constraint_name as missing_foreign_key
from (values
 ('profiles_id_fkey'),('businesses_owner_id_fkey'),('business_followers_business_id_fkey'),('business_followers_customer_id_fkey'),
 ('posts_business_id_fkey'),('post_media_post_id_fkey'),('post_comments_author_id_fkey'),('deals_business_id_fkey'),
 ('deal_claims_deal_id_fkey'),('deal_claims_customer_id_fkey'),('stories_business_id_fkey'),('reviews_business_id_fkey'),
 ('reviews_customer_id_fkey'),('review_replies_review_id_fkey'),('conversations_business_id_fkey'),('conversations_customer_id_fkey'),
 ('messages_conversation_id_fkey'),('messages_sender_user_id_fkey'),('reward_claims_campaign_id_fkey'),
 ('scratch_plays_campaign_id_fkey'),('referrals_campaign_id_fkey'),('loyalty_transactions_member_id_fkey'),
 ('subscriptions_business_id_fkey'),('payments_business_id_fkey'),('invoices_payment_id_fkey'),('admin_audit_logs_admin_user_id_fkey')
) expected(constraint_name)
left join information_schema.table_constraints actual
  on actual.constraint_schema = 'public' and actual.constraint_name = expected.constraint_name and actual.constraint_type = 'FOREIGN KEY'
where actual.constraint_name is null;

-- 4. Critical uniqueness and supporting indexes.
select expected.index_name as missing_index
from (values
 ('businesses_username_key'),('business_followers_pkey'),('post_likes_pkey'),('saved_posts_pkey'),('reposts_pkey'),
 ('deal_claims_deal_id_customer_id_key'),('saved_deals_pkey'),('story_views_pkey'),
 ('reviews_one_active_per_customer_business'),('conversations_business_id_customer_id_key'),
 ('qr_codes_business_id_key'),('qr_codes_code_key'),('reward_claims_campaign_id_customer_id_key'),
 ('scratch_plays_campaign_id_customer_id_eligibility_key_key'),('referrals_no_duplicate_referred_campaign'),
 ('loyalty_members_program_id_customer_id_key'),('subscriptions_business_id_key'),('payments_external_payment_id_key'),
 ('businesses_owner_idx'),('posts_business_published_idx'),('messages_conversation_idx'),
 ('analytics_business_type_idx'),('payments_business_idx')
) expected(index_name)
left join pg_indexes actual on actual.schemaname = 'public' and actual.indexname = expected.index_name
where actual.indexname is null;

-- 5. Security-definer functions must exist and pin search_path.
select expected.function_name as missing_or_unsafe_security_definer
from (values
 ('is_admin'),('owns_business'),('is_customer'),('is_public_business'),('can_access_conversation'),
 ('handle_new_user'),('choose_initial_role'),('public_follower_count'),('get_business_followers'),
 ('claim_deal'),('play_scratch'),('create_referral'),('resolve_and_track_qr'),('admin_update_business'),
 ('notify_new_follower'),('notify_review_event'),('notify_review_reply'),('notify_message'),('can_write_business_path')
) expected(function_name)
where not exists(
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = expected.function_name and p.prosecdef
    and exists(select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting where setting like 'search_path=%')
);

-- 6. Public views must never expose private customer email.
select table_name, column_name as unsafe_public_email_column
from information_schema.columns
where table_schema = 'public' and table_name in ('public_profiles','reviews_public','post_comments_public')
  and lower(column_name) in ('email','email_private');

select table_name, column_name as leaked_private_email_column
from information_schema.columns
where table_schema = 'public' and column_name = 'email_private' and table_name <> 'profiles';

select 'anon_can_select_profiles' as unsafe_privilege where has_table_privilege('anon', 'public.profiles', 'select');
select 'authenticated_can_select_provider_payload' as unsafe_privilege
where has_column_privilege('authenticated', 'public.payments', 'provider_payload', 'select');

-- 7. Trusted financial/reward state cannot be written by normal clients.
select violation
from (values
 ('anon_updates_payments', has_table_privilege('anon','public.payments','update')),
 ('authenticated_updates_payments', has_table_privilege('authenticated','public.payments','update')),
 ('authenticated_inserts_payments', has_table_privilege('authenticated','public.payments','insert')),
 ('authenticated_updates_subscriptions', has_table_privilege('authenticated','public.subscriptions','update')),
 ('authenticated_inserts_reward_claims', has_table_privilege('authenticated','public.reward_claims','insert')),
 ('authenticated_updates_reward_claims', has_table_privilege('authenticated','public.reward_claims','update')),
 ('authenticated_inserts_scratch_plays', has_table_privilege('authenticated','public.scratch_plays','insert')),
 ('authenticated_executes_play_scratch', has_function_privilege('authenticated','public.play_scratch(uuid,text,uuid)','execute'))
) checks(violation, is_unsafe)
where is_unsafe;

-- 8. Messages and notifications expose only read_at for client updates.
select violation
from (values
 ('messages_table_update_grant', has_table_privilege('authenticated','public.messages','update')),
 ('messages_body_update_grant', has_column_privilege('authenticated','public.messages','body','update')),
 ('messages_read_at_missing', not has_column_privilege('authenticated','public.messages','read_at','update')),
 ('notifications_table_update_grant', has_table_privilege('authenticated','public.notifications','update')),
 ('notifications_body_update_grant', has_column_privilege('authenticated','public.notifications','body','update')),
 ('notifications_read_at_missing', not has_column_privilege('authenticated','public.notifications','read_at','update'))
) checks(violation, is_unsafe)
where is_unsafe;

-- 9. Storage buckets and exact policy names.
select expected.bucket as missing_bucket
from (values
 ('business-logos'),('business-covers'),('business-gallery'),('post-media'),
 ('story-media'),('deal-media'),('message-media'),('review-media')
) expected(bucket)
left join storage.buckets b on b.id = expected.bucket
where b.id is null;

select expected.policy_name as missing_storage_policy
from (values
 ('public_business_assets_read'),('business_assets_insert'),('business_assets_update'),('business_assets_delete'),
 ('private_user_media_insert'),('private_user_media_update'),('private_user_media_delete'),
 ('message_media_participant_read'),('review_media_read')
) expected(policy_name)
left join pg_policies p on p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = expected.policy_name
where p.policyname is null;

-- 10. Realtime publication membership.
select expected.table_name as missing_realtime_table
from (values ('messages'),('notifications')) expected(table_name)
left join pg_publication_tables actual
  on actual.pubname = 'supabase_realtime' and actual.schemaname = 'public' and actual.tablename = expected.table_name
where actual.tablename is null;
