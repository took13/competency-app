'use strict';
// Verified mapping: owner-supplied Power Automate run-history samples, 2026-10-26.
const assignmentState={values:{employeeEmail:'',cycleKey:''},preview:null,result:null,message:'',busy:false};
const previewFields=['employee','employeeName','profile','trackKey','jobGradeCode','cycleStatus','profileStatus','expectedCount','requirementCount','blockingCount','missingCUVersion','targetRubricIssues','pilotCanAssign'];
function assignmentMapping(){return window.COMPETENCY_CONFIG?.assignmentContract;}
// Cycle source boundary: replace this config adapter when a list contract is verified.
function assignmentCycles(){
 const rows=window.COMPETENCY_CONFIG?.assessmentCycles;
 const seen=new Set();
 return (Array.isArray(rows)?rows:[]).filter(c=>c&&c.active===true&&c.type==='PILOT'&&typeof c.label==='string'&&c.label.trim()&&typeof c.cycleKey==='string'&&c.cycleKey.trim()&&!seen.has(c.cycleKey)&&seen.add(c.cycleKey));
}
function assignmentSelectedCycle(){return assignmentCycles().find(c=>c.cycleKey===assignmentState.values.cycleKey);}
function assignmentReady(){
 const c=assignmentMapping();
 return !!c&&c.verified===true&&['employeeEmail','cycleKey'].every(k=>typeof c.fields?.[k]==='string'&&c.fields[k])&&Object.keys(c.fields).every(k=>k in assignmentState.values)&&previewFields.every(k=>typeof c.preview?.[k]==='string'&&c.preview[k])&&['assessmentKey','status','createdItemCount'].every(k=>typeof c.created?.[k]==='string'&&c.created[k]);
}
function assignmentPath(data,path){return path.split('.').reduce((v,k)=>v!=null&&Object.hasOwn(v,k)?v[k]:undefined,data);}
function assignmentNormalize(data,mapping){const result=Object.fromEntries(Object.entries(mapping).map(([k,path])=>[k,assignmentPath(data,path)]));if('pilotCanAssign' in result)result.pilotCanAssign=result.pilotCanAssign===true||result.pilotCanAssign==='True';return result;}
function assignmentCount(v){return (typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;}
function assignmentAllowed(p){return !!p&&p.pilotCanAssign===true&&assignmentCount(p.expectedCount)>0&&['blockingCount','missingCUVersion','targetRubricIssues'].every(k=>assignmentCount(p[k])===0)&&assignmentCount(p.requirementCount)===assignmentCount(p.expectedCount)&&Array.isArray(p.blockers)&&p.blockers.length===0&&Array.isArray(p.issues)&&p.issues.length===0&&!!txt(p.employee)&&!!txt(p.profile);}
function assignmentReset(){Object.assign(assignmentState,{values:{employeeEmail:'',cycleKey:''},preview:null,result:null,message:'',busy:false});}
function assignmentSection(){
 if(state.demo)return '<section class="card"><h2>Assign Assessment · sample only</h2><p>JR_4_6 is supported even before real employees exist. Assign this sample junior, then switch to Sample Junior to assess.</p><button id="demoAssignJunior">Assign sample JR_4_6</button><p id="demoAssignmentResult" role="status"></p></section>';

 const cycles=assignmentCycles();
 if(!assignmentSelectedCycle()){
  assignmentState.values.cycleKey=cycles.length===1?cycles[0].cycleKey:'';
  assignmentState.preview=null;
 }
 const s=assignmentState,ready=assignmentReady(),disabled=s.busy||state.demo||!ready;
 return `<section class="card assignment-card" aria-labelledby="assignTitle"><div class="section-head"><h2 id="assignTitle">Assign Assessment</h2>${statusBadge(s.busy?'IN_PROGRESS':'NOT_STARTED',s.busy?'Checking assignment':'Preview before creating')}</div><p class="muted">เลือกรอบประเมิน ระบุพนักงาน แล้วกดตรวจความพร้อม เมื่อผ่านเงื่อนไขจึงสร้างแบบประเมินได้</p>${!ready?'<div class="preview-note">Assignment connection pending · Verified request and readiness field mappings are still required. Live assignment is unavailable.</div>':''}${state.demo?'<p class="muted small">Role-play does not create live assignments.</p>':''}<form id="liveAssignmentForm"><fieldset ${disabled?'disabled':''}><label for="assignCycle">1. รอบประเมิน</label><select id="assignCycle" name="cycleKey" required ${!cycles.length?'disabled':''}>${cycles.length!==1?'<option value="">'+(cycles.length?'เลือกรอบประเมิน':'ยังไม่มีรอบประเมินที่เปิดให้ใช้งาน')+'</option>':''}${cycles.map(c=>`<option value="${esc(c.cycleKey)}" ${s.values.cycleKey===c.cycleKey?'selected':''}>${esc(c.label)}</option>`).join('')}</select><label for="assignEmployee">2. อีเมลพนักงานในความดูแล</label><input id="assignEmployee" name="employeeEmail" type="email" required value="${esc(s.values.employeeEmail)}"><div class="assignment-actions"><button id="previewAssignment" type="submit" ${!assignmentSelectedCycle()?'disabled':''}>ตรวจความพร้อม</button><button id="createAssignment" type="button" class="primary" ${!assignmentSelectedCycle()||!assignmentAllowed(s.preview)?'disabled':''}>สร้างแบบประเมิน</button></div></fieldset></form><div id="assignmentOutcome" aria-live="polite">${s.preview?`<dl class="assignment-readiness">${previewFields.map(k=>`<div><dt>${esc(({employee:'Employee email',employeeName:'Employee',profile:'Profile version',trackKey:'Track',jobGradeCode:'Job grade',cycleStatus:'Cycle status',profileStatus:'Profile status',requirementCount:'Requirements',expectedCount:'Expected items',blockingCount:'Blocking count',missingCUVersion:'Missing CUVersion',targetRubricIssues:'Target rubric issues',pilotCanAssign:'pilotCanAssign'})[k])}</dt><dd>${esc(typeof s.preview[k]==='object'?JSON.stringify(s.preview[k]):s.preview[k]??'Unavailable')}</dd></div>`).join('')}</dl>${s.preview.blockers?.length?'<h3>Blocking requirements</h3><ul>'+s.preview.blockers.map(b=>'<li>'+esc(b.competencyName)+' · '+esc(b.matchStatus)+' · '+esc(b.applicability)+'</li>').join('')+'</ul>':''}${s.preview.issues?.length?'<h3>Content readiness issues</h3><ul>'+s.preview.issues.map(i=>'<li>'+esc(i.competencyName)+' · '+esc(i.issue)+'</li>').join('')+'</ul>':''}`:''}${s.result?`<p>${statusBadge(s.result.status)} <b>AssessmentKey:</b> ${esc(s.result.assessmentKey)} · <b>createdItemCount:</b> ${esc(s.result.createdItemCount)}</p>`:''}${s.message?`<p class="assignment-message">${esc(s.message)}</p>`:''}</div></section>`;
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
 if(!assignmentSelectedCycle())return;
 if(!$('liveAssignmentForm')?.reportValidity())return;
 const generation=state.generation,values={...s.values};s.preview=null;s.result=null;s.message='';s.busy=true;workspaceBusy=true;assignmentRender();
 try{
  // A create click ALWAYS obtains a fresh preview for these exact frozen inputs.
  const d=await assignmentRequest('preview_assignment',values),p=assignmentNormalize(d,assignmentMapping().preview);
  if(generation!==state.generation)return;
  s.preview=p;
  if(txt(p.employee).toLowerCase()!==values.employeeEmail.toLowerCase()||txt(p.cycleKey)!==values.cycleKey){s.preview=null;throw new Error('Preview target/cycle does not match the request');}
  if(!assignmentAllowed(p)){s.message='Assignment blocked. Resolve readiness issues or incomplete readiness data, then preview again.';return;}
  if(!create){s.message='พร้อมสร้างแบบประเมิน ระบบจะตรวจความพร้อมอีกครั้งก่อนสร้าง';return;}
  const r=await assignmentRequest('create_pilot_assignment',values);
  if(generation!==state.generation)return;
  s.preview=null;s.result=assignmentNormalize(r,assignmentMapping().created);
  const valid=txt(s.result.assessmentKey)==='PILOT|'+values.cycleKey+'|'+values.employeeEmail.toLowerCase()+'|R1'&&s.result.mode==='PILOT'&&upper(s.result.status)==='ASSIGNED'&&assignmentCount(s.result.createdItemCount)===assignmentCount(p.expectedCount)&&assignmentCount(s.result.expectedItemCount)===assignmentCount(p.expectedCount)&&txt(s.result.employeeEmail).toLowerCase()===values.employeeEmail.toLowerCase()&&s.result.profileVersionKey===p.profile;
  s.message=valid?'Assignment created. Refreshing connected views…':'Creation returned an incomplete result. Check the backend assignment before retrying; do not assume it is ASSIGNED.';
  // Refresh only the signed-in employee's own data. Never impersonate the target.
  const refreshes=[api('employee','get_my_assignments').then(d=>{if(!Array.isArray(d.assignments))throw new Error('Invalid assignments');state.assignments=d.assignments;if(!dirty())state.assessment=null;})];
  if(contractReady('managerQueue'))refreshes.push(contractCall('managerQueue').then(q=>{if(!Array.isArray(q))throw new Error('Invalid queue');managerQueue=q;managerSelected=null;}));
  const refresh=await Promise.allSettled(refreshes);if(generation!==state.generation)return;
  s.message=(valid?'Assignment created. ':'Check assignment integrity before retrying. ')+(refresh.some(x=>x.status==='rejected')?'Some views could not refresh. Refresh them after checking your session. ':'Connected views refreshed. ')+(!contractReady('managerQueue')?'Manager queue connection is pending. ':'')+'The assigned employee can reload My Assessment to see the new assignment.';
 }catch(e){
  if(generation!==state.generation||e.stale)return;
  s.preview=null;
  s.message=e.status===409?(e.details?.assessmentKey||e.message==='Pilot assessment already exists'?'409 · Pilot assessment already exists'+(e.details?.assessmentKey?': '+txt(e.details.assessmentKey):'')+'. Check the existing assignment; creating again will not replace it.':e.message==='Pilot assignment is not ready for creation'?'409 · Pilot assignment is not ready for creation. Resolve readiness issues and preview again.':'409 · Assignment conflict. '+safeError(e)):e.name==='AbortError'?'Request timed out. Creation may have completed; check existing assignments before another attempt.':e.status===403?'403 · You do not have permission to assign this employee/profile.':e.status===401?'Your session has expired. Sign in again.':'Assignment request failed. '+safeError(e);
  if(e.status===401)fail(e);
 }finally{if(generation===state.generation){s.busy=false;workspaceBusy=false;assignmentRender();}}
}
function assignmentInputChanged(e){if(e.target.closest('#liveAssignmentForm')&&e.target.name in assignmentState.values){assignmentState.values[e.target.name]=e.target.value.trim();assignmentState.preview=null;assignmentState.result=null;assignmentState.message='ข้อมูลเปลี่ยนแล้ว กรุณาตรวจความพร้อมอีกครั้ง';const b=$('createAssignment');if(b)b.disabled=true;const out=$('assignmentOutcome');if(out)out.textContent=assignmentState.message;const previewButton=$('previewAssignment');if(previewButton)previewButton.disabled=!assignmentSelectedCycle();}}
document.addEventListener('input',assignmentInputChanged);
document.addEventListener('change',assignmentInputChanged);
document.addEventListener('submit',e=>{if(e.target.id==='liveAssignmentForm'){e.preventDefault();runAssignment();}});
document.addEventListener('click',e=>{if(e.target.closest('#createAssignment'))runAssignment(true);});
