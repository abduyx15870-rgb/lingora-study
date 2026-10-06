import 'server-only';
import webpush from 'web-push';
import {db} from './school-server';
import {centerContext} from './center-context';
export async function notify(userId:string,title:string,body:string,kind:string,ref='',notificationId?:string){
 if(notificationId&&(await db('school_inbox','GET',undefined,`id=eq.${encodeURIComponent(notificationId)}`)).length)return;
 const recipient=(await db('school_users','GET',undefined,`id=eq.${encodeURIComponent(userId)}`))[0];const [item]=await db('school_inbox','POST',{...(notificationId?{id:notificationId}:{}),center_id:recipient?.center_id||centerContext.getStore()?.centerId||'zamon',user_id:userId,title,body,kind,ref,read:false,created_at:new Date().toISOString()});
 if(centerContext.getStore()?.demo)return;
 if(!process.env.VAPID_PRIVATE_KEY||!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)return;
 try{webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://essential-mastery.netlify.app',process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);const scope=centerContext.getStore()!,oldCenter=scope.centerId,oldOwner=scope.owner;let devices:any[];try{scope.centerId=null;scope.owner=true;devices=await db('school_push','GET',undefined,`user_id=eq.${encodeURIComponent(userId)}`)}finally{scope.centerId=oldCenter;scope.owner=oldOwner}await Promise.all(devices.map(async(s:any)=>{try{await webpush.sendNotification(s.subscription,JSON.stringify({title,body,url:'/',tag:item.id}),{TTL:86400,timeout:3000})}catch(e:any){if([404,410].includes(e.statusCode))await db('school_push','DELETE',undefined,`endpoint=eq.${encodeURIComponent(s.endpoint)}`)}}))}catch{console.error('Push delivery unavailable; notification remains in inbox.')}
}
export async function notifyGroups(groups:string[],title:string,body:string,kind:string,ref:string){const users=await db('school_users');for(const u of users.filter((s:any)=>s.role==='student'&&groups.includes(s.group_id)))await notify(u.id,title,body,kind,ref)}
export async function ensureDailyInbox(user:any,groups:any[],assignments:any[],events:any[]){
 if(user.role!=='student')return;
 const {tashkentDate}=await import('./billing');const now=new Date(),day=tashkentDate(now);const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 async function once(id:string,title:string,body:string,kind:string){try{await db('school_inbox','POST',{id,user_id:user.id,title,body,kind,ref:'',read:false,created_at:now.toISOString()})}catch(e:any){if(e.status!==409)throw e}}
 if(user.payment.status==='unpaid')await once('payment-'+user.id+'-'+user.payment.unpaidAt+(user.payment.blocked?'-blocked':''),'Oylik to‘lovni tezroq to‘lang',user.payment.blocked?'Darslarga kirish yopilgan. To‘lovni Administrator tasdiqlaydi.':`To‘lov tasdiqlanmasa ${user.payment.blockAt} sanasida darslar yopiladi.`,'payment');
 const g=groups.find(g=>g.id===user.groupId);if(!g||time<g.reminder_time)return;
 const weekday=new Date(day+'T12:00:00Z').getUTCDay(),hw=assignments.find(a=>a.groups.includes(g.id)),ev=events.find(e=>(e.allGroups||e.groups.includes(g.id))&&new Date(e.at)>now);
 if(!hw&&!ev&&!g.days.includes(weekday))return;
 const body=[g.days.includes(weekday)?`Lesson today at ${g.time} (Tashkent)`:null,hw?`Homework: ${hw.title}`:null,ev?`Event: ${ev.title}`:null].filter(Boolean).join(' · ');
 await once('daily-'+user.id+'-'+day,g.name,body,'reminder');
}
