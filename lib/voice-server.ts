import {voiceOptions} from './voice-options';
import type {User} from './school-types';
export function customVoiceAllowed(u:User){return !!process.env.ODINA_VOICE_USER_ID&&u.id===process.env.ODINA_VOICE_USER_ID&&!!process.env.ODINA_VOICE_ID&&/^voice_[a-zA-Z0-9_-]+$/.test(process.env.ODINA_VOICE_ID)}
export function userVoices(u:User){return customVoiceAllowed(u)?[...voiceOptions,{id:'personal',name:'Mening ovozim'}]:voiceOptions}
