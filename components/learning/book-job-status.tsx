'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {bookJobSnapshot,subscribeBookJob,setBookJobUser,stopBookJob,dismissBookJob} from '@/lib/book-jobs';
import {Button} from '@/components/ui/button';
export function BookJobStatus({userId,uz}:{userId:string;uz:boolean}){
 const job=useSyncExternalStore(subscribeBookJob,bookJobSnapshot,()=>null);
 useEffect(()=>{setBookJobUser(userId)},[userId]);
 if(!job||job.userId!==userId)return null;
 return <section className={'book-job-status'+(job.error?' error':'')} aria-live="polite"><div><strong>{job.title}</strong><p>{job.status}</p>{job.running&&<small>{uz?'Sayt ichida boshqa bo‘limlarga o‘tishingiz mumkin. Brauzer oynasini ochiq qoldiring.':'You can visit other sections. Keep this browser tab open.'}</small>}</div><Button variant="outline" disabled={job.stopping} onClick={job.running?stopBookJob:dismissBookJob}>{job.running?(uz?'To‘xtatish':'Stop'):(uz?'Yopish':'Dismiss')}</Button></section>
}
