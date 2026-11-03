// Local browser + synthetic transport only. No real account/session or HR data.
const fs=require('fs'),http=require('http'),vm=require('vm'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/config.example.js','utf8'),sandbox);
const config={...sandbox.window.COMPETENCY_CONFIG,...Object.fromEntries(['auth','employee','manager','assessment','development'].map(k=>[k+'ApiUrl','https://'+k+'.test/api'])),reviewerApiUrl:'https://reviewer.test/api'};
const server=http.createServer((q,r)=>{const name=q.url.split('?')[0].slice(1)||'index.html';if(name==='config.js')return r.end('window.COMPETENCY_CONFIG='+JSON.stringify(config));if(!['index.html','app.js','assignment.js','styles.css'].includes(name))return r.writeHead(404).end();r.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');r.end(fs.readFileSync(__dirname+'/'+name));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const page=await browser.newPage(),calls=[],errors=[];let denied=false;
const assessment={assessmentKey:'FIXTURE-A',employeeName:'Synthetic employee',status:'SUBMITTED',expectedItemCount:1,actualItemCount:1,items:[{itemKey:'FIXTURE-I',competencyName:'Synthetic competency',selfLevel:3,selfEvidence:'Synthetic evidence',targetLevel:4,validatedLevel:null,displayOrder:1}]};
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{const b=route.request().postDataJSON(),url=route.request().url();calls.push({url,...b});
 if(b.action==='get_user_profile')return route.fulfill({json:{success:true,registered:true,profile:{appRole:'SVP',employeeName:'Synthetic SVP',employeeEmail:'reviewer@example.test'}}});
 assert.equal(url,config.reviewerApiUrl,'SVP used a general business endpoint');
 if(denied)return route.fulfill({status:403,json:{success:false}});
 if(b.action==='get_my_reviews')return route.fulfill({json:{success:true,reviews:assessment.status==='SUBMITTED'?[{assessmentKey:assessment.assessmentKey,status:'SUBMITTED'}]:[]}});
 if(b.action==='get_review_assessment')return route.fulfill({json:{success:true,assessment}});
 if(b.action==='save_manager_review'){assert.equal(b.validatedLevel,3);assessment.items[0].validatedLevel=3;return route.fulfill({json:{success:true,assessmentKey:assessment.assessmentKey,itemKey:'FIXTURE-I',validatedLevel:3,validatedItemCount:1,totalItemCount:1}});}
 if(b.action==='confirm_assessment'){assessment.status='CONFIRMED';return route.fulfill({json:{success:true,assessmentKey:assessment.assessmentKey,status:'CONFIRMED',validatedItemCount:1,expectedItemCount:1,confirmedAt:'2026-11-03T00:00:00Z'}});}
 return route.abort();});
await page.goto('http://127.0.0.1:'+server.address().port);
async function login(){await page.evaluate(async()=>{sessionStorage.setItem(K.token,'synthetic');sessionStorage.setItem(K.expires,new Date(Date.now()+3600000).toISOString());sessionStorage.setItem(K.activity,String(Date.now()));await enterLive();});}
await login();assert.equal(await page.evaluate(()=>isManager()),false);assert.equal(await page.evaluate(()=>canReviewAssessments()),true);assert(await page.locator('#adminNav').isHidden());assert.equal(calls.filter(c=>c.action==='get_my_assignments').length,0);
await page.click('#managerNav');assert.match(await page.locator('#content').innerText(),/Assigned reviews only/);assert.equal(await page.locator('#createAssignment').count(),0);
await page.click('[data-review="0"]');await page.waitForFunction(()=>!workspaceBusy);await page.click('[data-agree="0"]');await page.waitForFunction(()=>!workspaceBusy);await page.click('#confirmReview');await page.click('#doConfirmManager');await page.waitForFunction(()=>!workspaceBusy);assert.equal(await page.locator('#manageDevelopment').count(),0);
denied=true;await page.fill('#existingReviewKey','NOT-ASSIGNED');await page.click('#openExistingReview button');await page.waitForFunction(()=>!workspaceBusy);assert.match(await page.locator('#toast').innerText(),/access denied/i);assert.equal(await page.locator('#reviewPanel').count(),0);
await page.evaluate(()=>{state.page='managerDevelopment';developmentSubject={};render();});assert.notEqual(await page.evaluate(()=>state.page),'managerDevelopment');
await page.evaluate(()=>{clearSessionUI();window.COMPETENCY_CONFIG.reviewerApiUrl='';});const before=calls.length;await login();assert(await page.locator('#managerNav').isHidden());assert.equal(calls.slice(before).filter(c=>c.action!=='get_user_profile').length,0);
assert.deepEqual(errors,[]);console.log('PASS SVP UI: separate endpoint, assigned review save/confirm, 403 clears panel, no Manager/Admin/Assignment/Development capability, disabled without endpoint');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
