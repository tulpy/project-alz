import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createIcons, RotateCcw, Plus, Minus, X, ArrowUpRight, ChevronRight } from 'lucide';
import { LAYERS, findComponent } from './data.js?v=8';
import { buildTileTexture, buildLayerTexture, buildFlowTexture, buildLabelTexture } from './icons.js?v=19';

function refreshIcons() {
  createIcons({ icons: { RotateCcw, Plus, Minus, X, ArrowUpRight, ChevronRight } });
}
refreshIcons();

// ---------- DOM ----------
const sceneEl = document.getElementById('scene');
const loadingEl = document.getElementById('loading');
const hoverLabel = document.getElementById('hover-label');
const breadcrumbsEl = document.getElementById('breadcrumbs');
const sceneTitle = document.getElementById('scene-title');
const sceneSubtitle = document.getElementById('scene-subtitle');
const layerNavEl = document.getElementById('layer-nav');
const overviewButton = document.getElementById('overview-button');
const componentCountEl = document.getElementById('component-count');
const detailContent = document.getElementById('detail-content');
const discoveryCountEl = document.getElementById('discovery-count');
const inspectorEyebrow = document.getElementById('inspector-eyebrow');
const separationInput = document.getElementById('separation');
const separationValue = document.getElementById('separation-value');
const stackedButton = document.getElementById('stacked-button');
const explodedButton = document.getElementById('exploded-button');
const resetViewButton = document.getElementById('reset-view');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const helpButton = document.getElementById('help-button');
const helpDialog = document.getElementById('help-dialog');
const closeHelp = document.getElementById('close-help');
const helpDone = document.getElementById('help-done');

const totalComponents = LAYERS.reduce((n, l) => n + l.components.length, 0);
componentCountEl.textContent = `${totalComponents} items`;
document.getElementById('scene-status').textContent = `${LAYERS.length} layers · ${totalComponents} components`;

const explored = new Set();
function updateDiscoveryCount() {
  discoveryCountEl.textContent = `${explored.size} explored`;
}
updateDiscoveryCount();

// ---------- Three.js core ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b12);
scene.fog = new THREE.FogExp2(0x080b12, 0.015);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
const DEFAULT_CAMERA_POS = new THREE.Vector3(9, 8, 11);
camera.position.copy(DEFAULT_CAMERA_POS);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
sceneEl.appendChild(renderer.domElement);

// Environment map for realistic metal/roughness reflections without external HDRIs.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// Post-processing: subtle bloom so emissive edges and the selected component glow.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.4, 0.9);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 2, 0);
controls.minDistance = 4;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x060d1a, 0.85));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
keyLight.position.set(7, 13, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -12;
keyLight.shadow.camera.right = 12;
keyLight.shadow.camera.top = 12;
keyLight.shadow.camera.bottom = -12;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 30;
keyLight.shadow.bias = -0.0015;
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x2ad0a8, 0.6);
rimLight.position.set(-8, 5, -6);
scene.add(rimLight);

// Reflective floor + faint grid for spatial grounding.
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(16, 64),
  new THREE.MeshStandardMaterial({ color: 0x080b12, roughness: 0.95, metalness: 0.05 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.55;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x263544, 0x18212c);
grid.position.y = -0.54;
grid.material.transparent = true;
grid.material.opacity = 0.28;
scene.add(grid);

function resize() {
  const w = sceneEl.clientWidth || 1;
  const h = sceneEl.clientHeight || 1;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  resetCamera();
}
new ResizeObserver(resize).observe(sceneEl);

// ---------- Layout ----------
const SLAB_WIDTH = 7;
const SLAB_DEPTH = 4.2;
const SLAB_HEIGHT = 0.28;
const MAX_GAP = 3.2;

const layerGroups = [];
const componentMeshes = []; // {mesh, layer, component, sprite}
const layerSlabMeshes = [];
let maxComponentTop = 0;

LAYERS.forEach((layer, layerIndex) => {
  const group = new THREE.Group();
  scene.add(group);
  layerGroups.push({ group, layer, index: layerIndex });

  const slabGeo = new RoundedBoxGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH, 4, 0.08);
  const slabMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(layer.color).multiplyScalar(0.24), roughness: 0.65, metalness: 0.15,
    clearcoat: 0.2, clearcoatRoughness: 0.6
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.receiveShadow = true;
  slab.userData = { kind: 'layer', layerId: layer.id };
  group.add(slab);
  layerSlabMeshes.push({ mesh: slab, layer });

  const edges = new THREE.EdgesGeometry(slabGeo, 30);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: 0.7 }));
  group.add(line);

  const layerLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 0.62),
    new THREE.MeshBasicMaterial({ map: buildLayerTexture(layer, layerIndex + 1), transparent: true, depthWrite: false })
  );
  layerLabel.rotation.x = -Math.PI / 2;
  layerLabel.position.set(0, SLAB_HEIGHT / 2 + 0.01, 1.5);
  group.add(layerLabel);

  const n = layer.components.length;
  const spacing = SLAB_WIDTH / (n + 1);
  const baseTileW = 1.65;
  const baseTileD = 1.8;
  const tileScale = Math.min(1, (spacing - 0.12) / baseTileW);
  const tileFaceAspect = (baseTileW - 0.12) / (baseTileD - 0.12);
  layer.components.forEach((component, i) => {
    const boxW = baseTileW * tileScale;
    const boxD = (boxW - 0.12) / tileFaceAspect + 0.12;
    const boxH = 0.225;
    const geo = new RoundedBoxGeometry(boxW, boxH, boxD, 3, 0.06);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x253447, roughness: 0.6, metalness: 0.15,
      emissive: layer.color, emissiveIntensity: 0.04,
      clearcoat: 0.2, clearcoatRoughness: 0.5
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const x = -SLAB_WIDTH / 2 + spacing * (i + 1);
    mesh.position.set(x, SLAB_HEIGHT / 2 + boxH / 2, 0);
    mesh.userData = { kind: 'component', layerId: layer.id, componentId: component.id, baseColor: layer.color, baseEmissive: 0.04 };
    group.add(mesh);
    maxComponentTop = Math.max(maxComponentTop, SLAB_HEIGHT / 2 + boxH);

    const edges2 = new THREE.EdgesGeometry(geo, 30);
    const line2 = new THREE.LineSegments(edges2, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 }));
    line2.position.copy(mesh.position);
    group.add(line2);

    const sprite = new THREE.Mesh(
      new THREE.PlaneGeometry(boxW - 0.12, boxD - 0.12),
      new THREE.MeshBasicMaterial({ map: buildTileTexture(component, layer.color) })
    );
    sprite.rotation.x = -Math.PI / 2;
    sprite.position.y = boxH / 2 + 0.006;
    mesh.add(sprite);

    componentMeshes.push({ mesh, layer, component, sprite, edge: line2 });
  });
});

// ---------- Crate: when layers collapse into a stack, seal the whole assembly inside one closed box ----------
const numLayers = LAYERS.length;
const stackedTopGroupY = (numLayers - 1) * SLAB_HEIGHT; // gap is 0 in stacked mode
const crateBottomY = -SLAB_HEIGHT / 2;
const crateWallMargin = 0.22;
const crateTopClearance = 0.42;
const crateFootprintW = SLAB_WIDTH + crateWallMargin * 2;
const crateFootprintD = SLAB_DEPTH + crateWallMargin * 2;
const crateInteriorTopY = stackedTopGroupY + maxComponentTop;
const lidThickness = 0.26;
const crateTopY = crateInteriorTopY + crateTopClearance;
const crateHeight = (crateTopY + lidThickness / 2) - crateBottomY;
const crateCenterY = (crateTopY + lidThickness / 2 + crateBottomY) / 2;

const crateGroup = new THREE.Group();
crateGroup.visible = false;
scene.add(crateGroup);

const crateBodyMat = new THREE.MeshPhysicalMaterial({
  color: 0x0d1c33,
  roughness: 0.55,
  metalness: 0.18,
  clearcoat: 0.35,
  clearcoatRoughness: 0.45
});
const crateBodyGeo = new RoundedBoxGeometry(crateFootprintW, crateHeight, crateFootprintD, 3, 0.06);
const crateBody = new THREE.Mesh(crateBodyGeo, crateBodyMat);
crateBody.position.y = crateCenterY;
crateBody.castShadow = true;
crateBody.receiveShadow = true;
crateGroup.add(crateBody);

const crateEdges = new THREE.EdgesGeometry(crateBodyGeo, 25);
const crateOutline = new THREE.LineSegments(crateEdges, new THREE.LineBasicMaterial({ color: 0xc13186, transparent: true, opacity: 0.75 }));
crateOutline.position.y = crateCenterY;
crateGroup.add(crateOutline);

const labelTexture = buildLabelTexture('Azure Landing Zone', 'Conceptual Architecture');
const labelInset = crateWallMargin / 2;
const labelGeo = new THREE.PlaneGeometry(crateFootprintW - labelInset * 2, crateFootprintD - labelInset * 2);
const labelMat = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthWrite: false });
const labelMesh = new THREE.Mesh(labelGeo, labelMat);
labelMesh.rotation.x = -Math.PI / 2;
labelMesh.position.y = crateTopY + lidThickness / 2 + 0.004;
crateGroup.add(labelMesh);

let separation = 0.7;
let exploded = true;
let focusedLayerId = null;
const animations = [];
let cameraAnimation = null;
const LAYOUT_ANIMATION_DURATION = 760;

function easeInOutSmootherStep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function applyLayerFocus() {
  layerGroups.forEach(({ group, layer }) => {
    group.visible = exploded && (!focusedLayerId || layer.id === focusedLayerId);
  });
  connectionEntries.forEach(conn => {
    conn.tubeMesh.visible = !focusedLayerId || (
      conn.from.layer.id === focusedLayerId && conn.to.layer.id === focusedLayerId
    );
  });
}

function applyLayout(animate = true) {
  animations.length = 0;
  const gap = exploded ? separation * MAX_GAP : 0;
  crateGroup.visible = !exploded;
  tubeGroup.visible = exploded;
  applyLayerFocus();
  layerGroups.forEach(({ group, index }) => {
    const targetY = index * (SLAB_HEIGHT + gap);
    if (animate) {
      animateY(group, targetY);
    } else {
      group.position.y = targetY;
    }
  });
  scene.updateMatrixWorld(true);
  connectionEntries.forEach(conn => rebuildConnectionTube(conn));
  resetCamera(animate);
}
function animateY(obj, targetY) {
  const startY = obj.position.y;
  const start = performance.now();
  const duration = LAYOUT_ANIMATION_DURATION;
  animations.push({ obj, startY, targetY, start, duration });
}
function stepAnimations(now) {
  let active = false;
  for (let i = animations.length - 1; i >= 0; i--) {
    const a = animations[i];
    const t = Math.min(1, (now - a.start) / a.duration);
    const eased = easeInOutSmootherStep(t);
    a.obj.position.y = a.startY + (a.targetY - a.startY) * eased;
    active = true;
    if (t >= 1) animations.splice(i, 1);
  }
  return active;
}

function stepCameraAnimation(now) {
  if (!cameraAnimation) return false;
  const animation = cameraAnimation;
  const t = Math.min(1, (now - animation.start) / animation.duration);
  const eased = easeInOutSmootherStep(t);
  camera.position.lerpVectors(animation.startPosition, animation.targetPosition, eased);
  controls.target.lerpVectors(animation.startTarget, animation.targetTarget, eased);
  if (t >= 1) cameraAnimation = null;
  return true;
}

// ---------- Connection tubes (animated data-flow between related components) ----------
const seenPairs = new Set();
const connectionEntries = [];
LAYERS.forEach(layer => {
  layer.components.forEach(component => {
    (component.connections || []).forEach(targetId => {
      const key = [component.id, targetId].sort().join('|');
      if (seenPairs.has(key)) return;
      seenPairs.add(key);
      const from = componentMeshes.find(c => c.component.id === component.id);
      const to = componentMeshes.find(c => c.component.id === targetId);
      if (!from || !to) return;
      connectionEntries.push({ from, to });
    });
  });
});

const flowTexture = buildFlowTexture(0x2ad0a8);
const tubeMat = new THREE.MeshBasicMaterial({
  map: flowTexture, transparent: true, opacity: 0.55, color: 0xbfe8dd, depthWrite: false
});

const tubeGroup = new THREE.Group();
scene.add(tubeGroup);

function worldPos(entry, out) {
  entry.mesh.getWorldPosition(out);
  return out;
}
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

connectionEntries.forEach(conn => {
  worldPos(conn.from, tmpA);
  worldPos(conn.to, tmpB);
  const mid = tmpA.clone().add(tmpB).multiplyScalar(0.5);
  mid.y += 0.9;
  const curve = new THREE.CatmullRomCurve3([tmpA.clone(), mid, tmpB.clone()]);
  const geo = new THREE.TubeGeometry(curve, 24, 0.028, 8, false);
  const mesh = new THREE.Mesh(geo, tubeMat.clone());
  mesh.userData = { kind: 'connection' };
  tubeGroup.add(mesh);
  conn.tubeMesh = mesh;
});

function rebuildConnectionTube(conn) {
  worldPos(conn.from, tmpA);
  worldPos(conn.to, tmpB);
  const mid = tmpA.clone().add(tmpB).multiplyScalar(0.5);
  mid.y += 0.9;
  const curve = new THREE.CatmullRomCurve3([tmpA.clone(), mid, tmpB.clone()]);
  const newGeo = new THREE.TubeGeometry(curve, 24, 0.028, 8, false);
  conn.tubeMesh.geometry.dispose();
  conn.tubeMesh.geometry = newGeo;
}

// ---------- Selection state ----------
let hoveredMesh = null;
let currentLayerId = null;
let currentComponentId = null;

function setEmphasis(entry, on) {
  if (!entry) return;
  const targetScale = on ? 1.14 : 1;
  entry.mesh.scale.set(targetScale, targetScale, targetScale);
  entry.mesh.material.emissiveIntensity = on ? 0.35 : entry.mesh.userData.baseEmissive;
}

function clearSelectionVisuals() {
  componentMeshes.forEach(entry => setEmphasis(entry, false));
  layerSlabMeshes.forEach(({ mesh }) => { mesh.material.emissive.setHex(0x000000); });
  connectionEntries.forEach(conn => { conn.tubeMesh.material.opacity = 0.08; });
}

function highlightConnectionsFor(componentId) {
  connectionEntries.forEach(conn => {
    const involved = conn.from.component.id === componentId || conn.to.component.id === componentId;
    conn.tubeMesh.material.opacity = involved ? 0.65 : 0.04;
  });
}

// ---------- Raycasting ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function getIntersects(clientX, clientY) {
  const rect = sceneEl.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (!exploded) return raycaster.intersectObject(crateBody, false);
  const meshes = componentMeshes.map(c => c.mesh).concat(layerSlabMeshes.map(l => l.mesh));
  return raycaster.intersectObjects(meshes, false);
}

sceneEl.addEventListener('pointermove', (e) => {
  const hits = getIntersects(e.clientX, e.clientY);
  if (hits.length) {
    const obj = hits[0].object;
    if (obj.userData.kind === 'component') {
      hoveredMesh = obj;
      const rect = sceneEl.getBoundingClientRect();
      hoverLabel.hidden = false;
      hoverLabel.style.left = `${e.clientX - rect.left}px`;
      hoverLabel.style.top = `${e.clientY - rect.top}px`;
      const found = findComponent(obj.userData.componentId);
      hoverLabel.textContent = found ? found.component.name : '';
      sceneEl.style.cursor = 'pointer';
      return;
    }
  }
  hoveredMesh = null;
  hoverLabel.hidden = true;
  sceneEl.style.cursor = 'grab';
});

let pointerStart = null;
sceneEl.addEventListener('pointerdown', event => {
  hoverLabel.hidden = true;
  pointerStart = { x: event.clientX, y: event.clientY };
});
sceneEl.addEventListener('pointerleave', () => {
  hoveredMesh = null;
  hoverLabel.hidden = true;
});

sceneEl.addEventListener('click', (e) => {
  if (!pointerStart || Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5) return;
  const hits = getIntersects(e.clientX, e.clientY);
  if (!hits.length) return;
  const obj = hits[0].object;
  if (obj.userData.kind === 'component') {
    selectComponent(obj.userData.componentId);
  } else if (obj.userData.kind === 'layer') {
    selectLayer(obj.userData.layerId);
  }
});

// ---------- UI: layer nav ----------
function buildNav() {
  layerNavEl.innerHTML = '';
  [...LAYERS].reverse().forEach(layer => {
    const block = document.createElement('div');
    block.className = 'layer-block';
    block.dataset.layerId = layer.id;
    block.style.setProperty('--layer-color', `#${layer.color.toString(16).padStart(6, '0')}`);

    const layerBtn = document.createElement('button');
    layerBtn.className = 'layer-nav-button';
    layerBtn.dataset.layerId = layer.id;
    layerBtn.setAttribute('aria-expanded', 'false');
    layerBtn.setAttribute('aria-controls', `components-${layer.id}`);
    layerBtn.innerHTML = `<span class="layer-number">${String(LAYERS.indexOf(layer) + 1).padStart(2, '0')}</span><span class="layer-name">${layer.name}<small>${layer.components.length} components</small></span><i data-lucide="chevron-right" class="layer-chevron"></i>`;
    layerBtn.addEventListener('click', () => {
      if (currentLayerId === layer.id && !currentComponentId) showOverview();
      else selectLayer(layer.id);
    });
    block.appendChild(layerBtn);

    const componentList = document.createElement('div');
    componentList.id = `components-${layer.id}`;
    componentList.className = 'component-list';
    componentList.hidden = true;
    layer.components.forEach(component => {
      const cBtn = document.createElement('button');
      cBtn.className = 'component-nav-button';
      cBtn.textContent = component.name;
      cBtn.dataset.componentId = component.id;
      cBtn.addEventListener('click', () => selectComponent(component.id));
      componentList.appendChild(cBtn);
    });

    block.appendChild(componentList);
    layerNavEl.appendChild(block);
  });
  refreshIcons();
}
buildNav();

function refreshNavActive() {
  document.querySelectorAll('.layer-block').forEach(block => {
    const active = block.dataset.layerId === currentLayerId;
    const button = block.querySelector('.layer-nav-button');
    button.classList.toggle('active', active);
    button.setAttribute('aria-expanded', String(active));
    block.querySelector('.component-list').hidden = !active;
  });
  document.querySelectorAll('.component-nav-button').forEach(btn => {
    btn.classList.remove('active');
    btn.removeAttribute('aria-current');
  });
  overviewButton.classList.remove('active');
  overviewButton.removeAttribute('aria-current');

  if (currentComponentId) {
    const btn = document.querySelector(`.component-nav-button[data-component-id="${currentComponentId}"]`);
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'true');
    }
  } else if (!currentLayerId) {
    overviewButton.classList.add('active');
    overviewButton.setAttribute('aria-current', 'true');
  }
}

// ---------- Breadcrumbs ----------
function renderBreadcrumbs() {
  breadcrumbsEl.innerHTML = '';
  const overviewCrumb = document.createElement('span');
  if (!currentLayerId) {
    overviewCrumb.textContent = 'PLATFORM OVERVIEW';
  } else {
    const btn = document.createElement('button');
    btn.textContent = 'PLATFORM OVERVIEW';
    btn.addEventListener('click', showOverview);
    overviewCrumb.appendChild(btn);
  }
  breadcrumbsEl.appendChild(overviewCrumb);

  if (currentLayerId) {
    const layer = LAYERS.find(l => l.id === currentLayerId);
    const crumb = document.createElement('span');
    if (!currentComponentId) {
      crumb.textContent = layer.name.toUpperCase();
    } else {
      const btn = document.createElement('button');
      btn.textContent = layer.name.toUpperCase();
      btn.addEventListener('click', () => selectLayer(layer.id));
      crumb.appendChild(btn);
    }
    breadcrumbsEl.appendChild(crumb);
  }

  if (currentComponentId) {
    const found = findComponent(currentComponentId);
    const crumb = document.createElement('span');
    crumb.textContent = found.component.name.toUpperCase();
    breadcrumbsEl.appendChild(crumb);
  }
}

// ---------- Detail panel ----------
function renderOverviewDetail() {
  inspectorEyebrow.textContent = 'FIELD GUIDE';
  detailContent.innerHTML = `
    <h2>Explore Azure<br>Landing Zones</h2>
    <p>A foundation for your Azure estate, from shared governance to the subscriptions where your workloads run.</p>
    <p>Platform services establish guardrails. Platform landing zones provide shared capabilities. Application landing zones give workload teams their own governed environments.</p>
    <section class="guide-section">
      <h3>Microsoft architecture guide</h3>
      <a class="guide-link" href="https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/" target="_blank" rel="noopener noreferrer"><strong>Azure Landing Zones <i data-lucide="arrow-up-right"></i></strong><span>Cloud Adoption Framework</span></a>
    </section>
    <section class="guide-section">
      <h3>Explore the architecture</h3>
      <button class="guide-link" data-layer="platform-services"><strong>Establish your guardrails <i data-lucide="arrow-up-right"></i></strong><span>Management groups, policy, and access</span></button>
      <button class="guide-link" data-layer="platform-landing-zones"><strong>Build the shared platform <i data-lucide="arrow-up-right"></i></strong><span>Connectivity, management, and identity</span></button>
      <button class="guide-link" data-layer="application-landing-zones"><strong>Enable workload teams <i data-lucide="arrow-up-right"></i></strong><span>Subscription vending and spoke networks</span></button>
    </section>
  `;
  detailContent.querySelectorAll('[data-layer]').forEach(button => {
    button.addEventListener('click', () => selectLayer(button.dataset.layer));
  });
  refreshIcons();
}

function renderLayerDetail(layer) {
  inspectorEyebrow.textContent = 'LAYER';
  detailContent.innerHTML = `
    <span class="kicker">LAYER</span>
    <h2>${layer.name}</h2>
    <p>${layer.tagline}</p>
    <div class="connections">
      <h3>Components in this layer</h3>
      <ul>${layer.components.map(c => `<li><button data-target="${c.id}">${c.name}</button></li>`).join('')}</ul>
    </div>
  `;
  detailContent.querySelectorAll('button[data-target]').forEach(btn => {
    btn.addEventListener('click', () => selectComponent(btn.dataset.target));
  });
}

function renderComponentDetail(layer, component) {
  inspectorEyebrow.textContent = layer.name.toUpperCase();
  const connectionItems = (component.connections || []).map(id => {
    const found = findComponent(id);
    if (!found) return '';
    return `<li><button data-target="${id}">${found.component.name} <span style="color:var(--text-dim); font-size:0.75rem;">— ${found.layer.name}</span></button></li>`;
  }).join('');

  detailContent.innerHTML = `
    <span class="kicker">${layer.name.toUpperCase()}</span>
    <h2>${component.name}</h2>
    <p>${component.summary}</p>
    <div class="tag-list">${(component.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
    <p>${component.details}</p>
    <div class="connections">
      <h3>Connects to</h3>
      <ul>${connectionItems || '<li style="color:var(--text-dim); font-size:0.82rem;">No direct connections modeled.</li>'}</ul>
    </div>
  `;
  detailContent.querySelectorAll('button[data-target]').forEach(btn => {
    btn.addEventListener('click', () => selectComponent(btn.dataset.target));
  });
}

// ---------- Selection actions ----------
function showOverview() {
  focusedLayerId = null;
  currentLayerId = null;
  currentComponentId = null;
  clearSelectionVisuals();
  applyLayerFocus();
  sceneTitle.textContent = 'Azure Landing Zones';
  sceneSubtitle.textContent = 'Click a layer or component to explore.';
  renderOverviewDetail();
  renderBreadcrumbs();
  refreshNavActive();
  resetCamera();
}

function selectLayer(layerId) {
  const layer = LAYERS.find(l => l.id === layerId);
  if (!layer) return;
  if (!exploded) revealSeparated();
  currentLayerId = layerId;
  currentComponentId = null;
  clearSelectionVisuals();
  sceneTitle.textContent = layer.name;
  sceneSubtitle.textContent = layer.tagline;
  renderLayerDetail(layer);
  renderBreadcrumbs();
  refreshNavActive();
  focusOnGroup(layerId);
}

function selectComponent(componentId) {
  const found = findComponent(componentId);
  if (!found) return;
  if (!exploded) revealSeparated();
  const { layer, component } = found;
  currentLayerId = layer.id;
  currentComponentId = componentId;
  explored.add(componentId);
  updateDiscoveryCount();
  clearSelectionVisuals();
  const entry = componentMeshes.find(c => c.component.id === componentId);
  if (entry) setEmphasis(entry, true);
  highlightConnectionsFor(componentId);
  sceneTitle.textContent = component.name;
  sceneSubtitle.textContent = `Part of ${layer.name}`;
  renderComponentDetail(layer, component);
  renderBreadcrumbs();
  refreshNavActive();
  focusOnGroup(layer.id);
}

function focusOnGroup(layerId) {
  focusedLayerId = layerId;
  applyLayerFocus();
  layerSlabMeshes.forEach(({ mesh, layer }) => {
    mesh.material.emissive.setHex(layer.id === layerId ? layer.color : 0x000000);
    mesh.material.emissiveIntensity = 0.12;
  });
  resetCamera();
}

overviewButton.addEventListener('click', showOverview);

// ---------- Explode controls ----------
function updateSeparationUI() {
  separationValue.textContent = `${Math.round(separation * 100)}%`;
  separationInput.value = String(Math.round(separation * 100));
}
separationInput.addEventListener('input', () => {
  separation = Number(separationInput.value) / 100;
  updateSeparationUI();
  if (separation <= 0) {
    if (exploded) setExploded(false);
  } else if (!exploded) {
    setExploded(true);
  } else {
    applyLayout(false);
  }
});

const DEFAULT_SEPARATION = 0.7;
function revealSeparated() {
  if (separation <= 0) {
    separation = DEFAULT_SEPARATION;
    updateSeparationUI();
  }
  setExploded(true);
}
stackedButton.addEventListener('click', () => {
  separation = 0;
  updateSeparationUI();
  setExploded(false);
});
explodedButton.addEventListener('click', revealSeparated);
function setExploded(next) {
  if (!next && focusedLayerId) {
    focusedLayerId = null;
    currentLayerId = null;
    currentComponentId = null;
    clearSelectionVisuals();
    sceneTitle.textContent = 'Azure Landing Zones';
    sceneSubtitle.textContent = 'Click a layer or component to explore.';
    renderOverviewDetail();
    renderBreadcrumbs();
    refreshNavActive();
  }
  exploded = next;
  stackedButton.setAttribute('aria-pressed', String(!exploded));
  explodedButton.setAttribute('aria-pressed', String(exploded));
  applyLayout();
}
updateSeparationUI();
applyLayout(false);
connectionEntries.forEach(conn => rebuildConnectionTube(conn));

// ---------- View tools ----------
function resetCamera(animate = false) {
  const focusedGroup = layerGroups.find(({ layer }) => layer.id === focusedLayerId)?.group;
  const modelHeight = exploded ? (LAYERS.length - 1) * (SLAB_HEIGHT + separation * MAX_GAP) + maxComponentTop : crateHeight;
  const focusHalfHeight = (maxComponentTop + SLAB_HEIGHT / 2) / 2 + 0.1;
  const centerY = focusedGroup
    ? focusedGroup.position.y + (maxComponentTop - SLAB_HEIGHT / 2) / 2
    : modelHeight / 2;
  const verticalRadius = focusedGroup ? focusHalfHeight : modelHeight / 2 + 0.25;
  const center = new THREE.Vector3(0, centerY, 0);
  const direction = DEFAULT_CAMERA_POS.clone().normalize();
  const framingCamera = camera.clone();
  framingCamera.position.copy(center).add(direction);
  framingCamera.lookAt(center);
  const inverseRotation = framingCamera.quaternion.clone().invert();
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let distance = 0;
  [-1, 1].forEach(side => [-1, 1].forEach(level => [-1, 1].forEach(depth => {
    const corner = new THREE.Vector3(side * 3.8, level * verticalRadius, depth * 2.4).applyQuaternion(inverseRotation);
    distance = Math.max(distance, Math.abs(corner.x) / (tangent * camera.aspect * 0.85) + corner.z, Math.abs(corner.y) / (tangent * 0.58) + corner.z);
  })));
  if (focusedGroup) distance *= 0.78;
  const targetPosition = center.clone().addScaledVector(direction, distance);
  if (animate) {
    cameraAnimation = {
      startPosition: camera.position.clone(),
      targetPosition,
      startTarget: controls.target.clone(),
      targetTarget: center,
      start: performance.now(),
      duration: LAYOUT_ANIMATION_DURATION
    };
  } else {
    cameraAnimation = null;
    controls.target.copy(center);
    camera.position.copy(targetPosition);
  }
  controls.maxDistance = Math.max(30, distance * 2);
  controls.update();
}
resetViewButton.addEventListener('click', resetCamera);
zoomInButton.addEventListener('click', () => {
  camera.position.sub(controls.target).multiplyScalar(0.85).add(controls.target);
});
zoomOutButton.addEventListener('click', () => {
  camera.position.sub(controls.target).multiplyScalar(1.18).add(controls.target);
});

// ---------- Help dialog ----------
helpButton.addEventListener('click', () => helpDialog.showModal());
closeHelp.addEventListener('click', () => helpDialog.close());
helpDone.addEventListener('click', () => helpDialog.close());

// ---------- Keyboard: escape returns to overview ----------
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (helpDialog.open) { helpDialog.close(); return; }
    showOverview();
  }
});

// ---------- Render loop ----------
let flowOffset = 0;
function tick(now) {
  const layoutMoving = stepAnimations(now);
  stepCameraAnimation(now);
  if (layoutMoving) {
    scene.updateMatrixWorld(true);
    connectionEntries.forEach(conn => rebuildConnectionTube(conn));
  }

  // Animate the flowing dash texture along every connection to suggest live data movement.
  flowOffset += 0.006;
  tubeGroup.children.forEach(mesh => { mesh.material.map.offset.x = -flowOffset; });

  // Gentle pulse on the hovered component so it feels alive without stealing focus.
  componentMeshes.forEach(entry => {
    const isHover = entry.mesh === hoveredMesh;
    const isSelected = entry.component.id === currentComponentId;
    entry.edge.material.color.setHex(isHover ? entry.layer.color : 0xffffff);
    entry.edge.material.opacity = isHover ? 0.85 : 0.72;
    if (isHover && !isSelected) {
      entry.mesh.material.emissiveIntensity = 0.4 + Math.sin(now * 0.006) * 0.08;
    } else if (!isSelected) {
      entry.mesh.material.emissiveIntensity = entry.mesh.userData.baseEmissive;
    }
  });

  controls.update();
  composer.render();
  requestAnimationFrame(tick);
}

resize();
renderOverviewDetail();
renderBreadcrumbs();
refreshNavActive();
clearSelectionVisuals();
requestAnimationFrame(() => {
  loadingEl.hidden = true;
  requestAnimationFrame(tick);
});
