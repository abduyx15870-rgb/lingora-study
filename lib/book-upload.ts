'use client';
import {courseFetch} from './course-client';
import {segments} from './courses';
export async function extractBook(file:File,center:string,subject:string,onProgress:(text:string)=>void){
 if(file.size>100*1024*1024)throw new Error('100 MBgacha fayl yuklang.');const bytes=await file.arrayBuffer();let text='',mime=file.type;
 if(/\.txt$/i.test(file.name)){mime='text/plain';text=new TextDecoder().decode(bytes)}
 else if(/\.docx$/i.test(file.name)){mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';const mammoth=await import('mammoth/mammoth.browser');text=(await mammoth.extractRawText({arrayBuffer:bytes})).value}
 else if(/\.pdf$/i.test(file.name)){mime='application/pdf';const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';const task=pdf.getDocument({data:new Uint8Array(bytes)});const doc=await task.promise;try{if(doc.numPages>1000)throw new Error('Bir faylda 1000 sahifagacha yuklang.');for(let i=1;i<=doc.numPages;i++){onProgress(`Sahifa o‘qilmoqda: ${i}/${doc.numPages}`);const page=await doc.getPage(i);const content=await page.getTextContent();let pageText=content.items.map((x:any)=>x.str+(x.hasEOL?'\n':' ')).join('');if(pageText.trim().length<20){const viewport=page.getViewport({scale:1.1});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;pageText=(await courseFetch(center,subject,{action:'ocr',image:canvas.toDataURL('image/jpeg',.65)})).text;canvas.width=canvas.height=0;}text+=pageText+'\n\n';if(text.length>900000)throw new Error('Matn juda uzun. Kitobni qismlarga ajrating.');}}finally{await task.destroy()}}
 else throw new Error('PDF, DOCX yoki TXT fayl tanlang.');
 if(text.trim().length<10)throw new Error('Fayldan o‘qiladigan matn topilmadi. Matnli PDF yoki TXT yuklang.');if(text.length>900000)throw new Error('Matn juda uzun. Kitobni qismlarga ajrating.');
 const chunkBytes=135000,originalParts=Math.ceil(file.size/chunkBytes);
 return{parts:segments(text,1000),originalParts,mime,text,async originalChunk(index:number){const binary=new Uint8Array(await file.slice(index*chunkBytes,(index+1)*chunkBytes).arrayBuffer());let raw='';for(let i=0;i<binary.length;i+=8192)raw+=String.fromCharCode(...binary.subarray(i,i+8192));return btoa(raw)}};
}
