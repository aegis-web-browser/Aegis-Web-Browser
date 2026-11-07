'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {server,wss,ROOM_IDS,rooms,isValidSignal,counts}=require('../server');

test('only the six curated bilingual rooms exist',()=>{
  assert.deepEqual(ROOM_IDS, ['general-fr','general-en','gaming-fr','gaming-en','help-fr','help-en']);
  assert.equal(Object.keys(counts()).length,6);
  assert.equal(rooms.get('general-fr').size,0);
});
test('signaling only accepts bounded WebRTC offer/answer/ICE payloads',()=>{
  const offer={type:'offer',sdp:'v=0\r\n'+'a'.repeat(90)};
  assert.equal(isValidSignal(offer),true);
  assert.equal(isValidSignal({...offer,type:'answer'}),true);
  assert.equal(isValidSignal({...offer,type:'text',message:'hello'}),false);
  assert.equal(isValidSignal({...offer,sdp:'javascript:alert(1)'}),false);
  assert.equal(isValidSignal({...offer,sdp:'v=0'+'x'.repeat(80000)}),false);
  assert.equal(isValidSignal({type:'ice',candidate:null}),true);
  assert.equal(isValidSignal({type:'ice',candidate:{candidate:'candidate:1',sdpMid:'0'}}),true);
  assert.equal(isValidSignal({type:'ice',candidate:{candidate:'x'.repeat(5000)}}),false);
});
test('HTTP health endpoint returns service status and unknown routes return 404',async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  try{
    const response=await fetch('http://127.0.0.1:'+port+'/health');
    assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.ok,true);
    const invalid=await fetch('http://127.0.0.1:'+port+'/other');
    assert.equal(invalid.status,404);
  }finally{
    await new Promise(resolve=>wss.close(resolve));
    await new Promise(resolve=>server.close(resolve));
  }
});
