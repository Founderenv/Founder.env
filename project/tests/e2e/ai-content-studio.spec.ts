import { expect, test } from '@playwright/test';

for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){
  test(`${viewport.name} AI Content Studio generates a responsive poster`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/owner/ai-content');
    await expect(page.getByRole('heading',{name:'AI Content Studio'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Create something for your business'}).filter({visible:true})).toBeVisible();
    await page.getByPlaceholder("Create today's post...").filter({visible:true}).fill('Promote our weekend coffee special');
    await page.getByRole('button',{name:'Generate content'}).filter({visible:true}).click();
    await expect(page.getByLabel('Generated poster for Cafe Aroma').filter({visible:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Download'}).filter({visible:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'WhatsApp'}).filter({visible:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  });
}

test('business onboarding no longer asks for a template or theme',async({page})=>{
  await page.goto('/business/onboarding');
  await expect(page.getByText('1 / 10',{exact:true}).filter({visible:true})).toBeVisible();
  await expect(page.getByText('Template',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Profile theme',{exact:true})).toHaveCount(0);
});
