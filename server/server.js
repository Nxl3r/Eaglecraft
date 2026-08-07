// server/server.js
const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, '..', 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({server});

// simple in-memory client store
const clients = new Map();
let idCounter = 1;

wss.on('connection', (ws)=>{
  const id = (idCounter++).toString();
  ws._id = id;
  console.log('conn',id);

  ws.on('message', (msg)=>{
    let data;
    try{ data = JSON.parse(msg.toString()); }catch(e){return}
    if(data.type === 'join'){
      clients.set(id, {ws, username: data.username || ('Player'+id), skin: data.skin || null});
      // notify others
      broadcast({type:'peer-join', id, username: data.username, skin: data.skin}, id);
      // send list of existing peers to this client
      for(const [otherId,info] of clients){
        if(otherId === id) continue;
        ws.send(JSON.stringify({type:'peer-join', id:otherId, username:info.username, skin:info.skin}));
      }
    }
    if(data.type === 'update'){
      broadcast({type:'peer-update', id, pos:data.pos, rot:data.rot}, id);
    }
  });

  ws.on('close', ()=>{
    clients.delete(id);
    broadcast({type:'peer-leave', id}, id);
    console.log('close',id);
  });
});

function broadcast(obj, exceptId){
  const raw = JSON.stringify(obj);
  for(const [cid, info] of clients){
    if(cid === exceptId) continue;
    try{ info.ws.send(raw); }catch(e){}
  }
}

server.listen(port, ()=>{
  console.log('Server listening on', port);
});
