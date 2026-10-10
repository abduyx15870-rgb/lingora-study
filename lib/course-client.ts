import {modeHeaders} from './client-mode';
export async function courseFetch(center:string,subject:string,data?:any,query='',signal?:AbortSignal){
 const headers=modeHeaders();if(typeof window!=='undefined'&&sessionStorage.getItem('base-role')==='advertiser'&&!headers['X-Demo-Role']){const key=sessionStorage.getItem('demo-key')||crypto.randomUUID();sessionStorage.setItem('demo-key',key);headers['X-Demo-Key']=key;headers['X-Demo-Role']='advertiser'}
 const timeout=AbortSignal.timeout(data?.action==='chat'?35000:50000);
 const requestError=(e:unknown)=>{
  if(signal?.aborted)throw e;
  throw Object.assign(new Error(timeout.aborted?'Server javobini kutish vaqti tugadi.':'Server bilan aloqa uzildi.'),{code:timeout.aborted?'BOOK_TIMEOUT':'BOOK_NETWORK',cause:e});
 };
 let r:Response;
 try{r=await fetch('/api/courses?center='+encodeURIComponent(center)+'&subject='+encodeURIComponent(subject)+query,{method:data?'POST':'GET',headers:{...headers,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify({...data,center,subject}):undefined,cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout});}catch(e){return requestError(e)}
 let raw:string;try{raw=await r.text()}catch(e){return requestError(e)}
 let value:any;try{value=JSON.parse(raw);if(!value||typeof value!=='object')throw new Error('Invalid response')}catch{
  throw Object.assign(new Error('Serverdan to‘liq javob kelmadi.'),{code:'BOOK_RESPONSE',status:r.status});
 }
 if(!r.ok)throw Object.assign(new Error(value.error||'So‘rov bajarilmadi.'),{status:r.status,code:value.code,retryAfterSeconds:value.retryAfterSeconds});
 return value;
}
