import { expect, test } from '@playwright/test';

async function generate(page:import('@playwright/test').Page,prompt='Promote our weekend coffee special'){
  await page.getByPlaceholder("Create today's post...").filter({visible:true}).fill(prompt);
  await page.getByRole('button',{name:'Generate content'}).filter({visible:true}).click();
  await expect(page.getByLabel('Generated poster for Cafe Aroma').filter({visible:true})).toBeVisible();
}

for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){
  test(`${viewport.name} AI Content Studio generates a responsive premium poster`,async({page})=>{
    await page.setViewportSize(viewport);await page.goto('/owner/ai-content',{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('heading',{name:'AI Content Studio'})).toBeVisible();
    await expect(page.getByText('5 of 5 creations remaining today').filter({visible:true})).toBeVisible();
    await generate(page);
    await expect(page.getByRole('button',{name:'Share Poster'}).filter({visible:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Download PNG'}).filter({visible:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'WhatsApp'}).filter({visible:true})).toBeVisible();
    await expect(page.getByText('4 of 5 creations remaining today').filter({visible:true}).first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  });
}

test('five generations succeed and a sixth is blocked for the India calendar day',async({page})=>{
  test.setTimeout(90_000);await page.goto('/owner/ai-content',{waitUntil:'domcontentloaded'});
  for(let index=1;index<=5;index++){await generate(page,`Campaign variation ${index} for our cafe`);if(index<5)await page.getByRole('button',{name:'Create another idea'}).click();}
  await expect(page.getByText('0 of 5 creations remaining today').filter({visible:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Back to Studio'}).click();
  await expect(page.getByRole('heading',{name:"You've used today's 5 free creations."})).toBeVisible();
  await expect(page.getByRole('button',{name:'Generate content'})).toHaveCount(0);
});

test('native share path includes the generated PNG file',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:(data:ShareData)=>Boolean(data.files?.length)});Object.defineProperty(navigator,'share',{configurable:true,value:async(data:ShareData)=>{(window as unknown as{shared?:{count:number;type:string}}).shared={count:data.files?.length||0,type:data.files?.[0]?.type||''};}});});
  await page.goto('/owner/ai-content',{waitUntil:'domcontentloaded'});await generate(page);await page.getByRole('button',{name:'Share Poster'}).evaluate((button:HTMLButtonElement)=>button.click());
  await expect(page.getByText('Poster image shared.')).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as{shared?:unknown}).shared)).toEqual({count:1,type:'image/png'});
});

test('cancelling the native share sheet is not reported as an error',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelled','AbortError');}});});
  await page.goto('/owner/ai-content',{waitUntil:'domcontentloaded'});await generate(page);await page.getByRole('button',{name:'Share Poster'}).evaluate((button:HTMLButtonElement)=>button.click());
  await expect(page.getByText('Sharing is unavailable right now.')).toHaveCount(0);
});

test('a new India calendar date resets the client remaining count',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});const remaining=await page.evaluate(async()=>{const{AIContentService}=await import('/src/services/aiContentService.ts');return AIContentService.remainingToday([{generationDate:'2026-08-13'}] as never,5,'2026-08-14');});expect(remaining).toBe(5);
});

test('unsupported WhatsApp sharing truthfully downloads, copies, and opens WhatsApp',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});Object.defineProperty(navigator,'share',{configurable:true,value:async()=>undefined});Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:async()=>undefined});window.open=((url?:string|URL)=>{(window as unknown as{opened?:string}).opened=String(url);return null;}) as typeof window.open;});
  await page.goto('/owner/ai-content',{waitUntil:'domcontentloaded'});await generate(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'WhatsApp'}).click();await download;
  await expect(page.getByText('Poster downloaded and caption copied. Attach the downloaded poster in WhatsApp.')).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as{opened?:string}).opened?.startsWith('https://wa.me/'))).toBe(true);
});

test('opening a visual history card does not consume quota',async({page})=>{
  await page.goto('/owner/ai-content',{waitUntil:'domcontentloaded'});await generate(page,'First campaign');await page.getByRole('button',{name:'Create another idea'}).click();await generate(page,'Second campaign');
  await expect(page.getByText('3 of 5 creations remaining today').filter({visible:true}).first()).toBeVisible();
  const cards=page.locator('aside button');await expect(cards).toHaveCount(2);await cards.nth(1).click();
  await expect(page.getByText('3 of 5 creations remaining today').filter({visible:true}).first()).toBeVisible();
});

test('owner dashboard has no AI promotion while Studio route remains available',async({page})=>{
  await page.goto('/business/dashboard',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'Founder dashboard'})).toBeVisible();await expect(page.getByText('AI Content Studio',{exact:true})).toHaveCount(0);
  await page.goto('/owner/ai-content',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'AI Content Studio'})).toBeVisible();
});

test('business onboarding no longer asks for a template or theme',async({page})=>{await page.goto('/business/onboarding',{waitUntil:'domcontentloaded'});await expect(page.getByText('1 / 10',{exact:true}).filter({visible:true})).toBeVisible();await expect(page.getByText('Template',{exact:true})).toHaveCount(0);await expect(page.getByText('Profile theme',{exact:true})).toHaveCount(0);});
