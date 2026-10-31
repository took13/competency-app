// Generates private candidate definitions from owner-exported originals.
// No network, no endpoints or connection replacements, no deployment.
const fs=require('node:fs'),path=require('node:path');
const clone=x=>structuredClone(x);
function locate(actions,name){for(const [key,value]of Object.entries(actions)){if(key===name)return {parent:actions,node:value};for(const child of [value.actions,value.else?.actions])if(child){const hit=locate(child,name);if(hit)return hit;}}}
function builder(source,kind){
 const out=clone(source),root=out.properties.definition.actions;
 const find=n=>{const hit=locate(root,n);if(!hit)throw Error('Missing evidenced action '+n);return hit.node;};
 const after=n=>({[n]:['Succeeded']});
 const compose=(inputs,prev)=>({type:'Compose',inputs,...(prev?{runAfter:after(prev)}:{})});
 const term=n=>({type:'Terminate',inputs:{runStatus:'Succeeded'},runAfter:after(n)});
 const response=(status,message)=>({type:'Response',inputs:{statusCode:status,headers:{'Content-Type':'application/json'},body:{success:false,message}}});
 const check=(name,condition,code,message,prev)=>({type:'If',expression:condition,actions:{},else:{actions:{[name+'_Response']:response(code,message),[name+'_Stop']:term(name+'_Response')}},...(prev?{runAfter:after(prev)}:{})});
 const spSample=clone(find('Get_Caller_Profile').inputs);
 function sp(operation,parameters,prev){return {type:'OpenApiConnection',inputs:{host:{...clone(spSample.host),operationId:operation},parameters,authentication:spSample.authentication,retryPolicy:{type:'none'}},...(prev?{runAfter:after(prev)}:{})};}
 const dataset=spSample.parameters.dataset;
 const headerName=kind==='Employee'?'Current_My_Assessment':kind==='Manager'?'Current_Review_Assessment':'Current_Development_Plan';
 const current=`outputs('${headerName}')`;
 const headerList=find(kind==='Employee'?'Get_My_Assessment_Header':kind==='Manager'?'Get_Review_Assessment_Header':'Get_Development_Plan_Header').inputs.parameters.table;
 const uri=`@concat('_api/web/lists(guid''${headerList}'')/items(',string(${current}?['ID']),')')`;
 const revision=`int(coalesce(${current}?['Revision'],1))`;
 function http(method,headers,body,prev){return sp('HttpRequest',{dataset,'parameters/method':method,'parameters/uri':uri,'parameters/headers':headers,...(body!==undefined?{'parameters/body':body}:{})},prev);}
 function patch(parameters,prev){return sp('PatchItem',{dataset,table:headerList,id:`@${current}?['ID']`,'item/Title':`@${current}?['Title']`,...parameters},prev);}
 function allowAction(action){const valid=find('Action_Valid');valid.expression={and:[{equals:[`@or(${actionsForKind[kind].concat(action).map(a=>`equals(triggerBody()?['action'],'${a}')`).join(',')})`,true]}]};actionsForKind[kind].push(action);}
 function releaseResponses(actions){for(const[name,node]of Object.entries({...actions})){if(node.type==='Response'){
   const rel='G3_Release_'+name;actions[rel]=patch({'item/WorkflowLock':''});actions[rel].runAfter=clone(node.runAfter||{});node.runAfter=after(rel);
   // Release failure intentionally blocks the response. Never announce an
   // unlocked successful operation when the release is ambiguous.
 }else{if(node.actions)releaseResponses(node.actions);if(node.else?.actions)releaseResponses(node.else.actions);}}}
 function lock(parent,preceding,next,condition){
   const read='G3_Read_Lock',guard='G3_Lock_Available',claim='G3_Claim_Lock';
   const live=`body('${read}')?['d']`;
   const versionOK=`or(and(lessOrEquals(${revision},1),equals(triggerBody()?['expectedRevision'],null)),equals(triggerBody()?['expectedRevision'],${revision}))`;
   const body={WorkflowLock:"@workflow()?['run']?['name']"};
   const claimNode=http('POST',{'Accept':'application/json;odata=verbose','Content-Type':'application/json;odata=nometadata','X-HTTP-Method':'MERGE','IF-MATCH':`@${live}?['__metadata']?['etag']`},body,guard);
   // HTTP body must be serialized by the engine, never interpolated text.
   claimNode.inputs.parameters['parameters/body']='@string(outputs(\'G3_Claim_Body\'))';
   const group={
     [read]:http('GET',{Accept:'application/json;odata=verbose'}),
     [guard]:check(guard,`@and(empty(${live}?['WorkflowLock']),equals(${live}?['Status'],${current}?['Status']?['Value']),equals(int(coalesce(${live}?['Revision'],1)),${revision}),${versionOK},not(empty(${live}?['__metadata']?['etag'])))`,409,'Workflow state changed or is busy. Refresh before retrying.',read),
     G3_Claim_Body:compose(body,guard),
     [claim]:claimNode,
     G3_Claim_Failed:response(409,'Workflow claim failed or is ambiguous. Read back before retrying.')
   };
   claimNode.runAfter=after('G3_Claim_Body');group.G3_Claim_Failed.runAfter={[claim]:['Failed','TimedOut']};group.G3_Claim_Failed_Stop=term('G3_Claim_Failed');
   group.G3_Read_Failed=response(503,'Workflow state could not be checked. No mutation was attempted.');group.G3_Read_Failed.runAfter={[read]:['Failed','TimedOut']};group.G3_Read_Failed_Stop=term('G3_Read_Failed');
   parent.G3_Acquire_Workflow={type:'If',expression:condition,actions:group,else:{actions:{}},runAfter:after(preceding)};
   parent[next].runAfter=after('G3_Acquire_Workflow');
 }
 function historyRead(body){body.revision=`@${revision}`;body.transitionHistory=`@json(if(empty(${current}?['TransitionHistory']),'[]',${current}?['TransitionHistory']))`;body.gate3Ready=true;}
 function historyEvent(eventType,from,to,extra={}){return {eventType,previousStatus:from,newStatus:to,reason:"@trim(coalesce(triggerBody()?['reason'],''))",actor:"@outputs('Authenticated_Email')",at:'@utcNow()',runId:"@workflow()?['run']?['name']",revision:`@add(${revision},1)`,...extra};}
 function appendEvent(parent,prefix,event,prev){
   parent[prefix+'_Event']=compose(event,prev);
   parent[prefix+'_History']=compose(`@string(union(json(if(empty(${current}?['TransitionHistory']),'[]',${current}?['TransitionHistory'])),createArray(outputs('${prefix}_Event'))))`,prefix+'_Event');
   parent[prefix+'_Capacity']=check(prefix+'_Capacity',`@lessOrEquals(length(outputs('${prefix}_History')),50000)`,409,'Transition history capacity reached. Support review is required.',prefix+'_History');
   return prefix+'_Capacity';
 }
 function transitionInput(parent,prefix,allowed,prev){
   parent[prefix+'_Reason']=check(prefix+'_Reason',"@and(greater(length(trim(coalesce(triggerBody()?['reason'],''))),0),lessOrEquals(length(trim(coalesce(triggerBody()?['reason'],''))),2000))",400,'A reason of 1 to 2000 characters is required.',prev);
   parent[prefix+'_Input']=check(prefix+'_Input',`@and(equals(triggerBody()?['expectedRevision'],${revision}),${allowed})`,409,'Current revision and an allowed state are required for this transition.',prefix+'_Reason');return prefix+'_Input';
 }

 if(kind==='Manager'){
   out.properties.definition.triggers.manual.inputs.schema={type:'object',properties:{reason:{type:'string'},expectedRevision:{type:'integer'}}};
   allowAction('return_assessment');
   const readBody=find('Response_Review_Assessment').inputs.body.assessment;historyRead(readBody);
   find('Select_Review_Assessment_Items').inputs.select.reviewRevision="@item()?['Revision']";
   for(const name of ['Filter_Validated_Items','Filter_Validated_For_Confirmation']){const q=find(name);q.inputs.where=`@and(${q.inputs.where.replace(/^@/,'')},or(lessOrEquals(${revision},1),equals(int(coalesce(item()?['Revision'],0)),${revision})))`;}
   find('Save_Manager_Review_Item').inputs.parameters['item/Revision']=`@${current}?['Revision']`;
   const branches=['Is_Save_Manager_Review','Review_Confirmable','All_Items_Validated'];branches.forEach(n=>releaseResponses({[n]:find(n)}));
   lock(root,'Is_Get_Review_Assessment','Is_Save_Manager_Review',"@not(equals(triggerBody()?['action'],'get_review_assessment'))");
   const actions={};
   let prev=transitionInput(actions,'G3_Return',`equals(${current}?['Status']?['Value'],'SUBMITTED')`);
   actions.G3_Return_Items=clone(find('Get_Items_For_Confirmation'));actions.G3_Return_Items.runAfter=after(prev);
   actions.G3_Return_Snapshot={type:'Select',inputs:{from:"@body('G3_Return_Items')?['value']",select:{itemKey:"@item()?['ItemKey']",selfLevel:"@item()?['SelfLevel']",selfEvidence:"@item()?['SelfEvidence']",validatedLevel:"@item()?['ValidatedLevel']",managerComment:"@item()?['ManagerComment']",revision:"@item()?['Revision']"}},runAfter:after('G3_Return_Items')};
   prev=appendEvent(actions,'G3_Return',historyEvent('ASSESSMENT_RETURNED','SUBMITTED','RETURNED',{items:"@body('G3_Return_Snapshot')"}),'G3_Return_Snapshot');
   actions.G3_Return_Commit=patch({'item/Status/Value':'RETURNED','item/Revision':`@add(${revision},1)`,'item/TransitionHistory':"@outputs('G3_Return_History')"},prev);
   actions.G3_Return_Response={type:'Response',inputs:{statusCode:200,body:{success:true,assessmentKey:`@${current}?['AssessmentKey']`,status:'RETURNED',revision:`@add(${revision},1)`}},runAfter:after('G3_Return_Commit')};actions.G3_Return_Stop=term('G3_Return_Response');releaseResponses(actions);
   root.G3_Is_Return_Assessment={type:'If',expression:"@equals(triggerBody()?['action'],'return_assessment')",actions,else:{actions:{}},runAfter:after('G3_Acquire_Workflow')};root.Is_Save_Manager_Review.runAfter=after('G3_Is_Return_Assessment');
 }
 if(kind==='Employee'){
   out.properties.definition.triggers.manual.inputs.schema.properties.expectedRevision={type:'integer'};
   historyRead(find('Response_8').inputs.body.assessment);
   const save=find('Is_Save_Self_Assessment').actions,submit=find('Is_Submit_Assessment').actions;
   find('Assessment_Editable').expression=`@contains(createArray('ASSIGNED','IN_PROGRESS','RETURNED'),${current}?['Status']?['Value'])`;
   find('Assessment_Submittable').expression=`@contains(createArray('IN_PROGRESS','RETURNED'),${current}?['Status']?['Value'])`;
   releaseResponses(save);releaseResponses(submit);
   lock(root,'Current_My_Assessment','Is_Save_Self_Assessment',"@contains(createArray('save_self_assessment','submit_assessment'),triggerBody()?['action'])");
   // Preserve the round's full pre-resubmit state, without replacing self data.
   const commit=find('Submit_Assessment');const parent=locate(root,'Submit_Assessment').parent;
   const prev=appendEvent(parent,'G3_Submit',{
     eventType:`@if(equals(${current}?['Status']?['Value'],'RETURNED'),'ASSESSMENT_RESUBMITTED','ASSESSMENT_SUBMITTED')`,
     previousStatus:`@${current}?['Status']?['Value']`,newStatus:'SUBMITTED',actor:"@outputs('Authenticated_Email')",at:'@utcNow()',revision:`@${revision}`,runId:"@workflow()?['run']?['name']"
   });
   commit.runAfter=after(prev);commit.inputs.parameters['item/TransitionHistory']="@outputs('G3_Submit_History')";
   releaseResponses(parent.G3_Submit_Capacity.else.actions);
 }
 if(kind==='Development'){
   allowAction('return_development_plan');allowAction('reopen_development_action');
   out.properties.definition.triggers.manual.inputs.schema.properties.reason={type:'string'};
   out.properties.definition.triggers.manual.inputs.schema.properties.expectedRevision={type:'integer'};
   historyRead(find('Response_Development_Plan').inputs.body.plan);
   const base=locate(root,'Is_Save_Development_Action').parent;
   releaseResponses({Is_Save_Development_Action:find('Is_Save_Development_Action')});
   lock(base,'Development_Action_Edit_Allowed','Is_Save_Development_Action','@true');
   // Completed actions survive a plan return. Only a deliberate Reopen may make
   // one editable; normal save must never erase a completion.
   const save=find('Is_Save_Development_Action').actions;
   save.G3_Action_Not_Completed=check('G3_Action_Not_Completed',"@not(equals(outputs('Current_Development_Action')?['Status']?['Value'],'COMPLETED'))",409,'Reopen the completed action with a reason before editing.','Current_Development_Action');
   find('Development_Action_Type_Valid').runAfter=after('G3_Action_Not_Completed');releaseResponses(save.G3_Action_Not_Completed.else.actions);
   // The evidenced start filter validates content, not action status; completed
   // actions already satisfy it. Preserve that filter exactly.
   const completeParent=locate(root,'Current_Complete_Action').parent;
   completeParent.G3_Complete_Once=check('G3_Complete_Once',"@not(equals(outputs('Current_Complete_Action')?['Status']?['Value'],'COMPLETED'))",409,'Action is already completed. Refresh the plan.','Current_Complete_Action');
   find('Complete_Development_Action').runAfter=after('G3_Complete_Once');releaseResponses(completeParent.G3_Complete_Once.else.actions);
   const branch={};let prev=transitionInput(branch,'G3_Plan_Return',`equals(${current}?['Status']?['Value'],'IN_PROGRESS')`);
   branch.G3_Plan_Return_Actions=clone(find('Get_Start_Plan_Actions'));branch.G3_Plan_Return_Actions.runAfter=after(prev);
   branch.G3_Plan_Return_Snapshot=clone(find('Select_Development_Plan_Actions'));branch.G3_Plan_Return_Snapshot.inputs.from="@body('G3_Plan_Return_Actions')?['value']";branch.G3_Plan_Return_Snapshot.runAfter=after('G3_Plan_Return_Actions');
   prev=appendEvent(branch,'G3_Plan_Return',historyEvent('PLAN_RETURNED','IN_PROGRESS','DRAFT',{actions:"@body('G3_Plan_Return_Snapshot')"}),'G3_Plan_Return_Snapshot');
   branch.G3_Plan_Return_Commit=patch({'item/Status/Value':'DRAFT','item/Revision':`@add(${revision},1)`,'item/TransitionHistory':"@outputs('G3_Plan_Return_History')"},prev);
   branch.G3_Plan_Return_Response={type:'Response',inputs:{statusCode:200,body:{success:true,planKey:`@${current}?['PlanKey']`,status:'DRAFT',revision:`@add(${revision},1)`}},runAfter:after('G3_Plan_Return_Commit')};branch.G3_Plan_Return_Stop=term('G3_Plan_Return_Response');releaseResponses(branch);
   base.G3_Is_Plan_Return={type:'If',expression:"@equals(triggerBody()?['action'],'return_development_plan')",actions:branch,else:{actions:{}},runAfter:after('G3_Acquire_Workflow')};
   const reopen={};prev=transitionInput(reopen,'G3_Reopen',`contains(createArray('DRAFT','IN_PROGRESS','COMPLETED'),${current}?['Status']?['Value'])`);
   reopen.G3_Reopen_Action=clone(find('Get_Complete_Development_Action'));reopen.G3_Reopen_Action.runAfter=after(prev);
   reopen.G3_Reopen_Count=check('G3_Reopen_Count',"@equals(length(body('G3_Reopen_Action')?['value']),1)",404,'Development action not found in this plan.','G3_Reopen_Action');
   reopen.G3_Reopen_Valid=check('G3_Reopen_Valid',"@equals(first(body('G3_Reopen_Action')?['value'])?['Status']?['Value'],'COMPLETED')",409,'Only a completed action can be reopened.','G3_Reopen_Count');
   const nextStatus=`@if(equals(${current}?['Status']?['Value'],'COMPLETED'),'IN_PROGRESS',${current}?['Status']?['Value'])`;
   const oldAction="first(body('G3_Reopen_Action')?['value'])";
   const snapshot=Object.fromEntries(['ActionKey','Status','CompletedAt','ActionType','DevelopmentAction','SuccessMeasure','OwnerEmail','TargetDate','ManagerNote','EmployeeNote','Revision'].map(key=>[key,`@${oldAction}?['${key}']`]));
   prev=appendEvent(reopen,'G3_Reopen',historyEvent('ACTION_REOPEN_REQUESTED',`@${current}?['Status']?['Value']`,nextStatus,{action:snapshot,previousPlanCompletedAt:`@${current}?['CompletedAt']`}),'G3_Reopen_Valid');
   // Durable intent precedes the action write. Failure keeps WorkflowLock set;
   // support can reconcile the recorded before state. Never auto-unlock on TTL.
   reopen.G3_Reopen_Intent=patch({'item/TransitionHistory':"@outputs('G3_Reopen_History')"},prev);
   reopen.G3_Reopen_Action_Commit=clone(find('Complete_Development_Action'));reopen.G3_Reopen_Action_Commit.inputs.parameters.id="@first(body('G3_Reopen_Action')?['value'])?['ID']";reopen.G3_Reopen_Action_Commit.inputs.parameters['item/Title']="@first(body('G3_Reopen_Action')?['value'])?['Title']";reopen.G3_Reopen_Action_Commit.inputs.parameters['item/Status/Value']='PLANNED';delete reopen.G3_Reopen_Action_Commit.inputs.parameters['item/CompletedAt'];reopen.G3_Reopen_Action_Commit.inputs.retryPolicy={type:'none'};reopen.G3_Reopen_Action_Commit.runAfter=after('G3_Reopen_Intent');
   reopen.G3_Reopen_Done=compose(historyEvent('ACTION_REOPENED',`@${current}?['Status']?['Value']`,nextStatus,{actionKey:"@triggerBody()?['actionKey']"}),'G3_Reopen_Action_Commit');
   reopen.G3_Reopen_Plan_Commit=patch({'item/Status/Value':nextStatus,'item/Revision':`@add(${revision},1)`,'item/TransitionHistory':"@string(union(json(outputs('G3_Reopen_History')),createArray(outputs('G3_Reopen_Done'))))"},'G3_Reopen_Done');
   reopen.G3_Reopen_Response={type:'Response',inputs:{statusCode:200,body:{success:true,planKey:`@${current}?['PlanKey']`,actionKey:"@triggerBody()?['actionKey']",actionStatus:'PLANNED',planStatus:nextStatus,revision:`@add(${revision},1)`}},runAfter:after('G3_Reopen_Plan_Commit')};reopen.G3_Reopen_Stop=term('G3_Reopen_Response');releaseResponses(reopen);
   base.G3_Is_Action_Reopen={type:'If',expression:"@equals(triggerBody()?['action'],'reopen_development_action')",actions:reopen,else:{actions:{}},runAfter:after('G3_Is_Plan_Return')};base.Is_Save_Development_Action.runAfter=after('G3_Is_Action_Reopen');
 }
 return out;
}
const initial={Manager:['get_my_reviews','get_review_assessment','save_manager_review','confirm_assessment'],Employee:['get_my_assignments','get_my_assessment','save_self_assessment','submit_assessment'],Development:['get_assessment_result','create_development_plan','get_development_plan','save_development_action','start_development_plan','complete_development_action']};
let actionsForKind=clone(initial);
function build(source,kind){actionsForKind=clone(initial);return builder(source,kind);}
module.exports={build,locate};
if(require.main===module){const[input,output]=process.argv.slice(2);if(!input||!output)throw Error('Supply private baseline and output directories');fs.mkdirSync(output,{recursive:true});for(const kind of Object.keys(initial)){const source=JSON.parse(fs.readFileSync(path.join(input,kind+'.json'),'utf8').replace(/^\uFEFF/,''));fs.writeFileSync(path.join(output,kind+'.json'),JSON.stringify(build(source,kind),null,2));}console.log('Prepared private candidate definitions; NOT deployed or live-validated.');}
