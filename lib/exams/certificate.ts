import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
export type CertificateData={id:string;name:string;center:string;title:string;exam:string;date:string;overall:number;scores:{skill:string;score:number}[]};
export async function examCertificate(d:CertificateData){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(await readFile(join(process.cwd(),'public/fonts/DejaVuSans.ttf')),{subset:true});
 const page=pdf.addPage(),ink=rgb(.08,.17,.27),blue=rgb(.08,.28,.5),muted=rgb(.35,.42,.48),accent=rgb(.05,.65,.61);
 const chars=new Set(font.getCharacterSet());const clean=(s:string)=>Array.from(s.replace(/[\x00-\x1f]/g,' ')).map(c=>chars.has(c.codePointAt(0)!)?c:'?').join('');
 function line(s:string,x:number,y:number,size=12,color=ink,width=490){s=clean(s);while(font.widthOfTextAtSize(s,size)>width&&size>8)size-=.3;page.drawText(s,{x,y,size,font,color});}
 page.drawRectangle({x:25,y:25,width:545,height:792,borderColor:blue,borderWidth:1});
 page.drawRectangle({x:25,y:695,width:545,height:122,color:blue});
 line('Lingora.',48,773,30,rgb(1,1,1));line('PRACTICE RESULT CERTIFICATE',48,736,18,rgb(1,1,1));
 line(d.exam==='ielts'?'IELTS-style Academic mock test':'CEFR / Multilevel-style mock test',48,711,12,rgb(.8,.94,1));
 page.drawRectangle({x:48,y:646,width:499,height:29,color:rgb(1,.94,.82)});
 line('UNOFFICIAL - NOT AN IELTS OR CEFR CERTIFICATE',58,656,10,blue,479);
 line('Candidate',48,616,10,muted);line(d.name,48,588,22);
 line('Learning centre',48,549,10,muted);line(d.center,48,528,14);
 line('Test',48,494,10,muted);line(d.title,48,473,13);
 line('Completed / assessed',48,438,10,muted);line(d.date,48,417,13);
 d.scores.forEach((s,i)=>{const y=368-i*39;page.drawRectangle({x:48,y:y-12,width:499,height:34,color:i%2?rgb(.97,.98,.99):rgb(.92,.95,.97)});line(s.skill[0].toUpperCase()+s.skill.slice(1),60,y,12);line(String(s.score)+(d.exam==='ielts'?' band':' / 75'),428,y,13,blue,108)});
 page.drawRectangle({x:48,y:161,width:499,height:46,color:accent});line('OVERALL PRACTICE SCORE',60,178,12,rgb(1,1,1));line(String(d.overall)+(d.exam==='ielts'?' band':' / 75'),416,177,17,rgb(1,1,1),119);
 line('Certificate ID: '+d.id,48,136,9,muted);
 line('Issued by Lingora for practice only. No official accreditation.',48,107,9,muted);
 line('IELTS bands are indicative. Multilevel scores are scaled, not Rasch calibrated.',48,91,8,muted);
 line('Writing and Speaking are assessed by the learning centre. Not valid for admissions.',48,75,8,muted);
 pdf.setTitle('Lingora unofficial practice result');pdf.setCreator('Lingora');return pdf.save();
}
