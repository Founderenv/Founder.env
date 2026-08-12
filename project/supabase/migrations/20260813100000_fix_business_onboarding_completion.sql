begin;

-- The profile protection trigger previously restored onboarding_complete for
-- every authenticated update. SECURITY DEFINER completion RPCs still execute
-- with auth.role() = authenticated, so their successful update was silently
-- undone. Column grants already prevent clients from updating this field.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin(auth.uid()) then
    new.role = old.role;
    new.status = old.status;
    new.email_private = old.email_private;
    -- Do not allow a completed owner to be made incomplete by a client update.
    -- The false -> true transition is performed only by the secure completion RPC.
    if old.onboarding_complete and not new.onboarding_complete then
      new.onboarding_complete = old.onboarding_complete;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.complete_business_onboarding()
returns public.profiles language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'business_owner' and p.status = 'active'
  ) then
    raise exception 'business owner account required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.owner_id = auth.uid()
      and nullif(btrim(b.name), '') is not null
      and nullif(btrim(b.username::text), '') is not null
      and nullif(btrim(b.category), '') is not null
  ) then
    raise exception 'no completed business profile found' using errcode = '42501';
  end if;

  update public.profiles
  set onboarding_complete = true
  where id = auth.uid()
  returning * into result;

  if result.id is null or not result.onboarding_complete then
    raise exception 'could not persist onboarding completion' using errcode = 'P0001';
  end if;
  return result;
end;
$$;

revoke all on function public.complete_business_onboarding() from public, anon, authenticated, service_role;
grant execute on function public.complete_business_onboarding() to authenticated;

-- One-time recovery for records produced by the broken trigger. A business is
-- eligible only when it belongs to the owner and contains every required
-- persisted setup field; no business records are created, changed, or removed.
update public.profiles p
set onboarding_complete = true
where p.role = 'business_owner'
  and p.status = 'active'
  and p.onboarding_complete = false
  and exists (
    select 1 from public.businesses b
    where b.owner_id = p.id
      and nullif(btrim(b.name), '') is not null
      and nullif(btrim(b.username::text), '') is not null
      and nullif(btrim(b.category), '') is not null
  );

commit;
