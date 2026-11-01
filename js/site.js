/* ═════════════════════════════════════
   NEXUS. Interface layer.
   Loader, search, cookie notice, copy,
   floating actions, UTM capture, dialog.
   Every block is isolated: one failure
   cannot take the rest of the page down.
   ═════════════════════════════════════ */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const safe = (label, fn) => {
    try { fn(); } catch (err) { console.warn('[nexus] ' + label, err); }
  };

  /* ── Storage that never throws (private mode, sandboxed frames) ── */
  const store = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) { /* memory only */ }
    }
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isIndex = !!document.getElementById('hero');

  /* ══ 1. The landing door + floating contact bar ══════
     The page opens on the brand film, which comes to rest on the portrait.
     The door under it is the only way in: Enter, Escape, or the button. */
  safe('gate', () => {
    const gate = document.getElementById('loader');
    const barEl = document.getElementById('contactBar');
    const revealBar = () => {
      if (barEl) window.setTimeout(() => barEl.classList.add('is-in'), 220);
    };
    if (!gate) { revealBar(); return; }

    /* The intro page has already played this film. It sends visitors here with
       ?entered=1, so the studio opens at once and the landing never runs twice
       in one visit. A plain load still opens on the landing, as it should. */
    if (/[?&]entered=1(&|$)/.test(window.location.search)) {
      gate.remove();
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('entered');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch (e) { /* the flag may stay in the address bar; nothing breaks */ }
      revealBar();
      return;
    }

    const enter = document.getElementById('gateEnter');
    const liveEl = document.getElementById('gateLive');
    const backdrop = [...document.body.children].filter(
      (el) => el !== gate && !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName)
    );

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      document.body.style.overflow = '';
      backdrop.forEach((el) => { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); });
      /* one last beat: the picture lifts a hair and dissolves into the page */
      gate.classList.add('is-leaving');
      gate.classList.add('done');
      window.setTimeout(() => gate.remove(), 780);
      revealBar();
      document.dispatchEvent(new CustomEvent('nexus:release'));
      const h1 = document.querySelector('.hero h1');
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
    };

    /* Hold the page still while the landing is up */
    document.body.style.overflow = 'hidden';
    backdrop.forEach((el) => { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); });
    window.requestAnimationFrame(() => gate.classList.add('is-in'));

    if (enter) {
      enter.addEventListener('click', release);
      /* a visitor who tabs into the door can press it with the keyboard too */
      enter.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); release(); }
      });
    }

    const open = () => {
      if (enter) enter.disabled = false;
      gate.classList.add('is-ready');
      if (liveEl) liveEl.textContent = 'Ready. Press Enter, or take Portfolio, to come in.';
    };

    /* the door is live once the film has landed on the portrait */
    document.addEventListener('nexus:landed', open);
    if (window.NexusIntro && window.NexusIntro.landed) open();
    /* and it is never a locked door, whatever happens to the film */
    window.setTimeout(open, 16000);

    window.addEventListener('keydown', (e) => {
      if (released) return;
      if (e.key === 'Escape') { e.preventDefault(); release(); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const t = e.target;
      if (t && t !== gate && /^(A|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (t && t.isContentEditable) return;
      e.preventDefault();
      release();
    });

    /* focus moves into the landing, so the keyboard is not sent to the page
       behind it and Return/Space already mean "come in" */
    window.setTimeout(() => { if (!released) gate.focus({ preventScroll: true }); }, 400);
  });

  /* ══ 2. Sticky header shadow ═══════════════════════════ */
  safe('header', () => {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    let ticking = false;
    const update = () => {
      header.classList.toggle('scrolled', window.scrollY > 24);
      ticking = false;
    };
    update();
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  });

  /* ══ 3. Footer year ════════════════════════════════════ */
  safe('dates', () => {
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

  });

  /* ══ 4. Back to top ═══════════════════════════════════ */
  safe('toTop', () => {
    const btn = document.getElementById('toTop');
    if (!btn) return;
    const update = () => btn.classList.toggle('show', window.scrollY > 700);
    update();
    window.addEventListener('scroll', update, { passive: true });
    btn.addEventListener('click', () => {
      if (window.Nexus) window.Nexus.goTo(document.body);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ══ 5. Copy to clipboard ═════════════════════════════ */
  safe('copy', () => {
    const fallback = text => {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      area.remove();
      return ok;
    };

    $$('.copy-btn').forEach(btn => {
      const label = $('span', btn);
      const reset = () => setTimeout(() => {
        btn.classList.remove('done');
        if (label) label.textContent = 'Copy';
      }, 1800);

      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy || '';
        let ok = false;
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch (err) {
          ok = fallback(text);
        }
        btn.classList.toggle('done', ok);
        if (label) label.textContent = ok ? 'Copied' : 'Press Ctrl C';
        reset();
      });
    });
  });

  /* ══ 6. Cookie notice ═════════════════════════════════ */
  safe('cookie', () => {
    const banner = document.getElementById('cookieBanner');
    if (!banner) return;
    const KEY = 'nexus.consent';
    if (store.get(KEY)) return;

    const close = choice => {
      store.set(KEY, choice);
      banner.classList.remove('show');
      window.setTimeout(() => { banner.hidden = true; }, 600);
    };

    window.setTimeout(() => {
      banner.hidden = false;
      requestAnimationFrame(() => banner.classList.add('show'));
    }, 1400);

    const accept = document.getElementById('cookieAccept');
    const decline = document.getElementById('cookieDecline');
    if (accept) accept.addEventListener('click', () => close('accepted'));
    if (decline) decline.addEventListener('click', () => close('declined'));
  });

  /* ══ 7. Search ════════════════════════════════════════ */
  safe('search', () => {
    const panel = document.getElementById('searchPanel');
    const input = document.getElementById('searchInput');
    const list = document.getElementById('searchResults');
    const hint = document.getElementById('searchHint');
    const openBtn = document.getElementById('searchBtn');
    const closeBtn = document.getElementById('searchClose');
    if (!panel || !input || !list) return;

    const link = (id) => isIndex ? '#' + id : 'index.html#' + id;

    const INDEX = [
      { title: 'Nexus, identity and 3D web studio', section: 'Home', href: link('hero'), text: 'vaibhav pratap brand identity logo systems 3d web experiences studio portfolio' },
      { title: 'The Studio', section: '02 / Studio', href: link('studio'), text: 'about nexus, the studio of vaibhav pratap, one owner from brief to launch' },
      { title: 'Brand Identity', section: 'Service', href: link('studio'), text: 'visual systems, logo design, brand guidelines, credibility' },
      { title: 'Logo Design', section: 'Service', href: link('studio'), text: 'wordmarks, marks, icon systems, lockups, favicon, billboard' },
      { title: '3D and Motion', section: 'Service', href: link('studio'), text: 'product renders, three.js scenes, motion, lit like a studio' },
      { title: 'Web Design', section: 'Service', href: link('studio'), text: 'identity sites, showcases, html css javascript, fast on any connection' },
      { title: 'Process: Discovery', section: 'Studio', href: link('studio'), text: 'brief, audience, research, strategy, audit, first call' },
      { title: 'Process: Concept', section: 'Studio', href: link('studio'), text: 'three directions, sketching, typography, colour, in context' },
      { title: 'Process: Build', section: 'Studio', href: link('studio'), text: 'vector, grid, specs, system, usage rules, documented' },
      { title: 'Process: Deliver', section: 'Studio', href: link('studio'), text: 'svg png pdf, mockups, handover, files, formats' },
      { title: 'NEXUS VR case study', section: '03 / Case Study', href: link('project'), text: 'headset controllers companion app identity system branding 2026' },
      { title: 'Logo concepts', section: 'Case Study', href: link('project'), text: 'pulse wave, void ripple, orbit gate, directions, marks' },
      { title: 'Logo assets', section: 'Case Study', href: link('project'), text: 'primary logo, secondary logo, logo mark, sub mark, files' },
      { title: 'Typography', section: '04 / Guidelines', href: link('guidelines'), text: 'type scale, bricolage grotesque, manrope, headlines, captions, letterspacing' },
      { title: 'Colour palette', section: '04 / Guidelines', href: link('guidelines'), text: 'warm charcoal, champagne, antique bronze, ivory, hex, usage rule' },
      { title: 'Deliverable mockups', section: '04 / Guidelines', href: link('guidelines'), text: 'headset, controllers, companion app, stationery, business card' },
      { title: 'What does a project cost?', section: '05 / Questions', keywords: 'faq questions answers', href: link('faq'), text: 'price, budget, quote, fixed per project, hourly, discovery call' },
      { title: 'How long does a project take?', section: '05 / Questions', keywords: 'faq questions answers', href: link('faq'), text: 'timeline, weeks, deadline, schedule, proposal' },
      { title: 'What do I receive at the end?', section: '05 / Questions', keywords: 'faq questions answers', href: link('faq'), text: 'deliverables, svg png pdf, source files, specs, mockups, handover' },
      { title: 'How many revisions are included?', section: '05 / Questions', keywords: 'faq questions answers', href: link('faq'), text: 'rounds, feedback, refinement, scope, changes' },
      { title: 'Do you build the website as well?', section: '05 / Questions', keywords: 'faq questions answers', href: link('faq'), text: 'html css javascript, no page builders, devices, performance, source code' },
      { title: 'Can you work with my existing brand?', section: '05 / Questions', keywords: 'faq questions answers', href: link('faq'), text: 'existing identity, refresh, extension, audit, marks' },
      { title: 'Contact and send a message', section: '06 / Contact', href: link('contact'), text: 'email, phone, whatsapp, vaibhav pratap, brief, message, reply, business days' },
      { title: 'Privacy Policy', section: 'Page', href: 'privacy.html', text: 'data, cookies, consent, storage, your rights, contact details' },
      { title: 'Cookie note', section: 'Privacy', href: 'privacy.html#cookies', text: 'cookies, preference, no advertising, no analytics, consent' },
      { title: 'Terms and Conditions', section: 'Page', href: 'terms.html', text: 'terms of use, intellectual property, liability, governing law' }
    ];

    let results = [];
    let active = -1;

    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const mark = (text, q) => {
      if (!q) return esc(text);
      const i = text.toLowerCase().indexOf(q);
      if (i < 0) return esc(text);
      return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' +
             esc(text.slice(i + q.length));
    };

    const render = q => {
      q = q.trim().toLowerCase();
      if (!q) {
        results = INDEX.slice(0, 5);
        hint.textContent = 'Suggested, or type to search 4 pages';
      } else {
        results = INDEX
          .map(item => {
            const t = (item.title + ' ' + (item.keywords || '')).toLowerCase();
            const s = item.text.toLowerCase();
            let score = 0;
            if (t.startsWith(q)) score += 40;
            if (t.includes(q)) score += 24;
            if (s.includes(q)) score += 10;
            if (item.section.toLowerCase().includes(q)) score += 6;
            return { item, score };
          })
          .filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map(r => r.item);
        hint.textContent = results.length
          ? results.length + (results.length === 1 ? ' match' : ' matches')
          : 'No match';
      }

      active = results.length ? 0 : -1;

      if (!results.length) {
        list.innerHTML = '<li><p class="search-empty">Nothing matches <strong>' + esc(q) +
          '</strong>. Try a shorter word, or <a href="' + link('contact') + '">write to the studio</a>.</p></li>';
        return;
      }

      list.innerHTML = results.map((r, i) =>
        '<li role="presentation">' +
          '<a href="' + r.href + '" role="option" id="sr-' + i + '" aria-selected="' + (i === 0) + '">' +
            '<span class="sr-title">' + mark(r.title, q) + '</span>' +
            '<span class="sr-meta">' + esc(r.section) + '</span>' +
          '</a>' +
        '</li>'
      ).join('');

      list.querySelectorAll('a').forEach((a, i) => {
        a.addEventListener('click', e => {
          close();
          const href = a.getAttribute('href');
          if (href.charAt(0) === '#' && window.Nexus) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
              window.Nexus.goTo(target);
              target.classList.add('flash');
              setTimeout(() => target.classList.remove('flash'), 2000);
            }
          }
        });
        a.addEventListener('mouseenter', () => setActive(i));
      });
      input.setAttribute('aria-activedescendant', 'sr-0');
    };

    const setActive = i => {
      const links = $$('a', list);
      if (!links.length) return;
      active = (i + links.length) % links.length;
      links.forEach((a, n) => a.setAttribute('aria-selected', String(n === active)));
      input.setAttribute('aria-activedescendant', 'sr-' + active);
      links[active].scrollIntoView({ block: 'nearest' });
    };

    const open = () => {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      input.value = '';
      render('');
      /* the panel fades in with a visibility transition: focus once it can take it */
      let tries = 0;
      const grab = () => {
        input.focus({ preventScroll: true });
        if (document.activeElement !== input && ++tries < 12) window.setTimeout(grab, 50);
      };
      window.setTimeout(grab, 40);
    };

    const close = () => {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      if (openBtn) {
        openBtn.setAttribute('aria-expanded', 'false');
        openBtn.focus({ preventScroll: true });
      }
      document.body.style.overflow = '';
    };

    if (openBtn) openBtn.addEventListener('click', open);
    const nfBtn = document.getElementById('notfoundSearch');
    if (nfBtn) nfBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);

    input.addEventListener('input', () => render(input.value));

    panel.addEventListener('mousedown', e => {
      if (e.target === panel) close();
    });

    /* the page uses a custom wheel engine: keep it out of the panel */
    panel.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.classList.contains('open')) { close(); }
    }, true);

    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); return; }
      if (e.key === 'Enter') {
        const links = $$('a', list);
        if (links[active]) { e.preventDefault(); links[active].click(); }
      }
    });

    /* keep Tab inside the overlay while it is open */
    panel.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const f = $$('input, button, a[href]', panel).filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        panel.classList.contains('open') ? close() : open();
        return;
      }
      if (e.key === '/' && !typing && !panel.classList.contains('open')) {
        e.preventDefault();
        open();
      }
    });
  });

  /* ══ 8. Mobile menu: outside click, resize, focus ═════ */
  safe('menu', () => {
    const menu = document.getElementById('mobileMenu');
    const btn = document.getElementById('menuBtn');
    if (!menu || !btn) return;

    menu.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 960 && menu.classList.contains('open')) {
        btn.click();
      }
    });

    /* keep keyboard focus inside the open menu */
    menu.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !menu.classList.contains('open')) return;
      const focusables = $$('a, button', menu).filter(el => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  });

  /* ══ 9. UTM + referrer capture ════════════════════════ */
  safe('utm', () => {
    const params = new URLSearchParams(window.location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
      const field = document.getElementById(key);
      if (!field) return;
      const value = params.get(key);
      if (value) field.value = value.slice(0, 120);
    });
    const page = document.getElementById('landing_page');
    if (page) page.value = window.location.pathname + window.location.search;
    const ref = document.getElementById('form_referrer');
    if (ref) ref.value = (document.referrer || '').slice(0, 300);
  });

  /* ══ 10. Confirmation dialog after a successful send ══ */
  safe('dialog', () => {
    const dialog = document.getElementById('successDialog');
    const body = document.getElementById('confirmBody');
    const closeBtn = document.getElementById('confirmClose');
    if (!dialog) return;

    document.addEventListener('nexus:sent', e => {
      const name = (e.detail && e.detail.name ? e.detail.name : '').trim().split(/\s+/)[0];
      if (body && name) {
        body.textContent = 'Thank you, ' + name +
          '. Your message is in, and I reply within two business days, usually sooner.';
      }
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', () => {
      if (typeof dialog.close === 'function') dialog.close();
    });

    /* "Back to the form" is a link inside a modal dialog: the browser would
       follow it while the dialog stayed open and the page stayed held still,
       so the click went nowhere. It now closes the sheet first, then carries
       the page to the form and puts the cursor in the first field. */
    dialog.querySelectorAll('a[href="#contact"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
        document.body.style.overflow = '';
        const form = document.getElementById('contactForm');
        const target = form || document.getElementById('contact');
        if (window.NexusScenes && typeof window.NexusScenes.goToEl === 'function' && target) {
          window.NexusScenes.goToEl(target);
        } else if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.setTimeout(() => {
          const first = document.getElementById('fName');
          const field = first || (form && form.querySelector('input, textarea'));
          if (field) field.focus({ preventScroll: true });
        }, 700);
      });
    });

    dialog.addEventListener('click', e => {
      if (e.target === dialog && typeof dialog.close === 'function') dialog.close();
    });
  });

  /* ══ 10b. The four process steps open as panels ═══════
     Each card is a door: it opens its own panel with three frames of the work.
     One panel is open at a time, and the page behind is held still while it is. */
  safe('steps', () => {
    const cards = [...document.querySelectorAll('.flow-step')];
    const panels = [...document.querySelectorAll('.step-panel')];
    if (!cards.length || !panels.length) return;

    const openStep = (i) => {
      const panel = panels[i];
      if (!panel) return;
      panels.forEach((p) => { if (p.open) p.close(); });
      if (typeof panel.showModal === 'function') panel.showModal();
      else panel.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
      const head = panel.querySelector('h2');
      if (head) {
        head.setAttribute('tabindex', '-1');
        head.focus({ preventScroll: true });
      }
      const scroller = panel.querySelector('.step-panel-inner');
      if (scroller) scroller.scrollTop = 0;
    };

    const closeStep = (panel) => {
      if (typeof panel.close === 'function') panel.close();
      else panel.removeAttribute('open');
      document.body.style.overflow = '';
    };

    cards.forEach((card, i) => {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-haspopup', 'dialog');
      if (panels[i]) card.setAttribute('aria-controls', panels[i].id);
      card.addEventListener('click', () => openStep(i));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStep(i); }
      });
    });

    panels.forEach((panel) => {
      panel.querySelectorAll('[data-close]').forEach((btn) => {
        btn.addEventListener('click', () => closeStep(panel));
      });
      /* the next step, without going back to the page */
      panel.querySelectorAll('[data-step-next]').forEach((btn) => {
        btn.addEventListener('click', () => openStep(Number(btn.dataset.stepNext)));
      });
      /* a click on the dimmed page behind the panel closes it */
      panel.addEventListener('click', (e) => { if (e.target === panel) closeStep(panel); });
      panel.addEventListener('close', () => { document.body.style.overflow = ''; });
      panel.addEventListener('cancel', () => { document.body.style.overflow = ''; });
    });
  });

  /* ══ 11. Type specimens: animate only while on screen ═
     The letters morph along the variable font axes. Running that off
     screen would repaint for nothing, so a single observer gates it. */
  safe('specimens', () => {
    const wrap = document.querySelector('.type-row-wrap');
    if (!wrap) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => wrap.classList.toggle('is-live', e.isIntersecting));
    }, { threshold: 0.05 });
    io.observe(wrap);
  });

  /* ══ 11c. FAQ: one answer at a time, kept in view ═════ */
  safe('faq', () => {
    const items = $$('.faq-item');
    if (!items.length) return;
    items.forEach(item => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach(other => { if (other !== item) other.open = false; });
        /* the scene keeps the room under the list reserved, so the answer
           already sits clear of the pill: nothing to scroll, nothing jumps */
      });
    });
  });

  /* ══ 12. Print: open every answer first ═══════════════ */
  safe('print', () => {
    const items = $$('.faq-item');
    if (!items.length) return;
    let reopened = [];
    window.addEventListener('beforeprint', () => {
      reopened = items.filter(i => !i.open).map(i => { i.open = true; return i; });
    });
    window.addEventListener('afterprint', () => {
      reopened.forEach(i => { i.open = false; });
      reopened = [];
    });
  });

  /* ══ 12b. 404: name the address that failed ════════════ */
  safe('notfound', () => {
    const row = document.getElementById('nfPathRow');
    const code = document.getElementById('nfPath');
    if (!row || !code) return;
    let path = window.location.pathname + window.location.search;
    try { path = decodeURI(path); } catch (e) { /* keep the raw string */ }
    if (!path || path === '/' || /\/404\.html$/.test(path)) return;
    code.textContent = path.length > 64 ? path.slice(0, 30) + '...' + path.slice(-30) : path;
    row.hidden = false;
  });

  /* ══ 13. Land on the hash accurately after fonts settle ═ */
  safe('hash', () => {
    if (!window.location.hash || !window.Nexus) return;
    window.setTimeout(() => {
      const target = document.querySelector(window.location.hash);
      if (!target) return;
      if (Math.abs(target.getBoundingClientRect().top) > 120) {
        window.Nexus.goTo(target);
      }
    }, 320);
  });

})();
