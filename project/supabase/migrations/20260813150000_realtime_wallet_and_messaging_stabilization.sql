-- Scoped helpers for zero-balance wallets and one-thread-per customer/business messaging.
begin;

create or replace function public.ensure_my_fe_coin_account(target_business_id uuid default null)
returns public.fe_coin_accounts
language plpgsql security definer set search_path = public, pg_temp as $$
declare account_row public.fe_coin_accounts;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_business_id is null then
    if not public.is_customer() then raise exception 'customer account required' using errcode = '42501'; end if;
    insert into public.fe_coin_accounts(user_id, account_type) values(auth.uid(), 'customer') on conflict do nothing;
    select * into account_row from public.fe_coin_accounts where user_id=auth.uid() and account_type='customer' and business_id is null;
  else
    if not public.owns_business(target_business_id) then raise exception 'business ownership required' using errcode = '42501'; end if;
    insert into public.fe_coin_accounts(user_id,business_id,account_type) values(auth.uid(),target_business_id,'business') on conflict do nothing;
    select * into account_row from public.fe_coin_accounts where user_id=auth.uid() and business_id=target_business_id and account_type='business';
  end if;
  return account_row;
end $$;

create or replace function public.start_conversation(target_business_id uuid, target_customer_id uuid default null)
returns public.conversations
language plpgsql security definer set search_path = public, pg_temp as $$
declare customer_user_id uuid; conversation_row public.conversations;
begin
  if public.is_customer() then
    if target_customer_id is not null and target_customer_id <> auth.uid() then raise exception 'invalid customer' using errcode='42501'; end if;
    if not public.is_public_business(target_business_id) then raise exception 'business unavailable' using errcode='42501'; end if;
    customer_user_id := auth.uid();
  elsif public.owns_business(target_business_id) then
    customer_user_id := target_customer_id;
    if customer_user_id is null or not exists(select 1 from public.profiles where id=customer_user_id and role='customer' and status='active') then raise exception 'customer unavailable' using errcode='42501'; end if;
    if not exists(select 1 from public.business_followers where business_id=target_business_id and customer_id=customer_user_id)
       and not exists(select 1 from public.conversations where business_id=target_business_id and customer_id=customer_user_id) then
      raise exception 'owner may message followers or existing customers only' using errcode='42501';
    end if;
  else raise exception 'conversation access denied' using errcode='42501';
  end if;
  insert into public.conversations(business_id,customer_id) values(target_business_id,customer_user_id)
  on conflict(business_id,customer_id) do update set updated_at=public.conversations.updated_at
  returning * into conversation_row;
  return conversation_row;
end $$;

revoke all on function public.ensure_my_fe_coin_account(uuid), public.start_conversation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ensure_my_fe_coin_account(uuid), public.start_conversation(uuid,uuid) to authenticated;
commit;
