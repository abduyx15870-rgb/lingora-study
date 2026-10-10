const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert');let clock=0;const moduleData={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/book-retry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:moduleData,exports:moduleData.exports,Date:{now:()=>clock},setTimeout:f=>{clock+=1000;f()},Number,Math,Error,Promise});
const {bookStep}=moduleData.exports;const quota=(delay)=>Object.assign(new Error('Quota'),{code:'AI_QUOTA',retryAfterSeconds:delay});
(async()=>{let calls=0,messages=[];assert.equal(await bookStep(async()=>{if(++calls===1)throw quota(3);return 'ready'},text=>messages.push(text)),'ready');assert.equal(calls,2);assert(clock>=3000);assert(messages.every(s=>s.includes('saqlangan')));
for(const error of [quota(undefined),quota(0),quota(999),Object.assign(new Error('Key'),{code:'AI_KEY',retryAfterSeconds:3})]){calls=0;const before=clock;await assert.rejects(()=>bookStep(async()=>{calls++;throw error},()=>{}));assert.equal(calls,1);assert.equal(clock,before)}
calls=0;await assert.rejects(()=>bookStep(async()=>{calls++;throw quota(1)},()=>{}));assert.equal(calls,3);
let cancelled=false;calls=0;await assert.rejects(()=>bookStep(async()=>{calls++;throw quota(3)},()=>{cancelled=true},()=>cancelled),/to‘xtatildi/);assert.equal(calls,1);
console.log('PASS: provider retry delay respected; countdown shown; daily/unknown/zero/oversized quotas never retried; retries bounded; stop cancels wait without new requests.');

 const temporary=code=>Object.assign(new Error('Temporary'),{code});
 for(const error of [...['AI_TIMEOUT','AI_UNAVAILABLE','AI_RESPONSE','VOICE_TIMEOUT','VOICE_RESPONSE','BOOK_TIMEOUT','BOOK_NETWORK','BOOK_RESPONSE'].map(temporary),Object.assign(new Error('Gateway'),{status:502})]){
  let calls=0,messages=[],before=clock;
  assert.equal(await bookStep(async()=>{if(++calls<3)throw error;return 'saved'},s=>messages.push(s)),'saved');
  assert.equal(calls,3);assert(clock-before>=9000);assert(messages.some(s=>s.includes('Avtomatik')));
 }
 for(const code of ['AI_KEY','AI_PERMISSION','AI_ACCOUNT','AI_REQUEST','AI_BLOCKED','AI_TRUNCATED','AI_EMPTY','VOICE_MODEL','VOICE_SIZE']){
  let calls=0;await assert.rejects(()=>bookStep(async()=>{calls++;throw temporary(code)},()=>{}));assert.equal(calls,1);
 }
 for(const status of [400,401,403,404,409,429]){let calls=0;await assert.rejects(()=>bookStep(async()=>{calls++;throw Object.assign(temporary('BOOK_RESPONSE'),{status})},()=>{}));assert.equal(calls,1)}
 calls=0;await assert.rejects(()=>bookStep(async()=>{calls++;throw temporary('AI_TIMEOUT')},()=>{}),/4 marta/);assert.equal(calls,5);
 let stopped=false;calls=0;await assert.rejects(()=>bookStep(async()=>{calls++;throw temporary('BOOK_NETWORK')},()=>{stopped=true},()=>stopped),/to‘xtatildi/);assert.equal(calls,1);
 calls=0;await assert.rejects(()=>bookStep(async()=>{calls++;throw Object.assign(new Error('User cancelled'),{name:'AbortError'})},()=>{}));assert.equal(calls,1);
 console.log('PASS: temporary OCR/translation/audio/network failures recover automatically; bounded backoff; permanent errors stop immediately; stop/abort cancels retries.');
})().catch(e=>{console.error(e);process.exit(1)});
