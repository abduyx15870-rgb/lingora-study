import webpush from 'web-push';
import {db} from '../../scripts/firebase-store.mjs';
import {paymentState,tashkentDate} from '../../scripts/billing.mjs';
export const config={schedule:'*/15 * * * *'};
export default async function(){
 if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON&&!process.env.FIREBASE_SERVICE_ACCOUNT_FILE)return new Response('Firebase not configured');
 const now=new Date(),day=tashkentDate(now),time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 const expired=await db('school_demo_records','GET',undefined,'expires_at=lt.'+encodeURIComponent(now.toISOString())+'&limit=50');await Promise.all(expired.map(r=>db('school_demo_records','DELETE',undefined,'id=eq.'+encodeURIComponent(r.id))));
 const [groups,users,subs,assignments,events,sent]=await Promise.all([db('school_groups'),db('school_users'),db('school_push'),db('school_assignments','GET',undefined,'order=created_at.desc'),db('school_events'),db('school_notifications','GET',undefined,'day=eq.'+day)]);
 const push=!!(process.env.VAPID_PRIVATE_KEY&&process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);if(push)webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://essential-mastery.netlify.app',process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
 let delivered=0;const deadline=Date.now()+22000;
 async function deliver(u,title,body,kind,id){let item;try{[item]=await db('school_inbox','POST',{id,user_id:u.id,title,body,kind,ref:'',read:false,created_at:now.toISOString()})}catch(e){if(e.status===409)item={id};else throw e}if(!push)return;try{await db('school_push_claims','POST',{id:item.id})}catch(e){if(e.status===409)return;throw e}await Promise.all(subs.filter(s=>s.user_id===u.id).map(async s=>{try{await webpush.sendNotification(s.subscription,JSON.stringify({title,body,url:'/',tag:item.id}),{TTL:86400,timeout:3000});delivered++}catch(e){if([404,410].includes(e.statusCode))await db('school_push','DELETE',undefined,'endpoint=eq.'+encodeURIComponent(s.endpoint))}}))}
 for(const u of users){if(Date.now()>deadline)break;if(u.role!=='student'||u.disabled)continue;
  const pay=paymentState(u.billing,now);if(pay.status==='unpaid')await deliver(u,'Oylik to‘lovni tezroq to‘lang',pay.blocked?'Darslarga kirish yopilgan. To‘lovni Administrator tasdiqlaydi.':`To‘lov tasdiqlanmasa ${pay.blockAt} sanasida darslar yopiladi.`,'payment','payment-'+u.id+'-'+pay.unpaidAt+(pay.blocked?'-blocked':''));
  const g=groups.find(g=>g.id===u.group_id);if(!g||time<g.reminder_time||sent.some(s=>s.user_id===u.id))continue;
  const weekday=new Date(day+'T12:00:00Z').getUTCDay(),hw=assignments.find(a=>a.groups.includes(g.id)),ev=events.find(e=>e.groups.includes(g.id)&&new Date(e.at)>now);
  if(!hw&&!ev&&!g.days.includes(weekday))continue;
  try{await db('school_notifications','POST',{user_id:u.id,day})}catch{continue}
  const body=[g.days.includes(weekday)?`Lesson today at ${g.time} (Tashkent)`:null,hw?`Homework: ${hw.title}`:null,ev?`Event: ${ev.title}`:null].filter(Boolean).join(' · ');
  await deliver(u,g.name,body,'reminder','daily-'+u.id+'-'+day);
 }
 return new Response('Delivered: '+delivered);
}
