// Regression and adapter tests. Development mappings here are synthetic fixtures,
// not evidence of the production Power Automate contract.
const fs=require('fs'),http=require('http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const config={};require('vm').runInNewContext(fs.readFileSync(__dirname+'/config.example.js','utf8'),{window:config});
const cfg=config.COMPETENCY_CONFIG;
for(const k of ['auth','employee','manager','assessment','development'])cfg[k+'ApiUrl']='https://'+k+'.test/api';
const server=http.createServer((q,r)=>{const f=q.url.slice(1)||'index.html';r.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':'text/html');r.end(f==='config.js'?'window.COMPETENCY_CONFIG='+JSON.stringify(cfg):fs.readFileSync(__dirname+'/'+f));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage(),calls=[],errors=[];let plan=null,mismatch=false;
const assessment={assessmentKey:'EMPLOYEE|REVIEWED',employeeName:'Reviewed Employee',employeeEmail:'employee@example.test',profileVersionKey:'PROFILE_JR_7_8',status:'CONFIRMED',items:[{itemKey:'item-1',competencyName:'Diagnostics',targetLevel:4,validatedLevel:2}]};
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{const b=route.request().postDataJSON();calls.push(b);let d={success:true};
if(b.action==='get_user_profile')Object.assign(d,{registered:true,profile:{appRole:'MANAGER',employeeName:'Logged In Manager',employeeEmail:'manager@example.test'}});
else if(b.action==='get_my_reviews')d.reviews=[];
else if(b.action==='fixture_result'){assert.equal(b.assessmentKey,assessment.assessmentKey);d.assessment={...assessment,assessmentKey:mismatch?'WRONG':assessment.assessmentKey};}
else if(b.action==='fixture_plan'){assert.equal(b.assessmentKey,assessment.assessmentKey);if(b.planKey)assert.equal(b.planKey,plan.planKey);Object.assign(d,{plan:plan||{},actions:plan?.actions||[]});}
else if(b.action==='fixture_create'){assert.equal(b.assessmentKey,assessment.assessmentKey);plan={assessmentKey:assessment.assessmentKey,employeeEmail:assessment.employeeEmail,planKey:'PLAN|EMPLOYEE',status:'DRAFT',actions:[{actionKey:'ACTION|EMPLOYEE',competencyName:'Diagnostics',status:'DRAFT'}]};Object.assign(d,{plan,actions:plan.actions});}
else if(b.action==='fixture_save'){assert.equal(b.planKey,plan.planKey);assert.equal(b.actionKey,'ACTION|EMPLOYEE');Object.assign(plan.actions[0],b,{status:'PLANNED'});}
else if(b.action==='fixture_start'){assert.equal(b.planKey,plan.planKey);plan.status='IN_PROGRESS';}
else if(b.action==='fixture_complete'){assert.equal(b.actionKey,'ACTION|EMPLOYEE');plan.actions[0].status='COMPLETED';plan.status='COMPLETED';}
else throw new Error('Unexpected action '+b.action);
await route.fulfill({json:d});});
try{await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(a=>{sessionStorage.setItem(K.token,'fixture');sessionStorage.setItem(K.expires,new Date(Date.now()+3600000).toISOString());state.verified=true;state.profile={appRole:'MANAGER',employeeName:'Logged In Manager',employeeEmail:'manager@example.test'};managerSelected=a;connectedDevelopment={assessment:{assessmentKey:'MANAGER|OWN',employeeEmail:'manager@example.test',status:'CONFIRMED',items:[]},actions:[]};state.page='manager';render();},assessment);
await page.click('#manageDevelopment');assert.equal(await page.evaluate(()=>state.page),'managerDevelopment');assert.match(await page.locator('h1').innerText(),/Reviewed Employee/);assert.match(await page.locator('#content').innerText(),/EMPLOYEE\|REVIEWED.*PROFILE_JR_7_8/);assert.equal(await page.locator('#loadDevelopment').count(),0);assert(await page.locator('#createPlan').isDisabled());assert.equal(calls.length,0);
await page.click('nav [data-page=development]');assert.equal(await page.evaluate(()=>developmentRecord().assessment.assessmentKey),'MANAGER|OWN');assert.equal(await page.locator('#createPlan').count(),0);
await page.click('#managerNav');await page.click('#manageDevelopment');
await page.evaluate(()=>{const c=window.COMPETENCY_CONFIG.contracts;for(const [key,action,response,fields] of [
['assessmentResult','fixture_result','assessment',{assessmentKey:'assessmentKey'}],['developmentPlan','fixture_plan',null,{assessmentKey:'assessmentKey',planKey:'planKey'}],['developmentCreate','fixture_create',null,{assessmentKey:'assessmentKey'}],['developmentSave','fixture_save',null,{actionKey:'actionKey',planKey:'planKey',actionType:'actionType',developmentAction:'developmentAction',successMeasure:'successMeasure',ownerEmail:'ownerEmail',targetDate:'targetDate'}],['developmentStart','fixture_start',null,{planKey:'planKey'}],['developmentComplete','fixture_complete',null,{planKey:'planKey',actionKey:'actionKey'}]])c[key]={api:'development',action,response,fields};});
// Existing planKey is supplied by the review context. New lookup can map assessmentKey alone.
await page.evaluate(()=>{window.COMPETENCY_CONFIG.contracts.developmentPlan.fields={assessmentKey:'assessmentKey'};});
await page.click('#reloadManagerDevelopment');await page.waitForFunction(()=>!workspaceBusy);assert(await page.locator('#createPlan').isEnabled());
await page.click('#createPlan');await page.waitForFunction(()=>!workspaceBusy);assert.equal(await page.evaluate(()=>developmentSubject.planKey),'PLAN|EMPLOYEE');assert(await page.locator('#startDevelopment').isDisabled());
await page.evaluate(()=>{window.COMPETENCY_CONFIG.contracts.developmentPlan.fields.planKey='planKey';});
await page.click('[data-edit-action="0"]');await page.fill('#actionType','FIXTURE_TYPE');await page.fill('#actionTitle','Practice diagnostics');await page.fill('#actionDue','2026-12-15');await page.fill('#actionNotes','Review two cases');await page.click('#developmentForm button');await page.waitForFunction(()=>!workspaceBusy);assert(await page.locator('#startDevelopment').isEnabled());
await page.click('#startDevelopment');await page.waitForFunction(()=>!workspaceBusy);await page.click('[data-complete-action="0"]');await page.waitForFunction(()=>!workspaceBusy);assert.match(await page.locator('#content').innerText(),/COMPLETED/);
// Wrong response context fails closed and cannot overwrite the selected employee.
mismatch=true;await page.click('#reloadManagerDevelopment');await page.waitForFunction(()=>!workspaceBusy);assert.equal(await page.evaluate(()=>developmentSubject.assessment.assessmentKey),assessment.assessmentKey);assert.equal(await page.evaluate(()=>developmentSubject.loadError),true);mismatch=false;
for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);}
await page.evaluate(()=>{state.page='development';state.profile.appRole='EMPLOYEE';state.profile.employeeEmail='employee@example.test';connectedDevelopment=developmentSubject;render();});assert.equal(await page.locator('[data-edit-action],#createPlan,#startDevelopment,[data-complete-action]').count(),0);const before=calls.length;await page.evaluate(async()=>{await openManagerDevelopment();await transitionDevelopment('developmentStart');});assert.equal(calls.length,before);
await page.evaluate(()=>clearSessionUI());assert.equal(await page.evaluate(()=>developmentSubject),null);assert.deepEqual(errors,[]);
console.log('PASS Development: separate manager route, selected employee/assessment/profile, self-only read-only, missing-contract guard, create/get/save/start/complete adapter readback, planKey preservation, wrong-subject rejection, role/session guards, responsive widths');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

