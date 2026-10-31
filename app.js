/* ══════════════════════════════════════════════════════════════════════════
   NEXUS — cinematic brand intro
   dot  →  exclamation mark  →  NEXUS  →  vortex  →  portrait  →  final frame

   Canvas 2D particle field + a GSAP master timeline.
   Every number you may want to tune is in CONFIG below.
   ══════════════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* ──────────────────────────────────────────────────────────────────
     1. CONFIG — the whole film in numbers
     ────────────────────────────────────────────────────────────────── */
  const CONFIG = {
    /* the two things the particles become */
    word: 'NEXUS',
    mark: '!',

    /* particles */
    particles: 13000,        // desktop
    particlesSmall: 6000,    // phones and narrow windows
    particleSize: 1.9,       // px, before device scaling
    particleSizeSmall: 1.45, // the same on a phone, where every pixel is bigger
    particleAlpha: 1,        // ink of a single particle
    particleAlphaSmall: 0.82,
    sampleStep: 2,           // px between points sampled from the type
    faceStep: 3,             // px between points sampled from the portrait
    keepDust: 0.05,          // share of particles left drifting on the last frame
    dust: 90,                // ambient background specks

    /* type */
    type: {
      family: '"Bricolage Grotesque", "Helvetica Neue", Helvetica, Arial, sans-serif',
      wordWeight: 760,
      markWeight: 780,
      wordSizeOfWidth: 0.176,   // NEXUS size as a share of the window width
      markSizeOfWidth: 0.30,    // the exclamation mark
      tracking: 0.155,          // em between letters
      wordGlow: 26,             // px of soft glow around the crisp word
      markGlow: 20
    },

    /* the vortex */
    vortex: {
      radiusOfMin: 0.26,   // ring radius against the shorter window edge
      radiusSmall: 0.19,   // the ring tightens on a phone
      spin: 1.35,          // radians per second
      squash: 0.62,        // flattens the ring for a little depth
      lift: 0.02,          // ring centre sits slightly above middle
      spread: 0.55,        // how wide the band of dust is
      arms: 0.22,          // radial swell that turns the ring into a swirl
      core: 0.45           // light at the eye of the vortex
    },

    /* the portrait */
    portrait: {
      drift: 1.035,        // very slow push in on the final frame
      halo: 0.7            // the soft light behind the head
    },

    /* glow strengths, 0–1 */
    glow: {
      dot: 0.45,
      mark: 0.30,
      word: 0.22,
      vortex: 0.14,
      face: 0.12
    },

    /* scene lengths in seconds */
    t: {
      appear: 0.9,     // the dot arrives
      dot: 0.7,        // it holds and breathes
      toMark: 1.3,     // it becomes the exclamation mark
      mark: 0.9,
      toWord: 1.4,     // the mark becomes NEXUS
      word: 1.3,
      toVortex: 1.7,   // the letters break apart and swirl
      vortex: 0.9,
      toFace: 2.2,     // the swirl gathers into the portrait
      face: 0.8,
      settle: 1.8      // the last frame settles
    },

    /* the way into the site */
    cta: {
      show: true,
      label: 'Portfolio',
      /* ?entered=1 tells the site the film has already played here, so it
         opens on the studio instead of showing the landing a second time */
      href: './nexus-vr/index.html?entered=1',   // rewritten when the single file is built
      arrow: true
    }
  };

  /* ──────────────────────────────────────────────────────────────────
     2. small helpers
     ────────────────────────────────────────────────────────────────── */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ──────────────────────────────────────────────────────────────────
     3. DOM
     ────────────────────────────────────────────────────────────────── */
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('field');
  const glowEl = document.getElementById('glow');
  const portraitEl = document.getElementById('portrait');
  const portraitImg = document.getElementById('portraitImg');
  const enterLink = document.getElementById('enterSite');

  /* one scratch context, used only for measuring type */
  const scratch = document.createElement('canvas').getContext('2d');

  /* ──────────────────────────────────────────────────────────────────
     4. type: measure, draw, sample
        The same two functions draw the crisp glyphs and feed the
        particles, so the type and its dust agree to the pixel.
     ────────────────────────────────────────────────────────────────── */
  function measureSpec(text, size, trackingEm, weight) {
    scratch.font = `${weight} ${size}px ${CONFIG.type.family}`;
    const chars = [...text];
    const trackPx = trackingEm * size;
    const widths = chars.map(ch => scratch.measureText(ch).width);
    const total = widths.reduce((s, w) => s + w, 0) + trackPx * Math.max(0, chars.length - 1);
    const m = scratch.measureText(text);
    const ascent = m.actualBoundingBoxAscent || size * 0.72;
    const descent = m.actualBoundingBoxDescent || size * 0.04;
    return {
      chars, widths, total, trackPx, size, weight,
      /* distance from the optical centre of the glyphs to the baseline */
      baseline: (ascent - descent) / 2
    };
  }

  function drawSpec(ctx, spec, cx, cy, alpha, glowPx) {
    const a = clamp(alpha, 0, 1);
    if (a <= 0.002) return;
    let x = cx - spec.total / 2;
    const base = cy + spec.baseline;
    ctx.save();
    ctx.font = `${spec.weight} ${spec.size}px ${CONFIG.type.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    if (glowPx > 0) {
      ctx.shadowColor = `rgba(255,255,255,${0.42 * a})`;
      ctx.shadowBlur = glowPx;
    }
    for (let i = 0; i < spec.chars.length; i++) {
      ctx.fillText(spec.chars[i], x + spec.widths[i] / 2, base);
      x += spec.widths[i] + spec.trackPx;
    }
    ctx.restore();
  }

  /* ──────────────────────────────────────────────────────────────────
     5. the particle field
     ────────────────────────────────────────────────────────────────── */
  class Field {
    constructor(canvasEl) {
      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d', { alpha: true, desynchronized: true });
      this.w = 0;
      this.h = 0;
      this.parts = [];
      this.mode = 'idle';
      this.modeT = 0;
      this.vDur = 1.6;
      this.vcx = 0;
      this.vcy = 0;
      this.shape = 'mark';
      this.sampler = document.createElement('canvas');
      this.samplerCtx = this.sampler.getContext('2d', { willReadFrequently: true });
      this.faceCanvas = document.createElement('canvas');
      this.dust = [];
      this.last = performance.now();
      this.now = 0;
      this.resize();
      this.buildDust();
    }

    /* ── geometry ─────────────── */
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.w = w;
      this.h = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.sampler.width = Math.max(1, Math.round(w));
      this.sampler.height = Math.max(1, Math.round(h));
      this.buildType();
    }

    buildType() {
      const w = this.w;
      const h = this.h;
      const wordSize = clamp(Math.round(Math.min(w * CONFIG.type.wordSizeOfWidth, h * 0.28)), 40, 240);
      const markSize = clamp(Math.round(Math.min(w * CONFIG.type.markSizeOfWidth, h * 0.26)), 54, 260);
      this.wordSpec = measureSpec(CONFIG.word, wordSize, CONFIG.type.tracking, CONFIG.type.wordWeight);
      this.markSpec = measureSpec(CONFIG.mark, markSize, 0, CONFIG.type.markWeight);
    }

    /* ── particles ────────────── */
    build(count = CONFIG.particles) {
      this.parts = [];
      const cx = this.w / 2;
      const cy = this.h / 2;
      for (let i = 0; i < count; i++) {
        this.parts.push({
          x: cx + rand(-3, 3),
          y: cy + rand(-3, 3),
          sx: cx, sy: cy,
          tx: cx, ty: cy,
          a: (this.w < 760 ? CONFIG.particleAlphaSmall : CONFIG.particleAlpha) * rand(0.55, 1),
          z: 1,
          s: 1,
          ph: rand(0, Math.PI * 2),
          r1: Math.random(),
          r2: Math.random(),
          delay: 0,
          dur: 1,
          a0: 0, r0: 0, rt: 0, spin: 1
        });
      }
    }

    buildDust() {
      this.dust = [];
      for (let i = 0; i < CONFIG.dust; i++) {
        this.dust.push({
          x: Math.random(), y: Math.random(),
          r: rand(0.4, 1.1),
          sp: rand(0.004, 0.02),
          ph: rand(0, Math.PI * 2)
        });
      }
    }

    /* ── sampling ─────────────── */
    sampleSpec(spec) {
      const c = this.samplerCtx;
      const w = this.sampler.width;
      const h = this.sampler.height;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, w, h);
      drawSpec(c, spec, w / 2, h / 2, 1, 0);
      const data = c.getImageData(0, 0, w, h).data;
      const step = CONFIG.sampleStep;
      const pts = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          if (data[(y * w + x) * 4 + 3] > 130) pts.push({ x, y, ny: y / h });
        }
      }
      return pts;
    }

    wordPoints() { return this.sampleSpec(this.wordSpec); }
    markPoints() { return this.sampleSpec(this.markSpec); }

    /* the portrait, sampled where the light actually is */
    facePoints() {
      const r = portraitImg.getBoundingClientRect();
      if (!r.width || !portraitImg.complete) return [];
      const W = Math.max(1, Math.round(r.width));
      const H = Math.max(1, Math.round(r.height));
      if (this.faceCanvas.width !== W) this.faceCanvas.width = W;
      if (this.faceCanvas.height !== H) this.faceCanvas.height = H;
      const c = this.faceCanvas.getContext('2d', { willReadFrequently: true });
      c.clearRect(0, 0, W, H);
      c.drawImage(portraitImg, 0, 0, W, H);
      let data;
      try {
        data = c.getImageData(0, 0, W, H).data;
      } catch (e) {
        return [];
      }
      const step = CONFIG.faceStep;
      const pts = [];
      for (let y = 0; y < H; y += step) {
        const ny = y / H;
        for (let x = 0; x < W; x += step) {
          const i = (y * W + x) * 4;
          const al = data[i + 3] / 255;
          if (al < 0.2) continue;
          const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          /* skin and hair take most of the dust, the dark hoodie only
             a light sprinkle, so the silhouette still holds together */
          if (Math.random() > 0.16 + 0.84 * Math.sqrt(lum)) continue;
          pts.push({
            x: r.left + x + rand(-0.6, 0.6),
            y: r.top + y + rand(-0.6, 0.6),
            ny
          });
        }
      }
      return pts;
    }

    /* ── transitions ──────────── */
    toTargets(points, { dur = 1.2, stagger = 0.4, order = 'x' } = {}) {
      if (!points || !points.length) return;
      const n = this.parts.length;
      const sorted = points.slice();
      if (order === 'y') sorted.sort((a, b) => a.y - b.y || a.x - b.x);
      else sorted.sort((a, b) => a.x - b.x || a.y - b.y);
      const span = sorted[sorted.length - 1].ny - sorted[0].ny || 1;
      for (let i = 0; i < n; i++) {
        const p = this.parts[i];
        const target = sorted[Math.floor((i * sorted.length) / n)];
        p.sx = p.x;
        p.sy = p.y;
        p.tx = target.x;
        p.ty = target.y;
        p.z = 1;
        p.s = 1;
        p.dur = dur * rand(0.82, 1.18);
        p.delay = stagger * (order === 'y'
          ? clamp((target.ny - sorted[0].ny) / span, 0, 1)
          : Math.random());
      }
      this.mode = 'target';
      this.modeT = 0;
    }

    toVortex({ dur = 1.8 } = {}) {
      const cx = this.w / 2;
      const cy = this.h / 2 - this.h * CONFIG.vortex.lift;
      const R = Math.min(this.w, this.h) * (this.w < 760 ? CONFIG.vortex.radiusSmall : CONFIG.vortex.radiusOfMin);
      for (const p of this.parts) {
        p.a0 = Math.atan2(p.y - cy, p.x - cx);
        p.r0 = Math.hypot(p.x - cx, p.y - cy);
        p.rt = R * (1 - CONFIG.vortex.spread * 0.5 + CONFIG.vortex.spread * p.r1);
        p.spin = CONFIG.vortex.spin * (0.62 + 0.7 * p.r2);
        p.s = 1;
        p.z = 1;
      }
      this.vcx = cx;
      this.vcy = cy;
      this.vDur = dur;
      this.mode = 'vortex';
      this.modeT = 0;
    }

    toDrift() { this.mode = 'drift'; this.modeT = 0; }

    /* ── the step ─────────────── */
    step(now) {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.now = now / 1000;
      this.modeT += dt;

      if (this.mode === 'target') {
        for (const p of this.parts) {
          const k = clamp((this.modeT - p.delay) / p.dur, 0, 1);
          const e = easeOut(k);
          const wob = (1 - e) * 9;
          p.x = lerp(p.sx, p.tx, e) + Math.sin(this.now * 1.7 + p.ph) * wob * 0.35;
          p.y = lerp(p.sy, p.ty, e) + Math.cos(this.now * 1.5 + p.ph) * wob * 0.35;
        }
      } else if (this.mode === 'vortex') {
        const e = easeOut(clamp(this.modeT / this.vDur, 0, 1));
        const breathe = 1 + 0.04 * Math.sin(this.modeT * 0.9);
        const arms = CONFIG.vortex.arms;
        for (const p of this.parts) {
          const a = p.a0 + p.spin * this.modeT;
          /* the swelling radius turns a flat ring into a slow swirl */
          const swell = 1 + arms * Math.sin(2 * a + p.ph * 0.5) * e;
          const r = lerp(p.r0, p.rt * breathe * swell, e);
          const z = 0.5 + 0.5 * Math.sin(a * 1.3 + p.ph);
          const depth = -0.5 + z;                       /* -0.5 near, +0.5 far */
          p.x = this.vcx + Math.cos(a) * r * (1 + depth * 0.12);
          p.y = this.vcy + Math.sin(a) * r * CONFIG.vortex.squash + depth * 26 * e;
          p.z = 0.28 + 0.72 * (0.5 + 0.5 * Math.cos(a * 0.9 + p.ph));
          p.s = 0.62 + 0.7 * z;
        }
      } else if (this.mode === 'drift') {
        for (const p of this.parts) {
          p.x += Math.sin(this.now * 0.6 + p.ph) * 0.14;
          p.y += Math.cos(this.now * 0.5 + p.ph * 1.3) * 0.12;
        }
      }
    }

    /* ── the frame ────────────── */
    draw(S) {
      this.frames = (this.frames || 0) + 1;
      const ctx = this.ctx;
      const w = this.w;
      const h = this.h;
      ctx.clearRect(0, 0, w, h);

      /* background dust, always breathing */
      const dustA = 0.16 * clamp(S.field, 0, 1);
      if (dustA > 0.004) {
        ctx.fillStyle = `rgba(255,255,255,${dustA})`;
        for (const d of this.dust) {
          const x = ((d.x + this.now * d.sp * 0.02) % 1) * w;
          const y = (d.y + Math.sin(this.now * 0.4 + d.ph) * 0.01) * h;
          ctx.fillRect(x, y, d.r, d.r);
        }
      }

      /* the tiny light */
      if (S.dot > 0.002) {
        const cx = w / 2;
        const cy = h / 2;
        const r = 2.4 * S.dotR;
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 11);
        halo.addColorStop(0, `rgba(255,255,255,${0.95 * S.dot})`);
        halo.addColorStop(0.18, `rgba(255,255,255,${0.30 * S.dot})`);
        halo.addColorStop(0.45, `rgba(255,255,255,${0.07 * S.dot})`);
        halo.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${clamp(S.dot, 0, 1)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      /* the eye of the vortex, a small light rather than a wide haze */
      if (this.mode === 'vortex' && S.field > 0.02) {
        const strength = CONFIG.vortex.core * Math.min(1, S.field);
        const R = Math.min(w, h) * CONFIG.vortex.radiusOfMin * 0.55;
        const g = ctx.createRadialGradient(this.vcx, this.vcy, 0, this.vcx, this.vcy, R);
        g.addColorStop(0, `rgba(255,255,255,${0.16 * strength})`);
        g.addColorStop(0.45, `rgba(255,255,255,${0.05 * strength})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.vcx, this.vcy, R, 0, Math.PI * 2);
        ctx.fill();
      }

      /* the particles */
      const ink = S.field;
      if (ink > 0.004 && this.parts.length) {
        const small = this.w < 760;
        const base = small ? CONFIG.particleSizeSmall : CONFIG.particleSize;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#fff';   /* never inherit a gradient from an earlier pass */
        /* four alpha buckets: the dots stay round and the fills stay cheap */
        const buckets = [[], [], [], []];
        for (const p of this.parts) {
          const a = ink * p.a * p.z;
          if (a < 0.012) continue;
          const b = a > 0.72 ? 3 : a > 0.44 ? 2 : a > 0.2 ? 1 : 0;
          buckets[b].push(p);
        }
        for (let b = 0; b < 4; b++) {
          const list = buckets[b];
          if (!list.length) continue;
          ctx.globalAlpha = [0.13, 0.3, 0.55, 0.92][b];
          ctx.beginPath();
          for (const p of list) {
            const r = (base * p.s) / 2;
            ctx.moveTo(p.x + r, p.y);
            ctx.arc(p.x, p.y, r, 0, 6.2832);
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      /* the crisp type, drawn where its dust settled */
      drawSpec(ctx, this.wordSpec, w / 2, h / 2, S.word, CONFIG.type.wordGlow);
      drawSpec(ctx, this.markSpec, w / 2, h / 2, S.mark, CONFIG.type.markGlow);
    }
  }

  /* ──────────────────────────────────────────────────────────────────
     6. state + timeline
     ────────────────────────────────────────────────────────────────── */
  const S = { dot: 0, dotR: 1, mark: 0, word: 0, field: 0 };

  const field = new Field(canvas);
  let timeline = null;

  function resetStage() {
    S.dot = 0; S.dotR = 1; S.mark = 0; S.word = 0; S.field = 0;
    gsap.set(glowEl, { opacity: 0, scale: 0.72 });
    gsap.set(portraitEl, { opacity: 0, '--halo': 0 });
    gsap.set(portraitImg, { scale: 1 });
    gsap.set(enterLink, { autoAlpha: 0, y: 18, scale: 0.97 });
    field.mode = 'idle';
    field.modeT = 0;
    field.build(window.innerWidth < 760 ? CONFIG.particlesSmall : CONFIG.particles);
  }

  function buildTimeline() {
    const t = CONFIG.t;
    const tl = gsap.timeline({ paused: true });
    let at = 0;

    /* ── 1. a tiny light ─────────────────────────── */
    tl.to(S, { dot: 1, dotR: 1, duration: t.appear * 0.55, ease: 'power2.out' }, at);
    tl.to(glowEl, { opacity: CONFIG.glow.dot, scale: 1, duration: t.appear * 0.9, ease: 'power2.out' }, at);
    tl.to(S, { dotR: 1.25, duration: t.dot * 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' }, at + t.appear);
    at += t.appear + t.dot;

    /* ── 2. the dot becomes an exclamation mark ──── */
    tl.call(() => { field.shape = 'mark'; field.toTargets(field.markPoints(), { dur: t.toMark * 0.9, stagger: 0.45 }); }, null, at);
    tl.to(S, { field: 1, duration: t.toMark * 0.35, ease: 'power2.out' }, at);
    tl.to(S, { dot: 0.16, duration: t.toMark * 0.5, ease: 'power2.in' }, at);
    tl.to(S, { mark: 1, duration: t.toMark * 0.42, ease: 'power2.out' }, at + t.toMark * 0.56);
    tl.to(glowEl, { opacity: CONFIG.glow.mark, duration: t.toMark * 0.8 }, at);
    at += t.toMark + t.mark;

    /* ── 3. the mark becomes NEXUS ───────────────── */
    tl.call(() => { field.shape = 'word'; field.toTargets(field.wordPoints(), { dur: t.toWord * 0.85, stagger: 0.5 }); }, null, at);
    tl.to(S, { mark: 0, duration: t.toWord * 0.4, ease: 'power2.in' }, at);
    tl.to(S, { word: 1, duration: t.toWord * 0.5, ease: 'power3.out' }, at + t.toWord * 0.52);
    tl.to(S, { field: 0.26, duration: t.toWord * 0.6, ease: 'power2.inOut' }, at + t.toWord * 0.4);
    tl.to(glowEl, { opacity: CONFIG.glow.word, scale: 1.18, duration: t.toWord * 0.9 }, at);
    at += t.toWord + t.word;

    /* ── 4. the letters break apart into the vortex ─ */
    tl.call(() => field.toVortex({ dur: t.toVortex }), null, at);
    tl.to(S, { word: 0, duration: t.toVortex * 0.42, ease: 'power2.in' }, at);
    tl.to(S, { field: 1, duration: t.toVortex * 0.5, ease: 'power2.out' }, at);
    tl.to(glowEl, { opacity: CONFIG.glow.vortex, scale: 1.55, duration: t.toVortex }, at);
    at += t.toVortex + t.vortex;

    /* ── 5. the vortex gathers into the portrait ─── */
    tl.call(() => {
      const pts = field.facePoints();
      if (pts.length) field.toTargets(pts, { dur: t.toFace * 0.95, stagger: 0.85, order: 'y' });
    }, null, at);
    tl.to(S, { field: 1, duration: 0.2 }, at);
    tl.to(portraitEl, { opacity: 1, duration: t.toFace * 0.75, ease: 'power2.inOut' }, at + t.toFace * 0.36);
    tl.to(portraitEl, { '--halo': CONFIG.portrait.halo, duration: t.toFace, ease: 'power2.out' }, at + t.toFace * 0.4);
    tl.to(glowEl, { opacity: CONFIG.glow.face, scale: 2.1, duration: t.toFace }, at);
    at += t.toFace + t.face;

    /* ── 6. the final frame ──────────────────────── */
    tl.call(() => field.toDrift(), null, at);
    tl.to(S, { field: CONFIG.keepDust, duration: t.settle * 0.6, ease: 'power2.out' }, at);
    tl.to(portraitImg, { scale: CONFIG.portrait.drift, duration: 14, ease: 'none' }, at);
    tl.to(glowEl, { opacity: 0.26, duration: t.settle }, at);
    if (CONFIG.cta.show) {
      const disc = enterLink.querySelector('.enter-arrow');
      const label = enterLink.querySelector('.enter-label');
      tl.to(enterLink, {
        autoAlpha: 1, y: 0, scale: 1,
        duration: 1.15, ease: 'power3.out'
      }, at + t.settle * 0.3);
      if (disc) {
        tl.fromTo(disc, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' },
          at + t.settle * 0.42);
      }
      if (label) {
        tl.fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' },
          at + t.settle * 0.34);
      }
    }

    return tl;
  }

  /* ──────────────────────────────────────────────────────────────────
     7. the loop
     ────────────────────────────────────────────────────────────────── */
  function loop(now) {
    field.step(now);
    field.draw(S);
    requestAnimationFrame(loop);
  }

  function showFinalFrame() {
    /* respect a visitor who asked for less motion: no film, just the frame */
    gsap.set(glowEl, { opacity: 0.22, scale: 2.1 });
    gsap.set(portraitEl, { opacity: 1, '--halo': 1 });
    gsap.set(portraitImg, { scale: 1 });
    gsap.set(enterLink, { autoAlpha: CONFIG.cta.show ? 1 : 0, y: 0, scale: 1 });
    S.dot = 0; S.mark = 0; S.word = 0; S.field = 0;
  }

  function rearm() {
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      if (portraitImg.complete && portraitImg.naturalWidth) finish();
      else {
        portraitImg.addEventListener('load', finish, { once: true });
        portraitImg.addEventListener('error', finish, { once: true });
      }
      setTimeout(finish, 4000);
    });
  }

  async function start() {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) { /* keep going */ }
    }
    await rearm();
    field.resize();
    resetStage();

    if (REDUCED) { showFinalFrame(); return; }

    timeline = buildTimeline();
    timeline.play(0);
    requestAnimationFrame(loop);
  }

  /* ──────────────────────────────────────────────────────────────────
     8. the small things: the pointer, resize, keyboard
     ────────────────────────────────────────────────────────────────── */
  /* one click or key carries the film to its last frame, where the way in
     is waiting: nobody should have to sit through it to reach the site */
  function skipToEnd() {
    if (!timeline || timeline.progress() >= 0.999) return;
    timeline.progress(1, false);
  }
  stage.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    skipToEnd();
  });
  window.addEventListener('keydown', (e) => {
    if (/^(Shift|Control|Alt|Meta|CapsLock|Tab|OS)$/.test(e.key)) return;
    if (e.target && e.target.closest && e.target.closest('a, button')) return;
    skipToEnd();
  });

  /* the link is set from CONFIG, so the single-file build can point it anywhere */
  if (enterLink) {
    enterLink.href = CONFIG.cta.href;
    enterLink.querySelector('.enter-label').textContent = CONFIG.cta.label;
    if (!CONFIG.cta.arrow) enterLink.querySelector('.enter-arrow').remove();
  }

  /* The way in answers the pointer: a soft light follows it across the glass,
     and the pill leans a few pixels towards it. Touch and calmer settings are
     left alone, so nothing moves under a thumb or for a visitor who asked. */
  if (enterLink) {
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fine && !calm) {
      const PULL = 6;
      enterLink.addEventListener('pointermove', (e) => {
        const r = enterLink.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        enterLink.style.translate =
          (dx * PULL).toFixed(1) + 'px ' + (dy * PULL - 3).toFixed(1) + 'px';
        enterLink.style.setProperty('--spot-x',
          (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        enterLink.style.setProperty('--spot-y',
          (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
      });
      enterLink.addEventListener('pointerleave', () => {
        enterLink.style.translate = '';
        enterLink.style.setProperty('--spot-x', '50%');
        enterLink.style.setProperty('--spot-y', '50%');
      });
    }
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      field.resize();
      if (!timeline) return;
      const at = timeline.time();
      if (field.mode === 'target') {
        const pts = field.shape === 'word' ? field.wordPoints() : field.markPoints();
        field.toTargets(pts, { dur: 0.35, stagger: 0.1 });
      }
      if (at > CONFIG.t.appear + CONFIG.t.dot + CONFIG.t.toMark + CONFIG.t.mark + CONFIG.t.toWord + CONFIG.t.word) {
        const f = field.facePoints();
        if (f.length && field.mode === 'drift') field.toTargets(f, { dur: 0.35, stagger: 0.2, order: 'y' });
      }
    }, 160);
  });

  /* a handle for poking at the film from the console */
  window.NEXUS_INTRO = {
    config: CONFIG,
    field,
    state: S,
    get timeline() { return timeline; },
    seek(seconds) {
      if (!timeline) return;
      timeline.pause();
      timeline.seek(seconds);
    },
    play() { if (timeline) timeline.play(); },
    restart() { if (timeline) { resetStage(); timeline.restart(true); } }
  };

  start();
})();
