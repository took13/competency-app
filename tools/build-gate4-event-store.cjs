// Candidate implementation for the separately provisioned audit-event list.
// Requires its verified list GUID. Never creates lists or deploys flows.
const fs=require('node:fs'),path=require('node:path');
const cumulative=require('./build-gate4.cjs');
const {locate}=require('./build-gate3.cjs');
const clone=x=>structuredClone(x),after=n=>({[n]:['Succeeded']});
function build(source,kind,auditListId){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auditListId||''))throw Error('A verified audit list GUID is required');
 const out=cumulative.build(source,kind),root=out.properties.definition.actions;
 const find=n=>{const x=locate(root,n);if(!x)throw Error('Missing '+n);return x.node;};
 const header=kind==='Employee'?'Current_My_Assessment':kind==='Manager'?'Current_Review_Assessment':'Current_Development_Plan';
 const parentType=kind==='Development'?'PLAN':'ASSESSMENT';
 const keyField=kind==='Development'?'PlanKey':'AssessmentKey';
 const parentKey=`@concat('${parentType}|',outputs('${header}')?['${keyField}'])`;
 const sample=find('G3_Release_'+cumulative.specs[kind][0][4]);
 function append(eventOutput,phase,dependency,scope=parentKey){return {type:'OpenApiConnection',inputs:{host:{...clone(sample.inputs.host),operationId:'PostItem'},authentication:sample.inputs.authentication,retryPolicy:{type:'none'},parameters:{dataset:sample.inputs.parameters.dataset,table:auditListId,'item/Title':`@concat(outputs('${eventOutput}')?['eventId'],'|${phase}')`,'item/ParentKey':scope,'item/EventPayload':`@string(outputs('${eventOutput}'))`}},runAfter:dependency||{}};}
 for(const[write,,, ,response]of cumulative.specs[kind]){
  const prefix='G4_'+write,group=locate(root,prefix+'_Intent').parent;
  const intent=find(prefix+'_Intent');
  // Each payload is independently bounded; old audit rows never get rewritten.
  group[prefix+'_Capacity'].expression=`@lessOrEquals(length(string(outputs('${prefix}_Intent'))),20000)`;
  group[prefix+'_Capacity'].runAfter=after(prefix+'_Intent');delete group[prefix+'_IntentHistory'];
  group[prefix+'_PersistIntent']=append(prefix+'_Intent','REQUESTED',after(prefix+'_Capacity'));
  if(write==='Submit_Assessment')find(write).inputs.parameters['item/TransitionHistory']="@outputs('G3_Submit_History')";
  const finish=locate(root,prefix+'_Done').parent;
  delete finish[prefix+'_FinalHistory'];
  finish[prefix+'_FinalCapacity'].expression=`@lessOrEquals(length(string(outputs('${prefix}_Done'))),50000)`;
  finish[prefix+'_FinalCapacity'].runAfter=after(prefix+'_Done');
  finish[prefix+'_Commit']=append(prefix+'_Done','COMMITTED',after(prefix+'_FinalCapacity'));
 }
 if(kind==='Development'){
  const create=find('Create_Development_Plan_Header'),draft=find('Update_Development_Plan_Draft');
  delete create.inputs.parameters['item/TransitionHistory'];delete draft.inputs.parameters['item/TransitionHistory'];
  const group=locate(root,'G4_Plan_Create_Intent').parent;
  const scope="@concat('PLAN|',outputs('Development_Plan_Key'))";
  group.G4_Plan_Create_PersistIntent=append('G4_Plan_Create_Intent','REQUESTED',after('G4_Plan_Create_Intent'),scope);
  create.runAfter=after('G4_Plan_Create_PersistIntent');
  const final=locate(root,'Update_Development_Plan_Draft').parent;
  final.G4_Plan_Create_Commit=append('G4_Plan_Create_Done','COMMITTED',after('Update_Development_Plan_Draft'),scope);
  find('Response_Development_Plan_Created').runAfter=after('G4_Plan_Create_Commit');
 }
 // Read only after the original session/profile/owner/reviewer guards. No new
 // public audit endpoint, client-provided scope or generic list reader exists.
 const readResponse=kind==='Employee'?'Response_8':kind==='Manager'?'Response_Review_Assessment':'Response_Development_Plan';
 const response=find(readResponse),group=locate(root,readResponse).parent;
 group.G4_Read_Audit={type:'OpenApiConnection',inputs:{host:{...clone(sample.inputs.host),operationId:'GetItems'},authentication:sample.inputs.authentication,retryPolicy:{type:'none'},parameters:{dataset:sample.inputs.parameters.dataset,table:auditListId,'$filter':`@concat('ParentKey eq ''',replace(concat('${parentType}|',outputs('${header}')?['${keyField}']),'''',''''''),'''')`,'$orderby':'ID desc','$top':500}},runAfter:clone(response.runAfter||{})};
 group.G4_Select_Audit={type:'Select',inputs:{from:"@body('G4_Read_Audit')?['value']",select:"@json(item()?['EventPayload'])"},runAfter:after('G4_Read_Audit')};
 response.runAfter=after('G4_Select_Audit');
 const body=kind==='Development'?response.inputs.body.plan:response.inputs.body.assessment;
 body.auditHistory="@body('G4_Select_Audit')";body.auditHistoryMayBeTruncated="@equals(length(body('G4_Read_Audit')?['value']),500)";body.gate4Ready=true;
 return out;
}
module.exports={build};
if(require.main===module){const[input,output,listId]=process.argv.slice(2);if(!input||!output)throw Error('Supply private baselines, private candidates and verified audit list GUID');fs.mkdirSync(output,{recursive:true});for(const k of ['Employee','Manager','Development']){const d=JSON.parse(fs.readFileSync(path.join(input,k+'.json'),'utf8').replace(/^\uFEFF/,''));fs.writeFileSync(path.join(output,k+'.json'),JSON.stringify(build(d,k,listId),null,2));}console.log('Prepared event-store candidates. NOT deployed or live-validated.');}
