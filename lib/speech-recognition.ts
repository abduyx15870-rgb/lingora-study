let active:any=null;
export function stopSpeech(){active?.abort();active=null}
// Recognition is a transcript aid, not a pronunciation/accent assessment.
// Keep all phrases, then grade only once after a short silence or manual stop.
export function startSpeech(result:(text:string)=>void,error:(message:string)=>void,state?:(active:boolean)=>void){
 const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
 if(!R){error('Ovozni tanish uchun Chrome yoki Edge ishlating va mikrofonga ruxsat bering.');return null}
 stopSpeech();const r=new R();active=r;let text='',failed=false,delivered=false,silence:ReturnType<typeof setTimeout>|undefined;const confidence:number[]=[];
 const maximum=setTimeout(()=>r.stop(),30000);function clear(){clearTimeout(maximum);if(silence)clearTimeout(silence)}
 r.lang='en-GB';r.continuous=true;r.interimResults=true;
 r.onresult=(event:any)=>{const parts:string[]=[];confidence.length=0;for(let i=0;i<event.results.length;i++){const item=event.results[i][0];parts.push(item.transcript||'');if(item.confidence>0)confidence.push(item.confidence)}text=parts.join(' ').trim();if(silence)clearTimeout(silence);if(text)silence=setTimeout(()=>r.stop(),1600)};
 r.onerror=(event:any)=>{failed=true;clear();state?.(false);if(event.error==='aborted')return;error(event.error==='not-allowed'?'Brauzer sayt ruxsatlarida mikrofonga ruxsat bering.':'Ovoz tushunilmadi. Qayta ayting.');};
 r.onend=()=>{if(active===r)active=null;clear();state?.(false);if(failed||delivered)return;delivered=true;if(!text||confidence.length&&confidence.reduce((a,b)=>a+b,0)/confidence.length<.5){error('Ovoz aniq tushunilmadi. Javob xato hisoblanmadi; qayta ayting.');return}result(text)};
 try{r.start();state?.(true);return r}catch{clear();error('Mikrofonni yoqib bo‘lmadi. Ruxsatlarni tekshiring.');return null}
}
