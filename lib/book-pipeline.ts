'use client';
import {originalBook,extractBook} from './book-upload';
import {courseFetch} from './course-client';
import {bookStep} from './book-retry';
import {modeHeaders} from './client-mode';
import type {CourseMaterial} from './courses';
const originals=new Map<string,File>();
const fileKey=(center:string,subject:string,id:string)=>center+'|'+subject+'|'+id;
function remember(key:string,file:File){if(originals.size>=2)originals.delete(originals.keys().next().value!);originals.set(key,file)}
// Drain active requests before exposing a failure: a resumed job must not race old writes.
async function parallelParts(count:number,work:(index:number)=>Promise<void>,progress:(done:number)=>void){let next=0,done=0,failed=false;const results=await Promise.allSettled(Array.from({length:Math.min(4,count)},async()=>{while(!failed){const index=next++;if(index>=count)return;try{await work(index);progress(++done)}catch(e){failed=true;throw e}}}));const error=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(error)throw error.reason}
async function savedRequest(center:string,subject:string,data:any){try{return await courseFetch(center,subject,data)}catch(e){const error=e as Error&{status?:number;code?:string};if(error.status&&![408,500,502,503,504].includes(error.status)||error.code&&['AI_QUOTA','AI_KEY','AI_PERMISSION','AI_ACCOUNT'].includes(error.code))throw e;return courseFetch(center,subject,data)}}
export async function saveBookFile(file:File,center:string,subject:string,title:string,language:string,progress:(text:string)=>void){const source=originalBook(file),result=await courseFetch(center,subject,{action:'upload',title,filename:file.name,mime:source.mime,parts:0,deferredText:true,originalParts:source.originalParts,byteSize:file.size,language});await parallelParts(source.originalParts,async index=>{await savedRequest(center,subject,{action:'chunk',id:result.id,index,original:true,data:await source.originalChunk(index)})},done=>progress(`Fayl saqlanmoqda: ${done}/${source.originalParts}`));await savedRequest(center,subject,{action:'completeUpload',id:result.id});remember(fileKey(center,subject,result.id),file);return result.id as string}
export async function originalFile(m:CourseMaterial,center:string,subject:string,progress:(text:string)=>void){const key=fileKey(center,subject,m.id),saved=originals.get(key);if(saved)return saved;const chunks:Blob[]=new Array(m.originalParts);await parallelParts(m.originalParts,async index=>{const r=await fetch('/api/courses?center='+encodeURIComponent(center)+'&subject='+encodeURIComponent(subject)+'&action=original&id='+encodeURIComponent(m.id)+'&part='+index,{headers:modeHeaders(),signal:AbortSignal.timeout(50000)});if(!r.ok){let d:any;try{d=await r.json()}catch{}throw new Error(d?.error||'Asl fayl yuklanmadi.')}chunks[index]=await r.blob()},done=>progress(`Asl fayl ochilmoqda: ${done}/${m.originalParts}`));const file=new File(chunks,m.filename,{type:m.mime});remember(key,file);return file}
export async function prepareBookText(m:CourseMaterial,center:string,subject:string,progress:(text:string)=>void,cancelled:()=>boolean){const file=await originalFile(m,center,subject,progress);const extracted=await extractBook(file,center,subject,progress,{id:m.id,cancelled});if(cancelled())throw new Error('Tayyorlash to‘xtatildi. Fayl va o‘qilgan sahifalar saqlandi.');await courseFetch(center,subject,{action:'beginText',id:m.id,parts:extracted.parts.length});await parallelParts(extracted.parts.length,async index=>{if(cancelled())throw new Error('Tayyorlash to‘xtatildi. Asl fayl saqlandi.');await savedRequest(center,subject,{action:'chunk',id:m.id,index,data:extracted.parts[index]})},done=>progress(`Matn saqlanmoqda: ${done}/${extracted.parts.length}`));await savedRequest(center,subject,{action:'completeText',id:m.id});}

export async function prepareBookMedia(m:CourseMaterial,center:string,subject:string,progress:(text:string)=>void,cancelled:()=>boolean,audio:((index:number,subIndex:number)=>Promise<number>)|null,target:'en'|'uz'='en',onPart?:(part:{index:number;text:string;text_uz?:string})=>void){
 const check=()=>{if(cancelled())throw new Error('Tayyorlash to‘xtatildi. Tayyor qismlar saqlandi.');};check();
 const detail=await bookStep(()=>courseFetch(center,subject,undefined,'&action=material&id='+encodeURIComponent(m.id)),progress,cancelled);const parts=new Map<number,any>(detail.parts.map((p:any)=>[p.index,p]));
 for(let index=0;index<m.parts;index++){
  check();progress(`Tarjima: ${index+1}/${m.parts}`);
  const part=parts.get(index)||{index};if(!part.text)part.text=(await bookStep(()=>courseFetch(center,subject,{action:'translatePart',id:m.id,index}),progress,cancelled)).text;
  check();if(target==='uz'&&!part.text_uz)part.text_uz=(await bookStep(()=>courseFetch(center,subject,{action:'translatePart',id:m.id,index,target:'uz'}),progress,cancelled)).text;check();onPart?.({index,text:part.text,text_uz:part.text_uz});
  if(audio){check();progress(`Audio: ${index+1}/${m.parts}`);const count=await bookStep(()=>audio(index,0),progress,cancelled);for(let sub=1;sub<count;sub++){check();progress(`Audio: ${index+1}/${m.parts} · ${sub+1}/${count}`);await bookStep(()=>audio(index,sub),progress,cancelled)}}

 }
 check();
}
