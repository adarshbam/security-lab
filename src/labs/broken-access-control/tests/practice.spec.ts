import {test,expect} from '@playwright/test';
import {APP} from '../../../../tests/browser.js';
test('viewing a reference remains recorded after reload and incorrect checks are explicit',async({page})=>{
 await page.goto(APP+'/?lab=broken-access-control');
 const practice=page.getByRole('region',{name:'Practice and review'});
 await practice.getByText('Practice and review · optional after your experiment',{exact:true}).click();
 await practice.getByText('Show the reference explanation',{exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('security_lab_learner_progress_v2')||'{}')['broken-access-control']?.['access-files']?.referenceViewedAt)).toBeTruthy();
 await page.reload();
 await practice.getByRole('radio').first().check();await practice.getByRole('button',{name:'Check my reasoning'}).click();
 await expect(practice.getByRole('status')).toContainText('Revisit your reasoning.');
 await expect(practice.getByRole('status')).toContainText('after viewing help');
 await practice.getByRole('radio').nth(1).check();await practice.getByRole('button',{name:'Check my reasoning'}).click();
 await expect(practice.getByRole('status')).toContainText('Correct reasoning.');
 await practice.getByRole('textbox',{name:'Your explanation (keep credentials out)'}).fill('Recall after opening the reference');await practice.getByRole('button',{name:'Save my review'}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('security_lab_learner_progress_v2')||'{}')['broken-access-control']['access-files'].reviewResponses[0].withHelp)).toBe(true);
});
test('a recent review postpones recall even when the original check is old',async({page})=>{
 await page.goto(APP+'/?lab=broken-access-control');
 await page.evaluate(()=>localStorage.setItem('security_lab_learner_progress_v2',JSON.stringify({'broken-access-control':{'access-files':{currentStep:'understand',checkedAnswer:{id:'test',correct:true,withHelp:false,at:Date.now()-14*86400000},reviewResponses:[{answer:'Recent recall',at:Date.now(),withHelp:false}]}}})));
 await page.reload();const practice=page.getByRole('region',{name:'Practice and review'});
 await expect(practice).toContainText('You can also practice recall now.');
 await practice.getByRole('textbox',{name:'Your explanation (keep credentials out)'}).fill('Fresh recall evidence');await practice.getByRole('button',{name:'Save my review'}).click();
 await page.reload();await expect(practice).toContainText('2 review responses saved locally');await expect(practice).not.toContainText('A review is suggested now.');
});

test('a new concept check also resets recall after an older review',async({page})=>{
 await page.goto(APP+'/?lab=broken-access-control');
 await page.evaluate(()=>localStorage.setItem('security_lab_learner_progress_v2',JSON.stringify({'broken-access-control':{'access-files':{currentStep:'understand',checkedAnswer:{id:'test',correct:true,withHelp:false,at:Date.now()},reviewResponses:[{answer:'Old recall',at:Date.now()-14*86400000,withHelp:false}]}}})));
 await page.reload();await expect(page.getByRole('region',{name:'Practice and review'})).not.toContainText('A review is suggested now.');
});
