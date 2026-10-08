'use strict';
const $=s=>document.querySelector(s);
const state={user:null,csrf:'',students:[],reviews:[],followups:[],page:'dashboard'};
const titles={dashboard:'Overview',students:'Students',reviews:'Signal reviews',followups:'Follow-ups',users:'Teachers',settings:'Account'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateNow=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const fmt=v=>v==null?'—':`${Number(v).toFixed(0)}%`;
const reasons=a=>{try{return JSON.parse(a.reasons||'[]');}catch{return [];}};
const badge=s=>`<span class="badge ${s==='Priority review'?'priority':s==='Monitor'?'monitor':s==='Data incomplete'?'incomplete':''}">${esc(s)}</span>`;
const completeness=s=>!s.record_id||[s.attendance,s.marks,s.pending_assignments].some(v=>v==null);
const signal=s=>s.signal_level|| (completeness(s)?'Data incomplete':'No signal');
function toast(message,error=false){$('#toast').textContent=message;$('#toast').style.borderColor=error?'var(--red)':'var(--cyan)';$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,5500);}
async function api(path,data){const res=await fetch(`api/${path}`,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-CSRF-Token':state.csrf}:{},body:data?JSON.stringify(data):undefined});let body;try{body=await res.json();}catch{throw new Error('Server did not return JSON. Check Tomcat deployment in NetBeans Output.');}if(!res.ok){if(res.status===401&&path!=='login')showLogin();throw new Error(body.error||'Request failed');}return body;}
function showLogin(){state.user=null;$('#appView').hidden=true;$('#loginView').hidden=false;$('#modal').close();}
function showApp(){$('#loginView').hidden=true;$('#appView').hidden=false;$('#userName').textContent=state.user.full_name;$('#userRole').textContent=state.user.role;$('#initials').textContent=state.user.full_name.charAt(0);document.querySelectorAll('.admin-only').forEach(el=>el.hidden=state.user.role!=='ADMIN');}
async function refresh(){const [students,reviews,followups]=await Promise.all([api('students'),api('reviews'),api('followups')]);Object.assign(state,{students,reviews,followups});$('#alertCount').textContent=reviews.filter(a=>a.review_status==='Pending').length||'';}
async function navigate(page){state.page=page;$('#pageTitle').textContent=titles[page]||'Student profile';document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===page));$('#content').innerHTML='<div class="empty">Loading workspace…</div>';try{await refresh();await render();}catch(e){$('#content').innerHTML=`<div class="notice error">${esc(e.message)}</div><button class="secondary" data-action="retry">Retry</button>`;}}
async function render(){if(state.page==='dashboard')dashboard();else if(state.page==='students')studentsPage();else if(state.page==='reviews')reviewsPage();else if(state.page==='followups')followupsPage();else if(state.page==='users')await usersPage();else if(state.page==='settings')settingsPage();else if(state.page==='profile')await profile(state.profileId);}
function average(key){const values=state.students.map(s=>s[key]).filter(v=>v!=null);return values.length?values.reduce((a,b)=>a+Number(b),0)/values.length:null;}
function stat(label,value,note,color='cyan'){return `<div class="glass stat"><div class="label">${label}</div><strong class="${color}">${value}</strong><small>${note}</small></div>`;}
function dashboard(){const pending=state.reviews.filter(a=>a.review_status==='Pending');const open=state.followups.filter(i=>i.status==='Open');const overdue=open.filter(i=>i.followup_date&&i.followup_date<dateNow());
$('#content').innerHTML=`<section class="glass hero"><div><div class="eyebrow">EVERY STUDENT DESERVES A CHECK-IN</div><h2>Spot the signal. Start the conversation.</h2><p>${pending.length} alerts waiting for a teacher review.</p></div><span class="hero-mark">◈</span></section><div class="stats">${stat('Students',state.students.length,'Registered in this workspace')}${stat('Pending reviews',pending.length,'Includes earlier unresolved alerts','red')}${stat('Open follow-ups',open.length,`${overdue.length} past the follow-up date`,'purple')}${stat('Average attendance',fmt(average('attendance')),'Latest available record per student','yellow')}</div><div class="grid-two"><section class="glass panel"><div class="section-head"><div><h3>Class snapshot</h3><p>Latest available attendance and marks</p></div></div>${classChart()}<div class="chart-legend"><span><i class="dot" style="background:var(--cyan)"></i>Attendance</span><span><i class="dot" style="background:var(--purple)"></i>Marks</span></div></section><section class="glass panel"><div class="section-head"><div><h3>Latest signal distribution</h3><p>Per student · incomplete data shown separately</p></div></div>${distributionChart()}</section></div><section class="glass panel"><div class="section-head"><div><h3>Review queue</h3><p>Earlier alerts stay open until a teacher reviews them</p></div><button class="secondary" data-action="reviews">View all</button></div><div class="signal-list">${pending.slice(0,4).map(a=>`<div class="signal-item"><div><strong>${esc(a.full_name)}</strong> ${badge(a.signal_level)}<p>${esc(a.record_date)} · ${esc(reasons(a).join(' · '))}</p></div><button class="secondary" data-action="review" data-id="${a.alert_id}">Review</button></div>`).join('')||'<div class="empty">No pending reviews. Keep checking in.</div>'}</div></section><div class="notice">Demo rules: attendance below 75%, marks below 40%, at least 2 overdue assignments, or a marks drop of at least 15 percentage points. These rules indicate a need for review, not a final judgement.</div>`;}
function classChart(){const a=average('attendance'),m=average('marks');if(a==null&&m==null)return '<div class="empty">Add academic records to see this graph.</div>';return `<svg class="chart" viewBox="0 0 480 210" role="img" aria-label="Average latest attendance ${fmt(a)}; marks ${fmt(m)}">${[0,25,50,75,100].map(v=>`<line x1="50" x2="450" y1="${180-v*1.45}" y2="${180-v*1.45}" stroke="#ffffff10"/><text x="10" y="${184-v*1.45}">${v}%</text>`).join('')}${[[a,110,'#6ce5dc','Attendance'],[m,285,'#b09bff','Marks']].map(([v,x,c,l])=>v==null?`<text x="${x}" y="110">No data</text>`:`<rect x="${x}" y="${180-v*1.45}" width="75" height="${v*1.45}" rx="8" fill="${c}" opacity=".8"/><text x="${x+20}" y="${170-v*1.45}">${fmt(v)}</text><text x="${x}" y="205">${l}</text>`).join('')}</svg>`;}
function distributionChart(){const groups=[['Priority review','#ff96ac'],['Monitor','#ffd48e'],['No signal','#6ce5dc'],['Data incomplete','#b09bff']];return `<div style="padding-top:16px">${groups.map(([g,c])=>{const n=state.students.filter(s=>signal(s)===g).length;return `<div style="margin-bottom:20px"><div class="section-head" style="margin-bottom:6px;font-size:12px"><span>${g}</span><strong>${n}</strong></div><div style="height:7px;background:#ffffff08;border-radius:10px"><div style="height:7px;width:${state.students.length?n/state.students.length*100:0}%;background:${c};border-radius:10px"></div></div></div>`;}).join('')}</div>`;}
function studentsPage(){const admin=state.user.role==='ADMIN';$('#content').innerHTML=`<div class="notice">Search students, record dated academic snapshots, and inspect their support history. A blank academic field means unknown, not zero.</div><div class="toolbar"><input id="studentSearch" aria-label="Search students" placeholder="Search name or roll number…"><select id="signalFilter" aria-label="Filter signal"><option value="">All signals</option><option>Priority review</option><option>Monitor</option><option>No signal</option><option>Data incomplete</option></select>${admin?'<button class="primary" data-action="addStudent">+ Add student</button>':''}</div><section class="glass panel"><div class="table-wrap"><table><thead><tr><th>STUDENT</th><th>CLASS</th><th>ATTENDANCE</th><th>MARKS</th><th>OVERDUE</th><th>LATEST SIGNAL</th><th>ACTIONS</th></tr></thead><tbody id="studentRows"></tbody></table></div></section>`;studentRows();$('#studentSearch').addEventListener('input',studentRows);$('#signalFilter').addEventListener('change',studentRows);}
function studentRows(){const q=$('#studentSearch').value.toLowerCase(),filter=$('#signalFilter').value;const rows=state.students.filter(s=>(`${s.full_name} ${s.roll_no}`.toLowerCase().includes(q))&&(!filter||signal(s)===filter));$('#studentRows').innerHTML=rows.map(s=>`<tr><td><strong>${esc(s.full_name)}</strong><small>${esc(s.roll_no)}</small></td><td>${esc(s.class_name)}<small>Semester ${s.semester}</small></td><td>${fmt(s.attendance)}</td><td>${fmt(s.marks)}</td><td>${s.pending_assignments??'—'}</td><td>${badge(signal(s))}${completeness(s)&&s.signal_level?'<small>Some data missing</small>':''}<small>${esc(s.record_date||'No records')}</small></td><td><button class="secondary" data-action="profile" data-id="${s.student_id}">Profile</button> <button class="secondary" data-action="record" data-id="${s.student_id}">+ Record</button>${state.user.role==='ADMIN'?` <button class="secondary" data-action="editStudent" data-id="${s.student_id}">Edit</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No students found.</td></tr>';}
function reviewsPage(){const values=['Pending','Needs support','Monitor','Dismissed'];$('#content').innerHTML=`<div class="notice">Read the reasons, check the records, and talk to the student before choosing an action. A dismissal requires a written reason. Each review is saved once and kept in the support history.</div><div class="toolbar"><input id="reviewSearch" aria-label="Search reviews" placeholder="Search student or roll number…"><select id="reviewFilter" aria-label="Review status"><option value="">All review statuses</option>${values.map(v=>`<option ${v==='Pending'?'selected':''}>${v}</option>`).join('')}</select></div><div id="reviewCards"></div>`;reviewCards();$('#reviewSearch').addEventListener('input',reviewCards);$('#reviewFilter').addEventListener('change',reviewCards);}
function reviewCards(){const q=$('#reviewSearch').value.toLowerCase(),f=$('#reviewFilter').value;$('#reviewCards').innerHTML=state.reviews.filter(a=>`${a.full_name} ${a.roll_no}`.toLowerCase().includes(q)&&(!f||a.review_status===f)).map(a=>`<article class="glass review-card"><div class="section-head"><div><strong>${esc(a.full_name)}</strong> ${badge(a.signal_level)}<p>${esc(a.roll_no)} · Record ${esc(a.record_date)} · ${esc(a.review_status)}</p></div><button class="${a.review_status==='Pending'?'primary':'secondary'}" data-action="${a.review_status==='Pending'?'review':'profile'}" data-id="${a.review_status==='Pending'?a.alert_id:a.student_id}">${a.review_status==='Pending'?'Review signal':'View history'}</button></div><ul>${reasons(a).map(r=>`<li>${esc(r)}</li>`).join('')}</ul></article>`).join('')||'<div class="glass empty">No reviews match this filter.</div>';}
function followupsPage(){const sorted=[...state.followups];$('#content').innerHTML=`<div class="notice">Record what happened after support was offered. Add an outcome and mark the follow-up completed when appropriate.</div><div class="toolbar"><select id="followFilter" aria-label="Follow-up status"><option value="">All follow-ups</option><option selected>Open</option><option>Completed</option></select></div><section class="glass panel"><div class="table-wrap"><table><thead><tr><th>STUDENT</th><th>SUPPORT</th><th>FOLLOW-UP DATE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody id="followRows"></tbody></table></div></section>`;const draw=()=>{$('#followRows').innerHTML=sorted.filter(i=>!$('#followFilter').value||i.status===$('#followFilter').value).map(i=>`<tr><td><strong>${esc(i.full_name)}</strong><small>${esc(i.roll_no)} · ${esc(i.teacher_name)}</small></td><td class="break" style="max-width:350px">${esc(i.action||i.decision)}<small>${esc(i.remarks)}</small></td><td>${esc(i.followup_date||'Not scheduled')}${i.status==='Open'&&i.followup_date&&i.followup_date<dateNow()?'<small class="red">Overdue</small>':''}</td><td>${badge(i.status)}</td><td><button class="secondary" data-action="followup" data-id="${i.intervention_id}">Update</button> <button class="secondary" data-action="profile" data-id="${i.student_id}">Profile</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">No follow-ups match this filter.</td></tr>';};draw();$('#followFilter').addEventListener('change',draw);}
async function usersPage() {
    const users = await api('users');

    $('#content').innerHTML = `
        <div class="toolbar">
            <p class="muted">
                Create and manage teacher accounts.
            </p>

            <button class="primary" data-action="addUser">
                + Create an account
            </button>
        </div>

        <section class="glass panel">
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>NAME</th>
                            <th>USERNAME</th>
                            <th>ROLE</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>${esc(u.full_name)}</td>
                                <td>${esc(u.username)}</td>
                                <td>${badge(u.role)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}
function settingsPage(){$('#content').innerHTML=`<section class="glass panel" style="max-width:550px"><h3>Change password</h3><p class="muted">Use at least 10 characters. Change the demo password before entering real student records.</p><form id="passwordForm"><label>Current password<input name="current_password" type="password" autocomplete="current-password" required></label><label>New password<input name="new_password" type="password" minlength="10" maxlength="200" autocomplete="new-password" required></label><button class="primary">Update password</button><p class="error form-error" role="alert"></p></form></section>`;bindForm('#passwordForm','password',()=>{toast('Password updated');settingsPage();});}
function modal(title,html){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modal').showModal();}
const actions=`<div class="form-actions"><button type="button" class="secondary" data-action="close">Cancel</button><button class="primary" type="submit">Save</button></div><p class="error form-error" role="alert"></p>`;
function studentForm(id){const s=state.students.find(x=>x.student_id===Number(id))||{};modal(s.student_id?'Edit student':'Add student',`<form id="studentForm">${s.student_id?`<input type="hidden" name="student_id" value="${s.student_id}">`:''}<div class="form-grid"><label>Full name<input name="full_name" value="${esc(s.full_name)}" required maxlength="100"></label><label>Roll number<input name="roll_no" value="${esc(s.roll_no)}" required maxlength="30"></label><label>Class<input name="class_name" value="${esc(s.class_name||'TY BSc IT')}" required maxlength="50"></label><label>Semester<input name="semester" type="number" min="1" max="12" value="${s.semester||5}" required></label></div>${actions}</form>`);bindForm('#studentForm','student',afterSave);}
function recordForm(id){const s=state.students.find(x=>x.student_id===Number(id));modal('Add academic snapshot',`<p class="muted">${esc(s.full_name)} · ${esc(s.roll_no)}</p><div class="notice">Enter one snapshot per date, after the latest record (${esc(s.record_date||'none')}). Leave unavailable values blank. Percentages must be 0–100.</div><form id="recordForm"><input type="hidden" name="student_id" value="${s.student_id}"><label>Record date<input name="record_date" type="date" max="${dateNow()}" value="${dateNow()}" required></label><div class="form-grid"><label>Attendance (%)<input name="attendance" type="number" min="0" max="100" step="0.01" placeholder="Unknown if blank"></label><label>Test marks (%)<input name="marks" type="number" min="0" max="100" step="0.01" placeholder="Unknown if blank"></label></div><label>Overdue assignments<input name="pending_assignments" type="number" min="0" max="100" step="1" placeholder="Unknown if blank"></label>${actions}</form>`);bindForm('#recordForm','record',afterSave);}
function reviewForm(id){const a=state.reviews.find(x=>x.alert_id===Number(id));modal('Teacher review',`<p><strong>${esc(a.full_name)}</strong> · ${esc(a.record_date)}</p><ul class="muted">${reasons(a).map(r=>`<li>${esc(r)}</li>`).join('')}</ul><button type="button" class="secondary" data-action="profile" data-id="${a.student_id}">Inspect student history</button><form id="reviewForm"><input type="hidden" name="alert_id" value="${a.alert_id}"><label>Teacher decision<select name="review_status"><option>Needs support</option><option>Monitor</option><option>Dismissed</option></select></label><label>Remarks / reason<textarea name="remarks" required maxlength="2000" placeholder="What did you verify or discuss with the student?"></textarea></label><label>Support action<textarea name="action" maxlength="1000" placeholder="Example: weekly doubt-solving session"></textarea></label><label>Follow-up date<input name="followup_date" type="date"></label><small class="muted">Needs support requires an action and a follow-up date.</small>${actions}</form>`);bindForm('#reviewForm','review',afterSave);}
function followupForm(id){const i=state.followups.find(x=>x.intervention_id===Number(id));modal('Update follow-up',`<p><strong>${esc(i.full_name)}</strong></p><p class="muted">${esc(i.action||i.decision)}</p><form id="followupForm"><input type="hidden" name="intervention_id" value="${i.intervention_id}"><label>Outcome / progress notes<textarea name="outcome" required maxlength="2000">${esc(i.outcome)}</textarea></label><label>Status<select name="status"><option ${i.status==='Open'?'selected':''}>Open</option><option ${i.status==='Completed'?'selected':''}>Completed</option></select></label>${actions}</form>`);bindForm('#followupForm','followup',afterSave);}
function userForm() {
    modal('Create an account', `
        <form id="userForm">
            <label>
                Full name
                <input
                    name="full_name"
                    maxlength="100"
                    autocomplete="name"
                    required
                >
            </label>

            <label>
                Username
                <input
                    name="username"
                    minlength="3"
                    maxlength="50"
                    pattern="[a-zA-Z0-9_.-]{3,50}"
                    autocomplete="off"
                    required
                >
            </label>

            <label>
                Password
                <input
                    name="password"
                    type="password"
                    minlength="10"
                    maxlength="200"
                    autocomplete="new-password"
                    required
                >
            </label>

            <label>
                Confirm password
                <input
                    name="confirm_password"
                    type="password"
                    minlength="10"
                    maxlength="200"
                    autocomplete="new-password"
                    required
                >
            </label>

            <p class="muted small">
                This account will have Teacher access.
                Use a unique username and a password
                with at least 10 characters.
            </p>

            ${actions}
        </form>
    `);

    const form = $('#userForm');
    const password = form.elements.namedItem('password');
    const confirm = form.elements.namedItem('confirm_password');

    function checkPasswords() {
        confirm.setCustomValidity(
            password.value === confirm.value
                ? ''
                : 'Passwords do not match.'
        );
    }

    password.addEventListener('input', checkPasswords);
    confirm.addEventListener('input', checkPasswords);

    bindForm('#userForm', 'user', afterSave);
}
function bindForm(selector,path,success){const form=$(selector);form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button[type="submit"],button.primary');button.disabled=true;form.querySelector('.form-error').textContent='';try{await api(path,Object.fromEntries(new FormData(form)));await success();}catch(err){form.querySelector('.form-error').textContent=err.message;}finally{button.disabled=false;}});}
async function afterSave(){$('#modal').close();toast('Saved successfully');await navigate(state.page);}
async function profile(id){$('#modal').close();const p=await api(`profile?id=${Number(id)}`),s=p.student;state.page='profile';state.profileId=Number(id);$('#pageTitle').textContent='Student profile';const latest=p.records.at(-1);$('#content').innerHTML=`<button class="secondary" data-action="students">← Students</button><div class="profile-top"><div class="avatar">${esc(s.full_name.charAt(0))}</div><div><h2>${esc(s.full_name)}</h2><p>${esc(s.roll_no)} · ${esc(s.class_name)} · Semester ${s.semester}</p></div><button class="primary" style="margin-left:auto" data-action="record" data-id="${s.student_id}">+ Record</button></div><div class="stats">${stat('Latest attendance',fmt(latest?.attendance),'Latest snapshot')}${stat('Latest marks',fmt(latest?.marks),'Latest snapshot','purple')}${stat('Overdue assignments',latest?.pending_assignments??'—','Blank means unavailable','yellow')}${stat('Support reviews',p.interventions.length,'Saved teacher decisions','cyan')}</div><section class="glass panel"><div class="section-head"><div><h3>Academic progress</h3><p>Recorded snapshots · gaps represent unavailable values</p></div></div>${trendChart(p.records)}<div class="chart-legend"><span><i class="dot" style="background:var(--cyan)"></i>Attendance</span><span><i class="dot" style="background:var(--purple)"></i>Marks</span></div></section><div class="grid-two"><section class="glass panel"><h3>Record history</h3><div class="table-wrap"><table><thead><tr><th>DATE</th><th>ATTENDANCE</th><th>MARKS</th><th>OVERDUE</th></tr></thead><tbody>${p.records.map(r=>`<tr><td>${esc(r.record_date)}</td><td>${fmt(r.attendance)}</td><td>${fmt(r.marks)}</td><td>${r.pending_assignments??'—'}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No records yet.</td></tr>'}</tbody></table></div><h3 style="margin-top:20px">Signal history</h3>${p.alerts.map(a=>`<div class="notice"><strong>${esc(a.record_date)}</strong> · ${esc(a.review_status)}<br>${esc(reasons(a).join(' · '))}${a.review_status==='Pending'?`<br><button class="secondary" data-action="review" data-id="${a.alert_id}">Review</button>`:''}</div>`).join('')||'<p class="muted">No signal history.</p>'}</section><section class="glass panel"><h3>Teacher support history</h3><div class="timeline" style="margin-top:20px">${p.interventions.map(i=>`<article><strong>${esc(i.decision)}</strong> ${badge(i.status)}<p>${esc(i.teacher_name)} · ${esc(i.created_at)}</p><p>Remarks: ${esc(i.remarks)}</p><p>Action: ${esc(i.action||'Not recorded')}</p><p>Follow-up: ${esc(i.followup_date||'Not scheduled')}</p><p>Outcome: ${esc(i.outcome||'Awaiting follow-up')}</p><button class="secondary" data-action="followup" data-id="${i.intervention_id}">Update outcome</button></article>`).join('')||'<p class="muted">No teacher reviews recorded yet.</p>'}</div></section></div>`;}
function trendChart(records){if(!records.length)return '<div class="empty">Add academic records to see progress.</div>';const w=600,x=i=>records.length===1?320:50+i*(w-70)/(records.length-1),y=v=>180-Number(v)*1.45;let paths='';for(const [key,color]of[['attendance','#6ce5dc'],['marks','#b09bff']]){let segment=[];const flush=()=>{if(segment.length)paths+=`<polyline points="${segment.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`;segment=[];};records.forEach((r,i)=>{if(r[key]==null){flush();return;}segment.push(`${x(i)},${y(r[key])}`);paths+=`<circle cx="${x(i)}" cy="${y(r[key])}" r="4" fill="${color}"><title>${esc(r.record_date)}: ${fmt(r[key])}</title></circle>`;});flush();}return `<svg class="chart" viewBox="0 0 620 220" role="img" aria-label="Attendance and marks across recorded dates">${[0,25,50,75,100].map(v=>`<line x1="50" x2="600" y1="${y(v)}" y2="${y(v)}" stroke="#ffffff10"/><text x="5" y="${y(v)+4}">${v}%</text>`).join('')}${paths}${records.map((r,i)=>i===0||i===records.length-1||records.length<=5?`<text x="${x(i)}" y="208" text-anchor="${i===0?'start':i===records.length-1?'end':'middle'}">${esc(r.record_date)}</text>`:'').join('')}</svg>`;}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const button=$('#loginForm button');button.disabled=true;$('#loginError').textContent='';try{const r=await api('login',Object.fromEntries(new FormData(e.target)));state.user=r.user;state.csrf=r.csrf;e.target.password.value='';showApp();await navigate('dashboard');}catch(err){$('#loginError').textContent=err.message;}finally{button.disabled=false;}});
$('#logoutBtn').addEventListener('click',async()=>{try{await api('logout',{});showLogin();const s=await api('session');state.csrf=s.csrf;}catch(e){toast(e.message,true);}});
$('#closeModal').addEventListener('click',()=>$('#modal').close());
document.addEventListener('click',async e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.page){await navigate(button.dataset.page);return;}const a=button.dataset.action,id=button.dataset.id;try{if(a==='addStudent')studentForm();else if(a==='editStudent')studentForm(id);else if(a==='record')recordForm(id);else if(a==='review')reviewForm(id);else if(a==='followup')followupForm(id);else if(a==='addUser')userForm();else if(a==='profile')await profile(id);else if(a==='close')$('#modal').close();else if(a==='students'||a==='reviews')await navigate(a);else if(a==='retry')await navigate(state.page);}catch(err){toast(err.message,true);}});
(async()=>{try{const s=await api('session');state.csrf=s.csrf;if(s.user.user_id){state.user=s.user;showApp();await navigate('dashboard');}}catch(e){$('#loginError').textContent=e.message;}})();
function registrationForm() {
    modal('Create an account', `
        <form id="registerForm">
            <label>
                Full name
                <input
                    name="full_name"
                    maxlength="100"
                    autocomplete="name"
                    required
                >
            </label>

            <label>
                Username
                <input
                    name="username"
                    minlength="3"
                    maxlength="50"
                    pattern="[a-zA-Z0-9_.-]{3,50}"
                    autocomplete="username"
                    required
                >
            </label>

            <label>
                Password
                <input
                    name="password"
                    type="password"
                    minlength="10"
                    maxlength="200"
                    autocomplete="new-password"
                    required
                >
            </label>

            <label>
                Confirm password
                <input
                    name="confirm_password"
                    type="password"
                    minlength="10"
                    maxlength="200"
                    autocomplete="new-password"
                    required
                >
            </label>

            <label>
                College access code
                <input
                    name="access_code"
                    type="password"
                    maxlength="100"
                    autocomplete="off"
                    required
                >
            </label>

            <p class="muted small">
                An authorised teacher account will be created.
                Get the access code from your administrator.
            </p>

            <button type="submit" class="primary">
                Create account
            </button>

            <p class="error form-error" role="alert"></p>
        </form>
    `);

    const form = $('#registerForm');
    const password = form.elements.namedItem('password');
    const confirm = form.elements.namedItem('confirm_password');

    function validatePasswords() {
        confirm.setCustomValidity(
            password.value === confirm.value
                ? ''
                : 'Passwords do not match.'
        );
    }

    password.addEventListener('input', validatePasswords);
    confirm.addEventListener('input', validatePasswords);

    bindForm('#registerForm', 'register', async () => {
        const username = form.elements.namedItem('username').value;

        $('#modal').close();

        const loginForm = $('#loginForm');
        loginForm.elements.namedItem('username').value = username;
        loginForm.elements.namedItem('password').value = '';

        $('#loginError').textContent = '';

        toast('Account created! Sign in with your new password.');

        loginForm.elements.namedItem('password').focus();
    });
}

$('#openRegisterBtn').addEventListener('click', registrationForm);
// Editorial workspace redesign. Existing API contracts remain unchanged.
let workspaceLoadedAt = 0;
let navigationVersion = 0;
let studentView = 'cards';
let listPage = 1;
const originalShowLogin = showLogin;
showLogin = function () {
    ++navigationVersion;
    workspaceLoadedAt = 0;
    state.students = []; state.reviews = []; state.followups = [];
    $('#content').innerHTML = '';
    originalShowLogin();
};
refresh = async function (force = false) {
    if (!force && workspaceLoadedAt && Date.now() - workspaceLoadedAt < 30000) return;
    const userId = state.user?.user_id;
    const [students, reviews, followups] = await Promise.all([
        api('students'), api('reviews'), api('followups')
    ]);
    if (!state.user || state.user.user_id !== userId) return;
    Object.assign(state, { students, reviews, followups });
    workspaceLoadedAt = Date.now();
    $('#alertCount').textContent = reviews.filter(a => a.review_status === 'Pending').length || '';
};
navigate = async function (page) {
    const version = ++navigationVersion;
    state.page = page;
    $('#pageTitle').textContent = titles[page] || 'Student profile';
    document.querySelectorAll('.nav').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    $('#content').classList.remove('page-enter');
    try {
        await refresh();
        if (version !== navigationVersion || !state.user) return;
        await render();
        if (version === navigationVersion && state.user) {
            requestAnimationFrame(() => $('#content').classList.add('page-enter'));
        }
    } catch (e) {
        if (version !== navigationVersion || !state.user) return;
        $('#content').innerHTML = `<div class="notice error">${esc(e.message)}</div><button class="secondary" data-ui="refresh">Retry</button>`;
    }
};
afterSave = async function () {
    $('#modal').close(); workspaceLoadedAt = 0;
    toast('Saved successfully'); await navigate(state.page);
};
bindForm = function (selector, path, success) {
    const form = $(selector);
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const button = form.querySelector('button[type="submit"],button.primary');
        if (button.disabled) return;
        const label = button.innerHTML;
        button.disabled = true; button.textContent = 'Saving…';
        form.querySelector('.form-error').textContent = '';
        try {
            await api(path, Object.fromEntries(new FormData(form)));
            await success();
        } catch (err) { form.querySelector('.form-error').textContent = err.message; }
        finally { button.disabled = false; button.innerHTML = label; }
    });
};
const initialAvatar = s => `<span class="student-avatar tone-${Number(s.student_id) % 4}">${esc(s.full_name.split(/\s+/).map(v=>v[0]).slice(0,2).join(''))}</span>`;
const progress = (value, label) => `<div class="mini-progress"><div><span>${label}</span><strong>${fmt(value)}</strong></div><div class="track"><span style="width:${value == null ? 0 : Math.max(0,Math.min(100,Number(value)))}%"></span></div></div>`;

dashboard = function () {
    const pending = state.reviews.filter(a=>a.review_status==='Pending');
    const open = state.followups.filter(i=>i.status==='Open');
    const overdue = open.filter(i=>i.followup_date && i.followup_date<dateNow());
    const due = open.filter(i=>i.followup_date===dateNow());
    $('#content').innerHTML = `
    <section class="editorial-intro"><div><span class="eyebrow">THE SUPPORT STUDIO</span><h1>Small signals.<br><em>Meaningful change.</em></h1><p>Your class, its progress, and the conversations that matter.</p></div><div class="intro-actions"><button class="primary" data-page="students">Open students ↗</button><button class="secondary" data-ui="refresh">↻ Refresh data</button></div></section>
    <div class="summary-strip">${stat('Students',state.students.length,'In your workspace')}${stat('Awaiting review',pending.length,'Teacher decisions needed','red')}${stat('Open follow-ups',open.length,'Support in progress','purple')}${stat('Attendance',fmt(average('attendance')),'Latest class average','yellow')}</div>
    <div class="studio-grid"><section class="glass panel progress-panel"><div class="section-head"><div><span class="eyebrow">01 / CLASS PULSE</span><h3>How is your class doing?</h3><p>Average of latest available snapshots</p></div><span class="section-number">01</span></div>${classChart()}<div class="chart-legend"><span><i class="dot" style="background:#6ce5dc"></i>Attendance</span><span><i class="dot" style="background:#b09bff"></i>Marks</span></div><div class="pulse-footer">${distributionChart()}</div></section>
    <aside class="focus-panel"><span class="eyebrow">TODAY’S FOCUS</span><h2>A good day<br>to check in.</h2><div class="focus-row"><strong>${overdue.length}</strong><span>Overdue follow-ups</span></div><div class="focus-row"><strong>${due.length}</strong><span>Follow-ups due today</span></div><div class="focus-row"><strong>${pending.length}</strong><span>Signals awaiting review</span></div><button class="primary" data-page="followups">View follow-ups ↗</button><p>Support starts with a conversation.</p></aside></div>
    <section class="glass panel"><div class="section-head"><div><span class="eyebrow">02 / NEXT CONVERSATIONS</span><h3>Review queue</h3></div><button class="secondary" data-page="reviews">View all ↗</button></div><div class="signal-list">${pending.slice(0,5).map(a=>`<div class="signal-item"><div class="queue-identity">${initialAvatar({student_id:a.student_id,full_name:a.full_name})}<div><strong>${esc(a.full_name)}</strong><p>${esc(a.record_date)} · ${esc(reasons(a).join(' · '))}</p></div></div><div>${badge(a.signal_level)} <button class="secondary" data-action="review" data-id="${a.alert_id}">Review ↗</button></div></div>`).join('') || '<div class="empty">All caught up. No pending reviews.</div>'}</div></section>`;
};
studentsPage = function () {
    listPage=1;
    const classes=[...new Set(state.students.map(s=>s.class_name))].sort();
    $('#content').innerHTML=`<section class="list-heading"><div><span class="eyebrow">PEOPLE BEFORE NUMBERS</span><h2>Your students.</h2><p class="muted">Open a profile to understand the full picture.</p></div>${state.user.role==='ADMIN'?'<button class="primary" data-action="addStudent">+ Add student</button>':''}</section><div class="toolbar"><input id="studentSearch" placeholder="Search name or roll number…" aria-label="Search students"><select id="classFilter" aria-label="Filter class"><option value="">All classes</option>${classes.map(c=>`<option>${esc(c)}</option>`).join('')}</select><select id="signalFilter" aria-label="Filter signal"><option value="">All signals</option><option>Priority review</option><option>Monitor</option><option>No signal</option><option>Data incomplete</option></select><div class="view-switch"><button class="secondary" data-ui="cards" aria-pressed="${studentView==='cards'}">Cards</button><button class="secondary" data-ui="table" aria-pressed="${studentView==='table'}">Table</button></div></div><div id="studentResults"></div><div id="pagination" class="pagination"></div>`;
    ['studentSearch','classFilter','signalFilter'].forEach(id=>$('#'+id).addEventListener(id==='studentSearch'?'input':'change',()=>{listPage=1;studentRows();}));
    studentRows();
};
studentRows = function () {
    const q=$('#studentSearch').value.toLowerCase(), f=$('#signalFilter').value, cl=$('#classFilter').value;
    const all=state.students.filter(s=>`${s.full_name} ${s.roll_no}`.toLowerCase().includes(q)&&(!f||signal(s)===f)&&(!cl||s.class_name===cl));
    const pages=Math.max(1,Math.ceil(all.length/12)); listPage=Math.min(listPage,pages);
    const rows=all.slice((listPage-1)*12,listPage*12);
    const buttons=s=>`<button class="secondary" data-action="profile" data-id="${s.student_id}">Profile ↗</button><button class="primary" data-action="record" data-id="${s.student_id}">+ Record</button>${state.user.role==='ADMIN'?`<button class="secondary" data-action="editStudent" data-id="${s.student_id}">Edit</button>`:''}`;
    $('#studentResults').innerHTML = !rows.length ? '<div class="glass empty">No students match these filters.</div>' : studentView==='cards' ? `<div class="student-grid">${rows.map(s=>`<article class="glass student-card"><div class="card-identity">${initialAvatar(s)}<div><h3>${esc(s.full_name)}</h3><p>${esc(s.roll_no)}</p></div></div><div class="card-meta">${esc(s.class_name)} · Semester ${s.semester}</div>${progress(s.attendance,'Attendance')}${progress(s.marks,'Marks')}<div class="card-status">${badge(signal(s))}<small>${s.pending_assignments??'—'} overdue assignments</small></div>${completeness(s)?'<small class="muted">Some academic data unavailable</small>':''}<div class="card-actions">${buttons(s)}</div></article>`).join('')}</div>` : `<section class="glass panel"><div class="table-wrap"><table><thead><tr><th>STUDENT</th><th>CLASS</th><th>ATTENDANCE</th><th>MARKS</th><th>OVERDUE</th><th>SIGNAL</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(s=>`<tr><td><strong>${esc(s.full_name)}</strong><small>${esc(s.roll_no)}</small></td><td>${esc(s.class_name)}<small>Semester ${s.semester}</small></td><td>${fmt(s.attendance)}</td><td>${fmt(s.marks)}</td><td>${s.pending_assignments??'—'}</td><td>${badge(signal(s))}</td><td><div class="card-actions">${buttons(s)}</div></td></tr>`).join('')}</tbody></table></div></section>`;
    $('#pagination').innerHTML=`<span>${all.length} students · Page ${listPage} of ${pages}</span><div><button class="secondary" data-ui="prev" ${listPage===1?'disabled':''}>← Previous</button> <button class="secondary" data-ui="next" ${listPage===pages?'disabled':''}>Next →</button></div>`;
    document.querySelectorAll('.view-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ui===studentView)));
};
const originalProfile=profile;
profile=async function(id){
    await originalProfile(id);
    const top=$('#content .profile-top'),stats=$('#content .stats'),chart=$('#content > .panel'),grid=$('#content > .grid-two');
    if(!top||!grid)return;
    const shell=document.createElement('div');shell.className='profile-workspace';
    const aside=document.createElement('aside');aside.className='profile-identity glass';
    const body=document.createElement('div');body.className='profile-main';
    top.before(shell);shell.append(aside,body);aside.append(top);if(stats)aside.append(stats);if(chart)body.append(chart);body.append(grid);
};
document.addEventListener('click',async e=>{
    const b=e.target.closest('button[data-ui]');if(!b||b.disabled)return;
    try{
        const a=b.dataset.ui;
        if(a==='refresh'){workspaceLoadedAt=0;await navigate(state.page);toast('Workspace updated');}
        if(a==='cards'||a==='table'){studentView=a;studentRows();}
        if(a==='prev'){listPage--;studentRows();}
        if(a==='next'){listPage++;studentRows();}
    }catch(err){toast(err.message,true);}
});
document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    b.querySelector('.click-ripple')?.remove();
    const r=b.getBoundingClientRect(),size=Math.max(r.width,r.height)*2,span=document.createElement('span');
    span.className='click-ripple';span.setAttribute('aria-hidden','true');
    Object.assign(span.style,{width:size+'px',height:size+'px',left:((e.detail?e.clientX-r.left:r.width/2)-size/2)+'px',top:((e.detail?e.clientY-r.top:r.height/2)-size/2)+'px'});
    b.append(span);span.addEventListener('animationend',()=>span.remove(),{once:true});
});
$('#modal').addEventListener('click',e=>{
    const r=$('#modal').getBoundingClientRect();
    if(e.target===$('#modal')&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))$('#modal').close();
});

// Separate student/staff portals; access enforcement also lives in Java.
function selectPortal(portal) {
    $('#loginForm').elements.namedItem('portal').value=portal;
    document.querySelectorAll('[data-portal]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.portal===portal)));
    $('#portalHeading').textContent=portal==='student'?'Your learning journey.':'Your support workspace.';
    $('#portalDescription').textContent=portal==='student'?'View your own attendance, marks and support plan.':'Sign in as a teacher or administrator.';
    $('#portalHint').textContent=portal==='student'?'Need an account? Ask your administrator for your student login.':'Teacher registration requires the college access code.';
    $('#openRegisterBtn').hidden=portal==='student';
    $('#loginError').textContent='';
    $('#loginForm').elements.namedItem('password').value='';
}
document.querySelectorAll('[data-portal]').forEach(b=>b.addEventListener('click',()=>selectPortal(b.dataset.portal)));
const staffShowApp=showApp;
showApp=function(){
    staffShowApp();
    const student=state.user.role==='STUDENT';
    document.querySelectorAll('.nav').forEach(n=>{
        if(student)n.hidden=!['dashboard','settings'].includes(n.dataset.page);
        else n.hidden=n.classList.contains('admin-only')&&state.user.role!=='ADMIN';
        if(n.dataset.page==='dashboard'){
            const label=n.querySelector('span:not(.nav-icon)');
            if(label)label.textContent=student?'My progress':'Overview';
        }
    });
};
const staffRefresh=refresh;
refresh=async function(force=false){
    if(state.user?.role==='STUDENT')return;
    return staffRefresh(force);
};
const staffRender=render;
render=async function(){
    if(state.user.role!=='STUDENT')return staffRender();
    if(state.page==='settings'){settingsPage();return;}
    state.page='dashboard';$('#pageTitle').textContent='My progress';
    const p=await api('my-profile'),s=p.student,r=p.records.at(-1);
    $('#content').innerHTML=`<section class="editorial-intro"><div><span class="eyebrow">YOUR LEARNING JOURNEY</span><h1>Hello, ${esc(s.full_name.split(/\s+/)[0])}.<br><em>Keep moving forward.</em></h1><p>${esc(s.roll_no)} · ${esc(s.class_name)} · Semester ${s.semester}</p></div></section><div class="summary-strip">${stat('Attendance',fmt(r?.attendance),'Latest available snapshot')}${stat('Marks',fmt(r?.marks),'Latest available snapshot','purple')}${stat('Overdue assignments',r?.pending_assignments??'—','Blank means unavailable','yellow')}${stat('Support plans',p.interventions.length,'Reviewed by your teachers')}</div><section class="glass panel"><div class="section-head"><div><span class="eyebrow">YOUR PROGRESS</span><h3>One step at a time.</h3><p>Attendance in blue · Marks in violet</p></div></div>${trendChart(p.records)}</section><div class="student-support-grid"><section class="glass panel"><h3>Academic history</h3><div class="table-wrap"><table><thead><tr><th>DATE</th><th>ATTENDANCE</th><th>MARKS</th><th>OVERDUE</th></tr></thead><tbody>${p.records.map(r=>`<tr><td>${esc(r.record_date)}</td><td>${fmt(r.attendance)}</td><td>${fmt(r.marks)}</td><td>${r.pending_assignments??'—'}</td></tr>`).join('')||'<tr><td colspan="4">No academic records yet.</td></tr>'}</tbody></table></div></section><section class="glass panel"><h3>Your support plan</h3><div class="timeline">${p.interventions.map(i=>`<article><strong>${esc(i.decision)}</strong> ${badge(i.status)}<p>Teacher: ${esc(i.teacher_name)}</p><p>Action: ${esc(i.action||'No action recorded')}</p><p>Follow-up: ${esc(i.followup_date||'Not scheduled')}</p><p>Progress: ${esc(i.outcome||'Awaiting follow-up')}</p></article>`).join('')||'<p class="muted">No support plan has been recorded yet.</p>'}</div><small>Contact your teacher if you need help or a record looks incorrect.</small></section></div>`;
};
const staffStudentsPage=studentsPage;
studentsPage=function(){
    staffStudentsPage();
    if(state.user.role==='ADMIN')$('.list-heading').insertAdjacentHTML('beforeend','<button class="secondary" data-ui="studentAccount">+ Student login account</button>');
};
function studentAccountForm(){
    modal('Create student login',`<p class="muted">Link one account to an existing student. Give the initial password privately to that student; they can change it under Account.</p><form id="studentAccountForm"><label>Student<select name="student_id" required><option value="">Select a student</option>${state.students.map(s=>`<option value="${s.student_id}">${esc(s.full_name)} · ${esc(s.roll_no)}</option>`).join('')}</select></label><label>Username<input name="username" minlength="3" maxlength="50" pattern="[a-zA-Z0-9_.-]{3,50}" autocomplete="off" required></label><label>Initial password<input type="password" name="password" minlength="10" maxlength="200" autocomplete="new-password" required></label><label>Confirm password<input type="password" name="confirm_password" minlength="10" maxlength="200" autocomplete="new-password" required></label>${actions}</form>`);
    const f=$('#studentAccountForm'),pw=f.elements.namedItem('password'),cf=f.elements.namedItem('confirm_password');
    const check=()=>cf.setCustomValidity(pw.value===cf.value?'':'Passwords do not match.');pw.addEventListener('input',check);cf.addEventListener('input',check);
    bindForm('#studentAccountForm','student-account',afterSave);
}
document.addEventListener('click',e=>{if(e.target.closest('[data-ui="studentAccount"]')&&state.user?.role==='ADMIN')studentAccountForm();});
const teacherRegistration=registrationForm;
registrationForm=function(){selectPortal('staff');teacherRegistration();};
// The existing registration click handler holds its original callback;
// select Staff when it is activated, including after successful registration.
$('#openRegisterBtn').addEventListener('click',()=>selectPortal('staff'));
