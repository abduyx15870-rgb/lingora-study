import 'server-only';
import {db,digest,AppError} from './school-server';
export function teacherCodeHash(value:unknown){
 const code=typeof value==='string'?value.trim():'';
 if(!/^[A-Za-z0-9_-]{12}$/.test(code))throw new AppError('Choose a 12-character code using English letters, numbers, - or _. / 12 belgili kod tanlang.');
 if(['OWNER_ACCESS_CODE','TEACHER_ACCESS_CODE','ADMINISTRATOR_ACCESS_CODE','ADVERTISER_ACCESS_CODE'].some(k=>process.env[k]?.trim()===code))throw new AppError('Your personal code must differ from the shared registration codes. / Shaxsiy kod umumiy kodlardan farqli bo‘lsin.');
 return digest('teacher-personal:'+code);
}
export async function checkTeacherCode(userId:string,value:unknown){
 const hash=teacherCodeHash(value),rows=await db('school_teacher_codes','GET',undefined,`id=eq.${hash}`);
 if(rows.length){if(rows[0].user_id!==userId)throw new AppError('This code is already in use. Choose another code. / Bu kod band, boshqa kod tanlang.',409)}
 return hash;
}
export async function reserveTeacherCode(userId:string,value:unknown){const hash=await checkTeacherCode(userId,value);const rows=await db('school_teacher_codes','GET',undefined,`id=eq.${hash}`);if(!rows.length){try{await db('school_teacher_codes','POST',{id:hash,user_id:userId})}catch(e){if(e instanceof AppError&&e.status===409)throw new AppError('This code is already in use. Choose another code.',409);throw e}}
 return hash;
}
