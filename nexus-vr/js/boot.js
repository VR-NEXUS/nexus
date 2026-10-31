/* ══════════════════════════════════════════════════════════════
   BOOT, the small script every page runs before it paints.
   It lives in its own file so no page needs an inline script, which
   lets the site run under a strict Content Security Policy.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* The gate is pure CSS: this only makes sure it is on screen even if a
     later script never runs. site.js does the same thing on its first frame. */
  window.setTimeout(function () {
    var g = document.getElementById('loader');
    if (g && !g.classList.contains('is-in')) g.classList.add('is-in');
  }, 700);

  /* Arriving from the intro page: that page has already played the film, so
     the landing is not drawn at all here. site.js clears the flag from the
     address once the page is up. */
  if (/[?&]entered=1(&|$)/.test(window.location.search)) {
    document.documentElement.classList.add('entered');
  }
})();
