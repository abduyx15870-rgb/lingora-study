import {db} from './firebase-store.mjs';
// Explicit maintenance command: revoke every Owner login, preserving accounts and learning data.
try {
 const owners=await db('school_users','GET',undefined,'role=eq.owner');
 let removed=0;
 for(const owner of owners){
  if(!owner.id)throw new Error('Owner account ID is missing. No unfiltered delete was attempted.');
  const query='user_id=eq.'+encodeURIComponent(owner.id);
  const sessions=await db('school_sessions','GET',undefined,query);
  await db('school_sessions','DELETE',undefined,query);
  removed+=sessions.length;
 }
 console.log(`Owner kirishlari tozalandi: ${removed} ta sessiya. Endi Owner kodi bilan qayta kiring.`);
 console.log('Boshqa hisoblar, o‘quvchilar va o‘qish natijalari o‘zgartirilmadi.');
} catch(e) {console.error('Owner kirishlarini tozalash tugamadi:',e.message);process.exitCode=1;}
