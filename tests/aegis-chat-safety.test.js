'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const safety=require('../src/aegis-chat-safety');

test('bilingual ordinary messages are allowed',()=>{
  for(const text of ['Salut, comment ca va ?', 'Hello everyone!', 'I like playing games', 'Bonjour aux joueurs de ce salon.']) {
    assert.equal(safety.validateText(text).allowed,true,text);
  }
});
test('HTML, links, script-like text, and binary controls are blocked',()=>{
  const blocked=['<script>alert(1)</script>','<img src=x onerror=alert(1)>','https://example.com','www.example.com','javascript:alert(1)','test\u0000broken',String.fromCharCode(96,96,96)+'js','a'.repeat(120)];
  for(const text of blocked) assert.equal(safety.validateText(text).allowed,false,text);
});
test('strict local pre-filter blocks common abusive and explicit content in French and English',()=>{
  for(const text of ['fuck off','p0rn','putain de merde','You are an idiot','hentai content']) {
    assert.equal(safety.validateText(text).allowed,false,text);
  }
});
test('oversized, empty, non-string and obfuscated payloads rejected',()=>{
  for(const value of ['', '  ',42,{},'a'.repeat(281),'hi\u200bthere']) {
    assert.equal(safety.validateText(value).allowed,false);
  }
});
test('valid packets are plain-text and room-bound with fixed schema',()=>{
  const packet=JSON.stringify({v:1,kind:'text',room:'general-fr',name:'Player-1',text:'Bonjour !'});
  const parsed=safety.validatePacket(packet,'general-fr');
  assert.equal(parsed.text,'Bonjour !');
  assert.equal(safety.validatePacket(packet,'general-en'),null);
  assert.equal(safety.validatePacket(JSON.stringify({v:1,kind:'file',room:'general-fr',name:'Player-1',text:'Bonjour !'}),'general-fr'),null);
  assert.equal(safety.validatePacket(JSON.stringify({v:1,kind:'text',room:'general-fr',name:'Player-1',text:'Bonjour !',html:'<script>alert(1)</script>'}),'general-fr'),null);
  assert.equal(safety.validatePacket('x'.repeat(1801),'general-fr'),null);
});
test('nickname checks and signals reject corrupted and unknown room values',()=>{
  assert.equal(safety.validateName('Safe-user'), 'Safe-user');
  assert.equal(safety.validateName('<img src=x>'), null);
  assert.equal(safety.validateName('a'.repeat(25)), null);
  const sample={v:1,kind:'offer',room:'general-fr',id:'abcdeff1-1234-4444-8888-111111111111',description:{type:'offer',sdp:'v=0\r\n'+'a'.repeat(50)}};
  assert.ok(safety.signalValid(JSON.stringify(sample),'offer'));
  assert.equal(safety.signalValid(JSON.stringify(sample),'answer'),null);
  assert.equal(safety.signalValid(JSON.stringify({...sample,room:'unknown-room'}),'offer'),null);
  assert.equal(safety.signalValid(JSON.stringify({...sample,description:{type:'answer',sdp:sample.description.sdp}}),'offer'),null);
});
