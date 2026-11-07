'use strict';
const assignmentState={values:{employeeEmail:'',cycleKey:''},preview:null,result:null,message:'',busy:false,securityResults:[]};
function assignmentMapping(){return window.COMPETENCY_CONFIG?.officialAssignmentContract;}
function assignmentReady(){const c=assignmentMapping();return c?.version==='OFFICIAL_ASSIGNMENT_V1'&&c.verified===true&&c.previewVerified===true&&/^[a-f0-9]{64}$/.test(c.baselineDigest||'');}
function assignmentCreateReadyFor(v){const c=assignmentMapping(),u=c?.controlledUat;return assignmentReady()&&((c.liveVerified===true&&c.createEnabled===true&&['EEM_ANNUAL_2026','ECM_ANNUAL_2026','ETM_ANNUAL_2026'].includes(v.cycleKey))||(u?.enabled===true&&u.employeeEmail===v.employeeEmail.toLowerCase()&&u.cycleKey===v.cycleKey));}
function assignmentCreateReady(){return assignmentCreateReadyFor(assignmentState.values);}
function assignmentCycles(){const seen=new Set();return (window.COMPETENCY_CONFIG?.assessmentCycles||[]).filter(c=>assignmentReady()&&c?.active===true&&c.mode==='OFFICIAL'&&c.type==='ANNUAL'&&c.baselineDigest===assignmentMapping().baselineDigest&&typeof c.label==='string'&&c.label.trim()&&typeof c.cycleKey==='string'&&c.cycleKey.trim()&&!/PILOT|TEST/i.test(c.cycleKey)&&!seen.has(c.cycleKey)&&seen.add(c.cycleKey));}
function assignmentSelectedCycle(){return assignmentCycles().find(c=>c.cycleKey===assignmentState.values.cycleKey);}
function assignmentCount(v){return (typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;}
function assignmentKey(v){return 'OFFICIAL|'+v.cycleKey+'|'+v.employeeEmail.toLowerCase()+'|R1';}
function assignmentMatches(p,v=assignmentState.values){return !!p&&p.contractVersion==='OFFICIAL_ASSIGNMENT_V1'&&p.mode==='OFFICIAL'&&p.baselineDigest===assignmentMapping()?.baselineDigest&&p.employeeEmail===v.employeeEmail.toLowerCase()&&p.cycleKey===v.cycleKey&&p.assessmentKey===assignmentKey(v)&&typeof p.profileVersionKey==='string'&&p.profileVersionKey.trim()&&!/PILOT|TEST/i.test(p.profileVersionKey)&&assignmentCount(p.expectedItemCount)>0&&assignmentMapping()?.profiles?.[p.profileVersionKey]?.expectedItemCount===assignmentCount(p.expectedItemCount)&&assignmentMapping().profiles[p.profileVersionKey].cycleKey===v.cycleKey;}
function assignmentAllowed(p,v=assignmentState.values){return assignmentMatches(p,v)&&p.officialCanAssign===true;}
function assignmentErrorMessage(e,phase){
 const status=Number.isInteger(e?.status)?'HTTP '+e.status:e?.name==='AbortError'?'TIMEOUT':e?.name==='TypeError'?'NETWORK/CORS':'CLIENT/CONTRACT';
 const raw=String(e?.message||'').trim();
 const safe=raw&&!/https?:\/\/|sig=|sessionToken|bearer |[A-Za-z0-9_-]{45,}/i.test(raw)?raw.slice(0,160):'No safe detail available';
 return (phase==='create'?'CREATE':'PREVIEW')+' failed · '+status+' · '+safe;
}
function assignmentReset(){Object.assign(assignmentState,{values:{employeeEmail:'',cycleKey:''},preview:null,result:null,message:'',busy:false,securityResults:[]});}
function assignmentSection(){
 if(state.demo)return '<section class="card"><h2>Assign Assessment · sample only</h2><button id="demoAssignJunior">Assign sample JR_4_6</button><p id="demoAssignmentResult" role="status"></p></section>';
 if(role()!=='ADMIN')return '<section class="card"><h2>Assign Assessment</h2><p>การมอบหมาย Official Assessment ต้องดำเนินการโดย ADMIN</p></section>';
 const s=assignmentState,cycles=assignmentCycles();if(!assignmentSelectedCycle()){s.values.cycleKey=cycles.length===1?cycles[0].cycleKey:'';s.preview=null;}
 const main = `<section class="card assignment-card"><h2>Assign Official Assessment</h2>${assignmentMapping()?.controlledUat?.enabled?'<p class="preview-note">Controlled UAT · เปิดสร้างเฉพาะพนักงานและรอบที่ได้รับอนุมัติ</p>':''}${!assignmentReady()?'<p>Official ยังไม่เปิดใช้งาน รอยืนยันระบบและ baseline ที่อนุมัติ</p>':''}<form id="liveAssignmentForm"><fieldset ${s.busy||!assignmentReady()?'disabled':''}><label for="assignCycle">รอบประเมิน Official</label><select id="assignCycle" name="cycleKey" required>${cycles.length!==1?'<option value="">เลือกรอบ Official</option>':''}${cycles.map(c=>`<option value="${esc(c.cycleKey)}" ${s.values.cycleKey===c.cycleKey?'selected':''}>${esc(c.label)}</option>`).join('')}</select><label for="assignEmployee">อีเมลพนักงาน</label><input id="assignEmployee" name="employeeEmail" type="email" required value="${esc(s.values.employeeEmail)}"><div class="assignment-actions"><button id="previewAssignment" type="submit" ${!assignmentSelectedCycle()?'disabled':''}>ตรวจความพร้อม</button><button id="createAssignment" type="button" class="primary" ${!assignmentCreateReady()||!assignmentSelectedCycle()||!assignmentAllowed(s.preview)?'disabled':''}>สร้าง Official Assessment</button></div></fieldset></form><div id="assignmentOutcome" aria-live="polite">${s.preview?`<p>${esc(s.preview.employeeEmail)} · ${esc(s.preview.expectedItemCount)} หัวข้อ</p>`:''}${s.result?`<p>Official ${esc(s.result.status)} · ${esc(s.result.createdItemCount)} หัวข้อ · ${esc(s.result.assessmentKey)}</p>`:''}${s.message?`<p>${esc(s.message)}</p>`:''}</div>${!assignmentCreateReady()?`<details><summary>ตรวจความปลอดภัยก่อนเปิดใช้งาน</summary><p class="muted small">ทดสอบการปฏิเสธคำขอโดยไม่สร้างหรือแก้แบบประเมิน</p><button id="checkOfficialSecurity" type="button" ${s.busy||!assignmentSelectedCycle()||!s.values.employeeEmail?'disabled':''}>ตรวจคำขอที่ไม่ถูกต้อง</button><ul>${(s.securityResults||[]).map(r=>`<li>${esc(r.name)}: ${r.passed?'PASS':'BLOCK'} · HTTP ${esc(r.status)} · ${esc(r.message)}</li>`).join('')}</ul></details>`:''}</section>`;
 return main+bulkAssignmentSection();
}

const bulkAssignmentState={running:false,finished:0,rows:[],results:[]};
function bulkAssignmentSection(){
 return '<section class="card assignment-card" aria-label="Bulk Official Assignments" style="margin-top:24px">'
 +'<h2>Bulk Official Assessment</h2><p>ADMIN only · One email and cycle per line. Each row uses existing Preview → Create checks. Existing assignments are skipped. No assignment notification is sent by this interface.</p>'
 +'<label for="bulkAssignments">EmployeeEmail, CycleKey</label><textarea id="bulkAssignments" rows="8" spellcheck="false" placeholder="employee@gpscgroup.com,ETM_ANNUAL_2026"></textarea>'
 +'<div class="assignment-actions"><button type="button" class="primary" id="bulkStart">Preview &amp; Create missing Official Assessments</button></div>'
 +'<p id="bulkProgress" role="status" aria-live="polite"></p><pre id="bulkResult" aria-label="Bulk result" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:360px;overflow:auto"></pre></section>';
}
function bulkRowsFromText(raw){
 const allowed=new Set(['EEM_ANNUAL_2026','ECM_ANNUAL_2026','ETM_ANNUAL_2026']);
 const lines=String(raw||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length||lines.length>100)throw new Error('Enter 1 to 100 rows');
 const seen=new Set(),rows=[];
 for(let i=0;i<lines.length;i++){
  if(/^employeeemail\s*[,;\t]/i.test(lines[i]))continue;
  const p=lines[i].split(/[,;\t]+/).map(s=>s.trim());
  if(p.length!==2||!(/^[^@\s,;]+@gpscgroup\.com$/i.test(p[0]))||!allowed.has(p[1].toUpperCase()))throw new Error('Invalid email/cycle at line '+(i+1));
  const v={employeeEmail:p[0].toLowerCase(),cycleKey:p[1].toUpperCase()};
  if(seen.has(v.employeeEmail))throw new Error('Duplicate employee in input at line '+(i+1));
  seen.add(v.employeeEmail);rows.push(v);
 }
 if(!rows.length)throw new Error('No valid employees found');
 return rows;
}
function bulkUpdateView(note){
 const b=bulkAssignmentState, progress=document.getElementById('bulkProgress'),out=document.getElementById('bulkResult'),button=document.getElementById('bulkStart'),input=document.getElementById('bulkAssignments');
 if(progress)progress.textContent=note||'';
 if(out)out.textContent=b.results.map(x=>x.result+' | '+x.email+' | '+x.cycle+(x.detail?' | '+x.detail:'')).join('\n');
 if(button)button.disabled=b.running;
 if(input)input.disabled=b.running;
}
async function runBulkOfficial(){
 const b=bulkAssignmentState;
 if(b.running||workspaceBusy||state.demo||role()!=='ADMIN'||!state.verified||!sessionValid()||!assignmentReady())return;
 let rows;
 try{rows=bulkRowsFromText(document.getElementById('bulkAssignments')?.value);}
 catch(e){bulkUpdateView(String(e.message||'Invalid rows'));return;}
 if(rows.some(v=>!assignmentCreateReadyFor(v))){bulkUpdateView('Blocked: Official Create not enabled for at least one selected cycle');return;}
 if(!window.confirm('Create missing Official Assessments for '+rows.length+' employees? Existing assessments will be skipped. No email is sent by this action.'))return;
 b.running=true;b.finished=0;b.rows=rows;b.results=[];workspaceBusy=true;
 const generation=state.generation;
 try{
  for(const v of rows){
   if(generation!==state.generation||!state.verified||!sessionValid()){bulkUpdateView('Stopped: admin session changed or expired');break;}
   let outcome='BLOCKED',detail='';
   try{
    bulkUpdateView('Processing '+(b.finished+1)+' / '+rows.length+' · '+v.employeeEmail);
    const p=await assignmentRequest('preview_official_assignment',v);
    if(!assignmentAllowed(p,v)){
     detail='Preview does not match approved contract or officialCanAssign=false';
    }else{
     const r=await assignmentRequest('create_official_assignment',v);
     if(!assignmentMatches(r,v)||r.status!=='ASSIGNED'||r.profileVersionKey!==p.profileVersionKey||assignmentCount(r.createdItemCount)!==assignmentCount(p.expectedItemCount)||assignmentCount(r.expectedItemCount)!==assignmentCount(p.expectedItemCount)){
      outcome='UNCERTAIN_STOP';detail='Create response not verified; inspect SharePoint before retry';
     }else{outcome='CREATED';detail=r.createdItemCount+' items';}
    }
   }catch(e){
    const status=Number(e.status);
    if(status===409){outcome='SKIPPED_EXISTING';detail='HTTP 409: already exists or conflict; verify if unexpected';}
    else if([400,403,404,422].includes(status)){outcome='BLOCKED';detail='HTTP '+status;}
    else{outcome='UNCERTAIN_STOP';detail=e.name==='AbortError'?'Timeout: verify SharePoint before retry':Number.isInteger(status)?'HTTP '+status:'Network or unexpected error';}
   }
   b.results.push({email:v.employeeEmail,cycle:v.cycleKey,result:outcome,detail});b.finished++;
   bulkUpdateView('Processed '+b.finished+' / '+rows.length);
   if(outcome==='UNCERTAIN_STOP')break;
  }
 }finally{
  b.running=false;workspaceBusy=false;
  const counts=b.results.reduce((o,x)=>(o[x.result]=(o[x.result]||0)+1,o),{});
  bulkUpdateView('Finished '+b.finished+' / '+rows.length+' · '+Object.entries(counts).map(([k,v])=>k+' '+v).join(', ')+(b.finished<rows.length?' · STOPPED (review before retry)':''));
 }
}
document.addEventListener('click',e=>{if(e.target.closest('#bulkStart'))runBulkOfficial();});

function assignmentRender(){if(state.page==='admin'&&role()==='ADMIN')adminPage();else if(state.page==='manager'&&isManager())managerPage();}
async function assignmentRequest(action,values){if(!assignmentReady()||role()!=='ADMIN')throw new Error('Verified Official connection and ADMIN role required');if(action==='create_official_assignment'&&!assignmentCreateReadyFor(values))throw new Error('Official Create remains closed pending UAT');return api('assessment',action,{employeeEmail:values.employeeEmail.toLowerCase(),cycleKey:values.cycleKey});}
async function runAssignment(create=false){
 const s=assignmentState;if(s.busy||workspaceBusy||state.demo||role()!=='ADMIN'||!state.verified||!assignmentReady()||!sessionValid()||!assignmentSelectedCycle())return;if(create&&(!assignmentCreateReady()||!assignmentAllowed(s.preview)))return;if(!$('liveAssignmentForm')?.reportValidity())return;
 const generation=state.generation,values={employeeEmail:s.values.employeeEmail.toLowerCase(),cycleKey:s.values.cycleKey};let phase='preview';s.preview=null;s.result=null;s.message='';s.busy=true;workspaceBusy=true;assignmentRender();
 try{
  const p=await assignmentRequest('preview_official_assignment',values);if(generation!==state.generation)return;if(!assignmentAllowed(p,values))throw new Error('Official preview contract or baseline does not match');s.preview=p;if(!create){s.message=assignmentCreateReady()?'พร้อมสร้าง Official Assessment':'ตรวจความพร้อมผ่านแล้ว · ยังไม่เปิดสร้าง Official จนกว่า UAT ผ่าน';return;}
  phase='create';const r=await assignmentRequest('create_official_assignment',values);if(generation!==state.generation)return;s.preview=null;if(!assignmentMatches(r,values)||r.status!=='ASSIGNED'||r.profileVersionKey!==p.profileVersionKey||assignmentCount(r.createdItemCount)!==assignmentCount(p.expectedItemCount)||assignmentCount(r.expectedItemCount)!==assignmentCount(p.expectedItemCount))throw new Error('Official result incomplete; inspect '+assignmentKey(values)+' before retrying');s.result=r;s.message='สร้าง Official สำเร็จ พนักงานสามารถเปิด My Assessment ได้';
 }catch(e){if(generation!==state.generation||e.stale)return;s.preview=null;s.message=assignmentErrorMessage(e,phase);if(e.status===401)fail(e);
 }finally{if(generation===state.generation){s.busy=false;workspaceBusy=false;assignmentRender();}}
}
function assignmentInputChanged(e){if(e.target.closest('#liveAssignmentForm')&&Object.hasOwn(assignmentState.values,e.target.name)){assignmentState.values[e.target.name]=e.target.value.trim();assignmentState.preview=null;assignmentState.result=null;assignmentState.securityResults=[];assignmentState.message='ข้อมูลเปลี่ยนแล้ว กรุณาตรวจความพร้อมอีกครั้ง';const b=$('createAssignment');if(b)b.disabled=true;const out=$('assignmentOutcome');if(out)out.textContent=assignmentState.message;const p=$('previewAssignment');if(p)p.disabled=!assignmentSelectedCycle();const checks=$('checkOfficialSecurity');if(checks)checks.disabled=!assignmentSelectedCycle()||!assignmentState.values.employeeEmail;}}
document.addEventListener('input',assignmentInputChanged);document.addEventListener('change',assignmentInputChanged);document.addEventListener('submit',e=>{if(e.target.id==='liveAssignmentForm'){e.preventDefault();runAssignment();}});document.addEventListener('click',e=>{if(e.target.closest('#createAssignment'))runAssignment(true);});

async function runOfficialSecurityChecks(){
 const s=assignmentState;if(s.busy||workspaceBusy||state.demo||!state.verified||role()!=='ADMIN'||!assignmentReady()||assignmentCreateReady()||!sessionValid()||!assignmentSelectedCycle()||!s.values.employeeEmail)return;
 const generation=state.generation,base={employeeEmail:s.values.employeeEmail.toLowerCase(),cycleKey:s.values.cycleKey};
 const cases=[{name:'ไม่มี session token',status:401,payload:{...base,sessionToken:undefined}},{name:'session token ไม่ถูกต้อง',status:401,payload:{...base,sessionToken:'invalid-uat-token'}},{name:'นอก allowlist',status:403,payload:{...base,employeeEmail:'not-authorized@example.test'}},{name:'cycle ไม่ตรงกับพนักงาน',status:403,payload:{...base,cycleKey:base.cycleKey==='EEM_ANNUAL_2026'?'ECM_ANNUAL_2026':'EEM_ANNUAL_2026'}},{name:'client profile override',status:400,payload:{...base,profileVersionKey:'CLIENT_OVERRIDE_FORBIDDEN'}}];
 s.securityResults=[];s.busy=true;workspaceBusy=true;assignmentRender();
 try{for(const c of cases){let result;try{await api('assessment','preview_official_assignment',c.payload);result={name:c.name,status:200,passed:false,message:'Unexpected success'};}catch(e){result={name:c.name,status:e.status||'UNKNOWN',passed:e.status===c.status,message:String(e.message||'No confirmed response').slice(0,200)};}if(generation!==state.generation)return;s.securityResults.push(result);assignmentRender();}}
 finally{if(generation===state.generation){s.busy=false;workspaceBusy=false;assignmentRender();}}
}
document.addEventListener('click',e=>{if(e.target.closest('#checkOfficialSecurity'))runOfficialSecurityChecks();});
