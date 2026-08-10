begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.app_role as enum ('customer', 'business_owner', 'admin');
create type public.business_lifecycle as enum ('draft', 'pending_activation', 'active', 'grace_period', 'lite', 'suspended');
create type public.content_status as enum ('draft', 'published', 'archived', 'removed');
create type public.follow_source as enum ('qr', 'profile', 'deal', 'referral', 'explore', 'share');
create type public.media_type as enum ('image', 'video');
create type public.deal_claim_status as enum ('claimed', 'redeemed', 'expired', 'cancelled');
create type public.review_status as enum ('pending', 'approved', 'removed');
create type public.reward_claim_status as enum ('available', 'redeemed', 'expired', 'cancelled');
create type public.referral_status as enum ('pending', 'qualified', 'rewarded', 'expired', 'rejected');
create type public.loyalty_type as enum ('visit', 'points', 'spend');
create type public.subscription_plan as enum ('lite', 'pro');
create type public.subscription_status as enum ('pending', 'active', 'grace_period', 'past_due', 'cancelled', 'expired');
create type public.payment_type as enum ('activation', 'subscription', 'promotion', 'template', 'other');
create type public.payment_status as enum ('pending', 'success', 'failed', 'refunded', 'partially_refunded');
create type public.report_status as enum ('pending', 'reviewed', 'dismissed', 'actioned');

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  email_private text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.business_templates (
  key text primary key,
  name text not null,
  configuration jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  username extensions.citext not null unique check (username ~ '^[a-z0-9_]{3,40}$'),
  description text not null default '',
  bio text not null default '',
  category text not null,
  logo_url text,
  cover_url text,
  phone text,
  whatsapp text,
  email text,
  address text,
  location text,
  city text,
  state text,
  country text not null default 'India',
  latitude numeric(9,6),
  longitude numeric(9,6),
  maps_url text,
  instagram_url text,
  website_url text,
  opening_hours jsonb not null default '[]'::jsonb,
  featured_products jsonb not null default '[]'::jsonb,
  popular_items jsonb not null default '[]'::jsonb,
  today_offer text,
  template_key text references public.business_templates(key),
  theme text not null default 'default' check (theme in ('default', 'light', 'dark')),
  is_verified boolean not null default false,
  is_active boolean not null default false,
  lifecycle public.business_lifecycle not null default 'draft',
  subscription_status public.subscription_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint business_owner_role check (owner_id is not null)
);

create table public.business_gallery (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null, sort_order integer not null default 0, created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, storage_path)
);

create table public.business_followers (
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  source public.follow_source not null default 'profile',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (business_id, customer_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null default 'standard' check (type in ('standard','product','announcement','event','new_arrival')),
  caption text not null default '', status public.content_status not null default 'draft', location text, cta_label text, cta_url text,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.post_media (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null, media_type public.media_type not null, thumbnail_path text, sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()), unique(post_id, sort_order)
);
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade, customer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key(post_id, customer_id)
);
create table public.post_comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade, parent_comment_id uuid references public.post_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000), status public.content_status not null default 'published',
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade, customer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key(post_id, customer_id)
);
create table public.reposts (
  post_id uuid not null references public.posts(id) on delete cascade, customer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key(post_id, customer_id)
);

create table public.deals (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null, description text not null default '', media_path text,
  original_price numeric(12,2) not null check(original_price >= 0), offer_price numeric(12,2) not null check(offer_price >= 0),
  discount_percent numeric(5,2) not null check(discount_percent between 0 and 100), starts_at timestamptz not null, ends_at timestamptz not null,
  max_claims integer check(max_claims is null or max_claims > 0), terms text not null default '', cta_label text not null default 'Claim Deal',
  status public.content_status not null default 'draft', created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()), check(ends_at > starts_at), check(offer_price <= original_price)
);
create table public.deal_claims (
  id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.deals(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict, status public.deal_claim_status not null default 'claimed',
  claim_code text not null unique default encode(gen_random_bytes(8), 'hex'), claimed_at timestamptz not null default timezone('utc', now()), redeemed_at timestamptz,
  unique(deal_id, customer_id)
);
create table public.saved_deals (
  deal_id uuid not null references public.deals(id) on delete cascade, customer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key(deal_id, customer_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  story_type text not null default 'image' check(story_type in ('image','video','offer','deal','announcement','countdown','product')),
  media_path text, caption text, deal_id uuid references public.deals(id) on delete set null, status public.content_status not null default 'published',
  expires_at timestamptz not null default (timezone('utc', now()) + interval '24 hours'), created_at timestamptz not null default timezone('utc', now())
);
create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade, viewer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key(story_id, viewer_id)
);
create table public.story_highlights (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null, cover_path text, sort_order integer not null default 0, created_at timestamptz not null default timezone('utc', now())
);
create table public.story_highlight_items (
  highlight_id uuid not null references public.story_highlights(id) on delete cascade, story_id uuid not null references public.stories(id) on delete cascade,
  sort_order integer not null default 0, primary key(highlight_id, story_id)
);

create table public.deal_clips (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null, video_path text not null, thumbnail_path text, caption text not null default '',
  music text, status public.content_status not null default 'draft', created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.deal_clip_likes (
  clip_id uuid not null references public.deal_clips(id) on delete cascade, customer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key(clip_id, customer_id)
);
create table public.saved_deal_clips (
  clip_id uuid not null references public.deal_clips(id) on delete cascade, customer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key(clip_id, customer_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete restrict, rating smallint not null check(rating between 1 and 5),
  review_text text not null check(char_length(review_text) between 1 and 5000), photo_path text, status public.review_status not null default 'approved',
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create unique index reviews_one_active_per_customer_business on public.reviews(business_id, customer_id) where status <> 'removed';
create table public.review_replies (
  id uuid primary key default gen_random_uuid(), review_id uuid not null unique references public.reviews(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade, reply_text text not null check(char_length(reply_text) between 1 and 3000),
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.review_helpful (
  review_id uuid not null references public.reviews(id) on delete cascade, customer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key(review_id, customer_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()), unique(business_id, customer_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete restrict, body text, media_path text,
  shared_deal_id uuid references public.deals(id) on delete set null, shared_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()), read_at timestamptz,
  check(body is not null or media_path is not null or shared_deal_id is not null or shared_post_id is not null)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check(type in ('new_follower','new_review','review_reply','new_message','new_deal','new_story','reward','referral','subscription')),
  title text not null, body text not null, business_id uuid references public.businesses(id) on delete cascade,
  entity_type text, entity_id uuid, read_at timestamptz, created_at timestamptz not null default timezone('utc', now())
);

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(), business_id uuid not null unique references public.businesses(id) on delete cascade,
  code extensions.citext not null unique check(code ~ '^[A-Za-z0-9]{6,24}$'), created_at timestamptz not null default timezone('utc', now())
);
create table public.qr_scans (
  id uuid primary key default gen_random_uuid(), qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  viewer_user_id uuid references public.profiles(id) on delete set null, source text not null default 'qr' check(source in ('qr','shared','direct')),
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now())
);

create table public.reward_campaigns (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null, reward_type text not null, reward_value text not null, min_purchase numeric(12,2), starts_at timestamptz not null,
  ends_at timestamptz not null, max_claims integer, status public.content_status not null default 'draft', created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()), check(ends_at > starts_at)
);
create table public.reward_claims (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.reward_campaigns(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict, status public.reward_claim_status not null default 'available',
  reward_code text not null unique default encode(gen_random_bytes(8), 'hex'), created_at timestamptz not null default timezone('utc', now()), redeemed_at timestamptz,
  unique(campaign_id, customer_id)
);
create table public.scratch_campaigns (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null, outcomes jsonb not null check(jsonb_typeof(outcomes) = 'array'), max_plays integer, starts_at timestamptz not null,
  ends_at timestamptz not null, status public.content_status not null default 'draft', created_at timestamptz not null default timezone('utc', now()), check(ends_at > starts_at)
);
create table public.scratch_plays (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.scratch_campaigns(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict, eligibility_key text not null,
  outcome_key text not null, outcome_label text not null, is_win boolean not null, reward_claim_id uuid references public.reward_claims(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()), unique(campaign_id, customer_id, eligibility_key)
);

create table public.referral_campaigns (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null, friend_reward text not null, referrer_reward text not null, qualifying_action text not null,
  min_purchase numeric(12,2), max_rewards integer, starts_at timestamptz not null, ends_at timestamptz not null,
  status public.content_status not null default 'draft', created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()),
  check(ends_at > starts_at)
);
create table public.referrals (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid not null references public.referral_campaigns(id) on delete restrict, referrer_customer_id uuid not null references public.profiles(id) on delete restrict,
  referred_customer_id uuid references public.profiles(id) on delete restrict, referral_code extensions.citext not null unique,
  status public.referral_status not null default 'pending', created_at timestamptz not null default timezone('utc', now()), qualified_at timestamptz, rewarded_at timestamptz,
  check(referred_customer_id is null or referred_customer_id <> referrer_customer_id)
);
create unique index referrals_no_duplicate_referred_campaign on public.referrals(campaign_id, referred_customer_id) where referred_customer_id is not null;

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(), business_id uuid not null unique references public.businesses(id) on delete cascade,
  name text not null, program_type public.loyalty_type not null, reward_threshold numeric(12,2) not null check(reward_threshold > 0),
  reward_label text not null, terms text not null default '', status public.content_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.loyalty_members (
  id uuid primary key default gen_random_uuid(), program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade, joined_at timestamptz not null default timezone('utc', now()), unique(program_id, customer_id)
);
create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.loyalty_members(id) on delete restrict,
  amount numeric(12,2) not null, transaction_type text not null check(transaction_type in ('earn','redeem','adjustment','expire')),
  reference_type text, reference_id uuid, notes text, created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), business_id uuid not null unique references public.businesses(id) on delete cascade,
  plan public.subscription_plan not null default 'lite', status public.subscription_status not null default 'pending', started_at timestamptz,
  current_period_start timestamptz, current_period_end timestamptz, grace_until timestamptz, cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete restrict,
  external_payment_id text unique, amount numeric(12,2) not null check(amount >= 0), currency char(3) not null default 'INR',
  type public.payment_type not null, status public.payment_status not null default 'pending', provider text, provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete restrict,
  payment_id uuid unique references public.payments(id) on delete restrict, invoice_number text not null unique, storage_path text,
  issued_at timestamptz not null default timezone('utc', now()), created_at timestamptz not null default timezone('utc', now())
);

create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete restrict,
  entity_type text not null, entity_id uuid not null, reason text not null check(reason in ('spam','fake_business','fake_offer','abuse','misleading_deal','inappropriate_content','other')),
  details text, status public.report_status not null default 'pending', created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()), unique(reporter_id, entity_type, entity_id, reason)
);
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check(event_type in ('profile_view','qr_scan','follow','unfollow','post_view','deal_view','deal_claim','story_view','message_started','review_created','referral_created','reward_redeemed')),
  entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now())
);
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(), admin_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null, entity_type text not null, entity_id uuid not null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index businesses_owner_idx on public.businesses(owner_id);
create index businesses_active_category_idx on public.businesses(category, created_at desc) where is_active;
create index business_followers_customer_idx on public.business_followers(customer_id, created_at desc);
create index posts_business_published_idx on public.posts(business_id, created_at desc) where status = 'published';
create index post_comments_post_idx on public.post_comments(post_id, created_at);
create index stories_business_active_idx on public.stories(business_id, expires_at desc) where status = 'published';
create index deals_business_active_idx on public.deals(business_id, ends_at desc) where status = 'published';
create index deal_claims_customer_idx on public.deal_claims(customer_id, claimed_at desc);
create index saved_deals_customer_idx on public.saved_deals(customer_id, created_at desc);
create index reviews_business_approved_idx on public.reviews(business_id, created_at desc) where status = 'approved';
create index conversations_customer_idx on public.conversations(customer_id, updated_at desc);
create index conversations_business_idx on public.conversations(business_id, updated_at desc);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index notifications_recipient_idx on public.notifications(recipient_user_id, created_at desc);
create index qr_scans_qr_idx on public.qr_scans(qr_code_id, created_at desc);
create index referrals_referrer_idx on public.referrals(referrer_customer_id, created_at desc);
create index loyalty_transactions_member_idx on public.loyalty_transactions(member_id, created_at);
create index payments_business_idx on public.payments(business_id, created_at desc);
create index reports_status_idx on public.reports(status, created_at desc);
create index analytics_business_type_idx on public.analytics_events(business_id, event_type, created_at desc);
create index admin_audit_created_idx on public.admin_audit_logs(created_at desc);

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger templates_updated before update on public.business_templates for each row execute function public.set_updated_at();
create trigger businesses_updated before update on public.businesses for each row execute function public.set_updated_at();
create trigger posts_updated before update on public.posts for each row execute function public.set_updated_at();
create trigger comments_updated before update on public.post_comments for each row execute function public.set_updated_at();
create trigger deals_updated before update on public.deals for each row execute function public.set_updated_at();
create trigger clips_updated before update on public.deal_clips for each row execute function public.set_updated_at();
create trigger reviews_updated before update on public.reviews for each row execute function public.set_updated_at();
create trigger review_replies_updated before update on public.review_replies for each row execute function public.set_updated_at();
create trigger conversations_updated before update on public.conversations for each row execute function public.set_updated_at();
create trigger reward_campaigns_updated before update on public.reward_campaigns for each row execute function public.set_updated_at();
create trigger referral_campaigns_updated before update on public.referral_campaigns for each row execute function public.set_updated_at();
create trigger loyalty_programs_updated before update on public.loyalty_programs for each row execute function public.set_updated_at();
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger payments_updated before update on public.payments for each row execute function public.set_updated_at();
create trigger reports_updated before update on public.reports for each row execute function public.set_updated_at();

commit;
