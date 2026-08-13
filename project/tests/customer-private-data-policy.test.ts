import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration=readFileSync(new URL('../supabase/migrations/20260814150000_fix_customer_private_data_isolation.sql',import.meta.url),'utf8');
const billingService=readFileSync(new URL('../src/services/v2Service.ts',import.meta.url),'utf8');
const notificationService=readFileSync(new URL('../src/services/supabaseServices.ts',import.meta.url),'utf8');

test('legacy arbitrary-customer wallet RPC is unavailable to clients',()=>{
  assert.match(migration,/revoke all on function public\.v2_customer_account\(uuid\) from public, anon, authenticated/i);
  assert.match(migration,/grant execute on function public\.v2_customer_account\(uuid\) to service_role/i);
});

test('Google identities cannot self-select the business-owner role',()=>{
  assert.match(migration,/auth_provider = 'email' and requested = 'business_owner'/i);
  assert.match(migration,/business owners must register with email and password/i);
});

test('private-table policies bind customers to auth.uid and owners to owned businesses',()=>{
  for(const table of ['bill_requests','bills','customer_business_relationships']){
    assert.match(migration,new RegExp(`create policy ${table === 'customer_business_relationships' ? 'relationships' : table}_customer_select[\\s\\S]*?auth\\.uid\\(\\)`,'i'));
  }
  assert.match(migration,/notifications_own_read[\s\S]*?recipient_user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration,/coin_accounts_participant_select[\s\S]*?user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration,/public\.owns_business\(business_id\)/i);
});

test('browser reads add explicit authenticated identity filters',()=>{
  assert.match(billingService,/\.eq\('customer_id',customerId\)/);
  assert.match(billingService,/\.eq\('business_id',\s*businessId\)\.eq\('customer_id',customerId\)/);
  assert.match(notificationService,/\.eq\('recipient_user_id',id\)/);
  assert.match(notificationService,/recipient_user_id=eq\.\$\{recipientId\}/);
});
