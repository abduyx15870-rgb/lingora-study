import {answerMatches} from './answer-check';
import {isEssential,bookWords} from './essential';
import practice from './data/navigate-practice.json';
import {words,sentenceExamples,writtenExamples,makeQuestion,wordLessonStages,similarity,norm} from './engine';
import {bookById} from './catalog';
import type {Exercise} from './school-types';
export function lessonExercises(book:string,unit:number,lesson:string):Exercise[]{
 if(isEssential(book)){
  const ws=bookWords(book).filter(w=>w.unit===unit);
  if(lesson==='test'){const prior=bookWords(book).filter(w=>w.unit<unit);const old=[...new Set(prior.map(w=>w.unit))].flatMap(u=>prior.filter(w=>w.unit===u).slice(0,2));return [...ws,...old].map((w,i)=>{const q=makeQuestion(w,['choice','uz-en','context','listening'][i%4],bookWords(book),i%sentenceExamples(w).length);return{id:q.id,kind:q.audio?'listening':q.options?'choice':'writing',prompt:q.audio?'Listen and write what you hear.':q.type==='uz-en'?`Write the English word for: ${w.uzbekMeaning}`:q.type==='choice'?`Choose the meaning of “${w.word}”.`:q.question.replace('Gapga mos inglizcha so‘zni yozing:','Complete the sentence:'),answer:q.correctAnswer,accepted:q.acceptedAnswers,options:q.options,audio:q.audio}})}
  const w=ws.find(w=>w.id===lesson);if(!w)return[];
  return wordLessonStages(w).map((stage,i)=>{const q=makeQuestion(w,stage.type,bookWords(book),stage.i);const prompts:Record<string,string>={'speak-word':'Read the word aloud.','speak-sentence':'Read this sentence aloud.','spelling':'Listen and write the word.','dictation':'Listen and write the short sentence.','en-uz':`Write the Uzbek meaning of “${w.word}”.`,'uz-en':`Write the English word for: ${w.uzbekMeaning}`};return{id:q.id+'-'+i,kind:q.speakingText?'speaking':q.audio?'listening':'writing',prompt:prompts[stage.type]||q.question.replace('Gapga mos inglizcha so‘zni yozing:','Complete the sentence:'),answer:q.correctAnswer,accepted:q.acceptedAnswers,audio:q.audio,text:q.speakingText}})
 }
 const b=bookById(book),u=b?.units.find(u=>u.id===unit);if(!u)return[];
 if(lesson==='test')return [...u.sections.flatMap(s=>lessonExercises(book,unit,s.id).filter(q=>!q.open).slice(0,2)),...(unit>1?lessonExercises(book,unit-1,`${unit-1}.1`).filter(q=>!q.open).slice(0,2):[])];
 const section=Number(lesson.split('.')[1]);if(!u.sections.some(s=>s.id===lesson))return[];
 const bank=[...new Set([...u.sentences,...((practice as Record<string,Record<string,string[]>>)[book]?.[String(unit)]||[])])];
 const ordered=bank.map((_,i)=>bank[(i+(section-1)*2)%bank.length]);
 const sentence=(i:number)=>ordered[i%ordered.length];
 // A longer writing context contains two related sentences, never extra facts invented by a template.
 const context=(i:number)=>sentence(i)+' '+sentence(i+3);
 const result:Exercise[]=[];
 for(let i=0;i<3;i++)result.push({id:lesson+'-listen-'+i,kind:'listening',prompt:'Listen and write exactly what you hear.',audio:sentence(i),answer:sentence(i)});
 for(let i=3;i<6;i++)result.push({id:lesson+'-speak-'+i,kind:'speaking',prompt:'Read both sentences aloud using your microphone.',text:context(i),answer:context(i),audio:context(i)});
 for(let i=0;i<4;i++){
  const original=context(i+1),tokens=original.split(' '),position=Math.max(1,Math.floor(tokens.length*(i%2?.65:.35))),answer=tokens[position].replace(/[.,!?]/g,'');tokens[position]=tokens[position].replace(answer,'_____');
  result.push({id:lesson+'-gap-'+i,kind:'writing',prompt:'Complete the missing word: '+tokens.join(' '),answer});
 }
 for(let i=0;i<3;i++){
  const original=sentence(i+4),tokens=original.replace(/[.!?]$/,'').split(' ');const shuffled=tokens.filter((_,n)=>n%2===1).concat(tokens.filter((_,n)=>n%2===0));
  result.push({id:lesson+'-order-'+i,kind:'writing',prompt:'Put the words in order and write the sentence: '+shuffled.join(' / '),answer:original});
 }
 for(let i=0;i<2;i++){
  const tokens=sentence(i+1).split(' '),position=Math.min(tokens.length-1,Math.max(1,Math.floor(tokens.length/2))),answer=tokens[position].replace(/[.,!?]/g,'');tokens[position]=tokens[position].replace(answer,'_____');
  const alternatives=[...new Set(bank.flatMap(s=>s.split(' ')).map(s=>s.replace(/[.,!?]/g,'')).filter(s=>s.toLowerCase()!==answer.toLowerCase()&&s.length>1))].slice(i*3,i*3+3);
  result.push({id:lesson+'-choice-'+i,kind:'choice',prompt:'Choose the word that completes this sentence: '+tokens.join(' '),options:[answer,...alternatives].sort(),answer});
 }
 result.push({id:lesson+'-own',kind:'writing',prompt:`Write ${b?.level==='A1'||b?.level==='A2'?'4–5':'5–7'} sentences about ${u.title.toLowerCase()}. Use ${u.grammar}. Include a positive sentence, a negative sentence and a question. Use your own ideas.`,answer:'Teacher review',open:true});

 return result;
}
export function evaluate(q:Exercise,a:string){return q.open?a.trim().split(/\s+/).length>=3:q.kind==='speaking'?similarity(q.answer,a)>=75:answerMatches(q,a)}
export function requiredLessons(book:string,unit:number){return isEssential(book)?bookWords(book).filter(w=>w.unit===unit).map(w=>w.id):bookById(book)?.units.find(u=>u.id===unit)?.sections.map(s=>s.id)||[]}
