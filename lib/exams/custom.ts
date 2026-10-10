import {exams,questions} from './index';
import type {ExamPack} from './index';
const text=(v:any,max:number,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw Error('Test matni yoki savoli noto‘g‘ri.');return v.trim()};
// A published suite is immutable. New revisions receive a new ID.
export function validateSuite(input:any,id:string,title:string):ExamPack[]{
 if(!Array.isArray(input)||input.length!==4)throw Error('To‘rtta bo‘limni to‘ldiring.');
 const family=input[0]?.exam;if(!['ielts','cefr'].includes(family))throw Error('IELTS yoki CEFR tanlang.');
 return ['listening','reading','writing','speaking'].map(skill=>{
  const p=input.find(x=>x.skill===skill),template=exams.find(x=>x.fullLength&&x.exam===family&&x.skill===skill)!;
  if(!p||p.exam!==family||!Array.isArray(p.groups)||p.groups.length!==template.groups.length)throw Error('Qismlar soni test formatiga mos bo‘lsin.');
  const groups=p.groups.map((g:any,i:number)=>{
   const ref=template.groups[i],out:any={...ref,title:text(g.title,200,true)};
   for(const k of ['text','script','prompt']){if(ref[k as keyof typeof ref]!==undefined||g[k]!==undefined)out[k]=text(g[k],30000,true)}
   if(ref.image){if(!['/exams/garden-map.svg','/exams/study-pictures.svg','/exams/challenge-picture.svg'].includes(g.image))throw Error('Chizma noto‘g‘ri.');out.image=g.image;}
   if(ref.questions){if(!Array.isArray(g.questions)||g.questions.length!==ref.questions.length)throw Error('Savollar sonini saqlang.');out.questions=g.questions.map((q:any,j:number)=>{
    const objective=['reading','listening'].includes(skill),accepted=objective?(Array.isArray(q.accepted)?q.accepted.map((a:any)=>text(a,200,true)):[]):[];
    if(objective&&(!accepted.length||accepted.length>12))throw Error('Har savolning to‘g‘ri javobini yozing.');
    const options=q.options===undefined?undefined:Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=20?q.options.map((v:any)=>text(v,1000,true)):null;
    if(options===null)throw Error('Javob variantlari noto‘g‘ri.');
    if(options&&accepted.some((a:string)=>!options.some((o:string)=>(/^[A-Z]\. /.test(o)?o[0]:o).toLowerCase()===a.toLowerCase())))throw Error('To‘g‘ri javob variantlar ichida bo‘lsin.');
    const limit=q.wordLimit;if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>20))throw Error('So‘z chegarasi 1–20 bo‘lsin.');
    return{id:ref.questions![j].id,prompt:text(q.prompt,4000,true),accepted,...(options?{options}:{}),...(limit?{wordLimit:limit}:{}),...(q.explanation?{explanation:text(q.explanation,2000)}:{})};
   });}
   return out;
  });
  const result={...template,id:id+'-'+skill,suiteId:id,title:title+' · '+skill,origin:'Learning centre · Original practice test',groups};
  if(['reading','listening'].includes(skill)&&questions(result).length!==(family==='ielts'?40:35))throw Error('Savollar soni noto‘g‘ri.');return result;
 });
}
