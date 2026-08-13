import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const envFile=existsSync('.env.local')?readFileSync('.env.local','utf8'):'';
const env={...process.env,...Object.fromEntries(envFile.split(/\r?\n/).filter(Boolean).map((line)=>{const separator=line.indexOf('=');return[line.slice(0,separator),line.slice(separator+1)];}))};
const headers={apikey:env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${env.VITE_SUPABASE_ANON_KEY}`};

test('customer wallet, fuzzy search and persisted business messaging',async({page,request})=>{
  test.setTimeout(90_000);
  const businessResponse=await request.get(`${env.VITE_SUPABASE_URL}/rest/v1/business_public?select=name,username&limit=1`,{headers});
  expect(businessResponse.ok()).toBe(true);
  const[business]=await businessResponse.json() as Array<{name:string;username:string}>;
  expect(business).toBeTruthy();

  const stamp=Date.now();
  await page.goto('/auth?mode=signup');
  await page.getByPlaceholder('Your name').filter({visible:true}).fill('Realtime Wallet Tester');
  await page.getByPlaceholder('Email address').filter({visible:true}).fill(`codex.realtime.${stamp}@example.com`);
  await page.getByPlaceholder('Password').filter({visible:true}).fill(`Runtime-${stamp}-Pass!`);
  await page.getByRole('button',{name:'Create customer account',exact:true}).filter({visible:true}).click();
  await expect(page).toHaveURL(/\/customer$/);
  await expect(page.getByText('0.00 FE',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('No FE Coin activity yet.').filter({visible:true})).toBeVisible();

  await page.goto('/explore');
  const search=page.getByLabel('Search Founder.env').filter({visible:true});
  await search.fill(business.name.slice(0,Math.min(3,business.name.length)));
  await expect(page.locator(`a[href="/business/${business.username}"]`).first()).toBeVisible();

  await page.goto('/messages');
  await page.getByPlaceholder('Search businesses...').filter({visible:true}).fill(business.name);
  const starter=page.getByText(business.name,{exact:true}).filter({visible:true}).first();
  await expect(starter).toBeVisible();
  await starter.click();
  await expect(page.getByPlaceholder('Type a message...').filter({visible:true})).toBeVisible();
  const message=`Persistence check ${stamp}`;
  await page.getByPlaceholder('Type a message...').filter({visible:true}).fill(message);
  await page.getByRole('button',{name:'Send message'}).filter({visible:true}).click();
  await expect(page.getByText(message,{exact:true}).filter({visible:true})).toBeVisible();
  await page.reload();
  await page.getByText(business.name,{exact:true}).filter({visible:true}).first().click();
  await expect(page.getByText(message,{exact:true}).filter({visible:true})).toBeVisible();

  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});
