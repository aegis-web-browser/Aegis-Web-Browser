'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const ITERATIONS=210000;
const UNLOCK_MS=15*60*1000;
const MAX_ATTEMPTS=5;
const LOCKOUT_MS=5*60*1000;
function parisDay(now=Date.now()){
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
}
function normalizeDomain(value){
  if(typeof value!=='string')return null;
  const raw=value.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split(/[/?#]/)[0];
  if(raw.length>253||raw.length<4||raw.includes(':'))return null;
  if(!/^[a-z0-9.-]+$/.test(raw)||!raw.includes('.')||raw.startsWith('.')||raw.endsWith('.')||raw.includes('..'))return null;
  if(raw.split('.').some(label=>label.length>63||label.startsWith('-')||label.endsWith('-')))return null;
  return raw;
}
function normalizeBlockedDomains(list){
  const values=Array.isArray(list)?list:(typeof list==='string'?list.split(/[\n,;\s]+/):[]);
  return [...new Set(values.map(normalizeDomain).filter(Boolean))].slice(0,120);
}
function blockedHost(url, domains){
  try{
    const dest=new URL(url);
    if(!['http:','https:'].includes(dest.protocol))return false;
    const host=dest.hostname.toLowerCase().replace(/^www\./,'');
    return domains.some(domain=>host===domain||host.endsWith('.'+domain));
  }catch{return false;}
}
class ParentalControl {
  constructor(file,now=()=>Date.now()){
    this.file=file;
    this.now=now;
    this.unlockUntil=0;this.failures=0;this.lockedUntil=0;
    this.data={enabled:false,salt:'',hash:'',dailyLimitMinutes:0,blockedDomains:[],day:parisDay(now()),usedMs:0};
    this.read();
  }
  read(){
    try{
      const data=JSON.parse(fs.readFileSync(this.file,'utf8'));
      if(data&&typeof data==='object'){
        this.data.enabled=data.enabled===true;
        this.data.salt=typeof data.salt==='string'?data.salt:'';
        this.data.hash=typeof data.hash==='string'?data.hash:'';
        this.data.dailyLimitMinutes=Math.max(0,Math.min(1440,Math.floor(Number(data.dailyLimitMinutes)||0)));
        this.data.blockedDomains=normalizeBlockedDomains(data.blockedDomains);
        this.data.day=typeof data.day==='string'?data.day:'';
        this.data.usedMs=Math.max(0,Math.min(30*3600000,Number(data.usedMs)||0));
      }
    }catch{}
    this.ensureDay();
  }
  save(){
    fs.mkdirSync(path.dirname(this.file),{recursive:true});
    const tmp=this.file+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify(this.data,null,2),{encoding:'utf8',mode:0o600});
    fs.renameSync(tmp,this.file);
  }
  ensureDay(){
    const today=parisDay(this.now());
    if(this.data.day!==today){this.data.day=today;this.data.usedMs=0;try{this.save();}catch{}}
  }
  static validPin(pin){
    return typeof pin==='string'&&/^[0-9]{4,16}$/.test(pin);
  }
  digest(pin,salt){
    return crypto.pbkdf2Sync(pin,Buffer.from(salt,'hex'),ITERATIONS,32,'sha256').toString('hex');
  }
  verify(pin){
    if(this.lockedUntil>this.now())return false;
    if(!this.data.hash||!this.data.salt||!ParentalControl.validPin(pin))return false;
    const found=this.digest(pin,this.data.salt);
    const allowed=crypto.timingSafeEqual(Buffer.from(found,'hex'),Buffer.from(this.data.hash,'hex'));
    if(allowed){this.failures=0;this.lockedUntil=0;return true;}
    this.failures++;
    if(this.failures>=MAX_ATTEMPTS){this.lockedUntil=this.now()+LOCKOUT_MS;this.failures=0;}
    return false;
  }
  create(pin,confirm){
    if(this.data.hash)return {ok:false,error:'already-configured'};
    if(!ParentalControl.validPin(pin)||pin!==confirm)return {ok:false,error:'pin-format-or-mismatch'};
    this.data.salt=crypto.randomBytes(16).toString('hex');
    this.data.hash=this.digest(pin,this.data.salt);
    this.data.enabled=true;
    this.save();
    return {ok:true,status:this.status()};
  }
  configure(pin,payload={}){
    if(!this.verify(pin))return {ok:false,error:'wrong-pin'};
    this.data.enabled=true;
    this.data.dailyLimitMinutes=Math.max(0,Math.min(1440,Math.floor(Number(payload.dailyLimitMinutes)||0)));
    this.data.blockedDomains=normalizeBlockedDomains(payload.blockedDomains);
    this.save();
    return {ok:true,status:this.status()};
  }
  changePin(oldPin,newPin,confirm){
    if(!this.verify(oldPin))return {ok:false,error:'wrong-pin'};
    if(!ParentalControl.validPin(newPin)||newPin!==confirm)return {ok:false,error:'pin-format-or-mismatch'};
    this.data.salt=crypto.randomBytes(16).toString('hex');
    this.data.hash=this.digest(newPin,this.data.salt);
    this.unlockUntil=0;
    this.save();
    return {ok:true,status:this.status()};
  }
  unlock(pin){
    if(!this.verify(pin))return {ok:false,error:'wrong-pin'};
    this.unlockUntil=this.now()+UNLOCK_MS;
    return {ok:true,status:this.status()};
  }
  disable(pin){
    if(!this.verify(pin))return {ok:false,error:'wrong-pin'};
    this.data.enabled=false;
    this.unlockUntil=0;
    this.save();
    return {ok:true,status:this.status()};
  }
  enabled(){return this.data.enabled===true&&Boolean(this.data.hash);}
  unlocked(){return this.enabled()&&this.unlockUntil>this.now();}
  expired(){
    this.ensureDay();
    return this.enabled()&&this.data.dailyLimitMinutes>0&&this.data.usedMs>=this.data.dailyLimitMinutes*60000&&!this.unlocked();
  }
  whyBlocked(url){
    this.ensureDay();
    if(!this.enabled()||this.unlocked())return null;
    if(this.data.dailyLimitMinutes>0&&this.data.usedMs>=this.data.dailyLimitMinutes*60000)return 'screen-time';
    return blockedHost(url,this.data.blockedDomains)?'blocked-site':null;
  }
  tick(elapsedMs,focused){
    this.ensureDay();
    if(!this.enabled()||this.unlocked()||!focused)return {expired:this.expired()};
    const previous=this.expired();
    this.data.usedMs+=Math.max(0,Math.min(30000,Math.floor(Number(elapsedMs)||0)));
    this.save();
    return {expired:this.expired(),crossed:!previous&&this.expired()};
  }
  status(){
    this.ensureDay();
    const limit=this.data.dailyLimitMinutes;
    return {
      enabled:this.enabled(),
      configured:Boolean(this.data.hash),
      dailyLimitMinutes:limit,
      usedMinutes:Math.floor(this.data.usedMs/60000),
      remainingMinutes:limit?Math.max(0,Math.ceil((limit*60000-this.data.usedMs)/60000)):null,
      blockedDomains:[...this.data.blockedDomains],
      temporarilyUnlocked:this.unlocked(),
      unlockUntil:this.unlocked()?this.unlockUntil:null,
      expiresNow:this.expired(),
      temporarilyLocked:this.lockedUntil>this.now()
    };
  }
}
module.exports={ParentalControl,parisDay,normalizeDomain,normalizeBlockedDomains,blockedHost};
