const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert');let headers={};
const events=[],listeners=new Set();const win={dispatchEvent:event=>{events.push(event.detail)}};
const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/book-jobs.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:id=>id==='./client-mode'?{modeHeaders:()=>headers}:require(id),window:win,CustomEvent:class{constructor(type,options){this.detail=options.detail}},Set,JSON,Error});
const a=m.exports,c={id:'book',userId:'student',center:'zamon',subject:'english',title:'Test book'};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{resolve,promise}};
(async()=>{
 a.setBookJobUser('student');let gate=deferred(),completed=0;
 const unsubscribe=a.subscribeBookJob(()=>listeners.add(a.bookJobSnapshot().status));
 const first=a.runBookJob(c,async(progress,cancelled)=>{progress('1/2');await gate.promise;assert(!cancelled());completed++;progress('2/2')});
 assert(a.bookJobSnapshot().running);await assert.rejects(()=>a.runBookJob(c,async()=>{}),/Boshqa kitob/);
 unsubscribe();gate.resolve();assert.equal(await first,true);assert.equal(completed,1);assert.equal(a.bookJobSnapshot().running,false);assert.equal(events.length,1);
 // Changing sections does not change the context or own the job lifetime.
 gate=deferred();const second=a.runBookJob(c,async(_,cancelled)=>{await gate.promise;assert(cancelled());});headers={'X-Demo-Role':'teacher'};gate.resolve();assert.equal(await second,false);assert.equal(a.bookJobSnapshot().error,false);
 headers={};gate=deferred();const third=a.runBookJob(c,async(_,cancelled)=>{await gate.promise;assert(cancelled())});a.setBookJobUser(null);gate.resolve();assert.equal(await third,false);
 a.setBookJobUser('student');gate=deferred();const fourth=a.runBookJob(c,async(_,cancelled)=>{await gate.promise;assert(cancelled())});a.stopBookJob();assert(a.bookJobSnapshot().stopping);gate.resolve();assert.equal(await fourth,false);
 assert.equal(await a.runBookJob(c,async()=>{throw Error('Provider quota')}),false);assert(a.bookJobSnapshot().error);a.dismissBookJob();assert.equal(a.bookJobSnapshot(),null);
 console.log('PASS: navigation/unsubscribe preserves job; single job prevents duplicate writes; role changes, sign-out and Stop cancel safely; failures visible; completion event emitted.');
})().catch(e=>{console.error(e);process.exit(1)});
