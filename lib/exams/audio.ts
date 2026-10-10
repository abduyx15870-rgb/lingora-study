/** Voice provider accepts at most 1,200 characters. Never truncate an exam. */
export function examAudioChunks(text:string,max=1000):string[]{
 const result:string[]=[];let chunk='';
 for(const sentence of text.match(/[^.!?]+[.!?]+(?:["’”])?|[^.!?]+$/g)||[]){
  const parts=sentence.trim().split(/\s+/);for(const word of parts){if(chunk&&chunk.length+word.length+1>max){result.push(chunk);chunk=''}chunk+=(chunk?' ':'')+word}
 }
 if(chunk)result.push(chunk);return result;
}
