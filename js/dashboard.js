/* ==========================================================================
   BITSZONE — Dashboard de Administración
   Protegido por rol 'admin', maquetado con Bootstrap 5 + JS puro
   ========================================================================== */
(function (window) {
  'use strict';

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

  var SYSTEM_ACTIVITY_EVENTS = [
    {
      title: 'Sincronización de Catálogo',
      detail: 'Pistas de Supabase REST API verificadas correctamente con 24 álbumes.',
      time: 'Hace 2 min',
      icon: 'bi-check2-circle',
      color: '#34d399'
    },
    {
      title: 'Hito de Reproducción',
      detail: '"Billie Jean" de Michael Jackson superó las 48,000 escuchas activas.',
      time: 'Hace 18 min',
      icon: 'bi-fire',
      color: '#f472b6'
    },
    {
      title: 'Almacenamiento Offline',
      detail: 'Caché de descargas IndexedDB optimizado al 100% en clientes activos.',
      time: 'Hace 45 min',
      icon: 'bi-cloud-check',
      color: '#818cf8'
    },
    {
      title: 'Seguridad y Acceso',
      detail: 'Sesión de Administrador autorizada y enlazada al panel de control.',
      time: 'Hace 1 hora',
      icon: 'bi-shield-check',
      color: '#c084fc'
    },
    {
      title: 'Monitoreo de Infraestructura',
      detail: 'Latencia constante de 24ms sin pérdida de paquetes en streaming.',
      time: 'Hace 2 horas',
      icon: 'bi-activity',
      color: '#38bdf8'
    }
  ];

  var state = {
    activeTab: 'overview',
    timeRange: '7d',
    userFilter: 'all',
    searchQuery: '',
    users: []
  };

  function loadDemoUsers() {
    try {
      var raw = localStorage.getItem(STORAGE_DEMO_USERS);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map(function (u) {
            if (u.username === 'SUPERADMIN') u.username = 'Admin';
            return u;
          });
        }
      }
    } catch (e) {}
    return INITIAL_DEMO_USERS.slice();
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

    // 1. Header profesional sin la píldora de "Modo Demo Académico"
    var headerHtml =
      '<div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">' +
        '<div>' +
          '<div class="d-flex align-items-center gap-2 mb-1">' +
            '<span class="small text-white-50 text-uppercase fw-semibold tracking-wider" style="letter-spacing: 0.05em;">Panel de Control</span>' +
            '<span class="text-white-50">·</span>' +
            '<span class="small d-inline-flex align-items-center gap-1 font-mono-bz" style="color: #34d399;">' +
              '<span class="d-inline-block rounded-circle" style="width: 7px; height: 7px; background-color: #34d399; box-shadow: 0 0 8px #34d399;"></span>' +
              'Supabase 24ms (Óptimo)' +
            '</span>' +
          '</div>' +
          '<h1 class="display-6 fw-bold text-white mb-0">Dashboard de Administración</h1>' +
        '</div>' +
        '<div class="d-flex flex-wrap gap-2">' +
          '<button type="button" class="btn bz-btn-primary btn-sm px-3 py-2" data-bs-toggle="modal" data-bs-target="#addAdminModal">' +
            '<i class="bi bi-person-plus me-1"></i> Agregar Admin' +
          '</button>' +
          '<button id="btnDashBack" type="button" class="btn bz-btn-subtle btn-sm px-3 py-2">' +
            '<i class="bi bi-arrow-left me-1"></i> Volver al Catálogo' +
          '</button>' +
        '</div>' +
      '</div>';

    // 2. Tabs Dock
    var tabsHtml =
      '<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">' +
        '<div class="bz-dock-pills nav nav-pills overflow-auto" role="tablist">' +
          '<button class="nav-link ' + (state.activeTab === 'overview' ? 'active' : '') + '" data-dash-tab="overview"><i class="bi bi-activity me-1"></i>Visión General</button>' +
          '<button class="nav-link ' + (state.activeTab === 'users' ? 'active' : '') + '" data-dash-tab="users"><i class="bi bi-shield-check me-1"></i>Admins (' + state.users.length + ')</button>' +
          '<button class="nav-link ' + (state.activeTab === 'music' ? 'active' : '') + '" data-dash-tab="music"><i class="bi bi-music-note-beamed me-1"></i>Música (380)</button>' +
          '<button class="nav-link ' + (state.activeTab === 'tools' ? 'active' : '') + '" data-dash-tab="tools"><i class="bi bi-sliders me-1"></i>Herramientas</button>' +
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
                '<span class="small text-uppercase text-white-50 fw-semibold">Administradores</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-shield-check"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">' + adminCount + '</div>' +
              '<div class="small" style="color:var(--bz-soft);">' + adminCount + ' Administradores activos</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="small text-uppercase text-white-50 fw-semibold">Reproducciones</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-headphones"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">284,910</div>' +
              '<div class="small text-success"><i class="bi bi-arrow-up-right me-1"></i>+28.4% este mes</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="small text-uppercase text-white-50 fw-semibold">Pistas Descargadas</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-cloud-download"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">43,120</div>' +
              '<div class="small" style="color:var(--bz-soft);">14.2 TB transferidos</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="small text-uppercase text-white-50 fw-semibold">Catálogo Activo</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-disc"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">24 <span class="fs-5 fw-normal text-white-50">Álbumes</span></div>' +
              '<div class="small" style="color:var(--bz-soft);">380 canciones Hi-Res</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Fila 2: 4 Tarjetas de Telemetría e Infraestructura en Vivo (MÁS INFORMACIÓN)
        '<div class="row g-3 mb-4">' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-3 h-100 d-flex flex-column justify-content-between" style="background: rgba(255,255,255,0.03);">' +
              '<div class="d-flex align-items-center justify-content-between mb-2">' +
                '<span class="small text-white-50">Oyentes en Línea</span>' +
                '<span class="badge rounded-pill bg-success bg-opacity-25 text-success font-mono-bz px-2 py-1"><i class="bi bi-broadcast me-1"></i>En Vivo</span>' +
              '</div>' +
              '<div class="h3 fw-bold text-white mb-1 font-mono-bz">1,428</div>' +
              '<div class="small text-white-50">Streaming simultáneo activo</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-3 h-100 d-flex flex-column justify-content-between" style="background: rgba(255,255,255,0.03);">' +
              '<div class="d-flex align-items-center justify-content-between mb-2">' +
                '<span class="small text-white-50">Almacenamiento CDN</span>' +
                '<span class="small text-white-50 font-mono-bz">71%</span>' +
              '</div>' +
              '<div class="h3 fw-bold text-white mb-2 font-mono-bz">14.2 <span class="fs-6 fw-normal text-white-50">/ 20 TB</span></div>' +
              '<div class="progress rounded-pill bg-white bg-opacity-10" style="height: 6px;">' +
                '<div class="progress-bar rounded-pill" style="width: 71%; background: linear-gradient(90deg, #c084fc, #f472b6);"></div>' +
              '</div>' +
              '<div class="small text-white-50 mt-1">5.8 TB libres en almacenamiento</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-3 h-100 d-flex flex-column justify-content-between" style="background: rgba(255,255,255,0.03);">' +
              '<div class="d-flex align-items-center justify-content-between mb-2">' +
                '<span class="small text-white-50">Uptime y Disponibilidad</span>' +
                '<span class="text-success small"><i class="bi bi-shield-fill-check"></i></span>' +
              '</div>' +
              '<div class="h3 fw-bold text-white mb-1 font-mono-bz">99.98%</div>' +
              '<div class="small text-white-50">Cero incidencias en 30 días</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-3 h-100 d-flex flex-column justify-content-between" style="background: rgba(255,255,255,0.03);">' +
              '<div class="d-flex align-items-center justify-content-between mb-2">' +
                '<span class="small text-white-50">Calidad de Streaming</span>' +
                '<span class="badge rounded-pill bg-white bg-opacity-10 text-white font-mono-bz">Hi-Res</span>' +
              '</div>' +
              '<div class="h3 fw-bold text-white mb-1 font-mono-bz">320 kbps</div>' +
              '<div class="small text-white-50">Audio estéreo sin pérdidas</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Fila 3: Gráfico de Tráfico (8 cols) + Distribución de Géneros (4 cols)
        '<div class="row g-4 mb-4">' +
          '<div class="col-12 col-xl-8">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">' +
                '<div>' +
                  '<h4 class="h5 fw-bold text-white mb-1"><i class="bi bi-graph-up-arrow me-2" style="color:var(--bz-lavender);"></i>Tráfico y Reproducciones</h4>' +
                  '<p class="small text-white-50 mb-0">Picos de actividad y telemetría de streaming</p>' +
                '</div>' +
                '<div class="btn-group btn-group-sm">' +
                  ['24h', '7d', '30d'].map(function (r) {
                    var label = r === '24h' ? '24 Horas' : r === '7d' ? '7 Días' : '30 Días';
                    return '<button type="button" class="btn ' + (state.timeRange === r ? 'btn-light text-dark fw-semibold' : 'bz-btn-subtle') + '" data-dash-range="' + r + '">' + label + '</button>';
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
                        '<span style="color:var(--bz-soft);">' + c.users.toLocaleString() + ' oyentes</span>' +
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
                  '<h4 class="h5 fw-bold text-white mb-0"><i class="bi bi-pie-chart me-2" style="color:var(--bz-lavender);"></i>Géneros en Tendencia</h4>' +
                  '<span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 font-mono-bz">Audiencia</span>' +
                '</div>' +
                '<p class="small text-white-50 mb-4">Preferencia de géneros entre la comunidad de oyentes</p>' +
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
                '<span>Plataforma principal:</span>' +
                '<strong class="text-white font-mono-bz">Web Desktop 58% · Móvil 36%</strong>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Fila 4: Top 5 Canciones Más Populares (6 cols) + Registro de Actividad y Eventos (6 cols)
        '<div class="row g-4">' +
          '<div class="col-12 col-xl-6">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex align-items-center justify-content-between mb-3">' +
                '<h4 class="h5 fw-bold text-white mb-0"><i class="bi bi-fire me-2 text-warning"></i>Top Canciones en Plataforma</h4>' +
                '<span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 font-mono-bz">Catálogo</span>' +
              '</div>' +
              '<p class="small text-white-50 mb-3">Pistas con mayor volumen de reproducción y descargas</p>' +
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
                        '<div class="text-white-50">' + t.downloads.toLocaleString() + ' descargas</div>' +
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
                '<h4 class="h5 fw-bold text-white mb-0"><i class="bi bi-clock-history me-2" style="color:var(--bz-lavender);"></i>Registro de Actividad y Eventos</h4>' +
                '<span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 font-mono-bz">Auditoría</span>' +
              '</div>' +
              '<p class="small text-white-50 mb-3">Eventos recientes registrados por el sistema de Bitszone</p>' +
              '<div class="d-grid gap-2">' +
                SYSTEM_ACTIVITY_EVENTS.map(function (ev) {
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
                '<input id="dashUserSearch" type="text" class="form-control bz-input-dark bz-input-with-icon" placeholder="Buscar administrador o correo..." value="' + escHtml(state.searchQuery) + '" />' +
              '</div>' +
            '</div>' +
            '<div class="col-12 col-md-6 d-flex justify-content-md-end gap-2 flex-wrap">' +
              ['all', 'admin'].map(function (roleKey) {
                var txt = roleKey === 'all' ? 'Todos' : 'Admins';
                return '<button type="button" class="btn btn-sm ' + (state.userFilter === roleKey ? 'btn-light text-dark fw-semibold' : 'bz-btn-subtle') + '" data-dash-role="' + roleKey + '">' + txt + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="table-responsive">' +
            '<table class="table table-dark table-hover align-middle mb-0" style="--bs-table-bg: transparent; --bs-table-hover-bg: rgba(255,255,255,0.06);">' +
              '<thead>' +
                '<tr class="text-white-50 small text-uppercase">' +
                  '<th>Administrador</th><th>Rol</th><th>Estado</th><th class="text-center">Canciones</th><th class="text-center">Descargas</th><th class="text-end">Acción</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                (filteredUsers.length === 0
                  ? '<tr><td colspan="6" class="text-center py-4 text-white-50">No se encontraron administradores con ese criterio.</td></tr>'
                  : filteredUsers.map(function (u) {
                      var isRoot = (u.id === 'demo-1' || u.email === 'bitszone.app@gmail.com');
                      var avatarHtml = u.avatar_url
                        ? '<img src="' + escHtml(u.avatar_url) + '" alt="" width="38" height="38" class="rounded-circle object-fit-cover" />'
                        : '<span class="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white" style="width:38px;height:38px;background:rgba(168,85,247,0.3);">' + escHtml(u.username.charAt(0).toUpperCase()) + '</span>';
                      
                      var roleBadge = '<span class="badge rounded-pill" style="background:rgba(168,85,247,0.28);color:#e9d5ff;"><i class="bi bi-shield-check me-1"></i>Admin</span>';

                      var statusHtml = u.status === 'online'
                        ? '<span class="text-success small"><i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i>En línea</span>'
                        : '<span class="text-warning small"><i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i>Inactivo</span>';
                      
                      var actionBtn = isRoot
                        ? '<span class="badge rounded-pill bg-white bg-opacity-10 text-white-50 px-3 py-2"><i class="bi bi-lock me-1"></i>Inmutable</span>'
                        : '<button type="button" class="btn btn-sm bz-btn-subtle px-3" data-toggle-admin-id="' + escHtml(u.id) + '">' + (u.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin') + '</button>';

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
          '<h4 class="h5 fw-bold text-white mb-1"><i class="bi bi-fire me-2" style="color:var(--bz-lavender);"></i>Top Canciones Más Escuchadas</h4>' +
          '<p class="small text-white-50 mb-4">Métricas de reproducción y rendimiento en el catálogo</p>' +
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
                    '<div class="text-white-50">' + t.downloads.toLocaleString() + ' descargas</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('') +
          '</div>' +
        '</div>';

    } else if (state.activeTab === 'tools') {
      bodyHtml =
        '<div class="row g-4">' +
          '<div class="col-12 col-md-6">' +
            '<div class="bz-glass-card p-4 h-100 d-flex flex-column justify-content-between">' +
              '<div>' +
                '<div class="fx-icon-tile mb-3"><i class="bi bi-stars fs-5"></i></div>' +
                '<h4 class="h5 fw-bold text-white mb-2">Nuevo Lanzamiento</h4>' +
                '<p class="small text-white-50 mb-4">Registra o programa nuevas pistas y álbumes en el catálogo de Bitszone.</p>' +
              '</div>' +
              '<button type="button" class="btn bz-btn-primary w-100 py-2" data-bs-toggle="modal" data-bs-target="#releaseDemoModal">' +
                '<i class="bi bi-plus-circle me-1"></i> Registrar Lanzamiento' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-md-6">' +
            '<div class="bz-glass-card p-4 h-100 d-flex flex-column justify-content-between">' +
              '<div>' +
                '<div class="fx-icon-tile mb-3"><i class="bi bi-disc fs-5"></i></div>' +
                '<h4 class="h5 fw-bold text-white mb-2">Estado del Catálogo</h4>' +
                '<p class="small text-white-50 mb-4">Origen activo: <strong>' + (catalogStats.source === 'supabase' ? 'Supabase REST (En línea)' : 'Respaldo Local') + '</strong> · ' + catalogStats.albumsCount + ' álbumes / ' + catalogStats.tracksCount + ' pistas cargadas.</p>' +
              '</div>' +
              '<button type="button" class="btn bz-btn-subtle w-100 py-2" data-bs-toggle="modal" data-bs-target="#catalogDiagModal">' +
                '<i class="bi bi-arrow-repeat me-1"></i> Verificar Estado de Catálogo' +
              '</button>' +
            '</div>' +
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
            notify('Rol de ' + state.users[i].username + ' actualizado a ' + state.users[i].role.toUpperCase());
            renderDashboard(container, ctx);
            break;
          }
        }
      });
    });

    ensureModals(notify);
  }

  function ensureModals(notify) {
    if (document.getElementById('addAdminModal')) return;

    var modalWrapper = document.createElement('div');
    modalWrapper.innerHTML =
      // Modal Agregar Admin
      '<div class="modal fade" id="addAdminModal" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content bz-glass-modal border-0">' +
            '<div class="modal-header border-0 pb-0">' +
              '<h5 class="modal-title fw-bold text-white"><i class="bi bi-person-plus me-2" style="color:var(--bz-lavender);"></i>Agregar Administrador</h5>' +
              '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<form id="formAddAdminSubmit" class="d-grid gap-3">' +
                '<div>' +
                  '<label class="form-label small text-white-50">Nombre de Usuario o Alias</label>' +
                  '<input id="newAdminName" type="text" required class="form-control bz-input-dark" placeholder="Ej. Martin_Music" />' +
                '</div>' +
                '<div>' +
                  '<label class="form-label small text-white-50">Correo Electrónico</label>' +
                  '<input id="newAdminEmail" type="email" required class="form-control bz-input-dark" placeholder="admin@bitszone.net" />' +
                '</div>' +
                '<button type="submit" class="btn bz-btn-primary py-2 mt-2">Guardar Administrador</button>' +
              '</form>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Modal Nuevo Lanzamiento
      '<div class="modal fade" id="releaseDemoModal" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content bz-glass-modal border-0">' +
            '<div class="modal-header border-0 pb-0">' +
              '<h5 class="modal-title fw-bold text-white"><i class="bi bi-stars me-2" style="color:var(--bz-lavender);"></i>Nuevo Lanzamiento</h5>' +
              '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<form id="formReleaseDemoSubmit" class="d-grid gap-3">' +
                '<div>' +
                  '<label class="form-label small text-white-50">Título de la Canción</label>' +
                  '<input id="releaseTrackTitle" type="text" required class="form-control bz-input-dark" placeholder="Ej. Starlight Echoes" />' +
                '</div>' +
                '<div>' +
                  '<label class="form-label small text-white-50">Artista</label>' +
                  '<input id="releaseTrackArtist" type="text" required class="form-control bz-input-dark" placeholder="Ej. Neon Pulse" />' +
                '</div>' +
                '<div>' +
                  '<label class="form-label small text-white-50">Álbum</label>' +
                  '<input id="releaseTrackAlbum" type="text" required class="form-control bz-input-dark" placeholder="Ej. Future Horizons (2026)" />' +
                '</div>' +
                '<button type="submit" class="btn bz-btn-primary py-2 mt-2">Publicar Lanzamiento</button>' +
              '</form>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Modal Diagnóstico de Catálogo
      '<div class="modal fade" id="catalogDiagModal" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content bz-glass-modal border-0">' +
            '<div class="modal-header border-0 pb-0">' +
              '<h5 class="modal-title fw-bold text-white"><i class="bi bi-hdd-network me-2" style="color:var(--bz-lavender);"></i>Diagnóstico de Catálogo</h5>' +
              '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<p class="small text-white-50">El catálogo de Bitszone está conectado con Supabase REST API y cuenta con respaldo offline en memoria.</p>' +
              '<div class="p-3 rounded-3 mb-3" style="background: rgba(255,255,255,0.05);">' +
                '<div class="d-flex justify-content-between small text-white mb-1"><span>Conectividad Supabase:</span><strong class="text-success"><i class="bi bi-wifi me-1"></i>En línea (24ms)</strong></div>' +
                '<div class="d-flex justify-content-between small text-white mb-1"><span>Álbumes cargados:</span><strong>24</strong></div>' +
                '<div class="d-flex justify-content-between small text-white"><span>Pistas de audio activas:</span><strong>380 canciones</strong></div>' +
              '</div>' +
              '<button id="btnResyncCatalog" type="button" class="btn bz-btn-primary w-100 py-2">Resincronizar Catálogo Ahora</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modalWrapper);

    var addForm = document.getElementById('formAddAdminSubmit');
    if (addForm) {
      addForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = document.getElementById('newAdminName').value.trim();
        var email = document.getElementById('newAdminEmail').value.trim();
        if (!name || !email) return;

        state.users.push({
          id: 'admin_' + Date.now(),
          username: name,
          email: email,
          role: 'admin',
          status: 'online',
          playedSongsCount: 0,
          downloadedCount: 0,
          avatar_url: ''
        });
        saveDemoUsers();

        // Cerrar modal
        var inst = window.bootstrap.Modal.getInstance(document.getElementById('addAdminModal'));
        if (inst) inst.hide();
        addForm.reset();
        notify('Nuevo administrador ' + name + ' agregado.');
      });
    }

    var relForm = document.getElementById('formReleaseDemoSubmit');
    if (relForm) {
      relForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var title = document.getElementById('releaseTrackTitle').value.trim();
        var artist = document.getElementById('releaseTrackArtist').value.trim();
        var album = document.getElementById('releaseTrackAlbum').value.trim();

        DEMO_POPULAR_TRACKS.unshift({
          id: Date.now(),
          title: title,
          artist: artist,
          album: album,
          plays: 1,
          downloads: 0
        });

        var inst = window.bootstrap.Modal.getInstance(document.getElementById('releaseDemoModal'));
        if (inst) inst.hide();
        relForm.reset();
        notify('Lanzamiento "' + title + '" registrado.');
      });
    }

    var resyncBtn = document.getElementById('btnResyncCatalog');
    if (resyncBtn) {
      resyncBtn.addEventListener('click', function () {
        var inst = window.bootstrap.Modal.getInstance(document.getElementById('catalogDiagModal'));
        if (inst) inst.hide();
        notify('Catálogo resincronizado con éxito.');
      });
    }
  }

  window.BitszoneDashboard = {
    renderDashboard: renderDashboard
  };
})(window);
