// Standalone read-only candidate. Never modifies the source flow or deploys it.
const fs=require('node:fs'),path=require('node:path');
function build(source){
 const out=structuredClone(source),original=source.properties.definition.actions;
 const a={},after=n=>({[n]:['Succeeded']});
 function add(n,node){const prev=Object.keys(a).at(-1);a[n]={...node,...(prev?{runAfter:after(prev)}:{})};}
 const response=(code,body)=>({type:'Response',kind:'Http',inputs:{statusCode:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body}});
 function guard(n,expression,code,message){add(n,{type:'If',expression,actions:{},else:{actions:{[n+'_Denied']:response(code,{success:false,message}),[n+'_Stop']:{type:'Terminate',inputs:{runStatus:'Succeeded'},runAfter:after(n+'_Denied')}}}});}
 const compose=(n,inputs)=>add(n,{type:'Compose',inputs});
 const query=(n,from,where)=>add(n,{type:'Query',inputs:{from,where}});
 const select=(n,from,map)=>add(n,{type:'Select',inputs:{from,select:map}});
 const copy=n=>add(n,structuredClone(original[n]));
 guard('Action_Valid',"@equals(triggerBody()?['action'],'get_executive_dashboard')",400,'Unsupported dashboard action');
 guard('Token_Present',"@and(not(empty(triggerBody()?['sessionToken'])),lessOrEquals(length(coalesce(triggerBody()?['sessionToken'],'')),200))",401,'Invalid session');
 copy('Get_Session_By_Token');a.Get_Session_By_Token.inputs.parameters.$top=2;
 a.Get_Session_By_Token.inputs.parameters.$filter="@concat('SessionToken eq ''', replace(triggerBody()?['sessionToken'],'''',''''''), '''')";
 guard('Session_Found',"@equals(length(body('Get_Session_By_Token')?['value']),1)",401,'Invalid session');
 copy('Current_Session');copy('Session_Valid');copy('Authenticated_Email');
 guard('Email_Present',"@not(empty(outputs('Authenticated_Email')))",401,'Invalid session');
 copy('Get_Caller_Profile');a.Get_Caller_Profile.inputs.parameters.$top=2;
 a.Get_Caller_Profile.inputs.parameters.$filter="@concat('EmployeeEmail eq ''', replace(outputs('Authenticated_Email'),'''',''''''), '''')";
 guard('Caller_Profile_Found',"@equals(length(body('Get_Caller_Profile')?['value']),1)",403,'Caller profile missing or ambiguous');
 copy('Current_Caller_Profile');copy('Caller_Profile_Valid');
 const p="outputs('Current_Caller_Profile')";
 guard('Dashboard_Authorized',`@or(equals(${p}?['AppRole']?['Value'],'SVP'),and(equals(${p}?['AppRole']?['Value'],'MANAGER'),equals(${p}?['JobGradeCode'],'DM'),contains(createArray('ETM','EEM','ECM'),${p}?['DisciplineCode'])))`,403,'Dashboard scope is not authorized');
 compose('Dashboard_Scope',`@if(equals(${p}?['AppRole']?['Value'],'SVP'),createArray('ETM','EEM','ECM'),createArray(${p}?['DisciplineCode']))`);
 // Fetch bounded server data; only scoped aggregates leave this flow. No browser filter is used.
 const get=(n,template,filter)=>{const node=structuredClone(original[template]);node.inputs.parameters.$filter=filter;node.inputs.parameters.$top=501;node.inputs.retryPolicy={type:'none'};add(n,node);};
 get('Get_Dashboard_Profiles','Get_Caller_Profile',"IsActive eq 1");
 guard('Profiles_Complete',"@and(less(length(body('Get_Dashboard_Profiles')?['value']),501),empty(body('Get_Dashboard_Profiles')?['@odata.nextLink']),empty(body('Get_Dashboard_Profiles')?['odata.nextLink']))",503,'Dashboard profile read is incomplete');
 query('Active_Assessable_Profiles',"@body('Get_Dashboard_Profiles')?['value']","@and(equals(item()?['IsActive'],true),equals(item()?['ProfileStatus']?['Value'],'ACTIVE'),equals(item()?['CanBeAssessed'],true),not(empty(item()?['EmployeeEmail'])))");
 select('Unique_Profile_Emails',"@body('Active_Assessable_Profiles')","@toLower(trim(item()?['EmployeeEmail']))");
 guard('Profiles_Unambiguous',"@equals(length(body('Unique_Profile_Emails')),length(union(body('Unique_Profile_Emails'),body('Unique_Profile_Emails'))))",503,'Dashboard profile scope is ambiguous');
 query('Eligible_Profiles',"@body('Active_Assessable_Profiles')","@contains(outputs('Dashboard_Scope'),item()?['DisciplineCode'])");
 get('Get_Dashboard_Assessments','Get_Review_Assessment_Header',"CycleKey eq 'ETM_UI_DEMO_2026' and IsActive eq 1");
 guard('Assessments_Complete',"@and(less(length(body('Get_Dashboard_Assessments')?['value']),501),empty(body('Get_Dashboard_Assessments')?['@odata.nextLink']),empty(body('Get_Dashboard_Assessments')?['odata.nextLink']))",503,'Dashboard assessment read is incomplete');
 const groups=[];
 for(const discipline of ['ETM','EEM','ECM']){
  query(discipline+'_Profiles',"@body('Eligible_Profiles')",`@equals(item()?['DisciplineCode'],'${discipline}')`);
  select(discipline+'_Emails',`@body('${discipline}_Profiles')`,"@toLower(trim(item()?['EmployeeEmail']))");
  query(discipline+'_Rows',"@body('Get_Dashboard_Assessments')?['value']",`@and(equals(item()?['IsActive'],true),contains(body('${discipline}_Emails'),toLower(trim(coalesce(item()?['EmployeeEmail'],'')))))`);
  select(discipline+'_Assigned_Emails',`@body('${discipline}_Rows')`,"@toLower(trim(item()?['EmployeeEmail']))");
  guard(discipline+'_Unique_Assignment',`@equals(length(body('${discipline}_Assigned_Emails')),length(union(body('${discipline}_Assigned_Emails'),body('${discipline}_Assigned_Emails'))))`,503,'Multiple active assessments for one employee in the pilot cycle');
  for(const [name,expr]of Object.entries({Submitted:"contains(createArray('SUBMITTED','UNDER_REVIEW','CONFIRMED'),item()?['Status']?['Value'])",Awaiting:"contains(createArray('SUBMITTED','UNDER_REVIEW'),item()?['Status']?['Value'])",Confirmed:"equals(item()?['Status']?['Value'],'CONFIRMED')"}))query(discipline+'_'+name,`@body('${discipline}_Rows')`,'@'+expr);
  compose(discipline+'_Metrics',{discipline,assigned:`@length(body('${discipline}_Rows'))`,submitted:`@length(body('${discipline}_Submitted'))`,awaitingReview:`@length(body('${discipline}_Awaiting'))`,confirmed:`@length(body('${discipline}_Confirmed'))`});
  groups.push(`outputs('${discipline}_Metrics')`);
 }
 query('Authorized_Metrics','@createArray('+groups.join(',')+')',"@contains(outputs('Dashboard_Scope'),item()?['discipline'])");
 const totals=Object.fromEntries(['assigned','submitted','awaitingReview','confirmed'].map(k=>[k,`@add(add(outputs('ETM_Metrics')?['${k}'],outputs('EEM_Metrics')?['${k}']),outputs('ECM_Metrics')?['${k}'])`]));
 add('Dashboard_Response',response(200,{success:true,dashboard:{version:1,source:'SHAREPOINT',mode:'PILOT',cycleKey:'ETM_UI_DEMO_2026',scope:"@outputs('Dashboard_Scope')",retrievedAt:'@utcNow()',totals,disciplines:"@body('Authorized_Metrics')",gaps:null,developmentPlanCoverage:null}}));
 for(const [name,node]of Object.entries({...a}))if(node.type==='OpenApiConnection'){
  a[name+'_Unavailable']={...response(503,{success:false,message:'Dashboard data could not be read completely'}),runAfter:{[name]:['Failed','TimedOut']}};
  a[name+'_Unavailable_Stop']={type:'Terminate',inputs:{runStatus:'Succeeded'},runAfter:after(name+'_Unavailable')};
 }
 out.properties.definition.actions=a;
 out.properties.definition.triggers.manual.inputs.schema={type:'object',required:['action','sessionToken'],properties:{action:{type:'string'},sessionToken:{type:'string',maxLength:200}},additionalProperties:false};
 // Preserve connector references, remove display name identifying the original workflow.
 out.properties.displayName='Competency_Executive_Dashboard_API_v1';
 out.properties.connectionReferences={shared_sharepointonline:structuredClone(source.properties.connectionReferences.shared_sharepointonline)};
 out.name='b955bc64-4bc6-4c20-9d4b-75b6101ff850';
 out.id=String(out.id).replace(source.name,out.name);
 return out;
}
if(require.main===module){const[src,dest]=process.argv.slice(2);if(!src||!dest)throw Error('Usage: build-executive-dashboard.cjs <private-manager-export.json> <private-candidate.json>');const out=build(JSON.parse(fs.readFileSync(src)));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(out,null,2));console.log('Prepared read-only candidate; not deployed.');}
module.exports={build};
