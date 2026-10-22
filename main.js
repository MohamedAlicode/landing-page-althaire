/* ==========================================================================
   Altaïr — film produit piloté au scroll
   Canvas 2D (séquence d'images extraite de la vidéo), GSAP + ScrollTrigger
   (récit), Lenis (scroll doux). Sans build.
   ========================================================================== */

(() => {
  'use strict';

  window.__altairReady = true;

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  const mobileMQ = matchMedia('(max-width: 767px)');
  // Le film tourne pour tous, y compris quand le système demande moins
  // d'animations (réglage souvent coupé sur PC) : le bouton Pause l'arrête.
  // Si le filet de sécurité de index.html a déjà basculé en version statique
  // (scripts lents), on revient au film.
  const canMotion = 'gsap' in window && 'ScrollTrigger' in window && 'Lenis' in window;
  if (canMotion) {
    root.classList.remove('no-film');
    root.classList.add('motion', 'is-loading');
  } else root.classList.remove('motion', 'is-loading');

  /* ------------------------------------------------------------------------
     Réglages du film
     ------------------------------------------------------------------------ */

  const FRAME_COUNT = 287;   // 6 s de vidéo à 48 images par seconde
  const FRAME_SPEED = 2.0;   // le film se termine à 50 % du récit
  const IMAGE_SCALE = 0.88;  // « padded cover » : l'image ne touche pas l'en-tête
  const FRAME_DIR = mobileMQ.matches ? 'frames/mobile' : 'frames/desktop';
  const frameSrc = (i) => `${FRAME_DIR}/frame_${String(i + 1).padStart(4, '0')}.webp`;

  // Cadrage selon la progression du récit : [progression, point de l'image (x),
  // position à l'écran (x), zoom, centre vertical à l'écran]. Le produit
  // laisse la place au texte.
  const VIEW = {
    desktop: [
      [0.000, 0.64, 0.50, 1.00, 0.50],
      [0.020, 0.64, 0.66, 1.00, 0.50],
      [0.110, 0.64, 0.66, 1.00, 0.50],
      [0.125, 0.72, 0.33, 1.02, 0.50],
      [0.200, 0.72, 0.33, 1.02, 0.50],
      [0.215, 0.50, 0.64, 1.00, 0.50],
      [0.310, 0.50, 0.64, 1.00, 0.50],
      [0.330, 0.575, 0.29, 0.84, 0.50],
      [0.490, 0.575, 0.29, 0.84, 0.50],
      [0.510, 0.575, 0.50, 1.04, 0.50],
      [0.750, 0.575, 0.50, 1.14, 0.50],
      [0.766, 0.575, 0.68, 0.96, 0.50],
      [0.835, 0.575, 0.68, 0.96, 0.50],
      [0.850, 0.575, 0.30, 0.90, 0.50],
      [0.905, 0.575, 0.30, 0.90, 0.50],
      [0.920, 0.575, 0.70, 0.88, 0.50],
      [1.000, 0.575, 0.68, 0.92, 0.50],
    ],
    mobile: [
      [0.000, 0.64, 0.50, 1.00, 0.42],
      [0.020, 0.64, 0.50, 1.00, 0.33],
      [0.110, 0.64, 0.50, 1.00, 0.33],
      [0.125, 0.74, 0.50, 1.00, 0.33],
      [0.200, 0.74, 0.50, 1.00, 0.33],
      [0.215, 0.50, 0.50, 1.00, 0.33],
      [0.310, 0.50, 0.50, 1.00, 0.33],
      [0.330, 0.575, 0.50, 0.74, 0.30],
      [0.490, 0.575, 0.50, 0.74, 0.30],
      [0.510, 0.575, 0.50, 0.95, 0.36],
      [0.905, 0.575, 0.50, 0.90, 0.30],
      [0.920, 0.575, 0.50, 0.74, 0.25],
      [1.000, 0.575, 0.50, 0.74, 0.25],
    ],
  };

  // Zones de couleur : [progression, r, g, b, opacité du calque]
  const ACCENT = [107, 52, 27];
  const NIGHT = [11, 12, 17];
  const VEIL = [236, 230, 214];
  const OVERLAY = [
    [0.000, ...ACCENT, 0],
    [0.496, ...ACCENT, 0],
    [0.508, ...ACCENT, 0.93],
    [0.655, ...ACCENT, 0.93],
    [0.667, ...NIGHT, 0.92],
    [0.752, ...NIGHT, 0.92],
    [0.764, ...NIGHT, 0],      // le blason : le flacon à découvert
    [0.837, ...VEIL, 0],
    [0.849, ...VEIL, 0.84],
    [0.906, ...VEIL, 0.84],
    [0.918, ...VEIL, 0],
  ];
  const STARS = [[0.655, 0], [0.668, 1], [0.751, 1], [0.763, 0]];
  const MARQUEE = [[0.494, 0], [0.51, 1], [0.751, 1], [0.763, 0], [0.837, 0], [0.849, 1], [0.894, 1], [0.908, 0]];  // pas sur le blason
  const ZONES = [[0, 'light'], [0.503, 'accent'], [0.661, 'dark'], [0.758, 'light']];
  const INK = { dark: '#f5eddf', accent: '#f5eddf', light: '#22160f' };
  const STROKE = {
    dark: 'rgba(216, 181, 122, 0.5)',
    accent: 'rgba(239, 210, 173, 0.55)',
    light: 'rgba(138, 69, 35, 0.45)',
  };

  // Interpolation lissée entre images clés
  function sample(keys, p, out) {
    const n = keys[0].length - 1;
    let a = keys[0];
    let b = keys[0];
    if (p > a[0]) {
      b = keys[keys.length - 1];
      for (let i = 0; i < keys.length - 1; i++) {
        if (p <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
      }
      if (p > b[0]) a = b;
    }
    const t = a === b ? 0 : smooth(clamp((p - a[0]) / (b[0] - a[0])));
    for (let k = 0; k < n; k++) out[k] = a[k + 1] + (b[k + 1] - a[k + 1]) * t;
    return out;
  }

  /* ------------------------------------------------------------------------
     Images du film : téléchargées une fois (compressées), décodées à l'avance
     hors du fil principal dans une fenêtre autour de la position de scroll
     ------------------------------------------------------------------------ */

  const sources = new Array(FRAME_COUNT);  // fichiers compressés (Blob), ou <img> en repli
  const thumbs = new Array(FRAME_COUNT);   // couleurs des bords de chaque image
  const decoded = new Map();               // images prêtes à dessiner
  const pending = new Set();
  const TW = 12;  // peu de colonnes : bandes douces en haut et en bas
  const TH = 27;  // assez de lignes pour suivre papier et sol sur les côtés
  const WINDOW = mobileMQ.matches ? 32 : 48;  // images décodées gardées en mémoire
  const DECODERS = clamp(navigator.hardwareConcurrency || 4, 4, 8);  // décodages en parallèle
  const hasBitmap = 'createImageBitmap' in window;
  let want = 0;
  let wantDir = 1;
  let onFrameReady = () => {};

  function loadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  // Couleurs des bords de chaque image, précalculées (frames/edges.png, 12 × 27 par
  // image) : des dégradés prolongent le papier et le sol au-delà de l'image
  let edgesReady = null;
  let edgeData = null;
  let sheetCols = 0;
  // Zone qui bouge entre deux images voisines (frames/motion.json, en millièmes) :
  // la transition entre elles ne redessine que cette zone
  let motion = null;

  function loadEdges() {
    if (!edgesReady) {
      fetch('frames/motion.json').then((r) => r.json()).then((m) => { motion = m; }, () => {});
      edgesReady = loadImage('frames/edges.png').then((sheet) => {
        if (!sheet) return;
        try {
          const c = document.createElement('canvas');
          c.width = sheet.naturalWidth;
          c.height = sheet.naturalHeight;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(sheet, 0, 0);
          edgeData = g.getImageData(0, 0, c.width, c.height);
          sheetCols = Math.floor(c.width / TW);
        } catch (e) { /* fichier ouvert sans serveur : fond uni */ }
      });
    }
    return edgesReady;
  }

  function edgeColors(i) {
    if (thumbs[i] || !edgeData) return thumbs[i] || null;
    const ox = (i % sheetCols) * TW;
    const oy = Math.floor(i / sheetCols) * TH;
    const d = edgeData.data;
    const px = (x, y) => {
      const o = ((oy + y) * edgeData.width + ox + x) * 4;
      return `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`;
    };
    const col = (x) => Array.from({ length: TH }, (_, y) => px(x, y));
    const row = (y) => Array.from({ length: TW }, (_, x) => px(x, y));
    thumbs[i] = { L: col(0), R: col(TW - 1), T: row(0), B: row(TH - 1) };
    return thumbs[i];
  }

  function gradient(c, x0, y0, x1, y1, colors) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    colors.forEach((col, k) => g.addColorStop((k + 0.5) / colors.length, col));
    return g;
  }

  async function fetchFrame(i) {
    if (sources[i]) return;
    const url = frameSrc(i);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      sources[i] = await res.blob();
    } catch (e) {
      sources[i] = await loadImage(url);  // repli (fichier ouvert sans serveur)
    }
  }

  // Ordre de décodage : l'image visée, puis surtout celles qui arrivent dans le sens du scroll
  function wanted() {
    const list = [want];
    const ahead = Math.round(WINDOW * 0.75);
    const behind = WINDOW - ahead;
    for (let d = 1; d <= ahead; d++) {
      const a = want + wantDir * d;
      if (a >= 0 && a < FRAME_COUNT) list.push(a);
      const b = want - wantDir * d;
      if (d <= behind && b >= 0 && b < FRAME_COUNT) list.push(b);
    }
    return list;
  }

  function trimDecoded() {
    if (decoded.size <= WINDOW + 8) return;
    const keep = new Set(wanted());
    for (const [i, bmp] of decoded) {
      if (decoded.size <= WINDOW) break;
      if (keep.has(i)) continue;
      if (bmp.close) bmp.close();
      decoded.delete(i);
    }
  }

  function decodeFrame(i) {
    pending.add(i);
    (hasBitmap ? createImageBitmap(sources[i]) : Promise.resolve(sources[i])).then((bmp) => {
      pending.delete(i);
      bmp.frameIndex = i;
      decoded.set(i, bmp);
      trimDecoded();
      onFrameReady(i);
      pumpDecode();
    }, () => pending.delete(i));
  }

  function pumpDecode() {
    for (const i of wanted()) {
      if (pending.size >= DECODERS) return;
      if (sources[i] && !decoded.has(i) && !pending.has(i)) decodeFrame(i);
    }
  }

  function aim(i, dir) {
    if (i === want && (!dir || dir === wantDir)) return;
    want = i;
    if (dir) wantDir = dir;
    pumpDecode();
  }

  // Image exacte si elle est prête, sinon la plus proche déjà décodée
  function pickFrame(i) {
    if (decoded.has(i)) return decoded.get(i);
    for (let d = 1; d < FRAME_COUNT; d++) {
      const back = decoded.get(i - wantDir * d);
      if (back) return back;
      const fwd = decoded.get(i + wantDir * d);
      if (fwd) return fwd;
    }
    return null;
  }

  // Téléchargement progressif : les 12 premières d'abord, puis le reste dans l'ordre
  async function preloadFrames(onProgress) {
    let done = 0;
    const tick = () => onProgress(++done / FRAME_COUNT);
    const FIRST = 12;
    await Promise.all([loadEdges(), ...Array.from({ length: FIRST }, (_, i) => fetchFrame(i).then(tick))]);
    pumpDecode();
    let next = FIRST;
    const worker = async () => {
      while (next < FRAME_COUNT) {
        const i = next++;
        await fetchFrame(i);
        tick();
        if (Math.abs(i - want) <= WINDOW) pumpDecode();
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    pumpDecode();
  }

  /* ------------------------------------------------------------------------
     Rendu du film sur canvas : une image nette par position de scroll
     ------------------------------------------------------------------------ */

  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const FRAME_W = mobileMQ.matches ? 960 : 1920;
  const FRAME_RATIO = 1920 / 1076;
  const film = { frame: 0, blend: false, fx: 0.64, sx: 0.5, zoom: 1, sy: 0.5 };
  let cw = 0;
  let ch = 0;

  // Bords fondus : petit calque posé sur le pourtour de l'image, dans les couleurs
  // de ses bords, de plus en plus transparent vers l'intérieur. Basse définition :
  // son contenu est un simple dégradé.
  const EW = 360;
  const EH = 202;
  const BW = EW * 0.12;
  const BH = EH * 0.14;
  const makeCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const edge = makeCanvas(EW, EH);
  const ectx = edge.getContext('2d');
  const band = makeCanvas(EW, EH);
  const bctx = band.getContext('2d');
  const bandMask = {};
  [['L', 0, 0, BW, 0], ['R', EW, 0, EW - BW, 0], ['T', 0, 0, 0, BH], ['B', 0, EH, 0, EH - BH]].forEach(([side, x0, y0, x1, y1]) => {
    const m = makeCanvas(EW, EH);
    const g = m.getContext('2d');
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    for (let k = 0; k <= 8; k++) grad.addColorStop(k / 8, `rgba(0,0,0,${(1 - smooth(k / 8)).toFixed(3)})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, EW, EH);
    bandMask[side] = m;
  });
  let edgeFor = -1; // image dont le calque des bords est à jour

  // Fond autour de l'image : des dégradés lisses, calculés en basse définition
  // puis agrandis (bien moins de pixels à peindre à chaque image)
  const BG_K = 8;
  const bg = makeCanvas(1, 1);
  const gctx = bg.getContext('2d', { alpha: false });

  function sizeCanvas() {
    // Assez de pixels pour poser l'image source pixel pour pixel, pas davantage :
    // rendu plus léger, même netteté. Sur un écran plus grand, le navigateur
    // agrandit le canvas lui-même.
    const shown = mobileMQ.matches
      ? innerWidth  // sur mobile, l'image déborde de l'écran
      : IMAGE_SCALE * Math.max(innerWidth, innerHeight * FRAME_RATIO);  // largeur de l'image à l'écran
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5, FRAME_W / shown);
    cw = Math.round(innerWidth * dpr);
    ch = Math.round(innerHeight * dpr);
    canvas.width = cw;
    canvas.height = ch;
    bg.width = Math.ceil(cw / BG_K) + 1;
    bg.height = Math.ceil(ch / BG_K) + 1;
    gctx.setTransform(1 / BG_K, 0, 0, 1 / BG_K, 0, 0);
  }

  function drawFilm() {
    const f = clamp(film.frame, 0, FRAME_COUNT - 1);
    const i = Math.round(f);
    // Entre deux images voisines (1/48 s d'écart), la suivante apparaît en
    // transparence : le film avance en continu même quand un cran de molette
    // ne le fait progresser que de quelques images
    const a = Math.floor(f);
    const t = f - a;
    const box = motion && motion[a];
    const blend = film.blend && t > 0.02 && (!motion || (box && box[2] > box[0]))
      && decoded.has(a) && decoded.has(a + 1);
    const img = blend ? decoded.get(a) : pickFrame(i);
    if (!img || !cw) return false;
    const ei = blend ? i : img.frameIndex;  // couleurs de bord de l'image dominante
    const e = edgeColors(ei);
    const iw = img.width || img.naturalWidth;
    const ih = img.height || img.naturalHeight;

    // Cadrage
    const mobile = mobileMQ.matches;
    const s = mobile
      ? (cw * 1.8 / iw) * film.zoom
      : Math.max(cw / iw, ch / ih) * IMAGE_SCALE * film.zoom;
    const dw = iw * s;
    const dh = ih * s;
    const dx = film.sx * cw - film.fx * dw;
    const dy = film.sy * ch - 0.5 * dh;
    const rx = dx + dw;
    const by = dy + dh;

    // 1. Fond : les couleurs des bords prolongent l'image (papier, sol)
    if (e) {
      // chaque zone déborde un peu sous l'image : l'agrandissement ne mélange
      // jamais une couleur de bord avec autre chose
      const m = 2 * BG_K;
      gctx.fillStyle = gradient(gctx, 0, dy, 0, by, e.L);
      gctx.fillRect(0, 0, Math.max(0, dx) + m, ch);
      gctx.fillStyle = gradient(gctx, 0, dy, 0, by, e.R);
      gctx.fillRect(Math.min(cw, rx) - m, 0, cw, ch);
      gctx.fillStyle = gradient(gctx, dx, 0, rx, 0, e.T);
      gctx.fillRect(dx, 0, dw, Math.max(0, dy) + m);
      gctx.fillStyle = gradient(gctx, dx, 0, rx, 0, e.B);
      gctx.fillRect(dx, Math.min(ch, by) - m, dw, ch);
      // on ne recopie que ce qui dépasse de l'image
      const x0 = clamp(Math.floor(dx) + 1, 0, cw);
      const x1 = clamp(Math.ceil(rx) - 1, 0, cw);
      const y0 = clamp(Math.floor(dy) + 1, 0, ch);
      const y1 = clamp(Math.ceil(by) - 1, 0, ch);
      [[0, 0, x0, ch], [x1, 0, cw - x1, ch], [x0, 0, x1 - x0, y0], [x0, y1, x1 - x0, ch - y1]].forEach(([x, y, w, h]) => {
        if (w > 0 && h > 0) ctx.drawImage(bg, x / BG_K, y / BG_K, w / BG_K, h / BG_K, x, y, w, h);
      });
    } else {
      ctx.fillStyle = '#ece6d6';
      ctx.fillRect(0, 0, cw, ch);
    }

    // 2. L'image du film
    ctx.drawImage(img, dx, dy, dw, dh);
    if (blend) {
      const next = decoded.get(a + 1);
      ctx.globalAlpha = t;
      if (box) {
        const [mx, my] = [box[0] / 1000 * iw, box[1] / 1000 * ih];
        const [mw, mh] = [(box[2] - box[0]) / 1000 * iw, (box[3] - box[1]) / 1000 * ih];
        ctx.drawImage(next, mx, my, mw, mh, dx + mx * s, dy + my * s, mw * s, mh * s);
      } else {
        ctx.drawImage(next, dx, dy, dw, dh);
      }
      ctx.globalAlpha = 1;
    }

    // 3. Bords fondus : près des bords, l'image se fond dans ces mêmes couleurs
    if (e) {
      if (edgeFor !== ei) {
        edgeFor = ei;
        ectx.clearRect(0, 0, EW, EH);
        [
          ['T', gradient(bctx, 0, 0, EW, 0, e.T), 0, 0, EW, BH],
          ['B', gradient(bctx, 0, 0, EW, 0, e.B), 0, EH - BH, EW, BH],
          ['L', gradient(bctx, 0, 0, 0, EH, e.L), 0, 0, BW, EH],
          ['R', gradient(bctx, 0, 0, 0, EH, e.R), EW - BW, 0, BW, EH],
        ].forEach(([side, fill, x, y, w, h]) => {
          bctx.globalCompositeOperation = 'copy';
          bctx.fillStyle = fill;
          bctx.fillRect(x, y, w, h);
          bctx.globalCompositeOperation = 'destination-in';
          bctx.drawImage(bandMask[side], 0, 0);
          ectx.drawImage(band, 0, 0);
        });
      }
      // seulement les quatre bandes : le centre du calque est transparent
      const kx = dw / EW;
      const ky = dh / EH;
      [
        [0, 0, EW, BH],
        [0, EH - BH, EW, BH],
        [0, BH, BW, EH - 2 * BH],
        [EW - BW, BH, BW, EH - 2 * BH],
      ].forEach(([x, y, w, h]) => {
        ctx.drawImage(edge, x, y, w, h, dx + x * kx, dy + y * ky, w * kx, h * ky);
      });
    }
    return blend || img.frameIndex === i;
  }

  /* ------------------------------------------------------------------------
     Ciel étoilé (hero et zone nuit)
     ------------------------------------------------------------------------ */

  function createSky(cvs) {
    const c = cvs.getContext('2d');
    let w = 0;
    let h = 0;
    let stars = [];
    function resize() {
      const r = Math.min(window.devicePixelRatio || 1, 1.5);
      w = cvs.clientWidth;
      h = cvs.clientHeight;
      if (!w || !h) return;
      cvs.width = Math.round(w * r);
      cvs.height = Math.round(h * r);
      c.setTransform(r, 0, 0, r, 0, 0);
      const n = Math.round((w * h) / 4800);
      stars = Array.from({ length: n }, () => {
        const big = Math.random() < 0.06;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: big ? 0.9 + Math.random() * 0.7 : 0.3 + Math.random() * 0.5,
          a: 0.25 + Math.random() * 0.7,
          s: 0.5 + Math.random() * 2,
          p: Math.random() * Math.PI * 2,
          warm: Math.random() < 0.3,
        };
      });
    }
    function draw(time) {
      if (!w) return;
      c.clearRect(0, 0, w, h);
      for (let k = 0; k < 2; k++) {
        c.fillStyle = k ? '#efd2ad' : '#f7f1e6';
        for (const st of stars) {
          if (st.warm !== !!k) continue;
          c.globalAlpha = st.a * (0.62 + 0.38 * Math.sin(time * st.s + st.p));
          if (st.r < 0.9) {
            c.fillRect(st.x - st.r, st.y - st.r, st.r * 2, st.r * 2);
          } else {
            c.beginPath();
            c.arc(st.x, st.y, st.r, 0, 6.2832);
            c.fill();
          }
        }
      }
      c.globalAlpha = 1;
    }
    resize();
    return { resize, draw };
  }

  /* ------------------------------------------------------------------------
     Texte découpé (lettres / mots), lisible par les lecteurs d'écran
     ------------------------------------------------------------------------ */

  function splitText(el) {
    const chars = el.dataset.split === 'chars';
    const text = el.textContent.trim();
    const parts = chars ? Array.from(text) : text.split(/\s+/);
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.appendChild(sr);
    parts.forEach((part, i) => {
      const m = document.createElement('span');
      m.className = chars ? 'char-mask' : 'word-mask';
      m.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = chars ? 'char' : 'word';
      inner.textContent = part;
      m.appendChild(inner);
      el.appendChild(m);
      if (!chars && i < parts.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  // Les lettres découpées perdent le crénage de la police : on le rétablit
  function kernChars(el) {
    const masks = $$('.char-mask', el);
    if (masks.length < 2) return;
    const cs = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;letter-spacing:0;font:${cs.fontStyle} ${cs.fontWeight} 100px ${cs.fontFamily};text-transform:${cs.textTransform}`;
    document.body.appendChild(probe);
    const width = (t) => { probe.textContent = t; return probe.getBoundingClientRect().width; };
    for (let i = 0; i < masks.length - 1; i++) {
      const a = masks[i].textContent;
      const b = masks[i + 1].textContent;
      masks[i].style.marginRight = `${((width(a + b) - width(a) - width(b)) / 100).toFixed(4)}em`;
    }
    probe.remove();
  }

  $$('[data-split]').forEach(splitText);
  const kernAll = () => $$('[data-split="chars"]').forEach(kernChars);
  kernAll();
  if (document.fonts) document.fonts.ready.then(kernAll);

  /* ------------------------------------------------------------------------
     Sections du récit
     ------------------------------------------------------------------------ */

  const sections = $$('.scroll-section').map((el, i) => ({
    el,
    index: i + 1,
    inner: $('.section-inner', el),
    enter: parseFloat(el.dataset.enter) / 100,
    leave: parseFloat(el.dataset.leave) / 100,
    persist: el.dataset.persist === 'true',
    type: el.dataset.animation,
    chapter: el.dataset.chapter,
    zone: el.classList.contains('on-accent') ? 'accent' : el.classList.contains('on-dark') ? 'dark' : 'light',
    items: $$('.anatomy li', el),
    bar: $('.anatomy__progress i', el),
    active: false,
    tl: null,
  }));

  const formatNumber = (v, decimals) => v.toFixed(decimals).replace('.', ',');

  /* ------------------------------------------------------------------------
     Version animée
     ------------------------------------------------------------------------ */

  function initMotion() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    // Lenis (scroll doux) synchronisé avec ScrollTrigger
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();

    const hero = $('.hero');
    const heroSticky = $('.hero__sticky');
    const heroCenter = $('.hero__center');
    const container = $('#contenu');
    const canvasWrap = $('.canvas-wrap');
    const overlay = $('#dark-overlay');
    const overlaySkyEl = $('.sky', overlay);
    const marquee = $('.marquee-wrap');
    const marqueeText = $('.marquee-text');
    const chapter = $('.chapter');
    const chapterNum = $('.chapter__num');
    const chapterName = $('.chapter__name');
    const chapterBar = $('.chapter__line i');

    sizeCanvas();
    const heroSky = createSky($('.sky', hero));
    const overlaySky = createSky(overlaySkyEl);

    let heroP = 0;
    let p = 0;
    let dirty = true;
    let zone = '';
    let starsA = 0;
    let lastClip = '';
    const view = [0, 0, 0, 0];
    const ov = [0, 0, 0, 0];
    const one = [0];

    // Hero : 85vh de scroll pour l'ouverture en cercle
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => { heroP = self.progress; dirty = true; },
    });

    // Récit : la progression pilote le film, les cadrages, les zones et les textes
    const story = ScrollTrigger.create({
      trigger: container,
      start: 'top bottom',
      end: 'bottom bottom',
      onUpdate: (self) => { p = self.progress; dirty = true; },
    });

    // Entrées de section : un type d'animation différent par section
    const KIDS = '.section-label, .section-heading, .section-body, .section-note, .stat, .formats, .cta-row, .section-legal, .anatomy__progress';
    sections.forEach((s) => {
      const kids = $$(KIDS, s.el);
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      tl.fromTo(s.el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0);
      const at = 0.08;
      const origin = mobileMQ.matches ? '50% 50%' : s.el.classList.contains('align-right') ? '100% 50%' : '0% 50%';
      switch (s.type) {
        case 'slide-left':
          tl.from(kids, { x: -80, opacity: 0, stagger: 0.12, duration: 0.95 }, at);
          break;
        case 'slide-right':
          tl.from(kids, { x: 80, opacity: 0, stagger: 0.12, duration: 0.95 }, at);
          break;
        case 'scale-up':
          tl.from(kids, { scale: 0.86, opacity: 0, stagger: 0.11, duration: 1, ease: 'power2.out', transformOrigin: origin }, at);
          break;
        case 'rotate-in':
          tl.from(kids, { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.95, transformOrigin: '0% 100%' }, at);
          break;
        case 'stagger-up':
          tl.from(kids, { y: 60, opacity: 0, stagger: 0.13, duration: 0.85 }, at);
          break;
        case 'clip-reveal':
          tl.fromTo(kids,
            { clipPath: 'inset(100% 0% -20% 0%)', y: 24, opacity: 0 },
            { clipPath: 'inset(-20% 0% -20% 0%)', y: 0, opacity: 1, stagger: 0.12, duration: 1.15, ease: 'power4.inOut' }, at);
          break;
        default: // fade-up
          tl.from(kids, { y: 50, opacity: 0, stagger: 0.11, duration: 0.95 }, at);
      }
      // Compteurs : partent de 0 à chaque entrée
      $$('.stat-number', s.el).forEach((el) => {
        const target = parseFloat(el.dataset.value);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const o = { v: 0 };
        el.textContent = formatNumber(0, decimals);
        tl.to(o, {
          v: target,
          duration: 1.9,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = formatNumber(o.v, decimals); },
        }, 0.3);
      });
      s.tl = tl;
      s.el.setAttribute('tabindex', '-1');
    });

    function setChapter(s) {
      chapterNum.textContent = String(s.index).padStart(2, '0');
      chapterName.textContent = s.chapter;
      gsap.fromTo([chapterNum, chapterName], { yPercent: 70, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', overwrite: true });
    }

    function updateSections() {
      const mobile = mobileMQ.matches;
      for (const s of sections) {
        const on = p >= s.enter && (s.persist || p <= s.leave);
        if (on !== s.active) {
          s.active = on;
          s.el.classList.toggle('is-active', on);
          if (on) {
            s.tl.timeScale(1).play();
            setChapter(s);
          } else {
            s.tl.timeScale(2.2).reverse();
          }
        }
        if (!on) continue;
        const l = clamp((p - s.enter) / (s.leave - s.enter));
        // légère dérive verticale pendant que la section est à l'écran
        s.inner.style.transform = mobile ? '' : `translate3d(0, ${((0.5 - l) * 5).toFixed(2)}vh, 0)`;
        // Anatomie : section épinglée, la liste s'allume pièce par pièce
        if (s.bar) {
          s.bar.style.transform = `scaleX(${clamp((l - 0.04) / 0.9).toFixed(3)})`;
          s.items.forEach((li, i) => {
            const lit = l >= 0.1 + i * 0.2;
            if (li._lit !== lit) {
              li._lit = lit;
              gsap.to(li, { opacity: lit ? 1 : 0.32, duration: 0.6, ease: 'power2.out', overwrite: true });
            }
          });
        }
      }
    }

    let shownFrame = 0;
    let filmDirty = true;
    let tick = 0;
    let scrollTarget = -1;
    let movedAt = 0;
    onFrameReady = (i) => { if (Math.abs(i - shownFrame) < 1.5) filmDirty = true; };

    function render(time, deltaTime) {
      // étoiles : 30 i/s suffisent pour le scintillement
      tick++;
      if (tick % 2 === 0) {
        if (heroP < 1) heroSky.draw(time);
        if (starsA > 0.01) overlaySky.draw(time);
      }

      // Film : l'image affichée rejoint la position de scroll en passant par
      // chaque image intermédiaire, même si le scroll saute (clavier, tactile).
      // À l'arrêt, elle se pose sur l'image la plus proche : une image nette.
      let target = Math.min(p * FRAME_SPEED, 1) * (FRAME_COUNT - 1);
      if (target !== scrollTarget) {
        scrollTarget = target;
        movedAt = time;
      } else if (time - movedAt > 0.15) {
        target = Math.round(target);
      }
      if (shownFrame !== target) {
        const dir = Math.sign(target - shownFrame);
        shownFrame += (target - shownFrame) * (1 - Math.exp(-(deltaTime || 16) / 55));
        if (Math.abs(target - shownFrame) < 0.02) shownFrame = target;
        aim(Math.round(shownFrame), dir);
        filmDirty = true;
      }
      if (filmDirty || dirty) {
        // transition seulement quand le film avance de moins d'une image par
        // rafraîchissement ; plus vite, chaque rafraîchissement a déjà sa propre image
        film.blend = Math.abs(shownFrame - film.frame) < 0.75;
        film.frame = shownFrame;
        sample(mobileMQ.matches ? VIEW.mobile : VIEW.desktop, p, view);
        film.fx = view[0];
        film.sx = view[1];
        film.zoom = view[2];
        film.sy = view[3];
        drawFilm();
        filmDirty = false;
      }

      if (!dirty) return;
      dirty = false;

      // Hero : le film s'ouvre en cercle pendant que le titre s'efface
      const wipe = smooth(clamp((heroP - 0.08) / 0.86));
      const clip = wipe > 0.999 ? 'none' : `circle(${(wipe * 75).toFixed(2)}% at 50% 50%)`;
      if (clip !== lastClip) {
        canvasWrap.style.clipPath = clip;
        lastClip = clip;
      }
      heroSticky.style.opacity = (1 - clamp((heroP - 0.2) / 0.7)).toFixed(3);
      heroCenter.style.transform = `translate3d(0, ${(-heroP * 10).toFixed(2)}vh, 0) scale(${(1 - heroP * 0.08).toFixed(4)})`;

      // 3. Calque de couleur et étoiles
      sample(OVERLAY, p, ov);
      overlay.style.backgroundColor = `rgba(${ov[0] | 0}, ${ov[1] | 0}, ${ov[2] | 0}, ${ov[3].toFixed(3)})`;
      overlay.style.visibility = ov[3] < 0.005 ? 'hidden' : 'visible';  // pas de calque inutile sur le film
      starsA = sample(STARS, p, one)[0];
      overlaySkyEl.style.opacity = starsA.toFixed(3);

      // 4. Marquee
      marquee.style.opacity = sample(MARQUEE, p, one)[0].toFixed(3);
      marqueeText.style.transform = `translate3d(${(-clamp((p - 0.47) / 0.42) * 40).toFixed(3)}%, 0, 0)`;

      // 5. Zone : couleur de l'en-tête et du marquee
      let z = 'dark';
      if (heroP > 0.8) for (const [from, name] of ZONES) if (p >= from) z = name;
      if (z !== zone) {
        zone = z;
        gsap.to(root, { '--hdr-ink': INK[z], '--marquee-stroke': STROKE[z], duration: 0.6, ease: 'power2.out', overwrite: true });
      }

      // 6. Sections et repère de chapitre
      updateSections();
      chapter.style.opacity = clamp((heroP - 0.9) * 10).toFixed(3);
      chapterBar.style.transform = `scaleX(${p.toFixed(4)})`;
    }

    gsap.ticker.add(render);

    // Navigation : chaque ancre vise le milieu de sa section
    function targetFor(id) {
      if (id === 'top') return 0;
      if (id === 'contenu') id = 'etoile';
      const s = sections.find((x) => x.el.id === id);
      if (!s) return null;
      const at = s.persist ? s.enter + 0.04 : s.enter + (s.leave - s.enter) * 0.4;
      return story.start + at * (story.end - story.start);
    }

    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        const y = targetFor(id);
        if (y == null) return;
        e.preventDefault();
        const dist = Math.abs(y - window.scrollY) / innerHeight;
        lenis.scrollTo(y, { duration: clamp(0.9 + dist * 0.12, 0.9, 3) });
        const s = sections.find((x) => x.el.id === (id === 'contenu' ? 'etoile' : id));
        if (s) s.el.focus({ preventScroll: true });
      });
    });

    // Clavier : un lien qui reçoit le focus dans une section cachée y amène le scroll
    sections.forEach((s) => {
      s.el.addEventListener('focusin', () => {
        if (playing || held) pause();  // navigation au clavier : la visite s'arrête
        if (!s.active) lenis.scrollTo(targetFor(s.el.id), { immediate: true });
      });
    });

    // Lecture automatique : à l'arrivée, la page se déroule seule, chapitre après
    // chapitre. La molette, le doigt ou le clavier prennent la main un moment, puis
    // la visite reprend d'elle-même ; seul le bouton de l'en-tête l'arrête (pause),
    // la relance, ou la rejoue depuis le début.
    const playBtn = $('.autoplay');
    const playLabel = $('.autoplay__label', playBtn);
    // Entre deux arrêts, le récit avance de PACE par seconde : le film défile à
    // environ 31 images par seconde (la vidéo en compte 48), assez vite pour rester
    // fluide. À chaque arrêt, l'image se pose, nette, le temps de lire.
    const PACE = 0.055;
    const HOLD = { anatomie: 1.5, chiffres: 5.5, blason: 7.5 };  // secondes d'arrêt, 4 par défaut ; anatomie : à chaque pièce
    let tour = [];
    let tourEnd = 0;
    let toured = false;
    let playing = false;
    let held = false;      // visite suspendue le temps que l'utilisateur fasse défiler
    let resumeTimer = 0;
    let playT = 0;
    let playY = 0;

    // Étapes [temps, scroll] : le titre, l'ouverture du film, puis un arrêt par
    // section (un par pièce pour l'anatomie), reliés à vitesse constante
    function buildTour() {
      const yAt = (q) => story.start + q * (story.end - story.start);
      const keys = [[0, 0], [2, 0], [5.5, yAt(sections[0].enter)]];  // titre, puis ouverture
      let q = sections[0].enter;
      const last = () => keys[keys.length - 1];
      const moveTo = (to) => {
        keys.push([last()[0] + Math.max(0.6, (to - q) / PACE), yAt(to)]);
        q = to;
      };
      const hold = (dt) => keys.push([last()[0] + dt, last()[1]]);
      sections.forEach((s) => {
        if (s.persist) return moveTo(s.enter + 0.04);
        const span = s.leave - s.enter;
        const stops = s.items.length
          ? s.items.map((_, i) => s.enter + span * (0.14 + i * 0.2))  // juste après l'allumage de chaque pièce
          : [s.enter + span * 0.4];
        stops.forEach((at) => {
          moveTo(at);
          hold(HOLD[s.el.id] || 4);
        });
      });
      tourEnd = story.end;
      return keys;
    }

    function tourY(t) {
      for (let k = 1; k < tour.length; k++) {
        const [t1, y1] = tour[k];
        if (t <= t1) {
          const [t0, y0] = tour[k - 1];
          return y0 + (y1 - y0) * ((t - t0) / (t1 - t0));
        }
      }
      return tour[tour.length - 1][1];
    }

    function tourTime(y) {
      for (let k = 1; k < tour.length; k++) {
        const [t0, y0] = tour[k - 1];
        const [t1, y1] = tour[k];
        if (y1 > y0 && y <= y1) return t0 + (t1 - t0) * clamp((y - y0) / (y1 - y0));
      }
      return tour[tour.length - 1][0];
    }

    function setPlayState(state) {
      playBtn.dataset.state = state;
      playLabel.textContent = { playing: 'Pause', paused: 'Lecture', ended: 'Revoir' }[state];
      playBtn.setAttribute('aria-label', {
        playing: 'Mettre la visite automatique en pause',
        paused: 'Reprendre la visite automatique',
        ended: 'Revoir la visite depuis le début',
      }[state]);
    }

    function play(again = true) {
      held = false;
      clearTimeout(resumeTimer);
      tour = buildTour();
      let y = window.scrollY;
      if (y >= tour[tour.length - 1][1] - 2) {
        if (!again) return pause('ended');  // reprise seule après la fin : on ne remonte pas
        y = 0;
        lenis.scrollTo(0, { immediate: true, force: true });
      }
      playT = toured ? tourTime(y) : 0;
      toured = true;
      playY = y;
      playing = true;
      setPlayState('playing');
    }

    function pause(state = 'paused') {
      playing = false;
      held = false;
      clearTimeout(resumeTimer);
      setPlayState(state);
    }

    // Avance de la visite, avant le rendu de chaque image
    gsap.ticker.add((time, deltaTime) => {
      if (!playing) return;
      if (tourEnd !== story.end) {  // page redimensionnée : on recale la visite
        tour = buildTour();
        playT = tourTime(window.scrollY);
        playY = window.scrollY;
      }
      const dt = Math.min(deltaTime, 100);
      playT += dt / 1000;
      const y = tourY(playT);
      playY += (y - playY) * (1 - Math.exp(-dt / 450));  // vitesse lissée d'une étape à l'autre
      lenis.scrollTo(playY, { immediate: true, force: true });
      if (playT >= tour[tour.length - 1][0] && Math.abs(y - playY) < 1) pause('ended');
    }, false, true);

    playBtn.hidden = false;
    setPlayState('paused');
    playBtn.addEventListener('click', () => (playing || held ? pause() : play()));

    // L'utilisateur fait défiler : la visite le laisse faire, puis reprend
    // d'elle-même 5 s après son dernier geste, là où il s'est arrêté
    const takeOver = (e) => {
      if (e.target instanceof Element && e.target.closest('.autoplay')) return;
      if (!playing && !held) return;
      playing = false;
      held = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => play(false), 5000);
    };
    window.addEventListener('wheel', takeOver, { passive: true });
    window.addEventListener('touchstart', takeOver, { passive: true });
    window.addEventListener('keydown', takeOver);
    window.addEventListener('pointerdown', (e) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el && (el === document.documentElement || el.closest('a'))) takeOver(e);  // barre de défilement, liens
    });

    // Bouton magnétique
    const btn = $('.cta-button');
    if (btn && matchMedia('(pointer: fine)').matches) {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3.out' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.45);
      });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    }

    window.addEventListener('resize', () => {
      sizeCanvas();
      heroSky.resize();
      overlaySky.resize();
      dirty = true;
    });

    // Chargement, puis entrée du hero
    const bar = $('#loader-bar');
    const pct = $('#loader-percent');
    let revealed = false;

    function reveal() {
      if (revealed) return;
      revealed = true;
      root.classList.remove('is-loading');
      lenis.start();
      ScrollTrigger.refresh();
      dirty = true;
      gsap.timeline()
        .to('#loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' })
        .set('#loader', { display: 'none' })
        .from('.hero .char', { yPercent: 115, duration: 1.4, stagger: 0.07, ease: 'expo.out' }, 0.55)
        .from('.hero .word', { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.95)
        .from('.hero__top > *, .hero__bottom > *', { opacity: 0, y: 14, duration: 1, stagger: 0.08, ease: 'power2.out' }, 1.1)
        .from('.aquila', { opacity: 0, duration: 2, ease: 'power1.out' }, 0.9)
        .fromTo('.aquila__lines path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, stagger: 0.15, ease: 'power2.inOut' }, 1)
        .from('.site-header', { opacity: 0, y: -12, duration: 1, ease: 'power2.out' }, 1.2);
      play();  // la visite commence par quelques secondes sur le titre
    }

    // Le début du film suffit pour commencer (la visite met une quinzaine de
    // secondes à l'atteindre) : la suite continue d'arriver en fond, dans l'ordre
    const READY = 48 / FRAME_COUNT;
    preloadFrames((ratio) => {
      const r = Math.min(1, ratio / READY);
      bar.style.transform = `scaleX(${r.toFixed(3)})`;
      pct.textContent = String(Math.round(r * 100)).padStart(3, '0');
      if (r >= 1) setTimeout(reveal, 250);
    }).then(() => setTimeout(reveal, 250));
    setTimeout(reveal, 10000); // ne jamais bloquer
  }

  /* ------------------------------------------------------------------------
     Version statique (mouvement réduit ou bibliothèques indisponibles) :
     sections dans le flux, une image représentative par section
     ------------------------------------------------------------------------ */

  function initStatic() {
    sizeCanvas();
    const sky = createSky($('.hero .sky'));
    sky.draw(0);
    const view = [0, 0, 0, 0];
    let shown = -1;

    function show(pp) {
      const idx = Math.round(Math.min(pp * FRAME_SPEED, 1) * (FRAME_COUNT - 1));
      sample(mobileMQ.matches ? VIEW.mobile : VIEW.desktop, pp, view);
      film.frame = idx;
      film.fx = view[0];
      film.sx = view[1];
      film.zoom = view[2];
      film.sy = view[3];
      shown = pp;
      aim(idx, 0);
      fetchFrame(idx).then(() => pumpDecode());
    }

    const setInk = (z) => root.style.setProperty('--hdr-ink', INK[z]);
    const midOf = (s) => (s.el.id === 'anatomie' ? s.leave : (s.enter + s.leave) / 2);

    onFrameReady = (i) => { if (i === film.frame) drawFilm(); };
    loadEdges().then(() => drawFilm());
    show(0);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains('hero')) { setInk('dark'); return; }
        const s = sections.find((x) => x.el === e.target);
        if (!s) return;
        setInk(s.zone);
        show(midOf(s));
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    io.observe($('.hero'));
    sections.forEach((s) => io.observe(s.el));

    window.addEventListener('resize', () => {
      sizeCanvas();
      sky.resize();
      sky.draw(0);
      drawFilm();
    });
  }

  try {
    if (canMotion) initMotion();
    else initStatic();
  } catch (err) {
    console.error(err);
    root.classList.remove('motion', 'is-loading');
    initStatic();
  }
})();
