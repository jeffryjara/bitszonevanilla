/* ==========================================================================
   BITSZONE — Motor del Reproductor, Vistas, Cola, Modales y WavyProgress
   JavaScript Vanilla + Bootstrap 5 Modals/Offcanvas/Toasts
   ========================================================================== */
(function (window) {
  'use strict';

  var Storage = window.BitszoneStorage;
  var Auth = window.BitszoneAuth;
  var CatalogApi = window.BitszoneCatalog;

  function _t(key, fallback, params) {
    if (window.BitszoneI18n && typeof window.BitszoneI18n.t === 'function') {
      return window.BitszoneI18n.t(key, fallback, params);
    }
    var res = fallback !== undefined ? fallback : key;
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (p) {
        res = res.replace(new RegExp('\\{' + p + '\\}', 'g'), params[p]);
      });
    }
    return res;
  }

  var appState = {
    view: 'catalog', // 'catalog' | 'album' | 'artist' | 'library-favorites' | 'library-playlists' | 'library-playlist-detail' | 'library-licenses' | 'downloads' | 'dashboard'
    catalogExpandedSection: null, // null | 'songs' | 'artists' | 'albums'
    songsSort: 'default',
    artistsSort: 'default',
    albumsSort: 'default',
    albums: [],
    artists: [],
    tracksCount: 0,
    catalogSource: 'supabase',
    latencyMs: 0,
    loading: true,
    selectedAlbum: null,
    selectedArtist: null,
    selectedPlaylistId: null,
    prevViewBeforeDetail: 'catalog',

    // Estado de Biblioteca & Mis Descargas (Toolbar)
    libViewMode: 'canciones',
    libSortBy: 'default',
    libSearch: '',
    libSelectedAlbumId: null,
    dlViewMode: 'canciones',
    dlSortBy: 'default',
    dlSearch: '',
    dlSelectedAlbumId: null,

    // Reproductor Gigante y Letras
    expTab: 'pistas', // 'pistas' | 'letra' | 'cola'
    expQueueSearch: '',
    isSideLyricsOpen: false,

    // Audio playback
    queue: [],
    queueIndex: -1,
    nowPlayingTrack: null,
    nowPlayingAlbum: null,
    isPlaying: false,
    isAudioLoading: false,
    progress: 0,
    durationSecs: 0,
    currentSecs: 0,
    volume: 100,
    muted: false,
    shuffle: false,
    repeatMode: 'off', // 'off' | 'all' | 'one'

    // Pending playlist targets
    pendingPlaylistTrack: null,
    pendingCreatePlaylistTracks: null
  };

  var audioEl = null;
  var isScrubbing = false;
  var volBubbleTimer = null;

  // ---- Sistema de Publicidad Intersticial (8s para usuarios sin sesión) ----
  function getAdSponsors() {
    var isEn = window.BitszoneI18n && window.BitszoneI18n.getLanguage() === 'en';
    if (isEn) {
      return [
        {
          badge: 'Bitszone Premium',
          title: 'Limitless Music',
          desc: 'Listen to full-length tracks with no 30-second limits, zero interruptions, and studio-grade fidelity.',
          image: './assets/img/bitszone-icon.png'
        },
        {
          badge: 'Lossless Hi-Fi Audio',
          title: 'Studio Fidelity 320 kbps',
          desc: 'Discover every acoustic nuance with ultra-high sound resolution when you sign in for free.',
          image: './assets/img/albums/hybrid-theory.jpg'
        },
        {
          badge: 'Bitszone Cloud',
          title: 'Your Synced Playlists',
          desc: 'Create unlimited playlists, keep your favorites safe, and continue listening on all devices.',
          image: './assets/img/acceder-image.png'
        },
        {
          badge: 'Offline Mode',
          title: 'Your Music Anywhere',
          desc: 'Enjoy uninterrupted music without wasting mobile data with a free account.',
          image: './assets/img/bitszone-icon.png'
        }
      ];
    }
    return [
      {
        badge: 'Bitszone Premium',
        title: 'Música sin límites',
        desc: 'Escucha canciones completas sin límites de 30 segundos, sin pausas y con la máxima fidelidad.',
        image: './assets/img/bitszone-icon.png'
      },
      {
        badge: 'Audio Lossless Hi-Fi',
        title: 'Fidelidad de estudio 320 kbps',
        desc: 'Descubre cada detalle y matiz acústico con la mejor resolución sonora al iniciar tu sesión gratis.',
        image: './assets/img/albums/hybrid-theory.jpg'
      },
      {
        badge: 'Bitszone Cloud',
        title: 'Tus listas sincronizadas',
        desc: 'Crea playlists ilimitadas, guarda tus favoritos y continúa escuchando en todos tus dispositivos.',
        image: './assets/img/acceder-image.png'
      },
      {
        badge: 'Modo Offline',
        title: 'Tu música a donde vayas',
        desc: 'Accede sin interrupciones ni consumo innecesario de tus datos móviles con una cuenta gratuita.',
        image: './assets/img/bitszone-icon.png'
      }
    ];
  }

  var adState = {
    intervalId: null,
    secondsLeft: 15,
    onComplete: null,
    currentSponsorIdx: 0,
    isActive: false
  };

  function isUserAdmin() {
    try {
      if (typeof Auth !== 'undefined' && Auth && typeof Auth.isAdmin === 'function') {
        return Auth.isAdmin();
      }
      if (typeof window !== 'undefined' && window.BitszoneAuth && typeof window.BitszoneAuth.isAdmin === 'function') {
        return window.BitszoneAuth.isAdmin();
      }
      var s = localStorage.getItem('bz_vanilla_session_v1');
      if (s) {
        var parsed = JSON.parse(s);
        return parsed && (parsed.role === 'admin' || parsed.role === 'superadmin');
      }
    } catch (e) {}
    return false;
  }

  function isUserAuthenticated() {
    try {
      if (isUserAdmin()) return true;
      if (typeof Auth !== 'undefined' && Auth && typeof Auth.getSession === 'function') {
        return !!Auth.getSession();
      }
      if (typeof window !== 'undefined' && window.BitszoneAuth && typeof window.BitszoneAuth.getSession === 'function') {
        return !!window.BitszoneAuth.getSession();
      }
      return !!localStorage.getItem('bz_vanilla_session_v1');
    } catch (e) {
      return false;
    }
  }

  // Bloqueo total de scroll del mouse y gestos táctiles mientras el anuncio está activo
  function blockAdScroll(e) {
    if (!adState.isActive) return;
    var modal = document.getElementById('adInterstitialModal');
    // Auto-recuperación: si el modal no existe o no tiene clase 'show' o 'is-active', desbloquear estado
    if (!modal || (!modal.classList.contains('show') && !modal.classList.contains('is-active'))) {
      adState.isActive = false;
      document.documentElement.classList.remove('bz-ad-locked');
      document.body.classList.remove('bz-ad-locked');
      return;
    }
    // Permitir interacción solo dentro del modal si es clickeable
    if (!modal || !modal.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  // Bloqueo estricto de atajos de teclado y teclas que muevan el scroll (Space, Flechas, etc.)
  function blockAdKeys(e) {
    if (!adState.isActive) return;
    var modal = document.getElementById('adInterstitialModal');
    if (!modal || (!modal.classList.contains('show') && !modal.classList.contains('is-active'))) {
      adState.isActive = false;
      document.documentElement.classList.remove('bz-ad-locked');
      document.body.classList.remove('bz-ad-locked');
      return;
    }
    var blocked = [
      'Escape', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'PageUp', 'PageDown', 'Home', 'End', 'Tab', 'KeyF', 'KeyM', 'KeyA', 'KeyR', 'KeyS'
    ];
    if (blocked.indexOf(e.code) !== -1 || e.key === 'Tab' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  window.addEventListener('wheel', blockAdScroll, { passive: false });
  window.addEventListener('touchmove', blockAdScroll, { passive: false });
  window.addEventListener('keydown', blockAdKeys, { capture: true });

  function triggerAdFlow(onComplete) {
    if (isUserAdmin()) {
      if (typeof onComplete === 'function') {
        onComplete();
      }
      return;
    }
    if (adState.isActive) return;
    adState.isActive = true;
    adState.onComplete = onComplete;
    adState.secondsLeft = 8;

    // Bloquear scroll e interacción exterior
    document.documentElement.classList.add('bz-ad-locked');
    document.body.classList.add('bz-ad-locked');

    if (audioEl) {
      audioEl.pause();
      appState.isPlaying = false;
      updatePlayerBarsUI();
    }

    var sponsorsList = getAdSponsors();
    var sponsor = sponsorsList[adState.currentSponsorIdx % sponsorsList.length];
    adState.currentSponsorIdx += 1;

    var modalEl = document.getElementById('adInterstitialModal');
    if (!modalEl) {
      finishAdFlow();
      return;
    }

    var isAuth = isUserAuthenticated();
    var loginBtn = modalEl.querySelector('a[href="./login.html"]');
    if (loginBtn) {
      if (isAuth) {
        loginBtn.classList.add('d-none');
      } else {
        loginBtn.classList.remove('d-none');
      }
    }

    var badgeEl = document.getElementById('adSponsorBadge');
    var titleEl = document.getElementById('adSponsorTitle');
    var descEl = document.getElementById('adSponsorDesc');
    var imgEl = document.getElementById('adSponsorImage');
    var secLeftEl = document.getElementById('adSecondsLeft');
    var barEl = document.getElementById('adProgressBar');
    var skipBtn = document.getElementById('btnSkipAd');

    if (badgeEl) badgeEl.innerHTML = '<i class="bi bi-stars me-1 text-white-50"></i> ' + esc(sponsor.badge);
    if (titleEl) titleEl.textContent = sponsor.title;
    if (descEl) {
      descEl.textContent = isAuth
        ? _t('ad.authDesc', 'Espacio publicitario patrocinado. La música continuará automáticamente en unos segundos.')
        : sponsor.desc;
    }
    if (imgEl) {
      imgEl.onerror = function () {
        this.onerror = null;
        this.src = './assets/img/bitszone-icon.png';
      };
      imgEl.src = sponsor.image || './assets/img/bitszone-icon.png';
    }
    var AD_DURATION_MS = 8000;
    adState.startTime = Date.now();
    adState.totalDurationMs = AD_DURATION_MS;

    if (secLeftEl) secLeftEl.textContent = '8s';
    if (barEl) {
      barEl.style.transition = 'none';
      barEl.style.width = '100%';
    }

    if (skipBtn) {
      skipBtn.classList.add('d-none');
      skipBtn.onclick = function () {
        finishAdFlow();
      };
    }

    modalEl.classList.add('is-active', 'show');
    modalEl.style.display = 'flex';
    modalEl.setAttribute('aria-hidden', 'false');

    function updateAdCountdown() {
      var elapsed = Date.now() - adState.startTime;
      var remainingMs = Math.max(0, AD_DURATION_MS - elapsed);
      var remainingSecs = Math.ceil(remainingMs / 1000);
      var pct = Math.max(0, Math.min(100, (remainingMs / AD_DURATION_MS) * 100));

      adState.secondsLeft = remainingSecs;

      if (secLeftEl) {
        secLeftEl.textContent = remainingSecs + 's';
      }

      if (barEl) {
        // La barra se achica de 100% a 0% de acuerdo a los segundos restantes
        barEl.style.transition = 'width 0.08s linear';
        barEl.style.width = pct.toFixed(2) + '%';
      }

      // Habilitar omitir cuando queden 4s o menos (a la mitad del anuncio de 8s)
      if (remainingSecs <= 4 && skipBtn && skipBtn.classList.contains('d-none')) {
        skipBtn.classList.remove('d-none');
      }

      if (remainingMs <= 0) {
        finishAdFlow();
      }
    }

    if (adState.intervalId) clearInterval(adState.intervalId);
    updateAdCountdown();
    adState.intervalId = setInterval(updateAdCountdown, 80);
  }

  function finishAdFlow() {
    if (adState.intervalId) {
      clearInterval(adState.intervalId);
      adState.intervalId = null;
    }

    var barEl = document.getElementById('adProgressBar');
    if (barEl) {
      barEl.style.transition = 'none';
      barEl.style.width = '0%';
    }

    adState.isActive = false;

    // Desbloquear scroll e interacción
    document.documentElement.classList.remove('bz-ad-locked');
    document.body.classList.remove('bz-ad-locked');

    var modalEl = document.getElementById('adInterstitialModal');
    if (modalEl) {
      modalEl.classList.remove('is-active', 'show');
      modalEl.style.display = 'none';
      modalEl.setAttribute('aria-hidden', 'true');
      var loginBtn = modalEl.querySelector('a[href="./login.html"]');
      if (loginBtn) loginBtn.classList.remove('d-none');
    }

    // Limpieza de seguridad de backdrops de anuncios
    document.querySelectorAll('.modal-backdrop.bz-ad-backdrop').forEach(function (b) {
      b.remove();
    });

    var cb = adState.onComplete;
    adState.onComplete = null;
    if (typeof cb === 'function') {
      try {
        cb();
      } catch (err) {
        console.error('Error al reanudar tras anuncio:', err);
      }
    }

    // Si expandedPlayerModal sigue abierto, asegurar que el body mantenga modal-open y se refresquen sus vistas
    var expEl = document.getElementById('expandedPlayerModal');
    if (expEl && expEl.classList.contains('show')) {
      document.body.classList.add('modal-open');
      updatePlayerBarsUI();
      renderExpRightPanel();
    }
  }

  // ---- Modal de Invitación a Iniciar Sesión (Acciones Restringidas para Invitados) ----
  function getAuthModalCopy(actionName) {
    var isEn = window.BitszoneI18n && window.BitszoneI18n.getLanguage() === 'en';
    var dict = isEn ? {
      downloads: {
        badge: 'OFFLINE DOWNLOADS',
        icon: 'bi-cloud-arrow-down-fill',
        title: 'Download music in high quality',
        desc: 'Sign in for free to save your favorite songs and albums and listen offline anytime.'
      },
      favorites: {
        badge: 'YOUR FAVORITES',
        icon: 'bi-heart-fill',
        title: 'Save what you love',
        desc: 'Sign in for free to add tracks to your favorites and access them instantly in your library.'
      },
      licenses: {
        badge: 'LICENSED TRACK',
        icon: 'bi-star-fill',
        title: 'Unlock exclusive licenses',
        desc: 'You listened to this song 5 consecutive times! Sign in for free to claim your 30-day license.'
      },
      playlists: {
        badge: 'PLAYLISTS',
        icon: 'bi-music-note-list',
        title: 'Build your custom playlists',
        desc: 'Sign in for free to build customized playlists with your favorite Bitszone tracks.'
      },
      lyrics: {
        badge: 'SYNCHRONIZED LYRICS',
        icon: 'bi-mic-fill',
        title: 'Sing along with real-time lyrics',
        desc: 'Sign in for free to follow line-by-line synchronized lyrics and jump to any verse.'
      },
      queue: {
        badge: 'PLAYBACK QUEUE',
        icon: 'bi-list-ol',
        title: 'Customize your playback queue',
        desc: 'Sign in for free to add songs to your queue, control upcoming tracks, and stream seamlessly.'
      },
      default: {
        badge: 'EXCLUSIVE FEATURE',
        icon: 'bi-person-lock',
        title: 'Sign in to enjoy all of Bitszone',
        desc: 'Create your free account or sign in to enable offline downloads, queue management, custom playlists, favorites, and licenses.'
      }
    } : {
      downloads: {
        badge: 'DESCARGAS SIN CONEXIÓN',
        icon: 'bi-cloud-arrow-down-fill',
        title: 'Descarga música en alta calidad',
        desc: 'Inicia sesión gratis para guardar tus canciones y álbumes favoritos y escucharlos sin conexión en cualquier momento.'
      },
      favorites: {
        badge: 'TUS FAVORITOS',
        icon: 'bi-heart-fill',
        title: 'Guarda lo que más te gusta',
        desc: 'Inicia sesión gratis para agregar canciones a tus favoritos y acceder a ellas instantáneamente desde tu biblioteca.'
      },
      licenses: {
        badge: 'CANCIÓN CON LICENCIA',
        icon: 'bi-star-fill',
        title: 'Desbloquea licencias exclusivas',
        desc: '¡Has escuchado esta canción 5 veces consecutivas! Inicia sesión gratis para reclamar y disfrutar de tu licencia exclusiva por 30 días.'
      },
      playlists: {
        badge: 'LISTAS DE REPRODUCCIÓN',
        icon: 'bi-music-note-list',
        title: 'Crea tus propias playlists',
        desc: 'Inicia sesión gratis para armar listas de reproducción personalizadas con tus canciones favoritas de Bitszone.'
      },
      lyrics: {
        badge: 'LETRAS SINCRONIZADAS',
        icon: 'bi-mic-fill',
        title: 'Canta con las letras en tiempo real',
        desc: 'Inicia sesión gratis para seguir la letra de tus canciones favoritas sincronizada verso a verso y saltar a cualquier estrofa.'
      },
      queue: {
        badge: 'COLA DE REPRODUCCIÓN',
        icon: 'bi-list-ol',
        title: 'Personaliza tu cola de reproducción',
        desc: 'Inicia sesión gratis para agregar canciones a tu cola, decidir qué suena a continuación y armar tus sesiones musicales sin interrupciones.'
      },
      default: {
        badge: 'FUNCIÓN EXCLUSIVA',
        icon: 'bi-person-lock',
        title: 'Inicia sesión para disfrutar de todo Bitszone',
        desc: 'Crea tu cuenta o inicia sesión gratis para habilitar descargas, añadir a la cola, listas de reproducción personalizadas, favoritos y licencias exclusivas.'
      }
    };
    return dict[actionName] || dict.default;
  }

  function openAuthRequiredModal(actionName) {
    if (isUserAdmin()) return;
    var modalEl = document.getElementById('authRequiredModal');
    if (!modalEl || !window.bootstrap || !window.bootstrap.Modal) return;

    var copy = getAuthModalCopy(actionName);
    var badgeEl = document.getElementById('authModalBadge');
    var iconEl = document.getElementById('authModalIcon');
    var titleEl = document.getElementById('authModalTitle');
    var descEl = document.getElementById('authModalDesc');

    if (badgeEl) badgeEl.innerHTML = '<i class="bi bi-stars me-1 text-white-50"></i> ' + esc(copy.badge);
    if (iconEl) iconEl.className = 'bi ' + copy.icon + ' text-white';
    if (titleEl) titleEl.textContent = copy.title;
    if (descEl) descEl.textContent = copy.desc;

    window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function requireAuth(actionKey, callback) {
    if (isUserAdmin() || isUserAuthenticated()) {
      if (typeof callback === 'function') callback();
      return true;
    }
    openAuthRequiredModal(actionKey);
    return false;
  }

  // ---- Utilidades ----
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function formatDurationMs(ms) {
    return formatTime(Math.floor((ms || 0) / 1000));
  }

  function formatTrackSizeMb(track) {
    var mb = Number(track && track.sizeMb) || (((track && track.duration) || 180000) / 1000 * 0.023);
    return mb.toFixed(1) + ' MB';
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return _t('toast.timeToday', 'Hoy');
    var diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
    if (diffSec < 60) return _t('toast.timeJustNow', 'Hace un momento');
    if (diffSec < 3600) return _t('toast.timeMinAgo', 'Hace {n} min', { n: Math.floor(diffSec / 60) });
    if (diffSec < 86400) return _t('toast.timeHourAgo', 'Hace {n} h', { n: Math.floor(diffSec / 3600) });
    return _t('toast.timeDayAgo', 'Hace {n} d', { n: Math.floor(diffSec / 86400) });
  }

  function getLicenseDaysLeftText(addedAt) {
    if (!addedAt) return _t('toast.licDaysLeft', '30 días', { n: 30 });
    var daysPassed = (Date.now() - new Date(addedAt).getTime()) / (1000 * 60 * 60 * 24);
    var rem = Math.floor(30 - daysPassed);
    if (rem < 0) return _t('toast.licExpired', 'Expirada');
    if (rem === 0) return _t('toast.licLastDay', 'Último día');
    if (rem === 1) return _t('toast.licOneDay', '1 día');
    return _t('toast.licDaysLeft', '{n} días', { n: rem });
  }

  var activeToastNodes = [];
  function showToast(msg) {
    var wrap = document.getElementById('bzToastContainer');
    if (!wrap || !msg) return;

    function armToastTimer(target) {
      return setTimeout(function () {
        target.pill.classList.add('is-leaving');
        setTimeout(function () {
          if (target.pill.parentNode) target.pill.remove();
          activeToastNodes = activeToastNodes.filter(function (x) { return x !== target; });
        }, 280);
      }, 4200);
    }

    // Si la misma notificación sigue visible, incrementa su contador ×2, ×3
    for (var i = 0; i < activeToastNodes.length; i++) {
      var item = activeToastNodes[i];
      if (item.message === msg) {
        item.count += 1;
        clearTimeout(item.timer);
        item.pill.classList.remove('is-leaving');
        var badge = item.pill.querySelector('.bz-toast-count');
        if (!badge) {
          badge = document.createElement('b');
          badge.className = 'bz-toast-count small opacity-75 ms-1';
          item.pill.appendChild(badge);
        }
        badge.textContent = '×' + item.count;
        item.timer = armToastTimer(item);
        return;
      }
    }

    if (activeToastNodes.length >= 3) {
      var oldest = activeToastNodes.shift();
      if (oldest) {
        clearTimeout(oldest.timer);
        if (oldest.pill.parentNode) oldest.pill.remove();
      }
    }

    var pill = document.createElement('div');
    pill.className = 'bz-toast-pill';
    pill.innerHTML = '<span>' + esc(msg) + '</span>';
    wrap.appendChild(pill);

    var entry = { message: msg, count: 1, pill: pill, timer: null };
    entry.timer = armToastTimer(entry);
    activeToastNodes.push(entry);
  }

  // ---- Onda Senoidal Animada Reusable a 60 FPS (MiniPlayer & Reproductor Gigante) ----
  function bindWavySeekbar(svgId, playedId, unplayedId, dotId, seekAreaId) {
    var svg = document.getElementById(svgId);
    var playedPath = document.getElementById(playedId);
    var unplayedPath = document.getElementById(unplayedId);
    var dot = document.getElementById(dotId);
    var seekArea = document.getElementById(seekAreaId);
    if (!svg || !playedPath || !unplayedPath || !dot || !seekArea) return;

    var phase = 0;
    var amp = 0;
    var hoverAmp = 0;
    var grabAmp = 0;
    var held = false;
    var hovered = false;
    var last = performance.now();

    function seekFromEvent(e) {
      var rect = seekArea.getBoundingClientRect();
      if (!rect.width) return;
      var p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekToProgress(p);
    }

    seekArea.addEventListener('pointerdown', function (e) {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      held = true;
      isScrubbing = true;
      seekFromEvent(e);
      if (seekArea.setPointerCapture) {
        try { seekArea.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    seekArea.addEventListener('click', function (e) {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    });
    seekArea.addEventListener('pointermove', function (e) {
      if (!isScrubbing || !held) return;
      seekFromEvent(e);
    });
    window.addEventListener('pointerup', function () {
      held = false;
      isScrubbing = false;
    });
    window.addEventListener('pointercancel', function () {
      held = false;
      isScrubbing = false;
    });
    seekArea.addEventListener('mouseenter', function () { hovered = true; });
    seekArea.addEventListener('mouseleave', function () { hovered = false; });

    function draw(now) {
      var dt = Math.min(64, now - last);
      last = now;
      var reduce = document.body.classList.contains('bz-reduce-motion');
      var target = appState.isPlaying && !reduce ? 1 : 0;
      amp += (target - amp) * Math.min(1, dt / 220);
      hoverAmp += ((hovered ? 1 : 0) - hoverAmp) * Math.min(1, dt / 140);
      grabAmp += ((held ? 1 : 0) - grabAmp) * Math.min(1, dt / 110);
      if (!reduce) phase += dt * 0.0036;

      var isGuest = !isUserAuthenticated();
      var effectiveDur = isGuest ? Math.min(30, (audioEl && audioEl.duration) || 30) : (audioEl ? audioEl.duration : 0);
      var liveProgress = (appState.isPlaying && !isScrubbing && audioEl && audioEl.duration && !isNaN(audioEl.duration))
        ? (effectiveDur > 0 ? Math.min(1, audioEl.currentTime / effectiveDur) : 0)
        : (appState.progress || 0);

      var totalWidth = svg.clientWidth || 0;
      if (totalWidth > 0) {
        var width = Math.max(0, Math.min(totalWidth, totalWidth * liveProgress));
        var mid = (svg.clientHeight || 22) / 2;
        var effectiveAmp = (3.2 + 0.8 * hoverAmp) * Math.max(amp, grabAmp * 0.6) * (1 + 0.35 * grabAmp);

        var dPlayed = 'M0 ' + mid;
        if (width > 0) {
          for (var x = 0; x <= width; x += 2) {
            var taper = Math.min(1, x / 24, (width - x) / 24);
            var y = mid + Math.sin((x / 34) * Math.PI * 2 - phase) * effectiveAmp * Math.max(0, taper);
            dPlayed += ' L' + x.toFixed(1) + ' ' + y.toFixed(2);
          }
          dPlayed += ' L' + width.toFixed(1) + ' ' + mid;
        }
        playedPath.setAttribute('d', dPlayed);

        if (width < totalWidth) {
          unplayedPath.setAttribute('d', 'M' + width.toFixed(1) + ' ' + mid + ' L' + totalWidth.toFixed(1) + ' ' + mid);
        } else {
          unplayedPath.setAttribute('d', '');
        }

        dot.setAttribute('cx', width.toFixed(1));
        dot.setAttribute('cy', String(mid));
        dot.setAttribute('r', (5.5 + 3.0 * grabAmp).toFixed(2));
      }

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  function initExpVolumeBars() {
    var wrap = document.getElementById('expVolBarsWrap');
    if (!wrap) return;
    var bubble = document.getElementById('expVolBubble');

    for (var i = 0; i < 20; i++) {
      var level = (20 - i) * 5;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bz-vol-bar-btn';
      btn.setAttribute('data-vol-level', String(level));
      btn.title = 'Volumen ' + level + '%';
      btn.innerHTML = '<div class="bz-vol-bar"></div>';
      wrap.appendChild(btn);
    }

    var draggingVol = false;
    function flashBubble() {
      if (!bubble) return;
      bubble.classList.add('is-visible');
      clearTimeout(volBubbleTimer);
      volBubbleTimer = setTimeout(function () {
        if (!draggingVol) bubble.classList.remove('is-visible');
      }, 1100);
    }

    function applyFromPointer(e) {
      var rect = wrap.getBoundingClientRect();
      if (!rect.height) return;
      var ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setVolume(Math.round(ratio * 100));
      flashBubble();
    }

    wrap.addEventListener('pointerdown', function (e) {
      draggingVol = true;
      applyFromPointer(e);
      if (wrap.setPointerCapture) {
        try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    wrap.addEventListener('pointermove', function (e) {
      if (draggingVol) applyFromPointer(e);
    });
    window.addEventListener('pointerup', function () {
      if (draggingVol) {
        draggingVol = false;
        flashBubble();
      }
    });
    wrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var delta = e.deltaY > 0 ? -5 : 5;
      setVolume((appState.muted ? 0 : appState.volume) + delta);
      flashBubble();
    }, { passive: false });
  }

  // ---- Motor de Audio ----
  function playTrack(track, albumOrQueueList, queueList, forceIdx, bypassAd) {
    if (!track) return;
    lastActiveLyricIndex = -1;
    lastActiveSideLyricIndex = -1;

    var isGuest = !isUserAuthenticated();

    // Si ya estaba reproduciendo otra pista (cambio de canción), mostrar anuncio entre canciones antes de reproducir la nueva (excepto administradores)
    if (!isUserAdmin() && !bypassAd && appState.nowPlayingTrack && Number(appState.nowPlayingTrack.id) !== Number(track.id)) {
      triggerAdFlow(function () {
        playTrack(track, albumOrQueueList, queueList, forceIdx, true);
      });
      return;
    }

    var list = Array.isArray(queueList)
      ? queueList
      : (albumOrQueueList && Array.isArray(albumOrQueueList.tracks) ? albumOrQueueList.tracks : [track]);

    appState.queue = list.slice();
    if (typeof forceIdx === 'number' && forceIdx >= 0 && forceIdx < appState.queue.length) {
      appState.queueIndex = forceIdx;
    } else {
      appState.queueIndex = list.findIndex(function (t) { return Number(t.id) === Number(track.id); });
      if (appState.queueIndex === -1) appState.queueIndex = 0;
    }

    var refAlbum = (albumOrQueueList && albumOrQueueList.title)
      ? albumOrQueueList
      : (findAlbumById(track.albumId) || {
          id: track.albumId || track.id,
          title: track.albumTitle || track.title,
          artist: track.artist,
          coverUrl: track.albumCover || './assets/img/albums/hybrid-theory.jpg',
          tracks: list
        });

    appState.nowPlayingTrack = track;
    appState.nowPlayingAlbum = refAlbum;
    appState.progress = 0;
    appState.currentSecs = 0;
    var rawTrackDur = Math.floor((track.duration || 0) / 1000);
    appState.durationSecs = isGuest ? Math.min(30, rawTrackDur || 30) : rawTrackDur;
    appState.isAudioLoading = true;

    Storage.recordListen(track);
    fetchLyricsLrclib(track.title, track.artist, refAlbum.title, track.duration);

    if (audioEl) {
      audioEl.src = track.previewUrl || '';
      audioEl.volume = appState.muted ? 0 : (appState.volume / 100);
      var p = audioEl.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          appState.isPlaying = false;
          appState.isAudioLoading = false;
          updatePlayerBarsUI();
        });
      }
      appState.isPlaying = true;
    }

    updatePlayerBarsUI();
    renderCurrentView();
  }

  function togglePlay() {
    if (!audioEl || !appState.nowPlayingTrack) return;

    var isGuest = !isUserAuthenticated();
    // Si es invitado y la canción ya culminó los 30s de previsualización, reiniciar desde 0:00 al presionar Play
    if (isGuest && (audioEl.currentTime >= 30 || appState.currentSecs >= 30)) {
      audioEl.currentTime = 0;
      appState.currentSecs = 0;
      appState.progress = 0;
      audioEl.play().catch(function () {});
      appState.isPlaying = true;
      updatePlayerBarsUI();
      renderCurrentView();
      return;
    }

    if (audioEl.paused) {
      audioEl.play().catch(function () {});
      appState.isPlaying = true;
    } else {
      audioEl.pause();
      appState.isPlaying = false;
    }
    updatePlayerBarsUI();
    renderCurrentView();
  }

  function nextTrack(bypassAd) {
    if (!appState.queue.length) return;
    var nextIdx;
    if (appState.shuffle && appState.queue.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * appState.queue.length);
      } while (nextIdx === appState.queueIndex);
    } else {
      nextIdx = appState.queueIndex + 1;
      if (nextIdx >= appState.queue.length) {
        if (appState.repeatMode === 'all') nextIdx = 0;
        else {
          appState.isPlaying = false;
          updatePlayerBarsUI();
          return;
        }
      }
    }
    playTrack(appState.queue[nextIdx], appState.nowPlayingAlbum, appState.queue, nextIdx, bypassAd === true);
  }

  function prevTrack(bypassAd) {
    if (!appState.queue.length) return;
    if (audioEl && audioEl.currentTime > 4) {
      audioEl.currentTime = 0;
      return;
    }
    var prevIdx = appState.queueIndex - 1;
    if (prevIdx < 0) prevIdx = appState.queue.length - 1;
    playTrack(appState.queue[prevIdx], appState.nowPlayingAlbum, appState.queue, prevIdx, bypassAd === true);
  }

  function seekToProgress(p) {
    var clamped = Math.max(0, Math.min(1, p));
    appState.progress = clamped;
    var isGuest = !isUserAuthenticated();
    if (audioEl && audioEl.duration && !isNaN(audioEl.duration)) {
      var maxDur = isGuest ? Math.min(30, audioEl.duration) : audioEl.duration;
      audioEl.currentTime = clamped * maxDur;
      appState.currentSecs = Math.floor(audioEl.currentTime);
    }
    updatePlayerBarsUI();
  }

  function playAtQueueIndex(qIdx) {
    if (qIdx < 0 || qIdx >= appState.queue.length) return;
    var targetTrack = appState.queue[qIdx];
    var album = findAlbumById(targetTrack.albumId) || appState.nowPlayingAlbum;
    playTrack(targetTrack, album, appState.queue, qIdx);
  }

  function playTrackNext(track, album) {
    if (!track) return;
    requireAuth('queue', function () {
      if (!appState.nowPlayingTrack) {
        playTrack(track, album || findAlbumById(track.albumId));
        return;
      }
      var insertAt = Math.max(0, appState.queueIndex + 1);
      appState.queue.splice(insertAt, 0, Object.assign({}, track));
      showToast(_t('toast.playNext', '"{title}" sonará a continuación', { title: track.title }));
      renderExpRightPanel();
    });
  }

  function addTrackToQueue(track, album) {
    if (!track) return;
    requireAuth('queue', function () {
      if (!appState.nowPlayingTrack) {
        playTrack(track, album || findAlbumById(track.albumId));
        return;
      }
      appState.queue.push(Object.assign({}, track));
      showToast(_t('toast.addedToQueue', '"{title}" añadida a la cola', { title: track.title }));
      renderExpRightPanel();
    });
  }

  function moveQueueItem(qi, dir) {
    var target = qi + dir;
    if (qi < 0 || target < 0 || qi >= appState.queue.length || target >= appState.queue.length) return;
    var tmp = appState.queue[qi];
    appState.queue[qi] = appState.queue[target];
    appState.queue[target] = tmp;
    if (appState.queueIndex === qi) appState.queueIndex = target;
    else if (appState.queueIndex === target) appState.queueIndex = qi;
    renderExpRightPanel();
  }

  function removeFromQueueAt(qi) {
    if (qi < 0 || qi >= appState.queue.length || appState.queue.length <= 1) return;
    var removed = appState.queue.splice(qi, 1)[0];
    if (qi < appState.queueIndex) {
      appState.queueIndex = Math.max(0, appState.queueIndex - 1);
    } else if (qi === appState.queueIndex) {
      var nextIdx = Math.min(appState.queueIndex, appState.queue.length - 1);
      playAtQueueIndex(nextIdx);
      if (removed) showToast(_t('toast.removedFromQueue', '"{title}" quitada de la cola', { title: removed.title }));
      return;
    }
    if (removed) showToast(_t('toast.removedFromQueue', '"{title}" quitada de la cola', { title: removed.title }));
    renderExpRightPanel();
  }

  function syncVolumeControls() {
    var effectiveVol = appState.muted ? 0 : appState.volume;
    var miniVolSlider = document.getElementById('miniVolumeRange');
    var miniVolBtn = document.getElementById('miniMuteBtn');
    var expVol = document.getElementById('expVolRange');
    var volWrap = document.getElementById('expVolBarsWrap');

    if (miniVolSlider) miniVolSlider.value = effectiveVol;
    if (expVol) expVol.value = effectiveVol;
    if (miniVolBtn) {
      miniVolBtn.innerHTML = (appState.muted || appState.volume === 0)
        ? '<i class="bi bi-volume-mute-fill fs-5"></i>'
        : (appState.volume < 45 ? '<i class="bi bi-volume-down-fill fs-5"></i>' : '<i class="bi bi-volume-up-fill fs-5"></i>');
    }
    if (volWrap) {
      volWrap.querySelectorAll('[data-vol-level]').forEach(function (barBtn) {
        var lvl = Number(barBtn.getAttribute('data-vol-level'));
        var barEl = barBtn.querySelector('.bz-vol-bar');
        if (barEl) barEl.classList.toggle('is-active', effectiveVol >= lvl);
      });
      var bubble = document.getElementById('expVolBubble');
      if (bubble) {
        bubble.textContent = Math.round(effectiveVol) + '%';
        bubble.style.top = 'calc(' + ((1 - effectiveVol / 100) * 100).toFixed(1) + '% - 12px)';
      }
    }
  }

  function setVolume(vol) {
    appState.volume = Math.max(0, Math.min(100, Number(vol)));
    if (appState.volume > 0) appState.muted = false;
    if (audioEl) audioEl.volume = appState.muted ? 0 : (appState.volume / 100);
    syncVolumeControls();
  }

  function toggleMute() {
    appState.muted = !appState.muted;
    if (audioEl) audioEl.volume = appState.muted ? 0 : (appState.volume / 100);
    syncVolumeControls();
  }

  function toggleShuffle() {
    appState.shuffle = !appState.shuffle;
    showToast(appState.shuffle ? _t('toast.shuffleOn', 'Modo aleatorio activado') : _t('toast.shuffleOff', 'Modo aleatorio desactivado'));
    updatePlayerBarsUI();
  }

  function cycleRepeat() {
    var modes = ['off', 'all', 'one'];
    var idx = (modes.indexOf(appState.repeatMode) + 1) % modes.length;
    appState.repeatMode = modes[idx];
    var msgs = {
      off: _t('toast.repeatOff', 'Repetición desactivada'),
      all: _t('toast.repeatAll', 'Repetir toda la cola'),
      one: _t('toast.repeatOne', 'Repetir canción actual')
    };
    showToast(msgs[appState.repeatMode]);
    updatePlayerBarsUI();
  }

  function findAlbumById(albumId) {
    for (var i = 0; i < appState.albums.length; i++) {
      if (String(appState.albums[i].id) === String(albumId)) return appState.albums[i];
    }
    return null;
  }

  // ---- Actualización de UI persistente (Sidebar, MiniPlayer, Reproductor Gigante) ----
  function updateSidebarAccountUI() {
    var session = Auth.getSession();
    var isAdmin = Auth.isAdmin(session);

    var adminBadge = document.getElementById('sidebarAdminBadge');
    var adminNavBtns = document.querySelectorAll('[data-admin-only]');
    if (adminBadge) {
      adminBadge.classList.toggle('d-none', !isAdmin);
      adminBadge.textContent = 'ADMIN';
    }
    adminNavBtns.forEach(function (el) {
      el.classList.toggle('d-none', !isAdmin);
    });

    var profileBtn = document.getElementById('btnSidebarProfile');
    var loginLink = document.getElementById('linkSidebarLogin');
    var topAuthLink = document.getElementById('topAuthBtn');
    var nameLabel = document.getElementById('sidebarAccountName');
    var avatarBox = document.getElementById('sidebarAvatarBox');

    if (session) {
      if (profileBtn) profileBtn.classList.remove('d-none');
      if (loginLink) loginLink.classList.add('d-none');
      var displayName = session.name || 'Oyente';
      if (displayName.toUpperCase() === 'SUPERADMIN' || session.role === 'superadmin' || session.role === 'admin') {
        displayName = (displayName.toUpperCase() === 'SUPERADMIN') ? 'Admin' : displayName;
      }
      if (nameLabel) nameLabel.textContent = displayName;
      if (avatarBox) {
        avatarBox.innerHTML = session.avatarUrl
          ? '<img src="' + esc(session.avatarUrl) + '" alt="" class="w-100 h-100 object-fit-cover" />'
          : '<i class="bi bi-person-fill"></i>';
      }
      if (topAuthLink) {
        topAuthLink.innerHTML = '<i class="bi bi-person-circle me-1"></i> <span class="d-none d-sm-inline">' + esc(displayName) + '</span>';
        topAuthLink.href = '#';
        topAuthLink.onclick = function (e) {
          e.preventDefault();
          openProfileModal();
        };
      }
    } else {
      if (profileBtn) profileBtn.classList.add('d-none');
      if (loginLink) loginLink.classList.remove('d-none');
      if (topAuthLink) {
        topAuthLink.innerHTML = '<i class="bi bi-person me-1"></i> <span class="d-none d-sm-inline">Acceder</span>';
        topAuthLink.href = './login.html';
        topAuthLink.onclick = null;
      }
    }

    updateStorageMeterUI();
  }

  function getUnseenDownloadsCount() {
    var total = Storage.getDownloads ? Storage.getDownloads().length : 0;
    var rawSeen = localStorage.getItem('bz_seen_downloads_count');
    if (rawSeen === null) {
      localStorage.setItem('bz_seen_downloads_count', String(total));
      return 0;
    }
    var seen = parseInt(rawSeen, 10);
    if (isNaN(seen) || seen < 0) seen = 0;
    if (seen > total) {
      seen = total;
      localStorage.setItem('bz_seen_downloads_count', String(seen));
    }
    return Math.max(0, total - seen);
  }

  function markDownloadsAsSeen() {
    var total = Storage.getDownloads ? Storage.getDownloads().length : 0;
    localStorage.setItem('bz_seen_downloads_count', String(total));
    updateDownloadsBadgeUI();
  }

  function updateDownloadsBadgeUI() {
    var badge = document.getElementById('downloadsCountBadge');
    if (!badge) return;
    if (appState.view === 'downloads') {
      badge.classList.add('d-none');
      return;
    }
    var unseen = getUnseenDownloadsCount();
    if (unseen > 0) {
      badge.textContent = String(unseen);
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }
  }

  function updateStorageMeterUI() {
    var usedMb = Storage.getUsedMb ? Storage.getUsedMb() : (Storage.getUsedBytes() / (1024 * 1024));
    var baseMb = Storage.BASE_STORAGE_MB || 5120.0;
    var availMb = Math.max(0, baseMb - usedMb);
    var availGb = availMb / 1024;
    var usedPct = Math.min(100, (usedMb / baseMb) * 100);

    var bar = document.getElementById('storageProgressBar');
    var availEl = document.getElementById('storageAvailText');

    if (bar) {
      bar.style.width = (usedMb > 0 ? Math.max(2, usedPct) : 0).toFixed(1) + '%';
    }
    if (availEl) {
      var prep = (window.BitszoneI18n && window.BitszoneI18n.getLanguage() === 'en') ? 'of' : 'de';
      if (usedMb <= 0) {
        availEl.innerHTML = '<strong class="text-white">5.00 GB</strong> ' + prep + ' 5.00 GB';
      } else if (availGb >= 1) {
        availEl.innerHTML = '<strong class="text-white">' + availGb.toFixed(2) + ' GB</strong> ' + prep + ' 5.00 GB';
      } else {
        availEl.innerHTML = '<strong class="text-white">' + availMb.toFixed(1) + ' MB</strong> ' + prep + ' 5.00 GB';
      }
    }
    updateDownloadsBadgeUI();
  }

  function downloadAlbumProgressively(album, missingTracks, onFinish) {
    if (!missingTracks || !missingTracks.length) {
      if (typeof onFinish === 'function') onFinish();
      return;
    }

    var total = missingTracks.length;
    var albumId = album && album.id;
    var albumTitle = (album && album.title) || 'Álbum';

    var dockBtn = document.getElementById('btnAlbumDownloadAll');
    if (dockBtn) {
      dockBtn.innerHTML = '<span class="bz-dl-spinner" style="width: 18px; height: 18px; border-width: 2.5px;"></span>';
      dockBtn.style.pointerEvents = 'none';
      dockBtn.setAttribute('title', _t('toast.downloadingAlbum', 'Descargando álbum...'));
    }
    var cardBtn = albumId ? document.querySelector('[data-album-quick-dl="' + albumId + '"]') : null;
    if (cardBtn) {
      cardBtn.innerHTML = '<span class="bz-dl-spinner"></span>';
      cardBtn.style.pointerEvents = 'none';
      cardBtn.setAttribute('title', _t('toast.downloadingAlbum', 'Descargando álbum...'));
    }

    showToast(_t('toast.startAlbumDownload', 'Iniciando descarga de "{album}" (0/{total})...', { album: albumTitle, total: total }));

    var index = 0;
    function processNext() {
      if (index >= total) {
        if (dockBtn) {
          dockBtn.classList.add('is-downloaded');
          dockBtn.innerHTML = '<i class="bi bi-check-circle-fill fs-5 bz-pop-check" style="color: #4ade80;"></i>';
          dockBtn.style.pointerEvents = '';
          dockBtn.setAttribute('title', _t('catalog.albumAlreadyDownloaded', 'Álbum ya descargado'));
        }
        if (cardBtn) {
          cardBtn.classList.add('is-downloaded');
          cardBtn.innerHTML = '<i class="bi bi-check-circle-fill bz-pop-check" style="color: #4ade80; font-size: 0.86rem;"></i>';
          cardBtn.style.pointerEvents = '';
          cardBtn.setAttribute('title', _t('catalog.albumAlreadyDownloaded', 'Álbum ya descargado'));
        }
        showToast(_t('toast.albumDownloadFinished', '¡Álbum "{album}" guardado en Mis descargas ({total} canciones)!', { album: albumTitle, total: total }));
        setTimeout(function () {
          if (typeof onFinish === 'function') onFinish();
        }, 450);
        return;
      }

      var track = missingTracks[index];
      var rowBtn = document.querySelector('[data-row-dl="' + track.id + '"]');
      var rowEl = rowBtn ? rowBtn.closest('.bz-album-track-row') : null;

      if (rowBtn) {
        rowBtn.innerHTML = '<span class="bz-dl-spinner"></span>';
        if (rowEl) rowEl.classList.add('bz-dl-row-pulse');
      }

      setTimeout(function () {
        Storage.downloadTrack(track, false);
        updateStorageMeterUI();

        if (rowBtn) {
          rowBtn.classList.add('is-downloaded');
          rowBtn.innerHTML = '<i class="bi bi-check-circle-fill bz-pop-check" style="color: #4ade80;"></i>';
          if (rowEl) rowEl.classList.remove('bz-dl-row-pulse');
        }

        index++;
        if (total > 3 && index < total && index % 2 === 0) {
          showToast(_t('toast.downloadingAlbumProgress', 'Descargando "{album}" ({index}/{total})...', { album: albumTitle, index: index, total: total }));
        }

        setTimeout(processNext, 80);
      }, 160);
    }

    processNext();
  }

  var expMenuAnchor = null;

  function closeExpAndNavigate(viewName, extra) {
    closeExpTrackMenu();
    var el = document.getElementById('expandedPlayerModal');
    if (el && window.bootstrap) {
      var inst = window.bootstrap.Modal.getInstance(el);
      if (inst) inst.hide();
    }
    navigate(viewName, extra);
  }

  function closeExpTrackMenu() {
    var menu = document.getElementById('bzExpFloatingMenu');
    if (menu) menu.classList.remove('show');
    if (expMenuAnchor && expMenuAnchor.setAttribute) {
      expMenuAnchor.setAttribute('aria-expanded', 'false');
    }
    expMenuAnchor = null;
  }

  function openExpTrackMenu(anchorEl, targetTrack, targetAlbum, includeNav) {
    var menu = document.getElementById('bzExpFloatingMenu');
    if (!menu || !anchorEl || !targetTrack) return;
    if (menu.classList.contains('show') && expMenuAnchor === anchorEl) {
      closeExpTrackMenu();
      return;
    }

    var isCurrent = appState.nowPlayingTrack && Number(appState.nowPlayingTrack.id) === Number(targetTrack.id);
    var itemsHtml = '';
    if (!isCurrent) {
      itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="next"><span>' + _t('menu.playNext', 'Reproducir a continuación') + '</span><i class="bi bi-text-indent-left"></i></button>';
    }
    itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="queue"><span>' + _t('menu.addToQueue', 'Añadir a la cola') + '</span><i class="bi bi-list-ol"></i></button>';
    itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="addpl"><span>' + _t('menu.saveToPlaylist', 'Guardar en lista...') + '</span><i class="bi bi-music-note-list"></i></button>';
    itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="newpl"><span>' + _t('menu.newPlaylistFromThis', 'Nueva playlist con esta') + '</span><i class="bi bi-plus-circle"></i></button>';
    if (includeNav) {
      itemsHtml += '<hr class="dropdown-divider border-white border-opacity-10 my-1" />';
      itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="album"><span>' + _t('menu.goToAlbum', 'Ir al álbum') + '</span><i class="bi bi-disc"></i></button>';
      itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="artist"><span>' + _t('menu.goToArtist', 'Ir al artista') + '</span><i class="bi bi-person"></i></button>';
    }

    menu.innerHTML = itemsHtml;
    menu.classList.add('show');
    anchorEl.setAttribute('aria-expanded', 'true');
    expMenuAnchor = anchorEl;

    var rect = anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : { left: 20, right: 260, top: 100, bottom: 130 };
    var vw = window.innerWidth || 1280;
    var vh = window.innerHeight || 720;
    var menuW = menu.offsetWidth || 245;
    var menuH = menu.offsetHeight || 200;
    var leftPos = Math.max(12, Math.min(rect.right - menuW, vw - menuW - 12));
    var topPos = (rect.bottom + menuH + 12 > vh && rect.top - menuH - 8 >= 12)
      ? (rect.top - menuH - 8)
      : Math.min(rect.bottom + 8, vh - menuH - 12);
    menu.style.left = Math.round(leftPos) + 'px';
    menu.style.top = Math.round(Math.max(12, topPos)) + 'px';

    menu.querySelectorAll('[data-expmenu]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var act = btn.getAttribute('data-expmenu');
        closeExpTrackMenu();
        if (act === 'next') playTrackNext(targetTrack, targetAlbum);
        else if (act === 'queue') addTrackToQueue(targetTrack, targetAlbum);
        else if (act === 'addpl') openAddToPlaylistModal(targetTrack);
        else if (act === 'newpl') openCreatePlaylistModal([targetTrack]);
        else if (act === 'album') {
          var alb = targetAlbum || findAlbumById(targetTrack.albumId);
          if (alb) closeExpAndNavigate('album', { album: alb });
        } else if (act === 'artist') {
          var foundArt = appState.artists.find(function (a) { return a.name === targetTrack.artist; });
          if (foundArt) closeExpAndNavigate('artist', { artist: foundArt });
        }
      });
    });
  }

  // ---- Letras Sincronizadas y Curadas ----
  var lastActiveLyricIndex = -1;
  var lastActiveSideLyricIndex = -1;

  var CURATED_LYRICS = {
    'in the end': [
      { time: 0, text: '♪ (Piano melancólico e introducción) ♪' },
      { time: 13, text: "It starts with one thing, I don't know why" },
      { time: 16, text: "It doesn't even matter how hard you try" },
      { time: 18, text: 'Keep that in mind, I designed this rhyme to explain in due time' },
      { time: 21, text: 'All I know, time is a valuable thing' },
      { time: 23, text: 'Watch it fly by as the pendulum swings' },
      { time: 26, text: 'Watch it count down to the end of the day, the clock ticks life away' },
      { time: 30, text: "It's so unreal, didn't look out below" },
      { time: 33, text: 'Watch the time go right out the window' },
      { time: 35, text: "Trying to hold on, did-didn't even know, I wasted it all just to watch you go" },
      { time: 39, text: 'I kept everything inside and even though I tried, it all fell apart' },
      { time: 43, text: 'What it meant to me will eventually be a memory of a time when I tried so hard' },
      { time: 48, text: 'I tried so hard and got so far' },
      { time: 54, text: "But in the end, it doesn't even matter" },
      { time: 58, text: 'I had to fall to lose it all' },
      { time: 63, text: "But in the end, it doesn't even matter" },
      { time: 69, text: "One thing, I don't know why" },
      { time: 71, text: "It doesn't even matter how hard you try" },
      { time: 73, text: 'Keep that in mind, I designed this rhyme to remind myself how I tried so hard' },
      { time: 78, text: "In spite of the way you were mockin' me" },
      { time: 80, text: "Actin' like I was part of your property" },
      { time: 83, text: "Remembering all the times you fought with me, I'm surprised it got so far" },
      { time: 87, text: "Things aren't the way they were before" },
      { time: 89, text: "You wouldn't even recognize me anymore" },
      { time: 92, text: 'Not that you knew me back then, but it all comes back to me in the end' },
      { time: 96, text: 'I kept everything inside and even though I tried, it all fell apart' },
      { time: 100, text: 'What it meant to me will eventually be a memory of a time when I tried so hard' },
      { time: 105, text: 'I tried so hard and got so far' },
      { time: 110, text: "But in the end, it doesn't even matter" },
      { time: 115, text: 'I had to fall to lose it all' },
      { time: 119, text: "But in the end, it doesn't even matter" },
      { time: 124, text: "I've put my trust in you, pushed as far as I can go" },
      { time: 132, text: "For all this, there's only one thing you should know" },
      { time: 141, text: "I've put my trust in you, pushed as far as I can go" },
      { time: 149, text: "For all this, there's only one thing you should know" },
      { time: 159, text: 'I tried so hard and got so far' },
      { time: 164, text: "But in the end, it doesn't even matter" },
      { time: 168, text: 'I had to fall to lose it all' },
      { time: 173, text: "But in the end, it doesn't even matter" },
      { time: 182, text: '♪ (Outro instrumental y sintetizador) ♪' }
    ],
    'numb': [
      { time: 0, text: '♪ (Sintetizador inicial y percusión) ♪' },
      { time: 7, text: "I'm tired of being what you want me to be" },
      { time: 12, text: 'Feeling so faithless, lost under the surface' },
      { time: 17, text: "Don't know what you're expecting of me" },
      { time: 22, text: 'Put under the pressure of walking in your shoes' },
      { time: 27, text: 'Every step that I take is another mistake to you' },
      { time: 32, text: 'Caught in the undertow, just caught in the undertow' },
      { time: 36, text: "I've become so numb, I can't feel you there" },
      { time: 42, text: 'Become so tired, so much more aware' },
      { time: 46, text: "I'm becoming this, all I want to do" },
      { time: 51, text: 'Is be more like me and be less like you' },
      { time: 57, text: "Can't you see that you're smothering me?" },
      { time: 61, text: 'Holding too tightly, afraid to lose control' },
      { time: 66, text: "'Cause everything that you thought I would be" },
      { time: 71, text: 'Has fallen apart right in front of you' },
      { time: 76, text: 'Every step that I take is another mistake to you' },
      { time: 81, text: 'Caught in the undertow, just caught in the undertow' },
      { time: 85, text: 'And every second I waste is more than I can take' },
      { time: 90, text: "I've become so numb, I can't feel you there" },
      { time: 95, text: 'Become so tired, so much more aware' },
      { time: 100, text: "I'm becoming this, all I want to do" },
      { time: 105, text: 'Is be more like me and be less like you' },
      { time: 111, text: 'And I know I may end up failing too' },
      { time: 118, text: 'But I know you were just like me with someone disappointed in you' },
      { time: 129, text: "I've become so numb, I can't feel you there" },
      { time: 134, text: 'Become so tired, so much more aware' },
      { time: 139, text: "I'm becoming this, all I want to do" },
      { time: 144, text: 'Is be more like me and be less like you' },
      { time: 153, text: "I've become so numb... I can't feel you there" },
      { time: 163, text: '♪ (Outro con eco y desvanecimiento) ♪' }
    ],
    'faint': [
      { time: 0, text: '♪ (Cuerdas distorsionadas y ritmo acelerado) ♪' },
      { time: 9, text: 'I am a little bit of loneliness, a little bit of disregard' },
      { time: 13, text: "Handful of complaints, but I can't help the fact" },
      { time: 16, text: 'That everyone can see these scars' },
      { time: 18, text: 'I am what I want you to want, what I want you to feel' },
      { time: 22, text: "But it's like no matter what I do, I can't convince you to just believe this is real" },
      { time: 27, text: 'So I, let go, watching you, turn your back like you always do' },
      { time: 31, text: "Face away and pretend that I'm not" },
      { time: 34, text: "But I'll be here 'cause you're all that I got" },
      { time: 36, text: "I can't feel the way I did before" },
      { time: 40, text: "Don't turn your back on me, I won't be ignored" },
      { time: 45, text: "Time won't heal this damage anymore" },
      { time: 50, text: "Don't turn your back on me, I won't be ignored" },
      { time: 56, text: '♪ (Solo de batería y riff de guitarra) ♪' },
      { time: 64, text: "Now I hear you questioning what you're feeling inside" },
      { time: 68, text: "Don't you know that you can't hide the truth?" },
      { time: 73, text: "I won't be ignored!" }
    ],
    "wanna be startin' somethin'": [
      { time: 0, text: '♪ (Groove funk contagioso e instrumentos de percusión) ♪' },
      { time: 11, text: "I said you wanna be startin' somethin'" },
      { time: 15, text: "You got to be startin' somethin'" },
      { time: 19, text: "I said you wanna be startin' somethin'" },
      { time: 23, text: "You got to be startin' somethin'" },
      { time: 27, text: "It's too high to get over, too low to get under" },
      { time: 31, text: "You're stuck in the middle, and the pain is thunder" },
      { time: 35, text: "Took my baby to the doctor, with a fever, but now someone's got her" },
      { time: 42, text: "You're a vegetable, you're a vegetable" },
      { time: 46, text: "Still they hate you, you're a vegetable" },
      { time: 50, text: 'Mama-say mama-sah ma-ma-coo-sah' },
      { time: 55, text: 'Mama-say mama-sah ma-ma-coo-sah' }
    ],
    'circles': [
      { time: 0, text: '♪ (Acordes acústicos y línea de bajo cálida) ♪' },
      { time: 10, text: "We couldn't turn him around" },
      { time: 14, text: "'Til we were upside down" },
      { time: 19, text: "I'll be the bad guy now" },
      { time: 24, text: "And no, I ain't holdin' you back" },
      { time: 28, text: 'Seasons change and our love went cold' },
      { time: 33, text: "Feed the flame 'cause we can't let go" },
      { time: 38, text: "Run away, but we're running in circles" },
      { time: 42, text: 'Run away, run away' },
      { time: 47, text: "I dare you to do something, I'm waiting on you again" },
      { time: 53, text: "So I don't take the blame" },
      { time: 56, text: "Run away, but we're running in circles" }
    ]
  };

  // Hardcoded fallback for Somewhere I Belong (Linkin Park) identical to Bitszone original
  var SOMEWHERE_I_BELONG_LYRICS = [
    { time: 43.71, text: "When it began" },
    { time: 45.15, text: "I had nothing to say" },
    { time: 46.82, text: "And I get lost in the nothingness inside of me" },
    { time: 49.7, text: "(I was confused)" },
    { time: 50.59, text: "And I let it all out to find" },
    { time: 52.6, text: "That I'm not the only person with these things in mind" },
    { time: 55.53, text: "(Inside of me)" },
    { time: 56.45, text: "But all that they can see the words revealed" },
    { time: 58.48, text: "Is the only real thing that I've got left to feel" },
    { time: 61.25, text: "(Nothing to lose)" },
    { time: 62.16, text: "Just stuck, hollow and alone" },
    { time: 64.24, text: "And the fault is my own, and the fault is my own" },
    { time: 67.33, text: "I wanna heal, I wanna feel what I thought was never real" },
    { time: 73.14, text: "I wanna let go of the pain I've felt so long" },
    { time: 77.1, text: "(Erase all the pain till it's gone)" },
    { time: 79.09, text: "I wanna heal, I wanna feel like I'm close to something real" },
    { time: 85.00, text: "I wanna find something I've wanted all along" },
    { time: 89.89, text: "Somewhere I belong" },
    { time: 92.29, text: "And I've got nothing to say" },
    { time: 93.87, text: "I can't believe I didn't fall right down on my face" },
    { time: 96.86, text: "(I was confused)" },
    { time: 97.8, text: "Looking everywhere only to find" },
    { time: 99.88, text: "That it's not the way I had imagined it all in my mind" },
    { time: 102.73, text: "(So what am I?)" },
    { time: 103.73, text: "What do I have but negativity?" },
    { time: 105.65, text: "'Cause I can't justify the way everyone is looking at me" },
    { time: 108.6, text: "(Nothing to lose)" },
    { time: 109.61, text: "Nothing to gain, hollow and alone" },
    { time: 111.6, text: "And the fault is my own, and the fault is my own" },
    { time: 114.6, text: "I wanna heal, I wanna feel what I thought was never real" },
    { time: 120.46, text: "I wanna let go of the pain I've felt so long" },
    { time: 124.38, text: "(Erase all the pain till it's gone)" },
    { time: 126.42, text: "I wanna heal, I wanna feel like I'm close to something real" },
    { time: 132.42, text: "I wanna find something I've wanted all along" },
    { time: 137.29, text: "Somewhere I belong" },
    { time: 139.63, text: "I will never know myself until I do this on my own" },
    { time: 145.48, text: "And I will never feel anything else until my wounds are healed" },
    { time: 151.38, text: "I will never be anything till I break away from me" },
    { time: 157.26, text: "I will break away, I'll find myself today" },
    { time: 166.95, text: "I wanna heal, I wanna feel what I thought was never real" },
    { time: 173.79, text: "I wanna let go of the pain I've felt so long" },
    { time: 177.91, text: "(Erase all the pain till it's gone)" },
    { time: 179.75, text: "I wanna heal, I wanna feel like I'm close to something real" },
    { time: 185.66, text: "I wanna find something I've wanted all along" },
    { time: 190.62, text: "Somewhere I belong" },
    { time: 193.02, text: "(I wanna heal, I wanna feel like I'm somewhere I belong)" },
    { time: 198.73, text: "(I wanna heal, I wanna feel like I'm somewhere I belong)" },
    { time: 208.46, text: "Somewhere I belong" }
  ];

  // ---- LRCLIB API Integration (fiel a Bitszone original) ----
  var LRCLIB_BASE_URL = 'https://lrclib.net/api';
  var lyricsMemoryCache = new Map();

  function cleanTrackTitle(title) {
    return (title || '')
      .replace(/\s*[\(\[](feat\.|featuring|with|remastered|remaster|live|bonus|deluxe|version|edit|mono|stereo)[^\)\]]*[\)\]]/gi, '')
      .replace(/\s*-\s*(feat\.|featuring|remastered|remaster|\d{4}\s*remaster).*/gi, '')
      .trim();
  }

  function cleanArtistName(artist) {
    return (artist || '')
      .replace(/\s*(feat\.|featuring|ft\.|with|&|,|\/).*/gi, '')
      .trim();
  }

  function parseLrc(rawLrc) {
    if (!rawLrc) return [];
    var lines = rawLrc.split(/\r?\n/);
    var result = [];
    var regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i].trim();
      if (!raw) continue;
      var timestamps = [];
      regex.lastIndex = 0;
      var match, lastIdx = 0;
      while ((match = regex.exec(raw)) !== null) {
        var min = parseInt(match[1], 10);
        var sec = parseInt(match[2], 10);
        var frac = match[3] || '0';
        var ms = parseInt(frac.padEnd(3, '0').slice(0, 3), 10);
        timestamps.push(min * 60 + sec + ms / 1000);
        lastIdx = regex.lastIndex;
      }
      if (timestamps.length > 0) {
        var text = raw.slice(lastIdx).trim();
        if (text) {
          for (var k = 0; k < timestamps.length; k++) {
            result.push({ time: timestamps[k], text: text });
          }
        }
      }
    }
    return result.sort(function (a, b) { return a.time - b.time; });
  }

  function parsePlainLyrics(plainLyrics, duration) {
    var dur = duration || 180;
    var lines = (plainLyrics || '').split(/\r?\n/)
      .map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 0 && !x.startsWith('['); });
    if (lines.length === 0) return [];
    var start = Math.min(8, dur * 0.05);
    var step = Math.max(10, dur - start - 8) / lines.length;
    return lines.map(function (text, idx) {
      return {
        time: Math.round((start + idx * step) * 100) / 100,
        text: text
      };
    });
  }

  function fetchLyricsLrclib(rawTitle, rawArtist, rawAlbum, rawDuration, callback) {
    var cleanTitle = cleanTrackTitle(rawTitle);
    var cleanArtist = cleanArtistName(rawArtist);
    var cacheKey = (cleanArtist.toLowerCase() + ':::' + cleanTitle.toLowerCase()).trim();

    if (lyricsMemoryCache.has(cacheKey)) {
      var mem = lyricsMemoryCache.get(cacheKey);
      if (typeof callback === 'function') callback(mem);
      return mem;
    }

    try {
      var stored = sessionStorage.getItem('bz_lyrics_' + cacheKey);
      if (stored) {
        var parsed = JSON.parse(stored);
        lyricsMemoryCache.set(cacheKey, parsed);
        if (typeof callback === 'function') callback(parsed);
        return parsed;
      }
    } catch (e) {}

    if (cleanTitle.toLowerCase() === 'somewhere i belong' && cleanArtist.toLowerCase().indexOf('linkin park') !== -1) {
      var sibData = { synced: true, lines: SOMEWHERE_I_BELONG_LYRICS, source: 'hardcoded' };
      lyricsMemoryCache.set(cacheKey, sibData);
      try {
        sessionStorage.setItem('bz_lyrics_' + cacheKey, JSON.stringify(sibData));
      } catch (e) {}
      if (typeof callback === 'function') callback(sibData);
      return sibData;
    }

    // Buscar en CURATED_LYRICS
    var curKey = cleanTitle.toLowerCase();
    var curatedLines = CURATED_LYRICS[curKey];
    if (!curatedLines) {
      var curKeys = Object.keys(CURATED_LYRICS);
      for (var k = 0; k < curKeys.length; k++) {
        if (curKey.indexOf(curKeys[k]) !== -1) {
          curatedLines = CURATED_LYRICS[curKeys[k]];
          break;
        }
      }
    }

    var durSecs = rawDuration && rawDuration > 1000 ? Math.round(rawDuration / 1000) : Math.round(rawDuration || 180);

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = setTimeout(function () {
      if (controller) controller.abort();
    }, 6000);

    var getParams = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist
    });
    if (rawAlbum) getParams.set('album_name', rawAlbum);
    if (durSecs > 0) getParams.set('duration', String(durSecs));

    fetch(LRCLIB_BASE_URL + '/get?' + getParams.toString(), {
      signal: controller ? controller.signal : undefined,
      headers: { 'Accept': 'application/json' }
    })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (data && data.syncedLyrics) return data;
        var searchParams = new URLSearchParams({
          track_name: cleanTitle,
          artist_name: cleanArtist
        });
        return fetch(LRCLIB_BASE_URL + '/search?' + searchParams.toString(), {
          signal: controller ? controller.signal : undefined,
          headers: { 'Accept': 'application/json' }
        })
          .then(function (sRes) { return sRes.ok ? sRes.json() : null; })
          .then(function (sList) {
            if (Array.isArray(sList) && sList.length > 0) {
              return sList.find(function (item) { return item.syncedLyrics; }) || sList[0];
            }
            return data;
          });
      })
      .then(function (item) {
        clearTimeout(timeoutId);
        var result = null;
        if (item && item.syncedLyrics) {
          var parsedLrc = parseLrc(item.syncedLyrics);
          if (parsedLrc.length > 0) {
            result = { synced: true, lines: parsedLrc, source: 'lrclib' };
          }
        }
        if (!result && item && item.plainLyrics) {
          var plainLines = parsePlainLyrics(item.plainLyrics, durSecs);
          if (plainLines.length > 0) {
            result = { synced: false, lines: plainLines, source: 'lrclib-plain' };
          }
        }
        if (!result && curatedLines) {
          result = { synced: true, lines: curatedLines, source: 'curated' };
        }
        if (!result && cleanTitle.toLowerCase().indexOf('somewhere i belong') !== -1) {
          result = { synced: true, lines: SOMEWHERE_I_BELONG_LYRICS, source: 'hardcoded' };
        }

        if (result) {
          lyricsMemoryCache.set(cacheKey, result);
          try {
            sessionStorage.setItem('bz_lyrics_' + cacheKey, JSON.stringify(result));
          } catch (e) {}
        }
        if (typeof callback === 'function') callback(result);
      })
      .catch(function () {
        clearTimeout(timeoutId);
        var fallback = null;
        if (curatedLines) {
          fallback = { synced: true, lines: curatedLines, source: 'curated' };
        } else if (cleanTitle.toLowerCase().indexOf('somewhere i belong') !== -1) {
          fallback = { synced: true, lines: SOMEWHERE_I_BELONG_LYRICS, source: 'hardcoded' };
        }
        if (fallback) {
          lyricsMemoryCache.set(cacheKey, fallback);
        }
        if (typeof callback === 'function') callback(fallback);
      });

    if (curatedLines) {
      return { synced: true, lines: curatedLines, source: 'curated' };
    }
    return null;
  }

  function getTrackLyrics(track) {
    if (!track) return [];
    var cleanTitle = cleanTrackTitle(track.title);
    var cleanArtist = cleanArtistName(track.artist);
    var cacheKey = (cleanArtist.toLowerCase() + ':::' + cleanTitle.toLowerCase()).trim();
    if (lyricsMemoryCache.has(cacheKey)) {
      return lyricsMemoryCache.get(cacheKey).lines || [];
    }
    try {
      var stored = sessionStorage.getItem('bz_lyrics_' + cacheKey);
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed && parsed.lines) return parsed.lines;
      }
    } catch (e) {}
    var curKey = cleanTitle.toLowerCase();
    if (CURATED_LYRICS[curKey]) return CURATED_LYRICS[curKey];
    var curKeys = Object.keys(CURATED_LYRICS);
    for (var i = 0; i < curKeys.length; i++) {
      if (curKey.indexOf(curKeys[i]) !== -1) {
        return CURATED_LYRICS[curKeys[i]];
      }
    }
    if (cleanTitle.toLowerCase().indexOf('somewhere i belong') !== -1) {
      return SOMEWHERE_I_BELONG_LYRICS;
    }
    return [];
  }

  function getLyricsGuestHtml() {
    var isEn = window.BitszoneI18n && window.BitszoneI18n.getLanguage() === 'en';
    var title = isEn
      ? 'Please sign in to enjoy synchronized lyrics'
      : 'Es necesario iniciar sesión para disfrutar de las letras';
    var btnText = isEn ? 'Sign in' : 'Iniciar sesión';
    return (
      '<div class="bz-lyrics-guest-hero d-flex flex-column align-items-center justify-content-center text-center px-4 py-5 w-100 flex-grow-1 my-auto">' +
        '<h2 class="display-6 fw-bold mb-3" style="max-width: 380px; letter-spacing: -0.02em; line-height: 1.25; opacity: 0.75; color: #ffffff;">' +
          esc(title) +
        '</h2>' +
        '<a href="./login.html" class="btn bz-btn-hero btn-sm px-4 py-2 fw-semibold rounded-pill mt-2 shadow-sm">' +
          '<i class="bi bi-box-arrow-in-right me-1.5"></i> ' + esc(btnText) +
        '</a>' +
      '</div>'
    );
  }

  function renderLyricsLinesToContainer(container, lines, trackIdStr, isExp) {
    var stageId = isExp ? 'bzLyricsStage' : 'bzSideLyricsStage';
    var linesHtml = lines.map(function (item, idx) {
      return '<div class="bz-lyric-line" data-lyric-idx="' + idx + '" data-lyric-time="' + item.time + '">' + esc(item.text) + '</div>';
    }).join('');

    container.innerHTML =
      '<div class="bz-lyrics-stage" id="' + stageId + '" data-stage-track-id="' + trackIdStr + '">' +
        linesHtml +
      '</div>';

    container.querySelectorAll('.bz-lyric-line').forEach(function (lineEl) {
      lineEl.addEventListener('click', function () {
        var t = parseFloat(lineEl.getAttribute('data-lyric-time'));
        if (!isNaN(t)) {
          audioEl.currentTime = t;
          if (!appState.isPlaying) {
            audioEl.play().catch(function () {});
            appState.isPlaying = true;
            updatePlayerBarsUI();
          }
          lastActiveLyricIndex = -1;
          lastActiveSideLyricIndex = -1;
          updateLyricsHighlight(t);
        }
      });
    });

    lastActiveLyricIndex = -1;
    lastActiveSideLyricIndex = -1;
    updateLyricsHighlight(audioEl.currentTime);
  }

  function updateLyricsHighlight(currentSecs) {
    var expModalEl = document.getElementById('expandedPlayerModal');
    var isExpOpen = expModalEl && expModalEl.classList.contains('show');

    if (isExpOpen && (appState.expTab === 'letras' || appState.expTab === 'letra')) {
      var expStage = document.getElementById('bzLyricsStage');
      var expContainer = document.getElementById('expRightBody');
      if (expStage && expContainer) {
        var expLines = expStage.querySelectorAll('.bz-lyric-line');
        if (expLines && expLines.length) {
          var activeIndexExp = -1;
          for (var i = 0; i < expLines.length; i++) {
            var t = parseFloat(expLines[i].getAttribute('data-lyric-time'));
            if (!isNaN(t) && t <= currentSecs + 0.25) {
              activeIndexExp = i;
            } else {
              break;
            }
          }
          if (activeIndexExp === -1 && expLines.length > 0) activeIndexExp = 0;

          expLines.forEach(function (l, idx) {
            if (idx === activeIndexExp) {
              l.classList.add('is-active');
              l.classList.remove('is-past');
              l.setAttribute('data-active-lyric', 'true');
            } else if (idx < activeIndexExp) {
              l.classList.remove('is-active');
              l.classList.add('is-past');
              l.removeAttribute('data-active-lyric');
            } else {
              l.classList.remove('is-active', 'is-past');
              l.removeAttribute('data-active-lyric');
            }
          });

          if (activeIndexExp >= 0 && activeIndexExp !== lastActiveLyricIndex) {
            lastActiveLyricIndex = activeIndexExp;
            var activeLine = expLines[activeIndexExp];
            if (activeLine) {
              var containerRect = expContainer.getBoundingClientRect();
              var lineRect = activeLine.getBoundingClientRect();
              var targetScroll = expContainer.scrollTop + (lineRect.top - containerRect.top) - (containerRect.height * 0.36) + (lineRect.height / 2);
              expContainer.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
              });
            }
          }
        }
      }
    }

    var sidePanel = document.getElementById('bzSideLyricsPanel');
    var isSideOpen = sidePanel && sidePanel.classList.contains('is-open');

    if (isSideOpen) {
      var sideStage = document.getElementById('bzSideLyricsStage');
      var sideContainer = document.getElementById('sideLyricsBody');
      if (sideStage && sideContainer) {
        var sideLines = sideStage.querySelectorAll('.bz-lyric-line');
        if (sideLines && sideLines.length) {
          var activeIndexSide = -1;
          for (var j = 0; j < sideLines.length; j++) {
            var ts = parseFloat(sideLines[j].getAttribute('data-lyric-time'));
            if (!isNaN(ts) && ts <= currentSecs + 0.25) {
              activeIndexSide = j;
            } else {
              break;
            }
          }
          if (activeIndexSide === -1 && sideLines.length > 0) activeIndexSide = 0;

          sideLines.forEach(function (l, idx) {
            if (idx === activeIndexSide) {
              l.classList.add('is-active');
              l.classList.remove('is-past');
              l.setAttribute('data-active-lyric', 'true');
            } else if (idx < activeIndexSide) {
              l.classList.remove('is-active');
              l.classList.add('is-past');
              l.removeAttribute('data-active-lyric');
            } else {
              l.classList.remove('is-active', 'is-past');
              l.removeAttribute('data-active-lyric');
            }
          });

          if (activeIndexSide >= 0 && activeIndexSide !== lastActiveSideLyricIndex) {
            lastActiveSideLyricIndex = activeIndexSide;
            var activeSideLine = sideLines[activeIndexSide];
            if (activeSideLine) {
              var lineTop = activeSideLine.offsetTop;
              var p = activeSideLine.offsetParent;
              while (p && p !== sideContainer) {
                lineTop += p.offsetTop || 0;
                p = p.offsetParent;
              }
              // Anclar la parte superior de la estrofa suavemente a ~32% de la altura visible
              var targetScroll = lineTop - (sideContainer.clientHeight * 0.32);
              sideContainer.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
              });
            }
          }
        }
      }
    }
  }

  function updateSideLyricsHeader() {
    var headerEl = document.getElementById('sideLyricsHeader');
    var iconEl = document.getElementById('sideLyricsIcon');
    var titleEl = document.getElementById('sideLyricsTitle');
    if (!headerEl || !titleEl) return;

    // Sin línea divisoria en ningún estado: super limpio como en la tercera imagen
    headerEl.classList.remove('border-bottom', 'border-white', 'border-opacity-10');
    headerEl.style.borderBottom = 'none';

    var isEn = window.BitszoneI18n && window.BitszoneI18n.getLanguage() === 'en';
    var track = appState.nowPlayingTrack;
    if (!track) {
      // Estado sin canción reproduciéndose: "Letra" o "Lyrics"
      if (iconEl) {
        iconEl.className = 'bi bi-mic text-white-50 opacity-50';
        iconEl.style.color = '';
      }
      titleEl.className = 'text-white-50 small text-truncate';
      titleEl.style.color = 'rgba(255, 255, 255, 0.45)';
      titleEl.style.fontWeight = '500';
      titleEl.style.letterSpacing = 'normal';
      titleEl.style.textTransform = 'none';
      titleEl.textContent = isEn ? 'Lyrics' : 'Letra';
      titleEl.removeAttribute('title');
    } else {
      // Estado con canción reproduciéndose: "Letra de" o "Lyrics of"
      if (iconEl) {
        iconEl.className = 'bi bi-mic-fill text-white';
        iconEl.style.color = '#ffffff';
      }
      titleEl.className = 'text-white small text-truncate fw-semibold';
      titleEl.style.color = '#ffffff';
      titleEl.style.fontWeight = '600';
      titleEl.style.letterSpacing = 'normal';
      titleEl.style.textTransform = 'none';
      var prefix = isEn ? 'Lyrics of ' : 'Letra de ';
      titleEl.textContent = prefix + (track.title || (isEn ? 'song' : 'canción'));
      titleEl.title = prefix + (track.title || (isEn ? 'song' : 'canción'));
    }
  }

  function toggleSideLyricsPanel(forceState) {
    var panel = document.getElementById('bzSideLyricsPanel');
    if (!panel) return;
    var willOpen = typeof forceState === 'boolean' ? forceState : !panel.classList.contains('is-open');
    appState.isSideLyricsOpen = willOpen;
    if (willOpen) {
      panel.classList.add('is-open');
      renderSideLyricsPanel();
    } else {
      panel.classList.remove('is-open');
    }
    updateSideLyricsHeader();
    updatePlayerBarsUI();
  }

  function renderSideLyricsPanel() {
    var panel = document.getElementById('bzSideLyricsPanel');
    var container = document.getElementById('sideLyricsBody');
    if (!panel || !container) return;

    updateSideLyricsHeader();

    if (!panel.classList.contains('is-open')) return;

    var track = appState.nowPlayingTrack;
    if (!track) {
      var noneText = (window.BitszoneI18n && window.BitszoneI18n.getLanguage() === 'en')
        ? 'No song currently playing'
        : 'No hay ninguna canción en reproducción';
      container.innerHTML =
        '<div class="d-flex flex-column align-items-center justify-content-center py-5 text-center px-3 flex-grow-1 my-auto" style="min-height: 260px;">' +
          '<i class="bi bi-mic text-white-50 opacity-25 mb-3" style="font-size: 2.2rem;"></i>' +
          '<p class="text-white-50 small mb-0" style="max-width: 240px;">' + esc(noneText) + '</p>' +
        '</div>';
      return;
    }

    var isAuth = isUserAuthenticated();
    if (!isAuth) {
      var guestHero = container.querySelector('.bz-lyrics-guest-hero');
      if (!guestHero) {
        container.innerHTML = getLyricsGuestHtml();
      }
      return;
    }

    var trackIdStr = String(track.id);
    var currentStage = container.querySelector('#bzSideLyricsStage');
    var needsRebuild = !currentStage || currentStage.getAttribute('data-stage-track-id') !== trackIdStr;

    if (needsRebuild) {
      var albumTitle = (appState.nowPlayingAlbum && appState.nowPlayingAlbum.title) || track.albumTitle;
      var cached = fetchLyricsLrclib(track.title, track.artist, albumTitle, track.duration);
      if (cached && cached.lines && cached.lines.length > 0) {
        renderLyricsLinesToContainer(container, cached.lines, trackIdStr, false);
      } else {
        container.innerHTML =
          '<div class="bz-lyrics-loading-skeleton d-flex flex-column gap-3 pt-3 px-1 w-100">' +
            '<div class="bz-skeleton-line rounded-3 bg-white bg-opacity-10" style="height: 38px; width: 80%;"></div>' +
            '<div class="bz-skeleton-line rounded-3 bg-white bg-opacity-20" style="height: 44px; width: 55%;"></div>' +
            '<div class="bz-skeleton-line rounded-3 bg-white bg-opacity-10" style="height: 38px; width: 90%;"></div>' +
            '<div class="bz-skeleton-line rounded-3 bg-white bg-opacity-10" style="height: 38px; width: 70%;"></div>' +
          '</div>';

        fetchLyricsLrclib(track.title, track.artist, albumTitle, track.duration, function (res) {
          if (!panel.classList.contains('is-open')) return;
          if (String(appState.nowPlayingTrack && appState.nowPlayingTrack.id) !== trackIdStr) return;
          if (res && res.lines && res.lines.length > 0) {
            renderLyricsLinesToContainer(container, res.lines, trackIdStr, false);
          } else {
            var notFoundTitle = (window.BitszoneI18n && window.BitszoneI18n.getLanguage() === 'en') ? 'Lyrics not available' : 'Letra no disponible';
            var notFoundDesc = (window.BitszoneI18n && window.BitszoneI18n.getLanguage() === 'en') ? 'No synchronized lyrics found.' : 'No se encontró letra sincronizada.';
            container.innerHTML =
              '<div class="d-flex flex-column align-items-center justify-content-center py-5 text-center px-3 flex-grow-1 my-auto">' +
                '<i class="bi bi-mic text-white-50 fs-2 mb-2"></i>' +
                '<p class="text-white fw-bold small mb-1">' + esc(notFoundTitle) + '</p>' +
                '<p class="text-white-50 small mb-0">' + esc(notFoundDesc) + '</p>' +
              '</div>';
          }
        });
      }
    } else {
      updateLyricsHighlight(audioEl.currentTime);
    }
  }

  function renderExpRightPanel() {
    var container = document.getElementById('expRightBody');
    var track = appState.nowPlayingTrack;
    var album = appState.nowPlayingAlbum;
    if (!container || !track || !album) return;

    document.querySelectorAll('[data-exp-tab]').forEach(function (btn) {
      var tabAttr = btn.getAttribute('data-exp-tab');
      var matches = tabAttr === appState.expTab || (tabAttr === 'letras' && appState.expTab === 'letra') || (tabAttr === 'letra' && appState.expTab === 'letras');
      btn.classList.toggle('is-active', matches);
    });

    if (appState.expTab === 'pistas') {
      var list = (album.tracks && album.tracks.length) ? album.tracks : appState.queue;
      container.innerHTML = list.map(function (t, i) {
        var active = Number(t.id) === Number(track.id);
        var fav = Storage.isFavorite(t.id);
        var dl = Storage.isDownloaded(t.id);
        var lic = Storage.isLicensed(t.id);
        var numStr = String(t.trackNumber || (i + 1)).padStart(2, '0');
        return (
          '<div class="bz-exp-track-item ' + (active ? 'is-active' : '') + '" data-exp-play-idx="' + i + '">' +
            '<span class="bz-exp-idx">' + numStr + '</span>' +
            '<div class="flex-grow-1 min-w-0">' +
              '<div class="d-flex align-items-center gap-2 text-truncate">' +
                (lic ? '<i class="bi bi-star-fill text-warning fs-6 flex-shrink-0"></i>' : '') +
                '<span class="text-truncate">' + esc(t.title) + '</span>' +
              '</div>' +
            '</div>' +
            (active && appState.isPlaying ? '<div class="fx-eq me-1"><i></i><i></i><i></i></div>' : '') +
            '<div class="bz-exp-row-actions d-flex align-items-center gap-1 flex-shrink-0">' +
              '<button type="button" class="bz-icon-action fs-6 ' + (fav ? 'is-favorited' : '') + '" data-exp-row-fav="' + t.id + '" title="' + _t('catalog.favorite', 'Favorito') + '"><i class="bi ' + (fav ? 'bi-heart-fill' : 'bi-heart') + '"></i></button>' +
              '<button type="button" class="bz-icon-action fs-6 ' + (dl ? 'is-downloaded' : '') + '" data-exp-row-dl="' + t.id + '" title="' + _t('catalog.downloadTrack', 'Descargar') + '"><i class="bi ' + (dl ? 'bi-check-circle-fill' : 'bi-download') + '"></i></button>' +
              '<button type="button" class="bz-icon-action fs-6" data-exp-row-menu="' + t.id + '" aria-expanded="false" title="' + _t('player.moreOptions', 'Añadir a cola o lista') + '"><i class="bi bi-three-dots"></i></button>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      container.querySelectorAll('[data-exp-play-idx]').forEach(function (row) {
        row.addEventListener('click', function (e) {
          if (e.target && e.target.closest && e.target.closest('.bz-exp-row-actions, button')) return;
          var idx = Number(row.getAttribute('data-exp-play-idx'));
          if (list[idx]) playTrack(list[idx], album, list);
        });
      });
      container.querySelectorAll('[data-exp-row-fav]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          requireAuth('favorites', function () {
            var t = list.find(function (x) { return Number(x.id) === Number(btn.getAttribute('data-exp-row-fav')); });
            if (t) {
              var added = Storage.toggleFavorite(t);
              showToast(added ? _t('toast.favoriteAdded', 'Agregada a favoritos') : _t('toast.favoriteRemoved', 'Quitada de favoritos'));
              updatePlayerBarsUI();
              renderCurrentView();
            }
          });
        });
      });
      container.querySelectorAll('[data-exp-row-dl]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          requireAuth('downloads', function () {
            var t = list.find(function (x) { return Number(x.id) === Number(btn.getAttribute('data-exp-row-dl')); });
            if (t) {
              var isNew = Storage.downloadTrack(t, false);
              updateStorageMeterUI();
              showToast(isNew ? _t('toast.downloaded', 'Canción guardada en Mis descargas') : _t('toast.downloadExists', 'La canción ya está en Mis descargas'));
              updatePlayerBarsUI();
              renderCurrentView();
            }
          });
        });
      });
      container.querySelectorAll('[data-exp-row-menu]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var t = list.find(function (x) { return Number(x.id) === Number(btn.getAttribute('data-exp-row-menu')); });
          if (t) openExpTrackMenu(btn, t, album, false);
        });
      });
    } else if (appState.expTab === 'cola') {
      var hasUpcoming = appState.queueIndex < appState.queue.length - 1;
      var head =
        '<div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 px-2">' +
          '<span class="text-white-50 text-uppercase fw-bold" style="font-size:0.75rem; letter-spacing:0.2em;">' + _t('queue.title', 'Tu cola') + ' (' + appState.queue.length + ')</span>' +
          '<div class="d-flex align-items-center gap-2">' +
            (hasUpcoming ? '<button type="button" id="btnExpClearNext" class="btn bz-btn-subtle btn-sm px-3 py-1" style="font-size:0.75rem;"><i class="bi bi-x-lg me-1"></i>' + _t('queue.clearNext', 'Limpiar próximas') + '</button>' : '') +
            '<button type="button" id="btnExpCreateQueuePl" class="btn bz-btn-hero-subtle btn-sm px-3 py-1" style="font-size:0.76rem;"><i class="bi bi-music-note-list me-1"></i>' + _t('queue.saveAsPlaylist', 'Crear lista con la cola') + '</button>' +
          '</div>' +
        '</div>';

      var qHtml = appState.queue.map(function (qt, qi) {
        var active = qi === appState.queueIndex;
        var lic = Storage.isLicensed(qt.id);
        return (
          '<div class="bz-exp-track-item ' + (active ? 'is-active' : '') + '" data-exp-queue-idx="' + qi + '">' +
            '<span class="bz-exp-idx">' + String(qi + 1).padStart(2, '0') + '</span>' +
            '<div class="flex-grow-1 min-w-0">' +
              '<div class="d-flex align-items-center gap-1 text-truncate">' +
                (lic ? '<i class="bi bi-star-fill text-warning fs-6 flex-shrink-0"></i>' : '') +
                '<span class="text-truncate">' + esc(qt.title) + '</span>' +
              '</div>' +
              '<div class="text-white-50 text-truncate" style="font-size:0.78rem; font-weight:500;">' + esc(qt.artist) + '</div>' +
            '</div>' +
            (active && appState.isPlaying ? '<div class="fx-eq me-1"><i></i><i></i><i></i></div>' : '') +
            '<div class="bz-exp-row-actions d-flex align-items-center gap-1 flex-shrink-0">' +
              (qi > 0 ? '<button type="button" class="bz-icon-action" data-exp-q-up="' + qi + '" title="' + _t('queue.moveUp', 'Subir') + '"><i class="bi bi-arrow-up-short fs-5"></i></button>' : '') +
              (qi < appState.queue.length - 1 ? '<button type="button" class="bz-icon-action" data-exp-q-down="' + qi + '" title="' + _t('queue.moveDown', 'Bajar') + '"><i class="bi bi-arrow-down-short fs-5"></i></button>' : '') +
              '<button type="button" class="bz-icon-action" data-exp-q-pl="' + qi + '" title="' + _t('album.addToPlaylist', 'Guardar en playlist') + '"><i class="bi bi-plus-circle fs-6"></i></button>' +
              (appState.queue.length > 1 ? '<button type="button" class="bz-icon-action text-danger" data-exp-q-rm="' + qi + '" title="' + _t('queue.remove', 'Quitar') + '"><i class="bi bi-x-circle fs-6"></i></button>' : '') +
            '</div>' +
            '<span class="font-mono-bz small text-white-50 flex-shrink-0">' + formatDurationMs(qt.duration) + '</span>' +
          '</div>'
        );
      }).join('');

      var sugSection =
        '<div class="mt-4 pt-3 border-top border-white border-opacity-10 px-2">' +
          '<div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">' +
            '<span class="text-white-50 text-uppercase fw-bold" style="font-size:0.72rem; letter-spacing:0.2em;">' + _t('queue.addSongsTitle', 'Añadir canciones a la cola') + '</span>' +
            '<div class="position-relative" style="width: 195px;">' +
              '<i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 text-white-50" style="font-size:0.75rem; pointer-events:none;"></i>' +
              '<input id="expSugSearch" type="text" class="form-control form-control-sm bz-input-dark ps-4 py-1" style="font-size:0.78rem; border-radius:999px;" placeholder="' + _t('queue.searchSong', 'Buscar canción...') + '" value="' + esc(appState.expQueueSearch || '') + '" />' +
            '</div>' +
          '</div>' +
          '<div id="expSugList" class="d-grid gap-1"></div>' +
        '</div>';

      container.innerHTML = head + qHtml + sugSection;

      function renderQueueSuggestions(filterQuery) {
        var sugListEl = document.getElementById('expSugList');
        if (!sugListEl) return;
        var qLower = (filterQuery || '').trim().toLowerCase();
        var inQueueIds = {};
        appState.queue.forEach(function (x) { inQueueIds[String(x.id)] = true; });
        var candidates = [];
        appState.albums.forEach(function (a) {
          (a.tracks || []).forEach(function (t) {
            if (inQueueIds[String(t.id)] && !qLower) return;
            if (qLower) {
              var matches = (t.title || '').toLowerCase().indexOf(qLower) !== -1 ||
                (t.artist || '').toLowerCase().indexOf(qLower) !== -1;
              if (!matches) return;
            }
            candidates.push({ track: t, album: a });
          });
        });
        var shown = candidates.slice(0, 10);
        if (!shown.length) {
          sugListEl.innerHTML = '<div class="text-white-50 small py-2">' + _t('queue.noSuggestions', 'No hay sugerencias disponibles para esa búsqueda.') + '</div>';
          return;
        }
        sugListEl.innerHTML = shown.map(function (item) {
          var st = item.track;
          return (
            '<div class="bz-exp-sug-row" data-sug-play="' + st.id + '">' +
              '<img src="' + esc(st.albumCover || item.album.coverUrl || './assets/img/bitszone-icon.png') + '" width="38" height="38" class="rounded-2 object-fit-cover flex-shrink-0" alt="" />' +
              '<div class="flex-grow-1 min-w-0">' +
                '<div class="text-white fw-semibold text-truncate" style="font-size:0.86rem;">' + esc(st.title) + '</div>' +
                '<div class="text-white-50 text-truncate" style="font-size:0.74rem;">' + esc(st.artist) + '</div>' +
              '</div>' +
              '<button type="button" class="btn bz-btn-subtle btn-sm px-2 py-1 flex-shrink-0" style="font-size:0.72rem;" data-sug-addq="' + st.id + '" title="' + _t('menu.addToQueue', 'Añadir a la cola') + '"><i class="bi bi-plus-lg me-1"></i>' + _t('queue.btnQueue', 'Cola') + '</button>' +
              '<button type="button" class="bz-icon-action flex-shrink-0" data-sug-addpl="' + st.id + '" title="' + _t('album.addToPlaylist', 'Añadir a playlist') + '"><i class="bi bi-music-note-list"></i></button>' +
            '</div>'
          );
        }).join('');

        sugListEl.querySelectorAll('[data-sug-play]').forEach(function (row) {
          row.addEventListener('click', function () {
            var info = findTrackById(row.getAttribute('data-sug-play'));
            if (info) addTrackToQueue(info.track, info.album);
          });
        });
        sugListEl.querySelectorAll('[data-sug-addq]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var info = findTrackById(btn.getAttribute('data-sug-addq'));
            if (info) addTrackToQueue(info.track, info.album);
          });
        });
        sugListEl.querySelectorAll('[data-sug-addpl]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var info = findTrackById(btn.getAttribute('data-sug-addpl'));
            if (info) openAddToPlaylistModal(info.track);
          });
        });
      }

      renderQueueSuggestions(appState.expQueueSearch || '');

      var sugSearchEl = document.getElementById('expSugSearch');
      if (sugSearchEl) {
        sugSearchEl.addEventListener('input', function () {
          appState.expQueueSearch = sugSearchEl.value;
          renderQueueSuggestions(appState.expQueueSearch);
        });
      }

      var saveQueueBtn = document.getElementById('btnExpCreateQueuePl');
      if (saveQueueBtn) {
        saveQueueBtn.addEventListener('click', function () {
          if (!isUserAuthenticated()) {
            openAuthRequiredModal('playlists');
            return;
          }
          if (!appState.queue.length) return;
          openCreatePlaylistModal(appState.queue, _t('queue.title', 'Cola') + ' · ' + (album.title || track.title));
        });
      }

      var clearNextBtn = document.getElementById('btnExpClearNext');
      if (clearNextBtn) {
        clearNextBtn.addEventListener('click', function () {
          if (!isUserAuthenticated()) {
            openAuthRequiredModal('queue');
            return;
          }
          appState.queue = appState.queue.slice(0, appState.queueIndex + 1);
          showToast(_t('toast.queueCleared', 'Se limpiaron las siguientes pistas de la cola'));
          renderExpRightPanel();
        });
      }

      container.querySelectorAll('[data-exp-queue-idx]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          if (e.target && e.target.closest && e.target.closest('.bz-exp-row-actions, button')) return;
          var qIdx = Number(btn.getAttribute('data-exp-queue-idx'));
          playAtQueueIndex(qIdx);
        });
      });

      container.querySelectorAll('[data-exp-q-up]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!isUserAuthenticated()) {
            openAuthRequiredModal('queue');
            return;
          }
          moveQueueItem(Number(btn.getAttribute('data-exp-q-up')), -1);
        });
      });
      container.querySelectorAll('[data-exp-q-down]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!isUserAuthenticated()) {
            openAuthRequiredModal('queue');
            return;
          }
          moveQueueItem(Number(btn.getAttribute('data-exp-q-down')), 1);
        });
      });
      container.querySelectorAll('[data-exp-q-pl]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!isUserAuthenticated()) {
            openAuthRequiredModal('playlists');
            return;
          }
          var qi = Number(btn.getAttribute('data-exp-q-pl'));
          if (appState.queue[qi]) openAddToPlaylistModal(appState.queue[qi]);
        });
      });
      container.querySelectorAll('[data-exp-q-rm]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!isUserAuthenticated()) {
            openAuthRequiredModal('queue');
            return;
          }
          removeFromQueueAt(Number(btn.getAttribute('data-exp-q-rm')));
        });
      });
    } else if (appState.expTab === 'letras' || appState.expTab === 'letra') {
      var isAuth = isUserAuthenticated();
      var trackIdStr = String(track.id);

      if (!isAuth) {
        var guestHero = container.querySelector('.bz-lyrics-guest-hero');
        if (!guestHero) {
          container.innerHTML = getLyricsGuestHtml();
        }
      } else {
        var currentStage = container.querySelector('#bzLyricsStage');
        var needsRebuild = !currentStage || currentStage.getAttribute('data-stage-track-id') !== trackIdStr;

        if (needsRebuild) {
          var albumTitle = (album && album.title) || track.albumTitle;
          var cached = fetchLyricsLrclib(track.title, track.artist, albumTitle, track.duration);
          if (cached && cached.lines && cached.lines.length > 0) {
            renderLyricsLinesToContainer(container, cached.lines, trackIdStr, true);
          } else {
            container.innerHTML =
              '<div class="bz-lyrics-loading-skeleton d-flex flex-column gap-4 pt-4 px-2 w-100">' +
                '<div class="bz-skeleton-line rounded-4 bg-white bg-opacity-10" style="height: 48px; width: 75%; filter: blur(2px);"></div>' +
                '<div class="bz-skeleton-line rounded-4 bg-white bg-opacity-20" style="height: 54px; width: 50%;"></div>' +
                '<div class="bz-skeleton-line rounded-4 bg-white bg-opacity-10" style="height: 48px; width: 85%; filter: blur(2px);"></div>' +
                '<div class="bz-skeleton-line rounded-4 bg-white bg-opacity-10" style="height: 48px; width: 65%; filter: blur(2px);"></div>' +
              '</div>';

            fetchLyricsLrclib(track.title, track.artist, albumTitle, track.duration, function (res) {
              if (appState.expTab !== 'letras' && appState.expTab !== 'letra') return;
              if (String(appState.nowPlayingTrack && appState.nowPlayingTrack.id) !== trackIdStr) return;
              if (res && res.lines && res.lines.length > 0) {
                renderLyricsLinesToContainer(container, res.lines, trackIdStr, true);
              } else {
                container.innerHTML =
                  '<div class="d-flex flex-column align-items-center justify-content-center py-5 text-center px-4 flex-grow-1 my-auto">' +
                    '<div class="rounded-4 bg-white bg-opacity-10 d-flex align-items-center justify-content-center text-white-50 mb-3 shadow-sm" style="width: 64px; height: 64px;">' +
                      '<i class="bi bi-mic fs-2 text-white-50"></i>' +
                    '</div>' +
                    '<p class="text-white fw-bold fs-5 mb-1">' + _t('lyrics.notFound', 'Letra no disponible') + '</p>' +
                    '<p class="text-white-50 small mb-0" style="max-width: 320px;">' + _t('lyrics.notFoundDesc', 'No encontramos la letra sincronizada para esta canción.') + '</p>' +
                  '</div>';
              }
            });
          }
        } else {
          updateLyricsHighlight(audioEl.currentTime);
        }
      }
    } else {
      appState.expTab = 'pistas';
      renderExpRightPanel();
    }
  }

  function updatePlayerBarsUI() {
    var mini = document.getElementById('bzMiniPlayer');
    var track = appState.nowPlayingTrack;
    var album = appState.nowPlayingAlbum;

    updateSideLyricsHeader();
    if (!mini) return;
    if (!track || !album) {
      mini.classList.add('d-none');
      document.body.classList.remove('bz-has-miniplayer');
      return;
    }
    mini.classList.remove('d-none');
    document.body.classList.add('bz-has-miniplayer');

    var coverUrl = track.albumCover || album.coverUrl || './assets/img/albums/hybrid-theory.jpg';
    var isFav = Storage.isFavorite(track.id);
    var isDl = Storage.isDownloaded(track.id);
    var isLic = Storage.isLicensed(track.id);

    // Desktop MiniPlayer
    var miniAmbient = document.getElementById('miniAmbientGlow');
    var miniCover = document.getElementById('miniCoverImg');
    var miniVinylImg = document.getElementById('miniVinylArtImg');
    var miniTitle = document.getElementById('miniTrackTitle');
    var miniArtist = document.getElementById('miniTrackArtist');
    var miniAlbumEl = document.getElementById('miniTrackAlbum');
    var miniTime = document.getElementById('miniTimeText');
    var miniPlayBtn = document.getElementById('miniPlayBtn');
    var miniPlayIcon = document.getElementById('miniPlayIconWrap');
    var miniFavBtn = document.getElementById('miniFavBtn');
    var miniShuffleBtn = document.getElementById('miniShuffleBtn');
    var miniRepeatBtn = document.getElementById('miniRepeatBtn');

    if (miniAmbient) miniAmbient.style.backgroundImage = 'url("' + coverUrl + '")';
    if (miniCover) miniCover.src = coverUrl;
    if (miniVinylImg) miniVinylImg.src = coverUrl;
    if (miniTitle) miniTitle.innerHTML = (isLic ? '<i class="bi bi-star-fill text-warning me-1" style="font-size:0.78rem;"></i>' : '') + esc(track.title);
    if (miniArtist) miniArtist.textContent = track.artist;
    if (miniAlbumEl) miniAlbumEl.textContent = track.albumTitle || album.title || '';
    var isGuest = !isUserAuthenticated();
    var previewTag = isGuest ? ' <span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 font-mono-bz ms-1" style="font-size:0.68rem;">30s Preview</span>' : '';
    if (miniTime) miniTime.innerHTML = formatTime(appState.currentSecs) + ' / ' + formatTime(appState.durationSecs) + previewTag;

    if (miniPlayBtn) {
      miniPlayBtn.classList.toggle('is-playing', appState.isPlaying && !appState.isAudioLoading);
    }
    if (miniPlayIcon) {
      miniPlayIcon.innerHTML = appState.isAudioLoading
        ? '<span class="spinner-border spinner-border-sm text-white" role="status"></span>'
        : (appState.isPlaying ? '<i class="bi bi-pause-fill fs-4"></i>' : '<i class="bi bi-play-fill fs-4 ms-1"></i>');
    }

    if (miniFavBtn) {
      miniFavBtn.classList.toggle('is-favorited', isFav);
      miniFavBtn.innerHTML = isFav ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
    }
    if (miniShuffleBtn) {
      miniShuffleBtn.style.color = appState.shuffle ? 'var(--bz-lavender)' : '';
    }
    if (miniRepeatBtn) {
      miniRepeatBtn.style.color = appState.repeatMode !== 'off' ? 'var(--bz-lavender)' : '';
      miniRepeatBtn.innerHTML = appState.repeatMode === 'one' ? '<i class="bi bi-repeat-1"></i>' : '<i class="bi bi-repeat"></i>';
    }
    var miniLyricsBtn = document.getElementById('miniLyricsBtn');
    if (miniLyricsBtn) {
      var isLyricsActive = appState.expTab === 'letras' || appState.expTab === 'letra';
      var expModal = document.getElementById('expandedPlayerModal');
      var isExpOpen = expModal && expModal.classList.contains('show');
      var sidePanel = document.getElementById('bzSideLyricsPanel');
      var isSideOpen = sidePanel && sidePanel.classList.contains('is-open');
      var activeState = isExpOpen ? isLyricsActive : isSideOpen;
      if (activeState) {
        miniLyricsBtn.classList.add('text-white');
        miniLyricsBtn.classList.remove('text-white-50');
      } else {
        miniLyricsBtn.classList.remove('text-white');
        miniLyricsBtn.classList.add('text-white-50');
      }
    }

    // Mobile MiniPlayer bar
    var mobCover = document.getElementById('mobMiniCover');
    var mobTitle = document.getElementById('mobMiniTitle');
    var mobArtist = document.getElementById('mobMiniArtist');
    var mobPlay = document.getElementById('mobMiniPlayBtn');
    var mobProg = document.getElementById('mobMiniProgress');
    if (mobCover) mobCover.src = coverUrl;
    if (mobTitle) mobTitle.textContent = track.title;
    if (mobArtist) mobArtist.textContent = track.artist;
    if (mobPlay) {
      mobPlay.innerHTML = appState.isPlaying ? '<i class="bi bi-pause-fill fs-5"></i>' : '<i class="bi bi-play-fill fs-5"></i>';
    }
    if (mobProg) mobProg.style.width = ((appState.progress || 0) * 100).toFixed(1) + '%';

    // Reproductor Gigante Modal
    var expCover = document.getElementById('expCoverImg');
    var expVinylDisc = document.getElementById('expVinylDisc');
    var expVinylLabelImg = document.getElementById('expVinylLabelImg');
    var expVinylOrbImg = document.getElementById('expVinylOrbImg');
    var expBg = document.getElementById('expBgGlow');
    var expTitle = document.getElementById('expTrackTitle');
    var expArtist = document.getElementById('expTrackArtist');
    var expAlbum = document.getElementById('expAlbumName');
    var expCur = document.getElementById('expCurrentTime');
    var expDur = document.getElementById('expDurationTime');
    var expPlay = document.getElementById('expPlayBtn');
    var expPlayIcon = document.getElementById('expPlayIconWrap');
    var expFav = document.getElementById('expFavBtn');
    var expDl = document.getElementById('expDlBtn');
    var expShuffle = document.getElementById('expShuffleBtn');
    var expRepeat = document.getElementById('expRepeatBtn');

    if (expCur) expCur.textContent = formatTime(appState.currentSecs);
    if (expDur) expDur.innerHTML = formatTime(appState.durationSecs) + (isGuest ? ' <span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 font-mono-bz ms-1" style="font-size:0.65rem;">Vista previa 30s</span>' : '');

    if (expCover) expCover.src = coverUrl;
    if (expVinylLabelImg) expVinylLabelImg.src = coverUrl;
    if (expVinylOrbImg) expVinylOrbImg.src = coverUrl;
    if (expVinylDisc) expVinylDisc.classList.toggle('is-playing', appState.isPlaying && !appState.isAudioLoading);
    if (expBg) expBg.style.backgroundImage = 'url("' + coverUrl + '")';
    if (expTitle) expTitle.innerHTML = (isLic ? '<i class="bi bi-star-fill text-warning me-2 fs-5"></i>' : '') + esc(track.title);
    if (expArtist) expArtist.textContent = track.artist;
    if (expAlbum) expAlbum.textContent = track.albumTitle || album.title;

    if (expPlay) expPlay.classList.toggle('is-playing', appState.isPlaying && !appState.isAudioLoading);
    if (expPlayIcon) {
      expPlayIcon.innerHTML = appState.isAudioLoading
        ? '<span class="spinner-border text-white"></span>'
        : (appState.isPlaying ? '<i class="bi bi-pause-fill fs-2"></i>' : '<i class="bi bi-play-fill fs-2 ms-1"></i>');
    }
    if (expFav) {
      expFav.classList.toggle('is-favorited', isFav);
      expFav.innerHTML = isFav ? '<i class="bi bi-heart-fill fs-5"></i>' : '<i class="bi bi-heart fs-5"></i>';
    }
    if (expDl) {
      expDl.classList.toggle('is-downloaded', isDl);
      expDl.innerHTML = isDl ? '<i class="bi bi-check-circle-fill fs-5"></i>' : '<i class="bi bi-download fs-5"></i>';
    }
    if (expShuffle) expShuffle.style.color = appState.shuffle ? 'var(--bz-lavender)' : '';
    if (expRepeat) {
      expRepeat.style.color = appState.repeatMode !== 'off' ? 'var(--bz-lavender)' : '';
      expRepeat.innerHTML = appState.repeatMode === 'one' ? '<i class="bi bi-repeat-1 fs-5"></i>' : '<i class="bi bi-repeat fs-5"></i>';
    }
    syncVolumeControls();
    renderExpRightPanel();
    if (appState.isSideLyricsOpen) {
      renderSideLyricsPanel();
    }
  }

  // ---- Navegación de Vistas ----
  function syncThemeMode(viewName) {
    var mode = 'catalog';
    if (viewName === 'library-favorites') mode = 'favorites';
    else if (viewName === 'library-playlists' || viewName === 'library-playlist-detail') mode = 'playlists';
    else if (viewName === 'library-licenses') mode = 'licenses';
    else if (viewName === 'downloads') mode = 'downloads';
    document.body.setAttribute('data-theme-mode', mode);
  }

  function navigate(viewName, extra) {
    if (viewName === 'dashboard' && !Auth.isAdmin()) {
      showToast(_t('toast.adminRestricted', 'Acceso restringido: inicia sesión como Administrador para ver el Dashboard.'));
      viewName = 'catalog';
    }

    if (viewName !== 'album' && viewName !== 'artist') {
      appState.prevViewBeforeDetail = viewName;
    }

    appState.view = viewName;
    if (extra && extra.album) appState.selectedAlbum = extra.album;
    if (extra && extra.artist) appState.selectedArtist = extra.artist;
    if (extra && extra.playlistId) appState.selectedPlaylistId = extra.playlistId;

    syncThemeMode(viewName);

    // Fondo dinámico cuando estamos en Álbum o Artista
    var dynBg = document.getElementById('dynamicBgCover');
    if (dynBg) {
      if (viewName === 'album' && appState.selectedAlbum) {
        dynBg.style.backgroundImage = 'url("' + (appState.selectedAlbum.coverUrl || '') + '")';
        dynBg.classList.add('is-visible');
      } else if (viewName === 'artist' && appState.selectedArtist) {
        dynBg.style.backgroundImage = 'url("' + (appState.selectedArtist.img || '') + '")';
        dynBg.classList.add('is-visible');
      } else {
        dynBg.classList.remove('is-visible');
      }
    }

    // Marcar botón activo en Sidebars y Mobile TabBar
    document.querySelectorAll('[data-nav-view]').forEach(function (btn) {
      var target = btn.getAttribute('data-nav-view');
      var isAct =
        target === viewName ||
        (target === 'catalog' && (viewName === 'album' || viewName === 'artist' || viewName === 'catalog')) ||
        (target === 'library-favorites' && viewName.indexOf('library') === 0);
      btn.classList.toggle('is-active', isAct);
    });

    // Ocultar indicador de descargas al entrar a la sección Mis descargas o actualizar si hay nuevas
    if (viewName === 'downloads') {
      markDownloadsAsSeen();
    } else {
      updateDownloadsBadgeUI();
    }
    // Cerrar el menú cajón móvil si estaba abierto
    document.body.classList.remove('bz-drawer-open');

    // Cerrar offcanvas móvil si estaba abierto
    var offcanvasEl = document.getElementById('mobileOffcanvas');
    if (offcanvasEl && window.bootstrap) {
      var inst = window.bootstrap.Offcanvas.getInstance(offcanvasEl);
      if (inst) inst.hide();
    }

    var scrollEl = document.getElementById('bzMainScroll');
    if (scrollEl) scrollEl.scrollTop = 0;

    renderCurrentView();
  }

  function renderCurrentView() {
    var stage = document.getElementById('bzMainStage');
    if (!stage) return;

    try {
      syncThemeMode(appState.view);

      if (appState.loading) {
        stage.innerHTML =
          '<div class="d-flex flex-column align-items-center justify-content-center py-5 my-5 text-center">' +
            '<div class="spinner-border mb-3" style="color:var(--bz-lavender); width:2.8rem; height:2.8rem;" role="status"></div>' +
            '<p class="text-white-50">' + _t('catalog.loading', 'Cargando catálogo de Bitszone…') + '</p>' +
          '</div>';
        return;
      }

      if (appState.view === 'catalog') renderCatalogView(stage);
      else if (appState.view === 'album') renderAlbumView(stage, appState.selectedAlbum);
      else if (appState.view === 'artist') renderArtistView(stage, appState.selectedArtist);
      else if (appState.view.indexOf('library') === 0) renderLibraryView(stage);
      else if (appState.view === 'downloads') renderDownloadsView(stage);
      else if (appState.view === 'dashboard') {
        window.BitszoneDashboard.renderDashboard(stage, {
          notify: showToast,
          onBack: function () { navigate('catalog'); },
          catalogStats: {
            albumsCount: appState.albums.length,
            tracksCount: appState.tracksCount,
            source: appState.catalogSource,
            latencyMs: appState.latencyMs
          }
        });
      }
    } catch (err) {
      console.error('Error al renderizar vista ' + appState.view + ':', err);
    }
  }

  // ---- Vista: Catálogo Principal (Inicio fiel a captura: sin barra de búsqueda superior ni scrollbar horizontal) ----
  function sortAlbumsList(list, sortMode, isSongMode) {
    var copy = list.slice();
    if (sortMode === 'alpha') {
      copy.sort(function (a, b) {
        var nameA = isSongMode && a.tracks && a.tracks[0] ? a.tracks[0].title : a.title;
        var nameB = isSongMode && b.tracks && b.tracks[0] ? b.tracks[0].title : b.title;
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      });
    } else if (sortMode === 'popular') {
      copy.sort(function (a, b) {
        return CatalogApi.getArtistPopularity(b.artist) - CatalogApi.getArtistPopularity(a.artist);
      });
    }
    return copy;
  }

  function renderAlbumCardHtml(album, isSongMode) {
    var mainTrack = album.tracks && album.tracks[0];
    var titleText = isSongMode && mainTrack ? mainTrack.title : album.title;
    var fav = mainTrack ? Storage.isFavorite(mainTrack.id) : false;
    var allDl = album.tracks && album.tracks.length > 0 && album.tracks.every(function (t) { return Storage.isDownloaded(t.id); });
    var dl = isSongMode ? (mainTrack ? Storage.isDownloaded(mainTrack.id) : false) : allDl;
    var lic = mainTrack ? Storage.isLicensed(mainTrack.id) : false;

    var actionButtonsHtml = '';
    if (isSongMode) {
      if (mainTrack) {
        actionButtonsHtml =
          '<div class="d-flex align-items-center gap-1 flex-shrink-0">' +
            '<button type="button" class="bz-icon-action ' + (dl ? 'is-downloaded' : '') + '" data-quick-dl="' + mainTrack.id + '" title="' + (dl ? _t('catalog.trackDownloaded', 'Descargada') : _t('catalog.downloadTrack', 'Descargar canción')) + '">' +
              '<i class="bi ' + (dl ? 'bi-check-circle-fill' : 'bi-download') + '" style="font-size:0.86rem;"></i>' +
            '</button>' +
            '<button type="button" class="bz-icon-action ' + (fav ? 'is-favorited' : '') + '" data-quick-fav="' + mainTrack.id + '" title="' + _t('catalog.favorite', 'Favorito') + '">' +
              '<i class="bi ' + (fav ? 'bi-heart-fill' : 'bi-heart') + '" style="font-size:0.86rem;"></i>' +
            '</button>' +
          '</div>';
      }
    } else {
      actionButtonsHtml =
        '<div class="d-flex align-items-center gap-1 flex-shrink-0">' +
          '<button type="button" class="bz-icon-action ' + (allDl ? 'is-downloaded' : '') + '" data-album-quick-dl="' + esc(album.id) + '" title="' + (allDl ? _t('catalog.albumAlreadyDownloaded', 'Álbum ya descargado') : _t('catalog.downloadFullAlbum', 'Descargar álbum completo')) + '">' +
            '<i class="bi ' + (allDl ? 'bi-check-circle-fill' : 'bi-download') + '" style="font-size:0.86rem;"></i>' +
          '</button>' +
          (mainTrack ? (
            '<button type="button" class="bz-icon-action ' + (fav ? 'is-favorited' : '') + '" data-quick-fav="' + mainTrack.id + '" title="' + _t('catalog.favorite', 'Favorito') + '">' +
              '<i class="bi ' + (fav ? 'bi-heart-fill' : 'bi-heart') + '" style="font-size:0.86rem;"></i>' +
            '</button>'
          ) : '') +
        '</div>';
    }

    return (
      '<div class="bz-catalog-card" data-open-album="' + esc(album.id) + '" data-song-mode="' + (isSongMode ? '1' : '0') + '">' +
        '<div class="bz-cover-box mb-2">' +
          '<img src="' + esc(album.coverUrl) + '" alt="' + esc(titleText) + '" loading="lazy" />' +
          '<div class="bz-cover-overlay">' +
            '<button type="button" class="bz-play-orb" data-card-play="' + esc(album.id) + '" data-song-mode="' + (isSongMode ? '1' : '0') + '" aria-label="' + _t('player.play', 'Reproducir') + ' ' + esc(titleText) + '">' +
              '<i class="bi bi-play-fill"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="d-flex align-items-start justify-content-between gap-2">' +
          '<div class="min-w-0 flex-grow-1">' +
            '<div class="text-white fw-semibold text-truncate" style="font-size:0.9rem;">' +
              (lic ? '<i class="bi bi-star-fill text-warning me-1" style="font-size:0.75rem;"></i>' : '') +
              esc(titleText) +
            '</div>' +
            '<div class="text-white-50 text-truncate" style="font-size: 0.78rem;">' + esc(album.artist) + '</div>' +
          '</div>' +
          actionButtonsHtml +
        '</div>' +
      '</div>'
    );
  }

  function wrapScrollableRow(innerHtml) {
    return (
      '<div class="bz-scroll-row-wrap">' +
        '<button type="button" class="bz-scroll-arrow is-left" aria-label="' + _t('catalog.scrollLeft', 'Desplazar a la izquierda') + '"><i class="bi bi-chevron-left"></i></button>' +
        '<div class="bz-horiz-row">' + innerHtml + '</div>' +
        '<button type="button" class="bz-scroll-arrow is-right" aria-label="' + _t('catalog.scrollRight', 'Desplazar a la derecha') + '"><i class="bi bi-chevron-right"></i></button>' +
      '</div>'
    );
  }

  function initScrollableRows(root) {
    root.querySelectorAll('.bz-scroll-row-wrap').forEach(function (wrap) {
      var row = wrap.querySelector('.bz-horiz-row');
      var leftBtn = wrap.querySelector('.bz-scroll-arrow.is-left');
      var rightBtn = wrap.querySelector('.bz-scroll-arrow.is-right');
      if (!row || !leftBtn || !rightBtn) return;

      function updateArrows() {
        var maxScroll = row.scrollWidth - row.clientWidth;
        var canLeft = row.scrollLeft > 8;
        var canRight = maxScroll > 8 && row.scrollLeft < maxScroll - 8;
        leftBtn.classList.toggle('is-visible', canLeft);
        rightBtn.classList.toggle('is-visible', canRight);
        if (maxScroll > 8) {
          var lMask = canLeft ? 'transparent 0px, black 28px' : 'black 0px, black 28px';
          var rMask = canRight ? 'black calc(100% - 36px), transparent 100%' : 'black calc(100% - 36px), black 100%';
          var grad = 'linear-gradient(to right, ' + lMask + ', ' + rMask + ')';
          row.style.maskImage = grad;
          row.style.webkitMaskImage = grad;
        } else {
          row.style.maskImage = '';
          row.style.webkitMaskImage = '';
        }
      }

      leftBtn.addEventListener('click', function () {
        row.scrollBy({ left: -Math.max(320, row.clientWidth * 0.72), behavior: 'smooth' });
      });
      rightBtn.addEventListener('click', function () {
        row.scrollBy({ left: Math.max(320, row.clientWidth * 0.72), behavior: 'smooth' });
      });
      row.addEventListener('scroll', updateArrows, { passive: true });
      requestAnimationFrame(updateArrows);
    });
  }

  function renderCatalogView(container) {
    var filteredArtists = appState.artists.slice();
    if (appState.artistsSort === 'alpha') {
      filteredArtists.sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
    } else if (appState.artistsSort === 'popular') {
      filteredArtists.sort(function (a, b) { return CatalogApi.getArtistPopularity(b.name) - CatalogApi.getArtistPopularity(a.name); });
    }

    var songsList = sortAlbumsList(appState.albums, appState.songsSort, true);
    var albumsList = sortAlbumsList(appState.albums, appState.albumsSort, false);
    var exp = appState.catalogExpandedSection;
    var sectionsHtml = '';

    function renderBackButtonHtml(btnId) {
      return (
        '<button type="button" id="' + btnId + '" class="bz-back-btn" aria-label="' + _t('catalog.back', 'Atrás') + '">' +
          '<span class="bz-back-icon"><i class="bi bi-arrow-left"></i></span>' +
          '<span class="bz-back-label">' + _t('catalog.back', 'Atrás') + '</span>' +
        '</button>'
      );
    }

    function sectionHeader(title, secKey, sortKey, currentSort) {
      var sortItems = [
        { id: 'default', label: _t('catalog.sortDefault', 'Por defecto') },
        { id: 'alpha', label: _t('catalog.sortAlpha', 'Alfabético (A-Z)') },
        { id: 'popular', label: _t('catalog.sortPopular', 'Más populares') }
      ];
      return (
        '<div class="d-flex align-items-center justify-content-between mb-3 pt-1">' +
          '<div class="d-flex align-items-center gap-2">' +
            (exp ? renderBackButtonHtml('btnCollapseCatalogSection') : '') +
            '<h2 class="h4 fw-bold text-white mb-0">' + title + '</h2>' +
            '<div class="dropdown">' +
              '<button class="btn bz-btn-subtle btn-sm rounded-circle d-flex align-items-center justify-content-center" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="width:30px;height:30px;background:rgba(255,255,255,0.06);border:none;" title="' + _t('catalog.sort', 'Ordenar') + '"><i class="bi bi-filter"></i></button>' +
              '<ul class="dropdown-menu bz-library-popover-menu">' +
                sortItems.map(function (opt) {
                  var act = currentSort === opt.id;
                  return (
                    '<li><button type="button" class="dropdown-item ' + (act ? 'active' : '') + '" data-sort-target="' + sortKey + '" data-sort-val="' + opt.id + '">' +
                      '<span>' + opt.label + '</span>' +
                      (act ? '<i class="bi bi-check2"></i>' : '') +
                    '</button></li>'
                  );
                }).join('') +
              '</ul>' +
            '</div>' +
          '</div>' +
          (!exp ? '<button type="button" class="btn btn-link text-decoration-none small text-white-50 p-0" data-expand-sec="' + secKey + '">' + _t('catalog.showAll', 'Mostrar todo') + '</button>' : '') +
        '</div>'
      );
    }

    if (!exp || exp === 'songs') {
      var listHtml = exp === 'songs'
        ? '<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-xl-6 g-3">' + songsList.map(function (a) { return '<div class="col">' + renderAlbumCardHtml(a, true).replace('bz-catalog-card', 'bz-catalog-card w-100') + '</div>'; }).join('') + '</div>'
        : wrapScrollableRow(songsList.map(function (a) { return renderAlbumCardHtml(a, true); }).join(''));
      sectionsHtml += '<section class="mb-5">' + sectionHeader(_t('catalog.trendingSongs', 'Canciones del momento'), 'songs', 'songsSort', appState.songsSort) + listHtml + '</section>';
    }

    if (!exp || exp === 'artists') {
      var artCards = filteredArtists.map(function (ar) {
        var card =
          '<div class="bz-artist-card ' + (exp === 'artists' ? 'w-100' : '') + '" data-open-artist="' + esc(ar.name) + '">' +
            '<div class="bz-artist-avatar mb-2">' +
              '<img src="' + esc(ar.img) + '" alt="' + esc(ar.name) + '" loading="lazy" />' +
            '</div>' +
            '<div class="text-white fw-semibold text-truncate" style="font-size:0.9rem;">' + esc(ar.name) + '</div>' +
            '<div class="text-white-50" style="font-size:0.75rem;">' + esc(ar.type === 'Grupo Musical' ? _t('catalog.musicalGroup', 'Grupo Musical') : _t('catalog.artistBadge', 'Artista')) + '</div>' +
          '</div>';
        return exp === 'artists' ? '<div class="col">' + card + '</div>' : card;
      }).join('');
      var artHtml = exp === 'artists'
        ? '<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-xl-6 g-4">' + artCards + '</div>'
        : wrapScrollableRow(artCards);
      sectionsHtml += '<section class="mb-5">' + sectionHeader(_t('catalog.popularArtists', 'Artistas populares'), 'artists', 'artistsSort', appState.artistsSort) + artHtml + '</section>';
    }

    if (!exp || exp === 'albums') {
      var albHtml = exp === 'albums'
        ? '<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-xl-6 g-3">' + albumsList.map(function (a) { return '<div class="col">' + renderAlbumCardHtml(a, false).replace('bz-catalog-card', 'bz-catalog-card w-100') + '</div>'; }).join('') + '</div>'
        : wrapScrollableRow(albumsList.map(function (a) { return renderAlbumCardHtml(a, false); }).join(''));
      sectionsHtml += '<section class="mb-4">' + sectionHeader(_t('catalog.featuredAlbums', 'Álbumes destacados'), 'albums', 'albumsSort', appState.albumsSort) + albHtml + '</section>';
    }

    container.innerHTML = sectionsHtml;
    initScrollableRows(container);
    bindCatalogInteractions(container);
  }

  function findTrackById(trackId) {
    for (var i = 0; i < appState.albums.length; i++) {
      var tracks = appState.albums[i].tracks || [];
      for (var j = 0; j < tracks.length; j++) {
        if (Number(tracks[j].id) === Number(trackId)) {
          return { track: tracks[j], album: appState.albums[i] };
        }
      }
    }
    return null;
  }

  function bindCatalogInteractions(container) {
    var collapseBtn = document.getElementById('btnCollapseCatalogSection');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function () {
        appState.catalogExpandedSection = null;
        renderCatalogView(container);
      });
    }
    container.querySelectorAll('[data-expand-sec]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        appState.catalogExpandedSection = btn.getAttribute('data-expand-sec');
        renderCatalogView(container);
      });
    });
    container.querySelectorAll('[data-sort-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-sort-target');
        var v = btn.getAttribute('data-sort-val');
        appState[k] = v;
        renderCatalogView(container);
      });
    });
    container.querySelectorAll('[data-card-play]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var alb = findAlbumById(btn.getAttribute('data-card-play'));
        if (alb && alb.tracks && alb.tracks.length) {
          playTrack(alb.tracks[0], alb, alb.tracks);
        }
      });
    });
    container.querySelectorAll('[data-quick-fav]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        requireAuth('favorites', function () {
          var info = findTrackById(btn.getAttribute('data-quick-fav'));
          if (!info) return;
          var added = Storage.toggleFavorite(info.track);
          showToast(added
            ? _t('toast.favAdded', 'Canción \'{title}\' agregada a tu Biblioteca', { title: info.track.title })
            : _t('toast.favRemoved', 'Canción \'{title}\' eliminada de tu Biblioteca', { title: info.track.title }));
          updatePlayerBarsUI();
          renderCurrentView();
        });
      });
    });
    container.querySelectorAll('[data-quick-dl]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        requireAuth('downloads', function () {
          var info = findTrackById(btn.getAttribute('data-quick-dl'));
          if (!info) return;
          var isNew = Storage.downloadTrack(info.track, false);
          showToast(isNew
            ? _t('toast.downloadSaved', 'Canción \'{title}\' guardada en Mis descargas', { title: info.track.title })
            : _t('toast.alreadyDownloaded', 'La canción ya está en Mis descargas'));
          updateStorageMeterUI();
          renderCurrentView();
        });
      });
    });
    container.querySelectorAll('[data-album-quick-dl]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        requireAuth('downloads', function () {
          var albId = btn.getAttribute('data-album-quick-dl');
          var alb = findAlbumById(albId);
          if (!alb || !alb.tracks || !alb.tracks.length) return;
          var albumTracks = alb.tracks;
          var isAllDownloaded = albumTracks.every(function (t) { return Storage.isDownloaded(t.id); });

          if (isAllDownloaded) {
            openConfirmDialog(
              _t('confirm.delAlbumTitle', '¿Eliminar álbum de descargas?'),
              _t('confirm.delAlbumDesc', 'Se quitarán las {n} canciones del álbum "{album}" de Mis descargas.', { n: albumTracks.length, album: alb.title }),
              function () {
                var ids = albumTracks.map(function (t) { return t.id; });
                Storage.removeTracks(ids);
                updateStorageMeterUI();
                showToast(_t('toast.albumDownloadRemoved', 'Álbum "{album}" eliminado de Mis descargas', { album: alb.title }));
                renderCurrentView();
              },
              _t('confirm.delAlbumConfirmBtn', 'Eliminar álbum'),
              'btn bz-ad-btn-danger py-2.5 px-4 rounded-pill shadow-sm flex-fill',
              'bi-trash3-fill',
              _t('nav.downloads', 'Mis descargas')
            );
          } else {
            var missing = albumTracks.filter(function (t) { return !Storage.isDownloaded(t.id); });
            var totalMb = missing.reduce(function (sum, t) {
              return sum + (Storage.calculateTrackMb ? Storage.calculateTrackMb(t) : (Number(t.sizeMb) || 3.8));
            }, 0);

            openConfirmDialog(
              _t('confirm.downloadAlbumTitle', '¿Descargar álbum completo?'),
              _t('confirm.downloadAlbumDesc', 'Se descargarán {n} canciones del álbum "{album}" (~{mb} MB) en Mis descargas para escucharlas sin conexión.', { n: missing.length, album: alb.title, mb: totalMb.toFixed(1) }),
              function () {
                downloadAlbumProgressively(alb, missing, function () {
                  renderCurrentView();
                });
              },
              _t('confirm.downloadAlbumConfirmBtn', 'Descargar álbum'),
              'btn bz-ad-btn-primary py-2.5 px-4 rounded-pill shadow-sm flex-fill',
              'bi-cloud-arrow-down-fill',
              _t('confirm.downloadAlbumBadge', 'Descarga de álbum')
            );
          }
        });
      });
    });
    container.querySelectorAll('[data-open-album]').forEach(function (el) {
      el.addEventListener('click', function () {
        var alb = findAlbumById(el.getAttribute('data-open-album'));
        if (alb) navigate('album', { album: alb });
      });
    });
    container.querySelectorAll('[data-open-artist]').forEach(function (el) {
      el.addEventListener('click', function () {
        var name = el.getAttribute('data-open-artist');
        var found = appState.artists.find(function (ar) { return ar.name === name; });
        if (found) navigate('artist', { artist: found });
      });
    });
  }

  function formatAlbumDurationPretty(ms) {
    var total = ms || 0;
    var h = Math.floor(total / 3600000);
    var m = Math.floor((total % 3600000) / 60000);
    var s = Math.floor((total % 60000) / 1000);
    return h > 0 ? (h + ' h ' + m + ' min') : (m + ' min ' + s + ' s');
  }

  function renderBackBtnNode(btnId) {
    return (
      '<button type="button" id="' + btnId + '" class="bz-back-btn" aria-label="Atrás">' +
        '<span class="bz-back-icon"><i class="bi bi-arrow-left"></i></span>' +
        '<span class="bz-back-label">Atrás</span>' +
      '</button>'
    );
  }

  // ---- Vista: Álbum / Playlist (Fiel a AlbumView.tsx 2 columnas sin caja en pistas) ----
  function renderAlbumView(container, albumObj, isPlaylist) {
    if (!albumObj) {
      navigate('catalog');
      return;
    }
    var tracks = albumObj.tracks || [];
    var totalMs = albumObj.totalDuration || tracks.reduce(function (s, t) { return s + (t.duration || 0); }, 0);
    var allFav = tracks.length > 0 && tracks.every(function (t) { return Storage.isFavorite(t.id); });
    var allDl = tracks.length > 0 && tracks.every(function (t) { return Storage.isDownloaded(t.id); });

    var leftColHtml =
      '<div class="col-12 col-lg-5 d-flex flex-column align-items-center text-center">' +
        '<div class="bz-album-cover-wrap">' +
          '<div class="bz-album-cover-box">' +
            '<img src="' + esc(albumObj.coverUrl) + '" alt="' + esc(albumObj.title) + '" />' +
            '<div class="bz-glass-sheen"></div>' +
          '</div>' +
          '<div class="bz-album-action-dock">' +
            '<button type="button" id="btnAlbumPlayAll" class="bz-album-play-pill" title="' + _t('album.playAll', 'Reproducir todo') + '">' +
              '<i class="bi bi-play-fill fs-5"></i><span>' + _t('album.playAll', 'Reproducir todo') + '</span>' +
            '</button>' +
            (!isPlaylist ? (
              '<button type="button" id="btnAlbumFavAll" class="bz-album-dock-btn ' + (allFav ? 'is-favorited' : '') + '" title="' + (allFav ? _t('album.favRemove', 'Quitar álbum de favoritos') : _t('album.favAdd', 'Añadir álbum a favoritos')) + '">' +
                '<i class="bi ' + (allFav ? 'bi-heart-fill' : 'bi-heart') + ' fs-5"></i>' +
              '</button>'
            ) : '') +
            '<button type="button" id="btnAlbumDownloadAll" class="bz-album-dock-btn ' + (allDl ? 'is-downloaded' : '') + '" title="' + (allDl ? _t('album.downloaded', 'Álbum ya descargado') : _t('album.download', 'Descargar álbum')) + '">' +
              '<i class="bi ' + (allDl ? 'bi-check-circle-fill' : 'bi-download') + ' fs-5"></i>' +
            '</button>' +
            '<div class="dropdown">' +
              '<button type="button" class="bz-album-dock-btn" data-bs-toggle="dropdown" aria-expanded="false" title="' + _t('album.more', 'Más opciones') + '">' +
                '<i class="bi bi-three-dots fs-5"></i>' +
              '</button>' +
              '<ul class="dropdown-menu dropdown-menu-end bz-library-popover-menu">' +
                '<li><button type="button" class="dropdown-item" id="btnAlbumAddQueue"><span>' + _t('album.addToQueue', 'Añadir a la cola') + '</span><i class="bi bi-list-ol"></i></button></li>' +
                (isPlaylist
                  ? '<li><button type="button" class="dropdown-item text-danger" id="btnPlaylistDelete"><span>' + _t('album.deletePlaylist', 'Eliminar lista') + '</span><i class="bi bi-trash"></i></button></li>'
                  : '<li><button type="button" class="dropdown-item" id="btnAlbumSaveAsPl"><span>' + _t('album.saveAsNew', 'Guardar como lista nueva') + '</span><i class="bi bi-music-note-list"></i></button></li>') +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="mt-2 w-100 px-2">' +
          '<span class="text-white-50 text-uppercase fw-semibold d-block mb-1" style="font-size:0.72rem; letter-spacing:0.24em;">' + (isPlaylist ? _t('album.typePlaylist', 'Lista de reproducción') : _t('album.typeAlbum', 'Álbum')) + '</span>' +
          '<h1 class="fw-bold text-white mb-2" style="font-size: clamp(1.75rem, 2.75vw, 2.95rem); line-height: 1.1; letter-spacing: -0.02em; overflow-wrap: break-word;">' + esc(albumObj.title) + '</h1>' +
          '<div class="d-flex flex-wrap align-items-center justify-content-center gap-2 text-white-50" style="font-size:0.9rem;">' +
            '<button type="button" id="btnAlbumToArtist" class="btn btn-link p-0 text-white fw-semibold text-uppercase text-decoration-none bz-hover-white" style="font-size:0.9rem; letter-spacing:0.04em;">' + esc(albumObj.artist) + '</button>' +
            '<span>•</span><span>' + esc(albumObj.year || '2024') + '</span>' +
            '<span>•</span><span>' + tracks.length + ' ' + (tracks.length === 1 ? _t('catalog.song', 'canción') : _t('catalog.songs', 'canciones')) + '</span>' +
            (totalMs ? ('<span>•</span><span>' + formatAlbumDurationPretty(totalMs) + '</span>') : '') +
          '</div>' +
        '</div>' +
      '</div>';

    var isAuth = isUserAuthenticated();

    var rightColHtml =
      '<div class="col-12 col-lg-7">' +
        (tracks.length === 0
          ? '<div class="py-5 text-center text-white-50">' + _t('album.emptyPlaylist', 'Esta lista aún no tiene canciones. Usa el botón + en cualquier canción del catálogo para agregarla.') + '</div>'
          : '<div class="bz-album-tracklist-scroll">' +
              tracks.map(function (t, i) {
                var playing = appState.nowPlayingTrack && Number(appState.nowPlayingTrack.id) === Number(t.id);
                var fav = Storage.isFavorite(t.id);
                var dl = Storage.isDownloaded(t.id);
                var lic = Storage.isLicensed(t.id);
                var timeDisplay = isAuth ? formatDurationMs(t.duration) : _t('album.preview30s', '30s preview');
                return (
                  '<div class="bz-album-track-row ' + (playing ? 'is-playing' : '') + '" data-row-play-idx="' + i + '">' +
                    '<div class="bz-row-idx-wrap text-white-50 font-mono-bz small">' +
                      (playing && appState.isPlaying
                        ? '<div class="fx-eq" style="width:18px;"><i></i><i></i><i></i></div>'
                        : '<span class="bz-row-idx-num">' + (t.trackNumber || (i + 1)) + '</span><span class="bz-row-play-glyph"><i class="bi bi-play-fill fs-5"></i></span>') +
                    '</div>' +
                    '<div class="min-w-0">' +
                      '<div class="fw-semibold text-white text-truncate" style="font-size:0.95rem;">' +
                        (lic ? '<i class="bi bi-star-fill text-warning me-1 small"></i>' : '') +
                        esc(t.title) +
                      '</div>' +
                      '<div class="text-white-50 text-truncate" style="font-size:0.78rem;">' + esc(t.artist) + '</div>' +
                    '</div>' +
                    '<div class="d-flex align-items-center gap-2">' +
                      '<div class="bz-row-hover-actions">' +
                        '<button type="button" class="bz-icon-action" data-row-addpl="' + t.id + '" title="' + _t('album.addToPlaylist', 'Agregar a playlist') + '"><i class="bi bi-plus-circle"></i></button>' +
                        '<button type="button" class="bz-icon-action ' + (dl ? 'is-downloaded' : '') + '" data-row-dl="' + t.id + '" title="' + _t('album.saveToDownloads', 'Guardar en descargas') + '"><i class="bi ' + (dl ? 'bi-check-circle-fill' : 'bi-download') + '"></i></button>' +
                        '<button type="button" class="bz-icon-action ' + (fav ? 'is-favorited' : '') + '" data-row-fav="' + t.id + '" title="' + _t('catalog.favorite', 'Favorito') + '"><i class="bi ' + (fav ? 'bi-heart-fill' : 'bi-heart') + '"></i></button>' +
                        (isPlaylist ? '<button type="button" class="bz-icon-action text-danger" data-row-rmpl="' + t.id + '" title="' + _t('album.removeFromPlaylist', 'Quitar de playlist') + '"><i class="bi bi-x-circle"></i></button>' : '') +
                      '</div>' +
                      '<span class="font-mono-bz small text-white-50 text-end text-nowrap" style="min-width:' + (isAuth ? '42px' : '78px') + ';">' + timeDisplay + '</span>' +
                    '</div>' +
                  '</div>'
                );
              }).join('') +
            '</div>') +
      '</div>';

    container.innerHTML =
      '<div class="bz-detail-viewport">' +
        '<div class="bz-detail-back-pin">' + renderBackBtnNode('btnAlbumBack') + '</div>' +
        '<div class="bz-detail-split"><div class="row g-4 g-lg-5 align-items-center justify-content-center">' +
          leftColHtml + rightColHtml +
        '</div></div>' +
      '</div>';

    document.getElementById('btnAlbumBack').addEventListener('click', function () {
      navigate(isPlaylist ? 'library-playlists' : (appState.prevViewBeforeDetail || 'catalog'));
    });

    var artBtn = document.getElementById('btnAlbumToArtist');
    if (artBtn && !isPlaylist) {
      artBtn.addEventListener('click', function () {
        var found = appState.artists.find(function (a) { return a.name === albumObj.artist; });
        if (found) navigate('artist', { artist: found });
      });
    }

    var playAll = document.getElementById('btnAlbumPlayAll');
    if (playAll) {
      playAll.addEventListener('click', function () {
        if (tracks.length) playTrack(tracks[0], albumObj, tracks);
      });
    }

    var favAllBtn = document.getElementById('btnAlbumFavAll');
    if (favAllBtn) {
      favAllBtn.addEventListener('click', function () {
        if (!tracks.length) return;
        requireAuth('favorites', function () {
          var shouldRemove = tracks.every(function (t) { return Storage.isFavorite(t.id); });
          tracks.forEach(function (t) {
            var isFav = Storage.isFavorite(t.id);
            if (shouldRemove && isFav) Storage.toggleFavorite(t);
            else if (!shouldRemove && !isFav) Storage.toggleFavorite(t);
          });
          showToast(shouldRemove ? _t('toast.favoriteRemoved', 'Álbum quitado de favoritos') : _t('toast.favoriteAdded', 'Álbum guardado en favoritos'));
          updatePlayerBarsUI();
          renderAlbumView(container, albumObj, isPlaylist);
        });
      });
    }

    var dlAll = document.getElementById('btnAlbumDownloadAll');
    if (dlAll) {
      dlAll.addEventListener('click', function () {
        requireAuth('downloads', function () {
          var fullAlbum = findAlbumById(albumObj.id) || findAlbumById(albumObj.title) || albumObj;
          var albumTracks = (fullAlbum.tracks && fullAlbum.tracks.length) ? fullAlbum.tracks : tracks;
          if (!albumTracks.length) return;

          var isAllDownloaded = albumTracks.every(function (t) { return Storage.isDownloaded(t.id); });

          if (isAllDownloaded) {
            openConfirmDialog(
              _t('confirm.delAlbumTitle', '¿Eliminar álbum de descargas?'),
              _t('confirm.delAlbumDesc', 'Se quitarán las {n} canciones del álbum "{album}" de Mis descargas.', { n: albumTracks.length, album: albumObj.title }),
              function () {
                var ids = albumTracks.map(function (t) { return t.id; });
                Storage.removeTracks(ids);
                updateStorageMeterUI();
                showToast(_t('toast.albumDownloadRemoved', 'Álbum "{album}" eliminado de Mis descargas', { album: albumObj.title }));
                renderAlbumView(container, albumObj, isPlaylist);
              },
              _t('downloads.removeDownload', 'Eliminar álbum'),
              'btn bz-ad-btn-danger py-2.5 px-4 rounded-pill shadow-sm flex-fill',
              'bi-trash3-fill',
              _t('downloads.kicker', 'Mis descargas')
            );
          } else {
            var missing = albumTracks.filter(function (t) { return !Storage.isDownloaded(t.id); });
            var totalMb = missing.reduce(function (sum, t) {
              return sum + (Storage.calculateTrackMb ? Storage.calculateTrackMb(t) : (Number(t.sizeMb) || 3.8));
            }, 0);

            openConfirmDialog(
              _t('confirm.downloadAlbumTitle', '¿Descargar álbum completo?'),
              _t('confirm.downloadAlbumDesc', 'Se descargarán {n} canciones del álbum "{album}" (~{mb} MB) en Mis descargas para escucharlas sin conexión.', { n: missing.length, album: albumObj.title, mb: totalMb.toFixed(1) }),
              function () {
                downloadAlbumProgressively(albumObj, missing, function () {
                  renderAlbumView(container, albumObj, isPlaylist);
                });
              },
              _t('album.download', 'Descargar álbum'),
              'btn bz-ad-btn-primary py-2.5 px-4 rounded-pill shadow-sm flex-fill',
              'bi-cloud-arrow-down-fill',
              _t('album.typeAlbum', 'Descarga de álbum')
            );
          }
        });
      });
    }

    var addQueueBtn = document.getElementById('btnAlbumAddQueue');
    if (addQueueBtn) {
      addQueueBtn.addEventListener('click', function () {
        requireAuth('queue', function () {
          if (!tracks.length) return;
          if (!appState.nowPlayingTrack) {
            playTrack(tracks[0], albumObj, tracks);
          } else {
            appState.queue = appState.queue.concat(tracks);
            showToast(_t('toast.trackAddedQueue', '{n} canciones añadidas a la cola', { n: tracks.length }));
            updatePlayerBarsUI();
          }
        });
      });
    }

    var savePlBtn = document.getElementById('btnAlbumSaveAsPl');
    if (savePlBtn) {
      savePlBtn.addEventListener('click', function () {
        requireAuth('playlists', function () {
          var created = Storage.createPlaylist(albumObj.title);
          if (created) {
            tracks.forEach(function (t) { Storage.addTrackToPlaylist(created.id, t); });
            showToast(_t('toast.playlistCreated', 'Playlist "{name}" guardada en tu biblioteca', { name: created.name }));
          }
        });
      });
    }

    var rmPlBtn = document.getElementById('btnPlaylistDelete');
    if (rmPlBtn && isPlaylist) {
      rmPlBtn.addEventListener('click', function () {
        Storage.deletePlaylist(albumObj.id);
        showToast(_t('toast.playlistDeleted', 'Playlist "{name}" eliminada', { name: albumObj.title }));
        navigate('library-playlists');
      });
    }

    container.querySelectorAll('[data-row-play-idx]').forEach(function (row) {
      row.addEventListener('click', function () {
        var i = Number(row.getAttribute('data-row-play-idx'));
        if (tracks[i]) playTrack(tracks[i], albumObj, tracks);
      });
    });

    container.querySelectorAll('[data-row-fav]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        requireAuth('favorites', function () {
          var tid = Number(btn.getAttribute('data-row-fav'));
          var tr = tracks.find(function (x) { return Number(x.id) === tid; });
          if (!tr) return;
          var added = Storage.toggleFavorite(tr);
          showToast(added ? _t('toast.favoriteAdded', 'Agregada a favoritos') : _t('toast.favoriteRemoved', 'Quitada de favoritos'));
          updatePlayerBarsUI();
          renderAlbumView(container, albumObj, isPlaylist);
        });
      });
    });

    container.querySelectorAll('[data-row-dl]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        requireAuth('downloads', function () {
          var tid = Number(btn.getAttribute('data-row-dl'));
          var tr = tracks.find(function (x) { return Number(x.id) === tid; });
          if (!tr) return;
          var isNew = Storage.downloadTrack(tr, false);
          updateStorageMeterUI();
          showToast(isNew ? _t('toast.downloaded', 'Canción "{title}" guardada en Mis descargas', { title: tr.title }) : _t('toast.downloadExists', 'La canción ya está en Mis descargas'));
          renderAlbumView(container, albumObj, isPlaylist);
        });
      });
    });

    container.querySelectorAll('[data-row-addpl]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tid = Number(btn.getAttribute('data-row-addpl'));
        var tr = tracks.find(function (x) { return Number(x.id) === tid; });
        if (tr) openAddToPlaylistModal(tr);
      });
    });

    container.querySelectorAll('[data-row-rmpl]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tid = Number(btn.getAttribute('data-row-rmpl'));
        var updatedPl = Storage.removeTrackFromPlaylist(albumObj.id, tid);
        showToast(_t('toast.playlistDeleted', 'Canción removida de la playlist'));
        if (updatedPl) {
          albumObj.tracks = updatedPl.tracks;
          renderAlbumView(container, albumObj, true);
        }
      });
    });
  }

  // ---- Vista: Artista (Fiel a ArtistView.tsx 2 columnas con halo circular & discografía en 2 columnas) ----
  function renderArtistView(container, artist) {
    if (!artist) {
      navigate('catalog');
      return;
    }
    var artistAlbums = appState.albums.filter(function (a) { return a.artist === artist.name || a.artist === artist.rawName; });
    var allSongs = [];
    artistAlbums.forEach(function (a) { allSongs = allSongs.concat(a.tracks || []); });

    var leftColHtml =
      '<div class="col-12 col-lg-5 d-flex flex-column align-items-center text-center">' +
        '<div class="bz-artist-hero-wrap">' +
          '<div class="bz-artist-halo" style="background-image:url(\'' + esc(artist.img) + '\');"></div>' +
          '<div class="bz-artist-hero-img">' +
            '<img src="' + esc(artist.img) + '" alt="' + esc(artist.name) + '" />' +
            '<div class="bz-glass-sheen rounded-circle"></div>' +
          '</div>' +
        '</div>' +
        '<span class="text-white-50 text-uppercase fw-semibold d-block mb-1" style="font-size:0.72rem; letter-spacing:0.25em;">' + esc(artist.type === 'Grupo Musical' ? _t('catalog.musicalGroup', 'Grupo Musical') : _t('catalog.artistBadge', 'Artista')) + '</span>' +
        '<h1 class="fw-bold text-white mb-2" style="font-size: clamp(1.9rem, 3.5vw, 3.15rem); letter-spacing: -0.02em;">' + esc(artist.name) + '</h1>' +
        '<p class="text-white-50 mb-4" style="font-size:0.95rem;">' +
          artistAlbums.length + ' ' + _t(artistAlbums.length === 1 ? 'common.albumSingular' : 'common.albumsPlural', artistAlbums.length === 1 ? 'álbum' : 'álbumes') + ' · ' +
          allSongs.length + ' ' + _t(allSongs.length === 1 ? 'common.songSingular' : 'common.songsPlural', allSongs.length === 1 ? 'canción' : 'canciones') +
        '</p>' +
        '<button type="button" id="btnArtistPlayAll" class="bz-album-play-pill"><i class="bi bi-play-fill fs-5"></i><span>' + esc(_t('album.playAll', 'Reproducir todo')) + '</span></button>' +
      '</div>';

    var rightColHtml =
      '<div class="col-12 col-lg-7">' +
        '<div class="d-flex align-items-center justify-content-between mb-3 px-1">' +
          '<h2 class="h4 fw-bold text-white mb-0">' + esc(_t('artist.discography', 'Discografía')) + '</h2>' +
          '<span class="small text-white-50 fw-medium">' + artistAlbums.length + ' ' + _t(artistAlbums.length === 1 ? 'artist.releaseSingular' : 'artist.releasesPlural', artistAlbums.length === 1 ? 'lanzamiento' : 'lanzamientos') + '</span>' +
        '</div>' +
        (artistAlbums.length === 0
          ? '<div class="py-5 text-center text-white-50">' + esc(_t('artist.empty', 'No hay álbumes disponibles para este artista en el catálogo.')) + '</div>'
          : '<div class="bz-album-tracklist-scroll" style="padding-left:0.25rem;">' +
              '<div class="row row-cols-2 g-4">' +
                artistAlbums.map(function (a) {
                  return (
                    '<div class="col">' +
                      '<div class="bz-catalog-card w-100" data-open-album="' + esc(a.id) + '">' +
                        '<div class="bz-cover-box mb-2">' +
                          '<img src="' + esc(a.coverUrl) + '" alt="' + esc(a.title) + '" loading="lazy" />' +
                          '<div class="bz-cover-overlay">' +
                            '<button type="button" class="bz-play-orb" data-card-play="' + esc(a.id) + '" aria-label="' + esc(_t('catalog.playAria', 'Reproducir {title}', { title: a.title })) + '"><i class="bi bi-play-fill"></i></button>' +
                          '</div>' +
                        '</div>' +
                        '<div class="text-white fw-semibold text-truncate" style="font-size:0.95rem;">' + esc(a.title) + '</div>' +
                        '<div class="text-white-50" style="font-size:0.78rem;">' + esc(a.year || '2024') + ' · ' + (a.tracks ? a.tracks.length : 0) + ' ' + _t((a.tracks && a.tracks.length === 1) ? 'common.songSingular' : 'common.songsPlural', 'canciones') + '</div>' +
                      '</div>' +
                    '</div>'
                  );
                }).join('') +
              '</div>' +
            '</div>') +
      '</div>';

    container.innerHTML =
      '<div class="bz-detail-viewport">' +
        '<div class="bz-detail-back-pin">' + renderBackBtnNode('btnArtistBack') + '</div>' +
        '<div class="bz-detail-split"><div class="row g-4 g-lg-5 align-items-center justify-content-center">' +
          leftColHtml + rightColHtml +
        '</div></div>' +
      '</div>';

    document.getElementById('btnArtistBack').addEventListener('click', function () {
      navigate(appState.prevViewBeforeDetail || 'catalog');
    });
    document.getElementById('btnArtistPlayAll').addEventListener('click', function () {
      if (allSongs.length && artistAlbums[0]) playTrack(allSongs[0], artistAlbums[0], allSongs);
    });
    bindCatalogInteractions(container);
  }

  // ---- Helper Común: Biblioteca & Mis Descargas (SectionHero + Toolbar + Listas/Álbumes/EmptyState) ----
  function renderLibraryHeroDropdownHtml(activeLibTab, titleText) {
    return (
      '<div class="dropdown d-inline-block">' +
        '<button type="button" class="bz-library-dropdown-btn" data-bs-toggle="dropdown" aria-expanded="false">' +
          '<span>' + esc(titleText) + '</span>' +
          '<i class="bi bi-chevron-down"></i>' +
        '</button>' +
        '<ul class="dropdown-menu bz-library-popover-menu">' +
          '<li><button type="button" class="dropdown-item ' + (activeLibTab === 'favorites' ? 'active' : '') + '" data-switch-lib="library-favorites"><span>' + esc(_t('library.favorites', 'Canciones favoritas')) + '</span><i class="bi bi-heart"></i></button></li>' +
          '<li><button type="button" class="dropdown-item ' + (activeLibTab === 'playlists' ? 'active' : '') + '" data-switch-lib="library-playlists"><span>' + esc(_t('library.playlists', 'Listas de reproducción')) + '</span><i class="bi bi-music-note-list"></i></button></li>' +
          '<li><button type="button" class="dropdown-item ' + (activeLibTab === 'licenses' ? 'active' : '') + '" data-switch-lib="library-licenses"><span>' + esc(_t('library.licenses', 'Canciones con licencia')) + '</span><i class="bi bi-star"></i></button></li>' +
        '</ul>' +
      '</div>'
    );
  }

  function renderCollectionSection(container, cfg) {
    // cfg: { kind: 'favorites' | 'licenses' | 'downloads', title, kicker, iconClass, tracks, statePrefix: 'lib'|'dl', emptyTitle, emptyText, searchPlaceholder, libTab }
    var pfx = cfg.statePrefix;
    var viewModeKey = pfx + 'ViewMode';
    var sortByKey = pfx + 'SortBy';
    var searchKey = pfx + 'Search';
    var selAlbumKey = pfx + 'SelectedAlbumId';

    var viewMode = appState[viewModeKey] || 'canciones';
    var sortBy = appState[sortByKey] || 'default';
    var search = (appState[searchKey] || '').trim();
    var q = search.toLowerCase();
    var selAlbumId = appState[selAlbumKey];

    var rawTracks = cfg.tracks || [];
    var filteredTracks = rawTracks.filter(function (t) {
      if (!q) return true;
      return (t.title || '').toLowerCase().indexOf(q) !== -1 ||
             (t.artist || '').toLowerCase().indexOf(q) !== -1 ||
             (t.albumTitle || '').toLowerCase().indexOf(q) !== -1;
    });

    // Agrupación por álbum
    var albumMap = {};
    filteredTracks.forEach(function (t) {
      var aid = t.albumId ? String(t.albumId) : ('alb_' + (t.albumTitle || 'misc'));
      if (!albumMap[aid]) {
        albumMap[aid] = {
          id: aid,
          title: t.albumTitle || _t('library.singleSongs', 'Canciones sueltas'),
          artist: t.artist || _t('library.various', 'Varios'),
          coverUrl: t.albumCover || './assets/img/bitszone-icon.png',
          tracks: []
        };
      }
      albumMap[aid].tracks.push(t);
    });
    var groups = Object.keys(albumMap).map(function (k) { return albumMap[k]; });

    // Ordenar pistas
    filteredTracks.sort(function (a, b) {
      if (sortBy === 'recent') return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
      if (sortBy === 'alpha') return (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' });
      if (sortBy === 'size_desc') return (Number(b.sizeMb) || 3.8) - (Number(a.sizeMb) || 3.8);
      if (sortBy === 'size_asc') return (Number(a.sizeMb) || 3.8) - (Number(b.sizeMb) || 3.8);
      return 0;
    });

    // Estadísticas globales sin filtro para el Hero
    var totalAlbumMap = {};
    rawTracks.forEach(function (t) { totalAlbumMap[t.albumId || t.albumTitle || t.id] = true; });
    var totalAlbumsCount = Object.keys(totalAlbumMap).length;
    var usedMb = Storage.getUsedMb ? Storage.getUsedMb() : (Storage.getUsedBytes() / (1024 * 1024));
    var baseMb = Storage.BASE_STORAGE_MB || 5120.0;
    var availMb = Math.max(0, baseMb - usedMb);

    var statsHtml =
      '<span class="bz-hero-stat-pill"><i class="bi bi-music-note-beamed"></i> ' + rawTracks.length + ' ' + _t(rawTracks.length === 1 ? 'common.songSingular' : 'common.songsPlural', 'canciones') + '</span>' +
      '<span class="bz-hero-stat-pill"><i class="bi bi-disc"></i> ' + totalAlbumsCount + ' ' + _t(totalAlbumsCount === 1 ? 'common.albumSingular' : 'common.albumsPlural', 'álbumes') + '</span>' +
      (cfg.kind === 'downloads'
        ? '<span class="bz-hero-stat-pill"><i class="bi bi-hdd"></i> ' + _t('downloads.storageStats', '{free} MB libres de 5.00 GB ({used} MB ocupados)', { free: availMb.toFixed(1), used: usedMb.toFixed(1) }) + '</span>'
        : '');

    var heroTitleNode = cfg.kind === 'downloads'
      ? '<span>' + esc(cfg.title) + '</span>'
      : renderLibraryHeroDropdownHtml(cfg.libTab, cfg.title);

    var heroActions = rawTracks.length ? (
      '<div class="d-flex gap-2">' +
        '<button type="button" id="btnColPlayAll" class="btn bz-btn-hero-subtle btn-sm px-3 py-2"><i class="bi bi-play-fill me-1"></i>' + esc(_t('library.playAll', 'Escuchar todo')) + '</button>' +
        (cfg.kind === 'downloads' ? '<button type="button" id="btnColClearDownloads" class="btn btn-outline-danger btn-sm rounded-pill px-3 py-2"><i class="bi bi-trash me-1"></i>' + esc(_t('downloads.clearAll', 'Vaciar')) + '</button>' : '') +
      '</div>'
    ) : '';

    var heroHtml =
      '<div class="bz-section-hero">' +
        '<div class="d-flex align-items-center gap-3 gap-md-4 min-w-0">' +
          '<div class="bz-hero-icon-tile is-' + cfg.kind + '"><i class="bi ' + cfg.iconClass + '"></i></div>' +
          '<div class="d-flex flex-column gap-1 min-w-0">' +
            '<span class="bz-hero-kicker">' + esc(cfg.kicker) + '</span>' +
            '<div class="bz-hero-title">' + heroTitleNode + '</div>' +
            '<div class="d-flex flex-wrap gap-2 mt-2">' + statsHtml + '</div>' +
          '</div>' +
        '</div>' +
        heroActions +
      '</div>';

    var sortLabels = {
      'default': _t('catalog.sortDefault', 'Por defecto'),
      'recent': _t('catalog.sortRecent', 'Añadidos recientemente'),
      'alpha': _t('catalog.sortAlpha', 'Alfabéticamente'),
      'size_desc': _t('catalog.sortSizeDesc', 'Más pesados'),
      'size_asc': _t('catalog.sortSizeAsc', 'Menos pesados')
    };

    var toolbarHtml =
      '<div class="bz-toolbar-row">' +
        '<div class="bz-segmented-pill">' +
          '<button type="button" class="bz-segmented-btn ' + (viewMode === 'canciones' ? 'is-active' : '') + '" data-col-mode="canciones"><i class="bi bi-music-note-beamed"></i><span>' + esc(_t('library.modeSongs', 'Canciones')) + '</span></button>' +
          '<button type="button" class="bz-segmented-btn ' + (viewMode === 'albumes' ? 'is-active' : '') + '" data-col-mode="albumes"><i class="bi bi-disc"></i><span>' + esc(_t('library.modeAlbums', 'Álbumes')) + '</span></button>' +
        '</div>' +
        '<div class="dropdown">' +
          '<button type="button" class="bz-sort-pill" data-bs-toggle="dropdown" aria-expanded="false">' +
            '<i class="bi bi-arrow-down-up text-white-50"></i>' +
            '<span class="text-white-50 d-none d-sm-inline">' + esc(_t('catalog.sortBy', 'Ordenar:')) + '</span>' +
            '<span>' + esc(sortLabels[sortBy] || 'Por defecto') + '</span>' +
            '<i class="bi bi-chevron-down small text-white-50 ms-1"></i>' +
          '</button>' +
          '<ul class="dropdown-menu bz-library-popover-menu">' +
            ['default', 'recent', 'alpha', 'size_desc', 'size_asc'].map(function (optId) {
              return '<li><button type="button" class="dropdown-item ' + (sortBy === optId ? 'active' : '') + '" data-col-sort="' + optId + '"><span>' + esc(sortLabels[optId]) + '</span>' + (sortBy === optId ? '<i class="bi bi-check2"></i>' : '') + '</button></li>';
            }).join('') +
          '</ul>' +
        '</div>' +
        '<div class="bz-search-pill-wrap">' +
          '<i class="bi bi-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); z-index: 10; pointer-events: none; color: rgba(255, 255, 255, 0.55); font-size: 0.88rem;"></i>' +
          '<input id="colSearchInput" type="text" class="bz-search-pill-input" placeholder="' + esc(cfg.searchPlaceholder) + '" value="' + esc(appState[searchKey] || '') + '" />' +
          (search ? '<button type="button" id="colSearchClear" class="btn btn-link position-absolute top-50 end-0 translate-middle-y text-white-50 p-1 me-1 text-decoration-none" style="z-index: 10;"><i class="bi bi-x"></i></button>' : '') +
        '</div>' +
      '</div>';

    var bodyHtml = '';
    if (rawTracks.length === 0 && !search) {
      bodyHtml =
        '<div class="bz-section-empty">' +
          '<div class="bz-empty-orb is-' + cfg.kind + '"><i class="bi ' + cfg.iconClass + '"></i></div>' +
          '<h3 class="h4 fw-bold text-white mb-0">' + esc(cfg.emptyTitle) + '</h3>' +
          '<p class="text-white-50 small mb-0" style="max-width:340px;line-height:1.55;">' + esc(cfg.emptyText) + '</p>' +
        '</div>';
    } else if (filteredTracks.length === 0) {
      bodyHtml =
        '<div class="bz-section-empty py-5">' +
          '<p class="text-white-50">' + esc(_t('library.noResults', 'No se encontraron canciones para')) + ' "' + esc(search) + '".</p>' +
        '</div>';
    } else if (viewMode === 'albumes') {
      var activeGroup = selAlbumId ? groups.find(function (g) { return g.id === selAlbumId; }) : null;
      if (activeGroup) {
        bodyHtml =
          '<div class="mb-3">' +
            '<button type="button" id="btnColBackToAlbums" class="btn bz-btn-subtle btn-sm px-3 py-1 mb-3"><i class="bi bi-arrow-left me-1"></i>' + esc(_t('library.allAlbums', 'Todos los álbumes')) + '</button>' +
            '<div class="d-flex align-items-center gap-3 mb-4">' +
              '<img src="' + esc(activeGroup.coverUrl) + '" width="76" height="76" class="rounded-4 object-fit-cover shadow" alt="" />' +
              '<div><h4 class="fw-bold text-white mb-0">' + esc(activeGroup.title) + '</h4><div class="small text-white-50">' + esc(activeGroup.artist) + ' · ' + activeGroup.tracks.length + ' ' + _t(activeGroup.tracks.length === 1 ? 'common.songSingular' : 'common.songsPlural', 'canciones') + '</div></div>' +
            '</div>' +
            renderTracksTableHtml(activeGroup.tracks, cfg.kind) +
          '</div>';
      } else {
        bodyHtml =
          '<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-xl-6 g-3 pt-2">' +
            groups.map(function (g) {
              return (
                '<div class="col">' +
                  '<div class="bz-catalog-card w-100" data-col-open-alb="' + esc(g.id) + '">' +
                    '<div class="bz-cover-box mb-2">' +
                      '<img src="' + esc(g.coverUrl) + '" alt="' + esc(g.title) + '" loading="lazy" />' +
                      '<span class="position-absolute bottom-0 end-0 m-2 badge rounded-pill" style="background:rgba(0,0,0,0.72);">' + g.tracks.length + '</span>' +
                    '</div>' +
                    '<div class="text-white fw-semibold text-truncate" style="font-size:0.88rem;">' + esc(g.title) + '</div>' +
                    '<div class="text-white-50 text-truncate" style="font-size:0.76rem;">' + esc(g.artist) + '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('') +
          '</div>';
      }
    } else {
      bodyHtml = renderTracksTableHtml(filteredTracks, cfg.kind);
    }

    container.innerHTML = heroHtml + toolbarHtml + bodyHtml;

    // Bind eventos compartidos
    container.querySelectorAll('[data-switch-lib]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        appState.libSelectedAlbumId = null;
        navigate(btn.getAttribute('data-switch-lib'));
      });
    });

    container.querySelectorAll('[data-col-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        appState[viewModeKey] = btn.getAttribute('data-col-mode');
        appState[selAlbumKey] = null;
        renderCurrentView();
      });
    });

    container.querySelectorAll('[data-col-sort]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        appState[sortByKey] = btn.getAttribute('data-col-sort');
        renderCurrentView();
      });
    });

    var searchInp = document.getElementById('colSearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', function () {
        appState[searchKey] = searchInp.value;
        renderCurrentView();
        var restored = document.getElementById('colSearchInput');
        if (restored) {
          restored.focus();
          restored.setSelectionRange(restored.value.length, restored.value.length);
        }
      });
    }

    var searchClear = document.getElementById('colSearchClear');
    if (searchClear) {
      searchClear.addEventListener('click', function () {
        appState[searchKey] = '';
        renderCurrentView();
      });
    }

    var playAllBtn = document.getElementById('btnColPlayAll');
    if (playAllBtn) {
      playAllBtn.addEventListener('click', function () {
        if (filteredTracks.length) playTrack(filteredTracks[0], { id: cfg.kind, title: cfg.title, artist: 'Bitszone', coverUrl: filteredTracks[0].albumCover }, filteredTracks);
      });
    }

    var clearDlBtn = document.getElementById('btnColClearDownloads');
    if (clearDlBtn) {
      clearDlBtn.addEventListener('click', function () {
        openConfirmDialog(
          _t('downloads.clearConfirmTitle', '¿Vaciar todas tus descargas?'),
          _t('downloads.clearConfirmMsg', 'Se eliminarán todas las canciones descargadas de tu almacenamiento local.'),
          function () {
            Storage.clearDownloads();
            updateStorageMeterUI();
            showToast(_t('downloads.clearedToast', 'Lista de descargas vaciada'));
            renderCurrentView();
          },
          _t('downloads.clearBtn', 'Vaciar descargas'),
          'btn bz-ad-btn-danger py-2.5 px-4 rounded-pill shadow-sm flex-fill',
          'bi-trash3-fill',
          _t('downloads.badge', 'Mis descargas')
        );
      });
    }

    var backAlbBtn = document.getElementById('btnColBackToAlbums');
    if (backAlbBtn) {
      backAlbBtn.addEventListener('click', function () {
        appState[selAlbumKey] = null;
        renderCurrentView();
      });
    }

    container.querySelectorAll('[data-col-open-alb]').forEach(function (card) {
      card.addEventListener('click', function () {
        appState[selAlbumKey] = card.getAttribute('data-col-open-alb');
        renderCurrentView();
      });
    });

    bindTracksTableInteractions(container, filteredTracks, cfg);
  }

  function renderTracksTableHtml(tracks, kind) {
    return (
      '<div class="d-grid gap-1 pt-1">' +
        tracks.map(function (t, i) {
          var playing = appState.nowPlayingTrack && Number(appState.nowPlayingTrack.id) === Number(t.id);
          var isLic = Storage.isLicensed(t.id);
          var rightMeta = kind === 'downloads'
            ? formatTrackSizeMb(t)
            : (kind === 'licenses' ? getLicenseDaysLeftText(t.addedAt) : formatTimeAgo(t.addedAt));
          var rmIcon = kind === 'downloads'
            ? '<i class="bi bi-trash"></i>'
            : (kind === 'licenses' ? '<i class="bi bi-star-fill text-warning"></i>' : '<i class="bi bi-heart-fill"></i>');
          var rmTitle = kind === 'downloads'
            ? _t('downloads.removeTitle', 'Eliminar descarga')
            : (kind === 'licenses' ? _t('licenses.removeTitle', 'Quitar licencia') : _t('favorites.removeTitle', 'Quitar de favoritos'));

          return (
            '<div class="bz-track-row ' + (playing ? 'is-playing' : '') + '" data-col-play-id="' + t.id + '">' +
              '<div class="text-center font-mono-bz small text-white-50">' +
                (playing && appState.isPlaying ? '<div class="fx-eq mx-auto" style="width:18px;"><i></i><i></i><i></i></div>' : (i + 1)) +
              '</div>' +
              '<img src="' + esc(t.albumCover || './assets/img/bitszone-icon.png') + '" width="44" height="44" class="rounded-2 object-fit-cover" alt="" />' +
              '<div class="min-w-0">' +
                '<div class="fw-semibold text-white text-truncate">' + (isLic ? '<i class="bi bi-star-fill text-warning me-1 small"></i>' : '') + esc(t.title) + '</div>' +
                '<div class="small text-white-50 text-truncate">' + esc(t.artist) + ' · <span class="opacity-75">' + esc(rightMeta) + '</span></div>' +
              '</div>' +
              '<div class="d-flex align-items-center gap-1">' +
                '<button type="button" class="bz-icon-action" data-col-addpl="' + t.id + '" title="' + esc(_t('tracks.addPl', 'Agregar a playlist')) + '"><i class="bi bi-plus-circle"></i></button>' +
                (kind === 'downloads' ? '<button type="button" class="bz-icon-action" data-col-file="' + t.id + '" title="' + esc(_t('tracks.downloadMp3', 'Descargar archivo MP3')) + '"><i class="bi bi-file-earmark-arrow-down"></i></button>' : '') +
                '<button type="button" class="bz-icon-action ' + (kind === 'favorites' ? 'is-favorited' : '') + '" data-col-rm="' + t.id + '" title="' + esc(rmTitle) + '">' + rmIcon + '</button>' +
              '</div>' +
              '<div class="font-mono-bz small text-white-50 text-end" style="min-width:44px;">' + formatDurationMs(t.duration) + '</div>' +
            '</div>'
          );
        }).join('') +
      '</div>'
    );
  }

  function bindTracksTableInteractions(container, activeTracks, cfg) {
    container.querySelectorAll('[data-col-play-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        var tid = Number(row.getAttribute('data-col-play-id'));
        var tr = activeTracks.find(function (x) { return Number(x.id) === tid; });
        if (tr) playTrack(tr, { id: cfg.kind, title: cfg.title, artist: 'Bitszone', coverUrl: tr.albumCover }, activeTracks);
      });
    });

    container.querySelectorAll('[data-col-addpl]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tid = Number(btn.getAttribute('data-col-addpl'));
        var tr = activeTracks.find(function (x) { return Number(x.id) === tid; });
        if (tr) openAddToPlaylistModal(tr);
      });
    });

    container.querySelectorAll('[data-col-file]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        requireAuth('downloads', function () {
          var tid = Number(btn.getAttribute('data-col-file'));
          var tr = activeTracks.find(function (x) { return Number(x.id) === tid; });
          if (tr) {
            Storage.downloadTrack(tr, true);
            showToast(_t('toast.downloadingMp3', 'Descargando MP3 de "{title}"', { title: tr.title }));
          }
        });
      });
    });

    container.querySelectorAll('[data-col-rm]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tid = Number(btn.getAttribute('data-col-rm'));
        var tr = activeTracks.find(function (x) { return Number(x.id) === tid; });
        if (!tr) return;
        if (cfg.kind === 'downloads') {
          var trMb = (Storage.calculateTrackMb ? Storage.calculateTrackMb(tr) : (Number(tr.sizeMb) || 3.8)).toFixed(1);
          Storage.removeDownload(tid);
          updateStorageMeterUI();
          showToast(_t('toast.downloadRemoved', 'Canción eliminada de descargas ({mb} MB liberados)', { mb: trMb }));
          renderCurrentView();
        } else if (cfg.kind === 'licenses') {
          openConfirmDialog(
            _t('licenses.confirmRemoveTitle', '¿Quitar de canciones con licencia?'),
            _t('licenses.confirmRemoveMsg', 'Se eliminará "{title}" de tus canciones con licencia.', { title: tr.title }),
            function () {
              Storage.removeLicense(tid);
              showToast(_t('licenses.removedToast', 'La canción "{title}" se eliminó de Canciones con licencia', { title: tr.title }));
              updatePlayerBarsUI();
              renderCurrentView();
            },
            _t('licenses.removeBtn', 'Quitar licencia'),
            'btn bz-ad-btn-danger py-2.5 px-4 rounded-pill shadow-sm flex-fill',
            'bi-shield-x',
            _t('licenses.badge', 'Licencias')
          );
          return;
        } else {
          Storage.toggleFavorite(tr);
          showToast(_t('toast.favRemoved', 'Quitada de favoritos'));
        }
        updatePlayerBarsUI();
        renderCurrentView();
      });
    });
  }

  // ---- Vista: Biblioteca (Favoritos, Listas de reproducción y Canciones con licencia) ----
  function renderLibraryView(container) {
    if (appState.view === 'library-playlist-detail' && appState.selectedPlaylistId) {
      var pls = Storage.getPlaylists();
      var found = pls.find(function (p) { return p.id === appState.selectedPlaylistId; });
      if (found) {
        var fakeAlbum = {
          id: found.id,
          title: found.name,
          artist: (Auth.getSession() ? Auth.getSession().name : _t('library.myLibrary', 'Mi Biblioteca')),
          coverUrl: (found.tracks[0] && found.tracks[0].albumCover) || './assets/img/bitszone-icon.png',
          year: _t('library.playlistBadge', 'Playlist'),
          totalDuration: found.tracks.reduce(function (s, t) { return s + (t.duration || 0); }, 0),
          tracks: found.tracks
        };
        renderAlbumView(container, fakeAlbum, true);
        return;
      }
    }

    if (appState.view === 'library-playlists') {
      var playlists = Storage.getPlaylists();
      var totalSongs = playlists.reduce(function (acc, p) { return acc + (p.tracks ? p.tracks.length : 0); }, 0);
      var hero =
        '<div class="bz-section-hero">' +
          '<div class="d-flex align-items-center gap-3 gap-md-4 min-w-0">' +
            '<div class="bz-hero-icon-tile is-playlists"><i class="bi bi-music-note-list"></i></div>' +
            '<div class="d-flex flex-column gap-1 min-w-0">' +
              '<span class="bz-hero-kicker">' + esc(_t('library.kicker', 'BIBLIOTECA')) + '</span>' +
              '<div class="bz-hero-title">' + renderLibraryHeroDropdownHtml('playlists', _t('library.playlists', 'Listas de reproducción')) + '</div>' +
              '<div class="d-flex flex-wrap gap-2 mt-2">' +
                '<span class="bz-hero-stat-pill"><i class="bi bi-collection"></i> ' + playlists.length + ' ' + _t(playlists.length === 1 ? 'library.playlistSingular' : 'library.playlistsPlural', 'listas') + '</span>' +
                '<span class="bz-hero-stat-pill"><i class="bi bi-music-note-beamed"></i> ' + totalSongs + ' ' + _t(totalSongs === 1 ? 'common.songSingular' : 'common.songsPlural', 'canciones') + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" id="btnLibraryNewPlaylist" class="btn bz-btn-hero-subtle btn-sm px-3 py-2"><i class="bi bi-plus-lg me-1"></i>' + esc(_t('library.newPlaylist', 'Nueva Playlist')) + '</button>' +
        '</div>';

      var plBody = playlists.length === 0
        ? '<div class="bz-section-empty">' +
            '<div class="bz-empty-orb is-playlists"><i class="bi bi-music-note-list"></i></div>' +
            '<h3 class="h4 fw-bold text-white mb-0">' + esc(_t('library.emptyPlaylistsTitle', 'Aún no tienes listas')) + '</h3>' +
            '<p class="text-white-50 small mb-0" style="max-width:340px;">' + esc(_t('library.emptyPlaylistsDesc', 'Crea una playlist personalizada para agrupar tus canciones favoritas.')) + '</p>' +
            '<button type="button" class="btn bz-btn-hero-subtle btn-sm px-3 py-2 mt-3" data-empty-create-pl><i class="bi bi-plus-lg me-1"></i>' + esc(_t('library.createPlaylistBtn', 'Crear playlist')) + '</button>' +
          '</div>'
        : '<div class="row g-3 pt-2">' +
            playlists.map(function (p) {
              var cover = (p.tracks[0] && p.tracks[0].albumCover) || './assets/img/bitszone-icon.png';
              return (
                '<div class="col-6 col-sm-4 col-md-3 col-xl-2">' +
                  '<div class="bz-catalog-card w-100" data-open-pl="' + esc(p.id) + '">' +
                    '<div class="bz-cover-box mb-2"><img src="' + esc(cover) + '" alt="' + esc(p.name) + '" /></div>' +
                    '<div class="text-white fw-semibold text-truncate" style="font-size:0.9rem;">' + esc(p.name) + '</div>' +
                    '<div class="text-white-50" style="font-size:0.76rem;">' + p.tracks.length + ' ' + _t(p.tracks.length === 1 ? 'common.songSingular' : 'common.songsPlural', 'canciones') + '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('') +
          '</div>';

      container.innerHTML = hero + plBody;

      var newPlBtn = container.querySelector('#btnLibraryNewPlaylist');
      if (newPlBtn) {
        newPlBtn.addEventListener('click', function () {
          openCreatePlaylistModal();
        });
      }
      var emptyPlBtn = container.querySelector('[data-empty-create-pl]');
      if (emptyPlBtn) {
        emptyPlBtn.addEventListener('click', function () {
          openCreatePlaylistModal();
        });
      }

      container.querySelectorAll('[data-switch-lib]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          appState.libSelectedAlbumId = null;
          navigate(btn.getAttribute('data-switch-lib'));
        });
      });
      container.querySelectorAll('[data-open-pl]').forEach(function (card) {
        card.addEventListener('click', function () {
          appState.view = 'library-playlist-detail';
          appState.selectedPlaylistId = card.getAttribute('data-open-pl');
          renderLibraryView(container);
        });
      });
      return;
    }

    if (appState.view === 'library-licenses') {
      var isAuthLic = isUserAuthenticated();
      renderCollectionSection(container, {
        kind: 'licenses',
        libTab: 'licenses',
        kicker: _t('library.kicker', 'BIBLIOTECA'),
        title: _t('library.licenses', 'Canciones con licencia'),
        iconClass: 'bi-star',
        tracks: isAuthLic ? Storage.getLicenses() : [],
        statePrefix: 'lib',
        emptyTitle: isAuthLic ? _t('licenses.emptyTitle', 'No tienes canciones con licencia') : _t('licenses.guestTitle', 'Función para usuarios con cuenta'),
        emptyText: isAuthLic
          ? _t('licenses.emptyDesc', 'Las canciones con licencia aparecen aquí tras escucharlas 5 veces consecutivas y duran 30 días.')
          : _t('licenses.guestDesc', 'Inicia sesión para desbloquear licencias de 30 días al escuchar tus canciones favoritas.'),
        searchPlaceholder: _t('library.searchPlaceholder', 'Buscar en biblioteca...')
      });
      return;
    }

    var isAuthFav = isUserAuthenticated();
    renderCollectionSection(container, {
      kind: 'favorites',
      libTab: 'favorites',
      kicker: _t('library.kicker', 'BIBLIOTECA'),
      title: _t('library.favorites', 'Canciones favoritas'),
      iconClass: 'bi-heart',
      tracks: isAuthFav ? Storage.getFavorites() : [],
      statePrefix: 'lib',
      emptyTitle: isAuthFav ? _t('favorites.emptyTitle', 'Todavía no tienes favoritas') : _t('favorites.guestTitle', 'Tus canciones favoritas'),
      emptyText: isAuthFav
        ? _t('favorites.emptyDesc', 'Toca el corazón de cualquier canción para guardarla aquí.')
        : _t('favorites.guestDesc', 'Inicia sesión gratis para guardar tus canciones favoritas y tenerlas siempre a mano.'),
      searchPlaceholder: _t('library.searchPlaceholder', 'Buscar en biblioteca...')
    });
  }

  // ---- Vista: Mis Descargas ----
  function renderDownloadsView(container) {
    var isAuthDl = isUserAuthenticated();
    renderCollectionSection(container, {
      kind: 'downloads',
      kicker: _t('downloads.kicker', 'MIS DESCARGAS'),
      title: _t('downloads.title', 'Canciones descargadas'),
      iconClass: 'bi-cloud-arrow-down',
      tracks: isAuthDl ? Storage.getDownloads() : [],
      statePrefix: 'dl',
      emptyTitle: isAuthDl ? _t('downloads.emptyTitle', 'Aún no tienes descargas') : _t('downloads.guestTitle', 'Descargas sin conexión'),
      emptyText: isAuthDl
        ? _t('downloads.emptyDesc', 'Descarga canciones o álbumes con el botón de descarga y escúchalas aquí, sin conexión.')
        : _t('downloads.guestDesc', 'Inicia sesión gratis para descargar tus canciones favoritas y escucharlas sin conexión.'),
      searchPlaceholder: _t('downloads.searchPlaceholder', 'Buscar en descargas...')
    });
  }

  // ---- Modales: Agregar a Playlist, Perfil, Configuración y Confirmación ----
  function bindNestedModalBehavior(modalEl) {
    if (!modalEl) return;
    modalEl.addEventListener('show.bs.modal', function () {
      var expEl = document.getElementById('expandedPlayerModal');
      var expInst = expEl && window.bootstrap ? window.bootstrap.Modal.getInstance(expEl) : null;
      if (expInst && expInst._focustrap && typeof expInst._focustrap.deactivate === 'function') {
        expInst._focustrap.deactivate();
      }
    });
    modalEl.addEventListener('hidden.bs.modal', function () {
      if (modalEl.id === 'createPlaylistModal') {
        appState.pendingCreatePlaylistTracks = null;
      }
      var expEl = document.getElementById('expandedPlayerModal');
      var expInst = expEl && window.bootstrap ? window.bootstrap.Modal.getInstance(expEl) : null;
      if (expEl && expEl.classList.contains('show') && expInst && expInst._focustrap && typeof expInst._focustrap.activate === 'function') {
        expInst._focustrap.activate();
      }
    });
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl && window.bootstrap) {
        var inst = window.bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      }
    });
  }

  function openCreatePlaylistModal(tracksList, suggestedName) {
    if (!requireAuth('playlists')) return;
    appState.pendingCreatePlaylistTracks = Array.isArray(tracksList) && tracksList.length ? tracksList.slice() : null;
    var modalEl = document.getElementById('createPlaylistModal');
    var inp = document.getElementById('inputNewPlaylistName');
    if (inp) inp.value = suggestedName || '';
    if (modalEl && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
      if (inp) {
        setTimeout(function () { try { inp.focus(); } catch (err) {} }, 120);
      }
    }
  }

  function openAddToPlaylistModal(track) {
    if (!requireAuth('playlists')) return;
    appState.pendingPlaylistTrack = track;
    var listEl = document.getElementById('addToPlaylistBody');
    var pls = Storage.getPlaylists();

    if (listEl) {
      listEl.innerHTML = pls.length === 0
        ? '<div class="text-center py-3 text-white-50 small"><i class="bi bi-music-note-beamed d-block fs-3 mb-2 opacity-50"></i>' + esc(_t('modal.addToPlEmpty', 'No tienes playlists todavía. Crea una abajo rápido:')) + '</div>'
        : pls.map(function (p) {
            return (
              '<button type="button" data-pick-pl="' + esc(p.id) + '" class="btn w-100 text-start bz-ad-pl-btn rounded-pill px-3.5 py-2.5 mb-2 d-flex justify-content-between align-items-center">' +
                '<span class="text-truncate me-2"><i class="bi bi-music-note-list me-2 text-white-50"></i>' + esc(p.name) + '</span>' +
                '<span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 font-mono-bz">' + p.tracks.length + '</span>' +
              '</button>'
            );
          }).join('');

      listEl.querySelectorAll('[data-pick-pl]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var pid = btn.getAttribute('data-pick-pl');
          var res = Storage.addTrackToPlaylist(pid, track);
          showToast(_t(res.added ? 'toast.plTrackAdded' : 'toast.plTrackExists', res.added ? 'Añadida a "{name}"' : 'Ya estaba en "{name}"', { name: res.playlist.name }));
          var apEl = document.getElementById('addToPlaylistModal');
          var m = apEl && window.bootstrap ? window.bootstrap.Modal.getInstance(apEl) : null;
          if (m) m.hide();
        });
      });
    }

    var apModalEl = document.getElementById('addToPlaylistModal');
    if (apModalEl && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(apModalEl).show();
    }
  }

  function openConfirmDialog(title, message, onConfirm, confirmLabel, btnClass, iconClass, badgeText) {
    var titleEl = document.getElementById('confirmActionTitle');
    var msgEl = document.getElementById('confirmActionMessage');
    var badgeEl = document.getElementById('confirmActionBadge');
    var iconEl = document.getElementById('confirmActionIcon');
    var okBtn = document.getElementById('confirmActionOkBtn');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (badgeEl) {
      badgeEl.innerHTML = '<i class="bi bi-stars me-1 text-white-50"></i> ' + esc(badgeText || _t('common.confirmation', 'Confirmación'));
    }
    if (iconEl) {
      iconEl.className = 'bi ' + (iconClass || 'bi-cloud-arrow-down-fill') + ' text-white';
    }

    if (okBtn) {
      okBtn.textContent = confirmLabel || _t('common.confirm', 'Confirmar');
      okBtn.className = btnClass || 'btn bz-ad-btn-primary py-2.5 px-4 rounded-pill shadow-sm flex-fill';

      var cloned = okBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(cloned, okBtn);
      cloned.addEventListener('click', function () {
        var modalEl = document.getElementById('confirmActionModal');
        var inst = window.bootstrap ? window.bootstrap.Modal.getInstance(modalEl) : null;
        if (inst) inst.hide();
        if (onConfirm) onConfirm();
      });
    }

    var modalEl = document.getElementById('confirmActionModal');
    if (modalEl && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
  }

  function openProfileModal() {
    var s = Auth.getSession();
    if (!s) {
      window.location.href = './login.html';
      return;
    }

    var modalEl = document.getElementById('profileModal');
    var nameInput = document.getElementById('profileNameInput');
    var emailEl = document.getElementById('profileEmailText');
    var roleBadgeEl = document.getElementById('profileRoleBadge');
    var previewImg = document.getElementById('profileAvatarPreview');
    var previewTitle = document.getElementById('profileHeaderName');
    var saveBtn = document.getElementById('btnProfileSave');
    var statsEl = document.getElementById('profileStatsArea');

    var initialName = s.name;
    var currentAvatar = s.avatarUrl || '';
    var pendingAvatar = currentAvatar;

    function updateAvatarPreview(src) {
      previewImg.innerHTML = src
        ? '<img src="' + esc(src) + '" alt="" class="w-100 h-100 object-fit-cover" />'
        : '<i class="bi bi-person-fill fs-1 text-white-50"></i>';
    }

    function isProfileDirty() {
      return nameInput.value.trim() !== initialName || pendingAvatar !== currentAvatar;
    }

    function refreshProfileSaveState() {
      saveBtn.disabled = !isProfileDirty();
      previewTitle.textContent = nameInput.value.trim() || initialName;
    }

    nameInput.value = (s.name && s.name.toUpperCase() === 'SUPERADMIN') ? 'Admin' : s.name;
    emailEl.textContent = s.email;
    roleBadgeEl.textContent = (s.role === 'superadmin' || s.role === 'admin') ? _t('nav.adminBadge', 'ADMIN') : _t('nav.userBadge', 'OYENTE');
    updateAvatarPreview(currentAvatar);
    refreshProfileSaveState();

    // Estadísticas reales desde historial
    var st = Storage.getProfileStats();
    statsEl.innerHTML =
      '<div class="row g-3 mb-4">' +
        '<div class="col-4"><div class="p-3 rounded-4 bg-white bg-opacity-10 text-center"><div class="h4 fw-bold text-white mb-0">' + st.totalListens + '</div><small class="text-white-50">' + esc(_t('profile.listens', 'Escuchas')) + '</small></div></div>' +
        '<div class="col-4"><div class="p-3 rounded-4 bg-white bg-opacity-10 text-center"><div class="h4 fw-bold text-white mb-0">' + st.minutes + '</div><small class="text-white-50">' + esc(_t('profile.minutes', 'Minutos')) + '</small></div></div>' +
        '<div class="col-4"><div class="p-3 rounded-4 bg-white bg-opacity-10 text-center"><div class="h4 fw-bold text-white mb-0">' + st.distinctArtists + '</div><small class="text-white-50">' + esc(_t('profile.artists', 'Artistas')) + '</small></div></div>' +
      '</div>' +
      '<h6 class="text-white-50 text-uppercase small mb-2">' + esc(_t('profile.topArtists', 'Artistas más escuchados')) + '</h6>' +
      (st.topArtists.length === 0
        ? '<p class="small text-white-50">' + esc(_t('profile.noHistory', 'Reproduce canciones para construir tu historial.')) + '</p>'
        : st.topArtists.map(function (a) {
            return '<div class="d-flex justify-content-between py-2 border-bottom border-white border-opacity-10 small"><span class="text-white">' + esc(a.name) + '</span><span class="font-mono-bz text-white-50">' + a.count + ' ' + esc(_t('profile.plays', 'plays')) + '</span></div>';
          }).join(''));

    nameInput.oninput = refreshProfileSaveState;

    var fileInput = document.getElementById('profileAvatarInput');
    fileInput.onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        pendingAvatar = reader.result;
        updateAvatarPreview(pendingAvatar);
        refreshProfileSaveState();
      };
      reader.readAsDataURL(f);
    };

    var inst = window.bootstrap.Modal.getOrCreateInstance(modalEl);

    function performProfileSave() {
      var clean = nameInput.value.trim();
      if (clean.length < 3) {
        showToast(_t('profile.nameTooShort', 'El nombre debe tener al menos 3 caracteres.'));
        return false;
      }
      Auth.updateProfile({ name: clean, avatarUrl: pendingAvatar });
      initialName = clean;
      currentAvatar = pendingAvatar;
      updateSidebarAccountUI();
      refreshProfileSaveState();

      // Si el usuario está viendo el dashboard, re-renderizar de inmediato para reflejar el cambio
      if (appState.view === 'dashboard') {
        renderCurrentView();
      }

      showToast(_t('profile.saved', 'Perfil actualizado correctamente'));
      return true;
    }

    saveBtn.onclick = function () {
      if (performProfileSave()) inst.hide();
    };

    document.getElementById('btnProfileCloseGuard').onclick = function () {
      if (isProfileDirty()) {
        document.getElementById('unsavedModalPrompt').textContent = _t('guard.profilePrompt', 'Tienes cambios sin guardar en tu perfil.');
        var unsavedModal = window.bootstrap.Modal.getOrCreateInstance(document.getElementById('unsavedGuardModal'));
        document.getElementById('btnUnsavedSaveExit').onclick = function () {
          if (performProfileSave()) {
            unsavedModal.hide();
            inst.hide();
          }
        };
        document.getElementById('btnUnsavedDiscardExit').onclick = function () {
          unsavedModal.hide();
          inst.hide();
        };
        unsavedModal.show();
      } else {
        inst.hide();
      }
    };

    inst.show();
  }

  function openSettingsModal() {
    var modalEl = document.getElementById('settingsModal');
    var initial = Storage.getSettings();
    var draft = Object.assign({}, initial);

    var scaleRange = document.getElementById('setTextScaleRange');
    var scaleVal = document.getElementById('setTextScaleVal');
    var chkReduce = document.getElementById('setReduceMotion');
    var chkNoBlur = document.getElementById('setDisableBlur');
    var chkHighContrast = document.getElementById('setHighContrast');
    var saveBtn = document.getElementById('btnSettingsSave');
    var resetBtn = document.getElementById('btnSettingsReset');

    function syncControls() {
      // 1. Escala
      scaleRange.value = draft.textScale;
      scaleVal.textContent = draft.textScale + '%';

      // 2. Switches
      chkReduce.checked = Boolean(draft.reduceMotion);
      chkNoBlur.checked = Boolean(draft.disableBlur);
      if (chkHighContrast) {
        chkHighContrast.checked = Boolean(draft.highContrast);
      }

      // 3. Idioma buttons
      var curLang = draft.language || 'es';
      document.querySelectorAll('#settingsModal [data-lang-val]').forEach(function (btn) {
        var val = btn.getAttribute('data-lang-val');
        var isActive = val === curLang;
        btn.classList.toggle('is-active', isActive);
      });

      // 4. Tema buttons
      var curTheme = draft.theme || 'dark';
      document.querySelectorAll('#settingsModal [data-theme-val]').forEach(function (btn) {
        var val = btn.getAttribute('data-theme-val');
        var isActive = val === curTheme;
        btn.classList.toggle('is-active', isActive);
      });

      // 5. Dirty check
      var dirty =
        Number(draft.textScale) !== Number(initial.textScale) ||
        Boolean(draft.reduceMotion) !== Boolean(initial.reduceMotion) ||
        Boolean(draft.disableBlur) !== Boolean(initial.disableBlur) ||
        String(draft.language) !== String(initial.language) ||
        String(draft.theme) !== String(initial.theme) ||
        Boolean(draft.highContrast) !== Boolean(initial.highContrast);

      var isDefault =
        Number(draft.textScale) === Storage.DEFAULT_SETTINGS.textScale &&
        Boolean(draft.reduceMotion) === Storage.DEFAULT_SETTINGS.reduceMotion &&
        Boolean(draft.disableBlur) === Storage.DEFAULT_SETTINGS.disableBlur &&
        String(draft.language) === Storage.DEFAULT_SETTINGS.language &&
        String(draft.theme) === Storage.DEFAULT_SETTINGS.theme &&
        Boolean(draft.highContrast) === Storage.DEFAULT_SETTINGS.highContrast;

      // 6. Scale points active highlight
      var currentVal = Number(draft.textScale);
      document.querySelectorAll('.bz-scale-point').forEach(function (el) {
        var ptVal = Number(el.getAttribute('data-scale-val'));
        var isAct = ptVal === currentVal;
        el.classList.toggle('is-active', isAct);
        el.classList.toggle('text-white', isAct);
        el.classList.toggle('fw-bold', isAct);
      });

      saveBtn.disabled = !dirty;
      resetBtn.disabled = isDefault;
    }

    syncControls();

    // Eventos selector de idioma
    document.querySelectorAll('#settingsModal [data-lang-val]').forEach(function (btn) {
      btn.onclick = function () {
        var val = btn.getAttribute('data-lang-val');
        if (val && draft.language !== val) {
          draft.language = val;
          Storage.applySettingsToDOM(draft);
          syncControls();
        }
      };
    });

    // Eventos selector de tema visual
    document.querySelectorAll('#settingsModal [data-theme-val]').forEach(function (btn) {
      btn.onclick = function () {
        var val = btn.getAttribute('data-theme-val');
        if (val && draft.theme !== val) {
          draft.theme = val;
          Storage.applySettingsToDOM(draft);
          syncControls();
        }
      };
    });

    // Evento switch alto contraste
    if (chkHighContrast) {
      chkHighContrast.onchange = function () {
        draft.highContrast = chkHighContrast.checked;
        Storage.applySettingsToDOM(draft);
        syncControls();
      };
    }

    // Puntos de escala interactivos
    document.querySelectorAll('.bz-scale-point').forEach(function (el) {
      el.onclick = function () {
        var v = Number(el.getAttribute('data-scale-val'));
        if (!isNaN(v)) {
          draft.textScale = v;
          Storage.applySettingsToDOM(draft);
          syncControls();
        }
      };
    });

    scaleRange.oninput = function () {
      draft.textScale = Number(scaleRange.value);
      Storage.applySettingsToDOM(draft);
      syncControls();
    };
    chkReduce.onchange = function () {
      draft.reduceMotion = chkReduce.checked;
      Storage.applySettingsToDOM(draft);
      syncControls();
    };
    chkNoBlur.onchange = function () {
      draft.disableBlur = chkNoBlur.checked;
      Storage.applySettingsToDOM(draft);
      syncControls();
    };

    var inst = window.bootstrap.Modal.getOrCreateInstance(modalEl);

    saveBtn.onclick = function () {
      Storage.saveSettings(draft);
      initial = Object.assign({}, draft);
      syncControls();
      var msg = window.BitszoneI18n ? window.BitszoneI18n.t('toast.saved', 'Configuración guardada') : 'Configuración guardada';
      showToast(msg);
      renderCurrentView();
      inst.hide();
    };

    resetBtn.onclick = function () {
      draft = Object.assign({}, Storage.DEFAULT_SETTINGS);
      Storage.applySettingsToDOM(draft);
      syncControls();
      var msg = window.BitszoneI18n ? window.BitszoneI18n.t('toast.reset', 'Valores restablecidos (pulsa Guardar para confirmar)') : 'Valores restablecidos';
      showToast(msg);
    };

    document.getElementById('btnSettingsCloseGuard').onclick = function () {
      var dirty = !saveBtn.disabled;
      if (dirty) {
        var promptMsg = window.BitszoneI18n && window.BitszoneI18n.getLanguage() === 'en'
          ? 'You have unsaved changes in Settings.'
          : 'Tienes cambios sin guardar en Configuración.';
        document.getElementById('unsavedModalPrompt').textContent = promptMsg;
        var unsavedModal = window.bootstrap.Modal.getOrCreateInstance(document.getElementById('unsavedGuardModal'));
        document.getElementById('btnUnsavedSaveExit').onclick = function () {
          Storage.saveSettings(draft);
          unsavedModal.hide();
          inst.hide();
          var msg = window.BitszoneI18n ? window.BitszoneI18n.t('toast.saved', 'Configuración guardada') : 'Configuración guardada';
          showToast(msg);
          renderCurrentView();
        };
        document.getElementById('btnUnsavedDiscardExit').onclick = function () {
          Storage.applySettingsToDOM(initial);
          unsavedModal.hide();
          inst.hide();
        };
        unsavedModal.show();
      } else {
        inst.hide();
      }
    };

    inst.show();
  }

  // ---- Inicialización Global en player.html ----
  document.addEventListener('DOMContentLoaded', function () {
    // Limpieza preventiva de bloqueos o backdrops residuales si la página se recargó a medio anuncio
    document.documentElement.classList.remove('bz-ad-locked');
    document.body.classList.remove('bz-ad-locked');
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.querySelectorAll('.modal-backdrop').forEach(function (b) {
      b.remove();
    });

    audioEl = document.getElementById('bzAudioPlayer');
    if (!audioEl) return;

    Storage.applySettingsToDOM();
    updateSidebarAccountUI();
    bindWavySeekbar('bzWavySvg', 'bzWavyPlayed', 'bzWavyUnplayed', 'bzWavyDot', 'bzSeekArea');
    bindWavySeekbar('expWavySvg', 'expWavyPlayed', 'expWavyUnplayed', 'expWavyDot', 'expSeekArea');
    initExpVolumeBars();
    audioEl.volume = appState.muted ? 0 : (appState.volume / 100);
    syncVolumeControls();
    bindNestedModalBehavior(document.getElementById('addToPlaylistModal'));
    bindNestedModalBehavior(document.getElementById('createPlaylistModal'));
    bindNestedModalBehavior(document.getElementById('authRequiredModal'));

    // Eventos del elemento <audio>
    var consecutivePlay = { trackId: null, count: 0 };

    audioEl.addEventListener('timeupdate', function () {
      if (isScrubbing || !audioEl.duration || isNaN(audioEl.duration)) return;

      var isGuest = !isUserAuthenticated();
      var maxSecs = isGuest ? Math.min(30, Math.floor(audioEl.duration)) : Math.floor(audioEl.duration);

      // Si es usuario invitado (sin cuenta) y llega a 30 segundos, cortar la canción y activar anuncio de 8s
      if (isGuest && audioEl.currentTime >= 30) {
        audioEl.pause();
        appState.isPlaying = false;
        appState.currentSecs = 30;
        appState.progress = 1;
        updatePlayerBarsUI();

        // Control de canciones con licencia (5 escuchas consecutivas)
        var cur = appState.nowPlayingTrack;
        if (cur && cur.id) {
          if (consecutivePlay.trackId === cur.id) consecutivePlay.count += 1;
          else consecutivePlay = { trackId: cur.id, count: 1 };

          if (consecutivePlay.count === 5) {
            openAuthRequiredModal('licenses');
          }
        }

        triggerAdFlow(function () {
          if (appState.repeatMode === 'one') {
            audioEl.currentTime = 0;
            audioEl.play().catch(function () {});
            appState.isPlaying = true;
            updatePlayerBarsUI();
          } else {
            nextTrack(true);
          }
        });
        return;
      }

      appState.durationSecs = maxSecs;
      appState.currentSecs = Math.min(maxSecs, Math.floor(audioEl.currentTime));
      appState.progress = maxSecs > 0 ? (audioEl.currentTime / maxSecs) : 0;
      updatePlayerBarsUI();
    });

    audioEl.addEventListener('canplay', function () {
      appState.isAudioLoading = false;
      updatePlayerBarsUI();
    });

    audioEl.addEventListener('waiting', function () {
      appState.isAudioLoading = true;
      updatePlayerBarsUI();
    });

    audioEl.addEventListener('ended', function () {
      var cur = appState.nowPlayingTrack;
      if (cur && cur.id) {
        if (consecutivePlay.trackId === cur.id) consecutivePlay.count += 1;
        else consecutivePlay = { trackId: cur.id, count: 1 };

        if (consecutivePlay.count === 5) {
          if (isUserAuthenticated()) {
            if (Storage.addLicense(cur)) {
              showToast('"' + cur.title + '" ' + _t('toast.licenseAdded', 'se agregó a Canciones con licencia'));
              updatePlayerBarsUI();
              renderCurrentView();
            }
          } else {
            openAuthRequiredModal('licenses');
          }
        }
      }

      // Anuncio entre canciones tanto para invitados como para usuarios con sesión (excepto administradores)
      if (isUserAdmin()) {
        if (appState.repeatMode === 'one') {
          audioEl.currentTime = 0;
          audioEl.play().catch(function () {});
          appState.isPlaying = true;
          updatePlayerBarsUI();
        } else {
          nextTrack(true);
        }
      } else {
        triggerAdFlow(function () {
          if (appState.repeatMode === 'one') {
            audioEl.currentTime = 0;
            audioEl.play().catch(function () {});
            appState.isPlaying = true;
            updatePlayerBarsUI();
          } else {
            nextTrack(true);
          }
        });
      }
    });

    // Botones de navegación (Sidebar, Offcanvas, Mobile TabBar)
    document.querySelectorAll('[data-nav-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigate(btn.getAttribute('data-nav-view'));
      });
    });

    // Widget de Almacenamiento en Sidebar (navega a descargas sin parecer botón ni tener fondo gris)
    var storageWidgetEl = document.getElementById('btnSidebarStorage');
    if (storageWidgetEl) {
      storageWidgetEl.addEventListener('click', function () {
        navigate('downloads');
      });
      storageWidgetEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate('downloads');
        }
      });
    }

    // Colapsar Sidebar desktop
    var toggleSidebarBtn = document.getElementById('btnToggleDesktopSidebar');
    var desktopSidebar = document.getElementById('bzDesktopSidebar');
    if (toggleSidebarBtn && desktopSidebar) {
      toggleSidebarBtn.addEventListener('click', function () {
        if (window.innerWidth < 992) {
          document.body.classList.remove('bz-drawer-open');
          return;
        }
        desktopSidebar.classList.toggle('is-collapsed');
        var icon = toggleSidebarBtn.querySelector('i');
        if (icon) {
          icon.className = desktopSidebar.classList.contains('is-collapsed')
            ? 'bi bi-layout-sidebar-inset'
            : 'bi bi-layout-sidebar';
        }
      });
    }

    // Menú cajón móvil (botón "Menú" de la barra inferior)
    var mobileMenuBtn = document.getElementById('btnMobileMenu');
    var drawerBackdrop = document.getElementById('bzDrawerBackdrop');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', function () {
        document.body.classList.add('bz-drawer-open');
      });
    }
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', function () {
        document.body.classList.remove('bz-drawer-open');
      });
    }
    if (desktopSidebar) {
      desktopSidebar.addEventListener('click', function (e) {
        if (window.innerWidth < 992 && e.target.closest('button, a')) {
          document.body.classList.remove('bz-drawer-open');
        }
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') document.body.classList.remove('bz-drawer-open');
    });

    // Barra inferior líquida: el selector se desliza (con efecto de estiramiento) hacia la pestaña activa
    (function () {
      var pill = document.getElementById('bzTabbarPill');
      var sel = document.getElementById('bzTabSelector');
      var menuBtn = document.getElementById('btnMobileMenu');
      if (!pill || !sel) return;
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var cur = null; // { left, width }

      function tabs() {
        return [].slice.call(pill.querySelectorAll('.bz-tab-btn')).filter(function (b) { return b.offsetParent !== null; });
      }
      function target() {
        var list = tabs();
        var drawer = document.body.classList.contains('bz-drawer-open');
        list.forEach(function (b) { b.classList.toggle('is-menu-on', drawer && b === menuBtn); });
        var btn = drawer ? menuBtn : list.filter(function (b) { return b.classList.contains('is-active'); })[0];
        return btn || null;
      }
      function pop(btn) {
        var ic = btn && btn.querySelector('i');
        if (ic && ic.animate && !reduce) {
          ic.animate([{ transform: 'scale(0.78)' }, { transform: 'scale(1.18)', offset: 0.55 }, { transform: 'scale(1)' }],
            { duration: 420, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' });
        }
      }
      function place(animate) {
        var btn = target();
        if (!btn || !pill.offsetWidth) return;
        var next = { left: btn.offsetLeft, width: btn.offsetWidth };
        if (cur && cur.left === next.left && cur.width === next.width) return;
        if (animate && cur && sel.animate && !reduce) {
          var spanLeft = Math.min(cur.left, next.left);
          var spanWidth = Math.abs(next.left - cur.left) + next.width;
          sel.animate([
            { left: cur.left + 'px', width: cur.width + 'px' },
            { left: spanLeft + 'px', width: spanWidth + 'px', offset: 0.45 },
            { left: next.left + 'px', width: next.width + 'px' }
          ], { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
          pop(btn);
        }
        sel.style.left = next.left + 'px';
        sel.style.width = next.width + 'px';
        cur = next;
      }

      // Cambios de vista (clase is-active), cajón abierto/cerrado y tamaño
      var mo = new MutationObserver(function () { place(true); });
      pill.querySelectorAll('.bz-tab-btn').forEach(function (b) { mo.observe(b, { attributes: true, attributeFilter: ['class'] }); });
      new MutationObserver(function () { place(true); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      if (window.ResizeObserver) new ResizeObserver(function () { cur = null; place(false); }).observe(pill);
      window.addEventListener('resize', function () { cur = null; place(false); });
      window.addEventListener('bz:language-changed', function () { cur = null; place(false); });
      place(false);

      // Arrastre: deslizar el dedo por la barra mueve el selector y al soltar abre esa pestaña
      var dragging = false, startX = 0, moved = false, hover = null;
      function btnAt(x) {
        var r = pill.getBoundingClientRect();
        var px = x - r.left;
        return tabs().filter(function (b) { return px >= b.offsetLeft && px <= b.offsetLeft + b.offsetWidth; })[0] || null;
      }
      pill.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        dragging = true; moved = false; startX = e.clientX; hover = null;
      });
      pill.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        if (Math.abs(e.clientX - startX) > 8) moved = true;
        if (!moved) return;
        var b = btnAt(e.clientX);
        if (b && b !== hover) {
          hover = b;
          sel.style.left = b.offsetLeft + 'px';
          sel.style.width = b.offsetWidth + 'px';
          sel.style.transition = 'left 0.28s cubic-bezier(0.34, 1.3, 0.64, 1), width 0.28s ease';
        }
      });
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        sel.style.transition = '';
        if (moved && hover) {
          var view = hover.getAttribute('data-nav-view');
          if (view) { navigate(view); }
          else if (hover === menuBtn) { document.body.classList.add('bz-drawer-open'); }
        }
        cur = null; place(false);
        moved = false; hover = null;
      }
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    })();

    // Mini reproductor móvil: corazón y siguiente reutilizan los botones de la barra de escritorio
    var mobFav = document.getElementById('mobMiniFavBtn');
    var mobNext = document.getElementById('mobMiniNextBtn');
    var deskFav = document.getElementById('miniFavBtn');
    var deskNext = document.getElementById('miniNextBtn');
    if (mobFav && deskFav) {
      mobFav.addEventListener('click', function (e) { e.stopPropagation(); deskFav.click(); });
      var syncFav = function () {
        mobFav.innerHTML = deskFav.innerHTML;
        mobFav.classList.toggle('is-favorited', deskFav.classList.contains('is-favorited'));
      };
      new MutationObserver(syncFav).observe(deskFav, { childList: true, subtree: true, attributes: true });
      syncFav();
    }
    if (mobNext && deskNext) {
      mobNext.addEventListener('click', function (e) { e.stopPropagation(); deskNext.click(); });
    }

    // Perfil & Config & Atajos & SignOut
    var profBtn = document.getElementById('btnSidebarProfile');
    if (profBtn) profBtn.addEventListener('click', openProfileModal);

    var signOutBtn = document.getElementById('btnProfileSignOut');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', function () {
        Auth.signOut();
        window.location.href = './login.html';
      });
    }

    document.querySelectorAll('[data-open-settings]').forEach(function (btn) {
      btn.addEventListener('click', openSettingsModal);
    });

    function openShortcutsModal() {
      var off = document.getElementById('mobileOffcanvas');
      if (off && window.bootstrap) {
        var oInst = window.bootstrap.Offcanvas.getInstance(off);
        if (oInst) oInst.hide();
      }
      var el = document.getElementById('shortcutsModal');
      if (el && window.bootstrap) {
        window.bootstrap.Modal.getOrCreateInstance(el).show();
      }
    }

    document.querySelectorAll('[data-open-shortcuts]').forEach(function (btn) {
      btn.addEventListener('click', openShortcutsModal);
    });

    var scToSetBtn = document.getElementById('btnShortcutsToSettings');
    if (scToSetBtn) {
      scToSetBtn.addEventListener('click', function () {
        var scEl = document.getElementById('shortcutsModal');
        if (scEl && window.bootstrap) {
          var inst = window.bootstrap.Modal.getInstance(scEl);
          if (inst) inst.hide();
        }
        openSettingsModal();
      });
    }

    // Controles MiniPlayer & Gigante
    function bindClick(id, fn) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', function (e) {
          if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
          }
          return fn.apply(this, arguments);
        });
      }
    }

    bindClick('miniPlayBtn', togglePlay);
    bindClick('mobMiniPlayBtn', togglePlay);
    bindClick('expPlayBtn', togglePlay);
    bindClick('miniNextBtn', nextTrack);
    bindClick('expNextBtn', nextTrack);
    bindClick('miniPrevBtn', prevTrack);
    bindClick('expPrevBtn', prevTrack);
    bindClick('miniShuffleBtn', toggleShuffle);
    bindClick('expShuffleBtn', toggleShuffle);
    bindClick('miniRepeatBtn', cycleRepeat);
    bindClick('expRepeatBtn', cycleRepeat);
    bindClick('miniMuteBtn', toggleMute);
    bindClick('miniLyricsBtn', function (e) {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      var expModal = document.getElementById('expandedPlayerModal');
      var isExpOpen = expModal && expModal.classList.contains('show');
      if (isExpOpen) {
        appState.expTab = 'letras';
        renderExpRightPanel();
        updatePlayerBarsUI();
      } else {
        toggleSideLyricsPanel();
      }
    });
    bindClick('btnCloseSideLyrics', function (e) {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      toggleSideLyricsPanel(false);
    });
    bindClick('expVolMaxBtn', function () { setVolume(100); });
    bindClick('expVolMuteBtn', function () { setVolume(0); });

    function toggleCurrentFavorite(e) {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      if (!appState.nowPlayingTrack) return;
      requireAuth('favorites', function () {
        var added = Storage.toggleFavorite(appState.nowPlayingTrack);
        showToast(added ? _t('toast.favAdded', 'Agregada a favoritos') : _t('toast.favRemoved', 'Quitada de favoritos'));
        updatePlayerBarsUI();
        renderCurrentView();
      });
    }

    bindClick('miniFavBtn', toggleCurrentFavorite);
    bindClick('expFavBtn', toggleCurrentFavorite);

    bindClick('expDlBtn', function () {
      if (!appState.nowPlayingTrack) return;
      requireAuth('downloads', function () {
        var isNew = Storage.downloadTrack(appState.nowPlayingTrack, false);
        updateStorageMeterUI();
        showToast(isNew ? _t('toast.downloadSaved', 'Canción "{title}" guardada en Mis descargas', { title: appState.nowPlayingTrack.title }) : _t('toast.downloadAlready', 'La canción ya está en Mis descargas'));
        updatePlayerBarsUI();
      });
    });

    bindClick('expMoreBtn', function (e) {
      e.stopPropagation();
      if (appState.nowPlayingTrack) {
        openExpTrackMenu(document.getElementById('expMoreBtn'), appState.nowPlayingTrack, appState.nowPlayingAlbum, true);
      }
    });

    document.querySelectorAll('[data-exp-tab]').forEach(function (tabBtn) {
      tabBtn.addEventListener('click', function () {
        closeExpTrackMenu();
        appState.expTab = tabBtn.getAttribute('data-exp-tab') || 'pistas';
        renderExpRightPanel();
      });
    });

    var expModalEl = document.getElementById('expandedPlayerModal');
    if (expModalEl) {
      expModalEl.addEventListener('click', function (e) {
        var menuEl = document.getElementById('bzExpFloatingMenu');
        if (!menuEl || !menuEl.classList.contains('show')) return;
        if (e.target && e.target.closest && e.target.closest('#bzExpFloatingMenu, #expMoreBtn, [data-exp-row-menu]')) return;
        closeExpTrackMenu();
      });
      expModalEl.addEventListener('shown.bs.modal', function () {
        updatePlayerBarsUI();
        renderExpRightPanel();
      });
      expModalEl.addEventListener('hidden.bs.modal', function () {
        closeExpTrackMenu();
        updatePlayerBarsUI();
      });
    }

    var volRange = document.getElementById('miniVolumeRange');
    if (volRange) {
      volRange.addEventListener('input', function () { setVolume(volRange.value); });
      volRange.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    var expVolRange = document.getElementById('expVolRange');
    if (expVolRange) expVolRange.addEventListener('input', function () { setVolume(expVolRange.value); });

    // Abrir / Cerrar Reproductor Gigante Modal
    function openExpandedPlayer(forceTab) {
      if (!appState.nowPlayingTrack) return;
      if (forceTab) appState.expTab = forceTab;
      toggleSideLyricsPanel(false);
      updatePlayerBarsUI();
      renderExpRightPanel();
      var el = document.getElementById('expandedPlayerModal');
      if (el && window.bootstrap) {
        var inst = window.bootstrap.Modal.getInstance(el);
        if (inst) {
          inst._isTransitioning = false;
          if (!el.classList.contains('show')) {
            inst._isShown = false;
          }
          if (inst._backdrop) {
            inst._backdrop._isTransitioning = false;
          }
        }
        window.bootstrap.Modal.getOrCreateInstance(el).show();
      }
    }

    function toggleExpandedPlayer() {
      var el = document.getElementById('expandedPlayerModal');
      if (!el || !appState.nowPlayingTrack) return;
      if (el.classList.contains('show')) {
        var inst = window.bootstrap.Modal.getInstance(el);
        if (inst) {
          inst._isTransitioning = false;
          inst.hide();
        }
      } else {
        openExpandedPlayer();
      }
    }

    var miniBarEl = document.getElementById('bzMiniPlayer');
    if (miniBarEl) {
      miniBarEl.addEventListener('click', function (e) {
        if (!appState.nowPlayingTrack) return;
        var tgt = e.target;
        // Si el elemento cliqueado ya no está conectado al DOM (ej: icono reemplazado en play/pause), ignorar
        if (!tgt || !tgt.isConnected) return;
        // Si el clic fue en un botón, control interactivo, enlace, seekbar, volumen o dropdown, NO abrir reproductor gigante
        var interactive = tgt.closest
          ? tgt.closest('button, a, input, select, textarea, [role="slider"], .bz-seek-bar-area, #bzSeekArea, #bzWavySvg, .bz-icon-action, .bz-vinyl-play-btn, #miniPlayBtn, #miniNextBtn, #miniPrevBtn, #miniShuffleBtn, #miniRepeatBtn, #miniFavBtn, #miniMuteBtn, #miniLyricsBtn, #miniVolumeRange, #mobMiniPlayBtn, #miniTrackArtist, #miniTrackAlbum, .dropdown, .dropdown-menu, .btn')
          : null;
        if (interactive) return;
        // Clic en espacios vacíos / fondo del mini reproductor (o carátula/título) abre el reproductor gigante
        openExpandedPlayer();
      });
    }

    var miniCoverEl = document.getElementById('miniCoverClick');
    if (miniCoverEl) {
      miniCoverEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openExpandedPlayer();
        }
      });
    }

    bindClick('miniTrackArtist', function (e) {
      e.stopPropagation();
      if (!appState.nowPlayingTrack) return;
      var found = appState.artists.find(function (a) { return a.name === appState.nowPlayingTrack.artist; });
      if (found) navigate('artist', { artist: found });
    });

    bindClick('miniTrackAlbum', function (e) {
      e.stopPropagation();
      if (appState.nowPlayingAlbum) navigate('album', { album: appState.nowPlayingAlbum });
    });

    bindClick('expTrackArtist', function () {
      if (!appState.nowPlayingTrack) return;
      var found = appState.artists.find(function (a) { return a.name === appState.nowPlayingTrack.artist; });
      if (found) closeExpAndNavigate('artist', { artist: found });
    });

    bindClick('expAlbumName', function () {
      if (appState.nowPlayingAlbum) closeExpAndNavigate('album', { album: appState.nowPlayingAlbum });
    });

    // Crear Playlist desde modal (y soporta creación directa desde Cola / Reproductor Gigante)
    var formCreatePl = document.getElementById('formCreatePlaylist');
    if (formCreatePl) {
      formCreatePl.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!requireAuth('playlists')) return;
        var inp = document.getElementById('inputNewPlaylistName');
        var created = Storage.createPlaylist(inp.value);
        if (created) {
          var batch = Array.isArray(appState.pendingCreatePlaylistTracks) ? appState.pendingCreatePlaylistTracks : [];
          batch.forEach(function (tr) { Storage.addTrackToPlaylist(created.id, tr); });
          appState.pendingCreatePlaylistTracks = null;
          inp.value = '';
          var crEl = document.getElementById('createPlaylistModal');
          var crInst = crEl && window.bootstrap ? window.bootstrap.Modal.getInstance(crEl) : null;
          if (crInst) crInst.hide();
          showToast(batch.length
            ? (_t('library.playlistBadge', 'Playlist') + ' "' + created.name + '" ' + _t('toast.playlistCreated', 'creada') + ' (' + batch.length + ' ' + _t(batch.length === 1 ? 'common.songSingular' : 'common.songsPlural', 'canciones') + ')')
            : (_t('library.playlistBadge', 'Playlist') + ' "' + created.name + '" ' + _t('toast.playlistCreated', 'creada')));
          var expEl = document.getElementById('expandedPlayerModal');
          var expOpen = expEl && expEl.classList.contains('show');
          if (!expOpen) navigate('library-playlists');
        }
      });
    }

    // Crear Playlist rápida desde modal Agregar a Playlist
    var quickPlForm = document.getElementById('formQuickCreatePlaylist');
    if (quickPlForm) {
      quickPlForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!requireAuth('playlists')) return;
        var inp = document.getElementById('inputQuickPlaylistName');
        var created = Storage.createPlaylist(inp.value);
        if (created && appState.pendingPlaylistTrack) {
          Storage.addTrackToPlaylist(created.id, appState.pendingPlaylistTrack);
          inp.value = '';
          var apEl = document.getElementById('addToPlaylistModal');
          var apInst = apEl && window.bootstrap ? window.bootstrap.Modal.getInstance(apEl) : null;
          if (apInst) apInst.hide();
          showToast(_t('library.playlistBadge', 'Playlist') + ' "' + created.name + '" ' + _t('toast.playlistCreated', 'creada') + ' & ' + _t('toast.addedToPlaylist', 'Añadida a'));
        }
      });
    }

    // Modales Dashboard Admin Demo (Agregar Admin & Nuevo Lanzamiento Demo)
    var formAddAdmin = document.getElementById('formAddDemoAdmin');
    if (formAddAdmin) {
      formAddAdmin.addEventListener('submit', function (e) {
        e.preventDefault();
        var inp = document.getElementById('inputAddAdminEmail');
        var created = window.BitszoneDashboard.addDemoAdmin(inp.value);
        if (created) {
          inp.value = '';
          window.bootstrap.Modal.getInstance(document.getElementById('addAdminModal')).hide();
          showToast(_t('admin.createdToast', '"{username}" agregado como Admin (Demo)', { username: created.username }));
          renderCurrentView();
        }
      });
    }

    var formReleaseDemo = document.getElementById('formReleaseDemo');
    if (formReleaseDemo) {
      formReleaseDemo.addEventListener('submit', function (e) {
        e.preventDefault();
        var titleVal = document.getElementById('relTitleInput').value.trim();
        var artistVal = document.getElementById('relArtistInput').value.trim();
        if (titleVal && artistVal) {
          var firstSongAudio = (appState.albums[0] && appState.albums[0].tracks[0] && appState.albums[0].tracks[0].previewUrl) || '';
          var demoAlbumId = 'demo-rel-' + Date.now();
          var demoTrack = {
            id: Date.now(),
            title: titleVal,
            artist: artistVal,
            duration: 205000,
            previewUrl: firstSongAudio,
            trackNumber: 1,
            sizeMb: 4.5,
            albumId: demoAlbumId,
            albumTitle: titleVal,
            albumCover: './assets/img/albums/hybrid-theory.jpg',
            albumYear: '2026'
          };
          appState.albums.unshift({
            id: demoAlbumId,
            title: titleVal,
            artist: artistVal,
            coverUrl: './assets/img/albums/hybrid-theory.jpg',
            year: '2026',
            totalDuration: 205000,
            genres: ['Pop/Rock'],
            trackCount: 1,
            tracks: [demoTrack]
          });
          appState.tracksCount += 1;
          document.getElementById('relTitleInput').value = '';
          document.getElementById('relArtistInput').value = '';
          window.bootstrap.Modal.getInstance(document.getElementById('releaseDemoModal')).hide();
          showToast(_t('admin.releaseToast', 'Lanzamiento Demo "{title}" agregado temporalmente al catálogo', { title: titleVal }));
          renderCurrentView();
        }
      });
    }

    // Atajos de Teclado Globales
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var unsavedEl = document.getElementById('unsavedGuardModal');
        if (unsavedEl && unsavedEl.classList.contains('show')) {
          var uInst = window.bootstrap.Modal.getInstance(unsavedEl);
          if (uInst) uInst.hide();
          return;
        }
        var profEl = document.getElementById('profileModal');
        if (profEl && profEl.classList.contains('show')) {
          document.getElementById('btnProfileCloseGuard').click();
          return;
        }
        var setEl = document.getElementById('settingsModal');
        if (setEl && setEl.classList.contains('show')) {
          document.getElementById('btnSettingsCloseGuard').click();
          return;
        }
      }

      if (adState.isActive) return;
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      var expModalEl = document.getElementById('expandedPlayerModal');
      var isExpOpen = expModalEl && expModalEl.classList.contains('show');

      // Atajos contextuales dentro del reproductor gigante: P (Pistas), L (Letras), C (Cola)
      if (isExpOpen) {
        if (e.code === 'KeyP') {
          e.preventDefault();
          appState.expTab = 'pistas';
          renderExpRightPanel();
          return;
        } else if (e.code === 'KeyL') {
          e.preventDefault();
          appState.expTab = 'letras';
          renderExpRightPanel();
          return;
        } else if (e.code === 'KeyC') {
          e.preventDefault();
          appState.expTab = 'cola';
          renderExpRightPanel();
          return;
        }
      }

      if (e.code === 'Space') {
        if (appState.nowPlayingTrack) {
          e.preventDefault();
          togglePlay();
        }
      } else if (e.code === 'ArrowRight') {
        nextTrack();
      } else if (e.code === 'ArrowLeft') {
        prevTrack();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume(appState.volume + 5);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume(appState.volume - 5);
      } else if (e.code === 'KeyF') {
        toggleExpandedPlayer();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        toggleSideLyricsPanel();
      } else if (e.code === 'KeyR') {
        cycleRepeat();
      } else if (e.code === 'KeyA') {
        toggleShuffle();
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'KeyS') {
        toggleCurrentFavorite();
      } else if (e.key === '?') {
        openShortcutsModal();
      }
    });

    // Cargar catálogo inicial desde Supabase REST (con respaldo local automático)
    var catalogStartMs = Date.now();
    function hideLoadingScreen() {
      var loadingEl = document.getElementById('bzPlayerLoadingScreen');
      if (loadingEl && !loadingEl.classList.contains('is-done')) {
        loadingEl.classList.add('is-done');
        loadingEl.setAttribute('aria-hidden', 'true');
      }
    }

    // Timeout de seguridad: jamás dejar la pantalla negra pegada más de 1.2 segundos
    setTimeout(hideLoadingScreen, 1200);

    CatalogApi.loadCatalog().then(function (data) {
      appState.albums = data.albums;
      appState.artists = data.artists;
      appState.tracksCount = data.tracksCount;
      appState.catalogSource = data.source;
      appState.latencyMs = data.latencyMs;
      appState.loading = false;
      renderCurrentView();

      var elapsed = Date.now() - catalogStartMs;
      var waitMs = appState.reduceMotion ? 0 : Math.max(0, 520 - elapsed);
      setTimeout(hideLoadingScreen, waitMs);
    }).catch(function (err) {
      console.warn('Error al cargar catálogo inicial:', err);
      appState.loading = false;
      renderCurrentView();
      hideLoadingScreen();
    });
    window.addEventListener('storage', function (e) {
      if (e.key === 'bz_vanilla_session_v1') {
        updateSidebarAccountUI();
        updatePlayerBarsUI();
        renderCurrentView();
      }
    });

    window.addEventListener('bz:language-changed', function () {
      renderCurrentView();
      updatePlayerBarsUI();
      updateStorageMeterUI();
      updateSideLyricsHeader();
      if (appState.isSideLyricsOpen) renderSideLyricsPanel();
    });
  });

  window.BitszonePlayer = {
    playTrack: playTrack,
    triggerAdFlow: triggerAdFlow,
    finishAdFlow: finishAdFlow,
    openAuthRequiredModal: openAuthRequiredModal,
    requireAuth: requireAuth,
    nextTrack: nextTrack,
    prevTrack: prevTrack,
    togglePlay: togglePlay,
    getAppState: function () { return appState; }
  };
})(window);
