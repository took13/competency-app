const fs=require('node:fs'),assert=require('node:assert/strict');
const {build}=require('./tools/build-executive-dashboard.cjs'),{run}=require('./tools/flow-fixture-runtime.cjs');
const source=JSON.parse(fs.readFileSync(process.argv[2]||'test-results/executive-private/Manager.json'));
const candidate=build(source),a=candidate.properties.definition.actions;
const profile=(email,discipline,role='EMPLOYEE',grade='SR_9_10')=>({EmployeeEmail:email,DisciplineCode:discipline,AppRole:{Value:role},JobGradeCode:grade,CanBeAssessed:true,IsActive:true,ProfileStatus:{Value:'ACTIVE'}});
const header=(email,status,cycle='ETM_UI_DEMO_2026')=>({EmployeeEmail:email,Status:{Value:status},CycleKey:cycle,IsActive:true});
let cases=0;
async function check({role='SVP',grade='SVP',discipline='',session={},profiles,headers,request={},failure,partial}={},expected=200){
 const people=profiles||[profile('caller@test',discipline,role,grade),profile('a@test','ETM'),profile('b@test','EEM'),profile('c@test','ECM'),profile('outside@test','OTHER')];
 const rows=headers||[header('a@test','CONFIRMED'),header('b@test','SUBMITTED'),header('c@test','RETURNED'),header('outside@test','CONFIRMED'),header('a@test','ASSIGNED','UAT_GATE4_20261101_01')];
 const reads=[];
 const connector=async(name,op,p)=>{
  assert.equal(op,'GetItems','no mutation connector is permitted');reads.push(name);if(failure===name)throw Error('fixture connector failure');let value=[];
  if(name==='Get_Session_By_Token')value=p.$filter==="SessionToken eq 'valid'"?[{Email:'caller@test',AuthStatus:{Value:'VERIFIED'},SessionExpiresAt:'2099-01-01T00:00:00Z',...session}]:[];
  else if(name==='Get_Caller_Profile')value=people.filter(x=>x.EmployeeEmail==='caller@test');
  else if(name==='Get_Dashboard_Profiles')value=people.filter(x=>x.IsActive);
  else if(name==='Get_Dashboard_Assessments')value=rows.filter(x=>x.CycleKey==='ETM_UI_DEMO_2026'&&x.IsActive);
  else throw Error('Unexpected read '+name);
  return {body:{value,...(partial===name?{'@odata.nextLink':'more'}:{})}};
 };
 const result=await run(candidate,{action:'get_executive_dashboard',sessionToken:'valid',...request},connector);
 assert.equal(result.response?.statusCode,expected,JSON.stringify(result.errors));
 if(expected===403||expected===401)assert(!reads.includes('Get_Dashboard_Assessments'));
 cases++;return result.response?.body;
}
(async()=>{
 const svp=await check();assert.deepEqual(svp.dashboard.scope,['ETM','EEM','ECM']);assert.deepEqual(svp.dashboard.disciplines.map(x=>[x.assigned,x.submitted,x.awaitingReview,x.confirmed]),[[1,1,0,1],[1,1,1,0],[1,0,0,0]]);assert.equal(svp.dashboard.gaps,null);assert(!JSON.stringify(svp).includes('@test'));
 const dm=await check({role:'MANAGER',grade:'DM',discipline:'EEM',request:{role:'SVP',scope:['ETM','ECM'],discipline:'ETM'}});assert.deepEqual(dm.dashboard.scope,['EEM']);assert.equal(dm.dashboard.disciplines.length,1);assert.equal(dm.dashboard.disciplines[0].awaitingReview,1);
 for(const role of ['EMPLOYEE','ADMIN','HEAD'])await check({role},403);
 await check({role:'MANAGER',grade:'SR_9_10',discipline:'ETM'},403);await check({role:'MANAGER',grade:'DM',discipline:'OTHER'},403);
 await check({request:{sessionToken:''}},401);await check({request:{sessionToken:"x' or 1 eq 1"}},401);await check({session:{SessionExpiresAt:'2000-01-01T00:00:00Z'}},401);await check({session:{AuthStatus:{Value:'REVOKED'}}},401);
 await check({profiles:[{...profile('caller@test','','SVP','SVP'),IsActive:false}]},403);
 await check({profiles:[profile('caller@test','','SVP','SVP'),profile('caller@test','','SVP','SVP')]},403);
 const empty=await check({headers:[]});assert(empty.dashboard.disciplines.every(x=>x.assigned===0&&x.submitted===0));
 await check({headers:[header('a@test','SUBMITTED'),header('a@test','CONFIRMED')]},503);
 await check({role:'MANAGER',grade:'DM',discipline:'ETM',profiles:[profile('caller@test','ETM','MANAGER','DM'),profile('a@test','ETM'),profile('A@test','EEM')]},503);
 await check({profiles:Array.from({length:501},(_,i)=>profile(i?'person'+i+'@test':'caller@test',i?'ETM':'',i?'EMPLOYEE':'SVP',i?'SR_9_10':'SVP'))},503);
 await check({partial:'Get_Dashboard_Profiles'},503);await check({partial:'Get_Dashboard_Assessments'},503);await check({failure:'Get_Dashboard_Assessments'},503);
 await check({request:{action:'confirm_assessment'}},400);
 const raw=JSON.stringify(a);assert(!/PatchItem|PostItem|HttpRequest|SendEmail/.test(raw));
 assert.deepEqual(candidate.properties.connectionReferences,{shared_sharepointonline:source.properties.connectionReferences.shared_sharepointonline});assert.notEqual(candidate.name,source.name);
 fs.mkdirSync('test-results/executive-private',{recursive:true});fs.writeFileSync('test-results/executive-private/Dashboard-candidate.json',JSON.stringify(candidate,null,2));
 console.log('PASS executive API: '+cases+' fixture cases; session, role/DM scope, injection, duplicate, empty, truncation, failures, read-only. NOT live engine evidence.');
})().catch(e=>{console.error(e);process.exitCode=1});
