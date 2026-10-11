import {test,expect} from '@playwright/test';
test('learn, earn, build, buy, and retain progress',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173');
 await expect(page.locator('canvas')).toBeVisible();
 await expect(page.locator('#fallback')).toBeHidden();
 await page.locator('[data-activity="farm"]').first().click();
 for(const word of ['sheep','cow','pig']){
  await page.locator(`[data-answer="${word}"]`).click();
  await expect(page.locator('.feedback')).toContainText('5 gems');
  if(word!=='pig')await page.locator('#next').click();
 }
 await page.locator('#close').click();
 await expect(page.locator('#gems')).toHaveText('15');
 await page.locator('#build').click();await page.locator('#house').click();
 await page.locator('[data-tab="shop"]').click();await page.locator('[data-buy="pet"]').click();
 await expect(page.locator('[data-buy="pet"]')).toHaveText('Owned');
 await expect(page.locator('#gems')).toHaveText('0');
 await page.reload();await expect(page.locator('#learned')).toHaveText('3 / 12');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wordwood-v1')));
 expect(saved.blocks).toHaveLength(1);expect(saved.house).toBe(true);expect(saved.purchases).toContain('pet');
 await page.locator('[data-activity="phonics"]').click();await page.locator('[data-answer="map"]').click();await expect(page.locator('#gems')).toHaveText('5');
 await page.locator('#close').click();await page.locator('[data-activity="monster"]').click();await page.locator('[data-answer="red"]').click();await expect(page.locator('#gems')).toHaveText('10');
 await page.locator('#close').click();
 await page.screenshot({path:'/tmp/wordwood.png',fullPage:true});expect(errors).toEqual([]);
});
