/* ==========================================================================
   BITSZONE — Motor del Reproductor, Vistas, Cola, Modales y WavyProgress
   JavaScript Vanilla + Bootstrap 5 Modals/Offcanvas/Toasts
   ========================================================================== */
(function (window) {
  'use strict';

  var Storage = window.BitszoneStorage;
  var Auth = window.BitszoneAuth;
  var CatalogApi = window.BitszoneCatalog;

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

    // Reproductor Gigante
    expTab: 'pistas', // 'pistas' | 'letra' | 'cola'
    expQueueSearch: '',

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
    if (!dateStr) return 'Hoy';
    var diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
    if (diffSec < 60) return 'Hace un momento';
    if (diffSec < 3600) return 'Hace ' + Math.floor(diffSec / 60) + ' min';
    if (diffSec < 86400) return 'Hace ' + Math.floor(diffSec / 3600) + ' h';
    return 'Hace ' + Math.floor(diffSec / 86400) + ' d';
  }

  function getLicenseDaysLeftText(addedAt) {
    if (!addedAt) return '30 días';
    var daysPassed = (Date.now() - new Date(addedAt).getTime()) / (1000 * 60 * 60 * 24);
    var rem = Math.floor(30 - daysPassed);
    if (rem < 0) return 'Expirada';
    if (rem === 0) return 'Último día';
    if (rem === 1) return '1 día';
    return rem + ' días';
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
      held = true;
      isScrubbing = true;
      seekFromEvent(e);
      if (seekArea.setPointerCapture) {
        try { seekArea.setPointerCapture(e.pointerId); } catch (err) {}
      }
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

      var liveProgress = (appState.isPlaying && !isScrubbing && audioEl && audioEl.duration && !isNaN(audioEl.duration))
        ? (audioEl.currentTime / audioEl.duration)
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
  function playTrack(track, albumOrQueueList, queueList, forceIdx) {
    if (!track) return;
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
    appState.durationSecs = Math.floor((track.duration || 0) / 1000);
    appState.isAudioLoading = true;

    Storage.recordListen(track);

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

  function nextTrack() {
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
    playTrack(appState.queue[nextIdx], appState.nowPlayingAlbum, appState.queue, nextIdx);
  }

  function prevTrack() {
    if (!appState.queue.length) return;
    if (audioEl && audioEl.currentTime > 4) {
      audioEl.currentTime = 0;
      return;
    }
    var prevIdx = appState.queueIndex - 1;
    if (prevIdx < 0) prevIdx = appState.queue.length - 1;
    playTrack(appState.queue[prevIdx], appState.nowPlayingAlbum, appState.queue, prevIdx);
  }

  function seekToProgress(p) {
    var clamped = Math.max(0, Math.min(1, p));
    appState.progress = clamped;
    if (audioEl && audioEl.duration && !isNaN(audioEl.duration)) {
      audioEl.currentTime = clamped * audioEl.duration;
      appState.currentSecs = Math.floor(audioEl.currentTime);
    }
    updatePlayerBarsUI();
  }

  function playAtQueueIndex(qIdx) {
    if (qIdx < 0 || qIdx >= appState.queue.length) return;
    playTrack(appState.queue[qIdx], appState.nowPlayingAlbum, appState.queue, qIdx);
  }

  function playTrackNext(track, album) {
    if (!track) return;
    if (!appState.nowPlayingTrack) {
      playTrack(track, album || findAlbumById(track.albumId));
      return;
    }
    var insertAt = Math.max(0, appState.queueIndex + 1);
    appState.queue.splice(insertAt, 0, Object.assign({}, track));
    showToast('\'' + track.title + '\' sonará a continuación');
    renderExpRightPanel();
  }

  function addTrackToQueue(track, album) {
    if (!track) return;
    if (!appState.nowPlayingTrack) {
      playTrack(track, album || findAlbumById(track.albumId));
      return;
    }
    appState.queue.push(Object.assign({}, track));
    showToast('\'' + track.title + '\' añadida a la cola');
    renderExpRightPanel();
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
      if (removed) showToast('\'' + removed.title + '\' quitada de la cola');
      return;
    }
    if (removed) showToast('\'' + removed.title + '\' quitada de la cola');
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
    showToast(appState.shuffle ? 'Modo aleatorio activado' : 'Modo aleatorio desactivado');
    updatePlayerBarsUI();
  }

  function cycleRepeat() {
    var modes = ['off', 'all', 'one'];
    var idx = (modes.indexOf(appState.repeatMode) + 1) % modes.length;
    appState.repeatMode = modes[idx];
    var msgs = { off: 'Repetición desactivada', all: 'Repetir toda la cola', one: 'Repetir canción actual' };
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
      adminBadge.textContent = Auth.isSuperAdmin(session) ? 'SUPERADMIN' : 'ADMIN';
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
      if (nameLabel) nameLabel.textContent = session.name;
      if (avatarBox) {
        avatarBox.innerHTML = session.avatarUrl
          ? '<img src="' + esc(session.avatarUrl) + '" alt="" class="w-100 h-100 object-fit-cover" />'
          : '<i class="bi bi-person-fill"></i>';
      }
      if (topAuthLink) {
        topAuthLink.innerHTML = '<i class="bi bi-person-circle me-1"></i> <span class="d-none d-sm-inline">' + esc(session.name) + '</span>';
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

  function updateStorageMeterUI() {
    var dlCount = Storage.getDownloads().length;
    var usedBytes = Storage.getUsedBytes();
    var usedGB = usedBytes / (1024 * 1024 * 1024);
    var availGB = Math.max(0, Storage.BASE_STORAGE_GB - usedGB);
    var usedPct = Math.min(100, (usedGB / Storage.BASE_STORAGE_GB) * 100);

    var bar = document.getElementById('storageProgressBar');
    var availEl = document.getElementById('storageAvailText');
    var badge = document.getElementById('downloadsCountBadge');

    if (bar) bar.style.width = Math.max(2, usedPct).toFixed(1) + '%';
    if (availEl) availEl.innerHTML = '<strong class="text-white">' + availGB.toFixed(2) + 'GB</strong> de 5.00GB';
    if (badge) {
      badge.textContent = String(dlCount);
      badge.classList.toggle('d-none', dlCount === 0);
    }
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
      itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="next"><span>Reproducir a continuación</span><i class="bi bi-text-indent-left"></i></button>';
    }
    itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="queue"><span>Añadir a la cola</span><i class="bi bi-list-ol"></i></button>';
    itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="addpl"><span>Guardar en lista...</span><i class="bi bi-music-note-list"></i></button>';
    itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="newpl"><span>Nueva playlist con esta</span><i class="bi bi-plus-circle"></i></button>';
    if (includeNav) {
      itemsHtml += '<hr class="dropdown-divider border-white border-opacity-10 my-1" />';
      itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="album"><span>Ir al álbum</span><i class="bi bi-disc"></i></button>';
      itemsHtml += '<button type="button" class="dropdown-item" data-expmenu="artist"><span>Ir al artista</span><i class="bi bi-person"></i></button>';
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

  function renderExpRightPanel() {
    var container = document.getElementById('expRightBody');
    var track = appState.nowPlayingTrack;
    var album = appState.nowPlayingAlbum;
    if (!container || !track || !album) return;

    document.querySelectorAll('[data-exp-tab]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-exp-tab') === appState.expTab);
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
              '<button type="button" class="bz-icon-action fs-6 ' + (fav ? 'is-favorited' : '') + '" data-exp-row-fav="' + t.id + '" title="Favorito"><i class="bi ' + (fav ? 'bi-heart-fill' : 'bi-heart') + '"></i></button>' +
              '<button type="button" class="bz-icon-action fs-6 ' + (dl ? 'is-downloaded' : '') + '" data-exp-row-dl="' + t.id + '" title="Descargar"><i class="bi ' + (dl ? 'bi-check-circle-fill' : 'bi-download') + '"></i></button>' +
              '<button type="button" class="bz-icon-action fs-6" data-exp-row-menu="' + t.id + '" aria-expanded="false" title="Añadir a cola o lista"><i class="bi bi-three-dots"></i></button>' +
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
          var t = list.find(function (x) { return Number(x.id) === Number(btn.getAttribute('data-exp-row-fav')); });
          if (t) {
            var added = Storage.toggleFavorite(t);
            showToast(added ? 'Agregada a favoritos' : 'Quitada de favoritos');
            updatePlayerBarsUI();
            renderCurrentView();
          }
        });
      });
      container.querySelectorAll('[data-exp-row-dl]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var t = list.find(function (x) { return Number(x.id) === Number(btn.getAttribute('data-exp-row-dl')); });
          if (t) {
            var isNew = Storage.downloadTrack(t, false);
            updateStorageMeterUI();
            showToast(isNew ? 'Canción "' + t.title + '" guardada en Mis descargas' : 'La canción ya está en Mis descargas');
            updatePlayerBarsUI();
            renderCurrentView();
          }
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
          '<span class="text-white-50 text-uppercase fw-bold" style="font-size:0.75rem; letter-spacing:0.2em;">Tu cola (' + appState.queue.length + ')</span>' +
          '<div class="d-flex align-items-center gap-2">' +
            (hasUpcoming ? '<button type="button" id="btnExpClearNext" class="btn bz-btn-subtle btn-sm px-3 py-1" style="font-size:0.75rem;"><i class="bi bi-x-lg me-1"></i>Limpiar próximas</button>' : '') +
            '<button type="button" id="btnExpCreateQueuePl" class="btn bz-btn-hero-subtle btn-sm px-3 py-1" style="font-size:0.76rem;"><i class="bi bi-music-note-list me-1"></i>Crear lista con la cola</button>' +
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
              (qi > 0 ? '<button type="button" class="bz-icon-action" data-exp-q-up="' + qi + '" title="Subir en cola"><i class="bi bi-arrow-up-short fs-5"></i></button>' : '') +
              (qi < appState.queue.length - 1 ? '<button type="button" class="bz-icon-action" data-exp-q-down="' + qi + '" title="Bajar en cola"><i class="bi bi-arrow-down-short fs-5"></i></button>' : '') +
              '<button type="button" class="bz-icon-action" data-exp-q-pl="' + qi + '" title="Guardar en playlist"><i class="bi bi-plus-circle fs-6"></i></button>' +
              (appState.queue.length > 1 ? '<button type="button" class="bz-icon-action text-danger" data-exp-q-rm="' + qi + '" title="Quitar de la cola"><i class="bi bi-x-circle fs-6"></i></button>' : '') +
            '</div>' +
            '<span class="font-mono-bz small text-white-50 flex-shrink-0">' + formatDurationMs(qt.duration) + '</span>' +
          '</div>'
        );
      }).join('');

      var sugSection =
        '<div class="mt-4 pt-3 border-top border-white border-opacity-10 px-2">' +
          '<div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">' +
            '<span class="text-white-50 text-uppercase fw-bold" style="font-size:0.72rem; letter-spacing:0.2em;">Añadir canciones a la cola</span>' +
            '<div class="position-relative" style="width: 195px;">' +
              '<i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 text-white-50" style="font-size:0.75rem; pointer-events:none;"></i>' +
              '<input id="expSugSearch" type="text" class="form-control form-control-sm bz-input-dark ps-4 py-1" style="font-size:0.78rem; border-radius:999px;" placeholder="Buscar canción..." value="' + esc(appState.expQueueSearch || '') + '" />' +
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
          sugListEl.innerHTML = '<div class="text-white-50 small py-2">No hay sugerencias disponibles para esa búsqueda.</div>';
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
              '<button type="button" class="btn bz-btn-subtle btn-sm px-2 py-1 flex-shrink-0" style="font-size:0.72rem;" data-sug-addq="' + st.id + '" title="Añadir a la cola"><i class="bi bi-plus-lg me-1"></i>Cola</button>' +
              '<button type="button" class="bz-icon-action flex-shrink-0" data-sug-addpl="' + st.id + '" title="Añadir a playlist"><i class="bi bi-music-note-list"></i></button>' +
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
          if (!appState.queue.length) return;
          openCreatePlaylistModal(appState.queue, 'Cola · ' + (album.title || track.title));
        });
      }

      var clearNextBtn = document.getElementById('btnExpClearNext');
      if (clearNextBtn) {
        clearNextBtn.addEventListener('click', function () {
          appState.queue = appState.queue.slice(0, appState.queueIndex + 1);
          showToast('Se limpiaron las siguientes pistas de la cola');
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
          moveQueueItem(Number(btn.getAttribute('data-exp-q-up')), -1);
        });
      });
      container.querySelectorAll('[data-exp-q-down]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          moveQueueItem(Number(btn.getAttribute('data-exp-q-down')), 1);
        });
      });
      container.querySelectorAll('[data-exp-q-pl]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var qi = Number(btn.getAttribute('data-exp-q-pl'));
          if (appState.queue[qi]) openAddToPlaylistModal(appState.queue[qi]);
        });
      });
      container.querySelectorAll('[data-exp-q-rm]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          removeFromQueueAt(Number(btn.getAttribute('data-exp-q-rm')));
        });
      });
    } else {
      container.innerHTML =
        '<div class="d-flex flex-column align-items-center justify-content-center text-center py-5 px-3">' +
          '<div class="rounded-4 d-flex align-items-center justify-content-center mb-3" style="width:68px;height:68px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);">' +
            '<i class="bi bi-mic fs-2 text-white-50"></i>' +
          '</div>' +
          '<h4 class="fw-bold text-white mb-2">Letra sincronizada no disponible</h4>' +
          '<p class="text-white-50 small mb-4" style="max-width:340px;">Las pistas en modo vista previa de 30s no incluyen sincronización LRC externa, pero puedes explorar los detalles del lanzamiento.</p>' +
          '<div class="bz-glass-card p-3 w-100 text-start" style="max-width:360px;">' +
            '<div class="d-flex justify-content-between py-2 border-bottom border-white border-opacity-10 small"><span class="text-white-50">Canción</span><span class="text-white fw-medium text-truncate ms-2">' + esc(track.title) + '</span></div>' +
            '<div class="d-flex justify-content-between py-2 border-bottom border-white border-opacity-10 small"><span class="text-white-50">Artista</span><span class="text-white fw-medium text-truncate ms-2">' + esc(track.artist) + '</span></div>' +
            '<div class="d-flex justify-content-between py-2 small"><span class="text-white-50">Álbum</span><span class="text-white fw-medium text-truncate ms-2">' + esc(track.albumTitle || album.title) + '</span></div>' +
          '</div>' +
        '</div>';
    }
  }

  function updatePlayerBarsUI() {
    var mini = document.getElementById('bzMiniPlayer');
    var track = appState.nowPlayingTrack;
    var album = appState.nowPlayingAlbum;

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
    if (miniTime) miniTime.textContent = formatTime(appState.currentSecs) + ' / ' + formatTime(appState.durationSecs);

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

    if (expCover) expCover.src = coverUrl;
    if (expVinylLabelImg) expVinylLabelImg.src = coverUrl;
    if (expVinylOrbImg) expVinylOrbImg.src = coverUrl;
    if (expVinylDisc) expVinylDisc.classList.toggle('is-playing', appState.isPlaying && !appState.isAudioLoading);
    if (expBg) expBg.style.backgroundImage = 'url("' + coverUrl + '")';
    if (expTitle) expTitle.innerHTML = (isLic ? '<i class="bi bi-star-fill text-warning me-2 fs-5"></i>' : '') + esc(track.title);
    if (expArtist) expArtist.textContent = track.artist;
    if (expAlbum) expAlbum.textContent = track.albumTitle || album.title;
    if (expCur) expCur.textContent = formatTime(appState.currentSecs);
    if (expDur) expDur.textContent = formatTime(appState.durationSecs);

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
      showToast('Acceso restringido: inicia sesión como Administrador para ver el Dashboard.');
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

    syncThemeMode(appState.view);

    if (appState.loading) {
      stage.innerHTML =
        '<div class="d-flex flex-column align-items-center justify-content-center py-5 my-5 text-center">' +
          '<div class="spinner-border mb-3" style="color:var(--bz-lavender); width:2.8rem; height:2.8rem;" role="status"></div>' +
          '<p class="text-white-50">Cargando catálogo de Bitszone…</p>' +
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
    var dl = mainTrack ? Storage.isDownloaded(mainTrack.id) : false;
    var lic = mainTrack ? Storage.isLicensed(mainTrack.id) : false;

    return (
      '<div class="bz-catalog-card" data-open-album="' + esc(album.id) + '" data-song-mode="' + (isSongMode ? '1' : '0') + '">' +
        '<div class="bz-cover-box mb-2">' +
          '<img src="' + esc(album.coverUrl) + '" alt="' + esc(titleText) + '" loading="lazy" />' +
          '<div class="bz-cover-overlay">' +
            '<button type="button" class="bz-play-orb" data-card-play="' + esc(album.id) + '" data-song-mode="' + (isSongMode ? '1' : '0') + '" aria-label="Reproducir ' + esc(titleText) + '">' +
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
          (mainTrack ? (
            '<div class="d-flex align-items-center gap-1 flex-shrink-0">' +
              '<button type="button" class="bz-icon-action ' + (dl ? 'is-downloaded' : '') + '" data-quick-dl="' + mainTrack.id + '" title="Descargar">' +
                '<i class="bi ' + (dl ? 'bi-check-circle-fill' : 'bi-download') + '" style="font-size:0.86rem;"></i>' +
              '</button>' +
              '<button type="button" class="bz-icon-action ' + (fav ? 'is-favorited' : '') + '" data-quick-fav="' + mainTrack.id + '" title="Favorito">' +
                '<i class="bi ' + (fav ? 'bi-heart-fill' : 'bi-heart') + '" style="font-size:0.86rem;"></i>' +
              '</button>' +
            '</div>'
          ) : '') +
        '</div>' +
      '</div>'
    );
  }

  function wrapScrollableRow(innerHtml) {
    return (
      '<div class="bz-scroll-row-wrap">' +
        '<button type="button" class="bz-scroll-arrow is-left" aria-label="Desplazar a la izquierda"><i class="bi bi-chevron-left"></i></button>' +
        '<div class="bz-horiz-row">' + innerHtml + '</div>' +
        '<button type="button" class="bz-scroll-arrow is-right" aria-label="Desplazar a la derecha"><i class="bi bi-chevron-right"></i></button>' +
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
        '<button type="button" id="' + btnId + '" class="bz-back-btn" aria-label="Atrás">' +
          '<span class="bz-back-icon"><i class="bi bi-arrow-left"></i></span>' +
          '<span class="bz-back-label">Atrás</span>' +
        '</button>'
      );
    }

    function sectionHeader(title, secKey, sortKey, currentSort) {
      var sortItems = [
        { id: 'default', label: 'Por defecto' },
        { id: 'alpha', label: 'Alfabético (A-Z)' },
        { id: 'popular', label: 'Más populares' }
      ];
      return (
        '<div class="d-flex align-items-center justify-content-between mb-3 pt-1">' +
          '<div class="d-flex align-items-center gap-2">' +
            (exp ? renderBackButtonHtml('btnCollapseCatalogSection') : '') +
            '<h2 class="h4 fw-bold text-white mb-0">' + title + '</h2>' +
            '<div class="dropdown">' +
              '<button class="btn bz-btn-subtle btn-sm rounded-circle d-flex align-items-center justify-content-center" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="width:30px;height:30px;background:rgba(255,255,255,0.06);border:none;" title="Ordenar"><i class="bi bi-filter"></i></button>' +
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
          (!exp ? '<button type="button" class="btn btn-link text-decoration-none small text-white-50 p-0" data-expand-sec="' + secKey + '">Mostrar todo</button>' : '') +
        '</div>'
      );
    }

    if (!exp || exp === 'songs') {
      var listHtml = exp === 'songs'
        ? '<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-xl-6 g-3">' + songsList.map(function (a) { return '<div class="col">' + renderAlbumCardHtml(a, true).replace('bz-catalog-card', 'bz-catalog-card w-100') + '</div>'; }).join('') + '</div>'
        : wrapScrollableRow(songsList.map(function (a) { return renderAlbumCardHtml(a, true); }).join(''));
      sectionsHtml += '<section class="mb-5">' + sectionHeader('Canciones del momento', 'songs', 'songsSort', appState.songsSort) + listHtml + '</section>';
    }

    if (!exp || exp === 'artists') {
      var artCards = filteredArtists.map(function (ar) {
        var card =
          '<div class="bz-artist-card ' + (exp === 'artists' ? 'w-100' : '') + '" data-open-artist="' + esc(ar.name) + '">' +
            '<div class="bz-artist-avatar mb-2">' +
              '<img src="' + esc(ar.img) + '" alt="' + esc(ar.name) + '" loading="lazy" />' +
            '</div>' +
            '<div class="text-white fw-semibold text-truncate" style="font-size:0.9rem;">' + esc(ar.name) + '</div>' +
            '<div class="text-white-50" style="font-size:0.75rem;">' + esc(ar.type) + '</div>' +
          '</div>';
        return exp === 'artists' ? '<div class="col">' + card + '</div>' : card;
      }).join('');
      var artHtml = exp === 'artists'
        ? '<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-xl-6 g-4">' + artCards + '</div>'
        : wrapScrollableRow(artCards);
      sectionsHtml += '<section class="mb-5">' + sectionHeader('Artistas populares', 'artists', 'artistsSort', appState.artistsSort) + artHtml + '</section>';
    }

    if (!exp || exp === 'albums') {
      var albHtml = exp === 'albums'
        ? '<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-xl-6 g-3">' + albumsList.map(function (a) { return '<div class="col">' + renderAlbumCardHtml(a, false).replace('bz-catalog-card', 'bz-catalog-card w-100') + '</div>'; }).join('') + '</div>'
        : wrapScrollableRow(albumsList.map(function (a) { return renderAlbumCardHtml(a, false); }).join(''));
      sectionsHtml += '<section class="mb-4">' + sectionHeader('Álbumes destacados', 'albums', 'albumsSort', appState.albumsSort) + albHtml + '</section>';
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
        var info = findTrackById(btn.getAttribute('data-quick-fav'));
        if (!info) return;
        var added = Storage.toggleFavorite(info.track);
        showToast(added ? 'Canción \'' + info.track.title + '\' agregada a tu Biblioteca' : 'Canción \'' + info.track.title + '\' eliminada de tu Biblioteca');
        updatePlayerBarsUI();
        renderCurrentView();
      });
    });
    container.querySelectorAll('[data-quick-dl]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var info = findTrackById(btn.getAttribute('data-quick-dl'));
        if (!info) return;
        var isNew = Storage.downloadTrack(info.track, false);
        showToast(isNew ? 'Canción \'' + info.track.title + '\' descargada' : 'La canción ya está en Mis descargas');
        updateStorageMeterUI();
        renderCurrentView();
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
            '<button type="button" id="btnAlbumPlayAll" class="bz-album-play-pill" title="Reproducir todo">' +
              '<i class="bi bi-play-fill fs-5"></i><span>Reproducir todo</span>' +
            '</button>' +
            (!isPlaylist ? (
              '<button type="button" id="btnAlbumFavAll" class="bz-album-dock-btn ' + (allFav ? 'is-favorited' : '') + '" title="' + (allFav ? 'Quitar álbum de favoritos' : 'Añadir álbum a favoritos') + '">' +
                '<i class="bi ' + (allFav ? 'bi-heart-fill' : 'bi-heart') + ' fs-5"></i>' +
              '</button>'
            ) : '') +
            '<button type="button" id="btnAlbumDownloadAll" class="bz-album-dock-btn ' + (allDl ? 'is-downloaded' : '') + '" title="' + (allDl ? 'Álbum ya descargado' : 'Descargar álbum') + '">' +
              '<i class="bi ' + (allDl ? 'bi-check-circle-fill' : 'bi-download') + ' fs-5"></i>' +
            '</button>' +
            '<div class="dropdown">' +
              '<button type="button" class="bz-album-dock-btn" data-bs-toggle="dropdown" aria-expanded="false" title="Más opciones">' +
                '<i class="bi bi-three-dots fs-5"></i>' +
              '</button>' +
              '<ul class="dropdown-menu dropdown-menu-end bz-library-popover-menu">' +
                '<li><button type="button" class="dropdown-item" id="btnAlbumAddQueue"><span>Añadir a la cola</span><i class="bi bi-list-ol"></i></button></li>' +
                (isPlaylist
                  ? '<li><button type="button" class="dropdown-item text-danger" id="btnPlaylistDelete"><span>Eliminar lista</span><i class="bi bi-trash"></i></button></li>'
                  : '<li><button type="button" class="dropdown-item" id="btnAlbumSaveAsPl"><span>Guardar como lista nueva</span><i class="bi bi-music-note-list"></i></button></li>') +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="mt-2 w-100 px-2">' +
          '<span class="text-white-50 text-uppercase fw-semibold d-block mb-1" style="font-size:0.72rem; letter-spacing:0.24em;">' + (isPlaylist ? 'Lista de reproducción' : 'Álbum') + '</span>' +
          '<h1 class="fw-bold text-white mb-2" style="font-size: clamp(1.75rem, 2.75vw, 2.95rem); line-height: 1.1; letter-spacing: -0.02em; overflow-wrap: break-word;">' + esc(albumObj.title) + '</h1>' +
          '<div class="d-flex flex-wrap align-items-center justify-content-center gap-2 text-white-50" style="font-size:0.9rem;">' +
            '<button type="button" id="btnAlbumToArtist" class="btn btn-link p-0 text-white fw-semibold text-uppercase text-decoration-none bz-hover-white" style="font-size:0.9rem; letter-spacing:0.04em;">' + esc(albumObj.artist) + '</button>' +
            '<span>•</span><span>' + esc(albumObj.year || '2024') + '</span>' +
            '<span>•</span><span>' + tracks.length + (tracks.length === 1 ? ' canción' : ' canciones') + '</span>' +
            (totalMs ? ('<span>•</span><span>' + formatAlbumDurationPretty(totalMs) + '</span>') : '') +
          '</div>' +
        '</div>' +
      '</div>';

    var rightColHtml =
      '<div class="col-12 col-lg-7">' +
        (tracks.length === 0
          ? '<div class="py-5 text-center text-white-50">Esta lista aún no tiene canciones. Usa el botón <strong>+</strong> en cualquier canción del catálogo para agregarla.</div>'
          : '<div class="bz-album-tracklist-scroll">' +
              tracks.map(function (t, i) {
                var playing = appState.nowPlayingTrack && Number(appState.nowPlayingTrack.id) === Number(t.id);
                var fav = Storage.isFavorite(t.id);
                var dl = Storage.isDownloaded(t.id);
                var lic = Storage.isLicensed(t.id);
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
                        '<button type="button" class="bz-icon-action" data-row-addpl="' + t.id + '" title="Agregar a playlist"><i class="bi bi-plus-circle"></i></button>' +
                        '<button type="button" class="bz-icon-action ' + (dl ? 'is-downloaded' : '') + '" data-row-dl="' + t.id + '" title="Guardar en descargas"><i class="bi ' + (dl ? 'bi-check-circle-fill' : 'bi-download') + '"></i></button>' +
                        '<button type="button" class="bz-icon-action ' + (fav ? 'is-favorited' : '') + '" data-row-fav="' + t.id + '" title="Favorito"><i class="bi ' + (fav ? 'bi-heart-fill' : 'bi-heart') + '"></i></button>' +
                        (isPlaylist ? '<button type="button" class="bz-icon-action text-danger" data-row-rmpl="' + t.id + '" title="Quitar de playlist"><i class="bi bi-x-circle"></i></button>' : '') +
                      '</div>' +
                      '<span class="font-mono-bz small text-white-50 text-end" style="min-width:42px;">' + formatDurationMs(t.duration) + '</span>' +
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
        var shouldRemove = tracks.every(function (t) { return Storage.isFavorite(t.id); });
        tracks.forEach(function (t) {
          var isFav = Storage.isFavorite(t.id);
          if (shouldRemove && isFav) Storage.toggleFavorite(t);
          else if (!shouldRemove && !isFav) Storage.toggleFavorite(t);
        });
        showToast(shouldRemove ? 'Álbum quitado de favoritos' : 'Álbum "' + albumObj.title + '" guardado en favoritos');
        updatePlayerBarsUI();
        renderAlbumView(container, albumObj, isPlaylist);
      });
    }

    var dlAll = document.getElementById('btnAlbumDownloadAll');
    if (dlAll) {
      dlAll.addEventListener('click', function () {
        tracks.forEach(function (t) { Storage.downloadTrack(t, false); });
        updateStorageMeterUI();
        showToast('Álbum "' + albumObj.title + '" guardado en Mis descargas');
        renderAlbumView(container, albumObj, isPlaylist);
      });
    }

    var addQueueBtn = document.getElementById('btnAlbumAddQueue');
    if (addQueueBtn) {
      addQueueBtn.addEventListener('click', function () {
        if (!tracks.length) return;
        if (!appState.nowPlayingTrack) {
          playTrack(tracks[0], albumObj, tracks);
        } else {
          appState.queue = appState.queue.concat(tracks);
          showToast(tracks.length + ' canciones añadidas a la cola');
          updatePlayerBarsUI();
        }
      });
    }

    var savePlBtn = document.getElementById('btnAlbumSaveAsPl');
    if (savePlBtn) {
      savePlBtn.addEventListener('click', function () {
        var created = Storage.createPlaylist(albumObj.title);
        if (created) {
          tracks.forEach(function (t) { Storage.addTrackToPlaylist(created.id, t); });
          showToast('Playlist "' + created.name + '" guardada en tu biblioteca');
        }
      });
    }

    var rmPlBtn = document.getElementById('btnPlaylistDelete');
    if (rmPlBtn && isPlaylist) {
      rmPlBtn.addEventListener('click', function () {
        Storage.deletePlaylist(albumObj.id);
        showToast('Playlist "' + albumObj.title + '" eliminada');
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
        var tid = Number(btn.getAttribute('data-row-fav'));
        var tr = tracks.find(function (x) { return Number(x.id) === tid; });
        if (!tr) return;
        var added = Storage.toggleFavorite(tr);
        showToast(added ? 'Agregada a favoritos' : 'Quitada de favoritos');
        updatePlayerBarsUI();
        renderAlbumView(container, albumObj, isPlaylist);
      });
    });

    container.querySelectorAll('[data-row-dl]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tid = Number(btn.getAttribute('data-row-dl'));
        var tr = tracks.find(function (x) { return Number(x.id) === tid; });
        if (!tr) return;
        var isNew = Storage.downloadTrack(tr, false);
        updateStorageMeterUI();
        showToast(isNew ? 'Canción "' + tr.title + '" guardada en Mis descargas' : 'La canción ya está en Mis descargas');
        renderAlbumView(container, albumObj, isPlaylist);
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
        showToast('Canción removida de la playlist');
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
        '<span class="text-white-50 text-uppercase fw-semibold d-block mb-1" style="font-size:0.72rem; letter-spacing:0.25em;">' + esc(artist.type || 'Artista') + '</span>' +
        '<h1 class="fw-bold text-white mb-2" style="font-size: clamp(1.9rem, 3.5vw, 3.15rem); letter-spacing: -0.02em;">' + esc(artist.name) + '</h1>' +
        '<p class="text-white-50 mb-4" style="font-size:0.95rem;">' +
          artistAlbums.length + (artistAlbums.length === 1 ? ' álbum' : ' álbumes') + ' · ' + allSongs.length + (allSongs.length === 1 ? ' canción' : ' canciones') +
        '</p>' +
        '<button type="button" id="btnArtistPlayAll" class="bz-album-play-pill"><i class="bi bi-play-fill fs-5"></i><span>Reproducir todo</span></button>' +
      '</div>';

    var rightColHtml =
      '<div class="col-12 col-lg-7">' +
        '<div class="d-flex align-items-center justify-content-between mb-3 px-1">' +
          '<h2 class="h4 fw-bold text-white mb-0">Discografía</h2>' +
          '<span class="small text-white-50 fw-medium">' + artistAlbums.length + (artistAlbums.length === 1 ? ' lanzamiento' : ' lanzamientos') + '</span>' +
        '</div>' +
        (artistAlbums.length === 0
          ? '<div class="py-5 text-center text-white-50">No hay álbumes disponibles para este artista en el catálogo.</div>'
          : '<div class="bz-album-tracklist-scroll" style="padding-left:0.25rem;">' +
              '<div class="row row-cols-2 g-4">' +
                artistAlbums.map(function (a) {
                  return (
                    '<div class="col">' +
                      '<div class="bz-catalog-card w-100" data-open-album="' + esc(a.id) + '">' +
                        '<div class="bz-cover-box mb-2">' +
                          '<img src="' + esc(a.coverUrl) + '" alt="' + esc(a.title) + '" loading="lazy" />' +
                          '<div class="bz-cover-overlay">' +
                            '<button type="button" class="bz-play-orb" data-card-play="' + esc(a.id) + '" aria-label="Reproducir ' + esc(a.title) + '"><i class="bi bi-play-fill"></i></button>' +
                          '</div>' +
                        '</div>' +
                        '<div class="text-white fw-semibold text-truncate" style="font-size:0.95rem;">' + esc(a.title) + '</div>' +
                        '<div class="text-white-50" style="font-size:0.78rem;">' + esc(a.year || '2024') + ' · ' + (a.tracks ? a.tracks.length : 0) + ' canciones</div>' +
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
          '<li><button type="button" class="dropdown-item ' + (activeLibTab === 'favorites' ? 'active' : '') + '" data-switch-lib="library-favorites"><span>Canciones favoritas</span><i class="bi bi-heart"></i></button></li>' +
          '<li><button type="button" class="dropdown-item ' + (activeLibTab === 'playlists' ? 'active' : '') + '" data-switch-lib="library-playlists"><span>Listas de reproducción</span><i class="bi bi-music-note-list"></i></button></li>' +
          '<li><button type="button" class="dropdown-item ' + (activeLibTab === 'licenses' ? 'active' : '') + '" data-switch-lib="library-licenses"><span>Canciones con licencia</span><i class="bi bi-star"></i></button></li>' +
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
          title: t.albumTitle || 'Canciones sueltas',
          artist: t.artist || 'Varios',
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
    var usedGB = Storage.getUsedBytes() / (1024 * 1024 * 1024);
    var availGB = Math.max(0, Storage.BASE_STORAGE_GB - usedGB);

    var statsHtml =
      '<span class="bz-hero-stat-pill"><i class="bi bi-music-note-beamed"></i> ' + rawTracks.length + (rawTracks.length === 1 ? ' canción' : ' canciones') + '</span>' +
      '<span class="bz-hero-stat-pill"><i class="bi bi-disc"></i> ' + totalAlbumsCount + (totalAlbumsCount === 1 ? ' álbum' : ' álbumes') + '</span>' +
      (cfg.kind === 'downloads'
        ? '<span class="bz-hero-stat-pill"><i class="bi bi-hdd"></i> ' + availGB.toFixed(2) + 'GB libres de 5.00GB</span>'
        : '');

    var heroTitleNode = cfg.kind === 'downloads'
      ? '<span>' + esc(cfg.title) + '</span>'
      : renderLibraryHeroDropdownHtml(cfg.libTab, cfg.title);

    var heroActions = rawTracks.length ? (
      '<div class="d-flex gap-2">' +
        '<button type="button" id="btnColPlayAll" class="btn bz-btn-hero-subtle btn-sm px-3 py-2"><i class="bi bi-play-fill me-1"></i>Escuchar todo</button>' +
        (cfg.kind === 'downloads' ? '<button type="button" id="btnColClearDownloads" class="btn btn-outline-danger btn-sm rounded-pill px-3 py-2"><i class="bi bi-trash me-1"></i>Vaciar</button>' : '') +
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
      'default': 'Por defecto',
      'recent': 'Añadidos recientemente',
      'alpha': 'Alfabéticamente',
      'size_desc': 'Más pesados',
      'size_asc': 'Menos pesados'
    };

    var toolbarHtml =
      '<div class="bz-toolbar-row">' +
        '<div class="bz-segmented-pill">' +
          '<button type="button" class="bz-segmented-btn ' + (viewMode === 'canciones' ? 'is-active' : '') + '" data-col-mode="canciones"><i class="bi bi-music-note-beamed"></i><span>Canciones</span></button>' +
          '<button type="button" class="bz-segmented-btn ' + (viewMode === 'albumes' ? 'is-active' : '') + '" data-col-mode="albumes"><i class="bi bi-disc"></i><span>Álbumes</span></button>' +
        '</div>' +
        '<div class="dropdown">' +
          '<button type="button" class="bz-sort-pill" data-bs-toggle="dropdown" aria-expanded="false">' +
            '<i class="bi bi-arrow-down-up text-white-50"></i>' +
            '<span class="text-white-50 d-none d-sm-inline">Ordenar:</span>' +
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
          '<i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-white-50 small pe-none"></i>' +
          '<input id="colSearchInput" type="text" class="bz-search-pill-input" placeholder="' + esc(cfg.searchPlaceholder) + '" value="' + esc(appState[searchKey] || '') + '" />' +
          (search ? '<button type="button" id="colSearchClear" class="btn btn-link position-absolute top-50 end-0 translate-middle-y text-white-50 p-1 me-1 text-decoration-none"><i class="bi bi-x"></i></button>' : '') +
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
          '<p class="text-white-50">No se encontraron canciones para "' + esc(search) + '".</p>' +
        '</div>';
    } else if (viewMode === 'albumes') {
      var activeGroup = selAlbumId ? groups.find(function (g) { return g.id === selAlbumId; }) : null;
      if (activeGroup) {
        bodyHtml =
          '<div class="mb-3">' +
            '<button type="button" id="btnColBackToAlbums" class="btn bz-btn-subtle btn-sm px-3 py-1 mb-3"><i class="bi bi-arrow-left me-1"></i>Todos los álbumes</button>' +
            '<div class="d-flex align-items-center gap-3 mb-4">' +
              '<img src="' + esc(activeGroup.coverUrl) + '" width="76" height="76" class="rounded-4 object-fit-cover shadow" alt="" />' +
              '<div><h4 class="fw-bold text-white mb-0">' + esc(activeGroup.title) + '</h4><div class="small text-white-50">' + esc(activeGroup.artist) + ' · ' + activeGroup.tracks.length + ' canciones</div></div>' +
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
        openConfirmDialog('¿Vaciar todas tus descargas?', 'Se eliminarán los registros descargados de tu lista local.', function () {
          Storage.clearDownloads();
          updateStorageMeterUI();
          showToast('Lista de descargas vaciada');
          renderCurrentView();
        });
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
            ? 'Eliminar descarga'
            : (kind === 'licenses' ? 'Quitar licencia' : 'Quitar de favoritos');

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
                '<button type="button" class="bz-icon-action" data-col-addpl="' + t.id + '" title="Agregar a playlist"><i class="bi bi-plus-circle"></i></button>' +
                (kind === 'downloads' ? '<button type="button" class="bz-icon-action" data-col-file="' + t.id + '" title="Descargar archivo MP3"><i class="bi bi-file-earmark-arrow-down"></i></button>' : '') +
                '<button type="button" class="bz-icon-action ' + (kind === 'favorites' ? 'is-favorited' : '') + '" data-col-rm="' + t.id + '" title="' + rmTitle + '">' + rmIcon + '</button>' +
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
        var tid = Number(btn.getAttribute('data-col-file'));
        var tr = activeTracks.find(function (x) { return Number(x.id) === tid; });
        if (tr) {
          Storage.downloadTrack(tr, true);
          showToast('Descargando MP3 de "' + tr.title + '"');
        }
      });
    });

    container.querySelectorAll('[data-col-rm]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tid = Number(btn.getAttribute('data-col-rm'));
        var tr = activeTracks.find(function (x) { return Number(x.id) === tid; });
        if (!tr) return;
        if (cfg.kind === 'downloads') {
          Storage.removeDownload(tid);
          updateStorageMeterUI();
          showToast('Pista eliminada de descargas');
        } else if (cfg.kind === 'licenses') {
          openConfirmDialog(
            '¿Quitar de canciones con licencia?',
            'Se eliminará "' + tr.title + '" de tus canciones con licencia.',
            function () {
              Storage.removeLicense(tid);
              showToast('La canción "' + tr.title + '" se eliminó de Canciones con licencia');
              updatePlayerBarsUI();
              renderCurrentView();
            },
            'Quitar'
          );
          return;
        } else {
          Storage.toggleFavorite(tr);
          showToast('Quitada de favoritos');
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
          artist: (Auth.getSession() ? Auth.getSession().name : 'Mi Biblioteca'),
          coverUrl: (found.tracks[0] && found.tracks[0].albumCover) || './assets/img/bitszone-icon.png',
          year: 'Playlist',
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
              '<span class="bz-hero-kicker">BIBLIOTECA</span>' +
              '<div class="bz-hero-title">' + renderLibraryHeroDropdownHtml('playlists', 'Listas de reproducción') + '</div>' +
              '<div class="d-flex flex-wrap gap-2 mt-2">' +
                '<span class="bz-hero-stat-pill"><i class="bi bi-collection"></i> ' + playlists.length + (playlists.length === 1 ? ' lista' : ' listas') + '</span>' +
                '<span class="bz-hero-stat-pill"><i class="bi bi-music-note-beamed"></i> ' + totalSongs + ' canciones</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn bz-btn-primary btn-sm px-4 py-2" data-bs-toggle="modal" data-bs-target="#createPlaylistModal"><i class="bi bi-plus-lg me-1"></i>Nueva Playlist</button>' +
        '</div>';

      var plBody = playlists.length === 0
        ? '<div class="bz-section-empty">' +
            '<div class="bz-empty-orb is-playlists"><i class="bi bi-music-note-list"></i></div>' +
            '<h3 class="h4 fw-bold text-white mb-0">Aún no tienes listas</h3>' +
            '<p class="text-white-50 small mb-0" style="max-width:340px;">Crea una playlist personalizada para agrupar tus canciones favoritas.</p>' +
          '</div>'
        : '<div class="row g-3 pt-2">' +
            playlists.map(function (p) {
              var cover = (p.tracks[0] && p.tracks[0].albumCover) || './assets/img/bitszone-icon.png';
              return (
                '<div class="col-6 col-sm-4 col-md-3 col-xl-2">' +
                  '<div class="bz-catalog-card w-100" data-open-pl="' + esc(p.id) + '">' +
                    '<div class="bz-cover-box mb-2"><img src="' + esc(cover) + '" alt="' + esc(p.name) + '" /></div>' +
                    '<div class="text-white fw-semibold text-truncate" style="font-size:0.9rem;">' + esc(p.name) + '</div>' +
                    '<div class="text-white-50" style="font-size:0.76rem;">' + p.tracks.length + ' canciones</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('') +
          '</div>';

      container.innerHTML = hero + plBody;

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
      renderCollectionSection(container, {
        kind: 'licenses',
        libTab: 'licenses',
        kicker: 'BIBLIOTECA',
        title: 'Canciones con licencia',
        iconClass: 'bi-star',
        tracks: Storage.getLicenses(),
        statePrefix: 'lib',
        emptyTitle: 'No tienes canciones con licencia',
        emptyText: 'Las canciones con licencia aparecen aquí y duran 30 días.',
        searchPlaceholder: 'Buscar en biblioteca'
      });
      return;
    }

    renderCollectionSection(container, {
      kind: 'favorites',
      libTab: 'favorites',
      kicker: 'BIBLIOTECA',
      title: 'Canciones favoritas',
      iconClass: 'bi-heart',
      tracks: Storage.getFavorites(),
      statePrefix: 'lib',
      emptyTitle: 'Todavía no tienes favoritas',
      emptyText: 'Toca el corazón de cualquier canción para guardarla aquí.',
      searchPlaceholder: 'Buscar en biblioteca'
    });
  }

  // ---- Vista: Mis Descargas ----
  function renderDownloadsView(container) {
    renderCollectionSection(container, {
      kind: 'downloads',
      kicker: 'MIS DESCARGAS',
      title: 'Canciones descargadas',
      iconClass: 'bi-cloud-arrow-down',
      tracks: Storage.getDownloads(),
      statePrefix: 'dl',
      emptyTitle: 'Aún no tienes descargas',
      emptyText: 'Descarga canciones o álbumes con el botón de descarga y escúchalas aquí, sin conexión.',
      searchPlaceholder: 'Buscar en descargas'
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
    appState.pendingPlaylistTrack = track;
    var listEl = document.getElementById('addToPlaylistBody');
    var pls = Storage.getPlaylists();

    if (listEl) {
      listEl.innerHTML = pls.length === 0
        ? '<p class="text-white-50 small mb-0">No tienes playlists todavía. Crea una abajo rápido:</p>'
        : pls.map(function (p) {
            return (
              '<button type="button" data-pick-pl="' + esc(p.id) + '" class="btn w-100 text-start bz-btn-subtle rounded-3 px-3 py-2 mb-2 d-flex justify-content-between align-items-center">' +
                '<span><i class="bi bi-music-note-list me-2"></i>' + esc(p.name) + '</span>' +
                '<span class="badge bg-white bg-opacity-10">' + p.tracks.length + '</span>' +
              '</button>'
            );
          }).join('');

      listEl.querySelectorAll('[data-pick-pl]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var pid = btn.getAttribute('data-pick-pl');
          var res = Storage.addTrackToPlaylist(pid, track);
          showToast(res.added ? 'Añadida a "' + res.playlist.name + '"' : 'Ya estaba en "' + res.playlist.name + '"');
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

  function openConfirmDialog(title, message, onConfirm, confirmLabel) {
    document.getElementById('confirmActionTitle').textContent = title;
    document.getElementById('confirmActionMessage').textContent = message;
    var okBtn = document.getElementById('confirmActionOkBtn');
    okBtn.textContent = confirmLabel || 'Confirmar';

    var cloned = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(cloned, okBtn);
    cloned.addEventListener('click', function () {
      var inst = window.bootstrap.Modal.getInstance(document.getElementById('confirmActionModal'));
      if (inst) inst.hide();
      if (onConfirm) onConfirm();
    });

    new window.bootstrap.Modal(document.getElementById('confirmActionModal')).show();
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

    nameInput.value = s.name;
    emailEl.textContent = s.email;
    roleBadgeEl.textContent = s.role.toUpperCase();
    updateAvatarPreview(currentAvatar);
    refreshProfileSaveState();

    // Estadísticas reales desde historial
    var st = Storage.getProfileStats();
    statsEl.innerHTML =
      '<div class="row g-3 mb-4">' +
        '<div class="col-4"><div class="p-3 rounded-4 bg-white bg-opacity-10 text-center"><div class="h4 fw-bold text-white mb-0">' + st.totalListens + '</div><small class="text-white-50">Escuchas</small></div></div>' +
        '<div class="col-4"><div class="p-3 rounded-4 bg-white bg-opacity-10 text-center"><div class="h4 fw-bold text-white mb-0">' + st.minutes + '</div><small class="text-white-50">Minutos</small></div></div>' +
        '<div class="col-4"><div class="p-3 rounded-4 bg-white bg-opacity-10 text-center"><div class="h4 fw-bold text-white mb-0">' + st.distinctArtists + '</div><small class="text-white-50">Artistas</small></div></div>' +
      '</div>' +
      '<h6 class="text-white-50 text-uppercase small mb-2">Artistas más escuchados</h6>' +
      (st.topArtists.length === 0
        ? '<p class="small text-white-50">Reproduce canciones para construir tu historial.</p>'
        : st.topArtists.map(function (a) {
            return '<div class="d-flex justify-content-between py-2 border-bottom border-white border-opacity-10 small"><span class="text-white">' + esc(a.name) + '</span><span class="font-mono-bz text-white-50">' + a.count + ' plays</span></div>';
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
        showToast('El nombre debe tener al menos 3 caracteres.');
        return false;
      }
      Auth.updateProfile({ name: clean, avatarUrl: pendingAvatar });
      initialName = clean;
      currentAvatar = pendingAvatar;
      updateSidebarAccountUI();
      refreshProfileSaveState();
      showToast('Perfil actualizado correctamente');
      return true;
    }

    saveBtn.onclick = function () {
      if (performProfileSave()) inst.hide();
    };

    document.getElementById('btnProfileCloseGuard').onclick = function () {
      if (isProfileDirty()) {
        document.getElementById('unsavedModalPrompt').textContent = 'Tienes cambios sin guardar en tu perfil.';
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
    var saveBtn = document.getElementById('btnSettingsSave');
    var resetBtn = document.getElementById('btnSettingsReset');

    function syncControls() {
      scaleRange.value = draft.textScale;
      scaleVal.textContent = draft.textScale + '%';
      chkReduce.checked = Boolean(draft.reduceMotion);
      chkNoBlur.checked = Boolean(draft.disableBlur);

      var dirty =
        Number(draft.textScale) !== Number(initial.textScale) ||
        Boolean(draft.reduceMotion) !== Boolean(initial.reduceMotion) ||
        Boolean(draft.disableBlur) !== Boolean(initial.disableBlur);

      var isDefault =
        Number(draft.textScale) === Storage.DEFAULT_SETTINGS.textScale &&
        Boolean(draft.reduceMotion) === Storage.DEFAULT_SETTINGS.reduceMotion &&
        Boolean(draft.disableBlur) === Storage.DEFAULT_SETTINGS.disableBlur;

      saveBtn.disabled = !dirty;
      resetBtn.disabled = isDefault;
    }

    syncControls();

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
      showToast('Configuración guardada');
      inst.hide();
    };

    resetBtn.onclick = function () {
      draft = Object.assign({}, Storage.DEFAULT_SETTINGS);
      Storage.applySettingsToDOM(draft);
      syncControls();
      showToast('Valores restablecidos (pulsa Guardar para confirmar)');
    };

    document.getElementById('btnSettingsCloseGuard').onclick = function () {
      var dirty = !saveBtn.disabled;
      if (dirty) {
        document.getElementById('unsavedModalPrompt').textContent = 'Tienes cambios sin guardar en Configuración.';
        var unsavedModal = window.bootstrap.Modal.getOrCreateInstance(document.getElementById('unsavedGuardModal'));
        document.getElementById('btnUnsavedSaveExit').onclick = function () {
          Storage.saveSettings(draft);
          unsavedModal.hide();
          inst.hide();
          showToast('Configuración guardada');
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

    // Eventos del elemento <audio>
    audioEl.addEventListener('timeupdate', function () {
      if (isScrubbing || !audioEl.duration || isNaN(audioEl.duration)) return;
      appState.durationSecs = Math.floor(audioEl.duration);
      appState.currentSecs = Math.floor(audioEl.currentTime);
      appState.progress = audioEl.currentTime / audioEl.duration;
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

    var consecutivePlay = { trackId: null, count: 0 };
    audioEl.addEventListener('ended', function () {
      var cur = appState.nowPlayingTrack;
      if (cur && cur.id) {
        if (consecutivePlay.trackId === cur.id) consecutivePlay.count += 1;
        else consecutivePlay = { trackId: cur.id, count: 1 };

        if (consecutivePlay.count === 5) {
          if (Storage.addLicense(cur)) {
            showToast('La canción "' + cur.title + '" se agregó a Canciones con licencia');
            updatePlayerBarsUI();
            renderCurrentView();
          }
        }
      }

      if (appState.repeatMode === 'one') {
        audioEl.currentTime = 0;
        audioEl.play().catch(function () {});
      } else {
        nextTrack();
      }
    });

    // Botones de navegación (Sidebar, Offcanvas, Mobile TabBar)
    document.querySelectorAll('[data-nav-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigate(btn.getAttribute('data-nav-view'));
      });
    });

    // Colapsar Sidebar desktop
    var toggleSidebarBtn = document.getElementById('btnToggleDesktopSidebar');
    var desktopSidebar = document.getElementById('bzDesktopSidebar');
    if (toggleSidebarBtn && desktopSidebar) {
      toggleSidebarBtn.addEventListener('click', function () {
        desktopSidebar.classList.toggle('is-collapsed');
        var icon = toggleSidebarBtn.querySelector('i');
        if (icon) {
          icon.className = desktopSidebar.classList.contains('is-collapsed')
            ? 'bi bi-layout-sidebar-inset'
            : 'bi bi-layout-sidebar';
        }
      });
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
      if (el) el.addEventListener('click', fn);
    }

    bindClick('miniPlayBtn', togglePlay);
    bindClick('mobMiniPlayBtn', function (e) { e.stopPropagation(); togglePlay(); });
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
    bindClick('expVolMaxBtn', function () { setVolume(100); });
    bindClick('expVolMuteBtn', function () { setVolume(0); });

    function toggleCurrentFavorite(e) {
      if (e) e.stopPropagation();
      if (!appState.nowPlayingTrack) return;
      var added = Storage.toggleFavorite(appState.nowPlayingTrack);
      showToast(added ? 'Agregada a favoritos' : 'Quitada de favoritos');
      updatePlayerBarsUI();
      renderCurrentView();
    }

    bindClick('miniFavBtn', toggleCurrentFavorite);
    bindClick('expFavBtn', toggleCurrentFavorite);


    bindClick('expDlBtn', function () {
      if (!appState.nowPlayingTrack) return;
      var isNew = Storage.downloadTrack(appState.nowPlayingTrack, false);
      updateStorageMeterUI();
      showToast(isNew ? 'Canción "' + appState.nowPlayingTrack.title + '" guardada en Mis descargas' : 'La canción ya está en Mis descargas');
      updatePlayerBarsUI();
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
      expModalEl.addEventListener('hidden.bs.modal', function () {
        closeExpTrackMenu();
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
      updatePlayerBarsUI();
      var el = document.getElementById('expandedPlayerModal');
      if (el && window.bootstrap) {
        window.bootstrap.Modal.getOrCreateInstance(el).show();
      }
    }

    function toggleExpandedPlayer() {
      var el = document.getElementById('expandedPlayerModal');
      if (!el || !appState.nowPlayingTrack) return;
      if (el.classList.contains('show')) {
        var inst = window.bootstrap.Modal.getInstance(el);
        if (inst) inst.hide();
      } else {
        openExpandedPlayer();
      }
    }

    var miniBarEl = document.getElementById('bzMiniPlayer');
    if (miniBarEl) {
      miniBarEl.addEventListener('click', function (e) {
        if (!appState.nowPlayingTrack) return;
        var tgt = e.target;
        var interactive = tgt && tgt.closest
          ? tgt.closest('button, a, input, [role="slider"], #bzSeekArea, #miniTrackArtist, #miniTrackAlbum')
          : null;
        if (interactive) return;
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
            ? ('Playlist "' + created.name + '" creada con ' + batch.length + (batch.length === 1 ? ' canción' : ' canciones'))
            : ('Playlist "' + created.name + '" creada'));
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
        var inp = document.getElementById('inputQuickPlaylistName');
        var created = Storage.createPlaylist(inp.value);
        if (created && appState.pendingPlaylistTrack) {
          Storage.addTrackToPlaylist(created.id, appState.pendingPlaylistTrack);
          inp.value = '';
          var apEl = document.getElementById('addToPlaylistModal');
          var apInst = apEl && window.bootstrap ? window.bootstrap.Modal.getInstance(apEl) : null;
          if (apInst) apInst.hide();
          showToast('Playlist "' + created.name + '" creada y canción añadida');
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
          showToast('"' + created.username + '" agregado como Admin (Demo)');
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
          showToast('Lanzamiento Demo "' + titleVal + '" agregado temporalmente al catálogo');
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

      var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

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
        openExpandedPlayer('letra');
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
    CatalogApi.loadCatalog().then(function (data) {
      appState.albums = data.albums;
      appState.artists = data.artists;
      appState.tracksCount = data.tracksCount;
      appState.catalogSource = data.source;
      appState.latencyMs = data.latencyMs;
      appState.loading = false;
      renderCurrentView();

      var loadingEl = document.getElementById('bzPlayerLoadingScreen');
      if (loadingEl) {
        var elapsed = Date.now() - catalogStartMs;
        var waitMs = appState.reduceMotion ? 0 : Math.max(0, 520 - elapsed);
        setTimeout(function () {
          loadingEl.classList.add('is-done');
          loadingEl.setAttribute('aria-hidden', 'true');
        }, waitMs);
      }
    });
  });
})(window);
