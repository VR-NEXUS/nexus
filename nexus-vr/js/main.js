/* ═════════════════════════════════════
   NEXUS VR. Interaction layer.
   ═════════════════════════════════════ */
(() => {
  'use strict';

  const finePointer = window.matchMedia('(pointer:fine)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* the wheel pager owns scrolling on desktop; it also parks the services
     auto-rotation, which would otherwise fight the scroll-driven cards */
  const pagerOn = !reduceMotionQuery.matches &&
    window.matchMedia('(pointer: fine) and (min-width: 901px)').matches;
  if (pagerOn) document.documentElement.classList.add('paging');

  /* ── Footer year ────────────────────── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Hero entrance choreography ─────── */
  const hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(() => setTimeout(() => hero.classList.add('play'), 120));
  }

  /* ── Mobile menu ────────────────────── */
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    const setMenu = open => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobileMenu.classList.toggle('open', open);
      mobileMenu.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', () => {
      setMenu(!mobileMenu.classList.contains('open'));
    });
    mobileMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => setMenu(false))
    );
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !mobileMenu.classList.contains('open')) return;
      setMenu(false);
      menuBtn.focus({ preventScroll: true });
    });
  }

  /* ── Scroll progress bar ────────────── */
  const scrollBar = document.querySelector('.scroll-progress span');

  /* ── Word-mask heading reveals ───── */
  document.querySelectorAll('.section-head h2, .sub-title').forEach(h => {
    const words = h.textContent.trim().split(/\s+/);
    h.innerHTML = words.map((w, i) =>
      `<span class="w"><span class="wi" style="--i:${i}">${w}</span></span>`
    ).join(' ');
    h.classList.add('head-split');
  });

  /* ── Reveal on scroll (fade, slide, zoom, 3D flip, clip, words) + svg draw */
  document.querySelectorAll('.draw path').forEach(p => p.setAttribute('pathLength', '100'));
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        revealIO.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal, .zoom, .draw, .head-split').forEach(el => revealIO.observe(el));

  /* ── Nav active state + page title ──── */  const navLinks = [...document.querySelectorAll('.site-nav a, .mobile-menu nav a')];
  const setNav = href => navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === href));
  const navTargets = new Set(navLinks.map(a => a.getAttribute('href')));
  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const sec = en.target;
      /* scenes with no nav entry keep the last bead, so the bar never goes blank */
      if (navTargets.has('#' + sec.id)) setNav('#' + sec.id);
      if (sec.dataset.title) document.title = sec.dataset.title;
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('.page, .scene').forEach(s => sectionIO.observe(s));

  /* ── About scroll animation (staggered lines + gentle scrub) */
  let aboutScrollScrub = null;
  const aboutScroll = document.getElementById('aboutScroll');
  if (aboutScroll) {
    const lines = [...aboutScroll.querySelectorAll('.about-line')];
    const lineIO = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        lines.forEach((line, i) => {
          line.style.transitionDelay = (i * 0.14) + 's';
          line.classList.add('in');
        });
        lineIO.disconnect();
      });
    }, { threshold: 0.3 });
    lineIO.observe(aboutScroll);

    aboutScrollScrub = () => {
      const r = aboutScroll.getBoundingClientRect();
      const p = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
      aboutScroll.style.transform = `translateY(${(p - 0.5) * 24}px)`;
    };
  }

  /* ── Services: scroll entrance ───────────── */
  const svcSection = document.getElementById('services');
  if (svcSection) {
    const bits = [...svcSection.querySelectorAll('.svc-init')];
    const playEntrance = () => {
      if (reduceMotionQuery.matches) {
        bits.forEach((el) => el.classList.remove('svc-init'));
        return;
      }
      let left = 0;
      let right = 0;
      bits.forEach((el) => {
        const onRight = svcSection.querySelector('.services-right').contains(el);
        const delay = onRight ? 150 + (right++) * 70 : 30 + (left++) * 45;
        window.setTimeout(() => el.classList.remove('svc-init'), delay);
      });
    };
    if ('IntersectionObserver' in window) {
      const svcIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          playEntrance();
          svcIO.disconnect();
        });
      }, { threshold: 0.18 });
      svcIO.observe(svcSection);
    } else {
      playEntrance();
    }
  }

  /* ── Services: gentle parallax on the card column ── */
  let servicesScrub = null;
  const servicesRight = document.querySelector('.services-right');
  if (servicesRight && !reduceMotionQuery.matches && !pagerOn) {
    servicesScrub = () => {
      const r = servicesRight.getBoundingClientRect();
      if (r.bottom < -140 || r.top > innerHeight + 140) return;
      const p = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
      servicesRight.style.transform = 'translate3d(0,' + ((0.5 - p) * 26).toFixed(2) + 'px,0)';
    };
  }

  /* ── Services: tabbed card ───────────────── */
  const svcRoot = document.getElementById('services');
  const svcTabs = [...document.querySelectorAll('.service-tab')];
  const svcPanels = [...document.querySelectorAll('.service-card')];
  if (svcRoot && svcTabs.length && svcPanels.length === svcTabs.length) {
    let current = 0;
    let picked = false;
    const rail = [...document.querySelectorAll('.service-progress .sp-seg')];

    const select = (next, moveFocus) => {
      const from = current;
      current = (next + svcTabs.length) % svcTabs.length;
      svcTabs.forEach((tab, i) => {
        const on = i === current;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        if (on && moveFocus) tab.focus();
      });
      svcPanels.forEach((panel, i) => panel.classList.toggle('is-active', i === current));
      rail.forEach((seg, i) => seg.classList.toggle('on', i <= current));
      /* replay the arrival: content rises, one light sweep across the card */
      const panel = svcPanels[current];
      if (panel && current !== from) {
        panel.classList.remove('swap');
        void panel.offsetWidth;
        panel.classList.add('swap');
      }
    };

    svcTabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        picked = true;
        select(i);
        /* when the section is pinned, the click should also move the page */
        if (stepped.matches && window.NexusScenes && window.NexusScenes.goToStep) {
          window.NexusScenes.goToStep(svcRoot, i);
        }
      });
      tab.addEventListener('keydown', (e) => {
        const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        const focused = svcTabs.indexOf(document.activeElement);
        const from = focused > -1 ? focused : current;
        let next;
        if (e.key in delta) next = from + delta[e.key];
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = svcTabs.length - 1;
        else return;
        e.preventDefault();
        picked = true;
        select(next, true);
      });
    });

    /* Gentle rotation, desktop pointers only, and only until someone takes
       over. On the stepped layout the wheel already walks the four cards,
       so rotation stays off there and the pager drives the tabs instead. */
    const stepped = window.matchMedia('(pointer: fine) and (min-width: 901px)');
    const canRotate = !pagerOn && !stepped.matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let timer = null;
    let inView = false;
    let hovering = false;

    const stop = () => { if (timer) { window.clearInterval(timer); timer = null; } };
    const start = () => {
      if (!canRotate || picked || !inView || hovering || timer) return;
      timer = window.setInterval(() => select(current + 1), 4200);
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start(); else stop();
      }, { threshold: 0.4 }).observe(svcRoot);
    }
    svcRoot.addEventListener('mouseenter', () => { hovering = true; stop(); });
    svcRoot.addEventListener('mouseleave', () => { hovering = false; start(); });
    svcRoot.addEventListener('focusin', stop);
    svcRoot.addEventListener('focusout', start);

    /* the pager drives the same tabs when it pages through the section */
    svcRoot.__setTab = (i) => { stop(); select(i); };
    svcRoot.__getTab = () => current;

    svcPanels[0].classList.add('swap');
    select(0);
  }

  /* ── Pinned journey spine (scroll-scrubbed process walk) ── */
  let journeyScrub = null;
  const journey = document.getElementById('journey');
  const jPin = document.querySelector('.journey-pin');
  const jCards = [...document.querySelectorAll('.j-card')];
  const stageGlow = document.querySelector('.stage-glow');
  const spineFill = document.getElementById('spineFill');
  const spineHandle = document.getElementById('spineHandle');
  const spineTicks = [...document.querySelectorAll('.spine-tick')];
  const journeyNow = document.getElementById('journeyNow');
  if (journey && jPin && jCards.length === 4 &&
      window.matchMedia('(min-width:881px)').matches) {
    journeyScrub = () => {
      const r = journey.getBoundingClientRect();
      const span = Math.max(1, r.height - innerHeight);
      const p = clamp(-r.top / span, 0, 1);
      /* JS pin: the .page wrapper uses overflow:hidden, which would
         neutralise position:sticky, so the stage is pinned by hand */
      if (p > 0 && p < 1) {
        jPin.style.position = 'fixed';
        jPin.style.top = '0px';
        jPin.style.left = r.left + 'px';
        jPin.style.width = r.width + 'px';
      } else {
        jPin.style.position = '';
        jPin.style.top = '';
        jPin.style.left = '';
        jPin.style.width = '';
      }
      const pos = 20 + p * 60;
      if (spineFill) spineFill.style.height = pos + '%';
      if (spineHandle) spineHandle.style.top = pos + '%';
      const focus = p * (jCards.length - 1);
      let anchorPct = 0;
      jCards.forEach((card, i) => {
        const dist = i - focus;
        const absD = Math.abs(dist);
        const f = Math.max(0, 1 - absD * 0.55);
        const smooth = f * f * (3 - 2 * f);
        card.style.opacity = (0.34 + 0.66 * smooth).toFixed(2);
        card.style.transform =
          `translateY(calc(-50% + ${(dist * 170).toFixed(1)}px)) ` +
          `translateY(${((1 - smooth) * 36).toFixed(1)}px) ` +
          `scale(${(0.9 + smooth * 0.12).toFixed(3)})`;
        card.style.zIndex = String(Math.round(10 + smooth * 30));
        card.classList.toggle('is-active', absD < 0.4);
        card.classList.toggle('is-ghost', absD > 0.55);
        if (absD < 0.4) anchorPct = 20 + i * 20;
      });
      if (stageGlow) stageGlow.style.top = anchorPct + '%';
      spineTicks.forEach((tick, i) => {
        tick.classList.toggle('lit', pos >= 20 + i * 20);
      });
      document.querySelectorAll('.journey-steps li').forEach((li, i) => {
        li.classList.toggle('on', Math.round(focus) === i);
      });
      if (journeyNow) {
        journeyNow.textContent = String(clamp(Math.round(focus) + 1, 1, 4)).padStart(2, '0');
      }
    };
    journeyScrub();
  }

  /* ── Hero controller: floats, and follows the cursor ─────
     The tilt layer carries the whole motion so the wrapper keeps its
     entrance transition, and the glows stay independent of it. */
  const stage = document.getElementById('heroStage');
  const tilt = document.getElementById('controllerTilt');
  let scrollOffset = 0;
  if (stage && tilt) {
    if (reduceMotionQuery.matches) {
      tilt.style.transform = 'translateZ(0)';
    } else {
      let tX = 0, tY = 0, cX = 0, cY = 0;
      let lastMx = 50, lastMy = 38;

      if (finePointer) {
        const onMove = e => {
          const r = stage.getBoundingClientRect();
          if (!r.width || !r.height) return;
          /* -1 at the left edge, +1 at the right edge, so the object
             answers the whole screen evenly, not just its own column */
          tX = clamp((e.clientX / innerWidth - 0.5) * 2, -1, 1);
          tY = clamp((e.clientY / innerHeight - 0.5) * 2, -1, 1);
          /* sheen: pointer position across the object */
          const mx = clamp((e.clientX - r.left) / r.width * 100, -15, 115);
          const my = clamp((e.clientY - r.top) / r.height * 100, -15, 115);
          if (Math.abs(mx - lastMx) > 0.4 || Math.abs(my - lastMy) > 0.4) {
            lastMx = mx; lastMy = my;
            stage.style.setProperty('--mx', mx.toFixed(1) + '%');
            stage.style.setProperty('--my', my.toFixed(1) + '%');
          }
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('mouseleave', () => { tX = 0; tY = 0; });
      }

      let t = 0;
      (function loop() {
        t += 1 / 60;
        /* the opening sequence owns the object until the loader is gone:
           holding it still means the dust copy in the loader lands on the
           real thing pixel for pixel, with no jump at the hand-off */
        if (document.getElementById('loader')) {
          tX = 0; tY = 0; cX = 0; cY = 0; scrollOffset = 0;
          tilt.style.transform = 'translateZ(0)';
          requestAnimationFrame(loop);
          return;
        }
        cX += (tX - cX) * 0.055;
        cY += (tY - cY) * 0.055;
        /* idle float: slow rise and fall, and a whisper of roll */
        const bob = Math.sin(t * 0.52) * 8;
        const sway = Math.sin(t * 0.29) * 1.3;
        tilt.style.transform =
          `perspective(1300px) ` +
          `translate3d(${(cX * 36).toFixed(2)}px, ${(cY * 24 + bob + scrollOffset).toFixed(2)}px, 0) ` +
          `rotateY(${(cX * 13).toFixed(2)}deg) ` +
          `rotateX(${(-cY * 10).toFixed(2)}deg) ` +
          `rotateZ(${sway.toFixed(2)}deg)`;
        /* the light behind it drifts the other way */
        stage.style.setProperty('--px', (-cX * 16).toFixed(1) + 'px');
        stage.style.setProperty('--py', (-cY * 10).toFixed(1) + 'px');
        requestAnimationFrame(loop);
      })();
    }
  }

  /* ── Mockup hover tilt (subtle) ─────── */
  if (finePointer) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      let rxT = 0, ryT = 0, rxC = 0, ryC = 0;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        ryT = ((e.clientX - r.left) / r.width - 0.5) * 6;
        rxT = -((e.clientY - r.top) / r.height - 0.5) * 6;
      });
      card.addEventListener('pointerleave', () => { rxT = 0; ryT = 0; });
      (function tilt() {
        rxC += (rxT - rxC) * 0.12;
        ryC += (ryT - ryC) * 0.12;
        if (Math.abs(rxC) > 0.05 || Math.abs(ryC) > 0.05) {
          card.style.transform =
            `perspective(900px) rotateX(${rxC}deg) rotateY(${ryC}deg)`;
        } else {
          card.style.transform = '';
        }
        requestAnimationFrame(tilt);
      })();
    });
  }

  /* ── Contact form: validation + messages */
  const form = document.getElementById('contactForm');
  if (form) {
    const name = document.getElementById('fName');
    const email = document.getElementById('fEmail');
    const msg = document.getElementById('fMsg');
    const errName = document.getElementById('errName');
    const errEmail = document.getElementById('errEmail');
    const errMsg = document.getElementById('errMsg');
    const success = document.getElementById('formSuccess');
    const formError = document.getElementById('formError');
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const setErr = (input, errEl, bad) => {
      input.classList.toggle('invalid', bad);
      errEl.hidden = !bad;
      input.setAttribute('aria-invalid', String(bad));
    };

    [name, email, msg].forEach(el =>
      el.addEventListener('input', () => {
        setErr(name, errName, false);
        setErr(email, errEmail, false);
        setErr(msg, errMsg, false);
        success.hidden = true;
      })
    );

    const submitBtn = document.getElementById('formSubmit');
    let sending = false;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending) return;

      const badName = name.value.trim().length < 2;
      const badEmail = !emailRe.test(email.value.trim());
      const badMsg = msg.value.trim().length < 10;
      setErr(name, errName, badName);
      setErr(email, errEmail, badEmail);
      setErr(msg, errMsg, badMsg);

      if (badName || badEmail || badMsg) {
        formError.hidden = true;
        success.hidden = true;
        const firstBad = badName ? name : badEmail ? email : msg;
        firstBad.focus();
        firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }

      const payload = Object.fromEntries(new FormData(form).entries());
      const endpoint = (form.dataset.endpoint || '').trim();
      sending = true;
      formError.hidden = true;
      success.hidden = true;
      if (submitBtn) {
        submitBtn.classList.add('is-loading');
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
      }

      const finish = ok => {
        sending = false;
        if (submitBtn) {
          submitBtn.classList.remove('is-loading');
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
        }
        if (!ok) {
          formError.hidden = false;
          formError.focus?.();
          return;
        }
        success.hidden = false;
        success.textContent = 'Message received. I reply within two business days.';
        form.reset();
        form.dispatchEvent(new CustomEvent('nexus:sent', {
          bubbles: true,
          detail: { name: payload.name || '' }
        }));
      };

      if (!endpoint) {
        /* No endpoint configured yet: confirm locally so the form is usable,
           and keep the payload available for a real integration. */
        setTimeout(() => finish(true), 650);
        return;
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        finish(res.ok);
      } catch (err) {
        finish(false);
      }
    });
  }

  /* ── Shared scroll animation (nav anchors + wheel pager) ── */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scrollToken = 0;
  /* duration for a given distance, so the pager can pre-book its busy window */
  const scrollDur = d => Math.min(780, 340 + Math.abs(d) * 0.26);
  const animateScrollTo = (to, onDone) => {
    const from = scrollY;
    const dist = to - from;
    const token = ++scrollToken;
    if (Math.abs(dist) < 2) { if (onDone) onDone(); return; }
    if (reduceMotion) { window.scrollTo(0, to); if (onDone) onDone(); return; }
    const dur = scrollDur(dist);
    const t0 = performance.now();
    const tick = now => {
      if (token !== scrollToken) return;      /* superseded by a newer scroll */
      const p = Math.min(1, (now - t0) / dur);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo(0, Math.round(from + dist * e));
      if (p < 1) requestAnimationFrame(tick);
      else if (onDone) onDone();
    };
    requestAnimationFrame(tick);
  };
  const goTo = el => {
    if (window.NexusScenes && window.NexusScenes.goToEl) { window.NexusScenes.goToEl(el); return; }
    const y = clamp(el.getBoundingClientRect().top + scrollY - 64, 0, maxScroll());
    animateScrollTo(y);
  };
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      goTo(el);
    });
  });
  /* ── Scroll loop ────────────────────── */
  /* ── Header hides on scroll down, returns on scroll up ── */
  const siteHeader = document.getElementById('siteHeader');
  let lastY = 0;

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = maxScroll();
      const p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
      if (scrollBar) {
        scrollBar.style.width = (p * 100) + '%';
      }
      if (aboutScrollScrub) aboutScrollScrub();
      if (journeyScrub) journeyScrub();
      if (servicesScrub) servicesScrub();
      if (hero) {
        const r = hero.getBoundingClientRect();
        scrollOffset = r.top >= 0 ? 0 : clamp(-r.top / r.height, 0, 1) * 52;
      }
      if (siteHeader && !(mobileMenu && mobileMenu.classList.contains('open'))) {
        if (scrollY > lastY && scrollY > 400) {
          siteHeader.classList.add('hidden');
        } else {
          siteHeader.classList.remove('hidden');
        }
      }
      lastY = scrollY;
      ticking = false;
    });
  };
  /* page sections: gentle zoom-in as each enters */
  const pageIO = new IntersectionObserver((es) => {
    es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); pageIO.unobserve(e.target); }
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.page:not(.no-zoom)').forEach(s => pageIO.observe(s));

  /* scroll cue: fade away once the page is scrolled */
  const cue = document.querySelector('.scroll-cue');
  if (cue) {
    const dropCue = () => cue.classList.add('cue-done');
    const cueTimer = setTimeout(dropCue, 7000);
    const cueScroll = () => { if (window.scrollY > 60) { clearTimeout(cueTimer); dropCue(); } };
    window.addEventListener('scroll', cueScroll, { passive: true });
  }

  /* marquee: duplicate the track for a seamless loop */
  const mqTrack = document.querySelector('.marquee-track');
  if (mqTrack) mqTrack.innerHTML += mqTrack.innerHTML;

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* public hook: the search, menu and back-to-top use the same easing */
  window.Nexus = Object.freeze({ goTo, maxScroll, reduceMotion });
})();
