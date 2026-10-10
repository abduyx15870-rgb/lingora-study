// Lazy-loaded only when a translated PDF is downloaded; the reader stays light.
export async function translatedPdf(text:string,title:string,fontBytes?:Uint8Array):Promise<Uint8Array>{
 const [{PDFDocument,rgb},{default:fontkit}]=await Promise.all([import('pdf-lib'),import('@pdf-lib/fontkit')]);
 if(!fontBytes){const r=await fetch('/fonts/DejaVuSans.ttf');if(!r.ok)throw new Error('PDF shrifti yuklanmadi. Qayta urinib ko‘ring.');fontBytes=new Uint8Array(await r.arrayBuffer());}
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fontBytes,{subset:false});pdf.setTitle(title);pdf.setCreator('Lingora');
 const size=11,width=595.28,height=841.89,margin=48,lineHeight=17,usable=width-margin*2;
 const supported=new Set(font.getCharacterSet());
 const clean=(value:string)=>Array.from(value.normalize('NFC').replace(/\t/g,'    ').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'')).map(c=>supported.has(c.codePointAt(0)!)?c:'?').join('');
 let page=pdf.addPage([width,height]),y=height-margin;
 function nextPage(){page=pdf.addPage([width,height]);y=height-margin;}
 function draw(line:string){if(y<margin+lineHeight)nextPage();if(line)page.drawText(line,{x:margin,y,size,font,color:rgb(.08,.1,.15)});y-=lineHeight;}
 const paragraphs=text.replace(/\r\n?/g,'\n').split('\n');
 for(let i=0;i<paragraphs.length;i++){
  const words=clean(paragraphs[i]).trim().split(/\s+/);let line='';
  for(const word of words){
   if(!word)continue;
   if(font.widthOfTextAtSize(word,size)>usable){if(line){draw(line);line=''}let fragment='';for(const c of word){if(font.widthOfTextAtSize(fragment+c,size)>usable){draw(fragment);fragment=''}fragment+=c;}line=fragment;continue;}
   const candidate=line?line+' '+word:word;
   if(font.widthOfTextAtSize(candidate,size)>usable){draw(line);line=word}else line=candidate;
  }
  draw(line);
  // Yield while typesetting long books so scrolling and controls remain responsive.
  if(i%40===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 const pages=pdf.getPages();for(let i=0;i<pages.length;i++)pages[i].drawText(String(i+1)+' / '+pages.length,{x:margin,y:25,size:9,font,color:rgb(.4,.4,.4)});
 return pdf.save();
}
