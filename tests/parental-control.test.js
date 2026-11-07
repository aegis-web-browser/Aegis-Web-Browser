'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {ParentalControl,normalizeDomain,normalizeBlockedDomains,blockedHost}=require('../lib/parental-control');

test('Domain filtering is host-only, not substring, protects subdomains',()=>{
  assert.equal(normalizeDomain('https://www.youtube.com/watch?v=1'),'youtube.com');
  assert.equal(normalizeDomain('bad domain'),null);
  assert.deepEqual(normalizeBlockedDomains('youtube.com\nhttps://www.instagram.com/foo\nyoutube.com'),['youtube.com','instagram.com']);
  assert.equal(blockedHost('https://www.youtube.com/watch?v=3',['youtube.com']),true);
  assert.equal(blockedHost('https://notyoutube.com',['youtube.com']),false);
  assert.equal(blockedHost('https://youtube.com.attacker.test',['youtube.com']),false);
  assert.equal(blockedHost('https://sub.instagram.com',['instagram.com']),true);
});
test('PIN create, validate, configure, unlock and disable enforce native credential',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aegis-parent-test-'));
  let clock=Date.parse('2026-11-06T10:00:00Z');
  try{
    const p=new ParentalControl(path.join(tmp,'parent.json'),()=>clock);
    assert.equal(p.create('123','123').ok,false);
    assert.equal(p.create('123456','123456').ok,true);
    assert.equal(p.create('9999','9999').ok,false);
    assert.equal(p.configure('333333',{dailyLimitMinutes:1}).ok,false);
    assert.equal(p.configure('123456',{dailyLimitMinutes:1,blockedDomains:['youtube.com','instagram.com']}).ok,true);
    assert.equal(p.whyBlocked('https://www.youtube.com/'),'blocked-site');
    assert.equal(p.whyBlocked('https://notyoutube.com/'),null);
    let tick=p.tick(30000,true);assert.equal(tick.expired,false);
    tick=p.tick(30000,true);assert.equal(tick.crossed,true);
    assert.equal(p.whyBlocked('https://example.com/'),'screen-time');
    assert.equal(p.unlock('123456').ok,true);
    assert.equal(p.whyBlocked('https://youtube.com/'),null);
    clock+=16*60000;
    assert.equal(p.whyBlocked('https://example.com/'),'screen-time');
    assert.equal(p.disable('123456').ok,true);
    assert.equal(p.whyBlocked('https://youtube.com/'),null);
    assert.equal(p.data.hash.includes('123456'),false);
    assert.equal(new ParentalControl(path.join(tmp,'parent.json'),()=>clock).status().configured,true);
  } finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('Changing PIN requires old PIN and lockouts throttle repeated guesses',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aegis-parent-test-'));
  let clock=Date.parse('2026-11-06T10:00:00Z');
  try{
    const p=new ParentalControl(path.join(tmp,'p.json'),()=>clock);
    p.create('1234','1234');
    assert.equal(p.changePin('9999','5678','5678').ok,false);
    assert.equal(p.changePin('1234','5678','5678').ok,true);
    for(let i=0;i<5;i++)p.unlock('0000');
    assert.equal(p.status().temporarilyLocked,true);
    assert.equal(p.unlock('5678').ok,false);
    clock+=6*60000;
    assert.equal(p.unlock('5678').ok,true);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
