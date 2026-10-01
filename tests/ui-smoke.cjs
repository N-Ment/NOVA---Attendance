const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('public/js/app.js','utf8');
async function run(role,token,scanResult={action:'clockIn',name:'พนักงาน',nickname:'นัท',time:'08:59'}){
 const listeners={},spoken=[],root={innerHTML:'',classList:{toggle(){}},addEventListener:(name,fn)=>listeners[name]=fn,querySelector:selector=>['#kioskVideo','#enrollVideo','#scanVideo'].includes(selector)?{}:selector==='#enrollEmployee'?{value:'NV001'}:null};
 const api={url:()=>'',token:()=>token,setUrl:()=>{},setToken:()=>{},clearToken:()=>{},call:async action=>{
   if(action==='publicIdentify'||action==='identifyFace')return {pendingToken:'pending',name:scanResult.name,nickname:scanResult.nickname||'นัท'};
   if(action==='publicConfirm'||action==='confirmFace')return scanResult;
   if(action==='publicCancel'||action==='cancelFace')return {cancelled:true};
   if(action==='enrollFace')return {userId:'NV001',stored:true};
   if(action!=='bootstrap')throw Error('unexpected');
   return {user:{id:'NV001',name:'พนักงาน',nickname:'นัท',role,face:{status:'ใช้งาน'}},users:role==='employee'?[]:[{id:'NV001',name:'พนักงาน',nickname:'นัท',role:'employee',status:'ใช้งาน',face:{status:'ใช้งาน'}}],attendance:[],leaves:[],leaveTypes:[{id:'ANNUAL',name:'ลาพักร้อน',days:6,status:'ใช้งาน'}],shifts:[{id:'NORMAL',name:'กะปกติ',status:'ใช้งาน'}],calendar:{users:[{id:'NV001',name:'พนักงาน',nickname:'นัท'}],attendance:[],leaves:[],daysOff:[]},settings:{'OT 1.0x':1,'OT 1.5x':1.5,'OT 2.0x':2,'OT 3.0x':3}};
 }};
 const ctx=vm.createContext({document:{getElementById:()=>root},NovaApi:api,NovaFace:{stop(){},preload:async()=>{},start:async()=>Array(128).fill(0.1)},Intl,Date,Object,String,Number,Array,RegExp,setTimeout:()=>{},confirm:()=>false,prompt:()=>{throw Error('should not prompt')},window:{scrollTo(){},addEventListener(){},SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},speechSynthesis:{getVoices:()=>[],cancel(){},resume(){},speak:u=>spoken.push(u.text)}},sessionStorage:{},localStorage:{}});
 vm.runInContext(code,ctx);await new Promise(r=>setImmediate(r));
 return {html:root.innerHTML,listeners,root,spoken};
}
const click=async(view,kind,value)=>view.listeners.click({target:{closest:selector=>selector===kind?value:null}});
(async()=>{
 const guest=await run('employee','');assert(guest.html.includes('สแกนหน้าเพื่อบันทึกเวลา'));assert(guest.html.includes('เข้าสู่ระบบ'));
 await click(guest,'[data-action]',{dataset:{action:'kiosk-scan'}});await new Promise(r=>setImmediate(r));assert(guest.root.innerHTML.includes('ใช่ ฉันเอง'));assert(!guest.spoken.length);await click(guest,'[data-action]',{dataset:{action:'kiosk-confirm'}});await new Promise(r=>setImmediate(r));assert(guest.root.innerHTML.includes('บันทึกเวลาสำเร็จ'));assert(guest.root.innerHTML.includes('scan-ok'));assert(guest.spoken.includes('คุณนัท ยินดีต้อนรับ'));
 const late=await run('employee','',{action:'clockIn',name:'สาย ทดสอบ',time:'09:01'});await click(late,'[data-action]',{dataset:{action:'kiosk-scan'}});await new Promise(r=>setImmediate(r));await click(late,'[data-action]',{dataset:{action:'kiosk-confirm'}});await new Promise(r=>setImmediate(r));assert(late.spoken.includes('คุณนัท เข้างานสายนะครับ'));
 const leaving=await run('employee','',{action:'clockOut',name:'กลับ บ้าน',time:'17:00'});await click(leaving,'[data-action]',{dataset:{action:'kiosk-scan'}});await new Promise(r=>setImmediate(r));await click(leaving,'[data-action]',{dataset:{action:'kiosk-confirm'}});await new Promise(r=>setImmediate(r));assert(leaving.spoken.includes('คุณนัท ออกงาน บ๊ายบาย'));
 const employee=await run('employee','token');assert(employee.html.includes('สแกนหน้าเพื่อบันทึกเวลา'));
 await click(employee,'[data-action]',{dataset:{action:'open-login'}});assert(employee.root.innerHTML.includes('ยื่นคำขอลา'));
 await click(employee,'[data-tab]',{dataset:{tab:'scan'}});assert(employee.root.innerHTML.includes('scanVideo'));
 await click(employee,'[data-action]',{dataset:{action:'scan-start'}});await new Promise(r=>setImmediate(r));assert(employee.root.innerHTML.includes('ใช่ ฉันเอง'));await click(employee,'[data-action]',{dataset:{action:'scan-confirm'}});await new Promise(r=>setImmediate(r));assert(employee.root.innerHTML.includes('scan-ok'));assert(employee.spoken.some(x=>x.includes('คุณนัท ยินดีต้อนรับ')));
 await click(employee,'[data-tab]',{dataset:{tab:'calendar'}});assert(employee.root.innerHTML.includes('ปฏิทินทุกคน'));
 const owner=await run('owner','token');await click(owner,'[data-action]',{dataset:{action:'open-login'}});assert(owner.root.innerHTML.includes('อนุมัติเวลา'));assert(owner.root.innerHTML.includes('ข้อมูลพนักงานทั้งหมด'));assert(!owner.root.innerHTML.includes('LEAVE REQUEST'));
 await click(owner,'[data-tab]',{dataset:{tab:'settings'}});assert(owner.root.innerHTML.includes('ลงทะเบียนใบหน้าพนักงาน'));assert(owner.root.innerHTML.includes('enrollVideo'));assert(owner.root.innerHTML.includes('ประเภทการลา'));assert(!owner.root.innerHTML.includes('enrollConsent'));
 await click(owner,'[data-action]',{dataset:{action:'enroll-start'}});await new Promise(r=>setImmediate(r));assert(owner.root.innerHTML.includes('เก็บข้อมูลใบหน้าลง FaceTemplates สำเร็จ'));assert(owner.root.innerHTML.includes('scan-ok'));
 await click(owner,'[data-action]',{dataset:{action:'revoke-face'}});
 await click(owner,'[data-action]',{dataset:{action:'open-employee',id:'NV001'}});assert(owner.root.innerHTML.includes('บันทึกข้อมูลพนักงาน'));
 const manager=await run('manager','token');await click(manager,'[data-action]',{dataset:{action:'open-login'}});assert(manager.root.innerHTML.includes('ยื่นคำขอลา'));await click(manager,'[data-tab]',{dataset:{tab:'settings'}});await click(manager,'[data-action]',{dataset:{action:'open-employee',id:'NV001'}});assert(manager.root.innerHTML.includes('บันทึกข้อมูลพนักงาน'));
 console.log('PASS kiosk first page, login menu, employee scan and calendar, admin enrollment');
})().catch(e=>{console.error(e);process.exit(1)});
