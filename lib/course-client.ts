import {modeHeaders} from './client-mode';
export async function courseFetch(center:string,subject:string,data?:any,query='',signal?:AbortSignal){
 const headers=modeHeaders();if(typeof window!=='undefined'&&sessionStorage.getItem('base-role')==='advertiser'&&!headers['X-Demo-Role']){const key=sessionStorage.getItem('demo-key')||crypto.randomUUID();sessionStorage.setItem('demo-key',key);headers['X-Demo-Key']=key;headers['X-Demo-Role']='advertiser'}
 const r=await fetch('/api/courses?center='+encodeURIComponent(center)+'&subject='+encodeURIComponent(subject)+query,{method:data?'POST':'GET',headers:{...headers,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify({...data,center,subject}):undefined,cache:'no-store',signal});const raw=await r.text();let value;try{value=JSON.parse(raw)}catch{throw new Error('Serverdan to‘liq javob kelmadi. Qayta urinib ko‘ring.')}if(!r.ok)throw new Error(value.error||'So‘rov bajarilmadi.');return value;
}
