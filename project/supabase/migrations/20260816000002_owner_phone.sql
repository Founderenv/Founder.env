-- Require a validated owner mobile number before Cashfree checkout.
--
-- Cashfree rejects POST /subscriptions with a 400 when customer_phone is
-- empty. This adds a PRIVATE owner phone column to profiles (kept separate
-- from the public businesses.phone contact field) and a security-definer RPC
-- for the owner to set only their own phone, with server-side validation and
-- normalisation to Cashfree's expected customer_phone format (10-digit Indian
-- mobile, no +91 prefix).

begin;

-- Private owner mobile used for payment / mandate KYC. Not exposed through
-- public views/contracts; only the owner can write it via save_owner_phone.
alter table public.profiles add column if not exists phone text;

-- Validate + normalise an Indian mobile and persist it on the caller's OWN
-- profile row only. Accepts various input shapes (10 digits, +91-prefixed,
-- with spaces/dashes) and stores the plain 10-digit form Cashfree expects for
-- customer_phone. Raises on empty/invalid input so a bad value is never stored.
create or replace function public.save_owner_phone(target_phone text)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  digits text;
  result public.profiles;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;

  digits := regexp_replace(coalesce(target_phone, ''), '\D', '', 'g');

  -- Drop an optional leading country codes / trunk prefixes: +91, 91, 0.
  if digits ~ '^91[6-9][0-9]{9}$' then
    digits := substring(digits from 3);
  elsif digits ~ '^0[6-9][0-9]{9}$' then
    digits := substring(digits from 2);
  end if;

  if not (digits ~ '^[6-9][0-9]{9}$') then
    raise exception 'valid 10-digit Indian mobile number required' using errcode = '22023';
  end if;

  update public.profiles
     set phone = digits, updated_at = timezone('utc', now())
   where id = auth.uid()
  returning * into result;

  if result is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

revoke all on function public.save_owner_phone(text) from public, anon, authenticated;
grant execute on function public.save_owner_phone(text) to authenticated;

commit;
