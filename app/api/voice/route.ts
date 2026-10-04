import {userVoices} from '@/lib/voice-server';
import {schoolScope} from '@/lib/center-context';
import {current,mutation,fail,AppError,textValue} from '@/lib/school-server';
import {key,unavailable} from '@/lib/ai';
import {pcmWav} from '@/lib/speech';
import {createHash} from 'node:crypto';
export const runtime='nodejs';
const cache=new Map<string,{bytes:Buffer;mime:string}>();
export async function POST(req:Request){return schoolScope(async()=>{try{
 mutation(req);const u=await current(req),d=await req.json(),text=textValue(d.text,1200),language=d.language==='uz'?'Uzbek':'English',secret=key();if(!secret)throw new AppError(unavailable,503);
 const selected=d.voice||u.settings.voice||'Kore';if(!userVoices(u).some(v=>v.id===selected))throw new AppError('Voice not available.',403);
 const voice=selected==='personal'?process.env.ODINA_VOICE_ID!:selected,model=selected==='personal'?'gemini-3.8-flash-tts':process.env.GEMINI_TTS_MODEL?.trim()||'gemini-2.5-flash-preview-tts';if(!/^gemini-[\w.-]+$/.test(model))throw new AppError('Invalid speech model.');
 const id=createHash('sha256').update(model+'|'+voice+'|'+language+'|'+text).digest('hex');let saved=cache.get(id);
 if(!saved){
  const modern=model.includes('3.8'),url=modern?'https://generativelanguage.googleapis.com/v1beta/interactions':`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body=modern?{model,input:[{type:'user_input',content:[{type:'text',text,annotations:[{type:'speech_metadata',style:'Natural, warm '+language+' teacher. Clear words, short pauses, steady unhurried pace. Do not exaggerate.'}]}]}],response_format:{type:'audio'},generation_config:{speech_config:[{voice}]}}:{contents:[{role:'user',parts:[{text:'Speak in '+language+' with a natural clear teacher voice. Keep a steady unhurried pace, distinct words and short natural pauses. Do not sound robotic, exaggerate or sing. Read only this text: '+text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}};
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':secret},body:JSON.stringify(body),signal:AbortSignal.timeout(7500)});if(!r.ok)throw new AppError('AI voice is unavailable or its quota is exhausted.',503);
  const data=await r.json(),part=modern?data.steps?.filter((s:any)=>s.type==='model_output').flatMap((s:any)=>s.content||[]).filter((s:any)=>s.type==='audio').at(-1):data.candidates?.[0]?.content?.parts?.find((p:any)=>p.inlineData)?.inlineData;
  if(!part?.data)throw new AppError('AI voice returned no audio.',502);const raw=Buffer.from(part.data,'base64'),mime=part.mime_type||part.mimeType||'audio/L16;rate=24000';saved=/wav|mpeg|mp3|ogg/.test(mime)?{bytes:raw,mime: mime.includes('mp3')?'audio/mpeg':mime}:{bytes:pcmWav(raw,Number(/rate=(\d+)/.exec(mime)?.[1])||24000),mime:'audio/wav'};
  if(saved.bytes.length>5_000_000)throw new AppError('Audio too long.');if(cache.size>=20)cache.delete(cache.keys().next().value!);cache.set(id,saved);
 }
 return new Response(new Uint8Array(saved.bytes),{headers:{'Content-Type':saved.mime,'Cache-Control':'private, no-store'}});
}catch(e){return fail(e)}})}
