// Retry only temporary failures. Saved OCR, translation and audio are reused by the server.
type StepError = Error & {code?:string;status?:number;retryAfterSeconds?:number};
const transientCodes = new Set(['AI_TIMEOUT','AI_UNAVAILABLE','AI_RESPONSE','VOICE_TIMEOUT','VOICE_RESPONSE','BOOK_TIMEOUT','BOOK_NETWORK','BOOK_RESPONSE']);
function transient(error:StepError){
 if(error.name==='AbortError')return false;
 if(error.status && error.status>=400 && error.status<500 && error.status!==408)return false;
 if(error.code)return transientCodes.has(error.code);
 return [408,500,502,503,504].includes(error.status||0);
}
export async function bookStep<T>(work:()=>Promise<T>,progress:(text:string)=>void,cancelled:()=>boolean=()=>false):Promise<T>{
 const check=()=>{if(cancelled())throw new Error('Tayyorlash to‘xtatildi. Tayyor qismlar saqlandi.');};
 let temporaryRetries=0,quotaRetries=0;
 for(;;){
  check();try{const result=await work();check();return result}catch(e){
   check();const error=e as StepError;let seconds:number,reason:string;
   if(error.code==='AI_QUOTA'){
    const delay=error.retryAfterSeconds;
    if(!Number.isFinite(delay)||!delay||delay<1||delay>120||quotaRetries>=2)throw e;
    seconds=delay;quotaRetries++;reason='Gemini vaqtinchalik limiti';
   }else{
    if(!transient(error))throw e;
    if(temporaryRetries>=4)throw Object.assign(new Error('Vaqtinchalik aloqa xatosidan keyin 4 marta qayta urinildi, ammo javob kelmadi. Tayyor qismlar saqlangan. Keyinroq kitobni ochib davom ettiring.'),{code:error.code,status:error.status,cause:e});
    seconds=3*2**temporaryRetries++;reason=`Aloqa yoki javob vaqtincha uzildi. Avtomatik qayta urinish ${temporaryRetries}/4`;
   }
   const end=Date.now()+seconds*1000;
   while(Date.now()<end){check();progress(`${reason}: ${Math.ceil((end-Date.now())/1000)} soniya kutilyapti. Tayyor qismlar saqlangan.`);await new Promise(resolve=>setTimeout(resolve,Math.min(1000,end-Date.now())))}
  }
 }
}
