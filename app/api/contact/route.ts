import {schoolScope,centerContext} from '@/lib/center-context';
import {current,db,AppError,mutation,fail} from '@/lib/school-server';
export const runtime='nodejs';
const query='id=eq.advertiser';
// One public contact address only; personal account data is never returned.
function globalContact(){const scope=centerContext.getStore()!;if(!scope.demo){scope.owner=true;scope.centerId=null}}
export async function GET(req:Request){return schoolScope(async()=>{try{await current(req);globalContact();const r=(await db('school_public_contact','GET',undefined,query))[0];return Response.json({telegram:r?.telegram||''},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}})}
export async function POST(req:Request){return schoolScope(async()=>{try{mutation(req);const u=await current(req);if(!['advertiser','owner'].includes(u.role))throw new AppError('Faqat reklamachi yoki Owner o‘zgartira oladi.',403);const d=await req.json();if(typeof d.telegram!=='string')throw new AppError('Telegram manzilini kiriting.');const telegram=d.telegram.trim().replace(/^https:\/\/t\.me\//i,'').replace(/^@/,'');if(telegram&&!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(telegram))throw new AppError('Telegram username kiriting: @username.');globalContact();const rows=await db('school_public_contact','GET',undefined,query);const patch={telegram,updated_by:u.id,updated_at:new Date().toISOString()};if(rows.length)await db('school_public_contact','PATCH',patch,query);else await db('school_public_contact','POST',{id:'advertiser',...patch});return Response.json({telegram});}catch(e){return fail(e)}})}
