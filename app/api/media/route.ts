import {schoolScope} from '@/lib/center-context';
import {current,fail,AppError,permitted} from '@/lib/school-server';
import audio from '@/lib/data/audio-catalog.json';
export const runtime='nodejs';
export async function GET(req:Request){return schoolScope(async()=>{try{const u=await current(req),p=new URL(req.url).searchParams;const track=audio.find(x=>x.path===p.get('path'));if(!track)throw new AppError('Audio not available.',403);const path=track.path.split('/').map(encodeURIComponent).join('/');return Response.json({url:p.get('download')==='1'?'/api/audio?path='+encodeURIComponent(track.path)+'&download=1':'https://zamon-audio.pages.dev/'+path,source:'cloudflare'},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}})}
