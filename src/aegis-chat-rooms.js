'use strict';
/* Public room discovery + automatic WebRTC signaling.
 * Signaling service never transports message text; peer-to-peer data channels do.
 * Strict local moderation on BOTH sending and receiving, otherwise fail closed.
 */
(function(){
  const safety=window.AegisChatSafety;
  if(!safety)return;
  const $=id=>document.getElementById(id);
  const ROOM_NAMES={
    'general-fr':['🇫🇷','Général','Discussions françaises'],
    'general-en':['🇬🇧','General','English discussion'],
    'gaming-fr':['🎮','Gaming FR','Jeux et entraide'],
    'gaming-en':['🎮','Gaming EN','Games and gaming'],
    'help-fr':['💬','Entraide FR','Questions et conseils'],
    'help-en':['💬','Help EN','Questions and advice']
  };
  const MAX_PEERS=7, LIMIT=6;
  let socket=null,room=null,selfId=null,endpoint='',generation=0,busy=false,peerCount={};
  const peers=new Map(), timestamps=new Map();
  const locale=()=>document.documentElement.lang.startsWith('fr')?'fr':'en';
  const label=(fr,en)=>locale()==='fr'?fr:en;
  const stored=()=>{try{return localStorage.getItem('aegis-chat-signaling-url')||'';}catch{return '';}};
  function validEndpoint(raw){
    try{const u=new URL(String(raw||''));return u.protocol==='wss:'&&!u.username&&!u.password&&!u.hash&&!u.search&&u.pathname.length<160&&u.hostname.length<180?u.href:null;}catch{return null;}
  }
  function state(fr,en){$('aegis-chat-status').textContent=label(fr,en);}
  function disconnect(){
    generation++;
    if(socket){try{socket.close(1000,'Leaving room');}catch{}socket=null;}
    for(const peer of peers.values()){try{peer.channel?.close();}catch{}try{peer.pc.close();}catch{}}
    peers.clear();timestamps.clear();room=null;selfId=null;
    $('aegis-chat-leave').disabled=true;
    $('aegis-chat-send').disabled=true;
    $('aegis-chat-room-title').textContent=label('Choisis un salon','Choose a room');
    $('aegis-chat-participants').textContent='';
    drawRooms();
  }
  function drawRooms(){
    const list=$('aegis-chat-rooms');list.replaceChildren();
    for(const [id,meta] of Object.entries(ROOM_NAMES)){
      const button=document.createElement('button');
      button.type='button';button.className='aegis-room'+(id===room?' active':'');
      const symbol=document.createElement('span');symbol.textContent=meta[0];
      const info=document.createElement('span');info.className='aegis-room-name';
      const title=document.createElement('b');title.textContent=meta[1];
      const sub=document.createElement('small');sub.textContent=meta[2];
      info.append(title,sub);
      const count=document.createElement('em');count.textContent=Number(peerCount[id]||0)+' / 8';
      button.append(symbol,info,count);
      button.addEventListener('click',()=>join(id));
      list.appendChild(button);
    }
  }
  function append(name,text,kind){
    const log=$('aegis-chat-log');
    const row=document.createElement('div');row.className='aegis-chat-bubble '+(kind||'peer');
    const author=document.createElement('b');author.textContent=name;
    const body=document.createElement('span');body.textContent=text;
    row.append(author,body);log.appendChild(row);
    while(log.childElementCount>90)log.firstChild.remove();
    log.scrollTop=log.scrollHeight;
  }
  async function moderate(message){
    const lexical=safety.validateText(message);
    if(!lexical.allowed)return null;
    try{
      const verdict=await window.api.chatModerateLocal(lexical.text);
      return verdict?.ok&&verdict.allowed?lexical.text:null;
    }catch{return null;}
  }
  function throttled(id){
    const now=Date.now();const last=(timestamps.get(id)||[]).filter(t=>now-t<10000);
    if(last.length>=LIMIT)return true;
    last.push(now);timestamps.set(id,last);return false;
  }
  function updatePeers(){
    const count=[...peers.values()].filter(p=>p.channel?.readyState==='open').length;
    $('aegis-chat-participants').textContent=label('Participants P2P : ','P2P peers: ')+count;
    $('aegis-chat-send').disabled=!room||!count||busy;
  }
  function dropPeer(id){
    const entry=peers.get(id);if(!entry)return;
    peers.delete(id);timestamps.delete(id);
    try{entry.channel?.close();}catch{}
    try{entry.pc.close();}catch{}
    updatePeers();
  }
  async function inbound(id,event){
    if(!peers.has(id)||typeof event.data!=='string'||throttled(id)){dropPeer(id);return;}
    const packet=safety.validatePacket(event.data,room);
    if(!packet){dropPeer(id);return;}
    const approved=await moderate(packet.text);
    if(!approved)return;
    if(!room||!peers.has(id))return;
    append(packet.name,approved,'peer');
  }
  function attachChannel(id,channel){
    const entry=peers.get(id);
    if(!entry||entry.channel||channel.label!=='aegis-room-chat-v2'){try{channel.close();}catch{}return;}
    entry.channel=channel;
    channel.addEventListener('message',event=>inbound(id,event));
    channel.addEventListener('open',()=>{updatePeers();state('Connexion P2P établie','P2P connection established');});
    channel.addEventListener('close',()=>dropPeer(id));
  }
  function sendSignal(to,data){
    if(!socket||socket.readyState!==WebSocket.OPEN)return;
    socket.send(JSON.stringify({type:'signal',to,data}));
  }
  function makePeer(id,offerer){
    if(peers.has(id))return peers.get(id);
    if(peers.size>=MAX_PEERS)return null;
    const pc=new RTCPeerConnection({
      iceServers:[{urls:'stun:stun.l.google.com:19302'}]
    });
    const entry={pc,channel:null,pending:[],remoteReady:false};
    peers.set(id,entry);
    pc.addEventListener('icecandidate',event=>{
      if(event.candidate)sendSignal(id,{type:'ice',candidate:event.candidate.toJSON()});
    });
    pc.addEventListener('connectionstatechange',()=>{
      if(['failed','closed','disconnected'].includes(pc.connectionState))dropPeer(id);
    });
    pc.addEventListener('datachannel',event=>attachChannel(id,event.channel));
    if(offerer){
      const ch=pc.createDataChannel('aegis-room-chat-v2',{ordered:true});
      attachChannel(id,ch);
    }
    return entry;
  }
  async function flushIce(entry){
    if(!entry.remoteReady)return;
    while(entry.pending.length){
      const candidate=entry.pending.shift();
      try{await entry.pc.addIceCandidate(candidate);}catch{}
    }
  }
  async function onSignal(id,data){
    if(!data||!['offer','answer','ice'].includes(data.type))return;
    if(data.type==='offer'&&typeof data.sdp==='string'&&data.sdp.length<70000&&data.sdp.startsWith('v=0')){
      const entry=makePeer(id,false);if(!entry)return;
      try{
        await entry.pc.setRemoteDescription({type:'offer',sdp:data.sdp});
        entry.remoteReady=true;await flushIce(entry);
        const answer=await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        sendSignal(id,{type:'answer',sdp:entry.pc.localDescription.sdp});
      }catch{dropPeer(id);}
    }else if(data.type==='answer'&&typeof data.sdp==='string'&&data.sdp.length<70000&&data.sdp.startsWith('v=0')){
      const entry=peers.get(id);if(!entry)return;
      try{
        await entry.pc.setRemoteDescription({type:'answer',sdp:data.sdp});
        entry.remoteReady=true;await flushIce(entry);
      }catch{dropPeer(id);}
    }else if(data.type==='ice'&&data.candidate&&typeof data.candidate.candidate==='string'&&data.candidate.candidate.length<4096){
      const entry=peers.get(id);if(!entry)return;
      if(entry.pending.length>30){dropPeer(id);return;}
      if(!entry.remoteReady)entry.pending.push(data.candidate);
      else try{await entry.pc.addIceCandidate(data.candidate);}catch{}
    }
  }
  async function onPeerJoined(id){
    const entry=makePeer(id,true);
    if(!entry)return;
    try{
      const offer=await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      sendSignal(id,{type:'offer',sdp:entry.pc.localDescription.sdp});
    }catch{dropPeer(id);}
  }
  function join(id){
    if(!Object.hasOwn(ROOM_NAMES,id))return;
    const url=validEndpoint($('aegis-chat-server').value.trim()||stored());
    if(!url){
      state('Configure un serveur de signalisation WSS pour rejoindre les salons.','Configure a WSS signaling server to join public rooms.');
      $('aegis-chat-server').focus();return;
    }
    disconnect();room=id;endpoint=url;
    try{localStorage.setItem('aegis-chat-signaling-url',url);}catch{}
    $('aegis-chat-room-title').textContent=ROOM_NAMES[id][0]+' '+ROOM_NAMES[id][1];
    $('aegis-chat-leave').disabled=false;
    $('aegis-chat-log').replaceChildren();
    drawRooms();
    state('Connexion au salon…','Connecting to room…');
    const attempt=++generation;
    let ws;
    try{ws=new WebSocket(url);}catch{state('Adresse WSS incorrecte.','Invalid WSS endpoint.');return;}
    socket=ws;
    ws.addEventListener('open',()=>{
      if(generation===attempt)ws.send(JSON.stringify({type:'join',room:id}));
    });
    ws.addEventListener('message',async event=>{
      if(generation!==attempt||typeof event.data!=='string'||event.data.length>100000)return;
      let msg;try{msg=JSON.parse(event.data);}catch{return;}
      if(msg.type==='welcome'){selfId=msg.id;if(msg.rooms&&typeof msg.rooms==='object'){peerCount=msg.rooms;drawRooms();}}
      if(msg.type==='counts'&&msg.rooms&&typeof msg.rooms==='object'){peerCount=msg.rooms;drawRooms();}
      if(msg.type==='joined'&&msg.room===id){
        selfId=msg.id;state('Salon rejoint · connexion aux autres participants…','Joined room · connecting to other peers…');
        append('Aegis',label('Salon rejoint. Les messages exigent une validation IA locale.','Joined. Every message requires local AI approval.'),'system');
      }
      if(msg.type==='peer-joined'&&typeof msg.id==='string')onPeerJoined(msg.id);
      if(msg.type==='peer-left'&&typeof msg.id==='string')dropPeer(msg.id);
      if(msg.type==='signal'&&typeof msg.from==='string')onSignal(msg.from,msg.data);
      if(msg.type==='error')state('Service : '+String(msg.reason||'error'),'Service: '+String(msg.reason||'error'));
    });
    ws.addEventListener('close',()=>{
      if(generation===attempt){for(const peerId of [...peers.keys()])dropPeer(peerId);
        state('Service déconnecté. Réessaie en cliquant sur un salon.','Service disconnected. Click a room to retry.');}
    });
    ws.addEventListener('error',()=>{if(generation===attempt)state('Serveur inaccessible. Vérifie son adresse et son déploiement.','Server unavailable. Check address and deployment.');});
  }
  async function send(){
    if(busy||!room)return;
    const name=safety.validateName($('aegis-chat-nick').value.trim());
    if(!name){state('Pseudo invalide.','Invalid nickname.');return;}
    const text=$('aegis-chat-input').value;
    busy=true;updatePeers();state('Filtrage IA locale en cours…','Checking local AI…');
    try{
      const approved=await moderate(text);
      if(!approved){state('Message refusé ou IA locale indisponible.','Blocked or local AI unavailable.');return;}
      const packet=JSON.stringify({v:1,kind:'text',room,name,text:approved});
      let sent=0;
      for(const peer of peers.values())if(peer.channel?.readyState==='open'&&peer.channel.bufferedAmount<8192){peer.channel.send(packet);sent++;}
      if(sent){append(name,approved,'me');$('aegis-chat-input').value='';state(label('Envoyé à ','Sent to ')+sent+label(' participant(s).',' peer(s).'),'');}
      else state('Aucun participant P2P connecté.','No P2P peers connected.');
    }finally{busy=false;updatePeers();}
  }
  function init(){
    const rooms=$('aegis-chat-rooms');if(!rooms)return;
    $('aegis-chat-server').value=stored();
    drawRooms();
    $('aegis-chat-leave').addEventListener('click',()=>{disconnect();state('Salon quitté.','Left room.');});
    $('aegis-chat-send').addEventListener('click',send);
    $('aegis-chat-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send();}});
    $('aegis-chat-server').addEventListener('change',()=>{
      const value=validEndpoint($('aegis-chat-server').value.trim());
      if(value)try{localStorage.setItem('aegis-chat-signaling-url',value);}catch{}
    });
    $('aegis-chat-nick').value='Aegis-'+Math.floor(Math.random()*9000+1000);
    $('aegis-chat-ai').addEventListener('click',()=>{
      window.AegisFeatures?.closeChat();
      if(typeof openPanel==='function')openPanel('ai');
    });
    window.addEventListener('beforeunload',disconnect);
    window.AegisRooms={disconnect,join};
  }
  init();
})();
