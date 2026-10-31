/* ════════════════════════════════════════════
   NEXUS. Scene layer.
   One viewport, one idea: the wheel walks the
   page scene by scene, and GSAP plays each
   scene in as it arrives.
   ════════════════════════════════════════════ */
(() => {
  'use strict';

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine) and (min-width: 901px)');
  const gsap = window.gsap || null;
  const scenes = [...document.querySelectorAll('.scene')];
  if (!scenes.length || !document.getElementById('hero')) return;

  /* ── lazy media: only fetch what a scene needs ─────────── */
  const lazyTargets = [...document.querySelectorAll('[data-src], [data-srcset]')];
  const loadMedia = (el) => {
    if (el.dataset.srcset) {
      el.srcset = el.dataset.srcset;
      delete el.dataset.srcset;
    }
    if (el.dataset.src) {
      el.src = el.dataset.src;
      delete el.dataset.src;
    }
  };
  if ('IntersectionObserver' in window) {
    const mediaIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        loadMedia(en.target);
        mediaIO.unobserve(en.target);
      });
    }, { rootMargin: '200px 0px' });
    lazyTargets.forEach((el) => mediaIO.observe(el));
  } else {
    lazyTargets.forEach(loadMedia);
  }

  /* ── scene entrance, played with GSAP ─────────────────── */
  const played = new WeakSet();
  /* these two carry a signature move worth seeing every time they come round */
  const replayable = new Set(['process', 'colour']);

  const playScene = (scene, force) => {
    if (!scene) return;
    if (!gsap || reduce) { played.add(scene); return; }
    if (!force && played.has(scene) && !replayable.has(scene.id)) return;
    played.add(scene);

    const head = scene.querySelectorAll('[data-anim="head"] .kicker, [data-anim="head"] h2, [data-anim="head"] .scene-lede, [data-anim="head"] .showcase-tag, [data-anim="head"] .slider-ctl, [data-anim="head"] .mock-nav');
    const media = scene.querySelectorAll('[data-anim="media"]');
    const copy = scene.querySelectorAll('[data-anim="copy"] > *');
    const cards = scene.querySelectorAll('[data-anim="card"]');
    const steps = scene.querySelectorAll('[data-anim="step"]');
    const list = scene.querySelectorAll('[data-anim="list"] > *');
    const form = scene.querySelectorAll('[data-anim="form"] > .field, [data-anim="form"] > .btn, [data-anim="form"] > h3');
    const fills = scene.querySelectorAll('.swatch-fill');
    const line = scene.querySelector('.flow-line i');

    /* any half-finished tween from a faster pass is dropped first */
    const all = [...head, ...media, ...copy, ...cards, ...steps, ...list, ...form, ...fills];
    if (all.length) gsap.killTweensOf(all);
    if (line) gsap.killTweensOf(line);

    const tl = gsap.timeline({ delay: 0.14, defaults: { ease: 'power3.out', duration: 0.7 } });

    /* the scene's own blocks take turns, the way a scroll-driven
       timeline does: faint and low, then settled and bright, 1-2-3 */
    const inner = scene.querySelector('.scene-inner');
    const beats = inner ? [...inner.children] : [];
    const beatDelay = (el) => {
      if (!el || !beats.length) return 0;
      const owner = beats.find((b) => b === el || b.contains(el));
      return owner ? beats.indexOf(owner) * 0.14 : 0;
    };
    /* a stepped scene animates its own content as it is scrolled through,
       so it only wants the header to arrive, not a second veil over it */
    if (beats.length > 1 && !scene.dataset.steps) {
      gsap.killTweensOf(beats);
      tl.fromTo(beats,
        { opacity: 0.34, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.18, ease: 'power2.out', clearProps: 'transform,opacity' },
        0);
    }

    /* explicit start and end states: nothing can be left mid-transform */
    const headsFirst = (sc) => sc.querySelector('[data-anim="head"]') || sc.querySelector('.scene-inner > *');
    const rise = (els, from, pos, opts) => {
      if (!els.length) return;
      const o = opts || {};
      tl.fromTo(els,
        Object.assign({ opacity: 0 }, from),
        Object.assign({
          opacity: 1, y: 0, x: 0, scale: 1,
          duration: o.dur || 0.7,
          stagger: o.stagger || 0,
          clearProps: 'transform,opacity',
          immediateRender: false
        }, o.ease ? { ease: o.ease } : {}), pos);
    };

    rise(head, { y: 20 }, beatDelay(headsFirst(scene)) + 0.02, { stagger: 0.06 });
    rise(media, { y: 24, scale: 0.985 }, beatDelay(media[0]) + 0.05, { stagger: 0.08, dur: 0.8 });
    rise(copy, { y: 14 }, beatDelay(copy[0]) + 0.06, { stagger: 0.05, dur: 0.55 });
    rise(cards, { y: 24 }, beatDelay(cards[0]) + 0.08, { stagger: 0.08 });
    rise(steps, { y: 28 }, beatDelay(steps[0]) + 0.06, { stagger: 0.09 });
    rise(list, { y: 12 }, beatDelay(list[0]) + 0.08, { stagger: 0.045, dur: 0.5 });
    rise(form, { y: 12 }, beatDelay(form[0]) + 0.08, { stagger: 0.045, dur: 0.5 });

    if (line) {
      tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power2.inOut', clearProps: 'transform' }, 0.1);
    }

    /* palette: colour pours into each chip as the cards settle */
    if (fills.length) {
      tl.fromTo(fills, { yPercent: 100 }, { yPercent: 0, duration: 0.85, stagger: 0.08, ease: 'power4.out', clearProps: 'transform' }, 0.15);
    }
  };

  /* ── the pager: a wheel notch is one stop ─────────────────
     A stop is one screen of a scene. Most scenes are a single screen;
     a scene with data-steps="N" is N screens tall and pinned, so each
     notch advances one step inside it before the page moves on. */
  const stepsFor = (scene) => {
    const n = Number(scene.dataset.steps || 1);
    /* the tall, pinned version only exists under this query, so the
       stop list has to agree with the CSS at all times */
    if (n < 2 || !fine.matches || reduce) return 1;
    return n;
  };

  let stops = [];
  const buildStops = () => {
    /* the stylesheet needs the same count the pager uses */
    scenes.forEach((sc) => {
      if (sc.dataset.steps) sc.style.setProperty('--steps', sc.dataset.steps);
    });
    const out = [];
    scenes.forEach((scene, si) => {
      const n = stepsFor(scene);
      const top = scene.offsetTop;
      for (let k = 0; k < n; k += 1) {
        out.push({ si, step: k, n, top: top + k * window.innerHeight, scene });
      }
    });
    stops = out;
  };

  const stopAt = (y) => {
    let best = 0;
    let dist = Infinity;
    stops.forEach((stop, i) => {
      const d = Math.abs(stop.top - y);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  };

  /* the first stop that belongs to a given scene */
  const firstStopOf = (scene) => {
    const i = stops.findIndex((stop) => stop.scene === scene);
    return i < 0 ? 0 : i;
  };

  /* once a stop is reached, tell the section what to show */
  const applyStop = (i) => {
    const stop = stops[i];
    if (!stop) return;
    if (stop.n > 1) {
      const root = stop.scene;
      if (root && typeof root.__setTab === 'function') root.__setTab(stop.step);
      if (stop.step === 0) playScene(stop.scene);
      return;
    }
    playScene(stop.scene);
  };

  let index = 0;
  let animUntil = 0;
  let lastNotch = 0;
  let lastEvent = 0;
  let lastDir = 0;
  let acc = 0;
  /* One step owns the page while it moves. When the step lands, the next one
     is let go at once. The old rule asked the visitor to stop scrolling and
     start again, which is what made a trackpad feel stuck. */
  let busyUntil = 0;

  /* The browser's own smooth scroll takes however long it likes: on a heavy
     frame it ran past the next notch and the page landed between stops. This
     tween owns the duration, so a notch is always exactly one scene and the
     scroll is always finished before the next one is allowed to start. */
  const TWEEN_MS = 560;
  let tween = 0;
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  const goTo = (i) => {
    if (!stops.length) return;
    index = clamp(i, 0, stops.length - 1);
    const top = stops[index].top;
    if (Math.abs(window.scrollY - top) < 2) return;

    if (tween) { cancelAnimationFrame(tween); tween = 0; }
    applyStop(index);

    if (reduce) {
      window.scrollTo(0, top);
      animUntil = performance.now() + 60;
      return;
    }

    const from = window.scrollY;
    const delta = top - from;
    const t0 = performance.now();
    animUntil = t0 + TWEEN_MS;

    const step = (now) => {
      const t = Math.min(1, (now - t0) / TWEEN_MS);
      window.scrollTo(0, from + delta * ease(t));
      if (t < 1) { tween = requestAnimationFrame(step); return; }
      tween = 0;
      window.scrollTo(0, top);
    };
    tween = requestAnimationFrame(step);
  };

  const sync = () => {
    if (performance.now() < animUntil) return;
    index = stopAt(window.scrollY);
  };

  buildStops();
  window.addEventListener('wheel', (e) => {
    if (!fine.matches) return;
    if (e.ctrlKey || e.metaKey) return;
    if (document.body.style.overflow === 'hidden') return;   /* gate, search, menu */
    e.preventDefault();

    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    const now = performance.now();
    const notch = Math.abs(delta) >= 40;

    const step = reduce ? 120 : TWEEN_MS;

    if (notch) {
      if (now - lastNotch < 130) return;
      lastNotch = now;
      lastEvent = now;
      /* a wheel notch is always answered, the way it always was: spin five
         and the page walks five stops. The hold only keeps a trackpad
         gesture from stacking on top of a wheel that is still travelling. */
      busyUntil = now + step * 0.65;
      lastDir = delta > 0 ? 1 : -1;
      sync();
      goTo(index + lastDir);
      return;
    }

    /* A trackpad sends many small deltas. They add up to one step, and the
       next step is released the moment the one in flight has landed, so a
       long gesture keeps walking instead of stalling on one screen. */
    acc += now - lastEvent > 150 ? 0 : delta;
    lastEvent = now;
    const dir = acc > 0 ? 1 : -1;
    if (lastDir && dir !== lastDir) {          /* a turn of the hand answers at once */
      lastDir = dir;
      acc = 0;
      busyUntil = 0;
      return;
    }
    lastDir = dir;
    if (Math.abs(acc) < 58) return;
    if (now < busyUntil) return;
    acc = 0;
    busyUntil = now + step * 0.65;
    sync();
    goTo(index + dir);
  }, { passive: false });

  /* touch: a deliberate swipe turns one page, a scroll inside content is left alone */
  let touchY = null;
  let touchX = null;
  window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchY = t.clientY; touchX = t.clientX;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const t = e.changedTouches[0];
    const dy = touchY - t.clientY;
    const dx = touchX - t.clientX;
    touchY = null;
    if (Math.abs(dy) < 70 || Math.abs(dx) > Math.abs(dy)) return;
    /* only when the page sits on a stop, so long scenes still scroll */
    const top = stops[index] ? stops[index].top : 0;
    /* a finger rarely ends exactly on a stop: allow a small drift, or the
       page quietly refuses to turn on a phone */
    const atEdge = Math.abs(window.scrollY - top) < 28;
    if (!atEdge) return;
    goTo(index + (dy > 0 ? 1 : -1));
  }, { passive: true });

  /* keyboard, scrollbar and hash links stay native; we only follow them */
  let followRaf = 0;
  window.addEventListener('scroll', () => {
    if (followRaf) return;
    followRaf = requestAnimationFrame(() => {
      followRaf = 0;
      if (performance.now() < animUntil) return;
      const i = stopAt(window.scrollY);
      if (i !== index) {
        index = i;
        applyStop(i);
      }
    });
  }, { passive: true });

  let wasFine = fine.matches;
  window.addEventListener('resize', () => {
    /* turning the stepped layout on or off changes document height,
       so the stop list has to be rebuilt before it is trusted */
    if (fine.matches !== wasFine) {
      wasFine = fine.matches;
      buildStops();
    }
    index = stopAt(window.scrollY);
  });

  /* nav links and anchors land on a scene top, never mid-scene */
  const goToEl = (el) => {
    const scene = el && el.closest ? el.closest('.scene') : null;
    if (scene) goTo(firstStopOf(scene));
    else if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
  };

  /* a tab clicked inside a stepped section also carries the page to that
     step, so click and wheel never disagree about where you are */
  const goToStep = (el, k) => {
    const scene = el && el.closest ? el.closest('.scene') : null;
    if (!scene) return;
    goTo(firstStopOf(scene) + clamp(k, 0, stops.length));
  };

  window.NexusScenes = { goTo, goToEl, goToStep, get index() { return index; } };

  /* ── asset spine ─────────────────────────────────────────
     The four marks sit either side of a centre line, one per screen.
     Whatever the middle of the viewport is nearest is the lit card;
     the line fills as the reader walks down it. This is the scroll
     itself doing the animating, not a timer. */
  (() => {
    const root = document.getElementById('logos');
    if (!root || !root.classList.contains('scene--assets')) return;
    const inner = root.querySelector('.scene-inner');
    const spine = root.querySelector('.asset-spine');
    const fill = root.querySelector('.asset-fill');
    const dot = root.querySelector('.asset-dot');
    const steps = [...root.querySelectorAll('.asset-step')];
    if (!inner || !spine || !steps.length) return;

    const wide = window.matchMedia('(min-width: 901px) and (pointer: fine)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;

    /* the rail starts at the first card and ends at the last; the card
       centres are cached here so the paint step costs one rect read */
    let centres = [];
    const layout = () => {
      if (!wide.matches || still.matches) {
        spine.style.top = ''; spine.style.bottom = ''; centres = []; return;
      }
      const box = inner.getBoundingClientRect();
      const cards = steps.map((step) => step.querySelector('.asset-card')).filter(Boolean);
      if (!cards.length) { centres = []; return; }
      const first = cards[0].getBoundingClientRect();
      const last = cards[cards.length - 1].getBoundingClientRect();
      spine.style.top = Math.max(0, Math.round(first.top - box.top - 26)) + 'px';
      spine.style.bottom = Math.max(0, Math.round(box.bottom - last.bottom - 44)) + 'px';
      centres = cards.map((c) => {
        const r = c.getBoundingClientRect();
        return window.scrollY + r.top + r.height / 2;
      });
    };

    const paint = () => {
      raf = 0;
      const on = wide.matches && !still.matches;
      /* nothing to do while the section is on the far side of the page */
      const box = root.getBoundingClientRect();
      if (box.bottom < -240 || box.top > window.innerHeight + 240) return;
      const mid = window.innerHeight * 0.5;
      let best = 0;
      let near = Infinity;
      steps.forEach((step, i) => {
        const b = step.getBoundingClientRect();
        const d = Math.abs((b.top + b.bottom) / 2 - mid);
        if (d < near) { near = d; best = i; }
      });
      steps.forEach((step, i) => step.classList.toggle('is-on', on && i === best));
      if (!on || !centres.length) return;
      /* glide the light from one card's centre to the next, so it is
         always beside the card it belongs to, never between two */
      /* the opening screen carries the title, so the light only starts
         travelling once the first card is the thing on screen */
      const vh = Math.max(1, window.innerHeight);
      const top = window.scrollY + root.getBoundingClientRect().top;
      const pos = clamp((window.scrollY - top) / vh - 1, 0, centres.length - 1);
      const i0 = Math.floor(pos);
      const i1 = Math.min(centres.length - 1, i0 + 1);
      const f = pos - i0;
      const lightY = centres[i0] + (centres[i1] - centres[i0]) * f;
      const r = spine.getBoundingClientRect();
      const p = clamp((lightY - (r.top + window.scrollY)) / Math.max(1, r.height), 0, 1);
      if (fill) fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      if (dot) dot.style.top = (p * 100).toFixed(3) + '%';
    };

    const tick = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const relayout = () => { layout(); tick(); };

    relayout();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', relayout);
    window.addEventListener('load', relayout);
    if (wide.addEventListener) {
      wide.addEventListener('change', relayout);
      still.addEventListener('change', relayout);
    }
  })();

  /* ── type slider, auto-advancing ──────────────────────── */
  (() => {
    const root = document.getElementById('typeSlider');
    if (!root) return;
    const slides = [...root.querySelectorAll('.type-slide')];
    const dots = [...root.querySelectorAll('.type-dot')];
    let current = 0;
    let timer = null;

    const show = (next, manual) => {
      const from = current;
      current = (next + slides.length) % slides.length;
      if (current === from && !manual) return;
      slides.forEach((s, i) => {
        const on = i === current;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', String(!on));
      });
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === current);
        d.setAttribute('aria-selected', String(i === current));
      });
      if (gsap && !reduce) {
        const slide = slides[current];
        gsap.fromTo(slide, { opacity: 0, x: manual ? 24 : 30 },
          { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', overwrite: true, clearProps: 'x' });
      }
    };

    /* pause while a pointer is inside, or the visitor pressed pause;
       enter/leave events are tracked so the state can never stick */
    let pointerIn = false;
    let userPaused = false;
    const held = () => pointerIn || userPaused || root.contains(document.activeElement);
    let pauseBtn = null;
    const paintPause = () => {
      if (!pauseBtn) return;
      pauseBtn.setAttribute('aria-pressed', String(userPaused));
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play the type slider' : 'Pause the type slider');
      pauseBtn.classList.toggle('is-paused', userPaused);
    };
    const start = () => {
      if (reduce) return;
      stop();
      timer = window.setInterval(() => { if (!held()) show(current + 1); }, 2400);
    };
    const stop = () => { if (timer) { window.clearInterval(timer); timer = null; } };

    root.querySelectorAll('.type-dot').forEach((dot) => {
      dot.addEventListener('click', () => { show(Number(dot.dataset.go), true); start(); });
    });
    const prev = document.getElementById('typePrev');
    const next = document.getElementById('typeNext');
    if (prev) prev.addEventListener('click', () => { show(current - 1, true); start(); });
    if (next) next.addEventListener('click', () => { show(current + 1, true); start(); });

    pauseBtn = document.getElementById('typePause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        userPaused = !userPaused;
        paintPause();
        start();
      });
      paintPause();
    }

    /* a change of pointer or focus restarts the clock, so the next slide
       never fires the instant the pointer leaves */
    /* only real movement counts: content sliding under a still pointer
       must not freeze the carousel */
    root.addEventListener('pointermove', () => { if (!pointerIn) { pointerIn = true; start(); } });
    root.addEventListener('pointerleave', () => { pointerIn = false; start(); });
    root.addEventListener('focusin', start);
    root.addEventListener('focusout', start);

    /* only run while the slider is on screen */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { en.isIntersecting ? start() : stop(); }, { threshold: 0.25 })
        .observe(root);
    } else {
      start();
    }
    show(0);
  })();

  /* ── pointer spotlight ────────────────────────────────────
     The cards that lift also carry a warm light that follows the
     pointer. Coordinates are page-local, so the gradient never
     has to re-measure more than once per move. */
  (() => {
    const cards = document.querySelectorAll('.concept-card, .asset-card, .flow-step, .swatch');
    if (!cards.length) return;
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

    cards.forEach((card) => {
      card.classList.add('spot');
      const move = (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      };
      card.addEventListener('pointermove', move, { passive: true });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    });
  })();

  /* ── mockup switcher ──────────────────────────────────── */
  (() => {
    const root = document.getElementById('mockStage');
    if (!root) return;
    const slides = [...root.querySelectorAll('.mock-hero')];
    const thumbs = [...root.querySelectorAll('.mock-thumb')];
    const counter = document.getElementById('mockNow');
    let current = 0;
    let timer = null;

    const show = (next) => {
      current = (next + slides.length) % slides.length;
      slides.forEach((s, i) => {
        const on = i === current;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', String(!on));
        if (gsap && !reduce) {
          gsap.fromTo(s, { opacity: on ? 0 : 1, y: on ? 16 : 0 },
            { opacity: on ? 1 : 0, y: 0, duration: on ? 0.6 : 0.35, ease: 'power3.out', overwrite: true });
        }
      });
      thumbs.forEach((t, i) => {
        t.classList.toggle('is-active', i === current);
        t.setAttribute('aria-selected', String(i === current));
      });
      if (counter) counter.textContent = String(current + 1).padStart(2, '0');
    };

    thumbs.forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.go))));
    const next = document.getElementById('mockNext');
    if (next) next.addEventListener('click', () => show(current + 1));

    if (!reduce) {
      let pointerIn = false;
      let userPaused = false;
      const held = () => pointerIn || userPaused || root.contains(document.activeElement);
      const start = () => { stop(); timer = window.setInterval(() => { if (!held()) show(current + 1); }, 2600); };
      const stop = () => { if (timer) { window.clearInterval(timer); timer = null; } };
      root.addEventListener('pointermove', () => { pointerIn = true; });
      root.addEventListener('pointerleave', () => { pointerIn = false; start(); });
      const pauseBtn = document.getElementById('mockPause');
      if (pauseBtn) {
        const paint = () => {
          pauseBtn.setAttribute('aria-pressed', String(userPaused));
          pauseBtn.setAttribute('aria-label', userPaused ? 'Play the mockups' : 'Pause the mockups');
          pauseBtn.classList.toggle('is-paused', userPaused);
        };
        pauseBtn.addEventListener('click', () => { userPaused = !userPaused; paint(); start(); });
        paint();
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([en]) => { en.isIntersecting ? start() : stop(); }, { threshold: 0.3 }).observe(root);
      }
    }
    show(0);
  })();

  /* ── the statement writes itself ──────────────────────────
     The four lines are split into letters. When the section reaches
     the middle of the window the letters come in one at a time, with
     a caret where the writing has stopped; when the reader leaves,
     the page wipes them again. So it types on the way down and it
     types on the way back up, driven by the scroll, not by a timer
     that runs once and is gone. */
  (() => {
    const scene = document.getElementById('manifesto');
    const root = document.getElementById('statement');
    if (!scene || !root) return;
    const lines = [...root.querySelectorAll('.statement-line')];
    if (!lines.length) return;

    const plain = lines.map((l) => l.textContent.replace(/\s+/g, ' ').trim());
    /* the letters are decoration: the sentence is read once, whole */
    const sr = document.createElement('p');
    sr.className = 'sr-only';
    sr.textContent = plain.join(' ');
    root.parentNode.insertBefore(sr, root);
    root.setAttribute('aria-hidden', 'true');

    const chars = [];
    lines.forEach((line, li) => {
      line.textContent = '';
      for (const ch of plain[li]) {
        const span = document.createElement('span');
        span.className = 'ty-ch';
        span.textContent = ch;
        line.appendChild(span);
        chars.push(span);
      }
    });
    const total = chars.length;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');

    let shown = 0;
    let caret = null;
    let tween = null;
    let typing = false;

    const setShown = (n) => {
      const target = Math.max(0, Math.min(total, Math.round(n)));
      if (target > shown) {
        for (let i = shown; i < target; i += 1) chars[i].classList.add('on');
      } else {
        for (let i = target; i < shown; i += 1) chars[i].classList.remove('on');
      }
      shown = target;
      const nextCaret = target > 0 && target < total ? chars[target - 1] : null;
      if (nextCaret !== caret) {
        if (caret) caret.classList.remove('is-caret');
        caret = nextCaret;
        if (caret) caret.classList.add('is-caret');
      }
      root.classList.toggle('is-done', target === total);
    };

    const stop = () => {
      if (tween) { tween.kill(); tween = null; }
      typing = false;
    };

    const type = () => {
      stop();
      typing = true;
      if (still.matches || !gsap) { setShown(total); return; }
      if (shown >= total) return;
      const proxy = { v: shown };
      tween = gsap.to(proxy, {
        v: total,
        duration: Math.max(0.8, (total - shown) * 0.0085),
        ease: 'none',
        onUpdate: () => setShown(proxy.v),
        onComplete: () => { typing = false; tween = null; }
      });
    };

    const wipe = () => {
      stop();
      if (!shown) return;
      if (still.matches || !gsap) { setShown(0); return; }
      setShown(0);
    };

    let raf = 0;
    const check = () => {
      raf = 0;
      const r = scene.getBoundingClientRect();
      const vh = window.innerHeight;
      const here = r.top < vh * 0.56 && r.bottom > vh * 0.44;
      if (here && !typing && shown < total) type();
      else if (!here && shown) wipe();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };

    if (still.matches) setShown(total);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    still.addEventListener('change', () => { if (still.matches) setShown(total); });
    check();
  })();

  /* ── the reference sheet fills its width ─────────────────
     Four photographs, four different shapes, one row. Rather than a
     guessed height that wraps on some screens, the row measures its
     own width and the shapes it is given, then sets the one height
     at which all four sit side by side and fill the sheet exactly. */
  (() => {
    const plate = document.querySelector('.mood-plate');
    if (!plate) return;
    const wide = window.matchMedia('(min-width:901px)');
    const imgs = [...plate.querySelectorAll('.mood-photo img')];
    if (!imgs.length) return;

    const fit = () => {
      if (!wide.matches) { plate.style.removeProperty('--mood-h'); return; }
      const shapes = imgs.map((i) => (i.naturalWidth && i.naturalHeight ? i.naturalWidth / i.naturalHeight : i.width / i.height));
      if (shapes.some((v) => !v || !isFinite(v))) return;
      const css = getComputedStyle(plate);
      const gap = parseFloat(css.columnGap) || 12;
      /* each frame carries a 1px border, and the row must not round
         itself over the edge: take both out before dividing */
      const wide_ = plate.clientWidth - gap * (imgs.length - 1) - imgs.length * 2 - 4;
      if (wide_ <= 0) return;
      const h = Math.max(108, Math.floor(wide_ / shapes.reduce((t, v) => t + v, 0)));
      plate.style.setProperty('--mood-h', h + 'px');
    };

    imgs.forEach((i) => {
      if (i.complete) return;
      i.addEventListener('load', fit, { once: true });
    });
    let raf = 0;
    const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fit(); }); };
    window.addEventListener('resize', queue);
    if ('ResizeObserver' in window) new ResizeObserver(queue).observe(plate);
    window.addEventListener('load', queue);
    fit();
  })();

  /* ── questions: an open answer takes the room it needs ──
     The list closes up on the questions that stay shut, so a longer
     answer never pushes the six of them past the bottom of the scene. */
  const faqList = document.querySelector('.faq-list');
  if (faqList) {
    const sync = () => faqList.classList.toggle('has-open', !!faqList.querySelector('.faq-item[open]'));
    faqList.addEventListener('toggle', sync, true);
    sync();
  }

  /* ── hero plays as soon as the gate lifts ─────────────── */
  const hero = document.getElementById('hero');
  if (hero) {
    const start = () => playScene(hero, true);
    if (document.getElementById('loader')) {
      const iv = window.setInterval(() => {
        if (!document.getElementById('loader')) { window.clearInterval(iv); start(); }
      }, 220);
      window.setTimeout(() => { window.clearInterval(iv); start(); }, 3800);
    } else {
      start();
    }
  } else {
    playScene(scenes[0], true);
  }

  /* first scene may already be on screen at load */
  index = stopAt(window.scrollY);
  applyStop(index);
})();
