import {randomUUID} from 'node:crypto';
import {schoolScope,centerContext,legacyCenter} from '@/lib/center-context';
import {current,db,AppError,mutation,fail,safeUser,textValue} from '@/lib/school-server';
import {paymentState,tashkentDate} from '@/lib/billing';
import {notify} from '@/lib/notifications-server';
export const runtime='nodejs';
function baseRequest(req:Request){const h=new Headers(req.headers);for(const key of ['x-demo-role','x-demo-key','x-owner-user','x-center-id'])h.delete(key);return new Request(req.url,{headers:h})}
async function centres(){const rows=await db('school_centers');return [{id:legacyCenter,name:'Zamon',...rows.find((c:any)=>c.id===legacyCenter)},...rows.filter((c:any)=>c.id!==legacyCenter)]}
export async function GET(req:Request){return schoolScope(async()=>{try{const u=await current(baseRequest(req),true);if(!['owner','advertiser'].includes(u.role))throw new AppError('Platform access denied.',403);if(u.role==='advertiser')return Response.json({centers:[],users:[],groups:[]});const [cs,users,groups]=await Promise.all([centres(),db('school_users'),db('school_groups')]);return Response.json({centers:cs.map(c=>({id:c.id,name:c.name,payment:c.billing?paymentState(c.billing):{status:'paid',paidAt:null}})),users:users.filter((r:any)=>!['owner','advertiser'].includes(r.role)).map(safeUser),groups:groups.map((g:any)=>({id:g.id,name:g.name,centerId:g.center_id||legacyCenter,teacherId:g.teacher_id}))},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}})}
export async function POST(req:Request){return schoolScope(async()=>{try{mutation(req);const u=await current(baseRequest(req),true),d=await req.json();
 if(d.action==='suggestion'){
  const body=textValue(d.body,4000),id=randomUUID();const scope=centerContext.getStore()!;scope.owner=true;scope.centerId=null;
  // Real suggestions go to platform recipients, including when written from demo.
  await db('school_suggestions','POST',{id,user_id:u.id,center_id:u.centerId,body,created_at:new Date().toISOString()});
  const users=await db('school_users');for(const recipient of users.filter((r:any)=>['owner','advertiser'].includes(r.role)&&!r.disabled))await notify(recipient.id,'Yangi taklif',`${u.firstName} ${u.lastName}: ${body}`,'suggestion',id);
  return Response.json({ok:true});
 }
 if(u.role!=='owner')throw new AppError('Owner access required.',403);
 if(d.action==='centerPayment'){
  if(!['paid','unpaid'].includes(d.status))throw new AppError('Choose payment status.');const cs=await centres(),c=cs.find(c=>c.id===d.centerId);if(!c)throw new AppError('Centre not found.');const today=tashkentDate(),billing=d.status==='paid'?{status:'paid',paidAt:today}:{status:'unpaid',paidAt:c.billing?.paidAt||null,unpaidAt:today};const existing=await db('school_centers','GET',undefined,`id=eq.${encodeURIComponent(c.id)}`);
  await db('school_centers',existing.length?'PATCH':'POST',{...(!existing.length?{id:c.id,name:c.name}:{}),billing},existing.length?`id=eq.${encodeURIComponent(c.id)}`:'');
  const users=await db('school_users');for(const manager of users.filter((r:any)=>r.role==='administrator'&&(r.center_id||legacyCenter)===c.id))await notify(manager.id,d.status==='paid'?'Markaz to‘lovi tasdiqlandi':'O‘quv markazi uchun to‘lov qiling',c.name,'center-payment',c.id);return Response.json({ok:true});
 }
 if(d.action==='centerMessage'){
  const title=textValue(d.title,120),body=textValue(d.body,4000),cs=await centres(),ids=d.all?cs.filter(c=>!c.disabled).map(c=>c.id):d.centers;
  if(!Array.isArray(ids)||!ids.length||!ids.every(id=>cs.some(c=>c.id===id&&!c.disabled)))throw new AppError('Choose centres.');const id=textValue(d.broadcastId,100);if(!/^[a-f0-9-]{36}$/.test(id))throw new AppError('Invalid message identifier.');
  const users=await db('school_users');for(const r of users.filter((r:any)=>!r.disabled&&r.role==='administrator'&&ids.includes(r.center_id||legacyCenter)))await notify(r.id,title,body,'message',id,id+'-'+r.id);return Response.json({ok:true,count:new Set(ids).size});
 }
 if(d.action==='centerEvent'){
  const title=textValue(d.title,120),at=textValue(d.at,100);if(!Number.isFinite(Date.parse(at)))throw new AppError('Choose event date.');const cs=await centres();const ids=d.all?cs.filter(c=>!c.disabled).map(c=>c.id):d.centers;if(!Array.isArray(ids)||!ids.length||!ids.every(id=>cs.some(c=>c.id===id&&!c.disabled)))throw new AppError('Choose centres.');const broadcastId=textValue(d.broadcastId,100);if(!/^[a-f0-9-]{36}$/.test(broadcastId))throw new AppError('Invalid event identifier.');
  const groups=await db('school_groups'),users=await db('school_users');const completed:string[]=[];
  for(const centerId of [...new Set<string>(ids)]){const id=broadcastId+'-'+centerId,old=await db('school_events','GET',undefined,`id=eq.${encodeURIComponent(id)}`);if(old.length&&!old[0].notify_pending){completed.push(centerId);continue}const selected=groups.filter((g:any)=>(g.center_id||legacyCenter)===centerId).map((g:any)=>g.id);if(!old.length)await db('school_events','POST',{id,center_id:centerId,title,at,groups:selected,allGroups:true,broadcast_id:broadcastId,notify_pending:true});for(const recipient of users.filter((r:any)=>!r.disabled&&(r.center_id||legacyCenter)===centerId&&r.role!=='owner'))await notify(recipient.id,'Yangi event',title+' · '+at,'event',id,id+'-'+recipient.id);await db('school_events','PATCH',{notify_pending:false},`id=eq.${encodeURIComponent(id)}`);completed.push(centerId)}return Response.json({ok:true,count:completed.length});
 }
 throw new AppError('Unknown action.');
}catch(e){return fail(e)}})}
