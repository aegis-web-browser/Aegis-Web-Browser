'use strict';
/**
 * Aegis Chat P2P preview: invite-only WebRTC mesh; no server-side discovery.
 * Every inbound AND outbound message is screened locally (rules + local-only AI).
 * Avoid using chat for sensitive communications: peers learn network metadata during ICE.
 */
(function () {
  const safety = window.AegisChatSafety;
  if (!safety) return;
  const $ = id => document.getElementById(id);
  const peers = new Map();
  const blocked = new Set();
  const rate = new Map();
  let activeRoom = 'general-fr', nickname = 'Aegis', opened = false, sending = false, role = null;
  const MAX_PEERS = 5;
  const MAX_HISTORY = 75;
  const locale = () => document.documentElement.lang === 'fr' ? 'fr' : 'en';
  function tr(fr, en) { return locale() === 'fr' ? fr : en; }
  function status(fr, en) { $('hub-chat-status').textContent = tr(fr,en); }
  function appendMessage(name, text, kind) {
    const container = $('hub-chat-history');
    const row = document.createElement('div');
    row.className = 'hub-chat-message hub-chat-' + (kind || 'peer');
    const by = document.createElement('b');
    const body = document.createElement('span');
    by.textContent = name;
    body.textContent = text;
    row.append(by, body);
    container.appendChild(row);
    while (container.children.length > MAX_HISTORY) container.firstChild.remove();
    container.scrollTop = container.scrollHeight;
  }
  function room() { return $('hub-chat-room').value; }
  function refreshPeers() {
    const count = [...peers.values()].filter(p=>p.channel?.readyState === 'open').length;
    $('hub-chat-peers').textContent = tr('Participants connectés : ','Connected peers: ') + count;
    const el = $('hub-chat-peer-list');
    el.replaceChildren();
    for (const [id, peer] of peers) {
      if (peer.channel?.readyState !== 'open') continue;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'hub-small-button';
      button.textContent = tr('Déconnecter ','Disconnect ') + id.slice(0,8) + ' ×';
      button.addEventListener('click', () => { blocked.add(id); disconnectPeer(id); });
      el.appendChild(button);
    }
  }
  function disconnectPeer(id) {
    const p = peers.get(id);
    if (p) {
      try { p.channel?.close(); } catch {}
      try { p.pc?.close(); } catch {}
      peers.delete(id);
      if (peers.size === 0) role = null;
    }
    refreshPeers();
  }
  function disconnectAll() {
    for (const id of [...peers.keys()]) disconnectPeer(id);
    rate.clear();
    role = null;
    $('hub-chat-invite').value = '';
    $('hub-chat-response').value = '';
    appendMessage('Aegis', tr('Salon réinitialisé.','Room reset.'),'system');
  }
  function peerConfig() {
    // STUN is opt-in because sharing ICE candidates can expose IP/network details.
    return {iceServers: $('hub-chat-stun').checked ? [{urls:'stun:stun.l.google.com:19302'}] : []};
  }
  function awaitIce(pc) {
    return new Promise((resolve,reject)=>{
      if (pc.iceGatheringState === 'complete') return resolve();
      let finished = false;
      const end = error => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', check);
        error ? reject(error) : resolve();
      };
      const check = () => { if (pc.iceGatheringState === 'complete') end(); };
      const timer = setTimeout(()=>end(new Error('ICE negotiation timed out')), 16000);
      pc.addEventListener('icegatheringstatechange', check);
      check();
    });
  }
  function peer(id) {
    const pc = new RTCPeerConnection(peerConfig());
    const entry = {id,pc,channel:null,hostSide:false};
    peers.set(id,entry);
    pc.addEventListener('connectionstatechange', () => {
      refreshPeers();
      if (['failed','closed','disconnected'].includes(pc.connectionState)) disconnectPeer(id);
    });
    return entry;
  }
  async function moderate(text) {
    const checked = safety.validateText(text);
    if (!checked.allowed) return {allowed:false, reason:tr('Texte refusé : liens, code, insultes ou contenu sensible.','Rejected: links, code, insults or sensitive content.')};
    // Mandatory on-device AI, fail closed. Never use the general cloud Aegis AI endpoint.
    const ai = await window.api.chatModerateLocal(checked.text);
    if (!ai?.ok || !ai.allowed) return {allowed:false,reason:tr('Modération IA locale indisponible ou refusée : message bloqué.','Local AI unavailable or declined: message blocked.')};
    return {allowed:true,text:checked.text};
  }
  function trackIncoming(id) {
    const now = Date.now();
    const last = rate.get(id) || [];
    const recent = last.filter(t=> now-t < 10000);
    if (recent.length >= 5) return false;
    recent.push(now);
    rate.set(id,recent);
    return true;
  }
  async function incoming(id, event) {
    const p=peers.get(id);
    if (!p || blocked.has(id) || typeof event.data !== 'string') return;
    if (!trackIncoming(id)) { disconnectPeer(id); status('Trop de messages : participant déconnecté.','Rate limit exceeded: peer disconnected.'); return; }
    const data=safety.validatePacket(event.data,activeRoom);
    if (!data) { disconnectPeer(id); status('Message non conforme bloqué.','Invalid message blocked.'); return; }
    try {
      const result=await moderate(data.text);
      if (!result.allowed) { appendMessage('Aegis',tr('Message entrant filtré.','Incoming message filtered.'),'system'); return; }
      if (!peers.has(id) || p.channel?.readyState !== 'open') return;
      appendMessage(data.name,result.text,'peer');
      // One browser acts as the room host: forward approved guest messages
      // to other directly connected guests. Each recipient moderates again.
      // Guests never forward relayed messages, preventing relay loops.
      if (role === 'host' && p.hostSide) {
        const relay = JSON.stringify({v:1,kind:'text',room:activeRoom,name:data.name,text:result.text});
        for (const [otherId,other] of peers) {
          if (otherId !== id && other.channel?.readyState === 'open' && other.channel.bufferedAmount < 4096) other.channel.send(relay);
        }
      }
    } catch {
      status('Modération indisponible, message refusé.','Moderation unavailable; message rejected.');
    }
  }
  function attachChannel(entry, channel) {
    if (entry.channel || channel.label !== 'aegis-chat-v1') {
      channel.close(); return;
    }
    entry.channel = channel;
    channel.binaryType = 'arraybuffer';
    channel.addEventListener('message',event=>incoming(entry.id,event));
    channel.addEventListener('open',()=>{
      refreshPeers();
      appendMessage('Aegis',tr('Participant connecté.','Peer connected.'),'system');
      status('Connexion P2P établie · modération IA locale obligatoire.','P2P connected · local AI moderation required.');
    });
    channel.addEventListener('close',()=>disconnectPeer(entry.id));
  }
  function token(kind,id,description) {
    return JSON.stringify({v:1,kind,room:activeRoom,id,description:{type:description.type,sdp:description.sdp}});
  }
  async function createInvite() {
    if (role === 'guest') return status('Un invité ne peut pas héberger : demande une invitation à l’hôte.','Guests cannot host: request an invite from the room host.');
    if (peers.size >= MAX_PEERS) return status('Salon limité à 5 connexions P2P.','5 P2P peers maximum.');
    const name=safety.validateName($('hub-chat-name').value);
    if (!name) return status('Pseudo non valide.','Invalid nickname.');
    nickname=name; activeRoom=room();role='host';
    const id=crypto.randomUUID(), entry=peer(id);
    entry.hostSide=true;
    try {
      const channel=entry.pc.createDataChannel('aegis-chat-v1',{ordered:true});
      attachChannel(entry,channel);
      const offer=await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      status('Création de l’invitation…','Generating invitation…');
      await awaitIce(entry.pc);
      $('hub-chat-invite').value=token('offer',id,entry.pc.localDescription);
      status('Copie l’invitation et envoie-la à ton contact.','Copy the invite and share it with your contact.');
    } catch(error) { disconnectPeer(id);status('Impossible de créer l’invitation.','Could not create invitation.'); }
  }
  async function acceptInvite() {
    if (role === 'host' || role === 'guest') return status('Quitte le salon avant de rejoindre un autre hôte.','Leave this room before joining a different host.');
    const data=safety.signalValid($('hub-chat-paste').value,'offer');
    if (!data) return status('Invitation invalide.','Invalid invitation.');
    if (peers.size >= MAX_PEERS || peers.has(data.id)) return status('Salon saturé ou invitation déjà utilisée.','Room full or invitation already used.');
    const name=safety.validateName($('hub-chat-name').value);
    if (!name) return status('Pseudo non valide.','Invalid nickname.');
    if (data.room !== room()) $('hub-chat-room').value=data.room;
    nickname=name;activeRoom=data.room;role='guest';
    const entry=peer(data.id);
    entry.pc.addEventListener('datachannel',event=>attachChannel(entry,event.channel));
    try {
      await entry.pc.setRemoteDescription(data.description);
      const answer=await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      status('Création de la réponse…','Generating reply…');
      await awaitIce(entry.pc);
      $('hub-chat-response').value=token('answer',data.id,entry.pc.localDescription);
      status('Envoie cette réponse au créateur du salon.','Send this reply to the room host.');
    } catch(error) { disconnectPeer(data.id); status('Impossible de rejoindre cette invitation.','Cannot join this invitation.'); }
  }
  async function finishInvite() {
    const data=safety.signalValid($('hub-chat-paste').value,'answer');
    if (!data || data.room !== activeRoom) return status('Réponse invalide ou mauvais salon.','Invalid reply or wrong room.');
    const entry=peers.get(data.id);
    if (!entry || entry.pc.signalingState !== 'have-local-offer') return status('Invitation correspondante introuvable.','No matching pending invitation.');
    try {
      await entry.pc.setRemoteDescription(data.description);
      $('hub-chat-paste').value='';
      status('Réponse acceptée · connexion en cours…','Reply accepted · connecting…');
    } catch {
      disconnectPeer(data.id);status('Réponse incompatible.','Incompatible reply.');
    }
  }
  async function send() {
    if (sending) return;
    const text=$('hub-chat-input').value;
    const name=safety.validateName($('hub-chat-name').value);
    if (!name) return status('Pseudo invalide.','Invalid nickname.');
    const channels=[...peers.values()].map(p=>p.channel).filter(c=>c?.readyState === 'open');
    if (!channels.length) return status('Connecte au moins un participant avant d’écrire.','Connect at least one peer first.');
    sending=true;$('hub-chat-send').disabled=true;
    status('Vérification IA locale…','Checking with local AI…');
    try {
      const decision=await moderate(text);
      if (!decision.allowed) {status(decision.reason,decision.reason);return;}
      const packet=JSON.stringify({v:1,kind:'text',room:activeRoom,name,text:decision.text});
      for(const channel of channels){
        if(channel.readyState==='open' && channel.bufferedAmount < 4096)channel.send(packet);
      }
      appendMessage(name,decision.text,'me');
      $('hub-chat-input').value='';
      status('Message transmis aux participants connectés.','Sent to connected peers.');
    }catch{
      status('Modération locale indisponible. Message non envoyé.','Local moderation unavailable. Message not sent.');
    }finally{sending=false;$('hub-chat-send').disabled=false;}
  }
  function init() {
    if (opened) return; opened=true;
    $('hub-chat-make').addEventListener('click',createInvite);
    $('hub-chat-join').addEventListener('click',acceptInvite);
    $('hub-chat-confirm').addEventListener('click',finishInvite);
    $('hub-chat-send').addEventListener('click',send);
    $('hub-chat-close-peers').addEventListener('click',disconnectAll);
    $('hub-chat-room').addEventListener('change',()=>{disconnectAll();activeRoom=room();});
    $('hub-chat-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    $('hub-chat-name').value='Aegis-'+Math.floor(Math.random()*9000+1000);
    $('hub-chat-invite-copy').addEventListener('click',async()=>{
      const value=$('hub-chat-invite').value;
      if(value) {try {await navigator.clipboard.writeText(value);status('Invitation copiée.','Invite copied.')}catch{$('hub-chat-invite').select();status('Copie avec Ctrl+C.','Copy with Ctrl+C.');}}
    });
    $('hub-chat-response-copy').addEventListener('click',async()=>{
      const value=$('hub-chat-response').value;
      if(value){try{await navigator.clipboard.writeText(value);status('Réponse copiée.','Reply copied.')}catch{$('hub-chat-response').select();status('Copie avec Ctrl+C.','Copy with Ctrl+C.');}}
    });
    window.addEventListener('beforeunload',()=>{for(const id of [...peers.keys()])disconnectPeer(id);});
    status('Salons privés sur invitation. IA locale obligatoire pour chaque message.','Private invite-only rooms. Local AI required for every message.');
  }
  window.AegisChat={init,disconnectAll};
})();
