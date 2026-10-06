const app=document.getElementById("app");
const KEY="timeclock_v2";
const blank={manager:null,job:null,workers:[],sessions:{},currentUser:null,role:null};
let state=JSON.parse(localStorage.getItem(KEY)||"null")||blank;
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const shell=x=>app.innerHTML=`<div class="app">${x}</div>`;
const fmtTime=x=>new Date(x).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
const fmtDate=x=>new Date(x).toLocaleDateString([],{year:"numeric",month:"short",day:"numeric"});
const dur=ms=>{let m=Math.max(0,Math.floor(ms/60000)),h=Math.floor(m/60);m%=60;return `${h}h ${m}m`};
const code=()=>{const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return s.slice(0,3)+"-"+s.slice(3)};
const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random();

function welcome(){
 shell(`<div class="center"><div class="icon">🕐</div><h1>TimeClock</h1><p>Simple time tracking for managers and workers.</p></div>
 <div class="card"><div class="notice">Choose your role to get started.</div><div class="roles">
 <div class="role" onclick="managerEntry()"><div class="icon">👑</div><h2>Manager</h2><p>Create jobs, manage workers and review hours.</p></div>
 <div class="role" onclick="workerEntry()"><div class="icon">👷</div><h2>Worker</h2><p>Join a job and clock in or out.</p></div></div></div>
 <p class="center small">Prototype: records are stored on this device. Online shared storage comes next.</p>`);
}
function managerEntry(){state.manager?managerLogin():managerCreate()}
function managerCreate(){
 shell(`<h1>👑 Create Manager Account</h1><div class="card"><label>Name</label><input id="mn" placeholder="Manager name">
 <label>Password</label><input id="mp" type="password" placeholder="Password">
 <label>Confirm password</label><input id="mc" type="password" placeholder="Confirm password">
 <div id="err"></div><div class="actions"><button class="primary" onclick="createManager()">Create Account</button><button class="secondary" onclick="welcome()">Back</button></div></div>`);
}
function createManager(){
 const n=document.getElementById("mn").value.trim(),p=document.getElementById("mp").value,c=document.getElementById("mc").value;
 if(!n||!p)return document.getElementById("err").innerHTML='<p class="error">Enter a name and password.</p>';
 if(p!==c)return document.getElementById("err").innerHTML='<p class="error">Passwords do not match.</p>';
 state.manager={name:n,password:p};state.role="manager";save();jobCreate();
}
function managerLogin(){
 shell(`<h1>👑 Manager Sign In</h1><div class="card"><p>Welcome back, ${esc(state.manager.name)}.</p><label>Password</label><input id="lp" type="password">
 <div id="err"></div><div class="actions"><button class="primary" onclick="loginManager()">Sign In</button><button class="secondary" onclick="welcome()">Back</button></div></div>`);
}
function loginManager(){
 if(document.getElementById("lp").value!==state.manager.password)return document.getElementById("err").innerHTML='<p class="error">Wrong password.</p>';
 state.role="manager";save();state.job?managerDash():jobCreate();
}
function jobCreate(){
 shell(`<h1>🏢 Create Your Job</h1><div class="card"><label>Job name</label><input id="jn" placeholder="Example: Babysitting">
 <label>Description (optional)</label><textarea id="jd" placeholder="Example: Babysit my brother after school"></textarea>
 <div id="err"></div><div class="actions"><button class="primary" onclick="createJob()">Create Job</button></div></div>`);
}
function createJob(){
 const n=document.getElementById("jn").value.trim();if(!n)return document.getElementById("err").innerHTML='<p class="error">Enter a job name.</p>';
 state.job={id:id(),name:n,description:document.getElementById("jd").value.trim(),workerCode:code(),createdAt:new Date().toISOString()};
 save();managerDash();
}
function managerDash(){
 const workers=state.workers.map(w=>{const s=state.sessions[w.id];return {...w,session:s}}); 
 shell(`<div class="row"><div><h1>👑 ${esc(state.job.name)}</h1><p>${esc(state.job.description||"")}</p></div><button class="secondary" onclick="managerSettings()">⚙️ Settings</button></div>
 <div class="card"><h2>Workers</h2>${workers.length?workers.map(w=>`<div class="row record"><div><b>${esc(w.name)}</b><div class="small">${w.session?.in&&!w.session?.out?"🟢 Clocked in":"⚪ Clocked out"}</div></div><button class="secondary" onclick="workerHours('${w.id}')">View Hours</button><button class="danger" onclick="removeWorker('${w.id}')">Remove Worker</button></div>`).join(""):'<p>No workers have joined yet.</p>'}</div>
 <div class="card"><h2>Recent Time Records</h2>${allRecords().slice(-10).reverse().map(r=>`<div class="record"><b>${esc(r.name)}</b><br>${fmtDate(r.in)} • ${fmtTime(r.in)} → ${r.out?fmtTime(r.out):"Working"} • <b>${dur(new Date(r.out||Date.now())-new Date(r.in))}</b></div>`).join("")||"<p>No time records yet.</p>"}</div>
 <div class="actions"><button class="secondary" onclick="managerSettings()">Settings</button><button class="secondary" onclick="logout()">Sign Out</button></div>`);
}
function allRecords(){
 return Object.values(state.sessions).flatMap(s=>s.records||[]).map(r=>{const w=state.workers.find(x=>x.id===r.workerId);return {...r,name:w?.name||"Removed worker"}}).sort((a,b)=>new Date(a.in)-new Date(b.in));
}
function workerHours(wid){
 const w=state.workers.find(x=>x.id===wid),s=state.sessions[wid],records=s?.records||[];
 shell(`<div class="row"><h1>📊 ${esc(w.name)}'s Hours</h1><button class="secondary" onclick="managerDash()">Back</button></div>
 <div class="card"><h2>Total</h2><h1>${dur(records.reduce((a,r)=>a+new Date(r.out||Date.now())-new Date(r.in),0))}</h1></div>
 <div class="card"><h2>Time Records</h2>${records.map(r=>`<div class="record"><b>${fmtDate(r.in)}</b><br>${fmtTime(r.in)} → ${r.out?fmtTime(r.out):"Working"} • ${dur(new Date(r.out||Date.now())-new Date(r.in))}${r.edited?" • Manager edited":""}</div>`).join("")||"<p>No records yet.</p>"}</div>`);
}
function removeWorker(wid){
 const w=state.workers.find(x=>x.id===wid);if(!confirm(`Remove ${w.name}? Their old time records will stay.`))return;
 state.workers=state.workers.filter(x=>x.id!==wid);save();managerDash();
}
function managerSettings(){
 shell(`<div class="row"><h1>⚙️ Settings</h1><button class="secondary" onclick="managerDash()">Back</button></div>
 <div class="card"><h2>Worker Access Code</h2><p>New workers use this code to join the job.</p><div class="code">${state.job.workerCode}</div>
 <div class="actions"><button class="secondary" onclick="navigator.clipboard?.writeText(state.job.workerCode);alert('Code copied!')">Copy Code</button><button class="primary" onclick="newCode()">Generate New Code</button></div>
 <p class="small">Generating a new code stops new workers from joining with the old code. Existing workers stay connected.</p></div>
 <div class="card"><h2>${esc(state.job.name)}</h2><p>${esc(state.job.description||"No description")}</p></div>
 <div class="actions"><button class="secondary" onclick="logout()">Sign Out</button></div>`);
}
function newCode(){state.job.workerCode=code();save();managerSettings()}
function workerEntry(){
 if(state.currentUser&&state.role==="worker"&&state.workers.some(w=>w.id===state.currentUser)){workerHome();return}
 shell(`<h1>👷 Join a Job</h1><div class="card"><label>Your name</label><input id="wn" placeholder="Your name">
 <label>Worker code</label><input id="wc" placeholder="ABC-123" maxlength="7">
 <div id="err"></div><div class="actions"><button class="primary" onclick="joinWorker()">Join Job</button><button class="secondary" onclick="welcome()">Back</button></div></div>`);
}
function joinWorker(){
 const n=document.getElementById("wn").value.trim(),c=document.getElementById("wc").value.trim().toUpperCase();
 if(!n||!c)return document.getElementById("err").innerHTML='<p class="error">Enter your name and worker code.</p>';
 if(!state.job||c!==state.job.workerCode)return document.getElementById("err").innerHTML='<p class="error">That worker code is not valid.</p>';
 const w={id:id(),name:n,joinedAt:new Date().toISOString()};state.workers.push(w);state.sessions[w.id]={records:[]};state.currentUser=w.id;state.role="worker";save();workerHome();
}
function workerHome(){
 const w=state.workers.find(x=>x.id===state.currentUser),s=state.sessions[w.id],open=(s.records||[]).find(r=>!r.out);
 shell(`<div class="center"><h1>Welcome back, ${esc(w.name)} 👋</h1><p>${esc(state.job.name)}</p></div>
 <div class="card"><div class="status ${open?"working":""}">${open?"🟢 CLOCKED IN":"⚪ NOT CLOCKED IN"}</div>
 ${open?`<p class="center">Started: <b>${fmtTime(open.in)}</b></p><p class="center" id="timer">Time worked: ${dur(Date.now()-new Date(open.in))}</p><button class="danger" style="width:100%" onclick="clockOut()">CLOCK OUT</button>`:`<button class="success" style="width:100%" onclick="clockIn()">CLOCK IN</button>`}</div>
 <div class="card"><h2>My Recent Hours</h2>${(s.records||[]).slice(-10).reverse().map(r=>`<div class="record">${fmtDate(r.in)} • ${fmtTime(r.in)} → ${r.out?fmtTime(r.out):"Working"} • <b>${dur(new Date(r.out||Date.now())-new Date(r.in))}</b></div>`).join("")||"<p>No shifts yet.</p>"}</div>
 <div class="actions"><button class="secondary" onclick="logout()">Sign Out</button></div>`);
 if(open)setInterval(()=>{const t=document.getElementById("timer");if(t)t.textContent="Time worked: "+dur(Date.now()-new Date(open.in))},1000);
}
function clockIn(){const s=state.sessions[state.currentUser];if((s.records||[]).some(r=>!r.out))return; s.records.push({id:id(),workerId:state.currentUser,in:new Date().toISOString(),out:null});save();workerHome()}
function clockOut(){const s=state.sessions[state.currentUser],r=[...s.records].reverse().find(x=>!x.out);if(!r)return; r.out=new Date().toISOString();save();workerHome()}
function logout(){state.currentUser=null;state.role=null;save();welcome()}
welcome();
