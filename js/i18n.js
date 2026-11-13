/* ==========================================================================
   BITSZONE — Sistema de Internacionalización (i18n: Español e Inglés)
   ========================================================================== */
(function (window) {
  'use strict';

  var currentLang = 'es';

  var I18N = {
    es: {
      // Navegación & Sidebar
      'nav.menu': 'Menú',
      'nav.home': 'Inicio',
      'nav.explore': 'Explorar',
      'nav.library': 'Biblioteca',
      'nav.downloads': 'Mis descargas',
      'nav.collection': 'Colección',
      'nav.favorites': 'Mis me gusta',
      'nav.playlists': 'Listas de reproducción',
      'nav.general': 'General',
      'nav.settings': 'Configuración',
      'nav.shortcuts': 'Atajos',
      'nav.storage': 'Almacenamiento',
      'nav.profile': 'Mi Perfil',
      'nav.signOut': 'Cerrar sesión',
      'nav.signIn': 'Iniciar sesión',
      'nav.adminBadge': 'Admin',
      'nav.userBadge': 'Gratis',
      'nav.guest': 'Invitado',

      // Modal de Configuración
      'settings.preferences': 'Preferencias',
      'settings.title': 'Configuración',
      'settings.desc': 'Personaliza idioma, tema visual, accesibilidad y escala de la interfaz.',
      'settings.save': 'Guardar cambios',
      'settings.reset': 'Restablecer',
      'settings.language': 'Idioma',
      'settings.langEs': 'Español',
      'settings.langEn': 'English',
      'settings.theme': 'Tema visual',
      'settings.themeDark': 'Oscuro',
      'settings.themeLight': 'Claro',
      'settings.themeSystem': 'Sistema',
      'settings.highContrast': 'Alto contraste (Accesibilidad)',
      'settings.highContrastDesc': 'Modo blanco y negro puro de máximo contraste para discapacidad visual.',
      'settings.textScale': 'Escala de texto global',
      'settings.reduceMotion': 'Reducir animaciones',
      'settings.reduceMotionDesc': 'Desactiva transiciones continuas y ondas SVG.',
      'settings.disableBlur': 'Desactivar desenfoque (Blur)',
      'settings.disableBlurDesc': 'Usa paneles sólidos para mejorar fluidez en PCs básicos.',

      // Controles del Reproductor
      'player.play': 'Reproducir',
      'player.pause': 'Pausar',
      'player.next': 'Siguiente pista',
      'player.prev': 'Pista anterior',
      'player.shuffle': 'Modo aleatorio',
      'player.repeat': 'Repetir',
      'player.lyrics': 'Letras de la canción',
      'player.queue': 'Cola de reproducción',
      'player.mute': 'Silenciar',
      'player.unmute': 'Activar sonido',
      'player.expand': 'Pantalla completa',
      'player.favorite': 'Añadir a favoritos',
      'player.download': 'Descargar canción',

      // Letras y Cola
      'lyrics.title': 'Letra',
      'lyrics.by': 'Letra de',
      'lyrics.none': 'No hay ninguna canción en reproducción',
      'lyrics.guest': 'Es necesario iniciar sesión para disfrutar de las letras',
      'lyrics.notFound': 'Letra no disponible',
      'lyrics.notFoundDesc': 'No se encontró letra sincronizada.',
      'lyrics.close': 'Cerrar letras (L)',
      'queue.title': 'Cola de reproducción',
      'queue.nowPlaying': 'Reproduciendo ahora',
      'queue.upNext': 'A continuación',
      'queue.empty': 'La cola está vacía',
      'queue.clearNext': 'Limpiar próximas',

      // Vistas y Buscadores
      'views.searchPlaceholder': 'Buscar canciones, artistas o álbumes...',
      'views.library': 'Biblioteca',
      'views.downloads': 'Mis descargas',
      'views.favorites': 'Mis me gusta',
      'views.playlists': 'Listas de reproducción',
      'views.newPlaylist': 'Nueva lista',
      'views.tracks': 'pistas',
      'views.songs': 'canciones',
      'views.downloadAll': 'Descargar álbum completo',
      'views.downloading': 'Descargando canciones...',

      // Almacenamiento
      'storage.used': 'de 5.00 GB',
      'storage.manage': 'Gestionar almacenamiento',

      // Toasts y Mensajes
      'toast.saved': 'Configuración guardada',
      'toast.reset': 'Valores restablecidos (pulsa Guardar para confirmar)',
      'toast.favoriteAdded': 'Agregada a favoritos',
      'toast.favoriteRemoved': 'Quitada de favoritos',
      'toast.downloaded': 'Canción guardada en Mis descargas',
      'toast.queueCleared': 'Se limpiaron las siguientes pistas de la cola',
      'toast.trackNext': 'sonará a continuación'
    },

    en: {
      // Navigation & Sidebar
      'nav.menu': 'Menu',
      'nav.home': 'Home',
      'nav.explore': 'Explore',
      'nav.library': 'Library',
      'nav.downloads': 'Downloads',
      'nav.collection': 'Collection',
      'nav.favorites': 'Liked Songs',
      'nav.playlists': 'Playlists',
      'nav.general': 'General',
      'nav.settings': 'Settings',
      'nav.shortcuts': 'Shortcuts',
      'nav.storage': 'Storage',
      'nav.profile': 'My Profile',
      'nav.signOut': 'Sign out',
      'nav.signIn': 'Sign in',
      'nav.adminBadge': 'Admin',
      'nav.userBadge': 'Free',
      'nav.guest': 'Guest',

      // Settings Modal
      'settings.preferences': 'Preferences',
      'settings.title': 'Settings',
      'settings.desc': 'Customize language, visual theme, accessibility and interface scale.',
      'settings.save': 'Save changes',
      'settings.reset': 'Reset to defaults',
      'settings.language': 'Language',
      'settings.langEs': 'Español',
      'settings.langEn': 'English',
      'settings.theme': 'Visual Theme',
      'settings.themeDark': 'Dark',
      'settings.themeLight': 'Light',
      'settings.themeSystem': 'System',
      'settings.highContrast': 'High Contrast (Accessibility)',
      'settings.highContrastDesc': 'Pure black and pure white high-contrast mode for visual impairment.',
      'settings.textScale': 'Global text scale',
      'settings.reduceMotion': 'Reduce motion',
      'settings.reduceMotionDesc': 'Disable continuous transitions and SVG wave animations.',
      'settings.disableBlur': 'Disable blur effects',
      'settings.disableBlurDesc': 'Use solid panels to improve smoothness on basic PCs.',

      // Player Controls
      'player.play': 'Play',
      'player.pause': 'Pause',
      'player.next': 'Next track',
      'player.prev': 'Previous track',
      'player.shuffle': 'Shuffle',
      'player.repeat': 'Repeat',
      'player.lyrics': 'Lyrics',
      'player.queue': 'Play queue',
      'player.mute': 'Mute',
      'player.unmute': 'Unmute',
      'player.expand': 'Fullscreen player',
      'player.favorite': 'Add to favorites',
      'player.download': 'Download track',

      // Lyrics & Queue
      'lyrics.title': 'Lyrics',
      'lyrics.by': 'Lyrics of',
      'lyrics.none': 'No song currently playing',
      'lyrics.guest': 'Please sign in to enjoy synchronized lyrics',
      'lyrics.notFound': 'Lyrics not available',
      'lyrics.notFoundDesc': 'No synchronized lyrics found.',
      'lyrics.close': 'Close lyrics (L)',
      'queue.title': 'Play Queue',
      'queue.nowPlaying': 'Now Playing',
      'queue.upNext': 'Up Next',
      'queue.empty': 'Queue is empty',
      'queue.clearNext': 'Clear next',

      // Views & Search
      'views.searchPlaceholder': 'Search songs, artists or albums...',
      'views.library': 'Library',
      'views.downloads': 'Downloads',
      'views.favorites': 'Liked Songs',
      'views.playlists': 'Playlists',
      'views.newPlaylist': 'New playlist',
      'views.tracks': 'tracks',
      'views.songs': 'songs',
      'views.downloadAll': 'Download full album',
      'views.downloading': 'Downloading songs...',

      // Storage
      'storage.used': 'of 5.00 GB',
      'storage.manage': 'Manage storage',

      // Toasts & Messages
      'toast.saved': 'Settings saved',
      'toast.reset': 'Defaults restored (click Save to confirm)',
      'toast.favoriteAdded': 'Added to favorites',
      'toast.favoriteRemoved': 'Removed from favorites',
      'toast.downloaded': 'Track saved to Downloads',
      'toast.queueCleared': 'Upcoming tracks removed from queue',
      'toast.trackNext': 'will play next'
    }
  };

  function getLanguage() {
    return currentLang;
  }

  function t(key, fallback) {
    if (I18N[currentLang] && I18N[currentLang][key]) {
      return I18N[currentLang][key];
    }
    if (I18N.es && I18N.es[key]) {
      return I18N.es[key];
    }
    return fallback !== undefined ? fallback : key;
  }

  function applyLanguage(lang) {
    if (lang === 'en' || lang === 'es') {
      currentLang = lang;
    }
    if (typeof document === 'undefined') return;

    if (document.documentElement) {
      document.documentElement.lang = currentLang;
    }

    // Actualizar elementos con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val) el.textContent = val;
    });

    // Actualizar atributos de títulos/tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var val = t(key);
      if (val) el.setAttribute('title', val);
    });

    // Actualizar placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = t(key);
      if (val) el.setAttribute('placeholder', val);
    });
  }

  window.BitszoneI18n = {
    I18N: I18N,
    t: t,
    getLanguage: getLanguage,
    applyLanguage: applyLanguage
  };

})(window);
