import 'server-only';
import {AsyncLocalStorage} from 'node:async_hooks';
export type CenterScope={subjectId?:string;rawReads?:Map<string,Promise<any>>;centerId:string|null;owner:boolean;actor?:{id:string;role:string};effectiveRole?:string;effectiveUserId?:string;groupIds?:string[];demoKey?:string;demo?:boolean};
export const centerContext=new AsyncLocalStorage<CenterScope>();
export function schoolScope<T>(work:()=>Promise<T>){return centerContext.run({centerId:null,owner:false},work)}
export const legacyCenter='zamon';
