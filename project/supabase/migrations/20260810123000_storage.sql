begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('business-logos','business-logos',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('business-covers','business-covers',true,10485760,array['image/jpeg','image/png','image/webp']),
  ('business-gallery','business-gallery',true,10485760,array['image/jpeg','image/png','image/webp']),
  ('post-media','post-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
  ('story-media','story-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
  ('deal-media','deal-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
  ('message-media','message-media',false,20971520,array['image/jpeg','image/png','image/webp']),
  ('review-media','review-media',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_write_business_path(object_name text)
returns boolean language plpgsql stable security definer set search_path = public, storage, pg_temp as $$
declare parts text[]; target uuid;
begin parts := storage.foldername(object_name); if array_length(parts,1) < 2 or parts[1] <> 'business' then return false; end if;
  begin target := parts[2]::uuid; exception when invalid_text_representation then return false; end;
  return public.owns_business(target) or public.is_admin();
end; $$;
grant execute on function public.can_write_business_path(text) to authenticated;

create or replace function public.is_own_user_path(object_name text)
returns boolean language plpgsql stable set search_path = public, storage, pg_temp as $$
declare parts text[]; target uuid;
begin parts := storage.foldername(object_name); if array_length(parts,1) < 2 or parts[1] <> 'user' then return false; end if;
  begin target := parts[2]::uuid; exception when invalid_text_representation then return false; end;
  return target = auth.uid();
end; $$;
grant execute on function public.is_own_user_path(text) to authenticated;

create policy public_business_assets_read on storage.objects for select to anon, authenticated
using(bucket_id in ('business-logos','business-covers','business-gallery','post-media','story-media','deal-media'));
create policy business_assets_insert on storage.objects for insert to authenticated
with check(bucket_id in ('business-logos','business-covers','business-gallery','post-media','story-media','deal-media') and public.can_write_business_path(name));
create policy business_assets_update on storage.objects for update to authenticated
using(bucket_id in ('business-logos','business-covers','business-gallery','post-media','story-media','deal-media') and public.can_write_business_path(name))
with check(bucket_id in ('business-logos','business-covers','business-gallery','post-media','story-media','deal-media') and public.can_write_business_path(name));
create policy business_assets_delete on storage.objects for delete to authenticated
using(bucket_id in ('business-logos','business-covers','business-gallery','post-media','story-media','deal-media') and public.can_write_business_path(name));

create policy private_user_media_insert on storage.objects for insert to authenticated
with check(bucket_id in ('message-media','review-media') and public.is_own_user_path(name));
create policy private_user_media_update on storage.objects for update to authenticated
using(bucket_id in ('message-media','review-media') and owner_id = auth.uid() and public.is_own_user_path(name))
with check(bucket_id in ('message-media','review-media') and public.is_own_user_path(name));
create policy private_user_media_delete on storage.objects for delete to authenticated
using(bucket_id in ('message-media','review-media') and owner_id = auth.uid());
create policy message_media_participant_read on storage.objects for select to authenticated
using(bucket_id = 'message-media' and exists(select 1 from public.messages m where m.media_path = name and public.can_access_conversation(m.conversation_id)));
create policy review_media_read on storage.objects for select to authenticated
using(bucket_id = 'review-media' and exists(select 1 from public.reviews r where r.photo_path = name and (r.status = 'approved' or r.customer_id = auth.uid() or public.is_admin())));

commit;
