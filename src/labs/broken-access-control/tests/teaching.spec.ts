import {test,expect} from '@playwright/test';
import {APP} from '../../../../tests/browser.js';
import {quickTour} from '../../../shared/quick-tour.js';
import {lessonGuidance} from '../../../shared/lesson-guidance.js';

test('quick review totals thirty minutes and each link opens the named experiment',async({page})=>{
 expect(quickTour.reduce((total,item)=>total+item.minutes,4)).toBe(30);
 for(const item of quickTour){
  await page.goto(APP);await page.getByText('30-minute guided review · one check per lab',{exact:true}).click();
  await page.getByRole('link',{name:item.title+' · '+item.minutes+' minutes',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Select Experiment'})).toHaveValue(item.experiment);
  await page.getByRole('button',{name:'Explore freely'}).click();
  await expect(page.getByRole('complementary',{name:'Evidence checklist'})).toContainText(lessonGuidance[item.experiment].trace);
 }
});
test('practice is optional, retains ten attempts and survives reload',async({page})=>{
 await page.goto(APP+'/?lab=broken-access-control&experiment=access-files');
 const practice=page.getByRole('region',{name:'Practice and review'});
 await expect(practice.getByRole('radio')).toHaveCount(0);
 await practice.getByText('Practice and review · optional after your experiment',{exact:true}).click();
 for(let i=0;i<12;i++){await practice.getByRole('radio').nth(i%2).check();await practice.getByRole('button',{name:'Check my reasoning'}).click();}
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('security_lab_learner_progress_v2')||'{}')['broken-access-control']['access-files'].conceptAttempts.length)).toBe(10);
 await page.reload();await practice.getByText('Recent reasoning attempts (10, last 10 retained)',{exact:true}).click();
 await expect(practice.locator('ol li')).toHaveCount(10);
});
test('expanded tour and scope guide fit four widths and both themes',async({page})=>{
 await page.goto(APP+'/?lab=cookie-storage&experiment=exp4-scope-boundaries');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByText('30-minute guided review · one check per lab',{exact:true}).click();
 await page.getByText('Cookie scope at a glance',{exact:true}).click();
 for(const width of [375,768,1280,1920]){await page.setViewportSize({width,height:900});for(const theme of ['light','dark']){
  await page.getByRole('combobox',{name:'Reading theme'}).selectOption(theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }}
 await page.getByText('Cookie scope at a glance',{exact:true}).focus();await page.keyboard.press('Enter');
 expect(await page.evaluate(()=>getComputedStyle(document.activeElement!).outlineStyle)).not.toBe('none');
});
