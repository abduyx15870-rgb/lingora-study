'use client';
import {modeHeaders} from './client-mode';
export type BookJob={id:string;userId:string;center:string;subject:string;title:string;status:string;running:boolean;stopping:boolean;error:boolean};
type Context={id:string;userId:string;center:string;subject:string;title:string};
let current:BookJob|null=null,contextUser:string|null=null,generation=0;
const listeners=new Set<()=>void>();
const fingerprint=()=>JSON.stringify(modeHeaders());
function emit(){for(const listener of listeners)listener()}
export function bookJobSnapshot(){return current}
export function subscribeBookJob(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
export function setBookJobUser(userId:string|null){if(contextUser!==userId){contextUser=userId;stopBookJob();if(!current?.running){current=null;emit()}}}
export function stopBookJob(){if(!current?.running)return;generation++;current={...current,stopping:true,status:'Joriy so‘rovdan keyin to‘xtaydi. Tayyor qismlar saqlanadi.'};emit()}
export function dismissBookJob(){if(!current?.running){current=null;emit()}}
// Component unmounts never own this job. Scope changes and sign-out do cancel it.
export async function runBookJob(c:Context,work:(progress:(text:string)=>void,cancelled:()=>boolean)=>Promise<void>){
 if(current?.running)throw new Error('Boshqa kitob tayyorlanmoqda. Tugashini kuting yoki to‘xtating.');
 const token=++generation,scope=fingerprint();contextUser=c.userId;
 const cancelled=()=>token!==generation||contextUser!==c.userId||scope!==fingerprint();
 current={...c,status:'Kitob tayyorlanmoqda…',running:true,stopping:false,error:false};emit();
 const progress=(status:string)=>{if(!cancelled()){current={...current!,status};emit()}};
 try{await work(progress,cancelled);current={...current!,status:cancelled()?'Tayyorlash to‘xtatildi. Tayyor qismlar saqlandi.':'Kitob tayyor. Matn va tayyor audio saqlandi.',error:false};}
 catch(e){current={...current!,status:cancelled()?'Tayyorlash to‘xtatildi. Tayyor qismlar saqlandi.':(e as Error).message,error:!cancelled()};}
 finally{current={...current!,running:false,stopping:false};emit();if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('book-prepared',{detail:{...c}}));}
 return !current.error&&!cancelled();
}
