/* =========================================================
   ALTAÏR — scrollytelling photo
   Three.js (scène photo + étoiles), GSAP + ScrollTrigger (récit), Lenis (scroll doux)
   ========================================================= */

import * as THREE from 'three';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrowMQ = matchMedia('(max-width: 768px)');
const LOW_POWER = narrowMQ.matches || matchMedia('(pointer: coarse)').matches;
const FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)').matches;
let isNarrow = narrowMQ.matches;
const clamp01 = gsap.utils.clamp(0, 1);

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
   Photos
   --------------------------------------------------------- */
const PHOTOS = {
  ingredients: 'assets/altair-ingredients.webp',
  ambiance: 'assets/altair-ambiance.webp',
  corps: 'assets/altair-corps.webp',
  bouchon: 'assets/altair-bouchon.webp',
};
const ARCH_IMAGES = ['ingredients', 'ambiance']; // index utilisé par `aimg` dans les poses
const CAP = { x0: 0.6278, y0: 0.1241, x1: 0.95, y1: 0.4722 }; // bouchon dans la photo détourée

/* ---------------------------------------------------------
   Poses clés : une « arche » photo + le flacon détouré
   a* = arche (photos d'ambiance)   p* = flacon détouré   cap = bouchon qui se détache
   az/afx/afy et pfx/pfy : zoom et point de focus dans l'image (0..1, y vers le bas)
   --------------------------------------------------------- */
const HALF_H = 6 * Math.tan(THREE.MathUtils.degToRad(35 / 2)); // demi-hauteur visible à z = 0
let halfW = HALF_H * (innerWidth / innerHeight);

const BASE = {
  ax: 0, ay: 0, as: 2, arx: 0, ary: 0, avis: 1, abright: 1, aimg: 1, az: 1, afx: 0.5, afy: 0.5,
  px: 0, py: 0, ps: 2.6, prx: 0, pry: 0, prz: 0, pvis: 0, pfx: 0.5, pfy: 0.5, cap: 0,
  stars: 1,
};
const NUM = Object.keys(BASE).filter((k) => k !== 'aimg');
const P = (o) => ({ ...BASE, ...o });

// Position de l'arche selon le chapitre (desktop : à droite du texte, mobile : en haut)
const archAt = (deskX, deskS, deskY = 0) => (isNarrow
  ? { ax: 0, ay: 0.78, as: 1.55 }
  : { ax: halfW * deskX, ay: deskY, as: deskS });

const KF = {
  hero:     () => P({ ...(isNarrow ? { ay: 0.66, as: 1.7 } : { ay: 0.68, as: 1.7 }), az: 1.08, afy: 0.56 }),
  etoile:   () => P({ ...archAt(0.3, 2.3), az: 1.45, afy: 0.54, stars: 1.8 }),
  notes:    () => P({ ...archAt(0.42, 2.3), aimg: 0, az: 1.0 }),
  tete:     () => P({ ...archAt(0.42, 2.3), aimg: 0, az: 1.6, afx: 0.34, afy: 0.8 }),
  coeur:    () => P({ ...archAt(0.42, 2.3), aimg: 0, az: 1.6, afx: 0.78, afy: 0.62 }),
  fond:     () => P({ ...archAt(0.42, 2.3), aimg: 0, az: 1.6, afx: 0.72, afy: 0.22 }),

  // Le flacon détouré prend le relais : matière, relief, bouchon
  flacon:   () => P({ ...archAt(0.42, 2.3), aimg: 0, az: 1.6, afx: 0.72, afy: 0.22, avis: 0,
                     pvis: 1, ...(isNarrow ? { px: 0, py: 0.72, ps: 1.9 } : { px: halfW * 0.36, ps: 2.9 }),
                     prx: 0.04, pry: -0.12, stars: 0.7 }),
  matiere:  () => P({ ...KF.flacon(), ps: isNarrow ? 2.1 : 3.2, pfx: 0.42, pfy: 0.6, prx: -0.06, pry: 0.18, prz: 0.04, cap: 0.12 }),
  relief:   () => P({ ...KF.flacon(), ps: isNarrow ? 3.4 : 5.2, pfx: 0.3, pfy: 0.66, prx: 0.02, pry: 0.08, prz: -0.04, cap: 0.3, stars: 0.5 }),
  bouchon:  () => P({ ...KF.flacon(), ps: isNarrow ? 3.0 : 4.4, pfx: 0.86, pfy: 0.22, prx: 0.05, pry: -0.1, cap: 1, stars: 0.5 }),

  // Sillage : l'ambiance revient en grand, en retrait derrière les cartes
  sillage:  () => P({ ...KF.bouchon(), ps: isNarrow ? 4.5 : 6.5, pvis: 0,
                     ...(isNarrow ? { ax: 0, ay: 0.35, as: 2.2 } : { ax: halfW * 0.45, ay: 0.06, as: 2.6 }),
                     avis: 1, aimg: 1, abright: 0.6, az: 1.35, afx: 0.3, afy: 0.5, stars: 1 }),
  sillageEnd: () => P({ ...KF.sillage(), ...(isNarrow ? {} : { ax: halfW * 0.3 }), afx: 0.7, stars: 1.3 }),

  // CTA : le flacon revient se poser, calé au-dessus du texte (voir measureCta)
  cta:      () => P({ ...KF.sillageEnd(), avis: 0, pvis: 1, cap: 0, pfx: 0.5, pfy: 0.5, px: 0,
                     py: ctaLayout.y, ps: ctaLayout.s, prx: 0.02, pry: -0.06, prz: 0, stars: 1.6 }),
  ctaIn:    () => ({ ...KF.cta(), py: ctaLayout.y - ctaLayout.shift }),
};

// Mesure l'espace libre au-dessus du texte du CTA quand la page est tout en bas
const ctaLayout = { y: 0.6, s: 2, shift: 0 };
function measureCta() {
  const content = document.querySelector('.cta__content');
  const footer = document.querySelector('.site-footer');
  if (!content) return;
  const wpp = (2 * HALF_H) / innerHeight; // unités monde par pixel à z = 0
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const contentTop = content.getBoundingClientRect().top + window.scrollY - maxScroll;
  const top = isNarrow ? 72 : 88; // sous l'en-tête
  const avail = Math.max(140, contentTop - 16 - top) * wpp;
  ctaLayout.s = Math.min(isNarrow ? 1.8 : 2.4, avail);
  ctaLayout.y = HALF_H - top * wpp - ctaLayout.s / 2;
  ctaLayout.shift = (footer ? footer.offsetHeight : 0) * wpp;
}
measureCta();
ScrollTrigger.addEventListener('refresh', measureCta);

const state = { ...KF.hero(), reveal: REDUCED ? 1 : 0, glint: -2 };

// Segments du récit : chaque segment relie deux poses sur une plage de scroll.
// La scène est recalculée à chaque frame depuis la position de scroll (déterministe).
const segments = [];
function addSegment(st, from, to, a = 0, b = 1, opts = {}) {
  segments.push({ st, from, to, a, b, ease: gsap.parseEase(opts.ease || 'power1.inOut'), glint: !!opts.glint });
}
function segment(vars, from, to, opts) {
  addSegment(ScrollTrigger.create(vars), from, to, 0, 1, opts);
}

// Transforme une pose en « look » : valeurs numériques + photos de l'arche à mélanger
function lookFrom(pose) {
  return {
    ...pose,
    texA: pose.aimg, texB: pose.aimg, mix: 0,
    xfA: [pose.az, pose.afx, pose.afy], xfB: [pose.az, pose.afx, pose.afy],
    glint: state.glint,
  };
}

function lookAt(y) {
  let seg = null, segStart = -Infinity;
  for (const s of segments) {
    const start = s.st.start + (s.st.end - s.st.start) * s.a;
    if (y >= start && start >= segStart) { seg = s; segStart = start; }
  }
  if (!seg) return lookFrom(KF.hero());
  const len = seg.st.end - seg.st.start;
  const p = len > 0 ? (y - seg.st.start) / len : 1;
  const local = clamp01((p - seg.a) / (seg.b - seg.a));
  const e = seg.ease(local);
  const A = KF[seg.from](), B = KF[seg.to]();
  const out = {};
  for (const k of NUM) out[k] = A[k] + (B[k] - A[k]) * e;

  if (A.aimg === B.aimg) {
    out.texA = out.texB = A.aimg;
    out.mix = 0;
    out.xfA = out.xfB = [out.az, out.afx, out.afy];
  } else {
    // fondu « braise » d'une photo à l'autre, avec un léger zoom de passage
    out.texA = A.aimg; out.texB = B.aimg;
    out.mix = clamp01((e - 0.15) / 0.7);
    out.xfA = [A.az * (1 + 0.15 * e), A.afx, A.afy];
    out.xfB = [B.az * (1.15 - 0.15 * e), B.afx, B.afy];
  }
  out.glint = seg.glint ? -1.2 + 2.8 * local : state.glint;
  return out;
}

/* ---------------------------------------------------------
   Scène Three.js
   --------------------------------------------------------- */
const canvas = document.getElementById('scene');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW_POWER, powerPreference: 'high-performance' });
} catch (err) {
  root.classList.remove('webgl');
  root.classList.add('no-webgl');
}

const photoVert = /* glsl */ `
  uniform float uVel;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(uv.x * 3.14159) * uVel * 0.06; // le plan se courbe légèrement avec la vitesse
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const photoFrag = /* glsl */ `
  uniform sampler2D uTexA, uTexB;
  uniform vec3 uXfA, uXfB, uEdge, uTint;
  uniform float uMix, uVis, uReveal, uArch, uBright, uTime, uVel, uGlint, uAspect, uPad, uFeather, uSeed;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  // zoom autour d'un point de focus, sans jamais sortir de l'image
  vec2 frame(vec2 p, vec3 t) {
    vec2 img = p + 0.5;
    float z = t.x;
    vec2 f = vec2(t.y, 1.0 - t.z);
    vec2 hw = vec2(0.5 * uAspect, 0.5) / z;
    vec2 c = clamp(f, hw, 1.0 - hw);
    return c + (img - 0.5) / z;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * uPad;   // coordonnées « arche »
    vec2 q = p;
    q.x += sin(p.y * 10.0 + uTime * 2.0) * uVel * 0.006; // ondulation à la vitesse de scroll

    vec2 ua = frame(q, uXfA), ub = frame(q, uXfB);
    float sh = uVel * 0.006;
    vec4 a = texture2D(uTexA, ua);
    a.r = texture2D(uTexA, ua + vec2(sh, 0.0)).r;
    a.b = texture2D(uTexA, ua - vec2(sh, 0.0)).b;
    vec4 b = texture2D(uTexB, ub);

    float n = fbm(vUv * vec2(3.2 * uAspect, 3.2) + uSeed);

    // passage d'une photo à l'autre
    float tm = uMix * 1.3 - 0.15;
    float toB = smoothstep(tm + 0.05, tm - 0.05, n);
    vec4 col = mix(a, b, toB);
    float emberM = (1.0 - smoothstep(0.0, 0.05, abs(n - tm))) * step(0.001, uMix) * step(uMix, 0.999);

    // apparition / disparition
    float tv = uVis * 1.3 - 0.15;
    float vis = smoothstep(tv + 0.04, tv - 0.04, n);
    float emberV = (1.0 - smoothstep(0.0, 0.045, abs(n - tv))) * step(0.001, uVis) * step(uVis, 0.999);

    // masque en arche (ou rectangle)
    float r = 0.5 * uAspect;
    float cy = 0.5 - r;
    float dArch = p.y > cy ? length(p - vec2(0.0, cy)) - r : max(abs(p.x) - r, -0.5 - p.y);
    float dRect = max(abs(p.x) - r, abs(p.y) - 0.5);
    float d = mix(dRect, dArch, uArch);
    float inside = 1.0 - smoothstep(-0.004, 0.0, d);

    // révélation par le bas
    float rv = 1.0 - smoothstep(uReveal * 1.12 - 0.1, uReveal * 1.12, p.y + 0.5);

    // bords de l'image adoucis (photo détourée coupée au bord)
    vec2 img = p + 0.5;
    float feather = 1.0;
    if (uFeather > 0.0) {
      feather = smoothstep(0.0, uFeather, img.x) * smoothstep(0.0, uFeather, img.y)
              * smoothstep(0.0, uFeather, 1.0 - img.x) * smoothstep(0.0, uFeather, 1.0 - img.y);
    }

    float body = col.a * inside * feather;
    float alpha = body * vis * rv;
    float ember = (emberV + emberM * vis) * body * rv;

    vec3 rgb = col.rgb * uBright;
    rgb *= mix(1.0, smoothstep(0.9, 0.15, length(p / vec2(uAspect, 1.0))), 0.4 * uArch); // vignette
    rgb = mix(rgb, rgb * uTint * 1.6, 0.16);                                             // étalonnage d'ambiance
    float g = exp(-pow((p.x * 0.9 + p.y * 0.55 - uGlint) * 6.0, 2.0)) * 0.32;           // reflet qui balaie
    rgb += g * vec3(1.0, 0.9, 0.75);
    rgb += uEdge * ember * 1.8;

    float line = uArch * (1.0 - smoothstep(0.0, 0.004, abs(d - 0.022))) * rv * vis * 0.55; // filet doré
    float outA = clamp(alpha + ember * 0.8 + line, 0.0, 1.0);
    vec3 outRGB = (rgb * (alpha + ember * 0.8) + uEdge * line) / max(outA, 1e-4);
    gl_FragColor = vec4(outRGB, outA);
  }
`;

const tint = { value: new THREE.Color(0xb8894f) };

function photoMaterial({ aspect = 1, pad = 1, arch = 0, feather = 0, seed = 0 }) {
  return new THREE.ShaderMaterial({
    vertexShader: photoVert,
    fragmentShader: photoFrag,
    uniforms: {
      uTexA: { value: null }, uTexB: { value: null },
      uXfA: { value: new THREE.Vector3(1, 0.5, 0.5) }, uXfB: { value: new THREE.Vector3(1, 0.5, 0.5) },
      uMix: { value: 0 }, uVis: { value: 0 }, uReveal: { value: 1 }, uArch: { value: arch },
      uBright: { value: 1 }, uTime: { value: 0 }, uVel: { value: 0 }, uGlint: { value: -2 },
      uAspect: { value: aspect }, uPad: { value: pad }, uFeather: { value: feather }, uSeed: { value: seed },
      uEdge: { value: new THREE.Color(1.0, 0.7, 0.36) }, uTint: tint,
    },
    transparent: true,
    depthWrite: false,
  });
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

function buildStars(pr) {
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
      transparent: !!L.dust, // la poussière passe devant les photos
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    if (L.dust) points.renderOrder = 10;
    return { points, mat, layer: L };
  });
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.5)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function buildScene(renderer) {
  const pr = Math.min(window.devicePixelRatio || 1, LOW_POWER ? 1.5 : 2);
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Halo cuivré derrière les photos
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 5.5),
    new THREE.MeshBasicMaterial({
      map: radialTexture(), color: 0xb8894f, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    })
  );
  halo.position.z = -1.6;
  scene.add(halo);

  // Arche : photos d'ambiance et d'ingrédients
  const ARCH_ASPECT = 0.8, ARCH_PAD = 1.08;
  const arch = new THREE.Group();
  const archMat = photoMaterial({ aspect: ARCH_ASPECT, pad: ARCH_PAD, arch: 1, seed: 3.1 });
  const archMesh = new THREE.Mesh(new THREE.PlaneGeometry(ARCH_ASPECT * ARCH_PAD, ARCH_PAD, 24, 1), archMat);
  archMesh.renderOrder = 1;
  arch.add(archMesh);
  scene.add(arch);

  // Flacon détouré : corps + bouchon sur deux plans, pour le détacher en 3D
  const product = new THREE.Group();      // pivot (position, rotation, échelle)
  const productInner = new THREE.Group(); // décalé selon le point de focus
  product.add(productInner);
  const bodyMat = photoMaterial({ feather: 0.1, seed: 7.7 });
  const body = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 24, 1), bodyMat);
  body.renderOrder = 2;
  productInner.add(body);

  const capMat = photoMaterial({ seed: 7.7 });
  const capW = CAP.x1 - CAP.x0, capH = CAP.y1 - CAP.y0;
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(capW, capH), capMat);
  cap.renderOrder = 3;
  const capBase = new THREE.Vector3((CAP.x0 + CAP.x1) / 2 - 0.5, 0.5 - (CAP.y0 + CAP.y1) / 2, 0.002);
  productInner.add(cap);
  scene.add(product);

  const stars = buildStars(pr);
  stars.forEach((s) => scene.add(s.points));

  // Chargement des photos
  const archTex = [];
  let texturesReady = false;
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const load = (url) => new Promise((res) => loader.load(url, (t) => {
    t.anisotropy = maxAniso;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    res(t);
  }, undefined, () => res(null)));

  const ready = Promise.all(Object.entries(PHOTOS).map(([k, url]) => load(url).then((t) => [k, t])))
    .then((entries) => {
      const tex = Object.fromEntries(entries);
      ARCH_IMAGES.forEach((k, i) => { archTex[i] = tex[k]; });
      bodyMat.uniforms.uTexA.value = bodyMat.uniforms.uTexB.value = tex.corps;
      capMat.uniforms.uTexA.value = capMat.uniforms.uTexB.value = tex.bouchon;
      texturesReady = true;
    });

  return {
    renderer, scene, camera, halo, stars, ready,
    arch, archMat, product, productInner, bodyMat, cap, capMat, capBase, archTex,
    get texturesReady() { return texturesReady; },
  };
}

const three = renderer ? buildScene(renderer) : null;

/* ---------------------------------------------------------
   Boucle de rendu
   --------------------------------------------------------- */
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
if (!REDUCED && FINE_POINTER) {
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
}

let needsRender = true;
const requestRender = () => { needsRender = true; };
let smoothScroll = window.scrollY;
let vel = 0;
const velListeners = [];

function frame(time, dtMs) {
  if (document.hidden) return;
  const k = 1 - Math.exp(-(dtMs / 1000) * 5.5); // lissage indépendant du framerate

  if (!REDUCED) {
    const raw = lenis ? lenis.velocity : 0;
    vel += (gsap.utils.clamp(-1, 1, raw / 40) - vel) * k;
    velListeners.forEach((fn) => fn(vel));
  }
  if (!three) return;
  if (REDUCED && !needsRender) return;
  needsRender = false;

  const { renderer, scene, camera, halo, stars, arch, archMat, product, productInner, bodyMat, cap, capMat, capBase, archTex } = three;

  let L;
  if (REDUCED) {
    L = lookFrom(state);
  } else {
    smoothScroll += (window.scrollY - smoothScroll) * Math.min(1, k * 1.6);
    L = segments.length ? lookAt(smoothScroll) : lookFrom(state);
    pointer.sx += (pointer.x - pointer.sx) * k * 0.6;
    pointer.sy += (pointer.y - pointer.sy) * k * 0.6;
  }

  const t = REDUCED ? 0 : time;
  const r = state.reveal;
  const ready = three.texturesReady ? 1 : 0;
  const float = REDUCED ? 0 : Math.sin(t * 0.8) * 0.03;
  const idle = REDUCED ? 0 : Math.sin(t * 0.5) * 0.05;

  // Arche
  arch.position.set(L.ax, L.ay + float * 0.6 - (1 - r) * 0.25, 0);
  arch.scale.setScalar(L.as * (1.06 - 0.06 * r));
  arch.rotation.set(L.arx + pointer.sy * 0.06 + vel * 0.12, L.ary + pointer.sx * 0.12, 0);
  const au = archMat.uniforms;
  au.uTexA.value = archTex[L.texA] || null;
  au.uTexB.value = archTex[L.texB] || null;
  au.uXfA.value.set(L.xfA[0] * (1 + 0.25 * (1 - r)), L.xfA[1], L.xfA[2]);
  au.uXfB.value.set(L.xfB[0] * (1 + 0.25 * (1 - r)), L.xfB[1], L.xfB[2]);
  au.uMix.value = L.mix;
  au.uVis.value = L.avis * ready;
  au.uReveal.value = clamp01(r * 1.15);
  au.uBright.value = L.abright * (0.15 + 0.85 * r);
  au.uGlint.value = L.glint;

  // Flacon détouré
  product.position.set(L.px, L.py + float, 0.3);
  product.scale.setScalar(L.ps);
  product.rotation.set(L.prx + pointer.sy * 0.08 + vel * 0.1, L.pry + idle + pointer.sx * 0.2, L.prz);
  productInner.position.set(-(L.pfx - 0.5), L.pfy - 0.5, 0);
  cap.position.copy(capBase).add(new THREE.Vector3(0.07 * L.cap, 0.08 * L.cap, 0.3 * L.cap));
  cap.rotation.set(0, L.cap * 0.6 + idle * L.cap * 2, -L.cap * 0.35);
  cap.scale.setScalar(1 + L.cap * 0.08);
  bodyMat.uniforms.uVis.value = capMat.uniforms.uVis.value = L.pvis * ready;
  bodyMat.uniforms.uGlint.value = capMat.uniforms.uGlint.value = L.glint;

  for (const m of [archMat, bodyMat, capMat]) {
    m.uniforms.uTime.value = t;
    m.uniforms.uVel.value = vel;
  }

  // Halo : suit la photo la plus présente
  const wA = L.avis, wP = L.pvis, wSum = Math.max(0.001, wA + wP);
  halo.position.x = (L.ax * wA + L.px * wP) / wSum;
  halo.position.y = (L.ay * wA + L.py * wP) / wSum;
  halo.scale.setScalar(0.6 + 0.4 * r + 0.15 * Math.min(L.ps, 3) * wP);
  halo.material.opacity = (wA * 0.55 + wP * 0.9) * r * ready;

  // Étoiles : parallaxe au scroll et à la souris
  const sy = REDUCED ? window.scrollY : smoothScroll;
  for (const s of stars) {
    s.mat.uniforms.uTime.value = t;
    s.mat.uniforms.uOffset.value = sy * s.layer.parallax;
    s.mat.uniforms.uBright.value = s.layer.bright * L.stars * (0.35 + 0.65 * r);
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

if (REDUCED) addEventListener('scroll', requestRender, { passive: true });

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
  gsap.to(three.halo.material.color, { r: c.r, g: c.g, b: c.b, duration: d, onUpdate: requestRender });
  gsap.to(tint.value, { r: c.r, g: c.g, b: c.b, duration: d, onUpdate: requestRender, onComplete: requestRender });
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
   Titres découpés en mots (révélation au masque)
   --------------------------------------------------------- */
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const word = document.createElement('span');
          word.className = 'word';
          const inner = document.createElement('span');
          inner.className = 'word__inner';
          inner.textContent = part;
          word.appendChild(inner);
          frag.appendChild(word);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
  return el.querySelectorAll('.word__inner');
}

/* ---------------------------------------------------------
   Récit au scroll
   --------------------------------------------------------- */
if (REDUCED) {
  // Mouvement réduit : la scène change de vue sans animation, aucun pin
  [['#hero', 'hero'], ['#etoile', 'etoile'], ['#notes .notes__intro', 'notes'],
    ['.note:nth-of-type(1)', 'tete'], ['.note:nth-of-type(2)', 'coeur'], ['.note:nth-of-type(3)', 'fond'],
    ['#flacon', 'flacon'], ['#sillage', 'sillage'], ['#cta', 'cta']]
    .forEach(([sel, key]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
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
  three?.ready.then(requestRender);
} else {
  buildStory();
}

function scrubTimeline(vars) {
  return gsap.timeline({ scrollTrigger: { scrub: true, invalidateOnRefresh: true, ...vars } });
}

function buildStory() {
  /* 1. Hero : l'arche se lève, les lettres apparaissent, l'interlettrage se resserre */
  const intro = gsap.timeline({ paused: true });
  intro
    .to(state, { reveal: 1, duration: 2.6, ease: 'power3.inOut' }, 0)
    .fromTo(state, { glint: -1.2 }, { glint: 1.6, duration: 1.8, ease: 'power2.inOut' }, 1.4)
    .fromTo('.hero__letter',
      { opacity: 0, yPercent: 60, filter: 'blur(18px)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 1.6, stagger: 0.11, ease: 'expo.out' }, 0.7)
    .fromTo('.hero__title', { letterSpacing: '0.26em' }, { letterSpacing: '0.14em', duration: 2.6, ease: 'expo.out' }, 0.7)
    .fromTo('[data-hero-fade]',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out' }, 1.6);

  // On attend les photos (2,5 s maximum) pour lever le rideau
  const start = () => intro.play();
  if (three) Promise.race([three.ready, new Promise((r) => setTimeout(r, 2500))]).then(start);
  else start();

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

  /* Titres : mots révélés au masque */
  gsap.utils.toArray('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.set(el, { opacity: 1 });
    gsap.fromTo(words, { yPercent: 115, rotate: 3 }, {
      yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.07, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  });

  /* Textes : montée douce */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.fromTo(el, { opacity: 0, y: 36 }, {
      opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
    });
  });

  /* 2. L'étoile : l'arche glisse et zoome sur le flacon, constellation tracée */
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

  /* 3. Les notes : fondu vers la photo des ingrédients, puis un cadrage par note */
  segment({ trigger: '#notes', start: 'top bottom', end: 'top 30%' }, 'etoile', 'notes');
  const notes = gsap.utils.toArray('.note');
  ['tete', 'coeur', 'fond'].forEach((key, i) => {
    segment({ trigger: notes[i], start: 'top 85%', end: 'top 35%' }, i === 0 ? 'notes' : ['tete', 'coeur'][i - 1], key);
  });
  notes.forEach((note) => {
    gsap.fromTo(note.querySelectorAll('.note__list li'), { opacity: 0, y: 14 }, {
      opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: note, start: 'top 60%', toggleActions: 'play none none reverse' },
    });
  });

  /* 4. Le flacon : la photo détourée prend le relais, texte épinglé, le bouchon se détache */
  segment({ trigger: '#flacon', start: 'top bottom', end: 'top top' }, 'fond', 'flacon');

  const details = gsap.utils.toArray('.flacon__detail');
  const pinTl = scrubTimeline({ trigger: '#flacon', start: 'top top', end: '+=300%', pin: true, anticipatePin: 1 });
  addSegment(pinTl.scrollTrigger, 'flacon', 'matiere', 0, 1 / 3, { glint: true });
  addSegment(pinTl.scrollTrigger, 'matiere', 'relief', 1 / 3, 2 / 3, { glint: true });
  addSegment(pinTl.scrollTrigger, 'relief', 'bouchon', 2 / 3, 1, { glint: true });
  details.forEach((d, i) => {
    // le premier détail est déjà visible à l'épinglage, les suivants entrent tour à tour
    if (i > 0) pinTl.fromTo(d, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }, i + 0.05);
    if (i < details.length - 1) pinTl.to(d, { autoAlpha: 0, y: -28, duration: 0.25, ease: 'power2.in' }, i + 0.8);
  });
  pinTl.fromTo('.flacon__bar span', { scaleX: 0 }, { scaleX: 1, duration: 3, ease: 'none' }, 0);
  pinTl.set('.flacon__count-roll', { yPercent: -33.333 }, 1.05);
  pinTl.set('.flacon__count-roll', { yPercent: -66.667 }, 2.05);

  /* 5. Sillage : défilement horizontal épinglé, la photo d'ambiance glisse en arrière-plan */
  segment({ trigger: '#sillage', start: 'top bottom', end: 'top top' }, 'bouchon', 'sillage');

  const track = document.querySelector('.sillage__track');
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  const hTl = scrubTimeline({ trigger: '#sillage', start: 'top top', end: () => '+=' + distance(), pin: true, anticipatePin: 1 });
  hTl.fromTo(track, { x: 0 }, { x: () => -distance(), duration: 1, ease: 'none' }, 0);
  addSegment(hTl.scrollTrigger, 'sillage', 'sillageEnd', 0, 1, { ease: 'none' });

  const cards = gsap.utils.toArray('.mood');
  cards.forEach((card) => {
    gsap.fromTo(card, { opacity: 0.25, y: 40, rotate: 1.5 }, {
      opacity: 1, y: 0, rotate: 0, ease: 'none',
      scrollTrigger: { trigger: card, containerAnimation: hTl, start: 'left 95%', end: 'left 55%', scrub: true },
    });
  });
  // les cartes s'inclinent avec la vitesse de scroll
  const skews = cards.map((c) => gsap.quickSetter(c, 'skewX', 'deg'));
  velListeners.push((v) => skews.forEach((set) => set(v * -5)));

  /* 6. CTA : le flacon revient se poser */
  segment({ trigger: '#cta', start: 'top bottom', end: 'top top' }, 'sillageEnd', 'ctaIn');
  segment({ trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom' }, 'ctaIn', 'cta', { ease: 'none' });
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
   Curseur doré (souris uniquement, le curseur natif reste visible)
   --------------------------------------------------------- */
if (!REDUCED && FINE_POINTER) {
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' });
  addEventListener('pointermove', (e) => {
    cx(e.clientX); cy(e.clientY);
    cursor.classList.add('is-on');
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
  document.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
  });
}

/* ---------------------------------------------------------
   Finalisation
   --------------------------------------------------------- */
window.__altairReady = true;
document.fonts?.ready.then(() => ScrollTrigger.refresh());
