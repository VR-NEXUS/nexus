/* ─────────────────────────────────────────────────────────────
   NEXUS · the film on the lost page

   One clock, five beats, forever:

       hold 2.5 s  →  warning 2.2 s  →  rain 4.0 s  →  exit 0.5 s
                   →  rebuild (as long as the pixels need)
                   →  hold …

   The beats live in BEAT below and nowhere else. The whole cycle is
   read from one requestAnimationFrame loop and measured against the
   clock, never chained from timeouts — so a slow frame lengthens no
   stage, a repeated cycle cannot stack a second timer, and there is
   only ever one of everything.

   The page's own pixel engine stays in charge of the pixels. This
   file asks it for three things through window.__nxLost: scatter
   them, bring them home, and say when they have arrived.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var film = document.getElementById('film');
  var canvas = document.getElementById('filmRain');
  var lost = window.__nxLost;

  if (!film || !canvas || !lost) return;      /* not this page, or no engine */
  if (window.__nxFilm) return;                /* one controller per page */
  window.__nxFilm = true;

  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var BEAT = {
    hold: 2500,        /* the message, before the warning */
    warn: 2200,        /* YOU'VE BEEN HACKED */
    rain: 4000,        /* the binary, on its own, nothing else */
    exit: 500          /* the rain fades out */
  };
  var REBUILD_CEILING = 2600;   /* the pixels may not take longer than this */

  var state = 'idle';
  var since = 0;
  var last = 0;
  var raf = 0;
  var copyAsked = false;      /* asked for the words once per hold, never in a loop */

  /* ══ the rain ══════════════════════════════════════════════ */
  var rain = {
    w: 0, h: 0, dpr: 1,
    cell: 16, step: 10, cols: 0, rows: 0,
    drops: [],
    running: false
  };

  function seedRain() {
    var i, d;
    rain.drops = [];
    for (i = 0; i < rain.cols; i++) {
      /* every column starts inside the screen with its tail already drawn,
         so the whole viewport is raining from the first frame instead of
         being poured in from above */
      var head = Math.random() * (rain.rows + 0.25 * rain.rows) - 0.1 * rain.rows;
      var tail = 14 + Math.floor(Math.random() * (rain.rows * 0.55));
      d = {
        y: head,
        drawn: Math.floor(head) - tail,
        speed: 5 + Math.random() * 10,          /* cells per second */
        glyph: Math.random() < 0.5 ? '0' : '1'
      };
      rain.drops.push(d);
    }
  }

  function sizeRain() {
    var w = film.clientWidth || window.innerWidth;
    var h = film.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    rain.w = w;
    rain.h = h;
    rain.dpr = dpr;

    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    rain.cell = w < 560 ? 13 : (w < 1100 ? 15 : 17);
    /* the column pitch is the glyph's own width, so the rain covers the
       full width and the columns just touch rather than overlap */
    rain.step = Math.max(8, rain.cell * 0.62);
    rain.cols = Math.max(10, Math.ceil(w / rain.step));
    rain.rows = Math.max(8, Math.ceil(h / rain.cell));

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    if (rain.running) seedRain();
  }

  function paintCell(col, row, glyph, alpha, lead) {
    var x = col * rain.step;
    var y = row * rain.cell;

    if (lead) {
      ctx.fillStyle = 'rgba(208,255,224,' + alpha + ')';
      ctx.shadowColor = 'rgba(72,255,152,.85)';
      ctx.shadowBlur = 9;
    } else {
      ctx.fillStyle = 'rgba(40,168,88,' + alpha + ')';
      ctx.shadowBlur = 0;
    }
    ctx.fillText(glyph, x, y);
    if (lead) ctx.shadowBlur = 0;
  }

  function stepRain(dt) {
    if (!rain.running) return;

    var step = Math.min(dt, 60) / 1000;
    var fade = Math.min(dt, 60) * 0.0020;        /* a long trail: a glyph stays legible for ~2.5 s */

    ctx.fillStyle = 'rgba(0,0,0,' + fade.toFixed(4) + ')';
    ctx.fillRect(0, 0, rain.w, rain.h);

    ctx.font = '700 ' + rain.cell + 'px Orbitron, ui-monospace, "SFMono-Regular", Menlo, monospace';
    ctx.textBaseline = 'top';

    for (var i = 0; i < rain.drops.length; i++) {
      var d = rain.drops[i];
      d.y += d.speed * step;
      var row = Math.floor(d.y);

      /* every cell the head has passed keeps its character, dimmer */
      if (row > d.drawn) {
        for (var r = Math.max(0, d.drawn + 1); r <= row; r++) {
          if (r < rain.rows) paintCell(i, r, d.glyph, 0.55, false);
        }
        d.drawn = row;
        d.glyph = Math.random() < 0.5 ? '0' : '1';
      }

      if (row >= 0 && row < rain.rows) paintCell(i, row, d.glyph, 1, true);

      if (row > rain.rows + 1) {                 /* gone off the bottom: start again */
        d.y = -Math.random() * rain.rows * 0.3;
        d.drawn = Math.floor(d.y) - (10 + Math.floor(Math.random() * rain.rows * 0.4));
        d.speed = 5 + Math.random() * 10;
        d.glyph = Math.random() < 0.5 ? '0' : '1';
      }
    }
    ctx.shadowBlur = 0;
  }

  /* ══ the beats ═════════════════════════════════════════════ */
  function enter(next, t) {
    state = next;
    since = t;

    if (next === 'warn') {
      film.setAttribute('data-stage', 'warn');
      if (lost.scatter) lost.scatter();          /* behind the black: the pixels let go */

    } else if (next === 'rain') {
      film.setAttribute('data-stage', 'rain');   /* the warning fades as this begins */
      rain.running = true;
      sizeRain();

    } else if (next === 'exit') {
      film.setAttribute('data-stage', 'exit');

    } else if (next === 'rebuild') {
      film.setAttribute('data-stage', 'off');    /* the overlay is gone */
      rain.running = false;
      ctx.clearRect(0, 0, rain.w, rain.h);
      if (lost.rebuild) lost.rebuild();          /* every pixel, home */

    } else if (next === 'hold') {
      film.setAttribute('data-stage', 'off');
      copyAsked = false;
    }
  }

  function frame(t) {
    raf = window.requestAnimationFrame(frame);

    if (!last) last = t;
    var dt = t - last;
    last = t;

    /* a tab in the background stops drawing frames; when it comes back,
       the clock must not jump three stages forward in one tick */
    if (dt > 250) {
      since += dt - 16.7;
      dt = 16.7;
    }
    if (!(dt > 0)) dt = 16.7;

    if (state === 'idle') {
      if (lost.revealed && lost.revealed()) {
        /* the beat is measured from the moment the words surfaced, not from
           the frame this loop happened to notice them on */
        var at = lost.revealedAt ? lost.revealedAt() : t;
        if (!(at > 0) || t - at > 4000) at = t;
        enter('hold', at);
      }
      return;
    }

    var spent = t - since;

    if (state === 'hold') {
      /* the hold is the time the words are on screen, so it does not start
         until they are actually up: the page lets them surface a beat after
         the number gives way */
      if (!lost.revealed || !lost.revealed()) {
        if (!copyAsked && lost.showCopy) { copyAsked = true; lost.showCopy(); }
        since = t;                     /* not counting yet (a grace of 1.2 s) */
        return;
      }
      if (spent >= BEAT.hold) enter('warn', t);
      return;
    }

    if (state === 'warn') {
      if (spent >= BEAT.warn) enter('rain', t);
      return;
    }

    if (state === 'rain') {
      stepRain(dt);
      if (spent >= BEAT.rain) enter('exit', t);
      return;
    }

    if (state === 'exit') {
      stepRain(dt);                                /* the rain keeps falling as the screen fades */
      if (spent >= BEAT.exit) enter('rebuild', t);
      return;
    }

    if (state === 'rebuild') {
      if (spent > REBUILD_CEILING || (lost.settled && lost.settled())) enter('hold', t);
      return;
    }
  }

  /* ══ start, stop, and the visitor's own settings ═══════════ */
  function warmFont() {
    if (document.fonts && document.fonts.load) {
      try {
        document.fonts.load('800 40px Orbitron').catch(function () {});
      } catch (e) { /* a browser without the API simply falls back */ }
    }
  }

  function start() {
    if (reduce.matches) return;
    if (raf) window.cancelAnimationFrame(raf);
    state = 'idle';
    last = 0;
    raf = window.requestAnimationFrame(frame);
  }

  function halt() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    rain.running = false;
    film.setAttribute('data-stage', 'off');
    if (rain.w && rain.h) ctx.clearRect(0, 0, rain.w, rain.h);
    state = 'idle';
    last = 0;
  }

  window.addEventListener('resize', function () {
    if (rain.running) sizeRain();
  });

  if (reduce.addEventListener) {
    reduce.addEventListener('change', function () {
      if (reduce.matches) halt();
      else start();
    });
  }

  warmFont();
  start();
})();
