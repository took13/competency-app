const fs=require('node:fs'),assert=require('node:assert/strict');
const {build,hash}=require('./tools/build-svp-reviewer.cjs');
const {locate}=require('./tools/build-gate3.cjs');
const {run,fixtureConnector}=require('./tools/flow-fixture-runtime.cjs');
const file=process.argv[2];if(!file)throw Error('Supply private Manager export');
const source=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')),before=hash(source);
// Exercise a downloaded Reviewer definition directly; rebuilding it would escape
// its already escaped OData expressions a second time.
const candidate=source.properties.displayName==='Competency_SVP_Assigned_Reviewer_API_v1'?structuredClone(source):build(source);
const node=n=>locate(candidate.properties.definition.actions,n).node;
const table=n=>node(n).inputs.parameters.table;
const ids={session:table('Get_Session_By_Token'),profile:table('Get_Caller_Profile'),header:table('Get_Review_Assessment_Header'),item:table('Get_Items_For_Confirmation'),log:table('N_ASSESSMENT_CONFIRMED_Claim')};
function fixture(){const tables=Object.fromEntries(Object.values(ids).map(x=>[x,[]]));
 function seed(a){for(const v of Object.values(a||{})){const t=v.inputs?.parameters?.table;if(t)tables[t]||=[];seed(v.actions);seed(v.else?.actions);}}seed(candidate.properties.definition.actions);
 for(const [i,role]of ['SVP','SVP','MANAGER','ADMIN','EMPLOYEE','HEAD'].entries()){
  const email='caller'+i+'@example.test';tables[ids.session].push({ID:i+1,SessionToken:'token'+i,Email:email,AuthStatus:{Value:'VERIFIED'},SessionExpiresAt:'2099-01-01T00:00:00Z'});
  tables[ids.profile].push({ID:i+1,EmployeeEmail:email,AppRole:{Value:role},ProfileStatus:{Value:'ACTIVE'},IsActive:true});
 }
 tables[ids.header].push({ID:1,Title:'A',AssessmentKey:'A',EmployeeEmail:'employee@example.test',ReviewerEmail:'caller0@example.test',CycleKey:'FIXTURE',Status:{Value:'SUBMITTED'},Revision:1,ExpectedItemCount:1,IsActive:true,TransitionHistory:'',WorkflowLock:''});
 tables[ids.item].push({ID:1,Title:'I',ItemKey:'I',AssessmentKey:'A',SelfLevel:3,SelfEvidence:'unchanged fixture evidence',ValidatedLevel:3,ManagerComment:'fixture',Revision:1,ItemStatus:{Value:'COMPLETED'},TargetLevelSnapshot:4,IsActive:true});
 return fixtureConnector(tables);
}
let count=0;
async function req(f,action,extra={},token='token0',expected=200){const r=await run(candidate,{action,sessionToken:token,...extra},f.connector);assert.equal(r.response?.statusCode,expected,JSON.stringify({action,response:r.response,errors:r.errors}));count++;return r;}
(async()=>{
 assert.equal(hash(source),before,'Builder mutated original');
 const managerId=source.properties.displayName==='Competency_SVP_Assigned_Reviewer_API_v1'?'dabcc3a1-c892-4a60-b368-3b72f57dfc3e':source.name;
 assert.notEqual(candidate.name,managerId,'Standalone flow retains Manager identity');
 assert.ok(!candidate.id.includes(managerId),'Standalone resource id retains Manager identity');
 assert.deepEqual(candidate.properties.connectionReferences,source.properties.connectionReferences);
 // Existing write, revision, notification and assignment checks stay intact.
 const withoutFilters=x=>JSON.parse(JSON.stringify(x,(k,v)=>k==='$filter'?undefined:v));
 for(const n of ['Is_Save_Manager_Review','Review_Confirmable','All_Items_Validated','G3_Acquire_Workflow','G3_Is_Return_Assessment'])assert.deepEqual(withoutFilters(node(n)),withoutFilters(locate(source.properties.definition.actions,n).node));
 let f=fixture();let r=await req(f,'get_my_reviews');assert.equal(r.response.body.reviews.length,1);
 await req(f,'get_review_assessment',{assessmentKey:'A'});
 await req(f,'save_manager_review',{assessmentKey:'A',itemKey:'I',validatedLevel:4,managerComment:'fixture adjustment',expectedRevision:1});
 assert.equal(f.tables[ids.item][0].ValidatedLevel,4);assert.equal(f.tables[ids.item][0].SelfEvidence,'unchanged fixture evidence');
 await req(f,'confirm_assessment',{assessmentKey:'A',expectedRevision:1});assert.equal(f.tables[ids.header][0].Status.Value,'CONFIRMED');
 f=fixture();await req(f,'return_assessment',{assessmentKey:'A',expectedRevision:1,reason:'fixture correction'});assert.equal(f.tables[ids.header][0].Status.Value,'RETURNED');
 for(const action of ['get_review_assessment','save_manager_review','confirm_assessment','return_assessment']){
  f=fixture();const snapshot=JSON.stringify(f.tables);
  await req(f,action,{assessmentKey:'A',itemKey:'I',validatedLevel:4,managerComment:'denied',expectedRevision:1,reason:'denied'},'token1',403);
  assert.equal(JSON.stringify(f.tables),snapshot,'Nonreviewer mutation');assert.equal(f.mails.length,0);
 }
 f=fixture();r=await req(f,'get_my_reviews',{},'token1');assert.deepEqual(r.response.body.reviews,[]);
 for(const token of ['token2','token3','token4','token5'])await req(f,'get_review_assessment',{assessmentKey:'A'},token,403);
 for(const reviewer of ['', 'other@example.test', '   ']){f=fixture();f.tables[ids.header][0].ReviewerEmail=reviewer;await req(f,'get_review_assessment',{assessmentKey:'A'},'token0',403);}
 f=fixture();f.tables[ids.header][0].ReviewerEmail=' CALLER0@EXAMPLE.TEST ';await req(f,'get_review_assessment',{assessmentKey:'A'});
 f=fixture();f.tables[ids.header][0].IsActive=false;await req(f,'get_review_assessment',{assessmentKey:'A'},'token0',403);
 for(const action of ['get_review_assessment','save_manager_review','confirm_assessment','return_assessment']){
  for(const mode of ['missing','duplicate','unassigned']){
   f=fixture();if(mode==='missing')f.tables[ids.header].length=0;
   if(mode==='duplicate')f.tables[ids.header].push({...f.tables[ids.header][0],ID:99});
   if(mode==='unassigned')delete f.tables[ids.header][0].ReviewerEmail;
   const snapshot=JSON.stringify(f.tables);
   await req(f,action,{assessmentKey:'A',itemKey:'I',validatedLevel:4,expectedRevision:1,reason:'fixture'},'token0',mode==='unassigned'?403:404);
   assert.equal(JSON.stringify(f.tables),snapshot);assert.equal(f.mails.length,0);
  }
 }
 f=fixture();f.tables[ids.header][0].AssessmentKey="A'quoted";f.tables[ids.item][0].AssessmentKey="A'quoted";await req(f,'get_review_assessment',{assessmentKey:"A'quoted"});
 await req(f,'save_manager_review',{assessmentKey:"A'quoted",itemKey:"I' or ItemKey ne '",validatedLevel:5,managerComment:'injection'},'token0',404);assert.equal(f.tables[ids.item][0].ValidatedLevel,3);
 for(const [field,val]of [['role','ADMIN'],['appRole','MANAGER'],['reviewerEmail','caller1@example.test'],['scope','ALL'],['employeeEmail','other@example.test'],['discipline','EEM']])await req(f,'get_my_reviews',{[field]:val},'token0',400);
 for(const action of ['create_official_assignment','create_development_plan','get_my_assignments'])await req(f,action,{},'token0',400);
 f=fixture();await req(f,'get_my_reviews',{},'invalid',401);
 f=fixture();f.tables[ids.session][0].SessionExpiresAt='2000-01-01T00:00:00Z';await req(f,'get_my_reviews',{},'token0',401);
 f=fixture();f.tables[ids.profile][0].IsActive=false;await req(f,'get_my_reviews',{},'token0',403);
 f=fixture();f.tables[ids.session].push({...f.tables[ids.session][0],ID:99});await req(f,'get_my_reviews',{},'token0',401);
 f=fixture();f.tables[ids.profile].push({...f.tables[ids.profile][0],ID:99});await req(f,'get_my_reviews',{},'token0',403);
 f=fixture();for(let i=2;i<=501;i++)f.tables[ids.header].push({...f.tables[ids.header][0],ID:i,AssessmentKey:'A'+i});await req(f,'get_my_reviews',{},'token0',503);
 assert.equal(hash(source),before);
 const result={pass:true,cases:count,baselineSha256:before,candidateSha256:hash(candidate),liveVerified:false,deployed:false};
 if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
