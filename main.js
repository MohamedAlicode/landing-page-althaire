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
  const canMotion = root.classList.contains('motion') &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches &&
    'gsap' in window && 'ScrollTrigger' in window && 'Lenis' in window;
  if (!canMotion) root.classList.remove('motion', 'is-loading');

  /* ------------------------------------------------------------------------
     Réglages du film
     ------------------------------------------------------------------------ */

  const FRAME_COUNT = 145;
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
      [0.770, 0.575, 0.50, 1.14, 0.50],
      [0.790, 0.575, 0.30, 0.90, 0.50],
      [0.870, 0.575, 0.30, 0.90, 0.50],
      [0.890, 0.575, 0.70, 0.88, 0.50],
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
      [0.870, 0.575, 0.50, 0.90, 0.30],
      [0.890, 0.575, 0.50, 0.74, 0.25],
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
    [0.773, ...NIGHT, 0.92],
    [0.785, ...VEIL, 0.84],
    [0.874, ...VEIL, 0.84],
    [0.886, ...VEIL, 0],
  ];
  const STARS = [[0.655, 0], [0.668, 1], [0.772, 1], [0.784, 0]];
  const MARQUEE = [[0.494, 0], [0.51, 1], [0.862, 1], [0.876, 0]];
  const ZONES = [[0, 'light'], [0.503, 'accent'], [0.661, 'dark'], [0.779, 'light']];
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
     Rendu du film sur canvas
     ------------------------------------------------------------------------ */

  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d');
  const frames = new Array(FRAME_COUNT);

  const comp = document.createElement('canvas');  // image courante (+ fondu), bords adoucis
  const cctx = comp.getContext('2d');
  const mask = document.createElement('canvas');
  const tiny = document.createElement('canvas');  // miniature : prolonge les bords sans couture
  const TW = 12;  // peu de colonnes : bandes douces en haut et en bas
  const TH = 27;  // assez de lignes pour suivre papier et sol sur les côtés
  tiny.width = TW;
  tiny.height = TH;
  const tctx = tiny.getContext('2d');

  const film = { frame: 0, fx: 0.64, sx: 0.5, zoom: 1, sy: 0.5 };
  let cw = 0;
  let ch = 0;

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cw = Math.round(innerWidth * dpr);
    ch = Math.round(innerHeight * dpr);
    canvas.width = cw;
    canvas.height = ch;
  }

  // Masque aux bords adoucis (courbe douce) : l'image se fond dans son prolongement
  function buildMask(w, h) {
    comp.width = mask.width = w;
    comp.height = mask.height = h;
    const m = mask.getContext('2d');
    const ramp = (g, f) => {
      [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
        const a = smooth(t).toFixed(3);
        g.addColorStop(t * f, `rgba(0,0,0,${a})`);
        g.addColorStop(1 - t * f, `rgba(0,0,0,${a})`);
      });
      return g;
    };
    m.fillStyle = ramp(m.createLinearGradient(0, 0, w, 0), (0.18 * h) / w);
    m.fillRect(0, 0, w, h);
    m.globalCompositeOperation = 'destination-in';
    m.fillStyle = ramp(m.createLinearGradient(0, 0, 0, h), 0.13);
    m.fillRect(0, 0, w, h);
  }

  function nearest(i) {
    if (frames[i]) return frames[i];
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  function drawFilm() {
    const f = clamp(film.frame, 0, FRAME_COUNT - 1);
    const i0 = Math.floor(f);
    const t = f - i0;
    const A = nearest(i0);
    if (!A || !cw) return;
    const iw = A.naturalWidth;
    const ih = A.naturalHeight;
    if (comp.width !== iw || comp.height !== ih) buildMask(iw, ih);

    // 1. image courante, fondue avec la suivante pour adoucir le scrub
    cctx.globalCompositeOperation = 'copy';
    cctx.globalAlpha = 1;
    cctx.drawImage(A, 0, 0);
    const B = frames[i0 + 1];
    if (B && frames[i0] && t > 0.01) {
      cctx.globalCompositeOperation = 'source-over';
      cctx.globalAlpha = t;
      cctx.drawImage(B, 0, 0);
      cctx.globalAlpha = 1;
    }
    tctx.globalCompositeOperation = 'copy';
    tctx.drawImage(comp, 0, 0, TW, TH);
    cctx.globalCompositeOperation = 'destination-in';
    cctx.drawImage(mask, 0, 0);
    cctx.globalCompositeOperation = 'source-over';

    // 2. cadrage
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

    // 3. fond : la miniature étirée prolonge les bords de l'image (papier, sol)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tiny, 0, 0, TW, TH, dx, dy, dw, dh);
    if (dx > 0) ctx.drawImage(tiny, 0, 0, 1, TH, 0, dy, dx + 1, dh);
    if (rx < cw) ctx.drawImage(tiny, TW - 1, 0, 1, TH, rx - 1, dy, cw - rx + 1, dh);
    if (dy > 0) {
      ctx.drawImage(tiny, 0, 0, TW, 1, dx, 0, dw, dy + 1);
      if (dx > 0) ctx.drawImage(tiny, 0, 0, 1, 1, 0, 0, dx + 1, dy + 1);
      if (rx < cw) ctx.drawImage(tiny, TW - 1, 0, 1, 1, rx - 1, 0, cw - rx + 1, dy + 1);
    }
    if (by < ch) {
      ctx.drawImage(tiny, 0, TH - 1, TW, 1, dx, by - 1, dw, ch - by + 1);
      if (dx > 0) ctx.drawImage(tiny, 0, TH - 1, 1, 1, 0, by - 1, dx + 1, ch - by + 1);
      if (rx < cw) ctx.drawImage(tiny, TW - 1, TH - 1, 1, 1, rx - 1, by - 1, cw - rx + 1, ch - by + 1);
    }

    // 4. l'image nette par-dessus, bords fondus dans le fond
    ctx.drawImage(comp, dx, dy, dw, dh);
  }

  function loadFrame(i) {
    if (frames[i]) return Promise.resolve(frames[i]);
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const ready = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
        ready.then(() => { frames[i] = img; resolve(img); });
      };
      img.onerror = () => resolve(null);
      img.src = frameSrc(i);
    });
  }

  // Deux temps : 10 premières images (premier rendu rapide), puis le reste
  async function preloadFrames(onProgress, onFirst) {
    let done = 0;
    const tick = () => onProgress(++done / FRAME_COUNT);
    const FIRST = 10;
    await Promise.all(Array.from({ length: FIRST }, (_, i) => loadFrame(i).then(tick)));
    onFirst();
    const queue = Array.from({ length: FRAME_COUNT - FIRST }, (_, i) => i + FIRST);
    const worker = async () => {
      while (queue.length) {
        await loadFrame(queue.shift());
        tick();
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
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
      const r = Math.min(window.devicePixelRatio || 1, 2);
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
          c.beginPath();
          c.arc(st.x, st.y, st.r, 0, 6.2832);
          c.fill();
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
    const KIDS = '.section-label, .section-heading, .section-body, .section-note, .stat, .cta-row, .section-legal, .anatomy__progress';
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

    function render(time) {
      if (heroP < 1) heroSky.draw(time);
      if (starsA > 0.01) overlaySky.draw(time);
      if (!dirty) return;
      dirty = false;

      // 1. Hero : le film s'ouvre en cercle pendant que le titre s'efface
      const wipe = smooth(clamp((heroP - 0.08) / 0.86));
      const clip = wipe > 0.999 ? 'none' : `circle(${(wipe * 75).toFixed(2)}% at 50% 50%)`;
      if (clip !== lastClip) {
        canvasWrap.style.clipPath = clip;
        lastClip = clip;
      }
      heroSticky.style.opacity = (1 - clamp((heroP - 0.2) / 0.7)).toFixed(3);
      heroCenter.style.transform = `translate3d(0, ${(-heroP * 10).toFixed(2)}vh, 0) scale(${(1 - heroP * 0.08).toFixed(4)})`;

      // 2. Film
      film.frame = Math.min(p * FRAME_SPEED, 1) * (FRAME_COUNT - 1);
      sample(mobileMQ.matches ? VIEW.mobile : VIEW.desktop, p, view);
      film.fx = view[0];
      film.sx = view[1];
      film.zoom = view[2];
      film.sy = view[3];
      drawFilm();

      // 3. Calque de couleur et étoiles
      sample(OVERLAY, p, ov);
      overlay.style.backgroundColor = `rgba(${ov[0] | 0}, ${ov[1] | 0}, ${ov[2] | 0}, ${ov[3].toFixed(3)})`;
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
        if (!s.active) lenis.scrollTo(targetFor(s.el.id), { immediate: true });
      });
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
    }

    preloadFrames(
      (ratio) => {
        bar.style.transform = `scaleX(${ratio.toFixed(3)})`;
        pct.textContent = String(Math.round(ratio * 100)).padStart(3, '0');
      },
      () => { dirty = true; },
    ).then(() => setTimeout(reveal, 250));
    setTimeout(reveal, 12000); // ne jamais bloquer : les images restantes arrivent en fond
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
      loadFrame(idx).then(() => { if (shown === pp) drawFilm(); });
    }

    const setInk = (z) => root.style.setProperty('--hdr-ink', INK[z]);
    const midOf = (s) => (s.el.id === 'anatomie' ? s.leave : (s.enter + s.leave) / 2);

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
