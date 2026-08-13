begin;

alter table public.businesses
  add column if not exists services_summary text not null default '',
  add column if not exists preferred_content_language text not null default 'Auto'
    check (preferred_content_language in ('Auto','English','Hindi','Marathi'));

create table public.ai_content_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete cascade,
  request_id uuid not null,
  generation_type text not null check (generation_type in ('today','offer','festival','product_service','announcement','custom')),
  prompt text not null check (char_length(prompt) between 1 and 600),
  caption text not null default '',
  headline text not null default '',
  supporting_text text not null default '',
  cta text not null default '',
  creative_spec jsonb not null default '{}'::jsonb,
  renderer_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  poster_path text,
  status text not null default 'generating' check (status in ('generating','completed')),
  generation_date date not null default (timezone('Asia/Kolkata', now()))::date,
  quota_slot smallint not null default 1 check (quota_slot > 0),
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  unique (business_id, request_id),
  unique (business_id, generation_date, quota_slot)
);

create index ai_content_generations_business_created_idx
  on public.ai_content_generations(business_id, created_at desc);
create index ai_content_generations_owner_date_idx
  on public.ai_content_generations(user_id, generation_date desc);

alter table public.ai_content_generations enable row level security;
create policy ai_content_generations_owner_read on public.ai_content_generations
  for select to authenticated
  using (user_id = (select auth.uid()) and public.owns_business(business_id));

create or replace function public.ai_content_daily_limit(target_business_id uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select case when public.owns_business(target_business_id) then 1 else 0 end;
$$;

create or replace function public.reserve_ai_content_generation(
  target_prompt text,
  target_generation_type text,
  target_request_id uuid
) returns public.ai_content_generations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owned_business public.businesses;
  today_ist date := (timezone('Asia/Kolkata', now()))::date;
  daily_limit integer;
  used_count integer;
  result public.ai_content_generations;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if target_request_id is null then raise exception 'request id required'; end if;
  if nullif(btrim(target_prompt), '') is null or char_length(btrim(target_prompt)) > 600 then
    raise exception 'prompt must contain 1 to 600 characters' using errcode = '22001';
  end if;
  if target_generation_type not in ('today','offer','festival','product_service','announcement','custom') then
    raise exception 'unsupported generation type' using errcode = '22023';
  end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and role='business_owner' and status='active') then
    raise exception 'business owner account required' using errcode = '42501';
  end if;

  select * into owned_business from public.businesses where owner_id=auth.uid();
  if owned_business.id is null then raise exception 'owned business not found' using errcode = 'P0002'; end if;

  perform pg_advisory_xact_lock(hashtextextended(owned_business.id::text || ':' || today_ist::text, 0));
  select * into result from public.ai_content_generations
    where business_id=owned_business.id and request_id=target_request_id;
  if result.id is not null then return result; end if;

  daily_limit := public.ai_content_daily_limit(owned_business.id);
  select count(*) into used_count from public.ai_content_generations
    where business_id=owned_business.id and generation_date=today_ist;
  if used_count >= daily_limit then
    raise exception 'daily_generation_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.ai_content_generations(user_id,business_id,request_id,generation_type,prompt,generation_date,quota_slot)
  values(auth.uid(),owned_business.id,target_request_id,target_generation_type,btrim(target_prompt),today_ist,used_count+1)
  returning * into result;
  return result;
end;
$$;

create or replace function public.complete_ai_content_generation(
  target_generation_id uuid,
  target_caption text,
  target_headline text,
  target_supporting_text text,
  target_cta text,
  target_creative_spec jsonb,
  target_renderer_data jsonb,
  target_metadata jsonb
) returns public.ai_content_generations
language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.ai_content_generations;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  update public.ai_content_generations set
    caption=left(coalesce(target_caption,''),2200),
    headline=left(coalesce(target_headline,''),100),
    supporting_text=left(coalesce(target_supporting_text,''),180),
    cta=left(coalesce(target_cta,''),80),
    creative_spec=coalesce(target_creative_spec,'{}'::jsonb),
    renderer_data=coalesce(target_renderer_data,'{}'::jsonb),
    metadata=coalesce(target_metadata,'{}'::jsonb),
    status='completed', completed_at=timezone('utc',now())
  where id=target_generation_id and status='generating'
  returning * into result;
  if result.id is null then raise exception 'generation reservation not found'; end if;
  return result;
end;
$$;

create or replace function public.release_ai_content_generation(target_generation_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  delete from public.ai_content_generations where id=target_generation_id and status='generating';
  return found;
end;
$$;

create or replace function public.attach_ai_content_poster(target_generation_id uuid, target_poster_path text)
returns public.ai_content_generations language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.ai_content_generations;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  update public.ai_content_generations g set poster_path=target_poster_path
  where g.id=target_generation_id and g.user_id=auth.uid() and public.owns_business(g.business_id)
    and target_poster_path=('business/' || g.business_id::text || '/' || g.id::text || '.png')
  returning * into result;
  if result.id is null then raise exception 'generation not found or poster path invalid' using errcode = '42501'; end if;
  return result;
end;
$$;

revoke all on function public.ai_content_daily_limit(uuid) from public,anon,authenticated,service_role;
grant execute on function public.ai_content_daily_limit(uuid) to authenticated;
revoke all on function public.reserve_ai_content_generation(text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.reserve_ai_content_generation(text,text,uuid) to authenticated;
revoke all on function public.complete_ai_content_generation(uuid,text,text,text,text,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.complete_ai_content_generation(uuid,text,text,text,text,jsonb,jsonb,jsonb) to service_role;
revoke all on function public.release_ai_content_generation(uuid) from public,anon,authenticated,service_role;
grant execute on function public.release_ai_content_generation(uuid) to service_role;
revoke all on function public.attach_ai_content_poster(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.attach_ai_content_poster(uuid,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ai-content-posters','ai-content-posters',false,8388608,array['image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy ai_content_posters_owner_read on storage.objects for select to authenticated
  using(bucket_id='ai-content-posters' and public.can_write_business_path(name));
create policy ai_content_posters_owner_insert on storage.objects for insert to authenticated
  with check(bucket_id='ai-content-posters' and public.can_write_business_path(name));
create policy ai_content_posters_owner_update on storage.objects for update to authenticated
  using(bucket_id='ai-content-posters' and public.can_write_business_path(name))
  with check(bucket_id='ai-content-posters' and public.can_write_business_path(name));

commit;
