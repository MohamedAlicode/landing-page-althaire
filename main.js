/* =========================================================
   ALTAÏR — scrollytelling
   Three.js (scène), GSAP + ScrollTrigger (récit), Lenis (scroll doux)
   ========================================================= */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrowMQ = matchMedia('(max-width: 768px)');
const LOW_POWER = narrowMQ.matches || matchMedia('(pointer: coarse)').matches;
const FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)').matches;
let isNarrow = narrowMQ.matches;

/* ---------------------------------------------------------
   Smooth scroll (Lenis) synchronisé avec ScrollTrigger
   --------------------------------------------------------- */
let lenis = null;
if (!REDUCED) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Ancres internes : scroll doux + focus déplacé pour les lecteurs d'écran / clavier
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.8 });
    else target.scrollIntoView();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

/* ---------------------------------------------------------
   État partagé du flacon : piloté par le scroll, lu par le rendu
   --------------------------------------------------------- */
const PROPS = ['x', 'y', 's', 'rx', 'ry', 'rz', 'stars'];
const TAU = Math.PI * 2;
const HALF_H = 6 * Math.tan(THREE.MathUtils.degToRad(35 / 2)); // demi-hauteur visible à z = 0
let halfW = HALF_H * (innerWidth / innerHeight);

// Poses clés du flacon pour chaque moment du récit (fonctions : recalculées au resize)
const KF = {
  hero:       () => isNarrow ? { x: 0, y: 0.6, s: 0.7, rx: 0.06, ry: -0.45, rz: 0, stars: 1 }
                             : { x: 0, y: 0.6, s: 0.7, rx: 0.06, ry: -0.5, rz: 0, stars: 1 },
  etoile:     () => isNarrow ? { x: 0, y: 0.8, s: 0.58, rx: 0.12, ry: 1.7, rz: -0.14, stars: 1.8 }
                             : { x: halfW * 0.42, y: 0.02, s: 0.92, rx: 0.12, ry: 1.9, rz: -0.14, stars: 1.8 },
  notes:      () => isNarrow ? { x: 0, y: 0.8, s: 0.58, rx: -0.05, ry: 3.4, rz: 0.1, stars: 1 }
                             : { x: halfW * 0.46, y: -0.04, s: 0.84, rx: -0.06, ry: 3.5, rz: 0.1, stars: 1 },
  flacon:     () => isNarrow ? { x: 0, y: 0.55, s: 0.82, rx: 0.1, ry: 4.7, rz: 0, stars: 0.7 }
                             : { x: halfW * 0.34, y: -0.04, s: 1.28, rx: 0.1, ry: 4.7, rz: 0, stars: 0.7 },
  flaconA:    () => isNarrow ? { x: 0, y: 0.55, s: 0.88, rx: 0.08, ry: 4.7 + Math.PI, rz: 0, stars: 0.6 }
                             : { x: halfW * 0.34, y: -0.04, s: 1.36, rx: 0.08, ry: 4.7 + Math.PI, rz: 0, stars: 0.6 },
  flaconB:    () => isNarrow ? { x: 0, y: 0.6, s: 0.92, rx: 0.22, ry: 4.7 + 1.6 * Math.PI, rz: 0.32, stars: 0.6 }
                             : { x: halfW * 0.34, y: 0.06, s: 1.45, rx: 0.22, ry: 4.7 + 1.6 * Math.PI, rz: 0.32, stars: 0.6 },
  flaconEnd:  () => isNarrow ? { x: 0, y: -0.45, s: 1.45, rx: 0.32, ry: 4.7 + TAU, rz: 0, stars: 0.4 }
                             : { x: halfW * 0.34, y: -1.25, s: 2.2, rx: 0.3, ry: 4.7 + TAU, rz: 0, stars: 0.4 },
  sillage:    () => isNarrow ? { x: halfW * 0.4, y: 0.15, s: 0.45, rx: 0.15, ry: 12, rz: -0.45, stars: 1 }
                             : { x: halfW * 0.62, y: 0.3, s: 0.72, rx: 0.15, ry: 12, rz: -0.45, stars: 1 },
  sillageEnd: () => isNarrow ? { x: -halfW * 0.4, y: 0.15, s: 0.45, rx: 0.15, ry: 12 + Math.PI, rz: 0.45, stars: 1.3 }
                             : { x: halfW * 0.3, y: 0.35, s: 0.72, rx: 0.15, ry: 12 + Math.PI, rz: 0.45, stars: 1.3 },
  // pose finale (bas de page) : calée entre l'en-tête et le texte du CTA, voir measureCta()
  cta:        () => ({ x: 0, y: ctaLayout.y, s: ctaLayout.s, rx: 0.05, ry: 6 * Math.PI - 0.5, rz: 0, stars: 1.6 }),
  // avant l'arrivée du footer, le texte est plus bas d'autant : le flacon aussi
  ctaIn:      () => ({ ...KF.cta(), y: ctaLayout.y - ctaLayout.shift }),
};

// Mesure l'espace libre au-dessus du texte du CTA quand la page est en bas
const ctaLayout = { y: 0.8, s: 0.62, shift: 0 };
const BOTTLE_TOP = 1.09, BOTTLE_H = 2.15; // dimensions du flacon à l'échelle 1
function measureCta() {
  const content = document.querySelector('.cta__content');
  const footer = document.querySelector('.site-footer');
  if (!content) return;
  const wpp = (2 * HALF_H) / innerHeight; // unités monde par pixel à z = 0
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const contentTop = content.getBoundingClientRect().top + window.scrollY - maxScroll;
  const top = isNarrow ? 76 : 96; // sous l'en-tête
  const avail = Math.max(140, contentTop - 28 - top) * wpp;
  ctaLayout.s = Math.min(isNarrow ? 0.62 : 0.7, avail / BOTTLE_H);
  ctaLayout.y = HALF_H - top * wpp - BOTTLE_TOP * ctaLayout.s;
  ctaLayout.shift = (footer ? footer.offsetHeight : 0) * wpp;
}
measureCta();
ScrollTrigger.addEventListener('refresh', measureCta);

const state = { ...KF.hero(), reveal: REDUCED ? 1 : 0 };
const disp = { ...state }; // valeurs lissées affichées
const segments = []; // plages de scroll reliant deux poses (voir addSegment)

/* ---------------------------------------------------------
   Scène Three.js
   --------------------------------------------------------- */
const canvas = document.getElementById('scene');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW_POWER, powerPreference: 'high-performance' });
} catch (err) {
  root.classList.add('no-webgl');
}

function buildScene(renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW_POWER ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);

  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Éclairage studio : envmap neutre (reflets) + lumières chaudes
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const lights = {
    key: new THREE.DirectionalLight(0xffd6a6, 2.6),
    rim: new THREE.DirectionalLight(0xff8a42, 3.2),
    fill: new THREE.DirectionalLight(0x6f86c8, 0.7),
    glow: new THREE.PointLight(0xff9a4a, 5, 4, 2),
  };
  lights.key.position.set(-3, 4, 5);
  lights.rim.position.set(4, 1.5, -4);
  lights.fill.position.set(3, -2, 4);
  Object.values(lights).forEach((l) => scene.add(l));
  const lightBase = Object.fromEntries(Object.entries(lights).map(([k, l]) => [k, l.intensity]));

  const bottle = buildBottle(renderer);
  scene.add(bottle.group);

  // Halo cuivré derrière le flacon (opaque + additif : visible à travers le verre)
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 5.5),
    new THREE.MeshBasicMaterial({
      map: radialTexture(),
      color: 0xb8894f,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  halo.position.z = -1.8;
  scene.add(halo);

  const stars = buildStars();
  stars.forEach((s) => scene.add(s.points));

  return { renderer, scene, camera, lights, lightBase, bottle, halo, stars };
}

/* ---------- Flacon construit en géométrie ---------- */
function buildBottle(renderer) {
  const group = new THREE.Group();
  group.rotation.order = 'XZY'; // pivot autour de son axe, puis inclinaison
  const inner = new THREE.Group();
  inner.position.y = -0.335; // recentre l'ensemble (corps + bouchon)
  group.add(inner);

  const W = 1.15, H = 1.45, D = 0.6;
  const seg = LOW_POWER ? 4 : 6;

  // Verre transparent
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    thickness: 0.35,
    ior: 1.5,
    attenuationColor: new THREE.Color(0xffe4c2),
    attenuationDistance: 2.5,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    specularIntensity: 1,
    envMapIntensity: 1.5,
  });
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, seg, 0.17), glassMat);
  inner.add(body);

  // Liquide ambré (opaque pour être réfracté par le verre)
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0x8a3c10,
    roughness: 0.12,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: new THREE.Color(0x6a2a0a),
    emissiveIntensity: 0.4,
    envMapIntensity: 0.7,
  });
  const liquidH = 1.0;
  const liquid = new THREE.Mesh(new RoundedBoxGeometry(W - 0.16, liquidH, D - 0.15, seg, 0.1), liquidMat);
  liquid.position.y = -H / 2 + 0.17 + liquidH / 2;
  inner.add(liquid);

  // Métal doré
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9b46c,
    metalness: 1,
    roughness: 0.2,
    clearcoat: 0.5,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.7,
  });
  const goldSatin = goldMat.clone();
  goldSatin.roughness = 0.42;
  goldSatin.color = new THREE.Color(0xc79a52);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.14, 48), goldMat);
  collar.position.y = H / 2 + 0.07;
  inner.add(collar);

  const cap = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.56, 0.52, seg, 0.1), goldMat);
  cap.position.y = H / 2 + 0.14 + 0.28;
  inner.add(cap);

  // Filet satiné à la base du bouchon
  const band = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.05, 0.54, 2, 0.02), goldSatin);
  band.position.y = cap.position.y - 0.22;
  inner.add(band);

  // Étoile frappée sur le bouchon (motif original, pas un logo)
  const starGeo = new THREE.ExtrudeGeometry(starShape(0.12, 0.028, 4), {
    depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2,
  });
  const capStar = new THREE.Mesh(starGeo, goldSatin);
  capStar.position.set(0, cap.position.y + 0.02, 0.26);
  inner.add(capStar);

  // Étiquette dorée sur le verre, dessinée en canvas
  const labelTex = new THREE.CanvasTexture(document.createElement('canvas'));
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.84, 0.42),
    new THREE.MeshStandardMaterial({
      map: labelTex, transparent: true, depthWrite: false,
      metalness: 0.85, roughness: 0.32, envMapIntensity: 1.4,
    })
  );
  label.position.set(0, 0.12, D / 2 + 0.004);
  inner.add(label);
  drawLabel(labelTex);
  document.fonts?.ready.then(() => drawLabel(labelTex));

  const envMats = [
    [glassMat, glassMat.envMapIntensity],
    [liquidMat, liquidMat.envMapIntensity],
    [goldMat, goldMat.envMapIntensity],
    [goldSatin, goldSatin.envMapIntensity],
    [label.material, label.material.envMapIntensity],
  ];

  return { group, liquidMat, envMats };
}

function starShape(R, r, points) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points + Math.PI / 2;
    const rad = i % 2 ? r : R;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function drawLabel(tex) {
  const c = tex.image;
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = '#ecd5a6';
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  // petite étoile à quatre branches
  g.save();
  g.translate(512, 92);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 ? 7 : 30;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.restore();

  spacedText(g, 'ALTAÏR', 512, 240, '300 168px "Cormorant Garamond", Georgia, serif', 30);
  g.fillRect(392, 342, 240, 2);
  spacedText(g, 'EAU DE PARFUM', 512, 400, '400 34px "Jost", Arial, sans-serif', 12);
  tex.needsUpdate = true;
}

function spacedText(g, text, cx, y, font, spacing) {
  g.font = font;
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  g.textAlign = 'left';
  chars.forEach((ch, i) => { g.fillText(ch, x, y); x += widths[i] + spacing; });
  g.textAlign = 'center';
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- Champ d'étoiles + poussière dorée (shader léger) ---------- */
const starVert = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime, uOffset, uRange, uPR, uTwinkle, uDrift, uBright;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += uOffset + uTime * uDrift;
    p.y = mod(p.y + uRange, 2.0 * uRange) - uRange;      // boucle infinie verticale
    p.x += sin(uTime * 0.3 + aPhase * 6.2831) * uDrift * 2.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPR * (12.0 / -mv.z);
    float tw = sin(uTime * (0.6 + aPhase * 1.6) + aPhase * 6.2831);
    vAlpha = (0.65 + 0.35 * tw * uTwinkle) * uBright;
    vColor = aColor;
  }
`;
const starFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 2.0);
    gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
  }
`;

function buildStars() {
  const pr = Math.min(window.devicePixelRatio || 1, LOW_POWER ? 1.5 : 2);
  const palette = [
    new THREE.Color(1.0, 0.86, 0.62), // champagne
    new THREE.Color(0.85, 0.9, 1.0),  // blanc bleuté
    new THREE.Color(1.0, 0.62, 0.36), // cuivre
  ];
  const layers = [
    { count: LOW_POWER ? 420 : 1300, spreadX: 22, range: 14, z: -18, depth: 6, size: [1.6, 5.5], parallax: 0.0009, mouse: 0.25, bright: 0.9 },
    { count: LOW_POWER ? 140 : 450, spreadX: 12, range: 8, z: -8, depth: 3, size: [1.4, 4], parallax: 0.002, mouse: 0.5, bright: 1 },
    { count: LOW_POWER ? 28 : 70, spreadX: 4.5, range: 3.2, z: 1.2, depth: 1.6, size: [5, 13], parallax: 0.0045, mouse: 1.1, bright: 0.35, drift: 0.05, dust: true },
  ];

  return layers.map((L) => {
    const pos = new Float32Array(L.count * 3);
    const size = new Float32Array(L.count);
    const phase = new Float32Array(L.count);
    const col = new Float32Array(L.count * 3);
    for (let i = 0; i < L.count; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * L.spreadX;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * L.range;
      pos[i * 3 + 2] = L.z + (Math.random() * 2 - 1) * L.depth;
      size[i] = L.size[0] + Math.pow(Math.random(), 3) * (L.size[1] - L.size[0]);
      phase[i] = Math.random();
      const c = L.dust ? palette[0] : palette[Math.random() < 0.55 ? 0 : Math.random() < 0.75 ? 1 : 2];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: {
        uTime: { value: 0 },
        uOffset: { value: 0 },
        uRange: { value: L.range },
        uPR: { value: pr },
        uTwinkle: { value: REDUCED ? 0 : 1 },
        uDrift: { value: REDUCED ? 0 : L.drift || 0 },
        uBright: { value: L.bright },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return { points, mat, layer: L };
  });
}

/* ---------------------------------------------------------
   Boucle de rendu
   --------------------------------------------------------- */
const three = renderer ? buildScene(renderer) : null;

const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
if (!REDUCED && FINE_POINTER) {
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
}

let needsRender = true;
const requestRender = () => { needsRender = true; };

function frame(time, dtMs) {
  if (!three || document.hidden) return;
  const { renderer, scene, camera, lights, lightBase, bottle, halo, stars } = three;

  if (REDUCED) {
    if (!needsRender) return;
    needsRender = false;
    Object.assign(disp, state);
  } else {
    if (segments.length) Object.assign(state, poseAt(window.scrollY));
    const k = 1 - Math.exp(-(dtMs / 1000) * 5.5); // lissage indépendant du framerate
    for (const p of PROPS) disp[p] += (state[p] - disp[p]) * k;
    disp.reveal = state.reveal;
    pointer.sx += (pointer.x - pointer.sx) * k * 0.6;
    pointer.sy += (pointer.y - pointer.sy) * k * 0.6;
  }

  const t = REDUCED ? 0 : time;
  const r = disp.reveal;
  const idle = REDUCED ? 0 : Math.sin(t * 0.5) * 0.07;
  const float = REDUCED ? 0 : Math.sin(t * 0.8) * 0.035;

  // Flacon : émerge de l'ombre (reveal) puis suit les poses du scroll
  const g = bottle.group;
  g.position.set(disp.x, disp.y + float - (1 - r) * 0.6, 0);
  g.scale.setScalar(disp.s * (0.9 + 0.1 * r));
  g.rotation.set(disp.rx + pointer.sy * 0.08, disp.ry + idle + pointer.sx * 0.22, disp.rz);

  const lit = r * r;
  for (const [name, l] of Object.entries(lights)) l.intensity = lightBase[name] * lit;
  for (const [m, base] of bottle.envMats) m.envMapIntensity = base * (0.08 + 0.92 * lit);
  lights.glow.position.set(disp.x, disp.y, -0.9);

  halo.position.x = disp.x;
  halo.position.y = disp.y;
  halo.scale.setScalar(disp.s * (0.6 + 0.4 * r));
  halo.material.opacity = r;

  // Étoiles : parallaxe au scroll et à la souris
  const sy = window.scrollY;
  for (const s of stars) {
    s.mat.uniforms.uTime.value = t;
    s.mat.uniforms.uOffset.value = sy * s.layer.parallax;
    s.mat.uniforms.uBright.value = s.layer.bright * disp.stars * (0.35 + 0.65 * r);
    s.points.position.x = -pointer.sx * s.layer.mouse;
    s.points.position.y = pointer.sy * s.layer.mouse * 0.5;
  }

  renderer.render(scene, camera);
}
gsap.ticker.add(frame);

addEventListener('resize', () => {
  isNarrow = narrowMQ.matches;
  halfW = HALF_H * (innerWidth / innerHeight);
  if (three) {
    three.camera.aspect = innerWidth / innerHeight;
    three.camera.updateProjectionMatrix();
    three.renderer.setSize(innerWidth, innerHeight, false);
  }
  requestRender();
});

if (REDUCED) {
  // Pas de défilement animé : on rafraîchit la scène quand la page défile
  addEventListener('scroll', requestRender, { passive: true });
}

/* ---------------------------------------------------------
   Ambiance colorée (notes)
   --------------------------------------------------------- */
const AMB_DEFAULT = '#b8894f';
let currentAmb = AMB_DEFAULT;
function setAmbience(hex) {
  if (hex === currentAmb) return;
  currentAmb = hex;
  const d = REDUCED ? 0 : 1.4;
  gsap.to(root, { '--amb': hex, duration: d, ease: 'power2.out' });
  if (!three) return;
  const c = new THREE.Color(hex);
  const warm = c.clone().lerp(new THREE.Color(0xffe2bc), 0.45);
  gsap.to(three.halo.material.color, { r: c.r, g: c.g, b: c.b, duration: d });
  gsap.to(three.lights.rim.color, { r: c.r, g: c.g, b: c.b, duration: d });
  gsap.to(three.lights.glow.color, { r: c.r, g: c.g, b: c.b, duration: d });
  gsap.to(three.lights.key.color, { r: warm.r, g: warm.g, b: warm.b, duration: d });
  const e = c.clone().multiplyScalar(0.3);
  gsap.to(three.bottle.liquidMat.emissive, { r: e.r, g: e.g, b: e.b, duration: d, onUpdate: requestRender, onComplete: requestRender });
}

const noteTriggers = gsap.utils.toArray('.note').map((note) =>
  ScrollTrigger.create({
    trigger: note,
    start: 'top 60%',
    end: 'bottom 40%',
    onToggle: () => Promise.resolve().then(syncAmbience),
  })
);
function syncAmbience() {
  const active = noteTriggers.find((t) => t.isActive);
  setAmbience(active ? active.trigger.dataset.amb : AMB_DEFAULT);
}

/* ---------------------------------------------------------
   Navigation : progression + chapitre courant
   --------------------------------------------------------- */
const bar = document.querySelector('.progress span');
ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress})`; },
});
document.querySelectorAll('.site-nav a').forEach((link) => {
  const section = document.querySelector(link.getAttribute('href'));
  ScrollTrigger.create({
    trigger: section,
    start: 'top center',
    end: 'bottom center',
    onToggle: (self) => {
      if (self.isActive) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    },
  });
});

/* ---------------------------------------------------------
   Récit au scroll
   --------------------------------------------------------- */
if (REDUCED) {
  // Mouvement réduit : le flacon change de pose sans animation, aucun pin
  [['#hero', 'hero'], ['#etoile', 'etoile'], ['#notes', 'notes'], ['#flacon', 'flacon'], ['#sillage', 'sillage'], ['#cta', 'cta']]
    .forEach(([sel, key]) => {
      ScrollTrigger.create({
        trigger: sel,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => {
          if (!self.isActive) return;
          Object.assign(state, KF[key]());
          requestRender();
        },
      });
    });
  addEventListener('resize', () => ScrollTrigger.refresh());
} else {
  buildStory();
}

// Segments du récit : chaque segment relie deux poses clés sur une plage de scroll.
// La pose est recalculée à chaque frame depuis la position de scroll (déterministe,
// aucune animation concurrente sur le même objet).
function addSegment(st, from, to, a = 0, b = 1, ease = 'power1.inOut') {
  segments.push({ st, from, to, a, b, ease: gsap.parseEase(ease) });
}
function segment(vars, from, to, ease) {
  addSegment(ScrollTrigger.create(vars), from, to, 0, 1, ease);
}
function poseAt(y) {
  let seg = null, segStart = -Infinity;
  for (const s of segments) {
    const start = s.st.start + (s.st.end - s.st.start) * s.a;
    if (y >= start && start >= segStart) { seg = s; segStart = start; }
  }
  if (!seg) return KF.hero();
  const len = seg.st.end - seg.st.start;
  const p = len > 0 ? (y - seg.st.start) / len : 1;
  const e = seg.ease(gsap.utils.clamp(0, 1, (p - seg.a) / (seg.b - seg.a)));
  const A = KF[seg.from](), B = KF[seg.to](), out = {};
  for (const k of PROPS) out[k] = A[k] + (B[k] - A[k]) * e;
  return out;
}

function scrubTimeline(vars) {
  return gsap.timeline({ scrollTrigger: { scrub: true, invalidateOnRefresh: true, ...vars } });
}

function buildStory() {
  /* 1. Hero : lettres + flacon qui émerge de l'ombre */
  const intro = gsap.timeline({ delay: 0.25 });
  intro
    .to(state, { reveal: 1, duration: 3, ease: 'power2.inOut' }, 0)
    .fromTo('.hero__letter',
      { opacity: 0, yPercent: 40, filter: 'blur(16px)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 1.6, stagger: 0.13, ease: 'expo.out' }, 0.6)
    .fromTo('[data-hero-fade]',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out' }, 1.5);

  gsap.to('.hero__content', {
    yPercent: -35,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 20%', scrub: true },
  });
  gsap.to('.scroll-cue', {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '20% top', scrub: true },
  });

  /* Révélations de texte génériques */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.fromTo(el, { opacity: 0, y: 36 }, {
      opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
    });
  });

  /* 2. L'étoile : le flacon pivote, constellation tracée, parallaxe */
  segment({ trigger: '#etoile', start: 'top bottom', end: 'top top' }, 'hero', 'etoile');

  gsap.to('.c-line', {
    strokeDashoffset: 0,
    stagger: 0.15,
    ease: 'none',
    scrollTrigger: { trigger: '#etoile', start: 'top 75%', end: 'center center', scrub: true },
  });
  gsap.fromTo('.constellation', { yPercent: 30 }, {
    yPercent: -30,
    ease: 'none',
    scrollTrigger: { trigger: '#etoile', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* 3. Les notes */
  segment({ trigger: '#notes', start: 'top bottom', end: 'top 15%' }, 'etoile', 'notes');
  gsap.utils.toArray('.note').forEach((note) => {
    gsap.fromTo(note.querySelectorAll('.note__list li'), { opacity: 0, y: 14 }, {
      opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: note, start: 'top 60%', toggleActions: 'play none none reverse' },
    });
  });

  /* 4. Le flacon : entrée, puis texte épinglé pendant la rotation et le zoom */
  segment({ trigger: '#flacon', start: 'top bottom', end: 'top top' }, 'notes', 'flacon');

  const details = gsap.utils.toArray('.flacon__detail');
  const pinTl = scrubTimeline({ trigger: '#flacon', start: 'top top', end: '+=300%', pin: true, anticipatePin: 1 });
  addSegment(pinTl.scrollTrigger, 'flacon', 'flaconA', 0, 1 / 3);
  addSegment(pinTl.scrollTrigger, 'flaconA', 'flaconB', 1 / 3, 2 / 3);
  addSegment(pinTl.scrollTrigger, 'flaconB', 'flaconEnd', 2 / 3, 1);
  details.forEach((d, i) => {
    // le premier détail est déjà visible à l'épinglage, les suivants entrent tour à tour
    if (i > 0) pinTl.fromTo(d, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }, i + 0.05);
    if (i < details.length - 1) pinTl.to(d, { autoAlpha: 0, y: -28, duration: 0.25, ease: 'power2.in' }, i + 0.8);
  });
  pinTl.fromTo('.flacon__bar span', { scaleX: 0 }, { scaleX: 1, duration: 3, ease: 'none' }, 0);

  /* 5. Sillage : défilement horizontal épinglé */
  segment({ trigger: '#sillage', start: 'top bottom', end: 'top top' }, 'flaconEnd', 'sillage');

  const track = document.querySelector('.sillage__track');
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  const hTl = scrubTimeline({ trigger: '#sillage', start: 'top top', end: () => '+=' + distance(), pin: true, anticipatePin: 1 });
  hTl.fromTo(track, { x: 0 }, { x: () => -distance(), duration: 1, ease: 'none' }, 0);
  addSegment(hTl.scrollTrigger, 'sillage', 'sillageEnd', 0, 1, 'none');

  gsap.utils.toArray('.mood').forEach((card) => {
    gsap.fromTo(card, { opacity: 0.25, y: 40, rotate: 1.5 }, {
      opacity: 1, y: 0, rotate: 0, ease: 'none',
      scrollTrigger: { trigger: card, containerAnimation: hTl, start: 'left 95%', end: 'left 55%', scrub: true },
    });
  });

  /* 6. CTA */
  segment({ trigger: '#cta', start: 'top bottom', end: 'top top' }, 'sillageEnd', 'ctaIn');
  segment({ trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom' }, 'ctaIn', 'cta', 'none');
}

/* ---------------------------------------------------------
   Bouton magnétique + glow qui suit le curseur
   --------------------------------------------------------- */
const magnet = document.querySelector('.magnetic');
const btn = magnet?.querySelector('.btn-glow');
if (magnet && btn && !REDUCED && FINE_POINTER) {
  const label = btn.querySelector('.btn-glow__label');
  const xTo = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3.out' });
  const yTo = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3.out' });
  const lxTo = gsap.quickTo(label, 'x', { duration: 0.6, ease: 'power3.out' });
  const lyTo = gsap.quickTo(label, 'y', { duration: 0.6, ease: 'power3.out' });

  magnet.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    xTo(dx * 0.35); yTo(dy * 0.45);
    lxTo(dx * 0.12); lyTo(dy * 0.15);
    btn.style.setProperty('--gx', `${e.clientX - r.left}px`);
    btn.style.setProperty('--gy', `${e.clientY - r.top}px`);
  });
  magnet.addEventListener('pointerleave', () => {
    gsap.to([btn, label], { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)' });
  });
}

/* ---------------------------------------------------------
   Finalisation
   --------------------------------------------------------- */
window.__altairReady = true;
document.fonts?.ready.then(() => ScrollTrigger.refresh());
