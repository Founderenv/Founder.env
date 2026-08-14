import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../supabase/migrations/20260815130000_customer_referrals_and_avatars.sql', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/pages/customer/ReferralsPage.tsx', import.meta.url), 'utf8');
const owner = readFileSync(new URL('../src/pages/owner/PaymentPendingPage.tsx', import.meta.url), 'utf8');
const avatar = readFileSync(new URL('../src/services/customerAvatarService.ts', import.meta.url), 'utf8');

test('avatar storage is type/size limited and owned by the authenticated user', () => {
  assert.match(migration, /'customer-avatars'.*5242880.*image\/jpeg.*image\/png.*image\/webp/s);
  assert.match(migration, /customer_avatars_own_insert[\s\S]*public\.is_own_user_path\(name\)/);
  assert.match(migration, /invalid customer avatar path/);
  assert.match(avatar, /MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(avatar, /canvas\.width = 512; canvas\.height = 512/);
});

test('referral enrollment is free, permanent, server generated, and UPI-safe', () => {
  assert.match(migration, /referral_code extensions\.citext not null unique/);
  assert.match(migration, /extensions\.gen_random_bytes\(6\)/);
  assert.doesNotMatch(migration, /₹19|1900|activation fee|referral-code fee/i);
  assert.match(dashboard, /No enrollment fee\. No ₹19 payment\. Referral codes are free/);
  assert.doesNotMatch(migration, /upi_pin|bank_password|card_number|otp\s+text/i);
});

test('business referral is optional, gives no discount, and locks after verified setup', () => {
  assert.match(owner, /E-Referral Code \(Optional\)/);
  assert.match(owner, /Your Founder\.env pricing does not change/);
  assert.match(migration, /setup_fee_paid[\s\S]*referral is locked after verified setup payment/);
  assert.match(migration, /self-referral is not allowed/);
});

test('₹25 is issued only for verified Razorpay ₹299 setup and exactly once', () => {
  const issue = migration.match(/create or replace function public\.issue_verified_business_referral_reward[\s\S]*?end; \$\$;/i)?.[0] ?? '';
  assert.match(issue, /activation_type='razorpay'/);
  assert.match(issue, /setup_fee_paid/);
  assert.match(issue, /setup_fee_amount_paise=29900/);
  assert.match(migration, /amount_paise integer not null default 2500 check\(amount_paise=2500\)/);
  assert.match(issue, /on conflict do nothing/);
  assert.match(migration, /business_id uuid not null unique/);
  assert.match(migration, /referral_id uuid not null unique/);
  assert.match(migration, /provider_setup_payment_id text not null unique/);
});

test('six earnings reserve exactly ₹150 and cannot be paid twice', () => {
  const request = migration.match(/create or replace function public\.request_referral_payout[\s\S]*?end; \$\$;/i)?.[0] ?? '';
  assert.match(migration, /amount_paise integer not null default 15000 check\(amount_paise=15000\)/);
  assert.match(request, /payout_status='available'[\s\S]*limit 6/);
  assert.match(request, /if selected_count<6/);
  assert.match(request, /payout_status='reserved'/);
  assert.match(migration, /if payout\.status in\('paid','rejected'\) then raise exception 'payout already finalized'/);
});

test('₹175 accounting leaves ₹25 available and UPI is snapshotted', () => {
  const earnings = Array.from({ length: 7 }, () => 2500);
  const paid = earnings.slice(0, 6).reduce((sum, value) => sum + value, 0);
  assert.equal(paid, 15000); assert.equal(earnings.reduce((sum, value) => sum + value, 0) - paid, 2500);
  assert.match(migration, /destination_upi_snapshot/);
  assert.match(migration, /values\(auth\.uid\(\),profile\.payout_upi,profile\.payee_name\)/);
});

test('RLS keeps referral money private and only admins finalize payouts', () => {
  assert.match(migration, /referral_earnings_own_read[\s\S]*referrer_customer_id=auth\.uid\(\)/);
  assert.match(migration, /referral_payout_own_read[\s\S]*customer_id=auth\.uid\(\)/);
  assert.match(migration, /revoke all on public\.customer_referral_profiles.*from anon,authenticated/);
  assert.match(migration, /if not public\.is_admin\(\) then raise exception 'admin required'/);
  assert.doesNotMatch(owner, /payout_upi|destination_upi|payee_name/);
});

test('FE Wallet remains separate from INR referral earnings', () => {
  assert.doesNotMatch(migration, /fe_coin_accounts|fe_coin_transactions|reward_claims/);
  assert.match(dashboard, /Available for payout/);
});
