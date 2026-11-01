/* ─────────────────────────────────────────────────────────────
   NEXUS · one piece of music for the whole site

   A single <audio> element, a single player, carried from page to
   page through sessionStorage: the track keeps its position, its
   mute state and its volume as you move around. If the browser
   refuses to start sound on its own, the player becomes one small
   gold button that says what it does.

   The file itself lives at assets/audio/paper-boat.mp3 and is only
   used when it is present and properly licensed. Without it the
   player never appears and the site stays silent.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (window.__nxMusic) return;          /* one system per page */
  window.__nxMusic = true;

  var MANIFEST = 'assets/audio/paper-boat.json';
  var FOLDER = 'assets/audio/';
  var SRC = FOLDER + 'paper-boat.mp3';
  var KEY = 'nexus.music.v1';
  var TITLE = 'Paper Boat';
  var ARTIST = 'Otomusu';

  var store = {
    read: function () {
      try {
        var raw = window.sessionStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    write: function (state) {
      try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    }
  };

  var saved = store.read() || {};
  var state = {
    t: typeof saved.t === 'number' ? saved.t : 0,
    playing: saved.playing !== false,
    muted: saved.muted === true,
    vol: typeof saved.vol === 'number' ? saved.vol : 0.4
  };

  function save() {
    store.write(state);
  }

  /* The track ships with a small record beside it: title, artist, and
     whether the licensed file is actually in the folder. Until it is,
     nothing is fetched and nothing is shown, so the site stays silent
     without a single broken request in the console. */
  function probe(done) {
    if (!window.fetch) { done(null); return; }
    fetch(MANIFEST, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (cfg) { done(cfg); })
      .catch(function () { done(null); });
  }

  probe(function (cfg) {
    if (!cfg || cfg.installed !== true || !cfg.file) {
      if (window.console && console.info) {
        console.info('[nexus music] no licensed track installed yet, the site stays quiet.');
      }
      return;
    }
    if (cfg.title) TITLE = cfg.title;
    if (cfg.artist) ARTIST = cfg.artist;
    SRC = FOLDER + cfg.file;
    mount();
  });

  function mount() {
    if (document.getElementById('nxm')) return;

    var audio = document.createElement('audio');
    audio.id = 'nxmAudio';
    audio.src = SRC;
    audio.loop = true;
    audio.preload = 'auto';
    audio.muted = state.muted;
    audio.volume = state.vol;
    audio.setAttribute('playsinline', '');
    audio.style.display = 'none';

    var root = document.createElement('div');
    root.className = 'nxm';
    root.id = 'nxm';
    root.setAttribute('data-playing', 'false');
    root.setAttribute('data-open', 'false');
    root.setAttribute('data-blocked', 'false');
    root.innerHTML = [
      '<button class="nxm-toggle" id="nxmToggle" type="button" aria-expanded="false" aria-controls="nxmCard" aria-label="Background music, ' + TITLE + ' by ' + ARTIST + '">',
      '  <span class="nxm-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>',
      '</button>',
      '<div class="nxm-card" id="nxmCard" role="group" aria-label="Music player">',
      '  <div class="nxm-head"><span class="nxm-kicker">Background music</span><span class="nxm-state" id="nxmState">Paused</span></div>',
      '  <p class="nxm-title">' + TITLE + '</p>',
      '  <p class="nxm-artist">' + ARTIST + '</p>',
      '  <div class="nxm-track" aria-hidden="true"><span class="nxm-fill" id="nxmFill"></span></div>',
      '  <div class="nxm-controls">',
      '    <button class="nxm-btn nxm-play" id="nxmPlay" type="button" aria-label="Play"></button>',
      '    <button class="nxm-btn nxm-mute" id="nxmMute" type="button" aria-label="Mute"></button>',
      '    <input class="nxm-vol" id="nxmVol" type="range" min="0" max="1" step="0.01" aria-label="Volume">',
      '  </div>',
      '</div>',
      '<p class="sr-only" id="nxmLive" role="status" aria-live="polite"></p>'
    ].join('');

    document.body.appendChild(audio);
    document.body.appendChild(root);

    var toggle = root.querySelector('#nxmToggle');
    var playBtn = root.querySelector('#nxmPlay');
    var muteBtn = root.querySelector('#nxmMute');
    var vol = root.querySelector('#nxmVol');
    var fill = root.querySelector('#nxmFill');
    var stateText = root.querySelector('#nxmState');
    var live = root.querySelector('#nxmLive');

    var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></svg>';
    var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8.5 5.5h2.6v13H8.5zM12.9 5.5h2.6v13h-2.6z" fill="currentColor"/></svg>';
    var ICON_SOUND = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10v4h3.4L13 18.4V5.6L7.4 10H4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M16.6 8.6a5 5 0 0 1 0 6.8M19 6a8.6 8.6 0 0 1 0 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    var ICON_MUTED = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10v4h3.4L13 18.4V5.6L7.4 10H4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m17 9 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    vol.value = String(state.vol);

    function paint() {
      var playing = !audio.paused;
      root.setAttribute('data-playing', playing ? 'true' : 'false');
      playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
      playBtn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
      muteBtn.innerHTML = audio.muted || audio.volume === 0 ? ICON_MUTED : ICON_SOUND;
      muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute music' : 'Mute music');
      stateText.textContent = audio.muted && playing ? 'Muted' : (playing ? 'Playing' : 'Paused');
      toggle.setAttribute('aria-label', 'Background music, ' + TITLE + ' by ' + ARTIST +
        (playing ? ', playing' : ', paused'));
      if (live) {
        live.textContent = playing
          ? (TITLE + ' by ' + ARTIST + ' is playing')
          : (TITLE + ' is paused. Use the player controls to start it.');
      }
    }

    /* the browser said no. That is a state, not a problem to be solved
       in front of the visitor: the player stays exactly where it is,
       paused, and its own play button is the way in. */
    function blocked() {
      root.setAttribute('data-blocked', 'true');
      root.classList.add('is-ready');
      state.playing = true;          /* they still want it: try again next page */
      save();
    }
    function unblock() {
      root.setAttribute('data-blocked', 'false');
    }

    function openCard(open) {
      root.setAttribute('data-open', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    /* ── starting and stopping ─────────────────────────────── */
    function start() {
      var attempt = audio.play();
      if (attempt && typeof attempt.then === 'function') {
        attempt.then(function () {
          unblock();
          state.playing = true;
          save();
          paint();
        }).catch(function () {
          blocked();
          paint();
        });
      } else {
        unblock();
        paint();
      }
    }

    function pauseUser() {
      audio.pause();
      state.playing = false;
      save();
      paint();
    }

    /* ── controls ─────────────────────────────────────────── */
    toggle.addEventListener('click', function () {
      var open = root.getAttribute('data-open') !== 'true';
      openCard(open);
      if (open) playBtn.focus({ preventScroll: true });
    });

    playBtn.addEventListener('click', function () {
      if (audio.paused) start(); else pauseUser();
    });

    muteBtn.addEventListener('click', function () {
      audio.muted = !audio.muted;
      state.muted = audio.muted;
      save();
      paint();
    });

    vol.addEventListener('input', function () {
      var v = Math.max(0, Math.min(1, parseFloat(vol.value) || 0));
      audio.volume = v;
      state.vol = v;
      if (v > 0 && audio.muted) { audio.muted = false; state.muted = false; }
      save();
      paint();
    });

    document.addEventListener('click', function (e) {
      if (root.getAttribute('data-open') !== 'true') return;
      /* the path, not the node: pressing a control repaints it, and a
         detached icon would look like a click somewhere else entirely */
      var path = e.composedPath ? e.composedPath() : [];
      if (path.indexOf(root) > -1 || root.contains(e.target)) return;
      openCard(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.getAttribute('data-open') === 'true') {
        openCard(false);
        toggle.focus({ preventScroll: true });
      }
    });

    audio.addEventListener('timeupdate', function () {
      if (audio.duration) fill.style.width = ((audio.currentTime / audio.duration) * 100).toFixed(2) + '%';
    });
    audio.addEventListener('play', paint);
    audio.addEventListener('pause', paint);
    audio.addEventListener('volumechange', paint);
    audio.addEventListener('error', function () {
      /* the file went away, or was never really there: the player leaves
         rather than sitting on screen doing nothing */
      root.classList.remove('is-ready');
      if (window.console && console.info) {
        console.info('[nexus music] the track did not load, so the site stays quiet.');
      }
    });

    /* ── memory across pages ──────────────────────────────── */
    var tick = 0;
    function remember() {
      /* a page on its way out resets its media element, and that zero is
         not the listener's position: never let it overwrite a real one */
      var now = audio.currentTime || 0;
      if (now > 0 || !(state.t > 0.5)) state.t = now;
      state.muted = audio.muted;
      state.vol = audio.volume;
      save();
    }
    audio.addEventListener('timeupdate', function () {
      var now = Date.now();
      if (now - tick > 800) { tick = now; remember(); }
    });
    window.addEventListener('pagehide', remember);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) remember();
    });

    /* pick the track up where the last page left it */
    var resumed = false;
    function resumeAt() {
      if (resumed) return;
      if (!audio.duration || !isFinite(audio.duration)) return;
      var t = state.t;
      if (t > 0 && t < audio.duration - 1.5) {
        try {
          audio.currentTime = t;
          resumed = audio.currentTime > 0;
        } catch (e) { return; }      /* metadata not ready yet: try again */
      } else {
        resumed = true;
      }
      paint();
    }
    /* the metadata event is not always the moment a seek is possible, so
       the same request is repeated as the file gets ready */
    audio.addEventListener('loadedmetadata', resumeAt);
    audio.addEventListener('loadeddata', resumeAt);
    audio.addEventListener('canplay', resumeAt);
    if (audio.readyState >= 1) resumeAt();

    root.classList.add('is-ready');

    /* straight away, with no invitation and nothing to click: if the
       browser allows sound it starts here, and if it does not the
       player simply sits there, ready, on its own play button. */
    if (state.playing) {
      start();
    } else {
      paint();
    }
  }
})();
