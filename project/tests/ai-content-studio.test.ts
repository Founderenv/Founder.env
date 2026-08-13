import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration=readFileSync(new URL('../supabase/migrations/20260815100000_ai_content_studio.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/ai-content-studio/index.ts',import.meta.url),'utf8');
const renderer=readFileSync(new URL('../src/features/ai-content/posterRenderer.ts',import.meta.url),'utf8');
const onboarding=readFileSync(new URL('../src/pages/owner/OnboardingPage.tsx',import.meta.url),'utf8');
const editor=readFileSync(new URL('../src/pages/owner/OwnerEditPage.tsx',import.meta.url),'utf8');

test('one free generation uses a server date and one quota slot',()=>{
  assert.match(migration,/generation_date date not null default \(timezone\('Asia\/Kolkata', now\(\)\)\)::date/i);
  assert.match(migration,/unique \(business_id, generation_date, quota_slot\)/i);
  assert.match(migration,/then 1 else 0 end/i);
});
test('a second same-day request is blocked while the next date has a fresh key',()=>{
  assert.match(migration,/where business_id=owned_business\.id and generation_date=today_ist/i);
  assert.match(migration,/daily_generation_limit_reached/i);
  assert.match(migration,/owned_business\.id::text \|\| ':' \|\| today_ist::text/i);
});
test('simultaneous generation is serialized and retry ids are idempotent',()=>{
  assert.match(migration,/pg_advisory_xact_lock/i);
  assert.match(migration,/unique \(business_id, request_id\)/i);
  assert.match(migration,/where business_id=owned_business\.id and request_id=target_request_id/i);
});
test('owners can read only their own business generations',()=>{
  assert.match(migration,/user_id = \(select auth\.uid\(\)\) and public\.owns_business\(business_id\)/i);
  assert.match(migration,/revoke all on function public\.complete_ai_content_generation[\s\S]*?grant execute[\s\S]*?to service_role/i);
});
test('server business context is bound to authenticated ownership',()=>{
  assert.match(edge,/\.eq\('id',reservation\.business_id\)\.eq\('owner_id',userData\.user\.id\)/);
  assert.match(edge,/services_summary,address,location,city,state,phone,whatsapp,website_url,instagram_url/);
});
test('deterministic renderer uses stored exact contact and address fields',()=>{
  assert.match(renderer,/data\.whatsapp\|\|data\.phone/);
  assert.match(renderer,/contact\|\|data\.address/);
  assert.doesNotMatch(renderer,/AI_TEXT_API_KEY|AI_IMAGE_API_KEY/);
});
test('theme and template selection no longer block onboarding or editing',()=>{
  assert.doesNotMatch(onboarding,/templateService|Profile theme|ChoiceGrid values=\{templates/);
  assert.doesNotMatch(editor,/templateService|Profile theme|<span className="label">Template/);
  assert.match(onboarding,/templateId: 'minimal_premium'/);
});
test('legacy theme columns remain untouched for existing records',()=>{
  assert.doesNotMatch(migration,/drop column.*theme|drop table.*business_templates/i);
});
test('poster output is high-resolution PNG ready',()=>{
  assert.match(renderer,/const SIZE=1080/);
  assert.match(renderer,/image\/png/);
});
