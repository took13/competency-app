'use strict';
// Local adapter names below are NOT backend field names. Publish mappings only
// after comparing sanitized successful v2 requests and responses.
const assignmentState={values:{employeeEmail:'',cycleKey:'',profileKey:''},preview:null,result:null,message:'',busy:false};
const previewFields=['employee','profile','expectedCount','blockingCount','missingCUVersion','targetRubricIssues','pilotCanAssign'];
function assignmentMapping(){return window.COMPETENCY_CONFIG?.assignmentContract;}
function assignmentReady(){
 const c=assignmentMapping();
 return !!c&&c.verified===true&&['employeeEmail','cycleKey','profileKey'].every(k=>typeof c.fields?.[k]==='string'&&c.fields[k])&&Object.keys(c.fields).every(k=>k in assignmentState.values)&&previewFields.every(k=>typeof c.preview?.[k]==='string'&&c.preview[k])&&['assessmentKey','status','createdItemCount'].every(k=>typeof c.created?.[k]==='string'&&c.created[k]);
}
function assignmentPath(data,path){return path.split('.').reduce((v,k)=>v!=null&&Object.hasOwn(v,k)?v[k]:undefined,data);}
function assignmentNormalize(data,mapping){return Object.fromEntries(Object.entries(mapping).map(([k,path])=>[k,assignmentPath(data,path)]));}
function assignmentCount(v){return (typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;}
function assignmentAllowed(p){return !!p&&p.pilotCanAssign===true&&assignmentCount(p.expectedCount)>0&&['blockingCount','missingCUVersion','targetRubricIssues'].every(k=>assignmentCount(p[k])===0)&&!!txt(p.employee)&&!!txt(p.profile);}
function assignmentReset(){Object.assign(assignmentState,{values:{employeeEmail:'',cycleKey:'',profileKey:''},preview:null,result:null,message:'',busy:false});}
function assignmentSection(){
 const s=assignmentState,ready=assignmentReady(),disabled=s.busy||state.demo||!ready;
 return `<section class="card assignment-card" aria-labelledby="assignTitle"><div class="section-head"><h2 id="assignTitle">Assign Assessment</h2>${statusBadge(s.busy?'IN_PROGRESS':'NOT_STARTED',s.busy?'Checking assignment':'Preview before creating')}</div><p class="muted">Enter an employee in your authorized scope and an approved profile reference. Preview checks readiness before an assignment can be created.</p>${!ready?'<div class="preview-note">Assignment connection pending · Verified request and readiness field mappings are still required. Live assignment is unavailable.</div>':''}${state.demo?'<p class="muted small">Role-play does not create live assignments.</p>':''}<form id="liveAssignmentForm"><fieldset ${disabled?'disabled':''}><label for="assignEmployee">Employee email (in your scope)</label><input id="assignEmployee" name="employeeEmail" type="email" required value="${esc(s.values.employeeEmail)}"><label for="assignCycle">Cycle key</label><input id="assignCycle" name="cycleKey" required value="${esc(s.values.cycleKey)}"><label for="assignProfile">Approved profile reference</label><input id="assignProfile" name="profileKey" required value="${esc(s.values.profileKey)}"><div class="assignment-actions"><button id="previewAssignment" type="submit">Preview readiness</button><button id="createAssignment" type="button" class="primary" ${!assignmentAllowed(s.preview)?'disabled':''}>Create Assignment</button></div></fieldset></form><div id="assignmentOutcome" aria-live="polite">${s.preview?`<dl class="assignment-readiness">${previewFields.map(k=>`<div><dt>${esc(({employee:'Employee',profile:'Profile',expectedCount:'Expected items',blockingCount:'Blocking count',missingCUVersion:'Missing CUVersion',targetRubricIssues:'Target rubric issues',pilotCanAssign:'pilotCanAssign'})[k])}</dt><dd>${esc(typeof s.preview[k]==='object'?JSON.stringify(s.preview[k]):s.preview[k]??'Unavailable')}</dd></div>`).join('')}</dl>`:''}${s.result?`<p>${statusBadge(s.result.status)} <b>AssessmentKey:</b> ${esc(s.result.assessmentKey)} · <b>createdItemCount:</b> ${esc(s.result.createdItemCount)}</p>`:''}${s.message?`<p class="assignment-message">${esc(s.message)}</p>`:''}</div></section>`;
}
function assignmentRender(){if(state.page==='manager'&&isManager())managerPage();}
async function assignmentRequest(action,values){
 if(!assignmentReady())throw new Error('Verified assignment contract is missing');
 const c=assignmentMapping(),payload={};for(const [local,remote] of Object.entries(c.fields)){
  if(['action','sessionToken','__proto__'].includes(remote))throw new Error('Invalid assignment mapping');
  payload[remote]=values[local];
 }
 return api('assessment',action,payload);
}
async function runAssignment(create=false){
 const s=assignmentState;
 if(s.busy||workspaceBusy||state.demo||!isManager()||!state.verified||!assignmentReady()||!sessionValid())return;
 if(create&&!assignmentAllowed(s.preview))return;
 if(!$('liveAssignmentForm')?.reportValidity())return;
 const generation=state.generation,values={...s.values};s.preview=null;s.result=null;s.message='';s.busy=true;workspaceBusy=true;assignmentRender();
 try{
  // A create click ALWAYS obtains a fresh preview for these exact frozen inputs.
  const d=await assignmentRequest('preview_assignment',values),p=assignmentNormalize(d,assignmentMapping().preview);
  if(generation!==state.generation)return;
  s.preview=p;
  if(!assignmentAllowed(p)){s.message='Assignment blocked. Resolve readiness issues or incomplete readiness data, then preview again.';return;}
  if(!create){s.message='Ready. Create Assignment will check readiness again before creating.';return;}
  const r=await assignmentRequest('create_pilot_assignment',values);
  if(generation!==state.generation)return;
  s.preview=null;s.result=assignmentNormalize(r,assignmentMapping().created);
  const valid=txt(s.result.assessmentKey)&&upper(s.result.status)==='ASSIGNED'&&assignmentCount(s.result.createdItemCount)===assignmentCount(p.expectedCount);
  s.message=valid?'Assignment created. Refreshing connected views…':'Creation returned an incomplete result. Check the backend assignment before retrying; do not assume it is ASSIGNED.';
  // Refresh only the signed-in employee's own data. Never impersonate the target.
  const refreshes=[api('employee','get_my_assignments').then(d=>{if(!Array.isArray(d.assignments))throw new Error('Invalid assignments');state.assignments=d.assignments;if(!dirty())state.assessment=null;})];
  if(contractReady('managerQueue'))refreshes.push(contractCall('managerQueue').then(q=>{if(!Array.isArray(q))throw new Error('Invalid queue');managerQueue=q;managerSelected=null;}));
  const refresh=await Promise.allSettled(refreshes);if(generation!==state.generation)return;
  s.message=(valid?'Assignment created. ':'Check assignment integrity before retrying. ')+(refresh.some(x=>x.status==='rejected')?'Some views could not refresh. Refresh them after checking your session. ':'Connected views refreshed. ')+(!contractReady('managerQueue')?'Manager queue connection is pending. ':'')+'The assigned employee can reload My Assessment to see the new assignment.';
 }catch(e){
  if(generation!==state.generation||e.stale)return;
  s.preview=null;
  s.message=e.status===409?'409 · An assignment already exists or the assignment state conflicts. Check the existing PILOT assignment before trying again.':e.name==='AbortError'?'Request timed out. Creation may have completed; check existing assignments before another attempt.':e.status===403?'403 · You do not have permission to assign this employee/profile.':e.status===401?'Your session has expired. Sign in again.':'Assignment request failed. '+safeError(e);
  if(e.status===401)fail(e);
 }finally{if(generation===state.generation){s.busy=false;workspaceBusy=false;assignmentRender();}}
}
document.addEventListener('input',e=>{if(e.target.closest('#liveAssignmentForm')&&e.target.name in assignmentState.values){assignmentState.values[e.target.name]=e.target.value.trim();assignmentState.preview=null;assignmentState.result=null;assignmentState.message='Inputs changed. Preview readiness again.';const b=$('createAssignment');if(b)b.disabled=true;const out=$('assignmentOutcome');if(out)out.textContent=assignmentState.message;}});
document.addEventListener('submit',e=>{if(e.target.id==='liveAssignmentForm'){e.preventDefault();runAssignment();}});
document.addEventListener('click',e=>{if(e.target.closest('#createAssignment'))runAssignment(true);});
