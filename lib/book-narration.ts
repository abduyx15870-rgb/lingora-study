// Reading keeps the original text. Only clearly identified export metadata is
// omitted from narration; numbers and dialogue inside the story stay intact.
export const BOOK_NARRATION_VERSION='story-v1';
const normalized=(value:string)=>value.toLowerCase().replace(/[‘’ʻʼ`]/g,"'").replace(/[^a-z0-9а-яёўқғҳ]+/gi,' ').trim();
export function bookNarrationText(text:string,title=''){
 const bookTitle=normalized(title);
 return text.split(/\r?\n/).filter(line=>{
  const value=line.trim();
  if(!value)return true;
  if(/^```(?:text|plaintext|markdown)?\s*$/i.test(value))return false;
  if(/^(?:https?:\/\/|www\.)\S+\s*$/i.test(value))return false;
  if(/^(?:page|sahifa|bet)\s*[:#-]?\s*\d+\s*(?:\/\s*\d+)?\s*$/i.test(value))return false;
  if(/^(?:ISBN|PDF file|File name|Fayl nomi)\s*[:#]/i.test(value))return false;
  if(/^(?:here is (?:the |your )?(?:english |uzbek )?(?:translation|translated text)|translation|translated text|tarjima)\s*[:.!]?\s*$/i.test(value))return false;
  if(value.length<200&&/\((?:roman|novel)\)\s*[.:-]\s*[^.!?]+$/i.test(value))return false;
  if(bookTitle&&normalized(value.replace(/^#+\s*/,''))===bookTitle)return false;
  return true;
 }).join('\n').replace(/^#{1,6}\s+/gm,'').replace(/\*\*([^\n]+?)\*\*/g,'$1').trim();
}
