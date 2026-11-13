/* ==========================================================================
   BITSZONE — Dashboard de Administración
   Protegido por rol 'admin', maquetado con Bootstrap 5 + JS puro
   ========================================================================== */
(function (window) {
  'use strict';

  function _t(key, fallback, params) {
    if (window.BitszoneI18n && typeof window.BitszoneI18n.t === 'function') {
      return window.BitszoneI18n.t(key, fallback, params);
    }
    var str = (fallback !== undefined) ? fallback : key;
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (p) {
        str = str.replace(new RegExp('\\{' + p + '\\}', 'g'), params[p]);
      });
    }
    return str;
  }

  var STORAGE_DEMO_USERS = 'bz_vanilla_demo_admins_v1';

  var INITIAL_DEMO_USERS = [
    {
      id: 'demo-1',
      username: 'Admin',
      email: 'bitszone.app@gmail.com',
      role: 'admin',
      status: 'online',
      playedSongsCount: 842,
      downloadedCount: 124,
      avatar_url: ''
    },
    {
      id: 'demo-2',
      username: 'carlos_ops',
      email: 'carlos.admin@bitszone.net',
      role: 'admin',
      status: 'online',
      playedSongsCount: 312,
      downloadedCount: 42,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
    },
    {
      id: 'demo-3',
      username: 'sofia_content',
      email: 'sofia.music@bitszone.net',
      role: 'admin',
      status: 'idle',
      playedSongsCount: 520,
      downloadedCount: 96,
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces'
    }
  ];

  var DEMO_CHARTS = {
    '24h': [
      { label: '00h', plays: 1200, users: 180 },
      { label: '04h', plays: 600, users: 90 },
      { label: '08h', plays: 3400, users: 520 },
      { label: '12h', plays: 6800, users: 1100 },
      { label: '16h', plays: 8900, users: 1420 },
      { label: '20h', plays: 12400, users: 2100 },
      { label: '23h', plays: 7800, users: 950 }
    ],
    '7d': [
      { label: 'Lun', plays: 24100, users: 1420 },
      { label: 'Mar', plays: 28300, users: 1650 },
      { label: 'Mié', plays: 32800, users: 1890 },
      { label: 'Jue', plays: 38400, users: 2100 },
      { label: 'Vie', plays: 49200, users: 3450 },
      { label: 'Sáb', plays: 58900, users: 4120 },
      { label: 'Dom', plays: 53210, users: 3862 }
    ],
    '30d': [
      { label: 'Sem 1', plays: 54000, users: 3800 },
      { label: 'Sem 2', plays: 68000, users: 4400 },
      { label: 'Sem 3', plays: 79000, users: 5100 },
      { label: 'Sem 4', plays: 92000, users: 6200 }
    ]
  };

  var DEMO_POPULAR_TRACKS = [
    { id: 1, title: 'Billie Jean', artist: 'Michael Jackson', album: 'Thriller', plays: 48290, downloads: 12400 },
    { id: 2, title: 'In The End', artist: 'LINKIN PARK', album: 'Meteora', plays: 42150, downloads: 10850 },
    { id: 3, title: 'Circles', artist: 'Post Malone', album: "Hollywood's Bleeding", plays: 38920, downloads: 9420 },
    { id: 4, title: 'Numb', artist: 'LINKIN PARK', album: 'Meteora', plays: 35400, downloads: 8910 },
    { id: 5, title: 'Best Years', artist: '5 Seconds of Summer', album: 'CALM', plays: 31200, downloads: 7840 }
  ];

  var GENRE_DISTRIBUTION = [
    { name: 'Pop & Mainstream', percent: 38, count: '108,260', color: '#c084fc' },
    { name: 'Rock & Alternativo', percent: 28, count: '79,770', color: '#818cf8' },
    { name: 'Metal & Nu-Metal', percent: 18, count: '51,280', color: '#f472b6' },
    { name: 'Hip-Hop & Trap', percent: 10, count: '28,490', color: '#fb923c' },
    { name: 'Salsa & Tropical', percent: 6, count: '17,110', color: '#34d399' }
  ];

  function getSystemActivityEvents() {
    return [
      {
        title: _t('admin.event1Title', 'Sincronización de Catálogo'),
        detail: _t('admin.diagTracksDetail', 'Pistas de Supabase REST API verificadas correctamente con 24 álbumes.'),
        time: _t('toast.timeMinAgo', 'Hace {n} min', { n: 2 }),
        icon: 'bi-check2-circle',
        color: '#34d399'
      },
      {
        title: _t('admin.event2Title', 'Hito de Reproducción'),
        detail: _t('admin.event2Detail', '"Billie Jean" de Michael Jackson superó las 48,000 escuchas activas.'),
        time: _t('toast.timeMinAgo', 'Hace {n} min', { n: 18 }),
        icon: 'bi-fire',
        color: '#f472b6'
      },
      {
        title: _t('admin.event3Title', 'Almacenamiento Offline'),
        detail: _t('admin.diagCacheDetail', 'Caché de descargas IndexedDB optimizado al 100% en clientes activos.'),
        time: _t('toast.timeMinAgo', 'Hace {n} min', { n: 45 }),
        icon: 'bi-cloud-check',
        color: '#818cf8'
      },
      {
        title: _t('admin.event4Title', 'Seguridad y Acceso'),
        detail: _t('admin.diagAuthDetail', 'Sesión de Administrador autorizada y enlazada al panel de control.'),
        time: _t('toast.timeHourAgo', 'Hace {n} h', { n: 1 }),
        icon: 'bi-shield-check',
        color: '#c084fc'
      },
      {
        title: _t('admin.event5Title', 'Monitoreo de Infraestructura'),
        detail: _t('admin.event5Detail', 'Latencia constante de 24ms sin pérdida de paquetes en streaming.'),
        time: _t('toast.timeHourAgo', 'Hace {n} h', { n: 2 }),
        icon: 'bi-activity',
        color: '#38bdf8'
      }
    ];
  }

  var state = {
    activeTab: 'overview',
    timeRange: '7d',
    userFilter: 'all',
    searchQuery: '',
    users: []
  };

  function getActiveSession() {
    try {
      if (window.BitszoneAuth && typeof window.BitszoneAuth.getSession === 'function') {
        var s = window.BitszoneAuth.getSession();
        if (s) return s;
      }
      var raw = localStorage.getItem('bz_vanilla_session_v1');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function syncSessionWithUsers(list) {
    var session = getActiveSession();
    if (!session) return list;

    var sEmail = (session.email || '').toLowerCase().trim();
    var sName = (session.name || '').trim();
    if (sName.toUpperCase() === 'SUPERADMIN') sName = 'Admin';
    var sAvatar = session.avatarUrl || '';

    if (!sName) return list;

    var matched = false;
    for (var i = 0; i < list.length; i++) {
      var u = list[i];
      var uEmail = (u.email || '').toLowerCase().trim();
      if ((sEmail && uEmail && uEmail === sEmail) || u.id === 'demo-1' || u.id === session.id) {
        u.username = sName;
        if (sAvatar) u.avatar_url = sAvatar;
        if (sEmail) u.email = sEmail;
        matched = true;
        break;
      }
    }

    if (!matched && (session.role === 'admin' || session.role === 'superadmin' || sEmail === 'bitszone.app@gmail.com')) {
      list.unshift({
        id: session.id || 'demo-1',
        username: sName,
        email: sEmail || 'bitszone.app@gmail.com',
        role: 'admin',
        status: 'online',
        playedSongsCount: 842,
        downloadedCount: 124,
        avatar_url: sAvatar
      });
    }

    return list;
  }

  function loadDemoUsers() {
    var list = INITIAL_DEMO_USERS.map(function (u) { return Object.assign({}, u); });
    try {
      var raw = localStorage.getItem(STORAGE_DEMO_USERS);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          list = parsed.map(function (u) {
            if (u.username === 'SUPERADMIN') u.username = 'Admin';
            return Object.assign({}, u);
          });
        }
      }
    } catch (e) {}
    list = syncSessionWithUsers(list);
    return list;
  }

  function saveDemoUsers() {
    try {
      localStorage.setItem(STORAGE_DEMO_USERS, JSON.stringify(state.users));
    } catch (e) {}
  }

  state.users = loadDemoUsers();

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function renderDashboard(container, ctx) {
    var notify = ctx.notify || function () {};
    var onBack = ctx.onBack || function () {};
    var catalogStats = ctx.catalogStats || { albumsCount: 24, tracksCount: 380, source: 'supabase', latencyMs: 24 };

    // Sincronizar siempre con el perfil y sesión activa antes de computar métricas y renderizar
    state.users = syncSessionWithUsers(loadDemoUsers());
    saveDemoUsers();

    var adminCount = state.users.filter(function (u) {
      return u.role === 'admin' || u.role === 'superadmin';
    }).length;

    var chartItems = DEMO_CHARTS[state.timeRange] || DEMO_CHARTS['7d'];
    var maxPlays = Math.max.apply(null, chartItems.map(function (c) { return c.plays; }).concat([10]));

    var filteredUsers = state.users.filter(function (u) {
      var q = state.searchQuery.toLowerCase().trim();
      var matchesQ = !q || u.username.toLowerCase().indexOf(q) !== -1 || (u.email && u.email.toLowerCase().indexOf(q) !== -1);
      var matchesR = state.userFilter === 'all' || (state.userFilter === 'admin' && (u.role === 'admin' || u.role === 'superadmin'));
      return matchesQ && matchesR;
    });

    // 1. Header limpio sin texto superior ni botón agregar admin
    var headerHtml =
      '<div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">' +
        '<div>' +
          '<h1 class="display-6 fw-bold text-white mb-0">' + esc(_t('admin.dashboardTitle', 'Dashboard de Administración')) + '</h1>' +
        '</div>' +
        '<div class="d-flex flex-wrap gap-2">' +
          '<button id="btnDashBack" type="button" class="btn bz-btn-subtle btn-sm px-3 py-2">' +
            '<i class="bi bi-arrow-left me-1"></i> ' + esc(_t('dashboard.backToCatalog', 'Volver al Catálogo')) +
          '</button>' +
        '</div>' +
      '</div>';

    // 2. Tabs Dock (sin pestaña Herramientas)
    var tabsHtml =
      '<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">' +
        '<div class="bz-dock-pills nav nav-pills overflow-auto" role="tablist">' +
          '<button class="nav-link ' + (state.activeTab === 'overview' ? 'active' : '') + '" data-dash-tab="overview"><i class="bi bi-activity me-1"></i>' + esc(_t('dashboard.overview', 'Visión General')) + '</button>' +
          '<button class="nav-link ' + (state.activeTab === 'users' ? 'active' : '') + '" data-dash-tab="users"><i class="bi bi-shield-check me-1"></i>' + esc(_t('dashboard.admins', 'Admins')) + ' (' + state.users.length + ')</button>' +
          '<button class="nav-link ' + (state.activeTab === 'music' ? 'active' : '') + '" data-dash-tab="music"><i class="bi bi-music-note-beamed me-1"></i>' + esc(_t('dashboard.music', 'Música')) + ' (380)</button>' +
        '</div>' +
      '</div>';

    var bodyHtml = '';

    if (state.activeTab === 'overview') {
      bodyHtml =
        // Fila 1: 4 KPIs Principales
        '<div class="row g-3 mb-4">' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="small text-uppercase text-white-50 fw-semibold">' + esc(_t('admin.thAdmin', 'Administradores')) + '</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-shield-check"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">' + adminCount + '</div>' +
              '<div class="small" style="color:var(--bz-soft);">' + adminCount + ' ' + esc(_t('admin.statActiveAdmins', 'Administradores activos')) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="small text-uppercase text-white-50 fw-semibold">' + esc(_t('admin.plays', 'Reproducciones')) + '</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-headphones"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">284,910</div>' +
              '<div class="small text-success"><i class="bi bi-arrow-up-right me-1"></i>+28.4% ' + esc(_t('admin.thisMonth', 'este mes')) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="small text-uppercase text-white-50 fw-semibold">' + esc(_t('admin.statDownloadedTracks', 'Pistas Descargadas')) + '</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-cloud-download"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">43,120</div>' +
              '<div class="small" style="color:var(--bz-soft);">' + esc(_t('admin.statTransferred', '14.2 TB transferidos')) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="small text-uppercase text-white-50 fw-semibold">' + esc(_t('admin.statActiveCatalog', 'Catálogo Activo')) + '</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-disc"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">24 <span class="fs-5 fw-normal text-white-50">' + esc(_t('admin.statAlbums', 'Álbumes')) + '</span></div>' +
              '<div class="small" style="color:var(--bz-soft);">' + esc(_t('admin.statHiResSongs', '380 canciones Hi-Res')) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Fila 2: 4 Tarjetas de Telemetría e Infraestructura en Vivo (MÁS INFORMACIÓN)
        '<div class="row g-3 mb-4">' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-3 h-100 d-flex flex-column justify-content-between" style="background: rgba(255,255,255,0.03);">' +
              '<div class="d-flex align-items-center justify-content-between mb-2">' +
                '<span class="small text-white-50">' + esc(_t('admin.onlineListeners', 'Oyentes en Línea')) + '</span>' +
                '<span class="badge rounded-pill bg-success bg-opacity-25 text-success font-mono-bz px-2 py-1"><i class="bi bi-broadcast me-1"></i>' + esc(_t('admin.live', 'En Vivo')) + '</span>' +
              '</div>' +
              '<div class="h3 fw-bold text-white mb-1 font-mono-bz">1,428</div>' +
              '<div class="small text-white-50">' + esc(_t('admin.activeStreaming', 'Streaming simultáneo activo')) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-3 h-100 d-flex flex-column justify-content-between" style="background: rgba(255,255,255,0.03);">' +
              '<div class="d-flex align-items-center justify-content-between mb-2">' +
                '<span class="small text-white-50">' + esc(_t('admin.cdnStorage', 'Almacenamiento CDN')) + '</span>' +
                '<span class="small text-white-50 font-mono-bz">71%</span>' +
              '</div>' +
              '<div class="h3 fw-bold text-white mb-2 font-mono-bz">14.2 <span class="fs-6 fw-normal text-white-50">/ 20 TB</span></div>' +
              '<div class="progress rounded-pill bg-white bg-opacity-10" style="height: 6px;">' +
                '<div class="progress-bar rounded-pill" style="width: 71%; background: linear-gradient(90deg, #c084fc, #f472b6);"></div>' +
              '</div>' +
              '<div class="small text-white-50 mt-1">' + esc(_t('admin.storageFree', '5.8 TB libres en almacenamiento')) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-3 h-100 d-flex flex-column justify-content-between" style="background: rgba(255,255,255,0.03);">' +
              '<div class="d-flex align-items-center justify-content-between mb-2">' +
                '<span class="small text-white-50">' + esc(_t('admin.uptime', 'Uptime y Disponibilidad')) + '</span>' +
                '<span class="text-success small"><i class="bi bi-shield-fill-check"></i></span>' +
              '</div>' +
              '<div class="h3 fw-bold text-white mb-1 font-mono-bz">99.98%</div>' +
              '<div class="small text-white-50">' + esc(_t('admin.uptimeDesc', 'Cero incidencias en 30 días')) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-3 h-100 d-flex flex-column justify-content-between" style="background: rgba(255,255,255,0.03);">' +
              '<div class="d-flex align-items-center justify-content-between mb-2">' +
                '<span class="small text-white-50">' + esc(_t('admin.streamingQuality', 'Calidad de Streaming')) + '</span>' +
                '<span class="badge rounded-pill bg-white bg-opacity-10 text-white font-mono-bz">Hi-Res</span>' +
              '</div>' +
              '<div class="h3 fw-bold text-white mb-1 font-mono-bz">320 kbps</div>' +
              '<div class="small text-white-50">' + esc(_t('admin.losslessAudio', 'Audio estéreo sin pérdidas')) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Fila 3: Gráfico de Tráfico (8 cols) + Distribución de Géneros (4 cols)
        '<div class="row g-4 mb-4">' +
          '<div class="col-12 col-xl-8">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">' +
                '<div>' +
                  '<h4 class="h5 fw-bold text-white mb-1"><i class="bi bi-graph-up-arrow me-2" style="color:var(--bz-lavender);"></i>' + esc(_t('admin.trafficTitle', 'Tráfico y Reproducciones')) + '</h4>' +
                  '<p class="small text-white-50 mb-0">' + esc(_t('admin.trafficDesc', 'Picos de actividad y telemetría de streaming')) + '</p>' +
                '</div>' +
                '<div class="bz-segmented-dock">' +
                  ['24h', '7d', '30d'].map(function (r) {
                    var label = r === '24h' ? _t('admin.range24h', '24 Horas') : r === '7d' ? _t('admin.range7d', '7 Días') : _t('admin.range30d', '30 Días');
                    var activeCls = state.timeRange === r ? 'active' : '';
                    return '<button type="button" class="bz-segmented-btn ' + activeCls + '" data-dash-range="' + r + '">' + label + '</button>';
                  }).join('') +
                '</div>' +
              '</div>' +
              '<div class="bz-chart-wrap">' +
                chartItems.map(function (c) {
                  var hPct = Math.max(14, Math.round((c.plays / maxPlays) * 100));
                  return (
                    '<div class="bz-chart-col">' +
                      '<div class="bz-chart-tooltip text-center">' +
                        '<strong class="d-block text-white">' + c.plays.toLocaleString() + ' plays</strong>' +
                        '<span style="color:var(--bz-soft);">' + c.users.toLocaleString() + ' ' + esc(_t('admin.chartListeners', 'oyentes')) + '</span>' +
                      '</div>' +
                      '<div class="bz-chart-track">' +
                        '<div class="bz-chart-bar" style="height:' + hPct + '%;"></div>' +
                      '</div>' +
                      '<span class="small font-mono-bz text-white-50 mt-2">' + c.label + '</span>' +
                    '</div>'
                  );
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="col-12 col-xl-4">' +
            '<div class="bz-glass-card p-4 h-100 d-flex flex-column justify-content-between">' +
              '<div>' +
                '<div class="d-flex align-items-center justify-content-between mb-3">' +
                  '<h4 class="h5 fw-bold text-white mb-0"><i class="bi bi-pie-chart me-2" style="color:var(--bz-lavender);"></i>' + esc(_t('admin.genresTitle', 'Géneros en Tendencia')) + '</h4>' +
                  '<span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 font-mono-bz">' + esc(_t('admin.audience', 'Audiencia')) + '</span>' +
                '</div>' +
                '<p class="small text-white-50 mb-4">' + esc(_t('admin.genresDesc', 'Preferencia de géneros entre la comunidad de oyentes')) + '</p>' +
                '<div class="d-grid gap-3">' +
                  GENRE_DISTRIBUTION.map(function (g) {
                    return (
                      '<div>' +
                        '<div class="d-flex justify-content-between align-items-center small mb-1">' +
                          '<span class="text-white fw-medium">' + g.name + '</span>' +
                          '<span class="font-mono-bz text-white-50">' + g.count + ' (' + g.percent + '%)</span>' +
                        '</div>' +
                        '<div class="progress rounded-pill bg-white bg-opacity-10" style="height: 6px;">' +
                          '<div class="progress-bar rounded-pill" style="width:' + g.percent + '%; background-color:' + g.color + ';"></div>' +
                        '</div>' +
                      '</div>'
                    );
                  }).join('') +
                '</div>' +
              '</div>' +
              '<div class="pt-3 border-top border-white border-opacity-10 mt-3 d-flex align-items-center justify-content-between small text-white-50">' +
                '<span>' + esc(_t('admin.mainPlatform', 'Plataforma principal:')) + '</span>' +
                '<strong class="text-white font-mono-bz">' + esc(_t('admin.platformSplit', 'Web Desktop 58% · Móvil 36%')) + '</strong>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Fila 4: Top 5 Canciones Más Populares (6 cols) + Registro de Actividad y Eventos (6 cols)
        '<div class="row g-4">' +
          '<div class="col-12 col-xl-6">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex align-items-center justify-content-between mb-3">' +
                '<h4 class="h5 fw-bold text-white mb-0"><i class="bi bi-fire me-2 text-warning"></i>' + esc(_t('admin.topTracksInPlatform', 'Top Canciones en Plataforma')) + '</h4>' +
                '<span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 font-mono-bz">' + esc(_t('admin.catalogBadge', 'Catálogo')) + '</span>' +
              '</div>' +
              '<p class="small text-white-50 mb-3">' + esc(_t('admin.topTracksDesc', 'Pistas con mayor volumen de reproducción y descargas')) + '</p>' +
              '<div class="d-grid gap-2">' +
                DEMO_POPULAR_TRACKS.map(function (t, i) {
                  return (
                    '<div class="d-flex align-items-center justify-content-between p-2.5 rounded-3" style="background: rgba(255,255,255,0.03);">' +
                      '<div class="d-flex align-items-center gap-3">' +
                        '<span class="fw-bold font-mono-bz" style="color:var(--bz-lavender); width:24px;">#' + (i + 1) + '</span>' +
                        '<div class="rounded-3 d-flex align-items-center justify-content-center" style="width:38px;height:38px;background:rgba(255,255,255,0.08);"><i class="bi bi-music-note text-white"></i></div>' +
                        '<div>' +
                          '<div class="fw-semibold text-white small">' + escHtml(t.title) + '</div>' +
                          '<div class="text-white-50" style="font-size:0.75rem;">' + escHtml(t.artist) + ' · <span style="color:var(--bz-soft);">' + escHtml(t.album) + '</span></div>' +
                        '</div>' +
                      '</div>' +
                      '<div class="text-end font-mono-bz" style="font-size:0.78rem;">' +
                        '<div class="text-white fw-bold">' + t.plays.toLocaleString() + ' plays</div>' +
                        '<div class="text-white-50">' + t.downloads.toLocaleString() + ' ' + esc(_t('admin.thDownloads', 'descargas')) + '</div>' +
                      '</div>' +
                    '</div>'
                  );
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="col-12 col-xl-6">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex align-items-center justify-content-between mb-3">' +
                '<h4 class="h5 fw-bold text-white mb-0"><i class="bi bi-clock-history me-2" style="color:var(--bz-lavender);"></i>' + esc(_t('admin.recentEvents', 'Registro de Actividad y Eventos')) + '</h4>' +
                '<span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 font-mono-bz">' + esc(_t('admin.auditBadge', 'Auditoría')) + '</span>' +
              '</div>' +
              '<p class="small text-white-50 mb-3">' + esc(_t('admin.recentEventsDesc', 'Eventos recientes registrados por el sistema de Bitszone')) + '</p>' +
              '<div class="d-grid gap-2">' +
                getSystemActivityEvents().map(function (ev) {
                  return (
                    '<div class="d-flex align-items-start gap-3 p-2.5 rounded-3" style="background: rgba(255,255,255,0.03);">' +
                      '<div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1" style="width:32px;height:32px;background:rgba(255,255,255,0.08);color:' + ev.color + ';">' +
                        '<i class="bi ' + ev.icon + '"></i>' +
                      '</div>' +
                      '<div class="flex-grow-1 min-w-0">' +
                        '<div class="d-flex align-items-center justify-content-between">' +
                          '<span class="fw-semibold text-white small">' + ev.title + '</span>' +
                          '<span class="text-white-50 font-mono-bz" style="font-size: 0.72rem;">' + ev.time + '</span>' +
                        '</div>' +
                        '<p class="text-white-50 mb-0" style="font-size: 0.75rem; line-height: 1.35;">' + ev.detail + '</p>' +
                      '</div>' +
                    '</div>'
                  );
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

    } else if (state.activeTab === 'users') {
      bodyHtml =
        '<div class="bz-glass-card p-4">' +
          '<div class="row g-3 align-items-center mb-4">' +
            '<div class="col-12 col-md-6">' +
              '<div class="position-relative">' +
                '<i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-white-50"></i>' +
                '<input id="dashUserSearch" type="text" class="form-control bz-input-dark bz-input-with-icon" placeholder="' + escHtml(_t('admin.searchAdminPlaceholder', 'Buscar administrador o correo...')) + '" value="' + escHtml(state.searchQuery) + '" />' +
              '</div>' +
            '</div>' +
            '<div class="col-12 col-md-6 d-flex justify-content-md-end">' +
              '<div class="bz-segmented-dock">' +
                ['all', 'admin'].map(function (roleKey) {
                  var txt = roleKey === 'all' ? _t('admin.filterAll', 'Todos') : _t('admin.filterAdmins', 'Admins');
                  var activeCls = state.userFilter === roleKey ? 'active' : '';
                  return '<button type="button" class="bz-segmented-btn ' + activeCls + '" data-dash-role="' + roleKey + '">' + txt + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="table-responsive">' +
            '<table class="table table-dark table-hover align-middle mb-0" style="--bs-table-bg: transparent; --bs-table-hover-bg: rgba(255,255,255,0.06);">' +
              '<thead>' +
                '<tr class="text-white-50 small text-uppercase">' +
                  '<th>' + esc(_t('admin.thAdmin', 'Administrador')) + '</th><th>' + esc(_t('admin.thRole', 'Rol')) + '</th><th>' + esc(_t('admin.thStatus', 'Estado')) + '</th><th class="text-center">' + esc(_t('admin.thSongs', 'Canciones')) + '</th><th class="text-center">' + esc(_t('admin.thDownloads', 'Descargas')) + '</th><th class="text-end">' + esc(_t('admin.thAction', 'Acción')) + '</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                (filteredUsers.length === 0
                  ? '<tr><td colspan="6" class="text-center py-4 text-white-50">' + esc(_t('admin.noAdminsFound', 'No se encontraron administradores con ese criterio.')) + '</td></tr>'
                  : filteredUsers.map(function (u) {
                      var isRoot = (u.id === 'demo-1' || u.email === 'bitszone.app@gmail.com');
                      var avatarHtml = u.avatar_url
                        ? '<img src="' + escHtml(u.avatar_url) + '" alt="" width="38" height="38" class="rounded-circle object-fit-cover" />'
                        : '<span class="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white" style="width:38px;height:38px;background:rgba(168,85,247,0.3);">' + escHtml(u.username.charAt(0).toUpperCase()) + '</span>';
                      
                      var roleBadge = '<span class="badge rounded-pill" style="background:rgba(168,85,247,0.28);color:#e9d5ff;"><i class="bi bi-shield-check me-1"></i>' + esc(_t('admin.roleAdminBadge', 'Admin')) + '</span>';

                      var statusHtml = u.status === 'online'
                        ? '<span class="text-success small"><i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i>' + esc(_t('admin.statusOnline', 'En línea')) + '</span>'
                        : '<span class="text-warning small"><i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i>' + esc(_t('admin.statusInactive', 'Inactivo')) + '</span>';
                      
                      var actionBtn = isRoot
                        ? '<span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 px-3 py-2"><i class="bi bi-lock me-1"></i>' + esc(_t('admin.immutable', 'Inmutable')) + '</span>'
                        : '<button type="button" class="btn btn-sm bz-btn-subtle px-3" data-toggle-admin-id="' + escHtml(u.id) + '">' + (u.role === 'admin' ? esc(_t('admin.removeAdmin', 'Quitar Admin')) : esc(_t('admin.makeAdmin', 'Hacer Admin'))) + '</button>';

                      return (
                        '<tr>' +
                          '<td><div class="d-flex align-items-center gap-3">' + avatarHtml + '<div><div class="fw-semibold text-white">' + escHtml(u.username) + '</div><small class="text-white-50 font-mono-bz">' + escHtml(u.email) + '</small></div></div></td>' +
                          '<td>' + roleBadge + '</td>' +
                          '<td>' + statusHtml + '</td>' +
                          '<td class="text-center font-mono-bz">' + u.playedSongsCount + '</td>' +
                          '<td class="text-center font-mono-bz" style="color:var(--bz-soft);">' + u.downloadedCount + '</td>' +
                          '<td class="text-end">' + actionBtn + '</td>' +
                        '</tr>'
                      );
                    }).join('')
                ) +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';

    } else if (state.activeTab === 'music') {
      bodyHtml =
        '<div class="bz-glass-card p-4 mb-4">' +
          '<h4 class="h5 fw-bold text-white mb-1"><i class="bi bi-fire me-2" style="color:var(--bz-lavender);"></i>' + esc(_t('admin.topTracksGlobal', 'Top Canciones Más Escuchadas')) + '</h4>' +
          '<p class="small text-white-50 mb-4">' + esc(_t('admin.metricsDesc', 'Métricas de reproducción y rendimiento en el catálogo')) + '</p>' +
          '<div class="d-grid gap-2">' +
            DEMO_POPULAR_TRACKS.map(function (t, i) {
              return (
                '<div class="d-flex align-items-center justify-content-between p-3 rounded-4" style="background: rgba(255,255,255,0.03);">' +
                  '<div class="d-flex align-items-center gap-3">' +
                    '<span class="fw-bold font-mono-bz" style="color:var(--bz-lavender); width:26px;">#' + (i + 1) + '</span>' +
                    '<div class="rounded-3 d-flex align-items-center justify-content-center" style="width:42px;height:42px;background:rgba(255,255,255,0.08);"><i class="bi bi-music-note text-white"></i></div>' +
                    '<div><div class="fw-semibold text-white">' + escHtml(t.title) + '</div><small class="text-white-50">' + escHtml(t.artist) + ' · <span style="color:var(--bz-soft);">' + escHtml(t.album) + '</span></small></div>' +
                  '</div>' +
                  '<div class="text-end font-mono-bz small">' +
                    '<div class="text-white fw-bold">' + t.plays.toLocaleString() + ' plays</div>' +
                    '<div class="text-white-50">' + t.downloads.toLocaleString() + ' ' + esc(_t('admin.thDownloads', 'descargas')) + '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('') +
          '</div>' +
        '</div>';
    }

    container.innerHTML = '<div class="container-fluid px-0 px-md-2 pb-4">' + headerHtml + tabsHtml + bodyHtml + '</div>';

    // Eventos
    var backBtn = document.getElementById('btnDashBack');
    if (backBtn) backBtn.addEventListener('click', onBack);

    container.querySelectorAll('[data-dash-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.activeTab = btn.getAttribute('data-dash-tab');
        renderDashboard(container, ctx);
      });
    });

    container.querySelectorAll('[data-dash-range]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.timeRange = btn.getAttribute('data-dash-range');
        renderDashboard(container, ctx);
      });
    });

    container.querySelectorAll('[data-dash-role]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.userFilter = btn.getAttribute('data-dash-role');
        renderDashboard(container, ctx);
      });
    });

    var searchInp = document.getElementById('dashUserSearch');
    if (searchInp) {
      searchInp.addEventListener('input', function (e) {
        state.searchQuery = e.target.value;
        renderDashboard(container, ctx);
        var refreshedSearch = document.getElementById('dashUserSearch');
        if (refreshedSearch) {
          refreshedSearch.focus();
          refreshedSearch.setSelectionRange(state.searchQuery.length, state.searchQuery.length);
        }
      });
    }

    container.querySelectorAll('[data-toggle-admin-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var uid = btn.getAttribute('data-toggle-admin-id');
        for (var i = 0; i < state.users.length; i++) {
          if (state.users[i].id === uid && state.users[i].id !== 'demo-1' && state.users[i].email !== 'bitszone.app@gmail.com') {
            state.users[i].role = state.users[i].role === 'admin' ? 'user' : 'admin';
            saveDemoUsers();
            notify(_t('admin.roleUpdatedToast', 'Rol de {username} actualizado a {role}', { username: state.users[i].username, role: state.users[i].role.toUpperCase() }));
            renderDashboard(container, ctx);
            break;
          }
        }
      });
    });

  }

  window.BitszoneDashboard = {
    renderDashboard: renderDashboard,
    syncSessionUser: function (updatedSession) {
      state.users = syncSessionWithUsers(loadDemoUsers());
      if (updatedSession) {
        var sEmail = (updatedSession.email || '').toLowerCase().trim();
        var sName = (updatedSession.name || '').trim();
        if (sName.toUpperCase() === 'SUPERADMIN') sName = 'Admin';
        for (var i = 0; i < state.users.length; i++) {
          var u = state.users[i];
          var uEmail = (u.email || '').toLowerCase().trim();
          if ((sEmail && uEmail && uEmail === sEmail) || u.id === 'demo-1') {
            if (sName) u.username = sName;
            if (updatedSession.avatarUrl !== undefined) u.avatar_url = updatedSession.avatarUrl;
            break;
          }
        }
      }
      saveDemoUsers();
    }
  };
})(window);
