import {schoolScope} from '@/lib/center-context';
import {current,fail,AppError} from '@/lib/school-server';
import audio from '@/lib/data/audio-catalog.json';
export const runtime='nodejs';
// Listening is independent of the Books unit locks. Keep URL discovery authenticated.
export async function GET(req:Request){return schoolScope(async()=>{try{await current(req);const p=new URL(req.url).searchParams,track=audio.find(x=>x.path===p.get('path'));if(!track)throw new AppError('Audio not available.',404);const download=p.get('download')==='1';return Response.json({url:download?'/api/audio?path='+encodeURIComponent(track.path)+'&download=1':'https://zamon-audio.pages.dev/'+track.path.split('/').map(encodeURIComponent).join('/'),source:'cloudflare'},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}})}
