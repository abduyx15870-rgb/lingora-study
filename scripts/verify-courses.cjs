const fs=require('fs'),ts=require('typescript'),vm=require('vm'),path=require('path'),crypto=require('crypto'),assert=require('assert');const root=process.cwd(),cache={},tables={},calls=[],readCalls=[];const day=new Date(Date.now()+5*3600000).toISOString().slice(0,10),settings={language:'en',style:'classic',layout:'cards',accent:'',audioRate:.7};
const roles=[['owner','o','platform'],['advertiser','a','platform'],['student','s','zamon'],['teacher','t','zamon'],['admin','h','zamon'],['administrator','m','zamon'],['student','other','other']];tables.school_users=roles.map(([role,id,center_id])=>({id,role,identity:id,login_name:id,first_name:id,last_name:'Test',center_id,group_id:role==='student'||role==='admin'?'g':null,book:'a1',unlocked_unit:1,start_unit:1,start_lesson:1,settings:{...settings},billing:{status:'paid',paidAt:day}}));tables.school_sessions=roles.map(([role,id])=>({id:crypto.createHash('sha256').update(id).digest('hex'),token:crypto.createHash('sha256').update(id).digest('hex'),user_id:id,expires_at:new Date(Date.now()+86400000).toISOString()}));tables.school_groups=[{id:'g',teacher_id:'t',center_id:'zamon',days:[2],time:'16:00',reminder_time:'09:00'}, {id:'other-group',teacher_id:'t-other',center_id:'other',days:[2],time:'16:00',reminder_time:'09:00'},{id:'g2',teacher_id:'t2',center_id:'zamon',days:[2],time:'16:00',reminder_time:'09:00'}];tables.school_centers=[{id:'other',name:'Other'}];tables.school_attempts=[{id:'attempt-s',user_id:'s',center_id:'zamon'}, {id:'attempt-other',user_id:'other',center_id:'other'}];
function matches(r,q){return [...new URLSearchParams(q)].every(([k,v])=>{if(['order','limit','on_conflict'].includes(k))return true;const [op,...a]=v.split('.'),value=a.join('.');return op==='eq'?String(r[k])===value:op==='gt'?String(r[k])>value:true})}
async function firebaseDb(table,method='GET',data,q=''){if(table==='rpc/school_login_guard')return true;const rows=tables[table]||(tables[table]=[]),found=rows.filter(r=>matches(r,q));if(method==='GET'){readCalls.push(table+'|'+q);return structuredClone(found);}calls.push({table,method,data:structuredClone(data)});if(method==='POST'){const id=data.id||crypto.createHash('sha256').update(data.identity||crypto.randomUUID()).digest('hex');if(rows.some(r=>r.id===id)){const e=new Error('Exists');e.status=409;throw e}const row={...data,id};if(table==='school_users'){row.settings??={...settings};row.billing??={status:'paid',paidAt:day};row.center_id??='zamon'}rows.push(row);return structuredClone([row])}if(method==='PATCH'){found.forEach(r=>Object.assign(r,data));return structuredClone(found)}if(method==='DELETE'){tables[table]=rows.filter(r=>!found.includes(r));return[]}throw Error('unsupported')}
const voiceInputs=[];const adapter={db:firebaseDb,createOwnerSession:async()=>true,moveSchoolUserCenter:async()=>true,activateTeacher:async()=>true,claimPendingTeacher:async()=>true,createAdministrator:async()=>true,resignTemporaryAdministrator:async()=>true};
function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const m={exports:{}};cache[file]=m;const req=id=>id==='@/app/api/voice/route'?{POST:async r=>{const body=await r.json();voiceInputs.push(body);return new Response(new Uint8Array(Buffer.alloc(144)),{headers:{'content-type':'audio/wav'}})}}:id==='server-only'?{}:id==='web-push'?{setVapidDetails(){},sendNotification(){}}:id.endsWith('firebase-store.mjs')?adapter:id.startsWith('@/')?load(root+'/'+id.slice(2)+(path.extname(id)?'':'.ts')):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+(path.extname(id)?'':'.ts')):require(id);if(file.endsWith('.json')){m.exports=JSON.parse(fs.readFileSync(file));return m.exports}vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{require:req,module:m,exports:m.exports,console,Buffer,process,Map,Set,Date,URLSearchParams,structuredClone,Error,setTimeout,clearTimeout,Response,Request,Headers,URL,AbortSignal,fetch},{filename:file});return m.exports}
function request(id,mode={},data){return new Request('http://localhost/api/test',{method:data?'POST':'GET',headers:{cookie:'school_session='+id,host:'localhost',...mode},...(data?{body:JSON.stringify(data)}:{})})}
(async()=>{
const server=load(root+'/lib/school-server.ts'),courses=load(root+'/app/api/courses/route.ts'),auth=load(root+'/app/api/auth/route.ts');
function get(id,center='zamon',subject='english',extra=''){return new Request('http://localhost/api/courses?center='+center+'&subject='+subject+extra,{headers:{cookie:'school_session='+id}})}
function post(id,data,center='zamon',subject='english',mode={}){return new Request('http://localhost/api/courses',{method:'POST',headers:{cookie:'school_session='+id,host:'localhost',...mode},body:JSON.stringify({...data,center,subject})})}
let r=await auth.GET(new Request('http://localhost/api/auth'));let d=await r.json();assert(d.subjects.every(s=>s.id==='english'));assert(!JSON.stringify(d).includes('code_hash'));
r=await courses.POST(post('t',{action:'subject',name:'Matematika',features:['books'],code:'1234'}));assert.equal(r.status,403);
r=await courses.POST(post('m',{action:'subject',name:'Matematika',features:['books','reading','tasks','notes'],code:'1234'}));assert.equal(r.status,200);const math=(await r.json()).id;tables.school_groups.find(g=>g.id==='g').subject_id=math;
r=await courses.GET(get('s','zamon',math));assert.equal(r.status,403);
r=await courses.POST(post('o',{action:'grant',userId:'s'},'zamon',math));assert.equal(r.status,200);
tables.school_users.find(u=>u.id==='s').enrollments.find(e=>e.subjectId===math).groupId='g';r=await courses.GET(get('s','zamon',math));assert.equal(r.status,200);d=await r.json();assert(!JSON.stringify(d).includes('code_hash'));assert.deepEqual(Array.from(d.subject.features),['books','reading','tasks','notes']);
r=await courses.GET(get('other','zamon',math));assert.equal(r.status,403);
r=await courses.GET(get('t','zamon',math));assert.equal(r.status,403);
r=await courses.POST(post('m',{action:'assignSubject',userId:'t'},'zamon',math));assert.equal(r.status,200);
r=await courses.POST(post('s',{action:'upload',title:'Sonlar',filename:'sonlar.txt',mime:'text/plain',parts:1,originalParts:1,language:'uz'},'zamon',math));assert.equal(r.status,200);const id=(await r.json()).id;
r=await courses.POST(post('s',{action:'chunk',id,index:0,original:true,data:Buffer.from('Sonlar va amallar').toString('base64')},'zamon',math));assert.equal(r.status,200);
r=await courses.POST(post('s',{action:'chunk',id,index:0,data:'Sonlar va amallar'},'zamon',math));assert.equal(r.status,200);
r=await courses.POST(post('s',{action:'completeUpload',id},'zamon',math));assert.equal(r.status,200);
r=await courses.GET(get('other','other','english','&action=material&id='+id));assert.equal(r.status,404);
r=await courses.POST(post('h',{action:'share',id,groups:['g'],reviewed:true},'zamon',math));assert.equal(r.status,403);
r=await courses.POST(post('t',{action:'share',id,groups:['g2'],reviewed:true},'zamon',math));assert.equal(r.status,403);
r=await courses.POST(post('t',{action:'share',id,groups:['g'],reviewed:true},'zamon',math));assert.equal(r.status,200);
r=await courses.POST(post('t',{action:'editDraft',id,units:[1,2].map(i=>({title:'Dars '+i,explanation:'Tushuntirish',tasks:[{prompt:'2 + 2?',answer:'4',options:['3','4','5']}]}))},'zamon',math));assert.equal(r.status,200);
r=await courses.POST(post('s',{action:'attempt',id,unit:0,answers:['4']},'zamon',math));assert.equal(r.status,403);
r=await courses.POST(post('t',{action:'share',id,groups:['g'],reviewed:true},'zamon',math));assert.equal(r.status,200);
r=await courses.POST(post('s',{action:'attempt',id,unit:1,answers:['4']},'zamon',math));assert.equal(r.status,403);
r=await courses.POST(post('s',{action:'attempt',id,unit:0,answers:['4'],struggled:[0],seconds:35},'zamon',math));assert.equal(r.status,200);
r=await courses.GET(get('t','zamon',math,'&action=report'));assert.equal(r.status,200);d=await r.json();assert(d.students.find(s=>s.id==='s').weak.includes('2 + 2?'));
r=await courses.POST(post('h',{action:'advance',id,userId:'s'},'zamon',math));assert.equal(r.status,200);
r=await courses.POST(post('s',{action:'attempt',id,unit:1,answers:['4']},'zamon',math));assert.equal(r.status,200);
r=await courses.POST(post('t',{action:'correctPart',id,index:0,text:'Tuzatilgan matn'},'zamon',math));assert.equal(r.status,200);assert.equal(tables.school_materials.find(m=>m.id===id).reviewed,false);
const lastAttempt=tables.school_course_attempts.find(a=>a.user_id==='s');r=await courses.POST(post('h',{action:'grade',id:lastAttempt.id,grade:87,comment:'Yaxshi'},'zamon',math));assert.equal(r.status,200);assert(tables.school_inbox.some(n=>n.user_id==='s'&&n.kind==='grade'));r=await courses.POST(post('other',{action:'grade',id:lastAttempt.id,grade:100},'other','english'));assert.equal(r.status,403);
const school=load(root+'/app/api/school/route.ts');r=await school.GET(new Request('http://localhost/api/school',{headers:{cookie:'school_session=s','X-Subject-Id':math,'X-Learning-Center':'zamon'}}));assert.equal(r.status,200);let home=await r.json();assert(home.groups.every(g=>g.id==='g'));
r=await school.GET(new Request('http://localhost/api/school',{headers:{cookie:'school_session=other','X-Subject-Id':math,'X-Learning-Center':'zamon'}}));assert.equal(r.status,403);
r=await courses.POST(post('t',{action:'share',id,groups:['g'],reviewed:true},'zamon',math));assert.equal(r.status,200);const before=tables.school_users.length;
r=await auth.POST(request('s',{}, {action:'register',centerId:'zamon',role:'student',firstName:'New',lastName:'Math',password:'password123',subjectId:math,subjectCode:'9999'}));assert.equal(r.status,403);assert.equal(tables.school_users.length,before);
r=await auth.POST(request('s',{}, {action:'register',centerId:'zamon',role:'student',firstName:'New',lastName:'Math',password:'password123',subjectId:math,subjectCode:'1234',courseStart:2}));assert.equal(r.status,200);d=await r.json();assert.equal(d.user.enrollments[0].subjectId,math);assert.equal(d.user.enrollments[0].startUnit,2);assert.equal(server.permitted(d.user,'a1',1),false);
process.env.TEACHER_ACCESS_CODE='teacher12345';process.env.OWNER_ACCESS_CODE='owner12345678';
r=await auth.POST(request('s',{}, {action:'verifyTeacherCode',role:'teacher',centerId:'zamon',subjectId:math,code:'teacher12345'}));assert.equal(r.status,200);const ticket=r.headers.get('set-cookie').split(';')[0];
r=await auth.POST(new Request('http://localhost/api/auth',{method:'POST',headers:{cookie:ticket,host:'localhost'},body:JSON.stringify({action:'registerTeacher',centerId:'zamon',firstName:'Subject',lastName:'Teacher',password:'password123',personalCode:'NewMathTeach'})}));assert.equal(r.status,200);d=await r.json();assert.equal(d.user.subjectIds[0],math);assert.equal(d.user.centerId,'zamon');
r=await auth.POST(request('s',{}, {action:'verifyTeacherCode',role:'teacher',centerId:'other',subjectId:'english',code:'NewMathTeach'}));assert.equal(r.status,200);d=await r.json();assert(d.loggedIn);assert.equal(d.user.subjectIds[0],math);assert.equal(d.user.centerId,'zamon');
const longText=Array.from({length:55},(_,i)=>'Matematikada '+i+' soni muhim.').join(' ');r=await courses.POST(post('s',{action:'correctPart',id,index:0,text:longText},'zamon',math));assert.equal(r.status,200);
r=await courses.POST(post('s',{action:'audio',id,index:0,subIndex:0,voice:'Kore'},'zamon',math));assert.equal(r.status,200);d=await r.json();assert(d.subparts>1);const count=voiceInputs.length;
r=await courses.POST(post('s',{action:'audio',id,index:0,subIndex:0,voice:'Kore'},'zamon',math));assert.equal(r.status,200);assert.equal(voiceInputs.length,count);
for(let sub=1;sub<d.subparts;sub++){r=await courses.POST(post('s',{action:'audio',id,index:0,subIndex:sub,voice:'Kore'},'zamon',math));assert.equal(r.status,200)}
assert.equal(voiceInputs.map(v=>v.text).join(' ').replace(/\s+/g,' ').trim(),longText.replace(/\s+/g,' ').trim());assert(voiceInputs.every(v=>v.text.length<=500));
// PDF catalogue is centre scoped; only managers may attach sources.
r=await courses.GET(get('s','zamon','english','&action=textbooks'));assert.equal(r.status,200);d=await r.json();assert(d.books.some(b=>b.id==='essential'&&b.url==='/books/essential-1.pdf'));
r=await courses.POST(post('s',{action:'textbook',book:'a1',url:'https://example.org/a1.pdf'}));assert.equal(r.status,403);
r=await courses.POST(post('m',{action:'textbook',book:'a1',url:'javascript:alert(1)'}));assert.equal(r.status,400);
r=await courses.POST(post('m',{action:'textbook',book:'a1',url:'https://example.org/a1.pdf'}));assert.equal(r.status,200);
r=await courses.GET(get('s','zamon','english','&action=textbooks'));d=await r.json();assert.equal(d.books.find(b=>b.id==='a1').url,'https://example.org/a1.pdf');
r=await courses.GET(get('other','other','english','&action=textbooks'));d=await r.json();assert.equal(d.books.find(b=>b.id==='a1').url,null);
r=await courses.POST(post('s',{action:'upload',title:'English story',filename:'story.txt',mime:'text/plain',parts:1,originalParts:1}));assert.equal(r.status,200);const englishId=(await r.json()).id;
r=await courses.GET(get('s','zamon','english','&action=translated&id='+englishId));assert.equal(r.status,409);
r=await courses.POST(post('s',{action:'chunk',id:englishId,index:0,data:'A story.'}));assert.equal(r.status,200);
r=await courses.POST(post('s',{action:'correctPart',id:englishId,index:0,text:'A café in London — an English story.'}));assert.equal(r.status,200);
r=await courses.GET(get('s','zamon','english','&action=translated&id='+englishId));assert.equal(r.status,200);assert((await r.text()).includes('café in London —'));assert(r.headers.get('content-disposition').includes('English.txt'));
r=await courses.GET(get('other','other','english','&action=translated&id='+englishId));assert.equal(r.status,404);
// Large uploads keep bounded requests; translation is explicitly controlled by the assigned teacher.
r=await courses.POST(post('s',{action:'upload',title:'Large book',filename:'large.pdf',mime:'application/pdf',parts:950,originalParts:777,byteSize:100*1024*1024}));assert.equal(r.status,200);
r=await courses.POST(post('s',{action:'upload',title:'Too large',filename:'large.pdf',mime:'application/pdf',parts:1,originalParts:777,byteSize:100*1024*1024+1}));assert.equal(r.status,400);
tables.school_groups.push({id:'english-g',center_id:'zamon',teacher_id:'t',subject_id:'english'});
const student=tables.school_users.find(x=>x.id==='s');student.group_id='english-g';student.enrollments.find(x=>x.subjectId==='english').groupId='english-g';
r=await courses.POST(post('s',{action:'bookTranslation',groupId:'english-g',enabled:true}));assert.equal(r.status,403);
r=await courses.POST(post('m',{action:'bookTranslation',groupId:'english-g',enabled:true}));assert.equal(r.status,403);
r=await courses.POST(post('t',{action:'bookTranslation',groupId:'g2',enabled:true}));assert.equal(r.status,403);
r=await courses.POST(post('t',{action:'bookTranslation',groupId:'english-g',enabled:true}));assert.equal(r.status,200);
const row=tables.school_material_parts.find(x=>x.material_id===englishId);row.text_uz='Londondagi qahvaxona';
r=await courses.GET(get('s','zamon','english','&action=material&id='+englishId));d=await r.json();assert.equal(d.translationEnabled,true);assert.equal(d.parts[0].text_uz,'Londondagi qahvaxona');
r=await courses.GET(get('s','zamon','english','&action=translated&id='+englishId+'&language=uz'));assert.equal(r.status,200);assert((await r.text()).includes('Londondagi'));
r=await courses.POST(post('t',{action:'bookTranslation',groupId:'english-g',enabled:false}));assert.equal(r.status,200);
r=await courses.GET(get('s','zamon','english','&action=material&id='+englishId));d=await r.json();assert.equal(d.translationEnabled,false);assert.equal(d.parts[0].text_uz,undefined);
r=await courses.POST(post('s',{action:'translatePart',id:englishId,index:0,target:'uz'}));assert.equal(r.status,403);
r=await courses.GET(get('s','zamon','english','&action=translated&id='+englishId+'&language=uz'));assert.equal(r.status,403);
r=await courses.GET(get('s','zamon','english','&action=translated&id='+englishId));assert.equal(r.status,200);
r=await courses.GET(get('s','zamon',math,'&action=original&id='+id+'&part=0'));assert.equal(r.status,200);assert.equal(await r.text(),'Sonlar va amallar');
r=await courses.GET(get('s','zamon',math,'&action=original&id='+id+'&part=99'));assert.equal(r.status,400);
r=await courses.GET(get('other','other','english','&action=original&id='+id+'&part=0'));assert.equal(r.status,404);
console.log('PASS: 100 MB boundary; only assigned teacher toggles bilingual books; disabled Uzbek text/download/generation blocked while English stays available.');
console.log('PASS: PDF catalogue permissions/centre isolation; translated download rejects incomplete books and preserves Unicode.');
console.log('PASS: book audio splits long text without truncation, reuses stored audio, keeps response chunks small');
console.log('PASS: English-only start; scoped 4-character codes; student/staff subject access; private uploads; teacher-only assigned-group sharing; drafts hidden until review; next-unit approval; weak-question report; subject registration and English guard');
})().catch(e=>{console.error(e);process.exit(1)});
