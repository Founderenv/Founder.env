begin;

create or replace function public.enforce_active_business_billing()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.businesses b
    where b.id = new.business_id
      and b.is_active
      and b.lifecycle in ('active', 'grace_period', 'lite')
  ) then
    raise exception 'billing is available only for active businesses' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists bill_requests_require_active_business on public.bill_requests;
create trigger bill_requests_require_active_business
before insert on public.bill_requests
for each row execute function public.enforce_active_business_billing();

drop trigger if exists bills_require_active_business on public.bills;
create trigger bills_require_active_business
before insert on public.bills
for each row execute function public.enforce_active_business_billing();

revoke all on function public.enforce_active_business_billing() from public, anon, authenticated;

commit;
