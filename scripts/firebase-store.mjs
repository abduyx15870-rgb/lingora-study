import {tashkentDate} from './billing.mjs';
import {createHash,createSign,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
let cachedToken,expires=0,tokenPending;
export async function credentials(){
 let c;
 if(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)c=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
 else if(process.env.FIREBASE_SERVICE_ACCOUNT_FILE)c=JSON.parse(await readFile(process.env.FIREBASE_SERVICE_ACCOUNT_FILE,'utf8'));
 else throw new Error('Firebase server credentials are missing.');
 if(!c.client_email||!c.private_key||!c.project_id)throw new Error('Invalid Firebase service account.');
 if(c.project_id!==(process.env.FIREBASE_PROJECT_ID||'zamon-c4a03'))throw new Error('Firebase project mismatch.');
 return c;
}
export async function accessToken(){
 if(cachedToken&&Date.now()<expires)return cachedToken;
 if(tokenPending)return tokenPending;
 tokenPending=createAccessToken().finally(()=>{tokenPending=undefined});return tokenPending;
}
async function createAccessToken(){
 const c=await credentials(),now=Math.floor(Date.now()/1000),encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const unsigned=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:c.client_email,scope:'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.read_write',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const jwt=unsigned+'.'+createSign('RSA-SHA256').update(unsigned).sign(c.private_key,'base64url');
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(10000),body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
 if(!r.ok)throw new Error('Firebase server authentication failed.');const d=await r.json();cachedToken=d.access_token;expires=Date.now()+(d.expires_in-60)*1000;return cachedToken;
}
const project=()=>process.env.FIREBASE_PROJECT_ID||'zamon-c4a03';
const base=()=>`https://firestore.googleapis.com/v1/projects/${project()}/databases/(default)/documents`;
const sha=x=>createHash('sha256').update(x).digest('hex');
export function pack(v){if(v===null)return {nullValue:null};if(typeof v==='string')return {stringValue:v};if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(Array.isArray(v))return {arrayValue:{values:v.map(pack)}};return {mapValue:{fields:Object.fromEntries(Object.entries(v).filter(([,v])=>v!==undefined).map(([k,v])=>[k,pack(v)]))}}}
export function unpack(v){if('nullValue'in v)return null;if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return v.doubleValue;if('arrayValue'in v)return (v.arrayValue.values||[]).map(unpack);return Object.fromEntries(Object.entries(v.mapValue?.fields||{}).map(([k,v])=>[k,unpack(v)]))}
const fields=o=>pack(o).mapValue.fields;
const row=d=>({id:d.name.split('/').pop(),...Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,unpack(v)]))});
async function request(path,method='GET',body){const r=await fetch(path.startsWith('https:')?path:base()+path,{method,headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok){const e=new Error('Firebase database request failed (HTTP '+r.status+').');e.status=r.status;throw e}return r.status===204?{}:r.json()}
function key(table,d){switch(table){case 'school_users':return sha(d.identity);case 'school_sessions':return d.token;case 'school_reads':return sha(d.user_id+'|'+d.assignment_id);case 'school_progress':return sha([d.user_id,d.book,d.unit,d.lesson].join('|'));case 'school_notifications':return sha(d.user_id+'|'+d.day);case 'school_push':return sha(d.endpoint);default:return d.id||randomUUID()}}
async function documents(table,query=''){
 const params=new URLSearchParams(query),filters=[...params.entries()].filter(([k])=>!['order','limit','on_conflict'].includes(k));
 const single=filters.find(([,v])=>v.startsWith('eq.'));
 let docs;
 if(single){const [field,value]=single;let val=value.slice(3);if(['unit','unlocked_unit','start_unit','start_lesson'].includes(field))val=Number(val);
 if(field==='id'){try{docs=[await request('/'+table+'/'+encodeURIComponent(val))]}catch(e){if(e.status!==404)throw e;docs=[]}}else{ const result=await request(':runQuery','POST',{structuredQuery:{from:[{collectionId:table}],where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:pack(val)}}}});docs=result.filter(x=>x.document).map(x=>x.document);}

 }else{docs=[];let next='';do{const result=await request('/'+table+'?pageSize=1000'+(next?'&pageToken='+encodeURIComponent(next):''));docs.push(...result.documents||[]);next=result.nextPageToken||''}while(next)}
 let found=docs.map(d=>({name:d.name,data:row(d),updateTime:d.updateTime})).filter(({data})=>filters.every(([k,v])=>{const i=v.indexOf('.'),op=v.slice(0,i),value=v.slice(i+1);return op==='eq'?String(data[k])===value:op==='gt'?data[k]>value:op==='lt'?data[k]<value:false}));
 const order=params.get('order');if(order){const [f,dir]=order.split('.');found.sort((a,b)=>a.data[f]===b.data[f]?0:(a.data[f]>b.data[f]?1:-1)*(dir==='desc'?-1:1))}
 const limit=Number(params.get('limit'));if(limit>0)found=found.slice(0,limit);return found;
}
async function loginGuard(who){
 const name=base()+'/school_login_limits/'+sha(who);
 for(let retry=0;retry<6;retry++){
 let old;try{old=await request(name)}catch(e){if(e.status!==404)throw e}
 const data=old?row(old):null,reset=!data||Date.now()-Date.parse(data.window_at)>900000;
 const attempts=reset?1:data.attempts+1;if(attempts>15)return false;
 const doc={identity:who,attempts,window_at:reset?new Date().toISOString():data.window_at};
 const condition=old?'currentDocument.updateTime='+encodeURIComponent(old.updateTime):'currentDocument.exists=false';
 try{await request(name+'?'+condition,'PATCH',{fields:fields(doc)});return true}catch(e){if(![409,412].includes(e.status))throw e}
 }throw new Error('Please retry sign in.');
}
export async function db(table,method='GET',data,query=''){
 if(table==='rpc/school_login_guard')return loginGuard(data.who);
 if(table==='rpc/school_student_stats'){const attempts=await db('school_attempts'),stats=new Map();for(const a of attempts){let s=stats.get(a.user_id);if(!s){s={user_id:a.user_id,lessons:new Set(),seconds:0};stats.set(a.user_id,s)}s.seconds+=a.seconds||0;if(a.completed)s.lessons.add([a.book,a.unit,a.lesson].join('|'))}return [...stats.values()].map(s=>({...s,lessons:s.lessons.size}))}
 if(!/^school_[a-z_]+$/.test(table))throw new Error('Invalid collection.');
 if(method==='GET')return (await documents(table,query)).map(x=>x.data);
 if(method==='POST'){
 const d={...data},id=key(table,d);if(!['school_sessions','school_reads','school_progress','school_notifications'].includes(table))d.id=id;
 if(['school_users','school_attempts','school_assignments'].includes(table))d.created_at ||= new Date().toISOString();
 if(table==='school_users'){d.billing??={status:'paid',paidAt:tashkentDate()};d.disabled??=false;d.group_id??=null;d.start_unit??=1;d.start_lesson??=1;d.settings??={language:'en',style:'classic',layout:'cards',accent:'',audioRate:0.65}}
 if(table==='school_attempts'){d.grade??=null;d.comment??=''}
 const merge=['school_reads','school_progress'].includes(table);
 await request('/'+table+'/'+id+(merge?'':'?currentDocument.exists=false'),'PATCH',{fields:fields(d)});return [d];
 }
 const rows=await documents(table,query);for(const item of rows){if(method==='DELETE')await request('https://firestore.googleapis.com/v1/'+item.name,'DELETE');else if(method==='PATCH')await request('https://firestore.googleapis.com/v1/'+item.name+'?'+Object.keys(data).map(k=>'updateMask.fieldPaths='+encodeURIComponent(k)).join('&'),'PATCH',{fields:fields(data)});else throw new Error('Invalid database operation.')}
 return rows.map(x=>({...x.data,...data}));
}
export async function signedAudio(path,download=false){
 const c=await credentials(),bucket=process.env.FIREBASE_STORAGE_BUCKET||'zamon-c4a03.firebasestorage.app';
 const r=await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent('audio/'+path)}`,{headers:{Authorization:'Bearer '+await accessToken()},cache:'no-store'});if(!r.ok)throw new Error('Audio is not uploaded yet.');
 const enc=v=>encodeURIComponent(v).replace(/[!'()*]/g,ch=>'%'+ch.charCodeAt(0).toString(16).toUpperCase());
 const date=new Date().toISOString().replace(/[-:]|\.\d{3}/g,''),scope=date.slice(0,8)+'/auto/storage/goog4_request';
 const uri='/'+bucket+'/audio/'+path.split('/').map(enc).join('/');
 const params={'X-Goog-Algorithm':'GOOG4-RSA-SHA256','X-Goog-Credential':c.client_email+'/'+scope,'X-Goog-Date':date,'X-Goog-Expires':'3600','X-Goog-SignedHeaders':'host'};
 if(download)params['response-content-disposition']='attachment; filename="Zamon-'+path.split('/').join('-')+'"';
 const query=Object.keys(params).sort().map(k=>enc(k)+'='+enc(params[k])).join('&');
 const canonical=['GET',uri,query,'host:storage.googleapis.com\n','host','UNSIGNED-PAYLOAD'].join('\n');
 const toSign=['GOOG4-RSA-SHA256',date,scope,sha(canonical)].join('\n');
 const signature=createSign('RSA-SHA256').update(toSign).sign(c.private_key,'hex');return 'https://storage.googleapis.com'+uri+'?'+query+'&X-Goog-Signature='+signature;
}

// Activate a pending teacher once. The updateTime precondition prevents two
// concurrent claims (or an outdated invite) from overwriting a password.
export async function activateTeacher(identity,invite,passwordHash){
 const name=base()+'/school_users/'+sha(identity);
 let doc;try{doc=await request(name)}catch(e){if(e.status===404)return null;throw e}
 const user=row(doc);
 if(user.role!=='teacher'||user.password_hash||!user.invite_hash||Date.parse(user.invite_expires_at)<Date.now()||sha(invite)!==user.invite_hash)return null;
 const activated={...user,password_hash:passwordHash,invite_hash:null,invite_expires_at:null};
 try{await request(':commit','POST',{writes:[{update:{name:doc.name,fields:fields(activated)},currentDocument:{updateTime:doc.updateTime}}]})}catch(e){if([409,412].includes(e.status))return null;throw e}
 return activated;
}

// Claim only an unactivated teacher; concurrent claims cannot replace a password.
export async function claimPendingTeacher(identity,passwordHash){
 const name=base()+'/school_users/'+sha(identity);
 let doc;try{doc=await request(name)}catch(e){if(e.status===404)return null;throw e}
 const user=row(doc);if(user.role!=='teacher'||user.password_hash)return null;
 const activated={...user,password_hash:passwordHash,invite_hash:null,invite_expires_at:null};
 try{await request(':commit','POST',{writes:[{update:{name:doc.name,fields:fields(activated)},currentDocument:{updateTime:doc.updateTime}}]})}catch(e){if([409,412].includes(e.status))return null;throw e}
 return activated;
}

// One Administrator account. Claim and account creation/promotion are atomic.
/** @param {any} data @param {string|null} expectedHash */
export async function createAdministrator(data,expectedHash=null){
 const id=sha(data.identity),name=base()+'/school_users/'+id;let doc;
 try{doc=await request(name)}catch(e){if(e.status!==404)throw e}
 if(doc){const old=row(doc);if(old.role!=='admin'||!expectedHash||old.password_hash!==expectedHash)return null}
 const user=doc?{...row(doc),role:'administrator'}:{...data,id,role:'administrator',created_at:new Date().toISOString(),group_id:null,start_unit:1,start_lesson:1,billing:{status:'paid',paidAt:tashkentDate()},disabled:false,settings:{language:'en',style:'classic',layout:'cards',accent:'',audioRate:.65}};
 try{await request(':commit','POST',{writes:[{update:{name:name.replace('https://firestore.googleapis.com/v1/',''),fields:fields(user)},currentDocument:doc?{updateTime:doc.updateTime}:{exists:false}},{update:{name:base().replace('https://firestore.googleapis.com/v1/','')+'/school_administrator_lock/'+(data.center_id&&data.center_id!=='zamon'?sha(data.center_id):'primary'),fields:fields({user_id:id})},currentDocument:{exists:false}}]})}catch(e){if([409,412].includes(e.status))return null;throw e}
 return user;
}

// Local service-account bootstrap: temporarily promote an existing account.
export async function temporaryAdministrator(identity){
 const name=base()+'/school_users/'+sha(identity),lockName=base()+'/school_administrator_lock/primary';
 let doc;try{doc=await request(name)}catch(e){if(e.status===404)throw new Error('Account not found. Enter the existing first and last name.');throw e}
 const user=row(doc);if(user.role==='administrator'&&user.temporary_administrator)return user;
 if(!['student','admin'].includes(user.role))throw new Error('Choose an existing student or temporary Admin account.');
 let lock;try{lock=await request(lockName)}catch(e){if(e.status!==404)throw e}
 if(lock)throw new Error('An Administrator already exists. Its account has not been changed.');
 const updated={...user,role:'administrator',temporary_administrator:true};
 try{await request(':commit','POST',{writes:[{update:{name:doc.name,fields:fields(updated)},currentDocument:{updateTime:doc.updateTime}},{update:{name:lockName.replace('https://firestore.googleapis.com/v1/',''),fields:fields({user_id:user.id,temporary:true})},currentDocument:{exists:false}}]})}catch(e){if([409,412].includes(e.status))throw new Error('The account changed or an Administrator was created. Try again.');throw e}
 return updated;
}
export async function resignTemporaryAdministrator(userId,centerId='zamon'){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(userId))return false;
 let doc,lock;try{doc=await request(base()+'/school_users/'+userId);lock=await request(base()+'/school_administrator_lock/'+(centerId==='zamon'?'primary':sha(centerId)))}catch(e){if(e.status===404)return false;throw e}
 const user=row(doc),owner=row(lock);if(user.role!=='administrator'||!user.temporary_administrator||owner.user_id!==userId||!owner.temporary)return false;
 const updated={...user,role:'student',temporary_administrator:false};
 try{await request(':commit','POST',{writes:[{update:{name:doc.name,fields:fields(updated)},currentDocument:{updateTime:doc.updateTime}},{delete:lock.name,currentDocument:{updateTime:lock.updateTime}}]})}catch(e){if([409,412].includes(e.status))return false;throw e}
 return true;
}

// Owner-only caller: move an account and its private records as one atomic commit.
export async function moveSchoolUserCenter(userId,centerId){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(userId)||!/^[-a-zA-Z0-9]{1,100}$/.test(centerId))throw new Error('Invalid account or centre.');
 const doc=await request('/school_users/'+userId),user=row(doc),oldCenter=user.center_id||'zamon';if(user.role==='owner')throw new Error('Owner cannot be moved.');if(oldCenter===centerId)return true;
 const writes=[],update=(d,v)=>writes.push({update:{name:d.name,fields:fields(v)},currentDocument:{updateTime:d.updateTime}});
 const loginName=(user.first_name+' '+user.last_name).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').replace(/[‘’ʻʼ]/g,"'");
 update(doc,{...user,center_id:centerId,group_id:null,login_name:loginName,...(Array.isArray(user.enrollments)?{enrollments:[{centerId,subjectId:'english',startUnit:1},...user.enrollments.filter(e=>e.centerId!==centerId).map(e=>({...e,groupId:null}))]}:{}),...(Array.isArray(user.subject_ids)?{subject_ids:['english']}: {})});
 for(const table of ['school_attempts','school_progress','school_reads','school_notes','school_questions','school_bookmarks','school_inbox','school_push','school_learning_sessions','school_word_sessions'])for(const item of await documents(table,'user_id=eq.'+encodeURIComponent(userId)))writes.push({update:{name:item.name,fields:fields({...item.data,center_id:centerId,...(table==='school_questions'?{group_id:null}:{})})},currentDocument:{updateTime:item.updateTime}});
 for(const item of await documents('school_groups','teacher_id=eq.'+encodeURIComponent(userId)))writes.push({update:{name:item.name,fields:fields({...item.data,teacher_id:null})},currentDocument:{updateTime:item.updateTime}});
 for(const item of await documents('school_sessions','user_id=eq.'+encodeURIComponent(userId)))writes.push({delete:item.name,currentDocument:{exists:true}});
 if(user.role==='administrator'){
  const lockId=id=>id==='zamon'?'primary':sha(id),nextName=base()+'/school_administrator_lock/'+lockId(centerId);let next;
  try{next=await request(nextName)}catch(e){if(e.status!==404)throw e}if(next&&row(next).user_id!==userId)throw new Error('This centre already has a Centre Manager.');
  if(!next)writes.push({update:{name:nextName.replace('https://firestore.googleapis.com/v1/',''),fields:fields({user_id:userId,center_id:centerId,...(user.temporary_administrator?{temporary:true}:{})})},currentDocument:{exists:false}});
  let previous;try{previous=await request('/school_administrator_lock/'+lockId(oldCenter))}catch(e){if(e.status!==404)throw e}if(previous&&row(previous).user_id===userId)writes.push({delete:previous.name,currentDocument:{updateTime:previous.updateTime}});
 }
 if(writes.length>450)throw new Error('This account has too many records for one atomic move. No data was changed.');
 await request(':commit','POST',{writes});return true;
}

// Serialize Owner sign-ins across servers, keeping at most three active browser devices.
export async function createOwnerSession(session,deviceId,currentToken=''){
 if(!/^[a-f0-9]{64}$/.test(session.token)||!/^[-a-zA-Z0-9_]{1,128}$/.test(session.user_id)||! /^[a-f0-9]{64}$/.test(deviceId))throw new Error('Invalid Owner session.');
 const lockPath='/school_owner_devices/'+session.user_id;
 for(let retry=0;retry<6;retry++){
  let lock;try{lock=await request(lockPath)}catch(e){if(e.status!==404)throw e}
  const active=await documents('school_sessions','user_id=eq.'+encodeURIComponent(session.user_id)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString()));
  const newest=new Map();
  for(const doc of [...active].sort((a,b)=>String(b.data.created_at||b.data.expires_at).localeCompare(String(a.data.created_at||a.data.expires_at)))){
   if(doc.data.device_id===deviceId||doc.data.token===currentToken)continue;
   const device=doc.data.device_id||'legacy-'+doc.data.token;if(!newest.has(device))newest.set(device,doc);
  }
  if(newest.size>=3)throw Object.assign(new Error('Owner device limit reached.'),{code:'OWNER_DEVICE_LIMIT'});
  const keep=new Set([...newest.values()].map(doc=>doc.name));
  const name=base().replace('https://firestore.googleapis.com/v1/','');
  const writes=[{update:{name:name+lockPath,fields:fields({user_id:session.user_id,updated_at:new Date().toISOString()})},currentDocument:lock?{updateTime:lock.updateTime}:{exists:false}},
   {update:{name:name+'/school_sessions/'+session.token,fields:fields({...session,device_id:deviceId,created_at:new Date().toISOString()})},currentDocument:{exists:false}},
   ...active.filter(doc=>!keep.has(doc.name)).map(doc=>({delete:doc.name}))];
  if(writes.length>450)throw new Error('Too many old Owner sessions.');
  try{await request(':commit','POST',{writes});return true}catch(e){if(![409,412].includes(e.status))throw e}
 }
 throw new Error('Owner sign-in is busy. Please retry.');
}

// Compare-and-swap enforces one full exam per 14 days across devices.
export async function claimExamWindow(data){
 const name=base()+'/school_exam_windows/'+sha(data.user_id+'|'+data.exam);
 for(let retry=0;retry<8;retry++){
  let old;try{old=await request(name)}catch(e){if(e.status!==404)throw e}
  const previous=old?row(old):null,now=Date.now();
  if(previous?.session_id===data.session_id){if(previous.suite_id!==data.suite_id||previous.center_id!==data.center_id)return {conflict:true};return previous;}
  if(previous&&Date.parse(previous.next_at)>now)return {blocked:true,next_at:previous.next_at};
  const next={...data,started_at:new Date(now).toISOString(),next_at:new Date(now+14*86400000).toISOString()};
  const condition=old?'currentDocument.updateTime='+encodeURIComponent(old.updateTime):'currentDocument.exists=false';
  try{await request(name+'?'+condition,'PATCH',{fields:fields(next)});return next}catch(e){if(![409,412].includes(e.status))throw e}
 }throw new Error('Exam start is busy. Please retry.');
}
