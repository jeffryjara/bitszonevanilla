/* ==========================================================================
   BITSZONE — Dashboard de Administración (Solo Modo Demo)
   Protegido por rol 'admin' / 'superadmin', maquetado con Bootstrap 5 + JS puro
   ========================================================================== */
(function (window) {
  'use strict';

  var STORAGE_DEMO_USERS = 'bz_vanilla_demo_admins_v1';

  var INITIAL_DEMO_USERS = [
    {
      id: 'demo-1',
      username: 'SUPERADMIN',
      email: 'bitszone.app@gmail.com',
      role: 'superadmin',
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
        if (Array.isArray(parsed) && parsed.length) return parsed;
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
    var catalogStats = ctx.catalogStats || { albumsCount: 0, tracksCount: 0, source: 'supabase', latencyMs: 0 };

    var adminCount = state.users.filter(function (u) {
      return u.role === 'admin' || u.role === 'superadmin';
    }).length;

    var chartItems = DEMO_CHARTS[state.timeRange] || DEMO_CHARTS['7d'];
    var maxPlays = Math.max.apply(null, chartItems.map(function (c) { return c.plays; }).concat([10]));

    var filteredUsers = state.users.filter(function (u) {
      var q = state.searchQuery.toLowerCase().trim();
      var matchesQ = !q || u.username.toLowerCase().indexOf(q) !== -1 || (u.email && u.email.toLowerCase().indexOf(q) !== -1);
      var matchesR = state.userFilter === 'all' || u.role === state.userFilter;
      return matchesQ && matchesR;
    });

    var headerHtml =
      '<div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">' +
        '<div>' +
          '<div class="d-flex align-items-center gap-2 mb-1">' +
            '<span class="badge rounded-pill" style="background: rgba(168,85,247,0.22); color: #e9d5ff; border: 1px solid rgba(192,132,252,0.4);">' +
              '<i class="bi bi-bar-chart-line me-1"></i> Modo Demo Académico' +
            '</span>' +
            '<span class="small text-white-50 font-mono-bz">' + adminCount + ' admins · 380 pistas demo</span>' +
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
        '<div class="row g-3 mb-4">' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="small text-uppercase text-white-50 fw-semibold">Administradores</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-shield-check"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">' + adminCount + '</div>' +
              '<div class="small" style="color:var(--bz-soft);">1 Superadmin · ' + Math.max(0, adminCount - 1) + ' Admins</div>' +
            '</div>' +
          '</div>' +
          '<div class="col-12 col-sm-6 col-xl-3">' +
            '<div class="bz-glass-card p-4 h-100">' +
              '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="small text-uppercase text-white-50 fw-semibold">Reproducciones</span>' +
                '<span class="p-2 rounded-3 bg-white bg-opacity-10" style="color:var(--bz-lavender);"><i class="bi bi-headphones"></i></span>' +
              '</div>' +
              '<div class="display-6 fw-bold text-white mb-1">284,910</div>' +
              '<div class="small" style="color:var(--bz-soft);">+28.4% este mes</div>' +
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
        '<div class="bz-glass-card p-4">' +
          '<div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">' +
            '<div>' +
              '<h4 class="h5 fw-bold text-white mb-1"><i class="bi bi-graph-up-arrow me-2" style="color:var(--bz-lavender);"></i>Tráfico y Reproducciones</h4>' +
              '<p class="small text-white-50 mb-0">Picos de actividad de streaming (datos de demostración)</p>' +
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
              ['all', 'superadmin', 'admin'].map(function (roleKey) {
                var txt = roleKey === 'all' ? 'Todos' : roleKey === 'superadmin' ? 'Superadmin' : 'Admins';
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
                  ? '<tr><td colspan="6" class="text-center py-4 text-white-50">No se encontraron cuentas con ese filtro.</td></tr>'
                  : filteredUsers.map(function (u) {
                      var isSuper = u.role === 'superadmin';
                      var avatarHtml = u.avatar_url
                        ? '<img src="' + escHtml(u.avatar_url) + '" alt="" width="38" height="38" class="rounded-circle object-fit-cover" />'
                        : '<span class="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white" style="width:38px;height:38px;background:rgba(168,85,247,0.3);">' + escHtml(u.username.charAt(0).toUpperCase()) + '</span>';
                      var roleBadge = isSuper
                        ? '<span class="badge rounded-pill" style="background:linear-gradient(90deg,rgba(168,85,247,0.45),rgba(245,158,11,0.35));color:#fef3c7;">Superadmin</span>'
                        : u.role === 'admin'
                          ? '<span class="badge rounded-pill" style="background:rgba(168,85,247,0.28);color:#e9d5ff;">Admin</span>'
                          : '<span class="badge rounded-pill bg-secondary bg-opacity-50">Usuario</span>';
                      var statusHtml = u.status === 'online'
                        ? '<span class="text-success small"><i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i>En línea</span>'
                        : '<span class="text-warning small"><i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i>Inactivo</span>';
                      var actionBtn = isSuper
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
          '<h4 class="h5 fw-bold text-white mb-1"><i class="bi bi-fire me-2" style="color:var(--bz-lavender);"></i>Top Canciones Más Escuchadas (Demo)</h4>' +
          '<p class="small text-white-50 mb-4">Métricas simuladas de reproducción en plataforma</p>' +
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
                '<h4 class="h5 fw-bold text-white mb-2">Nuevo Lanzamiento (Demo)</h4>' +
                '<p class="small text-white-50 mb-4">Simula el registro de una nueva pista o álbum dentro del entorno de demostración académico.</p>' +
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
                '<p class="small text-white-50 mb-4">Origen actual: <strong>' + (catalogStats.source === 'supabase' ? 'Supabase REST (En línea)' : 'Respaldo Local') + '</strong> · ' + catalogStats.albumsCount + ' álbumes / ' + catalogStats.tracksCount + ' pistas cargadas.</p>' +
              '</div>' +
              '<button type="button" class="btn bz-btn-subtle w-100 py-2" data-bs-toggle="modal" data-bs-target="#catalogDiagModal">' +
                '<i class="bi bi-arrow-repeat me-1"></i> Verificar Estado de Catálogo' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    container.innerHTML = '<div class="container-fluid px-0 px-md-2 pb-4">' + headerHtml + tabsHtml + bodyHtml + '</div>';

    // Bind events
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

    var searchEl = document.getElementById('dashUserSearch');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        state.searchQuery = searchEl.value;
        renderDashboard(container, ctx);
        var restored = document.getElementById('dashUserSearch');
        if (restored) {
          restored.focus();
          restored.setSelectionRange(restored.value.length, restored.value.length);
        }
      });
    }

    container.querySelectorAll('[data-toggle-admin-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var uid = btn.getAttribute('data-toggle-admin-id');
        for (var i = 0; i < state.users.length; i++) {
          if (state.users[i].id === uid && state.users[i].role !== 'superadmin') {
            state.users[i].role = state.users[i].role === 'admin' ? 'user' : 'admin';
            saveDemoUsers();
            notify('Rol de ' + state.users[i].username + ' cambiado a ' + state.users[i].role.toUpperCase() + ' (Demo).');
            renderDashboard(container, ctx);
            break;
          }
        }
      });
    });

    // Actualizar estadísticas del modal diagnóstico si existe
    var diagBody = document.getElementById('catalogDiagBody');
    if (diagBody) {
      diagBody.innerHTML =
        '<ul class="list-group list-group-flush bg-transparent">' +
          '<li class="list-group-item bg-transparent text-white border-white border-opacity-10 d-flex justify-content-between"><span>Fuente del catálogo</span><strong class="font-mono-bz">' + (catalogStats.source === 'supabase' ? 'Supabase REST (fetch)' : 'Respaldo Local') + '</strong></li>' +
          '<li class="list-group-item bg-transparent text-white border-white border-opacity-10 d-flex justify-content-between"><span>Latencia de carga</span><strong class="font-mono-bz">' + catalogStats.latencyMs + ' ms</strong></li>' +
          '<li class="list-group-item bg-transparent text-white border-white border-opacity-10 d-flex justify-content-between"><span>Álbumes / Pistas</span><strong class="font-mono-bz">' + catalogStats.albumsCount + ' / ' + catalogStats.tracksCount + '</strong></li>' +
        '</ul>';
    }
  }

  function addDemoAdmin(emailOrName) {
    var clean = String(emailOrName || '').trim();
    if (!clean) return false;
    var isEmail = clean.indexOf('@') !== -1;
    var newObj = {
      id: 'demo-' + Date.now(),
      username: isEmail ? clean.split('@')[0] : clean,
      email: isEmail ? clean.toLowerCase() : clean.toLowerCase() + '@bitszone.net',
      role: 'admin',
      status: 'online',
      playedSongsCount: 15,
      downloadedCount: 4,
      avatar_url: ''
    };
    state.users.unshift(newObj);
    saveDemoUsers();
    return newObj;
  }

  window.BitszoneDashboard = {
    renderDashboard: renderDashboard,
    addDemoAdmin: addDemoAdmin
  };
})(window);
