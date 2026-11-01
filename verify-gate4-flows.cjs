// Offline WDL fixture execution, not live Microsoft-engine UAT.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const baseline=process.argv[2];if(!baseline)throw Error('Supply private Gate 3 deployed directory');
process.argv[2]=path.join(baseline,'..','current-flows');
const {flows,fixture,ids,request}=require('./verify-gate3-flows.cjs');
const {build}=require('./tools/build-gate4.cjs');
const {locate}=require('./tools/build-gate3.cjs');
const {run}=require('./tools/flow-fixture-runtime.cjs');
for(const k of Object.keys(flows)){
 const old=JSON.parse(fs.readFileSync(path.join(baseline,k+'.json'),'utf8').replace(/^\uFEFF/,''));flows[k]=build(old,k);
 assert.deepEqual(flows[k].properties.connectionReferences,old.properties.connectionReferences);
 assert.deepEqual(flows[k].properties.definition.triggers,old.properties.definition.triggers);
 const names=new Set();function collect(a){for(const[n,v]of Object.entries(a||{})){assert(!names.has(n),'Duplicate '+n);names.add(n);collect(v.actions);collect(v.else?.actions);}}collect(flows[k].properties.definition.actions);
 function validate(a,depth=0){assert(depth<=8,'Nesting exceeds eight '+k);for(const[n,v]of Object.entries(a||{})){for(const d of Object.keys(v.runAfter||{}))assert(d in a,'Invalid dependency '+n+' '+d);for(const m of JSON.stringify(v.inputs||{}).matchAll(/(?:body|outputs)\('([^']+)'\)/g))assert(names.has(m[1]),'Missing '+m[1]);validate(v.actions,depth+1);validate(v.else?.actions,depth+1);}}
 // Empty groups do not contribute to engine nesting.
 function graph(a,depth=0){if(!a||!Object.keys(a).length)return;assert(depth<=8,'Nesting exceeds eight '+k);for(const[n,v]of Object.entries(a)){for(const d of Object.keys(v.runAfter||{}))assert(d in a,'Invalid dependency '+n+' '+d);graph(v.actions,depth+1);graph(v.else?.actions,depth+1);}}graph(flows[k].properties.definition.actions);
 function invariants(a){for(const[n,v]of Object.entries(a||{})){if(n.startsWith('N_')||['Caller_Authorized','Review_Access_Allowed','Development_Action_Edit_Allowed'].includes(n))assert.deepEqual(locate(flows[k].properties.definition.actions,n).node,v,'Changed protected action '+n);else{invariants(v.actions);invariants(v.else?.actions);}}}invariants(old.properties.definition.actions);
}
const status=(r,n)=>assert.equal(r.response?.statusCode,n,JSON.stringify({response:r.response,errors:r.errors}));
const history=(f,type='assessment')=>JSON.parse(f.tables[ids[type]][0].TransitionHistory||'[]');
module.exports={flows,fixture,ids,request};
if(require.main===module)(async()=>{
 let f=fixture();let a=f.tables[ids.assessment][0];a.Status={Value:'IN_PROGRESS'};
 status(await request(f,'Employee','save_self_assessment',{assessmentKey:'A',itemKey:'I1',selfLevel:4,selfEvidence:'new',expectedRevision:1,actor:'spoof',correlationId:'spoof'},'employee'),200);
 let h=history(f);assert.equal(h.length,2);assert.equal(h[0].phase,'REQUESTED');assert.equal(h[1].phase,'COMMITTED');assert.equal(h[0].before.SelfLevel,3);assert.equal(h[1].after.SelfLevel,4);assert.equal(h[0].eventId,h[1].eventId);assert.equal(h[1].actor,'employee@example.test');assert.notEqual(h[1].correlationId,'spoof');assert.equal(a.WorkflowLock,'');
 status(await request(f,'Employee','submit_assessment',{assessmentKey:'A',expectedRevision:1},'employee'),200);h=history(f);assert.equal(h.length,5);assert.equal(h.at(-1).afterParent.Status,'SUBMITTED');
 status(await request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I1',validatedLevel:4,managerComment:'fresh',expectedRevision:1}),200);
 status(await request(f,'Manager','confirm_assessment',{assessmentKey:'A',expectedRevision:1}),200);h=history(f);assert.equal(h.at(-1).eventType,'ASSESSMENT_CONFIRMED');assert.equal(h.at(-1).afterParent.Status,'CONFIRMED');assert.equal(h.at(-2).before.Status.Value,'SUBMITTED');
 console.log('PASS assessment audit: save/submit/review/confirm, authenticated actor, before/after, server correlation, history preservation');
 f=fixture();for(const token of ['employee','other']){const before=JSON.stringify(f.tables);status(await request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I1',validatedLevel:4},token),403);assert.equal(JSON.stringify(f.tables),before);}
 const pair=await Promise.all([request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I1',validatedLevel:4,managerComment:'one',expectedRevision:1}),request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I1',validatedLevel:5,managerComment:'two',expectedRevision:1})]);assert.deepEqual(pair.map(r=>r.response?.statusCode).sort(),[200,409]);assert.equal(history(f).length,2);
 console.log('PASS offline RBAC and simultaneous review: no denied writes, one winner/one conflict, one audit pair');
 f=fixture();const p=f.tables[ids.plan][0];p.Status={Value:'DRAFT'};for(const x of f.tables[ids.action])x.Status={Value:'PLANNED'};
 status(await request(f,'Development','save_development_action',{planKey:'P',actionKey:'D1',actionType:'SELF_LEARNING',developmentAction:'new detail',successMeasure:'new result',ownerEmail:'employee@example.test',targetDate:'2026-12-01',expectedRevision:1}),200);
 status(await request(f,'Development','start_development_plan',{planKey:'P',expectedRevision:1}),200);
 status(await request(f,'Development','complete_development_action',{planKey:'P',actionKey:'D1',expectedRevision:1}),200);
 status(await request(f,'Development','complete_development_action',{planKey:'P',actionKey:'D2',expectedRevision:1}),200);
 h=history(f,'plan');assert.equal(h.length,8);assert.equal(h.at(-1).afterParent.Status,'COMPLETED');assert.equal(h.at(-1).after.Status.Value,'COMPLETED');assert.equal(p.WorkflowLock,'');
 console.log('PASS development audit: action edit/start/completion, completed parent readback, preserved snapshots');
 f=fixture();f.tables[ids.plan]=[];f.tables[ids.action]=[];f.tables[ids.assessment][0].Status={Value:'CONFIRMED'};
 status(await request(f,'Development','create_development_plan',{assessmentKey:'A'}),201);
 h=history(f,'plan');assert.equal(h.length,2);assert.equal(h[0].phase,'REQUESTED');assert.equal(h[1].phase,'COMMITTED');assert.equal(h[1].after.Status,'DRAFT');
 const createdBefore=JSON.stringify(f.tables[ids.plan]);status(await request(f,'Development','create_development_plan',{assessmentKey:'A'}),409);assert.equal(JSON.stringify(f.tables[ids.plan]),createdBefore);
 console.log('PASS plan creation: initial durable intent and draft commit, duplicate recovery does not append');
 f=fixture();a=f.tables[ids.assessment][0];a.Status={Value:'IN_PROGRESS'};a.ExpectedItemCount=12;
 const seed=f.tables[ids.item][0];f.tables[ids.item]=Array.from({length:12},(_,i)=>({...structuredClone(seed),ID:i+1,Title:'I'+(i+1),ItemKey:'I'+(i+1)}));
 for(let n=1;n<=12;n++)status(await request(f,'Employee','save_self_assessment',{assessmentKey:'A',itemKey:'I'+n,selfLevel:4,selfEvidence:'Synthetic evidence '+n+' '+'.'.repeat(200),expectedRevision:1},'employee'),200);
 status(await request(f,'Employee','submit_assessment',{assessmentKey:'A',expectedRevision:1},'employee'),200);
 for(let n=1;n<=12;n++)status(await request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I'+n,validatedLevel:4,managerComment:'Synthetic fresh review '+n,expectedRevision:1}),200);
 status(await request(f,'Manager','confirm_assessment',{assessmentKey:'A',expectedRevision:1}),200);
 assert(a.TransitionHistory.length<=50000);console.log('PASS 12-item synthetic lifecycle capacity: '+a.TransitionHistory.length+' characters; not an unlimited retention claim');
 f=fixture();a=f.tables[ids.assessment][0];const result=await run(flows.Manager,{action:'save_manager_review',sessionToken:'manager',assessmentKey:'A',itemKey:'I1',validatedLevel:4,expectedRevision:1},async(n,...args)=>{if(n==='Save_Manager_Review_Item')throw Error('Offline failure injection');return f.connector(n,...args);},'failed-business');assert.equal(result.response,null);assert(a.WorkflowLock);assert.equal(history(f).length,1);assert.equal(history(f)[0].phase,'REQUESTED');assert.equal(f.tables[ids.item][0].ValidatedLevel,3);
 f=fixture();a=f.tables[ids.assessment][0];a.TransitionHistory=JSON.stringify([{legacy:'x'.repeat(49000)}]);status(await request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I1',validatedLevel:4,expectedRevision:1}),409);assert.equal(a.WorkflowLock,'');assert.equal(f.tables[ids.item][0].ValidatedLevel,3);assert.equal(history(f).length,1);
 console.log('PASS failure/capacity: durable pending intent, retained lock, no false success, no business write on capacity denial');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
