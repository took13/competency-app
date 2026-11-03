// Offline candidate only. Deploy as a NEW endpoint after access approval and
// comparison against a fresh Manager export; never replace Manager/Assignment.
const {locate}=require('./build-gate3.cjs');
const crypto=require('node:crypto');
const allowed=['get_my_reviews','get_review_assessment','save_manager_review','confirm_assessment','return_assessment'];
function build(source){
 const out=structuredClone(source),root=out.properties.definition.actions;
 const get=n=>{const h=locate(root,n);if(!h)throw Error('Missing baseline action '+n);return h.node;};
 // Require the existing revision/lock implementation instead of silently
 // generating a reviewer endpoint from an old, unprotected flow.
 for(const n of ['G3_Acquire_Workflow','G3_Is_Return_Assessment','Review_Access_Allowed','Filter_Accessible_Submitted_Reviews'])get(n);
 const oldGuard=JSON.stringify(get('Review_Access_Allowed').expression);
 if(!oldGuard.includes('ReviewerEmail')||!oldGuard.includes('Authenticated_Email'))throw Error('Missing assigned-reviewer baseline');
 get('Action_Valid').expression="@and(contains(createArray("+allowed.map(x=>"'"+x+"'").join(',')+"),triggerBody()?['action']),not(contains(triggerBody(),'role')),not(contains(triggerBody(),'appRole')),not(contains(triggerBody(),'employeeEmail')),not(contains(triggerBody(),'reviewerEmail')),not(contains(triggerBody(),'discipline')),not(contains(triggerBody(),'scope')))";
 get('Caller_Authorized').expression="@equals(outputs('Current_Caller_Profile')?['AppRole']?['Value'],'SVP')";
 // Quote every raw key in list filters, including item lookups nested inside
 // writes. A forged itemKey must never turn its AssessmentKey predicate into OR.
 function escapeKeys(actions){for(const node of Object.values(actions||{})){
  const p=node.inputs?.parameters;
  if(p?.$filter)for(const raw of ["triggerBody()?['assessmentKey']","triggerBody()?['itemKey']","outputs('Current_Review_Assessment')?['AssessmentKey']"]){
   if(p.$filter.includes(raw))p.$filter=p.$filter.replaceAll(raw,`replace(coalesce(${raw},''),'''','''''')`);
  }
  escapeKeys(node.actions);escapeKeys(node.else?.actions);
 }}
 // Existing G4 filters already escape the parent key; do not double-escape.
 const audit=get('G4_Read_Audit').inputs.parameters.$filter;
 escapeKeys(root);get('G4_Read_Audit').inputs.parameters.$filter=audit;
 // Exactly one authenticated session/profile, including duplicates beyond the
 // old top=1 query. Quote escaping keeps caller input inside an OData literal.
 for(const [read,guard,field,value]of [
  ['Get_Session_By_Token','Session_Found','SessionToken',"triggerBody()?['sessionToken']"],
  ['Get_Caller_Profile','Caller_Profile_Found','EmployeeEmail',"outputs('Authenticated_Email')"]
 ]){
  get(read).inputs.parameters.$top=2;
  get(read).inputs.parameters.$filter=`@concat('${field} eq ''',replace(coalesce(${value},''),'''',''''''),'''')`;
  get(guard).expression=`@equals(length(body('${read}')?['value']),1)`;
 }
 const guard=get('Review_Access_Allowed');
 guard.expression="@and(equals(outputs('Current_Review_Assessment')?['IsActive'],true),not(empty(trim(coalesce(outputs('Current_Review_Assessment')?['ReviewerEmail'],'')))),equals(toLower(trim(outputs('Current_Review_Assessment')?['ReviewerEmail'])),toLower(trim(outputs('Authenticated_Email')))))";
 // Queue projection retains the existing server-side ReviewerEmail predicate.
 // Fail closed rather than returning a silently truncated queue.
 const queue=get('Is_Get_My_Reviews').actions;
 get('Get_Review_Assignments').inputs.parameters.$top=501;
 queue.SVP_Queue_Complete={type:'If',expression:"@and(less(length(body('Get_Review_Assignments')?['value']),501),empty(body('Get_Review_Assignments')?['@odata.nextLink']),empty(body('Get_Review_Assignments')?['odata.nextLink']))",actions:{},else:{actions:{SVP_Queue_Unavailable:{type:'Response',inputs:{statusCode:503,body:{success:false,message:'Review queue is incomplete; no partial data returned.'}}},SVP_Queue_Stop:{type:'Terminate',inputs:{runStatus:'Succeeded'},runAfter:{SVP_Queue_Unavailable:['Succeeded']}}}},runAfter:{Get_Review_Assignments:['Succeeded']}};
 get('Filter_Accessible_Submitted_Reviews').runAfter={SVP_Queue_Complete:['Succeeded']};
 out.properties.displayName='Competency_SVP_Assigned_Reviewer_API_v1';
 // A standalone import must never retain the production Manager identity.
 out.name='6809b41c-b36b-4a54-b4f6-e97624798823';
 out.id=String(out.id).replace(source.name,out.name);
 return out;
}
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
module.exports={build,allowed,hash};
if(require.main===module){const fs=require('node:fs');const [src,dest]=process.argv.slice(2);if(!src||!dest)throw Error('Supply private source and candidate paths');const d=JSON.parse(fs.readFileSync(src,'utf8').replace(/^\uFEFF/,''));fs.writeFileSync(dest,JSON.stringify(build(d),null,2));console.log(JSON.stringify({candidate:dest,baselineSha256:hash(d),deployed:false}));}
