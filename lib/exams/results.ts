/** Indicative raw-score bands; original mock papers are not officially calibrated. */
export function practiceBand(score:number,skill:string){
 const thresholds=skill==='reading'?[[39,9],[37,8.5],[35,8],[33,7.5],[30,7],[27,6.5],[23,6],[19,5.5],[15,5],[13,4.5],[10,4],[8,3.5],[6,3],[4,2.5],[3,2],[2,1.5],[1,1],[0,0]]:[[39,9],[37,8.5],[35,8],[32,7.5],[30,7],[26,6.5],[23,6],[18,5.5],[16,5],[13,4.5],[10,4],[8,3.5],[6,3],[4,2.5],[3,2],[2,1.5],[1,1],[0,0]];
 return thresholds.find(([minimum])=>score>=minimum)![1];
}
export function sectionPracticeScore(a:{exam:string;skill:string;score:number|null;total:number;grade:number|null}){
 if(a.score===null)return a.grade;
 if(a.exam==='ielts')return a.total===40?practiceBand(a.score,a.skill):null;
 return a.total===35?Math.round(a.score/a.total*75*100)/100:null;
}
export function overallPracticeScore(exam:string,rows:any[]){
 const values=['listening','reading','writing','speaking'].map(skill=>{const a=rows.find(a=>a.skill===skill&&a.state==='completed');return a?sectionPracticeScore(a):null});
 if(values.some(v=>v===null))return null;
 const mean=values.reduce<number>((sum,v)=>sum+v!,0)/4;
 return exam==='ielts'?Math.round(mean*2)/2:Math.round(mean*100)/100;
}
