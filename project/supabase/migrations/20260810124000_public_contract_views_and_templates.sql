begin;

create or replace view public.reviews_public with (security_barrier = true) as
select r.id, r.business_id, r.customer_id, p.display_name as customer_name, p.avatar_url as customer_avatar,
  r.rating, r.review_text, r.photo_path, r.created_at, r.updated_at,
  (select count(*)::bigint from public.review_helpful h where h.review_id = r.id) as helpful_count,
  (select jsonb_build_object('id', rr.id, 'text', rr.reply_text, 'created_at', rr.created_at)
   from public.review_replies rr where rr.review_id = r.id) as reply
from public.reviews r
join public.profiles p on p.id = r.customer_id and p.status = 'active'
join public.businesses b on b.id = r.business_id and b.is_active and b.lifecycle in ('active','grace_period','lite')
where r.status = 'approved';

create or replace view public.post_comments_public with (security_barrier = true) as
select c.id, c.post_id, c.author_id, p.display_name as author_name, p.avatar_url as author_avatar,
  p.role as author_role, c.parent_comment_id, c.body, c.created_at, c.updated_at
from public.post_comments c
join public.profiles p on p.id = c.author_id and p.status = 'active'
join public.posts post on post.id = c.post_id and post.status = 'published'
join public.businesses b on b.id = post.business_id and b.is_active and b.lifecycle in ('active','grace_period','lite')
where c.status = 'published';

grant select on public.reviews_public, public.post_comments_public to anon, authenticated;

insert into public.business_templates(key, name, configuration) values
('minimal_premium','Minimal Premium','{"accentColor":"#109a59","heroStyle":"minimal","cardStyle":"rounded","defaultThemeMode":"light"}'),
('luxury_dark','Luxury Dark','{"accentColor":"#d4af37","heroStyle":"cover","cardStyle":"sharp","defaultThemeMode":"dark"}'),
('fashion_editorial','Fashion Editorial','{"accentColor":"#e11d48","heroStyle":"split","cardStyle":"editorial","defaultThemeMode":"light"}'),
('restaurant_modern','Restaurant Modern','{"accentColor":"#ea580c","heroStyle":"cover","cardStyle":"rounded","defaultThemeMode":"light"}'),
('salon_beauty','Salon Beauty','{"accentColor":"#ec4899","heroStyle":"centered","cardStyle":"rounded","defaultThemeMode":"light"}'),
('tech_store','Tech Store','{"accentColor":"#2563eb","heroStyle":"split","cardStyle":"sharp","defaultThemeMode":"dark"}'),
('fitness_energy','Fitness Energy','{"accentColor":"#f97316","heroStyle":"cover","cardStyle":"sharp","defaultThemeMode":"dark"}'),
('cafe_warm','Cafe Warm','{"accentColor":"#92400e","heroStyle":"centered","cardStyle":"rounded","defaultThemeMode":"light"}'),
('local_services','Local Services','{"accentColor":"#0891b2","heroStyle":"minimal","cardStyle":"rounded","defaultThemeMode":"light"}'),
('colourful_retail','Colourful Retail','{"accentColor":"#7c3aed","heroStyle":"split","cardStyle":"rounded","defaultThemeMode":"light"}')
on conflict(key) do update set name = excluded.name, configuration = excluded.configuration;

commit;
