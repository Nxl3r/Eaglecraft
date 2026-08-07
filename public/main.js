// Minimal Eaglecraft client (public/main.js)
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio || 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// Simple ground made of boxes
const ground = new THREE.Group();
const boxGeo = new THREE.BoxGeometry(1,1,1);
const grassMat = new THREE.MeshStandardMaterial({color:0x66bb66});
for(let x=-8;x<=8;x++){
  for(let z=-8;z<=8;z++){
    const m = new THREE.Mesh(boxGeo, grassMat);
    m.position.set(x, -1, z);
    ground.add(m);
  }
}
scene.add(ground);

// Player mesh
let playerSkinURL = null;
const playerMat = new THREE.MeshStandardMaterial({color:0xffcc99});
const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.8,0.5), playerMat);
playerMesh.position.set(0,0.9,0);
scene.add(playerMesh);

// Other players
const peers = new Map();

// Controls
let isPointerLocked = false;
let yaw = 0, pitch = 0;
const keys = {};
let velocity = new THREE.Vector3();

function onKey(e){ keys[e.code] = e.type === 'keydown'; }
window.addEventListener('keydown', onKey);
window.addEventListener('keyup', onKey);

// Pointer lock
const lockBtn = document.getElementById('lock');
lockBtn.addEventListener('click', ()=>{
  canvas.requestPointerLock?.();
});
document.addEventListener('pointerlockchange', ()=>{
  isPointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener('mousemove', (ev)=>{
  if(!isPointerLocked) return;
  const movementX = ev.movementX || ev.mozMovementX || ev.webkitMovementX || 0;
  const movementY = ev.movementY || ev.mozMovementY || ev.webkitMovementY || 0;
  yaw -= movementX * 0.002;
  pitch -= movementY * 0.002;
  pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
});

// Mobile detection & controls
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints>0;
const mobileControls = document.getElementById('mobile-controls');
if(isTouch) mobileControls.classList.remove('hidden');

const moveState = {f:0,b:0,l:0,r:0,j:0};
['m-forward','m-back','m-left','m-right','m-jump'].forEach(id=>{
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('touchstart', (e)=>{ e.preventDefault(); moveState[id.split('-')[1][0]] = 1; });
  el.addEventListener('touchend', (e)=>{ e.preventDefault(); moveState[id.split('-')[1][0]] = 0; });
});

// Skin upload & username
const usernameInput = document.getElementById('username');
const skinFile = document.getElementById('skinfile');
skinFile.addEventListener('change', ()=>{
  const f = skinFile.files && skinFile.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    playerSkinURL = reader.result;
    const tex = new THREE.TextureLoader().load(playerSkinURL);
    tex.magFilter = THREE.NearestFilter;
    playerMat.map = tex; playerMat.needsUpdate = true;
    localStorage.setItem('eaglecraft_skin', playerSkinURL);
  };
  reader.readAsDataURL(f);
});

// Restore skin/username
if(localStorage.getItem('eaglecraft_skin')){
  playerSkinURL = localStorage.getItem('eaglecraft_skin');
  const tex = new THREE.TextureLoader().load(playerSkinURL);
  tex.magFilter = THREE.NearestFilter;
  playerMat.map = tex; playerMat.needsUpdate = true;
}
if(localStorage.getItem('eaglecraft_name')) usernameInput.value = localStorage.getItem('eaglecraft_name');
usernameInput.addEventListener('change', ()=> localStorage.setItem('eaglecraft_name', usernameInput.value));

// Simple WebSocket multiplayer client
let ws = null;
const serverInput = document.getElementById('serverUrl');
const connectBtn = document.getElementById('connect');
connectBtn.addEventListener('click', ()=>{
  if(ws){ ws.close(); ws = null; connectBtn.textContent = 'Connect'; return; }
  const url = serverInput.value || 'ws://localhost:3000';
  ws = new WebSocket(url);
  ws.addEventListener('open', ()=>{
    console.log('ws open');
    connectBtn.textContent = 'Disconnect';
    const msg = {type:'join', username: usernameInput.value || 'Player', skin: playerSkinURL || null};
    ws.send(JSON.stringify(msg));
  });
  ws.addEventListener('message', (ev)=>{
    try{
      const data = JSON.parse(ev.data);
      handleNet(data);
    }catch(e){console.warn('bad msg', e)}
  });
  ws.addEventListener('close', ()=>{ peers.forEach(p=>scene.remove(p.mesh)); peers.clear(); connectBtn.textContent = 'Connect'; ws = null; });
});

function handleNet(data){
  if(data.type==='peer-join'){
    if(peers.has(data.id)) return;
    const mat = new THREE.MeshStandardMaterial({color:0xffffff});
    if(data.skin){
      const tex = new THREE.TextureLoader().load(data.skin);
      tex.magFilter = THREE.NearestFilter; mat.map = tex;
    } else mat.color.setHex(Math.random()*0xffffff);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.8,0.5), mat);
    scene.add(mesh);
    peers.set(data.id, {id:data.id, username:data.username, mesh});
  }
  if(data.type==='peer-leave'){
    const p=peers.get(data.id); if(p){ scene.remove(p.mesh); peers.delete(data.id);} 
  }
  if(data.type==='peer-update'){
    const p = peers.get(data.id); if(p){ p.mesh.position.set(data.pos.x,data.pos.y,data.pos.z); p.mesh.rotation.y = data.rot.y; }
  }
}

// Send updates periodically
setInterval(()=>{
  if(!ws || ws.readyState!==WebSocket.OPEN) return;
  const pos = playerMesh.position;
  const rot = {x:pitch, y:yaw, z:0};
  ws.send(JSON.stringify({type:'update', pos:{x:pos.x,y:pos.y,z:pos.z}, rot}));
}, 100);

// Simple physics & movement
const clock = new THREE.Clock();
function animate(){
  const dt = Math.min(0.05, clock.getDelta());

  // compute input
  let forward = 0, right = 0;
  if(keys['KeyW']||keys['ArrowUp']||moveState.f) forward = 1;
  if(keys['KeyS']||keys['ArrowDown']||moveState.b) forward = -1;
  if(keys['KeyA']||keys['ArrowLeft']||moveState.l) right = -1;
  if(keys['KeyD']||keys['ArrowRight']||moveState.r) right = 1;
  const speed = (keys['ShiftLeft']?8:4);
  const dir = new THREE.Vector3();
  dir.x = Math.sin(yaw)*forward + Math.cos(yaw)*right;
  dir.z = Math.cos(yaw)*-forward + Math.sin(yaw)*right;
  dir.normalize();
  velocity.x = dir.x * speed * dt;
  velocity.z = dir.z * speed * dt;
  playerMesh.position.x += velocity.x;
  playerMesh.position.z += velocity.z;

  // camera follows
  camera.position.set(playerMesh.position.x, playerMesh.position.y+0.8, playerMesh.position.z+2.2);
  const target = new THREE.Vector3(playerMesh.position.x + Math.sin(yaw)*-1, playerMesh.position.y+0.8, playerMesh.position.z + Math.cos(yaw)*-1);
  camera.lookAt(target);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// window resize
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
});
