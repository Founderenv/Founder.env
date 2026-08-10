-- Run after `supabase db push`, or in the existing project's SQL editor.
-- Each query must return zero rows unless stated otherwise.

select expected.table_name as missing_table
from (values
 ('profiles'),('businesses'),('business_templates'),('business_followers'),('posts'),('post_media'),('post_likes'),('post_comments'),('saved_posts'),('reposts'),
 ('stories'),('story_views'),('story_highlights'),('deals'),('deal_claims'),('reviews'),('review_replies'),('conversations'),('messages'),('notifications'),
 ('qr_codes'),('qr_scans'),('reward_campaigns'),('reward_claims'),('referral_campaigns'),('referrals'),('loyalty_programs'),('loyalty_members'),
 ('loyalty_transactions'),('subscriptions'),('payments'),('invoices'),('reports'),('analytics_events'),('admin_audit_logs')
) expected(table_name)
left join information_schema.tables actual on actual.table_schema='public' and actual.table_name=expected.table_name
where actual.table_name is null;

select c.relname as table_without_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
  and c.relname not in ('spatial_ref_sys');

select tablename from pg_tables t where schemaname='public'
and not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=t.tablename)
and tablename not in ('schema_migrations');

select expected.bucket as missing_bucket from (values
 ('business-logos'),('business-covers'),('business-gallery'),('post-media'),('story-media'),('deal-media'),('message-media'),('review-media')
) expected(bucket) left join storage.buckets b on b.id=expected.bucket where b.id is null;

-- Expected: `email_private` appears only in profiles and never in either public view.
select table_name, column_name from information_schema.columns
where table_schema='public' and column_name='email_private' and table_name <> 'profiles';

-- Expected: messages and notifications are present in the Realtime publication.
select schemaname, tablename from pg_publication_tables where pubname='supabase_realtime' and tablename in ('messages','notifications');
