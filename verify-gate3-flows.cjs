// Executes generated candidate action graphs against in-memory fixture connectors.
// Does not contact Power Automate, SharePoint or Outlook.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {build,locate}=require('./tools/build-gate3.cjs');
const {run,fixtureConnector}=require('./tools/flow-fixture-runtime.cjs');
const dir=process.argv[2];if(!dir)throw Error('Supply private exported-definition directory');
const before={},flows={};for(const k of ['Manager','Employee','Development']){before[k]=JSON.parse(fs.readFileSync(path.join(dir,k+'.json'),'utf8').replace(/^\uFEFF/,''));flows[k]=build(before[k],k);}
const act=(k,n)=>locate(flows[k].properties.definition.actions,n).node;
const table=(k,n)=>act(k,n).inputs.parameters.table;
const ids={session:table('Manager','Get_Session_By_Token'),profile:table('Manager','Get_Caller_Profile'),assessment:table('Manager','Get_Review_Assessment_Header'),item:table('Manager','Get_Items_For_Confirmation'),plan:table('Development','Get_Development_Plan_Header'),action:table('Development','Get_Complete_Development_Action'),log:table('Manager','N_ASSESSMENT_CONFIRMED_Claim')};
function fixture(){const tables={};Object.values(ids).forEach(id=>tables[id]=[]);
 for(const[role,email,token]of [['MANAGER','manager@example.test','manager'],['EMPLOYEE','employee@example.test','employee'],['MANAGER','other@example.test','other'],['ADMIN','admin@example.test','admin']]){tables[ids.session].push({ID:tables[ids.session].length+1,SessionToken:token,Email:email,AuthStatus:{Value:'VERIFIED'},SessionExpiresAt:'2099-01-01T00:00:00Z'});tables[ids.profile].push({ID:tables[ids.profile].length+1,EmployeeEmail:email,AppRole:{Value:role},ProfileStatus:{Value:'ACTIVE'},IsActive:true});}
 tables[ids.assessment].push({ID:1,Title:'A',AssessmentKey:'A',CycleKey:'FIXTURE',EmployeeEmail:'employee@example.test',ReviewerEmail:'manager@example.test',Status:{Value:'SUBMITTED'},Revision:1,ExpectedItemCount:2,IsActive:true,TransitionHistory:'',WorkflowLock:''});
 for(let n=1;n<=2;n++)tables[ids.item].push({ID:n,Title:'I'+n,ItemKey:'I'+n,AssessmentKey:'A',SelfLevel:3,SelfEvidence:'original self '+n,ValidatedLevel:3,ManagerComment:'original review '+n,Revision:1,ItemStatus:{Value:'COMPLETED'},TargetLevelSnapshot:4,DisplayOrder:n,IsActive:true});
 tables[ids.plan].push({ID:10,Title:'P',PlanKey:'P',AssessmentKey:'A',EmployeeEmail:'employee@example.test',ReviewerEmail:'manager@example.test',Status:{Value:'COMPLETED'},Revision:1,GapItemCount:2,CompletedAt:'2026-10-20T00:00:00Z',WorkflowLock:'',TransitionHistory:''});
 for(let n=1;n<=2;n++)tables[ids.action].push({ID:n+10,Title:'D'+n,ActionKey:'D'+n,PlanKey:'P',AssessmentKey:'A',Status:{Value:'COMPLETED'},ActionType:{Value:'SELF_LEARNING'},DevelopmentAction:'fixture action '+n,SuccessMeasure:'fixture success '+n,OwnerEmail:'employee@example.test',TargetDate:'2026-11-30',CompletedAt:'2026-10-20T00:00:00Z',DisplayOrder:n});
 return fixtureConnector(tables);
}
let runNo=0;async function request(f,k,action,extra={},token='manager'){const r=await run(flows[k],{action,sessionToken:token,...extra},f.connector,'fixture-'+(++runNo));return r;}
function status(r,expected){assert.equal(r.response?.statusCode,expected,JSON.stringify({response:r.response,errors:r.errors}));return r.response.body;}
function validateGraph(d){const all=new Set();function collect(a){for(const[n,v]of Object.entries(a||{})){assert(!all.has(n),'Duplicate action '+n);all.add(n);collect(v.actions);collect(v.else?.actions);}}collect(d.properties.definition.actions);
 function check(a,depth=0){assert(depth<=8,'Nesting exceeds eight');for(const[n,v]of Object.entries(a||{})){for(const dep of Object.keys(v.runAfter||{}))assert(dep in a,'Invalid sibling dependency '+n+' -> '+dep);for(const m of JSON.stringify(v.inputs||{}).matchAll(/(?:body|outputs)\('([^']+)'\)/g))assert(all.has(m[1]),'Missing expression reference '+m[1]);if(v.actions)check(v.actions,depth+1);if(v.else?.actions)check(v.else.actions,depth+1);}}check(d.properties.definition.actions);}
for(const k of Object.keys(flows)){validateGraph(flows[k]);assert.deepEqual(flows[k].properties.connectionReferences,before[k].properties.connectionReferences);assert.deepEqual(flows[k].properties.definition.triggers.manual.inputs.triggerAuthenticationType,before[k].properties.definition.triggers.manual.inputs.triggerAuthenticationType);
 for(const name of ['Caller_Authorized','Review_Access_Allowed','Development_Action_Edit_Allowed']){const old=locate(before[k].properties.definition.actions,name);if(old)assert.deepEqual(act(k,name).expression,old.node.expression);}
 function notifications(a){for(const[n,v]of Object.entries(a)){if(n.startsWith('N_'))assert.deepEqual(act(k,n),v,'Changed Gate 2 notification '+n);else{if(v.actions)notifications(v.actions);if(v.else?.actions)notifications(v.else.actions);}}}notifications(before[k].properties.definition.actions);
}
module.exports={flows,fixture,ids,request};
if(require.main===module)(async()=>{
 let f=fixture();const header=f.tables[ids.assessment][0];
 f.tables[ids.log].push({ID:90,EventKey:'ASSESSMENT_SUBMITTED|1|manager@example.test',Status:'SENT'});
 status(await request(f,'Manager','return_assessment',{assessmentKey:'A',reason:'   ',expectedRevision:1}),400);assert.equal(header.WorkflowLock,'');assert.equal(header.Status.Value,'SUBMITTED');
 status(await request(f,'Manager','return_assessment',{assessmentKey:'A',reason:'change',expectedRevision:1},'employee'),403);
 status(await request(f,'Manager','return_assessment',{assessmentKey:'A',reason:'change',expectedRevision:1},'other'),403);
 const returned=status(await request(f,'Manager','return_assessment',{assessmentKey:'A',reason:'Add detail <script>',expectedRevision:1}),200);assert.equal(returned.revision,2);assert.equal(header.Status.Value,'RETURNED');assert.equal(header.WorkflowLock,'');const history=JSON.parse(header.TransitionHistory);assert.equal(history.length,1);assert.equal(history[0].items[0].selfEvidence,'original self 1');assert.equal(history[0].items[0].validatedLevel,3);assert.equal(f.mails.length,0);
 status(await request(f,'Manager','return_assessment',{assessmentKey:'A',reason:'again',expectedRevision:1}),409);
 const read=status(await request(f,'Employee','get_my_assessment',{assessmentKey:'A'},'employee'),200);assert.equal(read.assessment.transitionHistory[0].reason,'Add detail <script>');assert.equal(read.assessment.revision,2);
 status(await request(f,'Employee','save_self_assessment',{assessmentKey:'A',itemKey:'I1',selfLevel:4,selfEvidence:'changed',expectedRevision:1},'employee'),409);
 status(await request(f,'Employee','save_self_assessment',{assessmentKey:'A',itemKey:'I1',selfLevel:4,selfEvidence:'changed',expectedRevision:2},'employee'),200);assert.equal(header.Status.Value,'RETURNED');assert.equal(header.WorkflowLock,'');
 status(await request(f,'Employee','submit_assessment',{assessmentKey:'A',expectedRevision:2},'employee'),200);assert.equal(header.Status.Value,'SUBMITTED');assert.equal(JSON.parse(header.TransitionHistory)[1].eventType,'ASSESSMENT_RESUBMITTED');assert.equal(f.mails.length,0,'Existing submitted reservation suppresses repeat mail');
 status(await request(f,'Manager','confirm_assessment',{assessmentKey:'A',expectedRevision:2}),409);assert.equal(header.WorkflowLock,'');
 for(let n=1;n<=2;n++)status(await request(f,'Manager','save_manager_review',{assessmentKey:'A',itemKey:'I'+n,validatedLevel:4,managerComment:'fresh review',expectedRevision:2}),200);
 status(await request(f,'Manager','confirm_assessment',{assessmentKey:'A',expectedRevision:2}),200);assert.equal(header.Status.Value,'CONFIRMED');assert.equal(f.tables[ids.item][0].SelfLevel,4);assert.equal(history[0].items[0].selfLevel,3);assert.equal(header.WorkflowLock,'');
 f=fixture();const pair=await Promise.all([request(f,'Manager','return_assessment',{assessmentKey:'A',reason:'one',expectedRevision:1}),request(f,'Manager','return_assessment',{assessmentKey:'A',reason:'two',expectedRevision:1})]);assert.deepEqual(pair.map(x=>x.response?.statusCode).sort(),[200,409]);assert.equal(JSON.parse(f.tables[ids.assessment][0].TransitionHistory).length,1);
 f=fixture();const plan=f.tables[ids.plan][0];
 status(await request(f,'Development','reopen_development_action',{planKey:'P',actionKey:'D1',reason:'revise completion',expectedRevision:1},'employee'),403);
 status(await request(f,'Development','reopen_development_action',{planKey:'P',actionKey:'D1',reason:'revise completion',expectedRevision:1},'other'),403);
 status(await request(f,'Development','reopen_development_action',{planKey:'P',actionKey:'MISSING',reason:'revise',expectedRevision:1}),404);assert.equal(plan.WorkflowLock,'');
 status(await request(f,'Development','reopen_development_action',{planKey:'P',actionKey:'D1',reason:'revise completion',expectedRevision:1}),200);assert.equal(plan.Status.Value,'IN_PROGRESS');assert.equal(plan.Revision,2);assert.equal(f.tables[ids.action][0].Status.Value,'PLANNED');assert.equal(f.tables[ids.action][0].CompletedAt,'2026-10-20T00:00:00Z');assert.equal(JSON.parse(plan.TransitionHistory)[0].action.CompletedAt,'2026-10-20T00:00:00Z');assert.equal(plan.WorkflowLock,'');assert.equal(f.mails.length,0);
 status(await request(f,'Development','reopen_development_action',{planKey:'P',actionKey:'D1',reason:'repeat',expectedRevision:2}),409);
 status(await request(f,'Development','return_development_plan',{planKey:'P',reason:'correct action',expectedRevision:2}),200);assert.equal(plan.Status.Value,'DRAFT');assert.equal(plan.Revision,3);assert.equal(f.tables[ids.action][1].Status.Value,'COMPLETED');
 status(await request(f,'Development','save_development_action',{planKey:'P',actionKey:'D2',actionType:'TRAINING',developmentAction:'bad',successMeasure:'bad',ownerEmail:'employee@example.test',targetDate:'2026-11-30',expectedRevision:3}),409);assert.equal(plan.WorkflowLock,'');
 status(await request(f,'Development','start_development_plan',{planKey:'P',expectedRevision:3}),200);assert.equal(plan.Status.Value,'IN_PROGRESS');
 status(await request(f,'Development','complete_development_action',{planKey:'P',actionKey:'D1',expectedRevision:3}),200);assert.equal(plan.Status.Value,'COMPLETED');assert.equal(JSON.parse(plan.TransitionHistory)[0].action.CompletedAt,'2026-10-20T00:00:00Z');
 status(await request(f,'Development','complete_development_action',{planKey:'P',actionKey:'D1',expectedRevision:3}),409);assert.equal(plan.WorkflowLock,'');
 f=fixture();const failed=await run(flows.Development,{action:'reopen_development_action',sessionToken:'manager',planKey:'P',actionKey:'D1',reason:'fixture failure',expectedRevision:1},async(name,...args)=>{if(name==='G3_Reopen_Plan_Commit')throw Error('Injected final parent failure');return f.connector(name,...args);},'failed-fixture');
 assert.equal(failed.response,null);assert(f.tables[ids.plan][0].WorkflowLock);assert.equal(JSON.parse(f.tables[ids.plan][0].TransitionHistory)[0].eventType,'ACTION_REOPEN_REQUESTED');assert.equal(f.tables[ids.action][0].Status.Value,'PLANNED');
 status(await request(f,'Development','reopen_development_action',{planKey:'P',actionKey:'D1',reason:'retry blocked',expectedRevision:1}),409);assert(f.tables[ids.plan][0].WorkflowLock,'Ambiguous operation remains locked for reconciliation');
 console.log('PASS offline generated flows: dependency/nesting checks, unchanged auth/connections/notifications, reason/role/scope/stale/duplicate guards, Return/edit/resubmit/fresh-review/confirm, concurrent claim, plan Return, completion preservation, Reopen/recomplete');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
