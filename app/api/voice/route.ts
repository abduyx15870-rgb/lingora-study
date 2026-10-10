import {userVoices} from '@/lib/voice-server';
import {schoolScope} from '@/lib/center-context';
import {current,mutation,fail,AppError,textValue} from '@/lib/school-server';
import {key,unavailable} from '@/lib/ai';
import {generateVoice} from '@/lib/tts';
export const runtime='nodejs';
export async function POST(req:Request){return schoolScope(async()=>{try{
 mutation(req);const started=Date.now(),u=await current(req),authMs=Date.now()-started,d=await req.json(),text=textValue(d.text,1200),language=d.language==='uz'?'Uzbek':'English',secret=key();if(!secret)throw new AppError(unavailable,503);
 const selected=d.voice||u.settings.voice||'Kore';if(!userVoices(u).some(v=>v.id===selected))throw new AppError('Voice not available.',403);
 const personal=selected==='personal',voice=personal?process.env.ODINA_VOICE_ID!:selected;
 const audio=await generateVoice({apiKey:secret,text,voice,language,personal,model:personal?'gemini-3.8-flash-tts':undefined});
 return new Response(new Uint8Array(audio.bytes),{headers:{'Content-Type':audio.mime,'Cache-Control':'private, no-store','Server-Timing':`auth;dur=${authMs},voice;dur=${Date.now()-started-authMs}`}});
}catch(e){return fail(e)}})}
