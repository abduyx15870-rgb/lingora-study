import {books,bookById} from './catalog';
import type {User,StudyTrack,StudyTracks} from './school-types';
export function bookFamily(book:string):'essential'|'navigate'{return /^essential(?:-[2-6])?$/.test(book)?'essential':'navigate';}
const first=(book:string):StudyTrack=>({book,unlockedUnit:1,startUnit:1,startLesson:1});
export function tracksFromRow(row:any):StudyTracks{
 const legacy:StudyTrack={book:row.book||'a1',unlockedUnit:row.unlocked_unit||1,startUnit:row.start_unit||1,startLesson:row.start_lesson||1};
 const result:StudyTracks={navigate:first('a1'),essential:first('essential')};
 result[bookFamily(legacy.book)]=legacy;
 for(const family of ['navigate','essential'] as const){const saved=row.book_tracks?.[family];if(saved&&typeof saved.book==='string'&&bookFamily(saved.book)===family&&Number.isInteger(saved.unlockedUnit)&&saved.unlockedUnit>0&&Number.isInteger(saved.startUnit)&&saved.startUnit>0&&saved.startUnit<=saved.unlockedUnit&&Number.isInteger(saved.startLesson)&&saved.startLesson>0)result[family]={book:saved.book,unlockedUnit:saved.unlockedUnit,startUnit:saved.startUnit,startLesson:saved.startLesson};}
 return result;
}
export function userTracks(user?:Pick<User,'book'|'unlockedUnit'|'startUnit'|'startLesson'|'courses'>|null):StudyTracks{return user?.courses||tracksFromRow({book:user?.book,unlocked_unit:user?.unlockedUnit,start_unit:user?.startUnit,start_lesson:user?.startLesson});}
export function courseFor(user:Parameters<typeof userTracks>[0],book:string):StudyTrack|undefined{
 const requested=bookById(book);if(!requested)return;
 const track=userTracks(user)[bookFamily(book)];if(track.book===book)return track;
 const series=books.filter(b=>bookFamily(b.id)===bookFamily(book));
 const current=series.findIndex(b=>b.id===track.book),earlier=series.findIndex(b=>b.id===book);
 if(earlier>=0&&current>=0&&earlier<current)return {book,unlockedUnit:requested.units.length,startUnit:1,startLesson:1};
}
export function trackAllowed(user:Parameters<typeof userTracks>[0],book:string,unit:number){const c=courseFor(user,book);return !!c&&Number.isInteger(unit)&&unit>=1&&unit<=c.unlockedUnit&&!!bookById(book)?.units.some(n=>n.id===unit);}
/** Earlier books and Units are available for unrestricted review. */
export function reviewUnit(user:Parameters<typeof userTracks>[0],book:string,unit:number){const c=courseFor(user,book);if(!c||!trackAllowed(user,book,unit))return false;const current=userTracks(user)[bookFamily(book)];return book!==current.book||unit<current.unlockedUnit;}
