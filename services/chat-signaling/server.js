'use strict';
/**
 * Aegis Chat public-room signaling prototype.
 * Transports only WebRTC session descriptions / ICE, NEVER chat messages.
 * Needs WSS termination, anti-abuse infrastructure and real moderation
 * before any public launch.
 */
const http=require('node:http');
const crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');

const ROOM_IDS=Object.freeze(['general-fr','general-en','gaming-fr','gaming-en','help-fr','help-en']);
const MAX_ROOM=8,MAX_GLOBAL=120,MAX_IP=4;
const PORT=Number(process.env.PORT||8080);
const rooms=new Map(ROOM_IDS.map(name=>[name,new Map()]));
const ips=new Map();
const clients=new Set();
function isValidSignal(data){
  if(!data||typeof data!=='object'||Array.isArray(data)||!['offer','answer','ice'].includes(data.type))return false;
  if(data.type==='ice')return data.candidate===null || Boolean(data.candidate && typeof data.candidate==='object' && typeof data.candidate.candidate==='string' && data.candidate.candidate.length<4096 && typeof data.candidate.sdpMid!=='function');
  return typeof data.sdp==='string' && data.sdp.length>30 && data.sdp.length<70000 && data.sdp.startsWith('v=0');
}
function safeSend(ws,data){if(ws.readyState===WebSocket.OPEN && ws.bufferedAmount<100000)ws.send(JSON.stringify(data));}
function counts(){return Object.fromEntries([...rooms].map(([name,members])=>[name,members.size]));}
function broadcastCounts(){const payload={type:'counts',rooms:counts()};for(const client of clients)safeSend(client,payload);}
function leave(client){
  if(!client.aegisRoom)return;
  const id=client.aegisId,room=client.aegisRoom;
  const members=rooms.get(room);
  members.delete(id);
  client.aegisRoom=null;
  for(const peer of members.values())safeSend(peer,{type:'peer-left',id});
  broadcastCounts();
}
function rate(client){
  const now=Date.now();
  if(now-client.aegisWindow>=10000){client.aegisWindow=now;client.aegisMessages=0;}
  client.aegisMessages++;
  return client.aegisMessages<=80;
}
const server=http.createServer((request,response)=>{
  if(request.method==='GET'&&request.url==='/health'){
    response.writeHead(200,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});
    return response.end(JSON.stringify({ok:true,service:'aegis-chat-signaling',rooms:ROOM_IDS.length}));
  }
  response.writeHead(404,{'content-type':'text/plain','x-content-type-options':'nosniff'});
  response.end('Not found');
});
const wss=new WebSocketServer({server,maxPayload:85000,perMessageDeflate:false});
wss.on('connection',(socket,request)=>{
  const ip=request.socket.remoteAddress||'unknown';
  const active=ips.get(ip)||0;
  if(clients.size>=MAX_GLOBAL||active>=MAX_IP){socket.close(1013,'Too many connections');return;}
  ips.set(ip,active+1);
  clients.add(socket);
  socket.aegisRoom=null;
  socket.aegisId=crypto.randomUUID();
  socket.aegisWindow=Date.now();socket.aegisMessages=0;
  safeSend(socket,{type:'welcome',id:socket.aegisId,rooms:counts()});
  socket.on('message',raw=>{
    if(!rate(socket)){socket.close(1008,'Rate limit');return;}
    let message;
    try{message=JSON.parse(String(raw));}catch{return;}
    if(!message||typeof message!=='object'||Array.isArray(message))return;
    if(message.type==='join'){
      const room=message.room;
      if(!ROOM_IDS.includes(room)){safeSend(socket,{type:'error',reason:'room-invalid'});return;}
      if(socket.aegisRoom)leave(socket);
      const members=rooms.get(room);
      if(members.size>=MAX_ROOM){safeSend(socket,{type:'error',reason:'room-full'});return;}
      const existing=[...members.keys()];
      members.set(socket.aegisId,socket);
      socket.aegisRoom=room;
      safeSend(socket,{type:'joined',room,id:socket.aegisId,peers:existing});
      // Existing members initiate offers; new entrant only answers.
      for(const peer of members.values())if(peer!==socket)safeSend(peer,{type:'peer-joined',id:socket.aegisId});
      broadcastCounts();
      return;
    }
    if(message.type==='leave'){leave(socket);return;}
    if(message.type==='signal' && socket.aegisRoom && typeof message.to==='string' && message.to!==socket.aegisId && isValidSignal(message.data)){
      const peer=rooms.get(socket.aegisRoom).get(message.to);
      if(peer)safeSend(peer,{type:'signal',from:socket.aegisId,data:message.data});
    }
  });
  let disposed=false;
  const cleanup=()=>{
    if(disposed)return;disposed=true;
    leave(socket);clients.delete(socket);
    const n=(ips.get(ip)||1)-1;
    if(n>0)ips.set(ip,n);else ips.delete(ip);
  };
  socket.on('close',cleanup);socket.on('error',cleanup);
});
if(require.main===module){
  server.listen(PORT,()=>process.stdout.write('Aegis Chat signaling listening on '+PORT+'\n'));
}
module.exports={server,wss,ROOM_IDS,rooms,isValidSignal,counts};
