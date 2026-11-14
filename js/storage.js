/* ==========================================================================
   BITSZONE — Almacenamiento Local (Favoritos, Descargas, Playlists, Ajustes, Historial)
   ========================================================================== */
(function (window) {
  'use strict';

  var BASE_STORAGE_GB = 5.0;
  var BASE_STORAGE_MB = 5120.0;

  var DEFAULT_SETTINGS = {
    textScale: 100,
    reduceMotion: false,
    disableBlur: false,
    language: 'es',
    theme: 'dark',
    highContrast: false
  };

  function scopeKey(baseKey) {
    var s = window.BitszoneAuth && window.BitszoneAuth.getSession();
    var uid = s && s.id ? s.id : 'guest';
    return baseKey + '_' + uid;
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(scopeKey(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(scopeKey(key), JSON.stringify(value));
    } catch (e) {}
  }

  // ---- Favoritos ----
  function getFavorites() {
    return readJson('bz_v_favorites', []);
  }
  function isFavorite(trackId) {
    return getFavorites().some(function (t) { return Number(t.id) === Number(trackId); });
  }
  function toggleFavorite(track) {
    var list = getFavorites();
    var idx = list.findIndex(function (t) { return Number(t.id) === Number(track.id); });
    var added = false;
    if (idx !== -1) {
      list.splice(idx, 1);
    } else {
      list.unshift(Object.assign({}, track, { addedAt: new Date().toISOString() }));
      added = true;
    }
    writeJson('bz_v_favorites', list);
    return added;
  }

  // ---- Canciones con licencia (30 días locales) ----
  function getLicenses() {
    var raw = readJson('bz_v_licenses', []);
    var valid = raw.filter(function (t) {
      if (!t || !t.addedAt) return true;
      var days = (Date.now() - new Date(t.addedAt).getTime()) / (1000 * 60 * 60 * 24);
      return Math.floor(30 - days) >= 0;
    });
    if (valid.length !== raw.length) writeJson('bz_v_licenses', valid);
    return valid;
  }
  function isLicensed(trackId) {
    return getLicenses().some(function (t) { return Number(t.id) === Number(trackId); });
  }
  function addLicense(track) {
    if (!track) return false;
    var list = getLicenses();
    if (list.some(function (t) { return Number(t.id) === Number(track.id); })) return false;
    list.unshift(Object.assign({}, track, { addedAt: new Date().toISOString() }));
    writeJson('bz_v_licenses', list);
    return true;
  }
  function removeLicense(trackId) {
    var list = getLicenses();
    var target = list.find(function (t) { return Number(t.id) === Number(trackId); });
    if (!target) return null;
    var updated = list.filter(function (t) { return Number(t.id) !== Number(trackId); });
    writeJson('bz_v_licenses', updated);
    return target;
  }

  // ---- Descargas (metadatos locales + descarga real de MP3 cuando es posible) ----
  function getDownloads() {
    return readJson('bz_v_downloads', []);
  }
  function isDownloaded(trackId) {
    return getDownloads().some(function (t) { return Number(t.id) === Number(trackId); });
  }
  function calculateTrackMb(track) {
    if (!track) return 3.8;
    if (typeof track.sizeMb === 'number' && track.sizeMb > 0) return Number(track.sizeMb);
    var dur = Number(track.duration) || 180000;
    var durSecs = dur < 10000 ? dur : Math.floor(dur / 1000);
    return Number((durSecs * 0.023).toFixed(2)) || 3.8;
  }

  function getUsedMb() {
    return getDownloads().reduce(function (acc, t) {
      return acc + calculateTrackMb(t);
    }, 0);
  }

  function getUsedBytes() {
    return getUsedMb() * 1024 * 1024;
  }

  function downloadTrack(track, downloadMp3File) {
    var list = getDownloads();
    var already = list.some(function (t) { return Number(t.id) === Number(track.id); });
    if (!already) {
      var mb = calculateTrackMb(track);
      list.unshift(Object.assign({}, track, { sizeMb: mb, addedAt: new Date().toISOString() }));
      writeJson('bz_v_downloads', list);
    }
    if (downloadMp3File && track.previewUrl && typeof fetch === 'function') {
      try {
        fetch(track.previewUrl).then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.blob();
        }).then(function (blob) {
          var blobUrl = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = blobUrl;
          a.download = String(track.title || 'pista').replace(/[\\/:*?"<>|]+/g, '_') + '.mp3';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 2500);
        }).catch(function () {});
      } catch (e) {}
    }
    return !already;
  }

  function downloadTracks(trackList) {
    if (!Array.isArray(trackList) || !trackList.length) return 0;
    var list = getDownloads();
    var existingIds = {};
    list.forEach(function (t) { existingIds[String(t.id)] = true; });
    var addedCount = 0;
    trackList.forEach(function (track) {
      if (!track || existingIds[String(track.id)]) return;
      var mb = calculateTrackMb(track);
      list.unshift(Object.assign({}, track, { sizeMb: mb, addedAt: new Date().toISOString() }));
      existingIds[String(track.id)] = true;
      addedCount++;
    });
    if (addedCount > 0) {
      writeJson('bz_v_downloads', list);
    }
    return addedCount;
  }

  function removeTracks(trackIds) {
    if (!Array.isArray(trackIds) || !trackIds.length) return;
    var idSet = {};
    trackIds.forEach(function (id) { idSet[String(id)] = true; });
    var list = getDownloads().filter(function (t) { return !idSet[String(t.id)]; });
    writeJson('bz_v_downloads', list);
  }

  function removeDownload(trackId) {
    var list = getDownloads().filter(function (t) { return Number(t.id) !== Number(trackId); });
    writeJson('bz_v_downloads', list);
  }

  function clearDownloads() {
    writeJson('bz_v_downloads', []);
  }

  // ---- Playlists ----
  function getPlaylists() {
    return readJson('bz_v_playlists', []);
  }
  function savePlaylists(list) {
    writeJson('bz_v_playlists', list);
  }
  function createPlaylist(name) {
    var clean = String(name || '').trim();
    if (!clean) return null;
    var list = getPlaylists();
    var pl = {
      id: 'pl_' + Date.now(),
      name: clean,
      createdAt: new Date().toISOString(),
      tracks: []
    };
    list.unshift(pl);
    savePlaylists(list);
    return pl;
  }
  function deletePlaylist(playlistId) {
    var list = getPlaylists().filter(function (p) { return p.id !== playlistId; });
    savePlaylists(list);
  }
  function renamePlaylist(playlistId, name) {
    var clean = String(name || '').trim();
    if (!clean) return false;
    var list = getPlaylists();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === playlistId) { list[i].name = clean; savePlaylists(list); return true; }
    }
    return false;
  }
  function addTrackToPlaylist(playlistId, track) {
    var list = getPlaylists();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === playlistId) {
        var exists = list[i].tracks.some(function (t) { return Number(t.id) === Number(track.id); });
        if (!exists) {
          list[i].tracks.push(Object.assign({}, track));
          savePlaylists(list);
          return { added: true, playlist: list[i] };
        }
        return { added: false, playlist: list[i] };
      }
    }
    return { added: false, playlist: null };
  }
  function removeTrackFromPlaylist(playlistId, trackId) {
    var list = getPlaylists();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === playlistId) {
        list[i].tracks = list[i].tracks.filter(function (t) { return Number(t.id) !== Number(trackId); });
        savePlaylists(list);
        return list[i];
      }
    }
    return null;
  }

  // ---- Historial de escuchas para Estadísticas de Perfil ----
  function getHistory() {
    return readJson('bz_v_history', []);
  }
  function recordListen(track) {
    if (!track) return;
    var hist = getHistory();
    hist.unshift({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      albumTitle: track.albumTitle || '',
      duration: track.duration || 180000,
      timestamp: Date.now()
    });
    if (hist.length > 200) hist = hist.slice(0, 200);
    writeJson('bz_v_history', hist);
  }
  function getProfileStats() {
    var hist = getHistory();
    var totalMs = hist.reduce(function (s, item) { return s + (item.duration || 0); }, 0);
    var artistsCount = {};
    hist.forEach(function (h) {
      if (h.artist) artistsCount[h.artist] = (artistsCount[h.artist] || 0) + 1;
    });
    var topArtists = Object.keys(artistsCount).map(function (name) {
      return { name: name, count: artistsCount[name] };
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 4);

    return {
      totalListens: hist.length,
      minutes: Math.round(totalMs / 60000),
      distinctArtists: Object.keys(artistsCount).length,
      topArtists: topArtists
    };
  }

  // ---- Preferencias Simplificadas ----
  function getSettings() {
    var saved = readJson('bz_v_settings', null);
    if (!saved) {
      try {
        var rawGuest = localStorage.getItem('bz_v_settings_guest');
        if (rawGuest) saved = JSON.parse(rawGuest);
      } catch (e) {}
    }
    return Object.assign({}, DEFAULT_SETTINGS, saved || {});
  }
  function saveSettings(settings) {
    var clean = Object.assign({}, DEFAULT_SETTINGS, settings);
    writeJson('bz_v_settings', clean);
    try {
      localStorage.setItem('bz_v_settings_guest', JSON.stringify(clean));
    } catch (e) {}
    applySettingsToDOM(clean);
    return clean;
  }
  function resetSettings() {
    return saveSettings(DEFAULT_SETTINGS);
  }
  function applySettingsToDOM(settings) {
    var s = settings || getSettings();

    // 1. Escala de texto
    var scale = Math.max(85, Math.min(130, Number(s.textScale) || 100));
    document.documentElement.style.fontSize = (16 * (scale / 100)).toFixed(2) + 'px';

    // 2. Reducción de animaciones y desactivación de desenfoques
    document.body.classList.toggle('bz-reduce-motion', Boolean(s.reduceMotion));
    document.body.classList.toggle('bz-no-blur', Boolean(s.disableBlur));

    // 3. Modo Alto Contraste (Blanco y Negro puro para discapacidad visual)
    var isHc = Boolean(s.highContrast);
    document.body.classList.toggle('bz-high-contrast', isHc);

    // 4. Tema: 'dark' | 'light' | 'system'
    var themeMode = s.theme || 'dark';
    var effectiveTheme = themeMode;
    if (themeMode === 'system') {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.body.classList.toggle('bz-theme-light', effectiveTheme === 'light');
    document.body.classList.toggle('bz-theme-dark', effectiveTheme === 'dark');

    // 5. Idioma
    if (window.BitszoneI18n && typeof window.BitszoneI18n.applyLanguage === 'function') {
      window.BitszoneI18n.applyLanguage(s.language || 'es');
    }
  }

  // Listener para cambio de tema del sistema en tiempo real
  if (window.matchMedia) {
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        var s = getSettings();
        if (s.theme === 'system') {
          applySettingsToDOM(s);
        }
      });
    } catch (e) {}
  }

  // Aplicar tema y preferencias guardadas automáticamente al inicializar
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        applySettingsToDOM();
      });
    } else {
      applySettingsToDOM();
    }
  }

  window.BitszoneStorage = {
    BASE_STORAGE_GB: BASE_STORAGE_GB,
    BASE_STORAGE_MB: BASE_STORAGE_MB,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    getFavorites: getFavorites,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    getLicenses: getLicenses,
    isLicensed: isLicensed,
    addLicense: addLicense,
    removeLicense: removeLicense,
    getDownloads: getDownloads,
    isDownloaded: isDownloaded,
    getUsedBytes: getUsedBytes,
    getUsedMb: getUsedMb,
    calculateTrackMb: calculateTrackMb,
    downloadTrack: downloadTrack,
    downloadTracks: downloadTracks,
    removeTracks: removeTracks,
    removeDownload: removeDownload,
    clearDownloads: clearDownloads,
    getPlaylists: getPlaylists,
    createPlaylist: createPlaylist,
    deletePlaylist: deletePlaylist,
    renamePlaylist: renamePlaylist,
    addTrackToPlaylist: addTrackToPlaylist,
    removeTrackFromPlaylist: removeTrackFromPlaylist,
    recordListen: recordListen,
    getProfileStats: getProfileStats,
    getSettings: getSettings,
    saveSettings: saveSettings,
    resetSettings: resetSettings,
    applySettingsToDOM: applySettingsToDOM
  };
})(window);
