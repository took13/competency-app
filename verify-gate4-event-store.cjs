// Offline fixture list GUID ONLY. Production requires the actual verified GUID.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const baseline=process.argv[2];if(!baseline)throw Error('Supply private Gate 3 deployed directory');
process.argv[2]=path.join(baseline,'..','current-flows');
const g3=require('./verify-gate3-flows.cjs'),{run}=require('./tools/flow-fixture-runtime.cjs');
const {build}=require('./tools/build-gate4-event-store.cjs'),{locate}=require('./tools/build-gate3.cjs');
const auditId='00000000-0000-4000-8000-000000000004',flows={};
for(const k of ['Employee','Manager','Development']){
 const old=JSON.parse(fs.readFileSync(path.join(baseline,k+'.json'),'utf8').replace(/^\uFEFF/,''));flows[k]=build(old,k,auditId);
 assert.deepEqual(flows[k].properties.connectionReferences,old.properties.connectionReferences);assert.deepEqual(flows[k].properties.definition.triggers,old.properties.definition.triggers);
 const names=new Set();function collect(a){for(const[n,v]of Object.entries(a||{})){assert(!names.has(n));names.add(n);collect(v.actions);collect(v.else?.actions);}}collect(flows[k].properties.definition.actions);
 function graph(a,d=0){if(!a||!Object.keys(a).length)return;assert(d<=8,'Depth '+k);for(const[n,v]of Object.entries(a)){for(const dep of Object.keys(v.runAfter||{}))assert(dep in a,n+' -> '+dep);for(const m of JSON.stringify(v.inputs||{}).matchAll(/(?:body|outputs)\('([^']+)'\)/g))assert(names.has(m[1]),'Missing '+m[1]);graph(v.actions,d+1);graph(v.else?.actions,d+1);}}graph(flows[k].properties.definition.actions);
 function unchanged(a){for(const[n,v]of Object.entries(a||{})){if(n.startsWith('N_')||['Caller_Authorized','Review_Access_Allowed','Development_Action_Edit_Allowed'].includes(n))assert.deepEqual(locate(flows[k].properties.definition.actions,n).node,v,'Protected '+n);else{unchanged(v.actions);unchanged(v.else?.actions);}}}unchanged(old.properties.definition.actions);
}
function fixture(){const f=g3.fixture();f.tables[auditId]=[];const delegate=f.connector;f.connector=async(n,op,p,c)=>{if(p.table===auditId&&op==='PostItem'&&f.tables[auditId].some(r=>r.Title===p['item/Title']))throw Error('Unique audit event key conflict');return delegate(n,op,p,c);};return f;}
let runNo=0;const request=(f,k,action,extra={},token='manager')=>run(flows[k],{action,sessionToken:token,...extra},f.connector,'audit-fixture-'+(++runNo));
const status=(r,n)=>{assert.equal(r.response?.statusCode,n,JSON.stringify({response:r.response,errors:r.errors}));return r.response.body;};
const events=f=>f.tables[auditId].map(r=>JSON.parse(r.EventPayload));
module.exports={flows,fixture,ids:g3.ids,request,auditId};
if(require.main===module)(async()=>{
 const {ids}=g3;let f=fixture(),a=f.tables[ids.assessment][0];a.Status={Value:'IN_PROGRESS'};a.ExpectedItemCount=12;
 const seed=f.tables[ids.item][0];f.tables[ids.item]=Array.from({length:12},(_,i)=>({...structuredClone(seed),ID:i+1,ItemKey:'I'+(i+1),Title:'I'+(i+1)}));
 for(let round=1;round<=2;round++){
  for(let n=1;n<=12;n++)status(await request(f,'Employee','save_self_assessment',{assessmentKey:'A',itemKey:'I'+n,selfLevel:round===1?3:4,selfEvidence:'Synthetic evidence round '+round+' item '+n+' '+'.'.repeat(200),expectedRevision:round},'employee'),200);
  status(await request(f,'Employee','submit_assessment',{assessmentKey:'A',expectedRevision:round},'employee'),200);
  for(let n=1;n<=12;n++)status(await request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I'+n,validatedLevel:4,managerComment:'Synthetic fresh review '+n,expectedRevision:round}),200);
  if(round===1)status(await request(f,'Manager','return_assessment',{assessmentKey:'A',reason:'Synthetic revision cycle',expectedRevision:1}),200);
 }
 status(await request(f,'Manager','confirm_assessment',{assessmentKey:'A',expectedRevision:2}),200);
 assert.equal(a.Status.Value,'CONFIRMED');assert.equal(a.WorkflowLock,'');assert(a.TransitionHistory.length<50000);assert.equal(events(f).length,102);
 const first=events(f)[0],done=events(f)[1];assert.equal(first.before.SelfLevel,3);assert.equal(first.actor,'employee@example.test');assert.equal(done.eventId,first.eventId);assert.equal(done.phase,'COMMITTED');assert(!JSON.stringify(events(f)).includes('sessionToken'));
 const read=status(await request(f,'Employee','get_my_assessment',{assessmentKey:'A'},'employee'),200);assert.equal(read.assessment.auditHistory.length,102);assert.equal(read.assessment.gate4Ready,true);assert.equal(read.assessment.auditHistoryMayBeTruncated,false);
 console.log('PASS two 12-item rounds: 102 append-only audit events, Return/edit/resubmit/fresh-review/confirm, bounded legacy transition history');
 f=fixture();const before=JSON.stringify(f.tables);for(const token of ['employee','other'])status(await request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I1',validatedLevel:4},token),403);assert.equal(JSON.stringify(f.tables),before);
 status(await request(f,'Manager','get_review_assessment',{assessmentKey:'A'},'other'),403);assert.equal(f.tables[auditId].length,0);
 const pair=await Promise.all([request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I1',validatedLevel:4,expectedRevision:1}),request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I1',validatedLevel:5,expectedRevision:1})]);assert.deepEqual(pair.map(r=>r.response?.statusCode).sort(),[200,409]);assert.equal(events(f).length,2);
 console.log('PASS backend read/write RBAC and concurrent review: no denied events, one audit pair');
 f=fixture();const p=f.tables[ids.plan][0];status(await request(f,'Development','reopen_development_action',{planKey:'P',actionKey:'D1',reason:'Synthetic reopen',expectedRevision:1}),200);status(await request(f,'Development','return_development_plan',{planKey:'P',reason:'Synthetic return',expectedRevision:2}),200);
 status(await request(f,'Development','save_development_action',{planKey:'P',actionKey:'D1',actionType:'SELF_LEARNING',developmentAction:'Synthetic correction',successMeasure:'Synthetic result',ownerEmail:'employee@example.test',targetDate:'2026-12-01',expectedRevision:3}),200);
 status(await request(f,'Development','start_development_plan',{planKey:'P',expectedRevision:3}),200);status(await request(f,'Development','complete_development_action',{planKey:'P',actionKey:'D1',expectedRevision:3}),200);
 assert.equal(p.Status.Value,'COMPLETED');assert.equal(events(f).length,6);assert.equal(events(f).at(-1).afterParent.Status,'COMPLETED');
 const planRead=status(await request(f,'Development','get_development_plan',{planKey:'P'},'employee'),200);assert.equal(planRead.plan.auditHistory.length,6);
 console.log('PASS development Return/Reopen, edit/start/recomplete and self-only read');
 f=fixture();f.tables[ids.plan]=[];f.tables[ids.action]=[];f.tables[ids.assessment][0].Status={Value:'CONFIRMED'};status(await request(f,'Development','create_development_plan',{assessmentKey:'A'}),201);assert.equal(events(f).length,2);status(await request(f,'Development','create_development_plan',{assessmentKey:'A'}),409);assert.equal(events(f).length,2);
 console.log('PASS plan creation audit; existing-plan recovery has no duplicate audit');
 f=fixture();const failed=await run(flows.Manager,{action:'save_manager_review',sessionToken:'manager',assessmentKey:'A',itemKey:'I1',validatedLevel:4,expectedRevision:1},async(n,...args)=>{if(n==='Save_Manager_Review_Item')throw Error('Offline injected business failure');return f.connector(n,...args);},'pending-fixture');assert.equal(failed.response,null);assert(f.tables[ids.assessment][0].WorkflowLock);assert.equal(events(f).length,1);assert.equal(events(f)[0].phase,'REQUESTED');
 console.log('PASS ambiguous business failure: durable intent and held lock, no false committed event');
 f=fixture();const completionFailure=await run(flows.Manager,{action:'save_manager_review',sessionToken:'manager',assessmentKey:'A',itemKey:'I1',validatedLevel:5,expectedRevision:1},async(n,...args)=>{if(n==='G4_Save_Manager_Review_Item_Commit')throw Error('Offline audit append failure');return f.connector(n,...args);},'audit-append-failed');assert.equal(completionFailure.response,null);assert.equal(f.tables[ids.item][0].ValidatedLevel,5);assert(f.tables[ids.assessment][0].WorkflowLock);assert.equal(events(f).length,1);assert.equal(events(f)[0].phase,'REQUESTED');assert.equal(f.mails.length,0);
 f=fixture();f.tables[auditId].push({ID:1,Title:'hidden',ParentKey:'ASSESSMENT|OTHER',EventPayload:JSON.stringify({eventType:'UNRELATED'})});
 const scoped=status(await request(f,'Manager','get_review_assessment',{assessmentKey:'A'}),200);assert.equal(scoped.assessment.auditHistory.length,0);
 for(let n=0;n<501;n++)f.tables[auditId].push({ID:n+2,Title:'audit-'+n,ParentKey:'ASSESSMENT|A',EventPayload:JSON.stringify({eventType:'FIXTURE',eventId:'event-'+n,phase:'COMMITTED'})});
 const capped=status(await request(f,'Manager','get_review_assessment',{assessmentKey:'A'}),200);assert.equal(capped.assessment.auditHistory.length,500);assert.equal(capped.assessment.auditHistoryMayBeTruncated,true);
 console.log('PASS failed final audit append retains lock and pending evidence; scoped reads exclude unrelated rows; 500-row limit is disclosed');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
