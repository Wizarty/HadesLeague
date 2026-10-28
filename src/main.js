import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-700.css";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import "./style.css";
import {
  CHAMPIONS,
  createPlayer,
  choices,
  rng,
  roomPlan,
  damageAfterArmor,
  loadSave,
} from "./core.js";
const $ = (s) => document.querySelector(s),
  TAU = Math.PI * 2;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: $("#world"),
    antialias: true,
    powerPreference: "high-performance",
  });
} catch {
  $("#error").hidden = false;
  $("#error").textContent =
    "This adventure needs WebGL. Enable hardware acceleration in your browser and reload.";
  throw Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0c1923);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0c1923, 0.024);
const camera = new THREE.PerspectiveCamera(
  37,
  innerWidth / innerHeight,
  0.1,
  160,
);
camera.position.set(22, 27, 25);
camera.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight(0x91c5d9, 0x14232a, 2.1));
const sun = new THREE.DirectionalLight(0xe8deb7, 2.7);
sun.position.set(-10, 24, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -23,
  right: 23,
  top: 23,
  bottom: -23,
  near: 1,
  far: 65,
});
sun.shadow.bias = -0.001;
scene.add(sun);
const tealLight = new THREE.PointLight(0x4adcc4, 100, 25, 2);
tealLight.position.set(0, 5, 0);
scene.add(tealLight);
const mat = (c, metal = 0.1, rough = 0.85) =>
  new THREE.MeshStandardMaterial({
    color: c,
    metalness: metal,
    roughness: rough,
  });
const M = {
  stone: mat(0x34444b),
  edge: mat(0x1d2f39),
  tile: mat(0x3a5158),
  dark: mat(0x172a35),
  gold: mat(0xc6aa6b, 0.65, 0.35),
  leaves: mat(0x1e645e),
  trunk: mat(0x293a3d),
  glow: new THREE.MeshStandardMaterial({
    color: 0x91ffdf,
    emissive: 0x43c9a9,
    emissiveIntensity: 2,
  }),
  enemy: mat(0x9c5267),
  red: new THREE.MeshStandardMaterial({
    color: 0xff857f,
    emissive: 0x8a2634,
    emissiveIntensity: 1,
  }),
};
const world = new THREE.Group();
scene.add(world);
const actors = new THREE.Group();
scene.add(actors);
const effects = new THREE.Group();
scene.add(effects);
function mesh(geo, material, parent = world, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(w, h, d, m, p, x, y, z) {
  return mesh(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
}
function cylinder(r1, r2, h, m, p, x, y, z, sides = 8) {
  return mesh(new THREE.CylinderGeometry(r1, r2, h, sides), m, p, x, y, z);
}
function ring(radius, color, parent = effects, x = 0, z = 0, width = 0.07) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(radius - width, radius, 64),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.08, z);
  parent.add(m);
  return m;
}
const decoRng = rng(778);
let portal, portalGlow;
const torches = [],
  fireflies = [];
function buildWorld() {
  cylinder(16.8, 17.5, 1.2, M.edge, world, 0, -0.9, 0, 12);
  cylinder(16.5, 16.5, 0.35, M.stone, world, 0, -0.2, 0, 12);
  for (let x = -14; x <= 14; x += 2)
    for (let z = -14; z <= 14; z += 2) {
      if (Math.hypot(x, z) > 15) continue;
      const t = box(
        1.92,
        0.13,
        1.92,
        decoRng() > 0.7 ? M.stone : M.tile,
        world,
        x,
        -0.015 + decoRng() * 0.025,
        z,
      );
      t.rotation.y = (decoRng() - 0.5) * 0.025;
    }
  for (const r of [3.3, 3.5, 11.8, 12]) ring(r, 0x9b9c70, world, 0, 0, 0.035);
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8,
      x = Math.sin(a) * 13.8,
      z = Math.cos(a) * 13.8;
    const g = new THREE.Group();
    world.add(g);
    g.position.set(x, 0, z);
    g.rotation.y = a;
    box(1.5, 0.4, 1.5, M.edge, g, 0, 0.2, 0);
    box(1.15, 0.25, 1.15, M.gold, g, 0, 0.5, 0);
    cylinder(0.42, 0.57, 2.4, M.stone, g, 0, 1.75, 0);
    box(1, 0.23, 1, M.gold, g, 0, 3, 0);
    cylinder(0.7, 0.38, 0.5, M.dark, g, 0, 3.3, 0);
    const flame = mesh(
      new THREE.OctahedronGeometry(0.37),
      M.glow,
      g,
      0,
      3.9,
      0,
    );
    flame.scale.y = 1.8;
    torches.push(flame);
    const l = new THREE.PointLight(0x55ebc6, 14, 7);
    l.position.set(x, 3.6, z);
    world.add(l);
  }
  for (let i = 0; i < 28; i++) {
    const a = decoRng() * TAU,
      r = 17 + decoRng() * 4,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    const g = new THREE.Group();
    world.add(g);
    g.position.set(x, -0.4, z);
    g.rotation.y = a;
    const h = z > 9 ? 1.4 : 2 + decoRng() * 5;
    if (i % 3) {
      cylinder(0.25, 0.5, h, M.trunk, g, 0, h / 2, 0);
      for (let j = 0; j < 3; j++) {
        const crown = mesh(
          new THREE.IcosahedronGeometry(1.4 + decoRng(), 0),
          M.leaves,
          g,
          (decoRng() - 0.5) * 1.5,
          h + j * 0.6,
          0,
        );
        crown.scale.set(1, 0.65, 1);
      }
    } else {
      box(2, h, 1.3, M.edge, g, 0, h / 2, 0);
      box(2.5, 0.4, 1.7, M.stone, g, 0, h, 0);
      for (let j = 0; j < 3; j++)
        box(0.15, h * 0.9, 0.15, M.gold, g, -0.7 + j * 0.7, h * 0.5, 0.7);
    }
  }
  for (let i = 0; i < 70; i++) {
    let a = decoRng() * TAU,
      r = 12.5 + decoRng() * 4;
    const rock = mesh(
      new THREE.DodecahedronGeometry(0.2 + decoRng() * 0.5),
      i % 4 ? M.stone : M.leaves,
      world,
      Math.sin(a) * r,
      0.2,
      Math.cos(a) * r,
    );
    rock.rotation.set(decoRng(), decoRng(), decoRng());
  }
  portal = new THREE.Group();
  world.add(portal);
  portal.position.set(0, 0, -12);
  box(4, 0.35, 3, M.edge, portal, 0, 0.15, 0);
  for (const s of [-1, 1]) {
    box(0.65, 4.4, 0.8, M.stone, portal, s * 1.65, 2.3, 0);
    box(0.85, 0.25, 1, M.gold, portal, s * 1.65, 4.4, 0);
  }
  box(4, 0.7, 0.9, M.stone, portal, 0, 4.8, 0);
  box(3.5, 0.12, 1, M.gold, portal, 0, 5.2, 0);
  portalGlow = mesh(
    new THREE.PlaneGeometry(2.7, 4),
    new THREE.MeshBasicMaterial({
      color: 0x6cebd1,
      transparent: true,
      opacity: 0.17,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    portal,
    0,
    2.3,
    0,
  );
  ring(1.8, 0x7eefd2, portal, 0, 0);
  portal.visible = false;
  const points = [];
  for (let i = 0; i < 110; i++)
    points.push((decoRng() - 0.5) * 44, decoRng() * 8, (decoRng() - 0.5) * 44);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const dust = new THREE.Points(
    geom,
    new THREE.PointsMaterial({
      color: 0x96d2be,
      size: 0.055,
      transparent: true,
      opacity: 0.65,
    }),
  );
  scene.add(dust);
  fireflies.push(dust);
}
buildWorld();
// Batch static scenery by material: hundreds of tiles and trees become a handful of draws.
world.updateMatrixWorld(true);
const batches = new Map(),
  staticMeshes = [];
world.traverse((m) => {
  if (!m.isMesh || torches.includes(m)) return;
  let p = m;
  while (p) {
    if (p === portal) return;
    p = p.parent;
  }
  const key = m.material.uuid;
  if (!batches.has(key))
    batches.set(key, { material: m.material, geometries: [] });
  const g = (
    m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
  ).applyMatrix4(m.matrixWorld);
  batches.get(key).geometries.push(g);
  staticMeshes.push(m);
});
for (const m of staticMeshes) {
  m.removeFromParent();
  m.geometry.dispose();
}
for (const b of batches.values()) {
  const geometry = mergeGeometries(b.geometries);
  if (geometry) mesh(geometry, b.material);
  b.geometries.forEach((g) => g.dispose());
}

function championModel(id) {
  const g = new THREE.Group(),
    c = CHAMPIONS[id],
    color = mat(c.color, 0.3, 0.45);
  g.userData.color = color;
  cylinder(0.28, 0.47, 0.92, id === "yasuo" ? M.dark : color, g, 0, 0.95, 0);
  const head = mesh(
    new THREE.IcosahedronGeometry(0.29, 1),
    mat(0xe7ccb7),
    g,
    0,
    1.65,
    0,
  );
  mesh(
    new THREE.SphereGeometry(0.32, 12, 8),
    id === "jinx" ? mat(0x447cbd) : M.dark,
    g,
    0,
    1.79,
    -0.07,
  );
  const left = box(0.18, 0.58, 0.22, M.dark, g, -0.2, 0.35, 0),
    right = box(0.18, 0.58, 0.22, M.dark, g, 0.2, 0.35, 0);
  g.userData.legs = [left, right];
  for (const s of [-1, 1]) {
    const arm = box(0.18, 0.66, 0.2, color, g, s * 0.4, 1.03, 0);
    arm.rotation.z = s * 0.25;
  }
  if (id === "ahri") {
    for (let i = 0; i < 7; i++) {
      const tail = mesh(
        new THREE.ConeGeometry(0.23, 1.7, 6),
        mat(i % 2 ? 0xc0dfd9 : 0x76b7bd),
        g,
        Math.sin((i - 3) * 0.27) * 0.8,
        0.72,
        -0.65 - Math.cos((i - 3) * 0.27) * 0.2,
      );
      tail.rotation.x = -0.9;
      tail.rotation.z = (i - 3) * 0.25;
    }
    for (const s of [-1, 1]) {
      const ear = mesh(
        new THREE.ConeGeometry(0.14, 0.35, 3),
        color,
        g,
        s * 0.2,
        2,
        0,
      );
      ear.rotation.z = s * 0.3;
    }
    mesh(new THREE.IcosahedronGeometry(0.19, 1), M.glow, g, 0.62, 1.17, 0.4);
  }
  if (id === "yasuo") {
    const sword = box(0.08, 1.85, 0.12, M.gold, g, 0.63, 1, 0.4);
    sword.rotation.x = 0.6;
    sword.rotation.z = -0.5;
    const scarf = box(0.7, 0.15, 0.6, color, g, 0, 1.4, -0.25);
    scarf.rotation.x = -0.2;
    mesh(new THREE.ConeGeometry(0.2, 0.8, 5), M.dark, g, 0, 2, -0.2);
  }
  if (id === "jinx") {
    const gun = cylinder(0.18, 0.25, 1.2, M.dark, g, 0.52, 1, 0.4);
    gun.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      const braid = cylinder(0.07, 0.11, 1.3, color, g, s * 0.22, 1.05, -0.24);
      braid.rotation.z = s * 0.2;
    }
  }
  const halo = ring(0.65, c.color, g, 0, 0, 0.045);
  g.userData.halo = halo;
  actors.add(g);
  return g;
}
let hero = championModel("ahri");
hero.position.set(3, 0, 1);
let player = null,
  state = "menu",
  selected = "ahri",
  room = 0,
  random = rng(Date.now()),
  elapsed = 0,
  killCount = 0,
  roomKills = 0,
  clearTimer = 0,
  runSeed = 0;
let terrain = [],
  environmentTick = 0;
let enemies = [],
  shots = [],
  hazards = [],
  fx = [],
  walls = [],
  traps = [],
  cameraShake = 0,
  mouseDown = false,
  aim = new THREE.Vector3(0, 0, -1),
  dashDir = new THREE.Vector3(),
  dashTime = 0,
  excited = 0,
  rocketMode = 0,
  foxTime = 0,
  foxTick = 0,
  lastTime = performance.now(),
  toastTime = 0;
let save = loadSave(localStorage);
let cameraYaw = Math.atan2(21, 23),
  cameraPitch = Math.atan2(27, Math.hypot(21, 23)),
  cameraDistance = Math.hypot(21, 27, 23),
  cameraDragging = false,
  dragX = 0,
  dragY = 0;
const keys = new Set(),
  pointer = new THREE.Vector2(),
  ray = new THREE.Raycaster(),
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  mouseWorld = new THREE.Vector3();
let audioCtx = null,
  sound = true;
function tone(freq = 400, duration = 0.08, type = "sine", gain = 0.035) {
  if (!sound) return;
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      freq * 0.5,
      audioCtx.currentTime + duration,
    );
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + duration);
  } catch {}
}
function persist() {
  try {
    localStorage.setItem("hades-league-save", JSON.stringify(save));
  } catch {}
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").style.opacity = 1;
  toastTime = 3;
}
function modal(html) {
  $("#modal-content").innerHTML = html;
  $("#modal").hidden = false;
  mouseDown = false;
  cameraDragging = false;
  keys.clear();
}
function hideModal() {
  $("#modal").hidden = true;
}
function selectScreen() {
  state = "select";
  $("#menu").hidden = true;
  modal(
    `<div class="modal-eyebrow">CHOOSE YOUR LEGEND</div><h2 class="modal-title">Who will cross the veil?</h2><p class="modal-desc">Each champion brings a different way to defy death. Your abilities are ready from the first chamber.</p><div class="cards">${Object.entries(
      CHAMPIONS,
    )
      .map(
        ([id, c]) =>
          `<button class="card ${id === selected ? "selected" : ""}" data-champ="${id}" style="--accent:#${c.color.toString(16)}"><div class="champ-sigil">${c.sigil}</div><div class="role">${c.title}</div><h3>${c.name}</h3><p>${c.description}</p><div class="kit"><b>P</b>${c.passive}<br>${c.skills.map((s, i) => `<b>${i + 1}</b>${s}`).join("<br>")}</div><div class="card-bottom">${c.role}</div></button>`,
      )
      .join(
        "",
      )}</div><div class="modal-actions"><button id="start-run" class="primary">ENTER THE RIFT <span>›</span></button><button id="back-menu" class="text-button">BACK</button></div><div class="forge">✦ ${save.embers} EMBERS · SOUL RANK ${save.rank}/10 (+${save.rank * 5} starting health)<br><button id="forge" class="secondary" ${save.embers < 20 + save.rank * 15 || save.rank >= 10 ? "disabled" : ""}>Strengthen your soul · ${20 + save.rank * 15} embers</button></div>`,
  );
  document.querySelectorAll("[data-champ]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = b.dataset.champ;
        selectScreen();
      }),
  );
  $("#start-run").onclick = startRun;
  $("#back-menu").onclick = mainMenu;
  $("#forge").onclick = () => {
    const cost = 20 + save.rank * 15;
    if (save.embers >= cost && save.rank < 10) {
      save.embers -= cost;
      save.rank++;
      persist();
      selectScreen();
      tone(600, 0.2);
    }
  };
}
function mainMenu() {
  state = "menu";
  hideModal();
  $("#hud").hidden = true;
  $("#menu").hidden = false;
  clearCombat();
  disposeModel(hero);
  hero = championModel(selected);
  hero.position.set(3, 0, 1);
}
function help() {
  const prev = state;
  if (state === "playing") state = "paused";
  modal(
    `<div class="modal-eyebrow">A GUIDE TO THE UNDERWORLD</div><h2 class="modal-title">Make every life count.</h2><div class="help-grid"><div><b>W A S D / Ц Ф Ы В</b><br>Physical keys move relative to the camera in any keyboard layout.<br><b>Mouse</b> aim · <b>Hold left click</b> attack.<br><b>Space</b> dash through danger.</div><div><b>1 / 2 / 3 / 4</b> cast abilities (number row or numpad).<br><b>Hold right mouse + drag</b> rotate and tilt the camera.<br><b>Mouse wheel</b> zoom · <b>Esc / P</b> pause.</div><div><b>Read the battlefield</b><br>Red circles warn of incoming attacks. Dash grants brief invulnerability. Keep moving and use your whole kit.</div><div><b>Build your legend</b><br>Clear eight chambers, choose a boon after each, and defeat two guardians. Walk into the north portal to advance. Embers persist after death.</div></div><p class="modal-desc">Desktop keyboard and mouse required. Progress is saved locally in this browser.<br>Ahri heals every third kill. Yasuo builds a shield by moving. Jinx gains speed on takedown.</p><button id="close-help" class="primary">UNDERSTOOD</button>`,
  );
  $("#close-help").onclick = () => {
    hideModal();
    state = prev;
  };
}
$("#play").onclick = selectScreen;
$("#how").onclick = help;
$(".brand").onclick = (e) => {
  e.preventDefault();
  if (state === "menu") return;
  if (state === "playing") pause();
};
$("#sound").onclick = () => {
  sound = !sound;
  $("#sound").textContent = sound ? "♫" : "♩";
  $("#sound").setAttribute("aria-label", sound ? "Mute sound" : "Enable sound");
};
$("#pause").onclick = () => pause();
function pause() {
  if (state === "paused") {
    state = "playing";
    hideModal();
    return;
  }
  if (state !== "playing") return;
  state = "paused";
  modal(
    `<div class="modal-eyebrow">A MOMENT BETWEEN BATTLES</div><h2 class="modal-title">The Rift can wait.</h2><p class="modal-desc">Chamber ${room} of 8 · ${killCount} enemies defeated</p><div class="modal-actions"><button id="resume" class="primary">RESUME</button><button id="controls" class="secondary">CONTROLS</button><button id="abandon" class="secondary">END RUN</button></div>`,
  );
  $("#resume").onclick = pause;
  $("#controls").onclick = () => {
    help();
    $("#close-help").onclick = () => {
      state = "playing";
      hideModal();
    };
  };
  $("#abandon").onclick = () => endRun(false);
}
function clearGroup(arr) {
  for (const a of arr) {
    if (a.mesh) {
      a.mesh.removeFromParent();
      if (a.mesh.geometry) a.mesh.geometry.dispose();
      if (a.mesh.material && !Object.values(M).includes(a.mesh.material))
        a.mesh.material.dispose();
    }
  }
  arr.length = 0;
}
function disposeModel(model) {
  model.removeFromParent();
  const gs = new Set(),
    ms = new Set();
  model.traverse((m) => {
    if (m.geometry) gs.add(m.geometry);
    if (m.material && !Object.values(M).includes(m.material))
      ms.add(m.material);
  });
  gs.forEach((g) => g.dispose());
  ms.forEach((m) => m.dispose());
}
function clearCombat() {
  for (const t of terrain) disposeModel(t.mesh);
  terrain = [];
  for (const e of enemies) disposeModel(e.mesh);
  enemies = [];
  clearGroup(shots);
  clearGroup(hazards);
  clearGroup(fx);
  clearGroup(walls);
  clearGroup(traps);
  portal.visible = false;
}
function startRun() {
  clearCombat();
  hideModal();
  $("#menu").hidden = true;
  $("#hud").hidden = false;
  player = createPlayer(selected, save.rank);
  disposeModel(hero);
  hero = championModel(selected);
  hero.position.set(0, 0, 6);
  runSeed = Date.now() >>> 0;
  random = rng(runSeed);
  room = 0;
  elapsed = 0;
  killCount = 0;
  dashTime = 0;
  excited = 0;
  rocketMode = 0;
  foxTime = 0;
  player.shield = 0;
  state = "playing";
  $("#champ-name").textContent = CHAMPIONS[selected].name.toUpperCase();
  $("#portrait").textContent = CHAMPIONS[selected].sigil;
  $("#passive").textContent = CHAMPIONS[selected].passive;
  $("#abilities").innerHTML =
    CHAMPIONS[selected].skills
      .map(
        (s, i) =>
          `<div class="ability" title="${s} (${i + 1})"><span class="symbol">${["◈", "✧", "➶", "✺"][i]}</span><kbd>${i + 1}</kbd><div class="cooldown" hidden></div></div>`,
      )
      .join("") +
    `<div class="ability" title="Dash (Space)"><span class="symbol">»</span><kbd>SPACE</kbd><div class="cooldown" hidden></div></div>`;
  nextRoom();
  tone(440, 0.35);
}
function nextRoom() {
  room++;
  roomKills = 0;
  clearTimer = 0;
  clearCombat();
  hero.position.set(0, 0, 6);
  player.invuln = 1.2;
  const plan = roomPlan(room, random);
  environmentTick = 4;
  for (let i = 0; i < 3 + (room % 3); i++) {
    const a = random() * TAU,
      r = 4 + random() * 4;
    const g = new THREE.Group();
    world.add(g);
    g.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    cylinder(0.6, 0.85, 1.1, M.edge, g, 0, 0.55, 0);
    cylinder(0.66, 0.66, 0.13, M.gold, g, 0, 1.15, 0);
    mesh(new THREE.OctahedronGeometry(0.35), M.glow, g, 0, 1.6, 0);
    terrain.push({ mesh: g, radius: 0.9 });
  }
  const ember = plan.theme === "ember";
  M.tile.color.set(ember ? 0x53474c : 0x3a5158);
  M.leaves.color.set(ember ? 0x74484a : 0x1e645e);
  M.glow.color.set(ember ? 0xffbc83 : 0x91ffdf);
  M.glow.emissive.set(ember ? 0xf36a36 : 0x43c9a9);
  scene.fog.color.set(ember ? 0x201720 : 0x0c1923);
  renderer.setClearColor(scene.fog.color);
  $("#biome").textContent = ember
    ? "THE CINDER SANCTUM"
    : "THE FORGOTTEN GARDENS";
  $("#room").textContent =
    `CHAMBER ${["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"][room]}`;
  $("#room-dots").innerHTML = Array.from(
    { length: 8 },
    (_, i) => `<i class="${i < room ? "done" : ""}"></i>`,
  ).join("");
  $("#boss-hud").hidden = !plan.boss;
  for (let i = 0; i < plan.enemies.length; i++) {
    const a = (i * TAU) / plan.enemies.length + random() * 0.4,
      r = 8 + random() * 3;
    spawnEnemy(plan.enemies[i], Math.sin(a) * r, Math.cos(a) * r - 2);
  }
  toast(
    plan.boss
      ? "A GUARDIAN STIRS"
      : `CHAMBER ${room} · ${ember ? "THE CINDER SANCTUM" : "THE FORGOTTEN GARDENS"}`,
  );
}
function spawnEnemy(type, x, z) {
  const boss = type === "sentinel" || type === "warden",
    g = new THREE.Group();
  actors.add(g);
  const scale = boss ? 2.1 : type === "brute" ? 1.35 : 1,
    material = mat(
      type === "archer"
        ? 0x7b6c9b
        : type === "charger"
          ? 0xac7256
          : boss
            ? 0x526578
            : 0x77566a,
    );
  cylinder(0.25, 0.46, 1.2, material, g, 0, 0.8, 0);
  mesh(new THREE.IcosahedronGeometry(0.32, 0), M.dark, g, 0, 1.6, 0);
  for (const s of [-1, 1]) {
    const horn = mesh(
      new THREE.ConeGeometry(0.1, 0.48, 4),
      M.gold,
      g,
      s * 0.28,
      1.95,
      0,
    );
    horn.rotation.z = s * -0.4;
    mesh(new THREE.SphereGeometry(0.055, 6, 6), M.red, g, s * 0.13, 1.65, 0.28);
    box(0.16, 0.65, 0.22, material, g, s * 0.39, 0.95, 0);
  }
  if (boss) {
    for (let i = 0; i < 5; i++) {
      const spike = mesh(
        new THREE.ConeGeometry(0.12, 0.7, 4),
        M.gold,
        g,
        (i - 2) * 0.17,
        2.05,
        0,
      );
      spike.rotation.z = (2 - i) * 0.14;
    }
    box(0.22, 2.4, 0.22, M.gold, g, 0.7, 1, 0.3);
  }
  g.scale.setScalar(scale);
  g.position.set(x, 0, z);
  const maxHp =
    (boss ? (type === "warden" ? 1800 : 1000) : type === "brute" ? 130 : 55) *
    (1 + room * 0.09);
  const e = {
    mesh: g,
    type,
    boss,
    hp: maxHp,
    maxHp,
    speed: boss
      ? 1.9
      : type === "brute"
        ? 1.7
        : type === "charger"
          ? 3.8
          : type === "archer"
            ? 2
            : 2.8,
    cooldown: 1.5 + random() * 1.5,
    slow: 0,
    stun: 0,
    flash: 0,
    phase: 1,
    radius: scale * 0.5,
    material,
  };
  enemies.push(e);
  if (boss)
    $("#boss-name").textContent =
      type === "warden" ? "VORATH, KEEPER OF THE RIFT" : "THE VERDANT SENTINEL";
  return e;
}
function burst(x, z, color = 0x7ce4cc, n = 14, size = 1) {
  for (let i = 0; i < n; i++) {
    const m = mesh(
      new THREE.IcosahedronGeometry(0.06 + random() * 0.07, 0),
      new THREE.MeshBasicMaterial({ color, transparent: true }),
      effects,
      x,
      0.5 + random(),
      z,
    );
    const a = random() * TAU;
    fx.push({
      mesh: m,
      life: 0.4 + random() * 0.4,
      max: 0.8,
      vx: Math.cos(a) * size * 4,
      vz: Math.sin(a) * size * 4,
      vy: 2 + random() * 3,
    });
  }
}
function pulse(x, z, r, color = 0x7ce4cc) {
  const m = ring(r, color, effects, x, z, 0.12);
  fx.push({ mesh: m, life: 0.4, max: 0.4, expand: true });
}
function number(pos, amount, color = "#e2d5ad") {
  if ($("#floaters").childElementCount > 45) return;
  const v = pos.clone();
  v.y = 2;
  v.project(camera);
  const d = document.createElement("span");
  d.className = "damage-number";
  d.textContent = Math.round(amount);
  d.style.color = color;
  d.style.left = (v.x * 0.5 + 0.5) * innerWidth + "px";
  d.style.top = (-v.y * 0.5 + 0.5) * innerHeight + "px";
  $("#floaters").appendChild(d);
  setTimeout(() => d.remove(), 760);
}
function hit(e, damage, chain = true) {
  if (e.hp <= 0) return;
  const critical = random() < player.crit,
    actual = damage * player.power * (critical ? 2 : 1);
  e.hp -= actual;
  e.flash = 0.12;
  e.material.emissive.setHex(0x8e5b4d);
  number(e.mesh.position, actual, critical ? "#f9d776" : "#d7e7e5");
  if (player.frost) e.slow = 2;
  burst(
    e.mesh.position.x,
    e.mesh.position.z,
    CHAMPIONS[selected].color,
    4,
    0.3,
  );
  if (chain && player.chain) {
    const other = enemies.find(
      (o) =>
        o !== e && o.hp > 0 && o.mesh.position.distanceTo(e.mesh.position) < 5,
    );
    if (other) {
      pulse(other.mesh.position.x, other.mesh.position.z, 0.8, 0x9dbbff);
      hit(other, damage * 0.3, false);
    }
  }
  if (e.hp <= 0) {
    player.kills++;
    killCount++;
    roomKills++;
    player.gold += e.boss ? 30 : 3;
    player.hp = Math.min(
      player.maxHp,
      player.hp +
        (player.vamp || 0) +
        (selected === "ahri" && player.kills % 3 === 0 ? 8 : 0),
    );
    if (selected === "jinx") excited = 3;
    if (player.eruption) {
      pulse(e.mesh.position.x, e.mesh.position.z, 2.5, 0xffb276);
      for (const other of [...enemies])
        if (
          other !== e &&
          other.hp > 0 &&
          other.mesh.position.distanceTo(e.mesh.position) < 2.5
        )
          hit(other, player.eruption, false);
    }
    burst(
      e.mesh.position.x,
      e.mesh.position.z,
      e.boss ? 0xffc578 : 0x9ee6d3,
      e.boss ? 35 : 12,
    );
    tone(e.boss ? 100 : 200, 0.08);
  }
}
function hurt(amount) {
  if (player.invuln > 0 || state !== "playing") return;
  if (player.shield >= 100) {
    player.shield = 0;
    player.invuln = 0.5;
    pulse(hero.position.x, hero.position.z, 1.5, 0xa7c8ff);
    return;
  }
  const damage = damageAfterArmor(amount, player.armor);
  player.hp = Math.max(0, player.hp - damage);
  player.invuln = 0.45;
  cameraShake = 0.17;
  number(hero.position, damage, "#ff888b");
  tone(95, 0.13, "sawtooth", 0.035);
  if (player.hp <= 0) endRun(false);
}
function area(pos, radius, damage, stun = 0) {
  pulse(pos.x, pos.z, radius, CHAMPIONS[selected].color);
  for (const e of [...enemies])
    if (e.hp > 0 && e.mesh.position.distanceTo(pos) < radius + e.radius) {
      hit(e, damage);
      e.stun = Math.max(e.stun, stun);
    }
}
function projectile(pos, dir, opts = {}) {
  const m = mesh(
    new THREE.IcosahedronGeometry(opts.radius || 0.19, 1),
    new THREE.MeshBasicMaterial({
      color: opts.enemy ? 0xff837a : CHAMPIONS[selected].color,
    }),
    effects,
    pos.x,
    opts.enemy ? 1 : 1.1,
    pos.z,
  );
  const s = {
    mesh: m,
    dir: dir.clone(),
    speed: opts.speed || 18,
    life: opts.life || 1.2,
    damage: opts.damage || CHAMPIONS[selected].damage,
    enemy: false,
    pierce: false,
    hit: new Set(),
    ...opts,
  };
  shots.push(s);
  return s;
}
function basic() {
  if (player.attackCd > 0) return;
  player.attackCd =
    selected === "jinx"
      ? rocketMode > 0
        ? 0.5
        : 0.2
      : selected === "yasuo"
        ? 0.36
        : 0.34;
  if (selected === "yasuo") {
    const p = hero.position.clone().addScaledVector(aim, 1.5);
    area(p, 1.9, CHAMPIONS[selected].damage);
    slash();
  } else
    projectile(hero.position, aim, {
      damage: CHAMPIONS[selected].damage * (rocketMode > 0 ? 1.6 : 1),
      splash: rocketMode > 0 ? 2 : 0,
      speed: 22,
    });
  tone(selected === "jinx" ? 170 : 500, 0.045, "triangle", 0.015);
}
function slash() {
  const m = ring(
    2,
    0xd5e3ff,
    effects,
    hero.position.x + aim.x,
    hero.position.z + aim.z,
    0.3,
  );
  fx.push({ mesh: m, life: 0.15, max: 0.15, expand: true });
}
function cast(i) {
  if (state !== "playing" || player.cooldowns[i] > 0) return;
  const c = CHAMPIONS[selected];
  player.cooldowns[i] = c.cooldowns[i] * player.haste;
  tone(300 + i * 130, 0.15, "triangle");
  const p = hero.position.clone(),
    qPower = player.echo || 1;
  if (selected === "ahri") {
    if (i === 0)
      projectile(p, aim, {
        damage: 34 * qPower,
        pierce: true,
        speed: 16,
        life: 1.4,
        returning: true,
        radius: 0.3 * qPower,
      });
    if (i === 1) {
      foxTime = 4;
      foxTick = 0;
      pulse(p.x, p.z, 2, 0x8defff);
    }
    if (i === 2)
      projectile(p, aim, {
        damage: 24,
        pierce: true,
        stun: 2.5,
        speed: 15,
        radius: 0.32,
      });
    if (i === 3) {
      if (!player.spiritCharges) {
        player.spiritCharges = 3;
        player.spiritWindow = 8;
      }
      player.spiritCharges--;
      dashDir.copy(aim);
      dashTime = 0.2;
      player.invuln = 0.4;
      area(p, 6, 65, 0.3);
      player.dashCd = 0;
      player.cooldowns[3] =
        player.spiritCharges > 0 ? 0.6 : c.cooldowns[3] * player.haste;
      burst(p.x, p.z, c.color, 20, 1.2);
    }
  } else if (selected === "yasuo") {
    if (i === 0) {
      player.stacks++;
      if (player.stacks >= 3) {
        player.stacks = 0;
        projectile(p, aim, {
          damage: 65 * qPower,
          pierce: true,
          stun: 1.5,
          speed: 11,
          life: 1.8,
          radius: 0.65,
        });
        toast("STEEL TEMPEST · TORNADO");
      } else {
        area(
          p.clone().addScaledVector(aim, 2),
          2.3 * qPower,
          40 * qPower,
          0.15,
        );
        slash();
      }
    }
    if (i === 1) {
      const m = box(
        5,
        2.7,
        0.2,
        new THREE.MeshBasicMaterial({
          color: 0xa8dfff,
          transparent: true,
          opacity: 0.3,
        }),
        effects,
        p.x + aim.x * 2,
        1.4,
        p.z + aim.z * 2,
      );
      m.rotation.y = Math.atan2(aim.x, aim.z);
      walls.push({ mesh: m, life: 4 });
    }
    if (i === 2) {
      dashDir.copy(aim);
      dashTime = 0.23;
      player.invuln = 0.4;
      area(p.clone().addScaledVector(aim, 2.5), 3, 52);
    }
    if (i === 3) {
      area(p, 8, 150, 2);
      player.invuln = 1;
      cameraShake = 0.25;
    }
  } else {
    if (i === 0) {
      rocketMode = 6;
      toast("SWITCHEROO! · ROCKETS ONLINE");
    }
    if (i === 1)
      projectile(p, aim, {
        damage: 65,
        pierce: true,
        stun: 1.3,
        speed: 30,
        life: 0.7,
        radius: 0.17,
      });
    if (i === 2) {
      for (let j = -1; j <= 1; j++) {
        const at = p.clone().addScaledVector(aim, 3);
        at.x += aim.z * j * 1.5;
        at.z -= aim.x * j * 1.5;
        const m = cylinder(0.35, 0.45, 0.3, M.gold, effects, at.x, 0.2, at.z);
        traps.push({ mesh: m, life: 10 });
      }
    }
    if (i === 3) {
      projectile(p, aim, {
        damage: 240,
        splash: 5,
        speed: 15,
        life: 2,
        radius: 0.5,
      });
      cameraShake = 0.16;
    }
  }
}
function dash() {
  if (player.dashCd > 0) return;
  player.dashCd = 1.4 * player.dashHaste;
  dashDir.copy(moveDirection());
  if (dashDir.lengthSq() < 0.01) dashDir.copy(aim);
  dashTime = 0.18;
  player.invuln = 0.3;
  if (player.nova) area(hero.position, 3, player.nova);
  burst(hero.position.x, hero.position.z, CHAMPIONS[selected].color, 10);
  tone(230, 0.12, "triangle");
}
function moveDirection() {
  const x =
    Number(keys.has("KeyD") || keys.has("ArrowRight")) -
    Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  const y =
    Number(keys.has("KeyW") || keys.has("ArrowUp")) -
    Number(keys.has("KeyS") || keys.has("ArrowDown"));
  const forward = camera.getWorldDirection(new THREE.Vector3());
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  return right.multiplyScalar(x).addScaledVector(forward, y).normalize();
}
function warning(x, z, r, delay, damage, kind = "circle") {
  const m = ring(r, 0xff756e, effects, x, z, 0.09);
  const fill = mesh(
    new THREE.CircleGeometry(r, 48),
    new THREE.MeshBasicMaterial({
      color: 0xed5763,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    m,
  );
  fill.rotation.x = 0;
  hazards.push({ mesh: m, x, z, r, life: delay, max: delay, damage, kind });
}
function enemyUpdate(e, dt) {
  if (e.hp <= 0) return;
  e.cooldown -= dt;
  e.slow = Math.max(0, e.slow - dt);
  e.stun = Math.max(0, e.stun - dt);
  e.flash -= dt;
  if (e.flash <= 0) e.material.emissive.setHex(0);
  const diff = hero.position.clone().sub(e.mesh.position),
    dist = diff.length();
  diff.normalize();
  e.mesh.rotation.y = Math.atan2(diff.x, diff.z);
  e.mesh.position.y = Math.sin(elapsed * 3 + e.maxHp) * 0.06;
  if (e.stun > 0) return;
  if (e.boss && e.hp / e.maxHp < 0.5 && e.phase === 1) {
    e.phase = 2;
    toast("THE GUARDIAN GROWS DESPERATE");
    for (let i = 0; i < 3; i++)
      spawnEnemy(
        "wraith",
        e.mesh.position.x + (i - 1) * 2,
        e.mesh.position.z + 2,
      );
  }
  let move =
    dist > (e.type === "archer" ? 7 : e.boss ? 3 : 1.6)
      ? 1
      : e.type === "archer" && dist < 4
        ? -1
        : 0;
  if (move)
    e.mesh.position.addScaledVector(
      diff,
      dt *
        e.speed *
        move *
        (e.slow > 0 ? 0.65 : 1) *
        (e.phase === 2 ? 1.25 : 1),
    );
  if (e.cooldown <= 0) {
    if (e.boss) {
      e.cooldown = e.phase === 2 ? 1.65 : 2.3;
      const attack = Math.floor(random() * 3);
      if (attack === 0) {
        for (let i = 0; i < (e.phase === 2 ? 6 : 4); i++)
          warning(
            hero.position.x + (random() - 0.5) * 7,
            hero.position.z + (random() - 0.5) * 7,
            1.5,
            0.95,
            22 + room,
          );
      } else if (attack === 1) {
        const n = e.phase === 2 ? 16 : 12;
        for (let i = 0; i < n; i++) {
          const a = (i * TAU) / n + elapsed;
          projectile(
            e.mesh.position,
            new THREE.Vector3(Math.sin(a), 0, Math.cos(a)),
            { enemy: true, damage: 17 + room, speed: 6, life: 4, radius: 0.25 },
          );
        }
      } else {
        warning(e.mesh.position.x, e.mesh.position.z, 5, 1.2, 30);
      }
    } else if (e.type === "archer") {
      e.cooldown = 2.1;
      projectile(e.mesh.position, diff, {
        enemy: true,
        damage: 11 + room,
        speed: 8,
        life: 2.5,
        radius: 0.22,
      });
    } else if (e.type === "charger" && dist < 10) {
      e.cooldown = 3.5;
      const target = hero.position.clone();
      warning(target.x, target.z, 1.8, 0.7, 16 + room);
      e.charge = { dir: diff.clone(), delay: 0.65, time: 0.45 };
    } else if (dist < 2.5) {
      e.cooldown = e.type === "brute" ? 2.4 : 1.5;
      warning(
        e.mesh.position.x + diff.x,
        e.mesh.position.z + diff.z,
        e.type === "brute" ? 2 : 1.15,
        e.type === "brute" ? 0.85 : 0.6,
        e.type === "brute" ? 22 + room : 10 + room,
      );
    }
  }
  if (e.charge) {
    e.charge.delay -= dt;
    if (e.charge.delay <= 0) {
      e.mesh.position.addScaledVector(e.charge.dir, dt * 15);
      e.charge.time -= dt;
      if (e.mesh.position.distanceTo(hero.position) < 1.2) hurt(18 + room);
      if (e.charge.time <= 0) e.charge = null;
    }
  }
  resolveTerrain(e.mesh.position, e.radius);
  if (e.mesh.position.length() > 15) e.mesh.position.setLength(15);
}
function reward() {
  state = "reward";
  const opts = choices(random, player);
  player.hp = Math.min(player.maxHp, player.hp + 15);
  modal(
    `<div class="modal-eyebrow">CHAMBER CLEARED · +15 HEALTH</div><h2 class="modal-title">Power answers your call.</h2><p class="modal-desc">Choose a blessing. Each gift shapes the legend you become.</p><div class="cards">${opts.map((u, i) => `<button class="card" data-upgrade="${i}"><div class="rarity">${["frost", "chain", "eruption", "echo"].includes(u.id) ? "✦ EPIC BLESSING" : "✧ RIFT BLESSING"}</div><div class="upgrade-icon">${u.icon}</div><h3>${u.name}</h3><p>${u.desc}</p><div class="card-bottom">CLAIM BLESSING →</div></button>`).join("")}</div>`,
  );
  document.querySelectorAll("[data-upgrade]").forEach(
    (b) =>
      (b.onclick = () => {
        const u = opts[+b.dataset.upgrade];
        u.apply(player);
        player.buffs.push(u.name);
        hideModal();
        state = "playing";
        portal.visible = true;
        toast(u.name.toUpperCase() + " · ENTER THE PORTAL");
        tone(750, 0.3);
      }),
  );
}
function endRun(win) {
  if (state === "ended") return;
  state = "ended";
  mouseDown = false;
  const earned = Math.floor(killCount / 2) + room * 3 + (win ? 50 : 0);
  save.embers += earned;
  save.best = Math.max(save.best, room);
  if (win) save.wins++;
  persist();
  modal(
    `<div class="modal-eyebrow">${win ? "THE RIFT REMEMBERS YOUR NAME" : "DEATH IS ANOTHER BEGINNING"}</div><h2 class="modal-title">${win ? "A legend reborn." : "Return to the veil."}</h2><p class="modal-desc">${win ? "The keeper has fallen. Dawn reaches the forgotten gardens once more. Your next descent holds a different destiny." : "Your soul endures. Take what you have learned into your next descent."}</p><div class="result-stats"><div><strong>${room}/8</strong><span>CHAMBERS</span></div><div><strong>${killCount}</strong><span>DEFEATED</span></div><div><strong>+${earned}</strong><span>EMBERS</span></div></div><p class="modal-desc">Time ${formatTime(elapsed)} · ${player.buffs.length} blessings · ${CHAMPIONS[selected].name}<br>${save.wins} completed runs · Seed ${runSeed}</p><div class="modal-actions"><button id="again" class="primary">RISE AGAIN <span>›</span></button><button id="home" class="secondary">MAIN MENU</button></div>`,
  );
  $("#again").onclick = selectScreen;
  $("#home").onclick = mainMenu;
  tone(win ? 660 : 140, 0.6, "triangle");
}
function formatTime(t) {
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}
function hud() {
  const c = CHAMPIONS[selected];
  $("#health").style.width = (player.hp / player.maxHp) * 100 + "%";
  $("#hp-text").textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
  $("#gold").textContent = player.gold;
  $("#timer").textContent = formatTime(elapsed);
  $("#level").textContent = `LV. ${1 + player.buffs.length}`;
  $("#passive").textContent =
    selected === "yasuo"
      ? `FLOW ${Math.round(player.shield)}%`
      : selected === "jinx" && excited > 0
        ? "EXCITED!"
        : c.passive;
  document.querySelectorAll(".ability .cooldown").forEach((el, i) => {
    const v = i === 4 ? player.dashCd : player.cooldowns[i];
    el.hidden = v <= 0;
    el.textContent = v > 0 ? v.toFixed(1) : "";
  });
  const boss = enemies.find((e) => e.boss && e.hp > 0);
  $("#boss-hud").hidden = !boss;
  if (boss)
    $("#boss-health").style.width =
      Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
  $("#objective").textContent = portal.visible
    ? "ENTER THE GATE TO DESCEND"
    : `${enemies.filter((e) => e.hp > 0).length} HOSTILES REMAIN`;
  $("#buffs").textContent = player.buffs.map((b) => "✦ " + b).join(" · ");
}
function resolveTerrain(pos, radius) {
  for (const t of terrain) {
    const d = pos.clone().sub(t.mesh.position);
    d.y = 0;
    const len = d.length(),
      limit = t.radius + radius;
    if (len < limit && len > 0.001) pos.addScaledVector(d, (limit - len) / len);
  }
}
function update(dt) {
  elapsed += dt;
  if (player.spiritWindow > 0) {
    player.spiritWindow -= dt;
    if (player.spiritWindow <= 0 && player.spiritCharges > 0) {
      player.spiritCharges = 0;
      player.cooldowns[3] = CHAMPIONS[selected].cooldowns[3] * player.haste;
    }
  }
  environmentTick -= dt;
  if (room > 4 && environmentTick <= 0 && enemies.length) {
    environmentTick = 5;
    warning(hero.position.x, hero.position.z, 1.8, 1.4, 15);
  }
  player.invuln = Math.max(0, player.invuln - dt);
  player.attackCd = Math.max(0, player.attackCd - dt);
  player.dashCd = Math.max(0, player.dashCd - dt);
  player.cooldowns = player.cooldowns.map((c) => Math.max(0, c - dt));
  excited = Math.max(0, excited - dt);
  rocketMode = Math.max(0, rocketMode - dt);
  foxTime = Math.max(0, foxTime - dt);
  ray.setFromCamera(pointer, camera);
  if (!cameraDragging && ray.ray.intersectPlane(plane, mouseWorld)) {
    aim.copy(mouseWorld).sub(hero.position);
    aim.y = 0;
    if (aim.length() > 0.1) aim.normalize();
    else aim.set(0, 0, -1);
  }
  hero.rotation.y = Math.atan2(aim.x, aim.z);
  const movement = moveDirection();
  if (dashTime > 0) {
    hero.position.addScaledVector(dashDir, dt * 25);
    dashTime -= dt;
  } else
    hero.position.addScaledVector(
      movement,
      dt * player.speed * (excited > 0 ? 1.45 : 1),
    );
  if (hero.position.length() > 14.7) hero.position.setLength(14.7);
  hero.position.y = 0;
  resolveTerrain(hero.position, 0.45);
  if (selected === "yasuo" && movement.lengthSq())
    player.shield = Math.min(100, player.shield + dt * 16);
  hero.userData.legs.forEach(
    (l, i) =>
      (l.rotation.x = movement.lengthSq()
        ? Math.sin(elapsed * 16 + i * Math.PI) * 0.55
        : 0),
  );
  hero.userData.halo.material.opacity = player.invuln > 0 ? 1 : 0.4;
  hero.userData.halo.scale.setScalar(player.invuln > 0 ? 1.5 : 1);
  if (mouseDown) basic();
  if (foxTime > 0) {
    foxTick -= dt;
    if (foxTick <= 0) {
      foxTick = 0.4;
      const target = enemies
        .filter((e) => e.hp > 0)
        .sort(
          (a, b) =>
            a.mesh.position.distanceToSquared(hero.position) -
            b.mesh.position.distanceToSquared(hero.position),
        )[0];
      if (target && target.mesh.position.distanceTo(hero.position) < 10)
        projectile(
          hero.position,
          target.mesh.position.clone().sub(hero.position).normalize(),
          { damage: 18, speed: 20, homing: target },
        );
    }
  }
  for (const e of [...enemies]) enemyUpdate(e, dt);
  for (let i = 0; i < enemies.length; i++)
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i],
        b = enemies[j],
        d = a.mesh.position.clone().sub(b.mesh.position);
      d.y = 0;
      const l = d.length(),
        min = a.radius + b.radius;
      if (l > 0 && l < min) {
        d.multiplyScalar(((min - l) * 0.5) / l);
        a.mesh.position.add(d);
        b.mesh.position.sub(d);
      }
    }
  for (const s of shots) {
    s.life -= dt;
    if (s.returning && s.life < 0.7) {
      if (!s.turned) {
        s.hit.clear();
        s.turned = true;
      }
      s.dir.copy(hero.position).sub(s.mesh.position);
      s.dir.y = 0;
      s.dir.normalize();
    }
    if (s.homing && s.homing.hp > 0) {
      s.dir.copy(s.homing.mesh.position).sub(s.mesh.position);
      s.dir.y = 0;
      s.dir.normalize();
    }
    s.mesh.position.addScaledVector(s.dir, dt * s.speed);
    s.mesh.rotation.y += dt * 8;
    if (
      !s.pierce &&
      terrain.some(
        (t) =>
          Math.hypot(
            t.mesh.position.x - s.mesh.position.x,
            t.mesh.position.z - s.mesh.position.z,
          ) < t.radius,
      )
    ) {
      s.life = 0;
      continue;
    }
    if (s.enemy) {
      if (
        walls.some((w) => w.mesh.position.distanceTo(s.mesh.position) < 2.8)
      ) {
        s.life = 0;
        burst(s.mesh.position.x, s.mesh.position.z, 0xaddbff, 3);
      } else if (
        s.mesh.position.clone().setY(0).distanceTo(hero.position) <
        0.7 + (s.radius || 0.2)
      ) {
        hurt(s.damage);
        s.life = 0;
      }
    } else
      for (const e of [...enemies]) {
        if (e.hp <= 0 || s.hit.has(e)) continue;
        const d = e.mesh.position.clone().setY(1).distanceTo(s.mesh.position);
        if (d < e.radius + 0.35 + (s.radius || 0.2)) {
          s.hit.add(e);
          if (s.splash) {
            area(s.mesh.position, s.splash, s.damage);
            cameraShake = 0.09;
          } else hit(e, s.damage);
          if (s.stun) e.stun = s.stun;
          if (!s.pierce) {
            s.life = 0;
            break;
          }
        }
      }
  }
  for (const h of hazards) {
    h.life -= dt;
    h.mesh.material.opacity = 0.35 + (1 - h.life / h.max) * 0.65;
    h.mesh.children[0].material.opacity = 0.08 + (1 - h.life / h.max) * 0.18;
    if (h.life <= 0) {
      pulse(h.x, h.z, h.r, 0xff8477);
      burst(h.x, h.z, 0xff846c, 8, h.r * 0.4);
      if (hero.position.distanceTo(new THREE.Vector3(h.x, 0, h.z)) < h.r + 0.35)
        hurt(h.damage);
    }
  }
  for (const w of walls) w.life -= dt;
  for (const t of traps) {
    t.life -= dt;
    if (
      enemies.some(
        (e) => e.hp > 0 && e.mesh.position.distanceTo(t.mesh.position) < 1.5,
      )
    ) {
      area(t.mesh.position, 2.5, 65, 2);
      t.life = 0;
    }
  }
  for (const list of [shots, hazards, walls, traps])
    for (let i = list.length - 1; i >= 0; i--)
      if (list[i].life <= 0) {
        const o = list.splice(i, 1)[0];
        o.mesh.removeFromParent();
        o.mesh.geometry?.dispose();
        if (!Object.values(M).includes(o.mesh.material))
          o.mesh.material?.dispose();
      }
  for (let i = enemies.length - 1; i >= 0; i--)
    if (enemies[i].hp <= 0) {
      disposeModel(enemies[i].mesh);
      enemies.splice(i, 1);
    }
  if (!enemies.length && state === "playing") {
    if (room === 8) {
      endRun(true);
      return;
    }
    if (!portal.visible) {
      clearTimer += dt;
      if (clearTimer > 1) {
        reward();
        return;
      }
    } else if (hero.position.distanceTo(portal.position) < 2) nextRoom();
  }
  hud();
}
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  const t = now / 1000;
  torches.forEach((f, i) => {
    f.rotation.y = t + i;
    f.scale.y = 1.7 + Math.sin(t * 5 + i) * 0.25;
  });
  fireflies[0].rotation.y = t * 0.008;
  portalGlow.material.opacity = 0.2 + Math.sin(t * 3) * 0.06;
  if (state === "playing" && !window.__HADES_TEST__) update(dt);
  if (state !== "paused" && state !== "reward")
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.life -= dt;
      f.mesh.material.opacity = Math.max(0, f.life / f.max);
      if (f.expand) f.mesh.scale.multiplyScalar(1 + dt * 2);
      else {
        f.mesh.position.x += f.vx * dt;
        f.mesh.position.z += f.vz * dt;
        f.mesh.position.y += f.vy * dt;
        f.vy -= dt * 9;
      }
      if (f.life <= 0) {
        f.mesh.removeFromParent();
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        fx.splice(i, 1);
      }
    }
  if (toastTime > 0) {
    toastTime -= dt;
    if (toastTime <= 0) $("#toast").style.opacity = 0;
  }
  let target, pos;
  if (state === "menu" || state === "select") {
    target = new THREE.Vector3(-3, 0, 0);
    pos = new THREE.Vector3(22, 23, 26);
  } else {
    target = new THREE.Vector3(hero.position.x * 0.2, 0, hero.position.z * 0.2);
    pos = target
      .clone()
      .add(
        new THREE.Vector3(
          Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance,
          Math.sin(cameraPitch) * cameraDistance,
          Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance,
        ),
      );
  }
  camera.position.lerp(pos, 1 - Math.exp(-dt * 3));
  camera.lookAt(target);
  if (cameraShake > 0) {
    cameraShake -= dt;
    camera.position.x += (Math.random() - 0.5) * cameraShake * 2;
    camera.position.y += (Math.random() - 0.5) * cameraShake;
  }
  renderer.render(scene, camera);
}
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();
requestAnimationFrame(animate);
addEventListener("mousemove", (e) => {
  if (cameraDragging && state === "playing") {
    cameraYaw -= (e.clientX - dragX) * 0.006;
    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch + (e.clientY - dragY) * 0.004,
      0.45,
      1.15,
    );
    dragX = e.clientX;
    dragY = e.clientY;
  }
  pointer.set(
    (e.clientX / innerWidth) * 2 - 1,
    (-e.clientY / innerHeight) * 2 + 1,
  );
});
$("#world").addEventListener("mousedown", (e) => {
  if (state !== "playing") return;
  if (e.button === 0) {
    mouseDown = true;
    tone(500, 0.01);
  } else if (e.button === 2) {
    e.preventDefault();
    cameraDragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
  }
});
addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseDown = false;
  if (e.button === 2) cameraDragging = false;
});
$("#world").addEventListener(
  "wheel",
  (e) => {
    if (state !== "playing") return;
    e.preventDefault();
    cameraDistance = THREE.MathUtils.clamp(
      cameraDistance + Math.sign(e.deltaY) * 2,
      25,
      55,
    );
  },
  { passive: false },
);
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("keydown", (e) => {
  const code = e.code;
  if (code === "Escape" || code === "KeyP") {
    if (!e.repeat) pause();
    return;
  }
  if (state !== "playing") return;
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(code)
  ) {
    e.preventDefault();
    keys.add(code);
    return;
  }
  if (code === "Space") {
    e.preventDefault();
    if (!e.repeat) dash();
    return;
  }
  const match = /^(?:Digit|Numpad)([1-4])$/.exec(code);
  if (match) {
    e.preventDefault();
    if (!e.repeat) cast(Number(match[1]) - 1);
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => {
  keys.clear();
  mouseDown = false;
  cameraDragging = false;
  if (state === "playing") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") pause();
});
// A read-only diagnostic snapshot supports automated smoke checks without changing gameplay.
window.__HADES__ = {
  snapshot: () => ({
    state,
    room,
    champion: selected,
    hp: player?.hp,
    enemies: enemies.length,
    targets: enemies
      .filter((e) => e.hp > 0)
      .map((e) => ({
        x: e.mesh.position.x,
        z: e.mesh.position.z,
        hp: e.hp,
        boss: e.boss,
      })),
    portal: portal.visible,
    kills: killCount,
    shots: shots.length,
    position: hero.position.toArray(),
    camera: {
      yaw: cameraYaw,
      pitch: cameraPitch,
      distance: cameraDistance,
      dragging: cameraDragging,
    },
    cooldowns: player?.cooldowns,
    renderer: renderer.info.render,
  }),
  project: (x, z) => {
    const v = new THREE.Vector3(x, 0, z).project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * innerWidth,
      y: (-v.y * 0.5 + 0.5) * innerHeight,
    };
  },
};

if (import.meta.env.DEV && new URLSearchParams(location.search).has("test")) {
  window.__HADES_TEST__ = {
    step(dt = 1 / 60) {
      if (state === "playing") update(dt);
    },
    controls(x, z, moveKeys = [], attack = true) {
      const v = new THREE.Vector3(x, 0, z).project(camera);
      pointer.set(v.x, v.y);
      keys.clear();
      for (const k of moveKeys)
        keys.add(k.length === 1 ? `Key${k.toUpperCase()}` : k);
      mouseDown = attack;
    },
    cast,
    dash,
  };
}
