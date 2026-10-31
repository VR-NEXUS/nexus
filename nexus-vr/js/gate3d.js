/* ══════════════════════════════════════════════════════════════
   NEXUS. The gate object.
   The studio's wave mark, swept as one polished gold tube and lit
   in a dark studio: one warm key, one cool fill, two softboxes for
   the metal to find. Hand-written WebGL, no libraries, and no
   reaction to the pointer: the depth comes from the light.

   If the browser cannot draw it, the card is untouched: this file
   simply leaves the canvas empty and steps out of the way.
   ══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const canvas = document.getElementById('gateScene');
  if (!canvas) return;

  const settings = { alpha: true, antialias: true, premultipliedAlpha: false, depth: true, preserveDrawingBuffer: true };
  const gl = canvas.getContext('webgl', settings) || canvas.getContext('experimental-webgl', settings);
  if (!gl) { canvas.setAttribute('data-state', 'off'); return; }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── shaders ────────────────────────────────────────────────── */
  const VERT = `
    attribute vec3 aPos;
    attribute vec3 aNrm;
    uniform mat4 uProj;
    uniform mat4 uView;
    uniform mat3 uNrm;
    varying vec3 vN;
    varying vec3 vP;
    void main() {
      vec4 p = uView * vec4(aPos, 1.0);
      vP = p.xyz;
      vN = uNrm * aNrm;
      gl_Position = uProj * p;
    }
  `;

  const FRAG = `
    precision highp float;
    varying vec3 vN;
    varying vec3 vP;

    uniform vec3 uBase;
    uniform float uRough;
    uniform float uGlow;

    /* a rectangular softbox seen in a reflection: this is what makes
       brushed metal read as metal rather than as a shaded tube */
    float softbox(vec3 R, vec3 dir, vec3 up, vec2 size, float soft) {
      vec3 f = normalize(dir);
      float d = dot(R, f);
      if (d <= 0.001) return 0.0;
      vec3 r = normalize(cross(up, f));
      vec3 u = cross(f, r);
      vec2 p = vec2(dot(R, r), dot(R, u)) / d;
      vec2 e = abs(p) - size;
      float m = max(e.x, e.y);
      return 1.0 - smoothstep(-soft, soft, m);
    }

    vec3 studio(vec3 R) {
      /* the room: near black, warming towards the floor */
      vec3 col = mix(vec3(0.0020, 0.0016, 0.0014), vec3(0.0070, 0.0052, 0.0038),
                     clamp(R.y * 0.5 + 0.5, 0.0, 1.0));

      float soft = mix(0.012, 0.055, uRough);

      /* key: a tall warm box, high and to the right */
      col += vec3(1.00, 0.90, 0.74) * 7.4 * uGlow *
             softbox(R, vec3(0.60, 0.74, 0.44), vec3(0.0, 1.0, 0.0), vec2(0.075, 0.26), soft);
      col += vec3(1.00, 0.95, 0.88) * 3.4 *
             softbox(R, vec3(-0.46, 0.52, 0.72), vec3(0.0, 1.0, 0.0), vec2(0.045, 0.17), soft);

      /* a thin strip behind the object, so the silhouette has an edge */
      col += vec3(1.00, 0.64, 0.30) * 4.0 * uGlow *
             softbox(R, vec3(-0.58, 0.16, -0.80), vec3(0.0, 1.0, 0.0), vec2(0.32, 0.028), soft);
      col += vec3(1.00, 0.92, 0.82) * 1.7 *
             softbox(R, vec3(0.18, -0.42, 0.88), vec3(0.0, 0.0, 1.0), vec2(0.26, 0.05), soft);

      /* a large dim card in front of the object: every polished surface
         needs something to reflect, or it goes to mud */
      col += vec3(0.92, 0.78, 0.58) * 0.85 *
             softbox(R, vec3(0.02, 0.14, 1.0), vec3(0.0, 1.0, 0.0), vec2(0.62, 0.40), soft);

      /* cool fill from the left, very low */
      col += vec3(0.34, 0.46, 0.68) * 0.30 *
             softbox(R, vec3(-0.85, 0.10, 0.35), vec3(0.0, 1.0, 0.0), vec2(0.22, 0.30), soft);

      /* floor bounce */
      col += vec3(0.34, 0.20, 0.09) * 0.09 *
             smoothstep(0.1, -0.7, R.y);
      return col;
    }

    float ggx(float NoH, float a) {
      float a2 = a * a;
      float d = NoH * NoH * (a2 - 1.0) + 1.0;
      return a2 / (3.14159265 * d * d + 0.0001);
    }

    vec3 aces(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }

    void main() {
      vec3 N = normalize(vN);
      vec3 V = normalize(-vP);
      if (dot(N, V) < 0.0) N = -N;
      float NoV = clamp(dot(N, V), 0.0, 1.0);
      vec3 R = reflect(-V, N);

      float fres = pow(1.0 - NoV, 5.0);
      vec3 F = uBase + (1.0 - uBase) * fres;

      vec3 col = F * studio(R);

      /* two pin lights, only for the tight highlights on the curve */
      vec3 keyDir = normalize(vec3(0.62, 0.72, 0.42));
      vec3 fillDir = normalize(vec3(-0.6, 0.35, 0.5));
      vec3 H1 = normalize(keyDir + V);
      vec3 H2 = normalize(fillDir + V);
      float a = max(uRough * uRough, 0.02);
      col += F * vec3(1.0, 0.88, 0.70) * ggx(clamp(dot(N, H1), 0.0, 1.0), a) * 0.22;
      col += F * vec3(0.55, 0.68, 0.92) * ggx(clamp(dot(N, H2), 0.0, 1.0), a) * 0.16;

      /* a whisper of rim so it sits in the room */
      col += vec3(1.0, 0.82, 0.58) * pow(fres, 1.6) * 0.30;

      col = aces(col * 1.12);
      col = pow(col, vec3(1.0 / 2.2));
      /* a breath of dither: eight bits are not enough for a dark room */
      float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (n - 0.5) / 220.0;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[nexus] gate object shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.setAttribute('data-state', 'off'); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[nexus] gate object link:', gl.getProgramInfoLog(prog));
    canvas.setAttribute('data-state', 'off');
    return;
  }
  gl.useProgram(prog);

  const loc = {
    pos: gl.getAttribLocation(prog, 'aPos'),
    nrm: gl.getAttribLocation(prog, 'aNrm'),
    proj: gl.getUniformLocation(prog, 'uProj'),
    view: gl.getUniformLocation(prog, 'uView'),
    nrmMat: gl.getUniformLocation(prog, 'uNrm'),
    base: gl.getUniformLocation(prog, 'uBase'),
    rough: gl.getUniformLocation(prog, 'uRough'),
    glow: gl.getUniformLocation(prog, 'uGlow')
  };

  /* ── the mark as a solid ─────────────────────────────────────
     One wave, sampled once. The curve is the studio's signature
     given depth, and the tube swells through the middle so it
     reads as a drawn stroke rather than a pipe. */
  const SEGS = 240;
  const RING = 26;
  const RADIUS = 0.098;

  const pointAt = (t) => {
    const x = (t - 0.5) * 2.24;
    const y = 0.46 * Math.sin(t * Math.PI * 2.0) * (0.72 + 0.28 * Math.sin(t * Math.PI));
    const z = 0.52 * Math.sin(t * Math.PI * 2.0 + 1.15);
    return [x, y, z];
  };

  const radiusAt = (t) => {
    /* a true round cap: the profile follows a circle over the last 7%,
       so the stroke ends like a drawn line rather than a cut pipe */
    const edge = Math.min(1, Math.min(t, 1 - t) / 0.07);
    const cap = Math.sqrt(Math.max(0, 1 - Math.pow(1 - edge, 2)));
    return RADIUS * cap * (0.66 + 0.34 * Math.pow(Math.sin(t * Math.PI), 0.5));
  };

  const build = () => {
    const pos = [];
    const nrm = [];
    const idx = [];

    /* parallel transport keeps the rings from twisting */
    let prevT = pointAt(0);
    let T = [0, 0, 0];
    let N = [0, 1, 0];
    let B = [0, 0, 1];

    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const p = pointAt(t);
      const p2 = pointAt(Math.min(1, t + 1e-3));
      const p1 = pointAt(Math.max(0, t - 1e-3));
      T = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
      const tl = Math.hypot(T[0], T[1], T[2]) || 1;
      T = [T[0] / tl, T[1] / tl, T[2] / tl];

      if (i === 0) {
        /* seed with any vector not parallel to T */
        const seed = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        N = [seed[1] * T[2] - seed[2] * T[1], seed[2] * T[0] - seed[0] * T[2], seed[0] * T[1] - seed[1] * T[0]];
      } else {
        /* rotate the previous normal onto the new plane */
        const d = N[0] * T[0] + N[1] * T[1] + N[2] * T[2];
        N = [N[0] - T[0] * d, N[1] - T[1] * d, N[2] - T[2] * d];
      }
      const nl = Math.hypot(N[0], N[1], N[2]) || 1;
      N = [N[0] / nl, N[1] / nl, N[2] / nl];
      B = [T[1] * N[2] - T[2] * N[1], T[2] * N[0] - T[0] * N[2], T[0] * N[1] - T[1] * N[0]];
      prevT = p;

      const r = radiusAt(t);
      for (let j = 0; j < RING; j++) {
        const a = (j / RING) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const nx = N[0] * ca + B[0] * sa;
        const ny = N[1] * ca + B[1] * sa;
        const nz = N[2] * ca + B[2] * sa;
        pos.push(p[0] + nx * r, p[1] + ny * r, p[2] + nz * r);
        nrm.push(nx, ny, nz);
      }
    }

    for (let i = 0; i < SEGS; i++) {
      for (let j = 0; j < RING; j++) {
        const a = i * RING + j;
        const b = i * RING + ((j + 1) % RING);
        const c = (i + 1) * RING + j;
        const d = (i + 1) * RING + ((j + 1) % RING);
        idx.push(a, c, b, b, c, d);
      }
    }

    const vboPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

    const vboNrm = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboNrm);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nrm), gl.STATIC_DRAW);

    const vboIdx = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vboIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

    return { count: idx.length, vboPos, vboNrm, vboIdx };
  };

  const mesh = build();
  if (!mesh) return;

  /* ── matrices ───────────────────────────────────────────────── */
  /* column-major, the way WebGL reads them: o = a * b */
  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  };

  const perspective = (fov, aspect, near, far) => {
    const f = 1 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  };

  const rotY = (a) => new Float32Array([
    Math.cos(a), 0, Math.sin(a), 0,
    0, 1, 0, 0,
    -Math.sin(a), 0, Math.cos(a), 0,
    0, 0, 0, 1
  ]);
  const rotX = (a) => new Float32Array([
    1, 0, 0, 0,
    0, Math.cos(a), -Math.sin(a), 0,
    0, Math.sin(a), Math.cos(a), 0,
    0, 0, 0, 1
  ]);
  const rotZ = (a) => new Float32Array([
    Math.cos(a), -Math.sin(a), 0, 0,
    Math.sin(a), Math.cos(a), 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);

  const view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const translate = (z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]);

  /* ── frame ──────────────────────────────────────────────────── */
  let w = 0;
  let h = 0;
  let dpr = 1;
  let glow = 1;
  const gateEl = () => document.getElementById('loader');

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(1.75, window.devicePixelRatio || 1);
    const nw = Math.max(1, Math.round(rect.width * dpr));
    const nh = Math.max(1, Math.round(rect.height * dpr));
    if (nw === w && nh === h) return;
    w = nw;
    h = nh;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  };

  const draw = (time) => {
    resize();
    if (!w || !h) return;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    const t = time * 0.001;
    /* a slow lean, never a spin: the object is a still life, not a toy */
    const yaw = -0.42 + Math.sin(t * 0.26) * 0.16;
    const pitch = 0.30 + Math.sin(t * 0.19 + 1.1) * 0.05;
    const roll = -0.10 + Math.sin(t * 0.23 + 2.2) * 0.03;

    const model = mul(rotY(yaw), mul(rotX(pitch), rotZ(roll)));
    const mv = mul(view, model);

    /* frame the object the same way whatever shape the canvas is:
       84% of the width, but never more than 78% of the height */
    const fov = 30 * Math.PI / 180;
    const aspect = w / h;
    const tan = Math.tan(fov / 2);
    const dW = (2.42 / 0.84) / (2 * tan * aspect);
    const dH = (1.02 / 0.78) / (2 * tan);
    const dist = Math.max(dW, dH);

    const proj = perspective(fov, aspect, 0.1, 20);
    const cam = translate(-dist);
    gl.uniformMatrix4fv(loc.proj, false, mul(proj, cam));
    gl.uniformMatrix4fv(loc.view, false, mv);

    /* the normal matrix of this model is its rotation, transposed */
    const nm = new Float32Array([
      mv[0], mv[1], mv[2],
      mv[4], mv[5], mv[6],
      mv[8], mv[9], mv[10]
    ]);
    gl.uniformMatrix3fv(loc.nrmMat, false, nm);
    gl.uniform3f(loc.base, 1.0, 0.76, 0.42);
    gl.uniform1f(loc.rough, 0.11);
    const g = gateEl();
    const target = g && g.classList.contains('is-ready') ? 1.22 : 1.0;
    glow += (target - glow) * 0.06;
    gl.uniform1f(loc.glow, glow);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vboPos);
    gl.enableVertexAttribArray(loc.pos);
    gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vboNrm);
    gl.enableVertexAttribArray(loc.nrm);
    gl.vertexAttribPointer(loc.nrm, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.vboIdx);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  };

  let raf = 0;
  let running = false;
  /* the object turns slowly: 30 frames a second is already more than
     the eye needs, and it keeps the gate cheap on a weak GPU */
  let lastDrawn = -1e9;
  const loop = (now) => {
    if (now - lastDrawn > 32) { draw(now); lastDrawn = now; }
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running) return;
    running = true;
    if (reduce) { draw(performance.now()); running = false; }
    else raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  canvas.setAttribute('data-state', 'live');

  const gate = document.getElementById('loader');
  if (gate) {
    const mo = new MutationObserver(() => {
      if (!document.getElementById('loader')) { stop(); mo.disconnect(); }
      else if (document.getElementById('loader').classList.contains('is-leaving')) stop();
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (document.getElementById('loader')) start();
  });

  window.addEventListener('resize', () => { if (!running) draw(performance.now()); });

  /* hold the first frame until the gate is on screen */
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
  setTimeout(start, 900);
})();
