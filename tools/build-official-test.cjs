// Standalone, offline-only Official TEST candidate. Never replaces Assignment.
// No recovery mutations or notifications; ambiguous producers remain PREPARING.
const fs=require('node:fs'),crypto=require('node:crypto');
const {locate}=require('./build-gate3.cjs');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const q=x=>"'"+String(x).replaceAll("'","''")+"'";
const eq=(a,b)=>`equals(${a},${typeof b==='string'?q(b):JSON.stringify(b)})`;
const all=xs=>`@and(${xs.join(',')})`;
function snapshots(data){return data.requirements.map(r=>{const v=data.cuVersions.filter(v=>v.CUVersionKey===r.CUVersionKey&&v.CUKey===r.CUKey);if(v.length!==1)throw Error('Ambiguous CU version');return {CUKey:r.CUKey,CUVersionKey:r.CUVersionKey,CompetencyNameSnapshot:r.CompetencyNameSnapshot,CompetencyGroupSnapshot:r.CompetencyGroup,GeneralStatementSnapshot:v[0].GeneralStatement,...Object.fromEntries([1,2,3,4,5].map(n=>['Level'+n+'Snapshot',v[0]['Level'+n+'Behavior']])),TargetLevelSnapshot:Number(r.TargetLevel),DisplayOrder:Number(r.DisplayOrder)};});}
function build(source,data,policy={}){
 const scope='ETM_OFFICIAL_TEST_20261103_01',profile=scope+'_ETM_PI_SR_9_10_R1';
 if(data.cycle.CycleKey!==scope||data.cycle.CycleType!=='ADHOC'||data.framework.FrameworkCode!==scope||data.profile.ProfileVersionKey!==profile||data.productionAllowed!==false)throw Error('Dataset outside isolated ADHOC TEST');
 const items=snapshots(data),hash=digest(data);
 if(items.length!==12||new Set(items.map(x=>x.CUKey)).size!==12||new Set(items.map(x=>x.DisplayOrder)).size!==12||/MOCK-ONLY/.test(JSON.stringify(data)))throw Error('Invalid exact TEST dataset');
 for(const i of items){if(!Number.isInteger(i.TargetLevelSnapshot)||i.TargetLevelSnapshot<1||i.TargetLevelSnapshot>5||!i['Level'+i.TargetLevelSnapshot+'Snapshot']||/under development/i.test(i['Level'+i.TargetLevelSnapshot+'Snapshot']))throw Error('Target rubric missing');}
 const pairOK=[policy.employeeEmail,policy.reviewerEmail].every(x=>typeof x==='string'&&/^[^\s'@]+@[^\s'@]+\.[^\s'@]+$/.test(x));
 const enabled=policy.enabled===true&&pairOK&&policy.datasetSha256===hash&&typeof policy.ownerDecisionId==='string'&&policy.ownerDecisionId.trim().length>0&&policy.testOnlyIncompleteRubricApproved===true;
 if(policy.enabled&&!enabled)throw Error('Enabled TEST needs exact owner decision, pair, digest and rubric policy');
 const out=structuredClone(source),base=source.properties.definition.actions;
 const get=n=>{const hit=locate(base,n);if(!hit)throw Error('Missing baseline '+n);return structuredClone(hit.node);};
 const root={};let prev;
 function add(n,node){node.runAfter=prev?{[prev]:['Succeeded']}:{};root[n]=node;prev=n;return node;}
 function response(code,message,extra={}){return {type:'Response',inputs:{statusCode:code,body:{success:code<300,message,...extra}}};}
 function stop(n,code,message,extra={}){return {[n+'_Response']:response(code,message,extra),[n+'_Stop']:{type:'Terminate',inputs:{runStatus:'Succeeded'},runAfter:{[n+'_Response']:['Succeeded']}}};}
 function guard(n,expression,code,message){return add(n,{type:'If',expression,actions:{},else:{actions:stop(n,code,message)}});}
 const sample=get('Get_Caller_Profile').inputs, dataset=sample.parameters.dataset;
 const tables={profile:sample.parameters.table,cycle:get('Get_Assessment_Cycle').inputs.parameters.table,requirements:get('Get_Profile_Requirements').inputs.parameters.table,cu:locate(base,'Get_CUVersion_For_Requirement').node.inputs.parameters.table,header:get('Create_Assignment_Header').inputs.parameters.table,item:locate(base,'Create_Pilot_Assessment_Item').node.inputs.parameters.table,requirementProfile:get('Get_Requirement_Profiles').inputs.parameters.table};
 function sp(op,p){return {type:'OpenApiConnection',inputs:{host:{...sample.host,operationId:op},parameters:{dataset,...p},authentication:sample.authentication,retryPolicy:{type:'none'}}};}
 function read(n,table,filter,top=2){add(n,sp('GetItems',{table,$filter:filter,$top:top}));guard(n+'_One',`@and(equals(length(body('${n}')?['value']),1),empty(body('${n}')?['@odata.nextLink']),empty(body('${n}')?['odata.nextLink']))`,409,'Missing, ambiguous or incomplete TEST reference');add(n+'_Row',{type:'Compose',inputs:`@first(body('${n}')?['value'])`});return `outputs('${n}_Row')`;}
 guard('Action_Valid',"@or(equals(triggerBody()?['action'],'create_official_test_assignment'),equals(triggerBody()?['action'],'preview_official_test_assignment'),equals(triggerBody()?['action'],'create_official_assignment'))",400,'Unknown action');
 guard('Production_Closed',"@not(equals(triggerBody()?['action'],'create_official_assignment'))",501,'Production Official remains closed');
 guard('No_Client_Overrides',all(['role','appRole','scope','targets','rubric','profileVersionKey','reviewerEmail','frameworkCode'].map(k=>`not(contains(triggerBody(),${q(k)}))`)),400,'Client overrides are forbidden');
 for(const n of ['Get_Session_By_Token','Session_Found','Current_Session','Session_Valid','Authenticated_Email','Get_Caller_Profile','Caller_Profile_Found','Current_Caller_Profile','Caller_Profile_Valid','Caller_Authorized'])add(n,get(n));
 for(const [readName,guardName,field,val]of [['Get_Session_By_Token','Session_Found','SessionToken',"triggerBody()?['sessionToken']"],['Get_Caller_Profile','Caller_Profile_Found','EmployeeEmail',"outputs('Authenticated_Email')"]]){root[readName].inputs.parameters.$top=2;root[readName].inputs.parameters.$filter=`@concat('${field} eq ''',replace(coalesce(${val},''),'''',''''''),'''')`;root[guardName].expression=`@equals(length(body('${readName}')?['value']),1)`;}
 root.Caller_Authorized.expression="@equals(outputs('Current_Caller_Profile')?['AppRole']?['Value'],'ADMIN')";
 guard('Owner_Test_Enabled',enabled?'@true':'@false',503,'Official TEST disabled pending exact owner decision');
 const employee=String(policy.employeeEmail||'').trim().toLowerCase(),reviewer=String(policy.reviewerEmail||'').trim().toLowerCase();
 guard('Exact_Test_Request',all([eq("triggerBody()?['cycleKey']",scope),eq("toLower(trim(coalesce(triggerBody()?['employeeEmail'],'')))",employee)]),403,'Outside isolated TEST allowlist');
 const target=read('TEST_Target',tables.profile,`EmployeeEmail eq '${employee}'`);
 guard('TEST_Target_Eligible',all([eq(`${target}?['IsActive']`,true),eq(`${target}?['ProfileStatus']?['Value']`,'ACTIVE'),eq(`${target}?['AppRole']?['Value']`,'EMPLOYEE'),eq(`${target}?['CanBeAssessed']`,true),eq(`${target}?['DisciplineCode']`,'ETM'),eq(`${target}?['TrackKey']`,'ETM_PI'),eq(`${target}?['JobGradeCode']`,'SR_9_10'),eq(`toLower(trim(coalesce(${target}?['ManagerEmail'],'')))`,reviewer)]),403,'TEST employee or reviewer mapping changed');
 const rp=read('TEST_Reviewer',tables.profile,`EmployeeEmail eq '${reviewer}'`);
 guard('TEST_Reviewer_Eligible',all([eq(`${rp}?['IsActive']`,true),eq(`${rp}?['ProfileStatus']?['Value']`,'ACTIVE'),`or(${eq(`${rp}?['AppRole']?['Value']`,'SVP')},${eq(`${rp}?['AppRole']?['Value']`,'MANAGER')},${eq(`${rp}?['AppRole']?['Value']`,'ADMIN')})`]),403,'TEST reviewer unavailable');
 const cycle=read('TEST_Cycle',tables.cycle,`CycleKey eq '${scope}'`);
 guard('TEST_Cycle_Eligible',all([eq(`${cycle}?['IsActive']`,true),eq(`${cycle}?['Status']?['Value']`,'OPEN'),eq(`${cycle}?['CycleType']?['Value']`,'ADHOC'),eq(`${cycle}?['FrameworkCode']`,scope)]),409,'TEST cycle is not explicitly open and isolated from PILOT');
 // Framework remains unpublished and inactive: an explicitly authorized TEST
 // exception must never turn the official framework into production content.
 add('TEST_Framework_Read',sp('HttpRequest',{'parameters/method':'GET','parameters/uri':`_api/web/lists/GetByTitle('Competency_Framework')/items?$select=Id,FrameworkCode,DisciplineCode,Version,FrameworkStatus,IsActive&$filter=FrameworkCode eq '${scope}'&$top=2`,'parameters/headers':{Accept:'application/json;odata=nometadata'}}));
 guard('TEST_Framework_One',"@and(equals(length(body('TEST_Framework_Read')?['value']),1),empty(body('TEST_Framework_Read')?['@odata.nextLink']),empty(body('TEST_Framework_Read')?['odata.nextLink']))",409,'TEST framework missing or ambiguous');
 add('TEST_Framework',{type:'Compose',inputs:"@first(body('TEST_Framework_Read')?['value'])"});
 guard('TEST_Framework_Exact',all([eq("outputs('TEST_Framework')?['FrameworkCode']",scope),eq("outputs('TEST_Framework')?['DisciplineCode']",'ETM'),eq("outputs('TEST_Framework')?['Version']",data.framework.Version),eq("outputs('TEST_Framework')?['FrameworkStatus']",'DRAFT'),eq("outputs('TEST_Framework')?['IsActive']",false)]),409,'TEST framework publication or identity changed');
 const pr=read('TEST_Profile',tables.requirementProfile,`ProfileVersionKey eq '${profile}'`);
 guard('TEST_Profile_Exact',all([eq(`${pr}?['FrameworkCode']`,scope),eq(`${pr}?['TrackKey']`,'ETM_PI'),eq(`${pr}?['JobGradeCode']`,'SR_9_10'),eq(`${pr}?['Status']?['Value']`,'DRAFT'),eq(`${pr}?['ExpectedCUCount']`,12),eq(`${pr}?['IsComplete']`,true)]),409,'TEST profile changed');
 add('TEST_Requirements',sp('GetItems',{table:tables.requirements,$filter:`ProfileVersionKey eq '${profile}'`,$top:13}));
 guard('TEST_Requirements_Complete',"@and(equals(length(body('TEST_Requirements')?['value']),12),empty(body('TEST_Requirements')?['@odata.nextLink']),empty(body('TEST_Requirements')?['odata.nextLink']))",409,'TEST requirement set incomplete');
 for(let j=0;j<items.length;j++){const i=items[j],r=data.requirements[j],v=data.cuVersions.find(x=>x.CUVersionKey===i.CUVersionKey),prefix='TEST_'+(j+1);
  add(prefix+'_Requirement',{type:'Query',inputs:{from:"@body('TEST_Requirements')?['value']",where:all(Object.keys(r).filter(k=>!['SourceReference','ExcelReference','Title'].includes(k)).map(k=>eq(`item()?['${k}']${['MatchStatus','Applicability'].includes(k)?"?['Value']":''}`,r[k])))}});
  guard(prefix+'_Requirement_Exact',`@equals(length(body('${prefix}_Requirement')),1)`,409,'TEST requirement identity or target changed');
  const cu=read(prefix+'_CU',tables.cu,`CUVersionKey eq '${i.CUVersionKey}'`);
  guard(prefix+'_CU_Exact',all([...['CUKey','CUVersionKey','Version','GeneralStatement','Level1Behavior','Level2Behavior','Level3Behavior','Level4Behavior','Level5Behavior'].map(k=>eq(`${cu}?['${k}']`,v[k])),eq(`${cu}?['Status']?['Value']`,'DRAFT')]),409,'TEST rubric differs from owner-reviewed digest');
 }
 add('Assessment_Key',{type:'Compose',inputs:`OFFICIAL_TEST|${scope}|${employee}|R1`});
 add('TEST_Existing',sp('GetItems',{table:tables.header,$filter:`AssessmentKey eq 'OFFICIAL_TEST|${scope}|${employee}|R1'`,$top:2}));
 const existing=add('TEST_No_Existing',{type:'If',expression:"@equals(length(body('TEST_Existing')?['value']),0)",actions:{},else:{actions:stop('TEST_Existing',409,'Existing TEST key: inspect producer and exact snapshot; no automatic mutation',{assessmentKey:"@outputs('Assessment_Key')",recoveryRequired:true})}});
 // Preview performs all the same server reads and content checks, without writing.
 const preview=add('TEST_Preview',{type:'If',expression:"@equals(triggerBody()?['action'],'preview_official_test_assignment')",actions:stop('TEST_Preview',200,'Exact TEST preview verified',{datasetSha256:hash,expectedItemCount:12,assessmentKey:"@outputs('Assessment_Key')"}),else:{actions:{}}});
 // Existing Employee reads bind by header email. Withhold that binding and
 // deactivate PREPARING so old APIs cannot expose a partial TEST snapshot.
 const header=get('Create_Assignment_Header');header.inputs.retryPolicy={type:'none'};header.inputs.parameters={...header.inputs.parameters,'item/CycleKey':scope,'item/EmployeeObjectId':`@${target}?['EmployeeObjectId']`,'item/EmployeeEmail':'','item/EmployeeNameSnapshot':`@${target}?['EmployeeName']`,'item/ProfileVersionKey':profile,'item/ReviewerEmail':'','item/ExpectedItemCount':12,'item/IsActive':false};add('Create_Assignment_Header',header);
 for(let j=0;j<items.length;j++){const i=items[j],parameters={table:tables.item,'item/Title':`@concat(outputs('Assessment_Key'),'|',${q(i.CUKey)})`,'item/ItemKey':`@concat(outputs('Assessment_Key'),'|',${q(i.CUKey)})`,'item/AssessmentKey':"@outputs('Assessment_Key')",'item/ItemStatus/Value':'NOT_STARTED','item/Revision':1,'item/IsActive':true};for(const[k,v]of Object.entries(i))parameters['item/'+k]=v;add('TEST_Create_Item_'+j,sp('PostItem',parameters));}
 add('TEST_Readback',sp('GetItems',{table:tables.item,$filter:`AssessmentKey eq 'OFFICIAL_TEST|${scope}|${employee}|R1'`,$top:13}));
 guard('TEST_Readback_Count',"@and(equals(length(body('TEST_Readback')?['value']),12),empty(body('TEST_Readback')?['@odata.nextLink']),empty(body('TEST_Readback')?['odata.nextLink']))",409,'Partial TEST snapshot; preserve PREPARING');
 for(let j=0;j<items.length;j++){const i=items[j],n='TEST_Readback_'+j;add(n,{type:'Query',inputs:{from:"@body('TEST_Readback')?['value']",where:all([...Object.entries(i).map(([k,v])=>eq(`item()?['${k}']`,v)),eq("item()?['IsActive']",true),`equals(item()?['ItemKey'],concat(outputs('Assessment_Key'),'|',${q(i.CUKey)}))`])}});guard(n+'_Exact',`@equals(length(body('${n}')),1)`,409,'TEST snapshot identity/content mismatch; preserve PREPARING');}
 const finalize=get('Finalize_Assignment');finalize.inputs.parameters['item/EmployeeEmail']=employee;finalize.inputs.parameters['item/ReviewerEmail']=reviewer;add('Finalize_Assignment',finalize);
 add('TEST_Created',response(201,'Isolated TEST assigned',{assessmentKey:"@outputs('Assessment_Key')",status:'ASSIGNED',expectedItemCount:12,datasetSha256:hash,mode:'OFFICIAL_TEST'}));
 // A failed connector may have committed remotely. Never retry it or claim a
 // clean rollback; surface the exact key for read-only producer reconciliation.
 for(const [name,node]of Object.entries({...root}))if(node.type==='OpenApiConnection'&&['PostItem','PatchItem'].includes(node.inputs.host.operationId)){
  const fail=name+'_Ambiguous';root[fail]=response(name==='Create_Assignment_Header'?409:503,'TEST producer outcome requires same-key readback; do not retry mutation',{assessmentKey:"@outputs('Assessment_Key')",recoveryRequired:true});root[fail].runAfter={[name]:['Failed','TimedOut']};root[fail+'_Stop']={type:'Terminate',inputs:{runStatus:'Succeeded'},runAfter:{[fail]:['Succeeded']}};
 }
 out.properties.definition.actions=root;out.properties.displayName='Competency_Official_TEST_Assignment_API_v1';out.name='72a04451-4163-4e9a-8b60-9da620261103';out.id=String(out.id).replace(source.name,out.name);
 return {candidate:out,manifest:{enabled,datasetSha256:hash,scope,productionAllowed:false,baselineSha256:digest(source),candidateSha256:digest(out),notifications:false,liveVerified:false},tables,items};
}
module.exports={build,digest,snapshots};
if(require.main===module){const [src,dataPath,dest,policyPath]=process.argv.slice(2);if(!src||!dataPath||!dest)throw Error('Supply baseline, dataset, private output and optional owner policy');const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));const r=build(read(src),read(dataPath),policyPath?read(policyPath):{});fs.writeFileSync(dest,JSON.stringify(r.candidate,null,2));fs.writeFileSync(dest+'.manifest.json',JSON.stringify(r.manifest,null,2));console.log(JSON.stringify(r.manifest));}
