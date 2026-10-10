// This checks actual translation, conversation, image reading, and generated audio. Never prints secrets.
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../lib/ai.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {key,modelName,gemini}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const apiKey=key();
if(!apiKey){console.log('AI_KEY_MISSING: .env.local ichida GEMINI_API_KEY bo‘sh yoki noto‘g‘ri formatda.');process.exitCode=1}
else{
 console.log('Sozlangan model: '+modelName()+' (mavjud bo‘lmasa ruxsat etilgan Flash modeli tanlanadi).');
 const image=await readFile(new URL('./fixtures/ai-ocr.png',import.meta.url));
 const checks=[
  {name:'TRANSLATE',instructions:'Translate to Uzbek. Output only the translation.',parts:[{text:'Hello, how are you?'}],maxTokens:700,timeoutMs:18000},
  {name:'CHAT',instructions:'Reply in simple English in one short sentence and ask one short question.',parts:[{text:'I am learning English.'}],maxTokens:700,timeoutMs:18000},
  {name:'OCR',instructions:'Transcribe exactly the visible words in this image. Output only those words.',parts:[{text:'Read this image.'},{inlineData:{mimeType:'image/png',data:image.toString('base64')}}],maxTokens:2000,timeoutMs:35000}
 ];
 for(const test of checks){const started=Date.now();try{const answer=await gemini({apiKey,...test,fast:true});if(test.name==='OCR'&&!answer.toUpperCase().includes('HELLO LINGORA'))throw new Error('Sinov tasviridagi so‘zlar to‘g‘ri o‘qilmadi.');console.log(test.name+'_OK: '+((Date.now()-started)/1000).toFixed(1)+' s');}catch(e){console.log(test.name+'_'+(e.code||'ERROR')+(e.providerStatus?' (HTTP '+e.providerStatus+')':'')+': '+e.message);process.exitCode=1}}
 const cache=new Map();async function localModule(relative){const url=new URL(relative,import.meta.url);if(cache.has(url.href))return cache.get(url.href);let code=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;for(const name of ['./ai','./speech'])if(code.includes("from '"+name+"'")){const child=await localModule('../lib/'+name.slice(2)+'.ts');code=code.replace("from '"+name+"'","from '"+child+"'")}const result='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(url.href,result);return result}
 const started=Date.now();try{const {generateVoice}=await import(await localModule('../lib/tts.ts'));const audio=await generateVoice({apiKey,text:'Hello. Welcome to Lingora. Let us read a book together.',voice:'Kore'});if(audio.bytes.length<44)throw new Error('Audio bo‘sh.');console.log('VOICE_OK: '+((Date.now()-started)/1000).toFixed(1)+' s · '+audio.model+' · '+audio.bytes.length+' bytes')}catch(e){console.log('VOICE_'+(e.code||'ERROR')+(e.providerStatus?' (HTTP '+e.providerStatus+')':'')+': '+e.message);process.exitCode=1}
 if(!process.exitCode)console.log('AI_OK: tarjima, suhbat, OCR va audio yaratish ishladi. Haqiqiy kitobni saytda yuklab sinang; bu sinov Firebase va mikrofonni tekshirmaydi.');
}
