import {test,expect} from '@playwright/test';
test('bundled English audio plays without speech synthesis and repeats',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{value:undefined});const Original=window.Audio;window.__clips=[];window.Audio=function(...args){const clip=new Original(...args);window.__clips.push(clip);return clip;};});
 await page.goto('http://127.0.0.1:5173');
 await page.locator('[data-activity="farm"]').first().click();
 await expect.poll(()=>page.evaluate(()=>window.__clips.some(c=>c.currentTime>0&&c.duration>0))).toBe(true);
 expect(await page.evaluate(()=>window.__clips.at(-1).src)).toContain('/audio/find-sheep.mp3');
 await page.locator('#listen').click();await expect.poll(()=>page.evaluate(()=>window.__clips.length)).toBe(2);
 await page.locator('#close').click();await expect.poll(()=>page.evaluate(()=>window.__clips.every(c=>c.paused))).toBe(true);
 await page.locator('#sound').click();await page.locator('[data-activity="phonics"]').click();expect(await page.evaluate(()=>window.__clips.length)).toBe(2);
 await page.locator('#close').click();await page.locator('#sound').click();
 await expect.poll(()=>page.evaluate(()=>window.__clips.at(-1).currentTime)).toBeGreaterThan(0);
});
test('blocked playback gives a retry message',async({page})=>{
 await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Blocked','NotAllowedError'));};});
 await page.goto('http://127.0.0.1:5173');await page.locator('[data-activity="farm"]').first().click();
 await expect(page.locator('#toast')).toHaveText('Tap Listen again to allow sound.');
});
