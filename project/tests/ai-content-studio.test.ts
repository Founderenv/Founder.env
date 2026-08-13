import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const originalMigration=readFileSync(new URL('../supabase/migrations/20260815100000_ai_content_studio.sql',import.meta.url),'utf8');
const quotaMigration=readFileSync(new URL('../supabase/migrations/20260815110000_ai_content_daily_limit_five.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/ai-content-studio/index.ts',import.meta.url),'utf8');
const provider=readFileSync(new URL('../supabase/functions/ai-content-studio/mockProvider.ts',import.meta.url),'utf8');
const renderer=readFileSync(new URL('../src/features/ai-content/posterRenderer.ts',import.meta.url),'utf8');
const service=readFileSync(new URL('../src/services/aiContentService.ts',import.meta.url),'utf8');
const sharing=readFileSync(new URL('../src/features/ai-content/sharePoster.ts',import.meta.url),'utf8');
const studio=readFileSync(new URL('../src/pages/owner/AIContentStudioPage.tsx',import.meta.url),'utf8');
const dashboard=readFileSync(new URL('../src/pages/owner/BusinessDashboard.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');

test('new migration changes the centralized owner quota to five without rewriting the applied migration',()=>{
  assert.match(originalMigration,/then 1 else 0 end/i);
  assert.match(quotaMigration,/create or replace function public\.ai_content_daily_limit/i);
  assert.match(quotaMigration,/then 5 else 0 end/i);
  assert.match(quotaMigration,/public\.owns_business\(target_business_id\)/i);
  assert.match(quotaMigration,/grant execute[\s\S]*authenticated/i);
});
test('five slots are race-safe, same-day bounded, and the next India date gets a fresh lock key',()=>{
  assert.match(originalMigration,/unique \(business_id, generation_date, quota_slot\)/i);
  assert.match(originalMigration,/pg_advisory_xact_lock/i);
  assert.match(originalMigration,/owned_business\.id::text \|\| ':' \|\| today_ist::text/i);
  assert.match(originalMigration,/where business_id=owned_business\.id and generation_date=today_ist/i);
  assert.match(originalMigration,/if used_count >= daily_limit/i);
});
test('retries are idempotent and failed generations release their reserved slot',()=>{
  assert.match(originalMigration,/unique \(business_id, request_id\)/i);
  assert.match(originalMigration,/where business_id=owned_business\.id and request_id=target_request_id/i);
  assert.match(originalMigration,/delete from public\.ai_content_generations where id=target_generation_id and status='generating'/i);
  assert.match(edge,/release_ai_content_generation/);
});
test('remaining count is based on successful daily history and a server-fetched limit',()=>{
  assert.match(service,/rpc\('ai_content_daily_limit'/);
  assert.match(service,/filter\(item=>item\.generationDate===today\)\.length/);
  assert.match(service,/Math\.max\(0,limit-this\.usedCountToday/);
  assert.match(studio,/\{remaining\} of \{dailyLimit\} creations remaining today/);
});
test('owner isolation and server-bound business memory remain enforced',()=>{
  assert.match(originalMigration,/user_id = \(select auth\.uid\(\)\) and public\.owns_business\(business_id\)/i);
  assert.match(originalMigration,/grant execute[\s\S]*?complete_ai_content_generation[\s\S]*?service_role/i);
  assert.match(edge,/\.eq\('id',reservation\.business_id\)\.eq\('owner_id',userData\.user\.id\)/);
  assert.match(edge,/services_summary,address,location,city,state,phone,whatsapp,website_url,instagram_url/);
});
test('renderer has five distinct composition systems and seeded category-aware variation',()=>{
  for(const name of ['offerLayout','productLayout','festivalLayout','dailyLayout','announcementLayout'])assert.match(renderer,new RegExp(`function ${name}`));
  assert.match(renderer,/layoutFor\(generation\)/);
  assert.match(renderer,/seeded\(seed\)/);
  assert.match(provider,/categoryGroup/);
  assert.match(provider,/variant:seed%4/);
});
test('exact business identity, contact, location and optional logo are rendered',()=>{
  for(const field of ['businessName','address','location','whatsapp','phone','website','instagram','logo'])assert.match(renderer,new RegExp(field,'i'));
  assert.match(renderer,/drawContain\(ctx,logo/);
  assert.match(renderer,/address\.toLowerCase\(\)!==location\.toLowerCase\(\)/);
});
test('text fitting supports bounded multilingual wrapping and 1080 PNG export',()=>{
  assert.match(renderer,/export const POSTER_SIZE=1080/);
  assert.match(renderer,/Noto Sans Devanagari/);
  assert.match(renderer,/minSize/);
  assert.match(renderer,/maxLines/);
  assert.match(renderer,/measureText/);
  assert.match(renderer,/image\/png/);
});
test('native sharing attaches a PNG and cancellation is handled separately',()=>{
  assert.match(sharing,/new File\(\[blob\]/);
  assert.match(sharing,/type:'image\/png'/);
  assert.match(sharing,/canShare\(\{files:\[file\]\}\)/);
  assert.match(sharing,/share\(\{files:\[file\]/);
  assert.match(sharing,/error\.name==='AbortError'/);
  assert.match(studio,/Poster downloaded and caption copied\. Attach the downloaded poster in WhatsApp\./);
});
test('history uses real poster previews and reopening does not call generation',()=>{
  assert.match(studio,/function HistoryPreview/);
  assert.match(studio,/renderPoster\(generation\)/);
  assert.match(studio,/onClick=\{\(\)=>onSelect\(item\)\}/);
});
test('dashboard promotion is removed while Studio route and navigation remain',()=>{
  assert.doesNotMatch(dashboard,/AI Content Studio|AIOrb|\/owner\/ai-content/);
  assert.match(app,/path="\/owner\/ai-content"/);
});
