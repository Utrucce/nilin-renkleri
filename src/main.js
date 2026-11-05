import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clearRoom, connectAnonymously, createRoom, verifyRoom, watchRoom, writePlayer, writeRoomState } from './firebase.js';

const missions = [
  { title: 'Maat’ın terazisi', icon: '⚖', lesson: 'Denge ve adalet', objective: 'Tüyü bul ve iç mührü etkinleştir.', choices: ['Tüy', 'Altın', 'Taş'], answer: 0 },
  { title: 'Nil’in hafızası', icon: '𓇼', lesson: 'Coğrafya ve yaşam', objective: 'Nil döngüsünü öğren ve dış kapıya ilerle.', choices: ['Taşkın → Ekim → Kuraklık', 'Kuraklık → Taşkın → Ekim', 'Ekim → Kuraklık → Taşkın'], answer: 0 },
  { title: 'Duvar yazıtı', icon: '𓂀', lesson: 'Antik Mısır yazısı', objective: 'Yaşam işaretini bul ve arkadaşına yol aç.', choices: ['Yaşam', 'Güneş', 'Su'], answer: 0 }
];

const state = { phase: 'setup', mode: 'rescuer', mission: 0, score: 18, rescued: false, signal: false, guideOpen: false, explorerX: 50, explorerY: 72, explorerDepth: 50, wallX: 50, wallY: 82, innerSeals: [], seals: [], rotation: 0, wallReady: false, rescuerReady: false, username: '', roomCode: '', roomPassword: '', roomStatus: '', connectionError: '' };
let playerId = null;
let stopRoomWatch = null;
const liveChannel = 'BroadcastChannel' in window ? new BroadcastChannel('nilin-renkleri-live') : null;
const saved = localStorage.getItem('nilin-renkleri-v2');
if (saved) {
  try { Object.assign(state, JSON.parse(saved)); } catch { localStorage.removeItem('nilin-renkleri-v2'); }
}
if (state.roomCode === 'NIL-247') {
  state.roomCode = '';
  state.roomPassword = '';
  state.roomStatus = '';
}
function save() {
  localStorage.setItem('nilin-renkleri-v2', JSON.stringify({ ...state, roomPassword: '' }));
  liveChannel?.postMessage(state);
  if (playerId) {
    writePlayer(state.roomCode, playerId, { username: state.username, mode: state.mode, ready: state.mode === 'wall' ? state.wallReady : state.rescuerReady, updatedAt: Date.now() }).catch(console.error);
    writeRoomState(state.roomCode, { ...state, guideOpen: false }).catch(console.error);
  }
}

liveChannel?.addEventListener('message', (event) => {
  Object.assign(state, event.data);
  render();
});

function render() {
  if (state.phase === 'setup') {
    renderSetup();
    return;
  }
  const active = missions[state.mission] || missions[0];
  document.querySelector('#app').innerHTML = `
    <main class="shell">
      <header class="topbar"><div class="brand"><div class="brand-mark">𓂀</div><div><div class="eyebrow">İki dünya · tek amaç</div><h1>Nil'in Renkleri</h1></div></div><div class="mode-switch"><button class="${state.mode === 'wall' ? 'active' : ''}" data-mode="wall">Duvarın içindeki</button><button class="${state.mode === 'rescuer' ? 'active' : ''}" data-mode="rescuer">Kurtarıcı</button></div><button class="icon-button" data-action="guide" aria-label="Oyun kuralları">?</button></header>
      <section class="story-banner"><div><span class="eyebrow gold">Misyon: Kayıp arkadaş</span><h2>${state.rescued ? 'Duvar mührü açıldı.' : 'İki dünya, tek kurtarma görevi.'}</h2><p>${state.rescued ? 'Bölüm tamamlandı · 3/3 mühür çözüldü' : '2B sembolleri incele · 3B görevleri tamamla'}</p></div><div class="connection"><span class="node node-left">2B</span><i></i><span class="node node-right">3B</span></div></section>
      <section class="world-grid ${state.mode === 'wall' ? 'show-wall' : 'show-rescuer'}">
        <article class="world-panel wall-world ${state.mode === 'wall' ? 'focus' : ''}"><div class="world-heading"><div><span class="eyebrow">Oyuncu A · 2B dünya</span><h3>Hapsolmuş duvar</h3></div><span class="world-badge">KURTUL</span></div><div class="wall-scene giant"><div class="wall-glow"></div><div class="wall-frame"><span>𓂀</span><span>𓆣</span><span>𓋹</span><span>𓇼</span><div class="prisoner" style="left:${state.wallX}%;top:${state.wallY}%">𓀀</div><b class="wall-message">${state.rescued ? 'ÖZGÜR' : 'YARDIM'}</b></div><div class="wall-texture"></div><button class="wall-rune rune-one ${state.innerSeals.includes(0) ? 'collected' : ''}" data-action="inner-seal" data-seal="0">𓂀</button><button class="wall-rune rune-two ${state.innerSeals.includes(1) ? 'collected' : ''}" data-action="inner-seal" data-seal="1">𓆣</button><button class="wall-rune rune-three ${state.innerSeals.includes(2) ? 'collected' : ''}" data-action="inner-seal" data-seal="2">𓋹</button></div><div class="world-footer"><span>${state.innerSeals.length}/3 mühür</span><button class="secondary" data-action="signal">${state.signal ? 'İşaret gönderildi' : 'İşaret gönder'} <span>↗</span></button></div></article>
        <article class="world-panel three-world ${state.mode === 'rescuer' ? 'focus' : ''}"><div class="world-heading"><div><span class="eyebrow">Oyuncu B · 3B dünya</span><h3>Piramitin içi</h3></div><span class="world-badge gold-bg">KURTAR</span></div><div class="three-scene giant"><canvas id="rescue-map" aria-label="Piramit içi 3B haritası"></canvas><div class="control-pad" aria-label="Mitolojik hareket mührü"><div class="pad-ring"><span class="pad-glyph">𓋹</span><i class="pad-knob"></i></div></div></div><div class="world-footer"><span>${state.seals.length}/3 mühür</span><div class="choice-row">${active.choices.map((choice, index) => `<button class="choice" data-choice="${index}">${index + 1}. ${choice}</button>`).join('')}</div></div></article>
      </section>
      <div class="orientation-hint" aria-hidden="true">Telefonu yatay çevir</div>
      <footer><span>𓋹 Nil’in Renkleri</span></footer>
      ${state.guideOpen ? `<div class="modal-backdrop" data-action="close-guide"><section class="modal guide-modal" onclick="event.stopPropagation()"><button class="modal-close" data-action="close-guide">×</button><span class="eyebrow gold">Oyun kuralları</span><h3>Görev akışı</h3><ol><li>2B bölümdeki sembolleri incele.</li><li>3B bölümde doğru seçeneği işaretle.</li><li>Üç mühür çözülünce arkadaş kurtulur.</li></ol><button class="secondary" data-action="close-guide">Kapat</button></section></div>` : ''}
    </main>`;
  createRescueMap();
}

function renderSetup() {
  document.querySelector('#app').innerHTML = `
    <main class="setup-shell">
      <header class="topbar"><div class="brand"><div class="brand-mark">𓂀</div><div><div class="eyebrow">İki dünya · tek amaç</div><h1>Nil'in Renkleri</h1></div></div></header>
      <section class="setup-hero"><div class="setup-title"><span class="eyebrow gold">Yeni sefer</span><h2>Arkadaşını<br/><em>duvardan çıkar.</em></h2><p>İki oyuncu, iki dünya, tek kurtarma planı.</p></div><div class="setup-sun">𓋹</div></section>
      <section class="room-lobby"><div class="room-lobby-heading"><span class="eyebrow gold">Sefer lobisi</span><h3>Bir oda kur veya şifreyle katıl</h3></div><form class="room-form" data-action="create-room"><label for="host-name">Oyuncu adın<input id="host-name" name="username" maxlength="18" required value="${state.username}" placeholder="Bir ad seç" autocomplete="off"></label><button class="secondary" type="submit">Oda kur</button></form><form class="room-form" data-action="join-room"><label for="room-code">Oda kodu<input id="room-code" name="roomCode" maxlength="8" required placeholder="Örn. NIL-7K2P" autocomplete="off"></label><label for="room-password">Oda şifresi<input id="room-password" name="password" maxlength="12" required placeholder="6 haneli şifre" autocomplete="off"></label><label for="guest-name">Oyuncu adın<input id="guest-name" name="username" maxlength="18" required value="${state.username}" placeholder="Bir ad seç" autocomplete="off"></label><button class="secondary" type="submit">Odaya katıl</button></form>${state.roomStatus ? `<p class="room-status">${state.roomStatus}</p>` : ''}${state.connectionError ? `<small class="connection-error">${state.connectionError}</small>` : ''}</section>
      <section class="setup-board">
        <div class="setup-panel"><div class="setup-panel-heading"><span class="eyebrow">01 · Roller</span><span class="setup-count">2 oyuncu</span></div><h3>Bir dünya seç</h3><div class="role-grid"><button class="role-card ${state.mode === 'wall' ? 'selected' : ''}" data-mode="wall"><span class="role-art wall-art">𓂀</span><strong>Duvarın içindeki</strong><small>2B dünyada hareket et<br/>ve mühürleri etkinleştir.</small><i>${state.wallReady ? 'Hazır ✓' : 'Oyuncu A'}</i></button><button class="role-card ${state.mode === 'rescuer' ? 'selected' : ''}" data-mode="rescuer"><span class="role-art rescue-art">𓁐</span><strong>Tapınak kurtarıcısı</strong><small>3B dünyada keşfet<br/>ve yolu aç.</small><i>${state.rescuerReady ? 'Hazır ✓' : 'Oyuncu B'}</i></button></div></div>
        <div class="setup-panel rules-panel"><div class="setup-panel-heading"><span class="eyebrow">02 · Sefer kuralları</span><span class="setup-count">Bölüm 01</span></div><h3>Görev düzeni</h3><div class="rule-row"><b>01</b><div><strong>İçerideki oyuncu</strong><small>Duvar labirentinde üç iç mührü bulur.</small></div></div><div class="rule-row"><b>02</b><div><strong>Dışarıdaki oyuncu</strong><small>Tapınak vadisinde üç dış mührü toplar.</small></div></div><div class="rule-row"><b>03</b><div><strong>Birlikte</strong><small>Bilgi mühürlerini çözerek kapıyı açar.</small></div></div></div>
      </section>
      <div class="setup-bottom"><div class="ready-status"><span class="status-dot ${state.wallReady ? 'ready' : ''}"></span><span>Duvar oyuncusu ${state.wallReady ? 'hazır' : 'bekliyor'}</span><span class="status-dot ${state.rescuerReady ? 'ready' : ''}"></span><span>Kurtarıcı ${state.rescuerReady ? 'hazır' : 'bekliyor'}</span></div><button class="start-button ${state.wallReady && state.rescuerReady ? 'enabled' : ''}" data-action="ready">${state.wallReady && state.rescuerReady ? 'Oyunu başlat' : 'Hazırım'} <span>→</span></button></div>
      <footer><span>𓋹 Nil’in Renkleri</span></footer>
    </main>`;
}

document.addEventListener('click', (event) => {
  const mode = event.target.closest('[data-mode]')?.dataset.mode;
  if (mode) { state.mode = mode; save(); render(); return; }
  const choice = event.target.closest('[data-choice]');
  if (choice) {
    const active = missions[state.mission];
    if (Number(choice.dataset.choice) === active.answer && state.innerSeals.length > state.mission && state.seals.length > state.mission) {
      state.score += active.points;
      if (state.mission === missions.length - 1) {
        state.rescued = true;
        setTimeout(() => {
          clearRoom(state.roomCode).catch(console.error);
          localStorage.removeItem('nilin-renkleri-v2');
        }, 5000);
      }
      else state.mission += 1;
    }
    save(); render(); return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  const move = event.target.closest('[data-move]')?.dataset.move;
  if (move) { moveExplorer(move); return; }
  if (action === 'ready') {
    if (state.phase === 'setup' && state.wallReady && state.rescuerReady) state.phase = 'game';
    else if (state.phase === 'setup') state.mode === 'wall' ? state.wallReady = true : state.rescuerReady = true;
    save(); render(); return;
  }
  if (action === 'inner-seal') { const seal = Number(event.target.closest('[data-seal]').dataset.seal); if (!state.innerSeals.includes(seal)) { state.innerSeals.push(seal); state.score += 2; } save(); render(); return; }
  if (action === 'seal') { const seal = Number(event.target.closest('[data-seal]').dataset.seal); if (!state.seals.includes(seal)) { state.seals.push(seal); state.score += 3; } save(); render(); return; }
  if (action === 'signal') { state.signal = true; render(); }
  if (action === 'guide') { state.guideOpen = true; render(); }
  if (action === 'close-guide') { state.guideOpen = false; render(); }
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-action]');
  if (!form) return;
  event.preventDefault();
  try {
    playerId = await connectAnonymously();
    const formData = new FormData(form);
    const username = formData.get('username')?.toString().trim();
    if (!username) return;
    state.username = username.slice(0, 18);
    if (form.dataset.action === 'create-room') {
      state.roomCode = `NIL-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      state.roomPassword = String(Math.floor(100000 + Math.random() * 900000));
      await createRoom(state.roomCode, state.roomPassword, { ...state, roomPassword: '' });
      state.roomStatus = `Odan hazır: ${state.roomCode} · Şifre: ${state.roomPassword}`;
    } else {
      const roomCode = formData.get('roomCode')?.toString().trim().toUpperCase();
      const password = formData.get('password')?.toString().trim();
      if (!roomCode || !(await verifyRoom(roomCode, password))) throw new Error('Oda kodu veya şifre hatalı.');
      state.roomCode = roomCode;
      state.roomPassword = '';
      state.roomStatus = `Odaya katıldın: ${roomCode}`;
    }
    stopRoomWatch?.();
    stopRoomWatch = watchRoom(state.roomCode, (room) => {
      if (!room?.state || room.state.username === state.username) return;
      const localIdentity = { username: state.username, mode: state.mode, roomCode: state.roomCode, roomPassword: state.roomPassword };
      Object.assign(state, room.state, localIdentity);
      render();
    });
    state.connectionError = '';
    save();
    render();
  } catch (error) {
    console.error('Firebase bağlantısı kurulamadı.', error);
    state.connectionError = error.message || 'Bağlantı kurulamadı. Lütfen tekrar dene.';
    render();
  }
});

let dragging = false;
let dragStart = 0;
let padDragging = false;
let padDirection = null;
let padStart = null;
let padElement = null;
document.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.control-pad')) {
    padDragging = true;
    padElement = event.target.closest('.control-pad');
    padStart = { x: event.clientX, y: event.clientY };
    event.preventDefault();
    return;
  }
  if (!event.target.closest('.three-scene')) return;
  dragging = true;
  dragStart = event.clientX;
  event.target.setPointerCapture?.(event.pointerId);
});
document.addEventListener('pointermove', (event) => {
  if (padDragging && padStart) {
    const dx = event.clientX - padStart.x;
    const dy = event.clientY - padStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 12) {
      padDirection = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      padElement?.querySelector('.pad-knob')?.style.setProperty('transform', `translate(${Math.max(-24, Math.min(24, dx))}px, ${Math.max(-24, Math.min(24, dy))}px)`);
    }
    return;
  }
  if (!dragging) return;
  state.rotation += (event.clientX - dragStart) * 0.35;
  dragStart = event.clientX;
  const scene = document.querySelector('.three-scene');
  if (scene) scene.style.setProperty('--rotation', `${state.rotation}deg`);
});
document.addEventListener('pointerup', () => {
  if (padDragging) {
    if (padDirection) moveExplorer(padDirection);
    padDragging = false;
    padDirection = null;
    padStart = null;
    padElement = null;
  }
  dragging = false;
  save();
});

document.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(event.key)) return;
  event.preventDefault();
  moveExplorer(event.key === 'ArrowLeft' || event.key === 'a' ? 'left' : event.key === 'ArrowRight' || event.key === 'd' ? 'right' : event.key === 'ArrowUp' || event.key === 'w' ? 'up' : 'down');
});

function moveExplorer(direction) {
  const horizontal = direction === 'left' ? -4 : direction === 'right' ? 4 : 0;
  const vertical = direction === 'up' ? -4 : direction === 'down' ? 4 : 0;
  if (state.mode === 'wall') {
    state.wallX = Math.max(18, Math.min(82, state.wallX + horizontal));
    state.wallY = Math.max(18, Math.min(82, state.wallY + vertical));
  } else {
    state.explorerX = Math.max(12, Math.min(88, state.explorerX + horizontal));
    state.explorerDepth = Math.max(15, Math.min(85, state.explorerDepth + vertical));
  }
  save(); render();
}

function createRescueMap() {
  const canvas = document.querySelector('#rescue-map');
  if (!canvas) return;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101922');
  scene.fog = new THREE.Fog('#101922', 18, 30);
  const camera = new THREE.PerspectiveCamera(58, canvas.clientWidth / canvas.clientHeight, 0.1, 180);
  camera.position.set((state.explorerX - 50) * 0.11, 2.8, (state.explorerDepth - 50) * 0.16);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minPolarAngle = Math.PI * 0.26;
  controls.minDistance = 6;
  controls.maxDistance = 7;
  controls.target.set(0, 2.8, -1.5);
  const ambient = new THREE.HemisphereLight('#d9c39b', '#080b10', 1.35);
  scene.add(ambient);
  const fill = new THREE.DirectionalLight('#7d9bb2', 1.1);
  fill.position.set(-8, 10, 12);
  scene.add(fill);
  const addTorch = (x, y, z) => {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(.18, .55, 8),
      new THREE.MeshBasicMaterial({ color: '#ffc45c' })
    );
    flame.position.set(x, y, z);
    scene.add(flame);
    const light = new THREE.PointLight('#ff9b38', 13, 9, 2);
    light.position.set(x, y + .25, z);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    scene.add(light);
    return light;
  };
  const torches = [addTorch(-4, 3.2, -5), addTorch(4, 3.2, -5), addTorch(-5, 2.5, 3), addTorch(5, 2.5, 3)];
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(240 * 3);
  for (let index = 0; index < dustPositions.length; index += 3) {
    dustPositions[index] = (Math.random() - .5) * 13;
    dustPositions[index + 1] = Math.random() * 7 + 1;
    dustPositions[index + 2] = (Math.random() - .5) * 18;
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  scene.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#e5c46e', size: .035, transparent: true, opacity: .48 })));
  const interiorShell = new THREE.Mesh(
    new THREE.BoxGeometry(15, 8, 22),
    new THREE.MeshBasicMaterial({ color: '#101922', side: THREE.BackSide, depthWrite: false })
  );
  interiorShell.position.y = 4;
  scene.add(interiorShell);
  const loader = new GLTFLoader();
  loader.load(`${import.meta.env.BASE_URL}assets/pyramid-interior/pyramid-interior-game.glb`, (gltf) => {
    gltf.scene.scale.setScalar(0.8);
    gltf.scene.position.set(0, -1.5, 0);
    gltf.scene.traverse((object) => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    scene.add(gltf.scene);
  }, undefined, (error) => {
    console.error('Piramit asseti yüklenemedi:', error);
  });
  const sealMaterial = new THREE.MeshStandardMaterial({ color: '#e5c46e', emissive: '#6f4f1d', emissiveIntensity: 1.8, metalness: .5 });
  [[-4, 2.2, -5, 0], [4, 2.2, -2, 1], [0, 4.5, -7, 2]].forEach(([x, y, z, id]) => {
    const seal = new THREE.Mesh(new THREE.OctahedronGeometry(1.05), sealMaterial);
    seal.position.set(x, y, z);
    seal.userData.seal = id;
    seal.visible = !state.seals.includes(id);
    scene.add(seal);
  });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  canvas.addEventListener('pointerup', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(scene.children).find((item) => item.object.userData.seal !== undefined);
    if (hit && !state.seals.includes(hit.object.userData.seal)) {
      state.seals.push(hit.object.userData.seal);
      state.score += 3;
      save();
      render();
    }
  });
  const resize = () => { const width = canvas.clientWidth; const height = canvas.clientHeight; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
  window.addEventListener('resize', resize, { once: true });
  const clampCameraInside = () => {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -5.8, 5.8);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.6, 5.3);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -8.5, 8.5);
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -2.5, 2.5);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 1.8, 4.6);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -4.5, 4.5);
  };
  controls.addEventListener('change', clampCameraInside);
  const animate = () => { if (!document.body.contains(canvas)) return; clampCameraInside(); renderer.render(scene, camera); requestAnimationFrame(animate); };
  animate();
  let pulse = 0;
  const pulseLights = () => {
    pulse += .04;
    torches.forEach((light, index) => { light.intensity = 11 + Math.sin(pulse * 2 + index) * 2.2; });
    if (document.body.contains(canvas)) requestAnimationFrame(pulseLights);
  };
  pulseLights();
}

render();
