import catalog from './catalog.json';
import fullCatalog from './full-catalog.json';
export type ExamQuestion={id:string;prompt:string;accepted:string[];options?:string[];wordLimit?:number;explanation?:string};
export type ExamPack={id:string;suiteId?:string;available?:boolean;exam:string;skill:string;title:string;minutes:number;origin:string;paper?:string;maxPlays?:number;wordTargets?:number[];speakingPractice?:boolean;fullLength?:boolean;stagedSpeaking?:boolean;instructions?:string;readSeconds?:number;transferSeconds?:number;groups:{title:string;text?:string;script?:string;image?:string;stageId?:string;prompt?:string;prepareSeconds?:number;speakSeconds?:number;questions?:ExamQuestion[]}[]};
export const exams=[...fullCatalog,...catalog] as ExamPack[];
export const questions=(pack:ExamPack)=>pack.groups.flatMap(g=>g.questions||[]);
export function publicPack(pack:ExamPack){return {...pack,groups:pack.groups.map(g=>({...g,questions:g.questions?.map(({accepted,explanation,...q})=>q)}))}}
export function normalise(answer:string){return answer.normalize('NFKC').trim().toLowerCase().replace(/[‘’]/g,"'").replace(/\s+/g,' ')}
export function gradeObjective(pack:ExamPack,answers:Record<string,string>){const review=questions(pack).map(q=>{const answer=answers[q.id]||'',wordCount=answer.trim()?answer.trim().split(/\s+/).length:0;return{id:q.id,answer,accepted:q.accepted,explanation:q.explanation,correct:(!q.wordLimit||wordCount<=q.wordLimit)&&q.accepted.some(a=>normalise(a)===normalise(answer))}});return{review,score:review.filter(q=>q.correct).length,total:review.length}}
export const sources=[
 {exam:'cefr',title:'UZBMB · Multilevel full test structure',url:'https://gov.uz/oz/uzbmb/sections/view/49512'},
 {exam:'cefr',title:'UZBMB · Speaking new format',url:'https://uzbmb.uz/upload/file/pdf/phone/Speaking_yangi_format.pdf'},
 {exam:'ielts',title:'IELTS official sample tasks',url:'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test'},
 {exam:'ielts',title:'British Council · Reading papers and full practice',url:'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/reading'},
 {exam:'ielts',title:'British Council · Listening papers and recordings',url:'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/listening'},
 {exam:'ielts',title:'IELTS official scoring criteria',url:'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail'},
 {exam:'cefr',title:'UZBMB · Multilevel sample papers and archives',url:'https://gov.uz/oz/uzbmb/sections/view/49518'},
 {exam:'cefr',title:'UZBMB · Current assessment criteria',url:'https://gov.uz/oz/uzbmb/sections/view/49531'},
 {exam:'cefr',title:'Multilevel Writing · New format specifications',url:'https://api-portal.gov.uz/uploads/165/2025/10/13/99dfbb36-0f1d-2c70-8a4e-e1382a5f255b_media_.pdf'},
 {exam:'ielts',title:'Speaking sample tasks · 2023 PDF',url:'https://ielts.org/cdn/ielts-downloadable-assets/ielts-sample-tests/ielts-speaking-sample-tasks-2023.pdf'}
];
