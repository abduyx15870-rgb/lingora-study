const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert');
function load(fetch){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/course-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:()=>({modeHeaders:()=>({})}),fetch,AbortSignal,Error,JSON,encodeURIComponent});return m.exports.courseFetch}
(async()=>{
 await assert.rejects(()=>load(async()=>{throw new TypeError('Failed to fetch')})('zamon','english',{action:'translatePart'}),e=>e.code==='BOOK_NETWORK');
 await assert.rejects(()=>load(async()=>new Response('',{status:502}))('zamon','english'),e=>e.code==='BOOK_RESPONSE'&&e.status===502);
 await assert.rejects(()=>load(async()=>new Response('',{status:403}))('zamon','english'),e=>e.code==='BOOK_RESPONSE'&&e.status===403);
 await assert.rejects(()=>load(async()=>({text:async()=>{throw Error('Connection closed')}}))('zamon','english'),e=>e.code==='BOOK_NETWORK');
 await assert.rejects(()=>load(async()=>Response.json({error:'Quota',code:'AI_QUOTA',retryAfterSeconds:7},{status:429}))('zamon','english'),e=>e.code==='AI_QUOTA'&&e.retryAfterSeconds===7);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>load(async()=>{throw controller.signal.reason})('zamon','english',undefined,'',controller.signal),e=>e.name==='AbortError'&&!e.code?.startsWith?.('BOOK'));
 assert.deepEqual(await load(async()=>Response.json({text:'Ready'}))('zamon','english'),{text:'Ready'});
 console.log('PASS: network/body/empty gateway errors carry retry classification; HTTP permissions and quota retained; caller cancellation preserved.');
})().catch(e=>{console.error(e);process.exit(1)});
