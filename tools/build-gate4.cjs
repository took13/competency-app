// Internal instrumentation helper and cumulative-capacity experiment.
// Deployment candidates MUST use build-gate4-event-store.cjs instead.
const {locate} = require('./build-gate3.cjs');
const clone = x => structuredClone(x);
const after = n => ({[n]: ['Succeeded']});
const fields = {
  assessment: ['AssessmentKey','Status','Revision','SubmittedAt','ConfirmedAt'],
  item: ['ItemKey','SelfLevel','SelfEvidence','ValidatedLevel','ManagerComment','ItemStatus','Revision','LastSavedAt'],
  plan: ['PlanKey','Status','Revision','StartedAt','CompletedAt'],
  action: ['ActionKey','Status','ActionType','DevelopmentAction','SuccessMeasure','OwnerEmail','TargetDate','CompletedAt','Revision']
};
const specs = {
  Employee: [
    ['Save_Self_Assessment_Item','Current_My_Item','item','SELF_SAVED','Response_12'],
    ['Submit_Assessment','Current_My_Assessment','assessment','ASSESSMENT_SUBMITTED','Response_15']
  ],
  Manager: [
    ['Save_Manager_Review_Item','Current_Review_Item','item','REVIEW_SAVED','Response_Manager_Review_Saved'],
    ['Confirm_Assessment','Current_Review_Assessment','assessment','ASSESSMENT_CONFIRMED','Response_Assessment_Confirmed']
  ],
  Development: [
    ['Save_Development_Action','Current_Development_Action','action','DEVELOPMENT_ACTION_SAVED','Response_Development_Action_Saved'],
    ['Start_Development_Plan','Current_Development_Plan','plan','PLAN_STARTED','Response_Development_Plan_Started'],
    ['Complete_Development_Action','Current_Complete_Action','action','ACTION_COMPLETED','Response_Development_Action_Completed']
  ]
};
function build(source, kind) {
  if (!specs[kind]) throw Error('Unsupported flow kind');
  const out = clone(source), root = out.properties.definition.actions;
  const find = n => {const x=locate(root,n);if(!x)throw Error('Missing baseline action '+n);return x.node;};
  if (locate(root,'G4_'+specs[kind][0][0]+'_Intent')) throw Error('Already instrumented');
  const header = kind==='Employee'?'Current_My_Assessment':kind==='Manager'?'Current_Review_Assessment':'Current_Development_Plan';
  const current = `outputs('${header}')`;
  const releaseSample = find('G3_Release_'+specs[kind][0][4]);
  const parentParams = clone(releaseSample.inputs.parameters);
  delete parentParams['item/WorkflowLock'];
  const patch = (params, dep) => ({...clone(releaseSample),inputs:{...clone(releaseSample.inputs),parameters:{...parentParams,...params},retryPolicy:{type:'none'}},runAfter:dep||{}});
  const compose = (inputs, dep) => ({type:'Compose',inputs,runAfter:dep||{}});
  const snapshot = (expr,type) => Object.fromEntries(fields[type].map(f=>[f,`@${expr}?['${f}']`]));
  const history = expr => `json(if(empty(${expr}?['TransitionHistory']),'[]',${expr}?['TransitionHistory']))`;
  const readParent = dep => ({type:'OpenApiConnection',inputs:{host:{...clone(releaseSample.inputs.host),operationId:'HttpRequest'},authentication:releaseSample.inputs.authentication,retryPolicy:{type:'none'},parameters:{dataset:parentParams.dataset,'parameters/method':'GET','parameters/uri':`@concat('_api/web/lists(guid''${parentParams.table}'')/items(',string(${current}?['ID']),')')`,'parameters/headers':{Accept:'application/json;odata=verbose'}}},runAfter:dep});
  // Revision denotes review round. History equality additionally detects saves
  // which finish between the authorized read and the existing exact-ETag claim.
  const guard=find('G3_Lock_Available');
  guard.expression=`@and(${guard.expression.slice(1)},equals(coalesce(body('G3_Read_Lock')?['d']?['TransitionHistory'],''),coalesce(${current}?['TransitionHistory'],'')))`;
  for (const [write,beforeName,type,eventType,response] of specs[kind]) {
    const location=locate(root,write), node=location.node, group=location.parent;
    const prefix='G4_'+write;
    const event={schemaVersion:1,eventType,entityType:type,entityKey:`@outputs('${beforeName}')?['${type==='item'?'ItemKey':type==='action'?'ActionKey':type==='plan'?'PlanKey':'AssessmentKey'}']`,actor:"@outputs('Authenticated_Email')",at:'@utcNow()',correlationId:"@workflow()?['run']?['name']",eventId:`@concat(workflow()?['run']?['name'],'|${write}')`,revision:`@${current}?['Revision']`,phase:'REQUESTED',before:snapshot(`outputs('${beforeName}')`,type),beforeParent:snapshot(current,kind==='Development'?'plan':'assessment')};
    if(write==='Submit_Assessment')event.eventType=`@if(equals(${current}?['Status']?['Value'],'RETURNED'),'ASSESSMENT_RESUBMITTED','ASSESSMENT_SUBMITTED')`;
    event.proposed=Object.fromEntries(Object.entries(node.inputs.parameters).filter(([k])=>k.startsWith('item/')&&!['item/Title','item/TransitionHistory'].includes(k)));
    group[prefix+'_Intent']=compose(event,clone(node.runAfter||{}));
    group[prefix+'_IntentHistory']=compose(`@string(union(${history(current)},createArray(outputs('${prefix}_Intent'))))`,after(prefix+'_Intent'));
    // Reserve room for both projected snapshots. Never truncate old evidence.
    group[prefix+'_Capacity']={type:'If',expression:`@lessOrEquals(add(length(outputs('${prefix}_IntentHistory')),add(length(string(outputs('${prefix}_Intent'))),add(length(string(outputs('${prefix}_Intent')?['before'])),add(length(string(outputs('${prefix}_Intent')?['proposed'])),2000)))),50000)`,actions:{},else:{actions:{
      [prefix+'_Release']:patch({'item/WorkflowLock':''}),
      [prefix+'_Full']:{type:'Response',inputs:{statusCode:409,body:{success:false,message:'Audit capacity reached. Support archival is required.'}},runAfter:after(prefix+'_Release')},
      [prefix+'_Stop']:{type:'Terminate',inputs:{runStatus:'Succeeded'},runAfter:after(prefix+'_Full')}
    }},runAfter:after(prefix+'_IntentHistory')};
    group[prefix+'_PersistIntent']=patch({'item/TransitionHistory':`@outputs('${prefix}_IntentHistory')`},after(prefix+'_Capacity'));
    node.runAfter=after(prefix+'_PersistIntent');
    if(write==='Submit_Assessment') node.inputs.parameters['item/TransitionHistory']=`@string(union(json(outputs('${prefix}_IntentHistory')),createArray(outputs('G3_Submit_Event'))))`;
    const releaseLoc=locate(root,'G3_Release_'+response), release=releaseLoc.node, finish=releaseLoc.parent;
    finish[prefix+'_ReadAfter']=readParent(clone(release.runAfter||{}));
    const done={...clone(event),phase:'COMMITTED',at:'@utcNow()',after:snapshot(`body('${write}')`,type),afterParent:snapshot(`body('${prefix}_ReadAfter')?['d']`,kind==='Development'?'plan':'assessment')};
    // The same eventId links the durable before/proposed intent. Do not copy
    // those snapshots again into the completion record.
    delete done.before;delete done.beforeParent;delete done.proposed;
    finish[prefix+'_Done']=compose(done,after(prefix+'_ReadAfter'));
    finish[prefix+'_FinalHistory']=compose(`@string(union(${history(`body('${prefix}_ReadAfter')?['d']`)},createArray(outputs('${prefix}_Done'))))`,after(prefix+'_Done'));
    finish[prefix+'_FinalCapacity']={type:'If',expression:`@lessOrEquals(length(outputs('${prefix}_FinalHistory')),50000)`,actions:{},else:{actions:{
      [prefix+'_Reconcile']:{type:'Response',inputs:{statusCode:503,body:{success:false,message:'Business write may have completed. Audit reconciliation required; do not retry.'}}},
      [prefix+'_Halt']:{type:'Terminate',inputs:{runStatus:'Succeeded'},runAfter:after(prefix+'_Reconcile')}
    }},runAfter:after(prefix+'_FinalHistory')};
    finish[prefix+'_Commit']=patch({'item/TransitionHistory':`@outputs('${prefix}_FinalHistory')`},after(prefix+'_FinalCapacity'));
    release.runAfter=after(prefix+'_Commit');
  }
  // Add correlation to existing Return/Reopen metadata, preserving all old keys.
  function enrich(actions){for(const[n,v]of Object.entries(actions||{})){
    if(v.type==='Compose'&&v.inputs&&typeof v.inputs==='object'&&v.inputs.eventType&&n.startsWith('G3_')){
      Object.assign(v.inputs,{schemaVersion:1,correlationId:"@workflow()?['run']?['name']",eventId:`@concat(workflow()?['run']?['name'],'|${n}')`});
      if(['G3_Return_Event','G3_Plan_Return_Event'].includes(n)){
        v.inputs.phase='COMMITTED';v.inputs.before=snapshot(current,kind==='Development'?'plan':'assessment');
        v.inputs.after={...snapshot(current,kind==='Development'?'plan':'assessment'),Status:v.inputs.newStatus,Revision:v.inputs.revision};
      }
      if(n==='G3_Reopen_Event'){
        v.inputs.phase='REQUESTED';v.inputs.eventId="@concat(workflow()?['run']?['name'],'|G3_Reopen')";v.inputs.before=snapshot("first(body('G3_Reopen_Action')?['value'])",'action');v.inputs.proposed={Status:'PLANNED'};
      }
      if(n==='G3_Reopen_Done'){
        v.inputs.phase='COMMITTED';v.inputs.eventId="@concat(workflow()?['run']?['name'],'|G3_Reopen')";v.inputs.before=snapshot("first(body('G3_Reopen_Action')?['value'])",'action');v.inputs.after=snapshot("body('G3_Reopen_Action_Commit')",'action');
      }
    }
    enrich(v.actions);enrich(v.else?.actions);
  }}enrich(root);
  if(kind==='Development'){
    const create=find('Create_Development_Plan_Header'), draft=find('Update_Development_Plan_Draft');
    const start={schemaVersion:1,eventType:'PLAN_CREATED',entityType:'plan',entityKey:"@outputs('Development_Plan_Key')",actor:"@outputs('Authenticated_Email')",at:'@utcNow()',correlationId:"@workflow()?['run']?['name']",eventId:"@concat(workflow()?['run']?['name'],'|PLAN_CREATED')",phase:'REQUESTED',before:null,proposed:{Status:'PREPARING'}};
    const location=locate(root,'Create_Development_Plan_Header');
    location.parent.G4_Plan_Create_Intent=compose(start,clone(create.runAfter||{}));create.runAfter=after('G4_Plan_Create_Intent');
    create.inputs.parameters['item/TransitionHistory']="@string(createArray(outputs('G4_Plan_Create_Intent')))";
    const end={...clone(start),phase:'COMMITTED',at:'@utcNow()',after:{...snapshot("body('Create_Development_Plan_Header')",'plan'),Status:'DRAFT'},createdActionCount:"@outputs('Created_Development_Action_Count')"};
    const final=locate(root,'Update_Development_Plan_Draft');final.parent.G4_Plan_Create_Done=compose(end,clone(draft.runAfter||{}));draft.runAfter=after('G4_Plan_Create_Done');
    draft.inputs.parameters['item/TransitionHistory']="@string(createArray(outputs('G4_Plan_Create_Intent'),outputs('G4_Plan_Create_Done')))";
  }
  return out;
}
module.exports={build,specs};
if(require.main===module)throw Error('Use tools/build-gate4-event-store.cjs. Cumulative audit is a capacity experiment, not a deployment candidate.');
