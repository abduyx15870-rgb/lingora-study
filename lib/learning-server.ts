import {courseFor,reviewUnit} from './study-tracks';
import {isEssential,bookWords} from './essential';
import 'server-only';
import {AppError,db,permitted} from './school-server';
import {requiredLessons} from './lessons';
import type {User} from './school-types';
export async function lessonAccess(u:User,book:string,unit:number,lesson:string){
 if(!Number.isInteger(unit)||!permitted(u,book,unit))throw new AppError('This Unit is locked.',403);
 const required=requiredLessons(book,unit);if(!required.length||lesson!=='test'&&!required.includes(lesson))throw new AppError('Lesson not found.',404);
 if(u.role!=='student'||reviewUnit(u,book,unit))return;
 const rows=await db('school_progress','GET',undefined,`user_id=eq.${u.id}&book=eq.${book}&unit=eq.${unit}`),done=new Set(rows.map((r:any)=>r.lesson));
 const course=courseFor(u,book);if(unit===course?.startUnit)required.slice(0,course.startLesson-1).forEach(l=>done.add(l));
 if(lesson==='test'&&!required.every(l=>done.has(l)))throw new AppError('Finish the lessons before the Unit test.',403);
 const i=required.indexOf(lesson);if(lesson!=='test'&&(isEssential(book)?i>=3+required.filter(l=>done.has(l)).length:!required.slice(0,i).every(l=>done.has(l))))throw new AppError('Finish an open lesson first.',403);
}
export async function studentAccess(u:User,id:string){if(id===u.id)return; if(['administrator','owner'].includes(u.role)){const rows=await db('school_users','GET',undefined,`id=eq.${encodeURIComponent(id)}`);if(!rows[0])throw new AppError('Student not available.',403);return;}if(u.role!=='teacher')throw new AppError('Access denied.',403);const students=await db('school_users','GET',undefined,`id=eq.${encodeURIComponent(id)}`);const s=students[0];if(!s?.group_id)throw new AppError('Student has no assigned teacher.',403);const gs=await db('school_groups','GET',undefined,`id=eq.${encodeURIComponent(s.group_id)}`);if(gs[0]?.teacher_id!==u.id)throw new AppError('Only the assigned teacher can read this.',403);}
