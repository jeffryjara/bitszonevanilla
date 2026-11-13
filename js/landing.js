/* ==========================================================================
   BITSZONE — Interactividad de Landing Page (JavaScript Vanilla)
   ========================================================================== */
(function () {
  'use strict';

  var SHOWCASE_ALBUMS = [
    { title: 'Thriller', artist: 'Michael Jackson', song: "Wanna Be Startin' Somethin'", cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/32/4f/fd/324ffda2-9e51-8f6a-0c2d-c6fd2b41ac55/074643811224.jpg/500x500bb.jpg' },
    { title: 'Ahora Más Que Nunca', artist: "Adolescent's Orquesta", song: 'Persona Ideal', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/ac/f9/f2/acf9f236-eae7-023a-120d-6c071797512d/cover.jpg/500x500bb.jpg' },
    { title: 'Esto Fue Lo Que Trajo El Barco', artist: 'Ismael Rivera', song: 'El Nazareno', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/1f/14/af/1f14af69-7164-3ea6-65dc-ccd79ee5c340/18CRGIM08038.rgb.jpg/500x500bb.jpg' },
    { title: 'Coverizando', artist: 'Zaperoko', song: 'Mi Gente', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/a4/61/13/a461132e-73b6-10f9-5267-a64e53a01004/195079913662.jpg/500x500bb.jpg' },
    { title: 'Meteoro', artist: 'LINKIN PARK', song: 'Foreword', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/dd/7d/72/dd7d7259-d27f-5b3e-ce64-9e304d2cb40f/dj.rxzrauer.jpg/500x500bb.jpg' },
    { title: "Hollywood's Bleeding", artist: 'Post Malone', song: "Hollywood's Bleeding", cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/6c/13/27/6c13279a-399b-2631-3cb2-6233a91d7a53/19UMGIM78325.rgb.jpg/500x500bb.jpg' },
    { title: 'CALM', artist: '5 Seconds of Summer', song: 'Best Years', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/04/31/61/0431617b-8479-58fe-3cc3-9fbfef175a71/20UMGIM06593.rgb.jpg/500x500bb.jpg' },
    { title: '25th Anniversary', artist: 'El Gran Combo', song: 'Brujería', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Features/ab/71/ff/dj.klgvouou.jpg/500x500bb.jpg' },
    { title: 'Whitesnake', artist: 'Whitesnake', song: 'Here I Go Again', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/29/df/5c/29df5c2d-3dee-1e74-9a38-0740459035f6/25CRGIM48251.rgb.jpg/500x500bb.jpg' },
    { title: 'Rust In Peace', artist: 'Megadeth', song: 'Holy Wars', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/df/fe/a7/dffea722-e8d7-b2ac-2b31-e207fb738b8e/13UABIM36806.rgb.jpg/500x500bb.jpg' },
    { title: 'Face Value', artist: 'Phil Collins', song: 'In the Air Tonight', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/d2/d8/d6/d2d8d6ad-85d4-7024-9726-e1f312beb522/603497889754.jpg/500x500bb.jpg' }
  ];

  var FAQS = [
    {
      question: '¿Qué es Bitszone y en qué se diferencia?',
      answer: 'Bitszone es un reproductor web pensado para escuchar sin conexión. Descargas canciones o álbumes completos a tu equipo y los reproduces aunque no tengas internet, sin depender de la caché del navegador.',
      color: '#5227FF'
    },
    {
      question: '¿Cómo funcionan las descargas?',
      answer: 'Eliges una canción o un álbum y entra en la cola de descargas, que trabaja en segundo plano mientras sigues escuchando. Cuando termina, la pista queda marcada como disponible offline.',
      color: '#6D3BFF'
    },
    {
      question: '¿Mis descargas caducan?',
      answer: 'Cada descarga tiene una licencia de 30 días. Unos días antes de que expire te avisamos con una notificación, y si escuchas una canción cinco veces seguidas se guarda sola en tus licencias.',
      color: '#8B5CF6'
    },
    {
      question: '¿Cuánto espacio puedo usar?',
      answer: 'Tienes hasta 5 GB para tu biblioteca offline. El panel de almacenamiento te muestra cuánto ocupa cada álbum y puedes liberar espacio cuando quieras, sin que la app borre nada por su cuenta.',
      color: '#A855F7'
    },
    {
      question: '¿Qué pasa si pierdo la conexión mientras escucho?',
      answer: 'Nada. Bitszone detecta que te quedaste sin señal y cambia a tu biblioteca offline sin detener la canción ni provocar saltos de audio.',
      color: '#C084FC'
    },
    {
      question: '¿Cómo sé qué canciones tengo descargadas?',
      answer: 'La interfaz marca al instante qué pistas están listas para escucharse offline y cuáles siguen en la nube, así no te llevas sorpresas cuando no tienes internet.',
      color: '#E28FF8'
    },
    {
      question: '¿Puedo controlar el reproductor con el teclado?',
      answer: 'Sí. Espacio reproduce o pausa, las flechas cambian de canción y ajustan el volumen, L abre las letras, F activa el modo inmersivo y S guarda en favoritos. Todos están en el menú Atajos.',
      color: '#FF9FFC'
    }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    // 0. Scroll suave con inercia (rueda del ratón + anclas). Solo en escritorio y sin "reducir movimiento".
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(pointer: fine)').matches;
    var smooth = { enabled: !reduceMotion && finePointer, target: 0, current: 0, running: false };

    var maxScroll = function () { return document.documentElement.scrollHeight - window.innerHeight; };
    var smoothStep = function () {
      smooth.current += (smooth.target - smooth.current) * 0.09;
      if (Math.abs(smooth.target - smooth.current) < 0.5) smooth.current = smooth.target;
      window.scrollTo(0, smooth.current);
      if (smooth.current !== smooth.target) requestAnimationFrame(smoothStep);
      else smooth.running = false;
    };
    var smoothTo = function (y) {
      if (!smooth.enabled) { window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
      if (!smooth.running) smooth.current = window.scrollY;
      smooth.target = Math.max(0, Math.min(maxScroll(), y));
      if (!smooth.running) { smooth.running = true; requestAnimationFrame(smoothStep); }
    };

    if (smooth.enabled) {
      // el CSS "scroll-behavior: smooth" pelearía con el scrollTo de cada frame
      document.documentElement.style.scrollBehavior = 'auto';
      window.addEventListener('wheel', function (e) {
        if (e.ctrlKey || document.body.classList.contains('modal-open')) return; // zoom o modal abierto
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // carriles horizontales
        e.preventDefault();
        var delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
        smoothTo((smooth.running ? smooth.target : window.scrollY) + delta);
      }, { passive: false });
      // teclado, barra de scroll o arrastre: no mover nada, solo sincronizar
      window.addEventListener('scroll', function () {
        if (!smooth.running) smooth.current = smooth.target = window.scrollY;
      }, { passive: true });
    }

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link || link.getAttribute('href').length < 2) return;
      var dest = document.querySelector(link.getAttribute('href'));
      if (!dest) return;
      e.preventDefault();
      smoothTo(dest.getBoundingClientRect().top + window.scrollY);
    });

    // 1. Botón "volver arriba", fade del hero con scroll y cielo de estrellas
    var backTopBtn = document.getElementById('btnBackToTop');
    var heroContent = document.getElementById('heroContent');
    var ticking = false;

    function handleScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (backTopBtn) backTopBtn.classList.toggle('is-visible', y > 450);
      if (heroContent) {
        var p = Math.min(1, y / (window.innerHeight * 0.8));
        heroContent.style.opacity = String(1 - p);
        heroContent.style.transform = 'translateY(' + (p * 120) + 'px) scale(' + (1 + p * 0.08) + ')';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(handleScroll); }
    }, { passive: true });
    handleScroll();

    if (backTopBtn) {
      backTopBtn.addEventListener('click', function () {
        smoothTo(0);
      });
    }

    var scrollCue = document.getElementById('scrollCue');
    if (scrollCue) {
      scrollCue.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        smoothTo(window.innerHeight);
      });
    }

    var starfield = document.getElementById('bzStarfield');
    if (starfield) {
      var starsHtml = '';
      for (var s = 0; s < 90; s++) {
        starsHtml += '<span class="bz-star" style="left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) +
          '%;animation-delay:' + (Math.random() * 4) + 's;opacity:' + (0.2 + Math.random() * 0.6) + '"></span>';
      }
      for (var f = 0; f < 6; f++) {
        starsHtml += '<span class="bz-shooting-star" style="left:' + (Math.random() * 90) + '%;top:' + (Math.random() * 70) +
          '%;animation-delay:' + (f * 1.3 + Math.random()) + 's"></span>';
      }
      starfield.innerHTML = starsHtml;
    }

    // 2. Secuencia fija "El que busca": anillo 3D de portadas + navegador, controlada por scroll
    var seek = document.getElementById('features');
    var seekTitle = document.getElementById('seekTitle');
    var seekRingWrap = document.getElementById('seekRingWrap');
    var seekRing = document.getElementById('seekRing');
    var seekGlow = document.getElementById('seekGlow');
    var seekBrowser = document.getElementById('seekBrowser');

    if (seek && seekTitle && seekRing && seekBrowser) {
      var mockCard = function (img, title, sub) {
        return '<div class="bz-mock-song"><img class="img-fluid" src="' + img + '" alt="' + title + '" loading="lazy" />' +
          '<b>' + title + '</b><small>' + sub + '</small></div>';
      };
      document.getElementById('seekSongs').innerHTML = SHOWCASE_ALBUMS.slice(0, 8).map(function (a) {
        return mockCard(a.cover, a.song, a.artist);
      }).join('');
      document.getElementById('seekAlbums').innerHTML = SHOWCASE_ALBUMS.slice(4).concat(SHOWCASE_ALBUMS[0]).map(function (a) {
        return mockCard(a.cover, a.title, a.artist);
      }).join('');
      var WIKI = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/';
      var ARTISTS = [
        ['Travis Scott', '1/14/Travis_Scott_-_Openair_Frauenfeld_2019_08.jpg/500px-Travis_Scott_-_Openair_Frauenfeld_2019_08.jpg'],
        ['Incubus', '7/7e/Incubus.jpg/500px-Incubus.jpg'],
        ['LINKIN PARK', 'd/d8/Linkin_Park_-_From_Zero_Lead_Press_Photo_-_James_Minchin_III.jpg/500px-Linkin_Park_-_From_Zero_Lead_Press_Photo_-_James_Minchin_III.jpg'],
        ['Radiohead', 'a/a1/RadioheadO2211125_composite.jpg/500px-RadioheadO2211125_composite.jpg'],
        ['Michael Jackson', 'b/b9/Michael_Jackson_1983_%283x4_cropped%29_%28contrast%29.jpg/500px-Michael_Jackson_1983_%283x4_cropped%29_%28contrast%29.jpg'],
        ['Post Malone', 'a/a9/Post_Malone_July_2021_%28cropped%29.jpg/500px-Post_Malone_July_2021_%28cropped%29.jpg'],
        ['Bruno Mars', 'b/b0/BrunoMars24KMagicWorldTourLive_%28cropped%29.jpg/500px-BrunoMars24KMagicWorldTourLive_%28cropped%29.jpg'],
        ['5 Seconds of Summer', 'd/de/5sos-NZ4A4323.jpg/500px-5sos-NZ4A4323.jpg'],
        ['Whitesnake', 'e/ec/Whitesnake_1984_Promo_2.jpg/500px-Whitesnake_1984_Promo_2.jpg']
      ];
      document.getElementById('seekArtists').innerHTML = ARTISTS.map(function (a) {
        return '<div class="bz-mock-artist"><img class="img-fluid" src="' + WIKI + a[1] + '" alt="' + a[0] + '" loading="lazy" /><b>' + a[0] + '</b><small>Artista</small></div>';
      }).join('');

      // 30 portadas sobre un arco de radio 890px (curvado hacia el espectador)
      var RING_R = 890;
      var RING_STEP = 10.8;
      var ringCards = [];
      var ringHtml = '';
      for (var rc = 0; rc < 30; rc++) {
        var alb = SHOWCASE_ALBUMS[rc % SHOWCASE_ALBUMS.length];
        ringHtml += '<div class="bz-ring-card"><img src="' + alb.cover + '" alt="" loading="lazy" /></div>';
      }
      seekRing.innerHTML = ringHtml;
      ringCards = [].slice.call(seekRing.children);

      var clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
      var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
      // interpola una tabla [[p, valor], ...] tomada de la referencia
      var track = function (pts, p) {
        if (p <= pts[0][0]) return pts[0][1];
        for (var k = 1; k < pts.length; k++) {
          if (p <= pts[k][0]) {
            var t = ease((p - pts[k - 1][0]) / (pts[k][0] - pts[k - 1][0]));
            return pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t;
          }
        }
        return pts[pts.length - 1][1];
      };
      var seekTicking = false;

      var updateSeek = function () {
        seekTicking = false;
        var vh = window.innerHeight;
        var vw = window.innerWidth;
        var rect = seek.getBoundingClientRect();
        var p = clamp01(-rect.top / (rect.height - vh));
        var mobile = vw < 768;

        // Título: se encoge (1.5 → 0.8), sube y se apaga
        var t = clamp01(p / 0.18);
        var s0 = mobile ? 1.1 : 1.5;
        seekTitle.style.transform = 'translateY(' + (-0.58 * vh * ease(t)) + 'px) scale(' + (s0 + (0.8 - s0) * ease(t)) + ')';
        seekTitle.style.opacity = String(1 - 0.75 * t);

        // Anillo: entra desde abajo, gira y luego sube y se apaga detrás del navegador
        var ringScale = mobile ? 0.7 : Math.min(1.35, vw / 1415);
        seekRing.style.transform = 'scale(' + ringScale + ')';
        var wrapY = track([[0.1, 160], [0.3, 0], [0.45, 0], [0.76, -287], [1, -330]], p);
        var wrapS = track([[0.1, 0.86], [0.3, 1], [0.45, 1], [0.76, 0.92]], p);
        var wrapO = track([[0.08, 0], [0.26, 1], [0.61, 1], [0.85, 0]], p);
        var wrapBlur = track([[0.8, 0], [1, 6]], p);
        seekRingWrap.style.transform = 'translateY(' + wrapY + 'px) scale(' + wrapS + ')';
        seekRingWrap.style.opacity = String(wrapO);
        seekRingWrap.style.filter = wrapBlur > 0.1 ? 'blur(' + wrapBlur + 'px) brightness(' + (1 - wrapBlur / 12) + ')' : '';

        var rot = 82 * p + 3;
        ringCards.forEach(function (card, i) {
          var th = rot - i * RING_STEP + 40;
          if (Math.abs(th) > 44) { card.style.visibility = 'hidden'; return; }
          var rad = th * Math.PI / 180;
          card.style.visibility = 'visible';
          card.style.transform = 'translate3d(' + (-RING_R * Math.sin(rad)).toFixed(1) + 'px, 0, ' +
            (RING_R * (1 - Math.cos(rad))).toFixed(1) + 'px) rotateY(' + th.toFixed(2) + 'deg)';
          card.style.filter = 'brightness(' + (0.8 + 0.15 * Math.pow(Math.abs(th) / 40, 2)).toFixed(3) + ')';
        });

        // Navegador: sube inclinado, se acerca y queda casi recto
        var q = clamp01((p - 0.61) / 0.39); // salida lineal: la preview se va al ritmo del scroll, justo encima del título de funciones
        var by = track([[0, 1.04], [0.18, 0.98], [0.3, 0.63], [0.41, 0.49], [0.53, 0.355], [0.64, 0.205], [0.76, 0.183], [0.78, 0.18]], p) * vh -
          q * 0.97 * vh; // al final sube y sale por arriba
        var brx = track([[0, 18], [0.18, 16.7], [0.3, 9], [0.41, 6], [0.53, 7.3], [0.64, 8.8], [0.76, 9]], p);
        var bs = track([[0.3, 0.94], [0.41, 0.953], [0.53, 0.975], [0.64, 1]], p) - 0.2 * q; // y se encoge
        seekBrowser.style.transform = 'perspective(1400px) translateY(' + by + 'px) scale(' + bs + ') rotateX(' + (mobile ? brx * 0.6 : brx) + 'deg)';
        seekBrowser.style.opacity = String(track([[0.12, 0], [0.24, 1], [0.61, 1], [1, 0.6]], p));
        if (seekGlow) seekGlow.style.opacity = String(track([[0.3, 0], [0.61, 0.9], [0.95, 0]], p));
      };

      var onSeekScroll = function () {
        if (!seekTicking) { seekTicking = true; requestAnimationFrame(updateSeek); }
      };
      window.addEventListener('scroll', onSeekScroll, { passive: true });
      window.addEventListener('resize', onSeekScroll);
      updateSeek();
    }

    // 3. Micro-animación de estado de red en tarjeta "Cero cortes"
    var netBadge = document.getElementById('demoNetStatusBadge');
    if (netBadge) {
      var states = [
        { icon: 'bi-wifi', text: 'Conectado por WiFi', bg: 'rgba(255,255,255,0.08)', color: '#e4e1e8' },
        { icon: 'bi-wifi-off', text: 'Sin señal', bg: 'rgba(244,63,94,0.16)', color: '#fda4af' },
        { icon: 'bi-check-circle-fill', text: 'Modo offline activo', bg: 'rgba(217,70,239,0.2)', color: '#f0abfc' }
      ];
      var netIdx = 0;
      setInterval(function () {
        netIdx = (netIdx + 1) % states.length;
        var st = states[netIdx];
        netBadge.style.background = st.bg;
        netBadge.style.color = st.color;
        netBadge.innerHTML = '<i class="bi ' + st.icon + ' me-1"></i>' + st.text;
      }, 2400);
    }

    // 3b. Palabra rotatoria: la actual sube y sale, la siguiente entra desde abajo (siempre hacia arriba)
    var rotator = document.getElementById('rotatingWord');
    if (rotator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var rotWords = rotator.querySelectorAll('.bz-rotator-word');
      var rotIdx = 0;
      setInterval(function () {
        var prev = rotWords[rotIdx];
        rotIdx = (rotIdx + 1) % rotWords.length;
        var next = rotWords[rotIdx];
        // colocar la siguiente abajo sin animación antes de subirla
        next.style.transition = 'none';
        next.classList.remove('is-leaving');
        void next.offsetWidth;
        next.style.transition = '';
        prev.classList.remove('is-active');
        prev.classList.add('is-leaving');
        prev.setAttribute('aria-hidden', 'true');
        next.classList.add('is-active');
        next.removeAttribute('aria-hidden');
      }, 2800);
    }

    // 3c. Cola de descargas que avanza sola
    var queueEl = document.getElementById('demoQueue');
    if (queueEl) {
      var rows = [].slice.call(queueEl.querySelectorAll('.bz-queue-row')).map(function (row) {
        var pctEl = row.querySelector('.bz-queue-pct');
        return { pct: pctEl, bar: row.querySelector('.bz-queue-bar i'), val: Number(pctEl.getAttribute('data-start')) };
      });
      setInterval(function () {
        rows.forEach(function (r, i) {
          r.val = r.val >= 100 ? 0 : Math.min(100, r.val + (3 - i) * 1.5);
          r.bar.style.width = r.val + '%';
          r.pct.textContent = r.val >= 100 ? '✓' : Math.round(r.val) + '%';
        });
      }, 300);
    }

    // 3d. Inclinación 3D suave de las tarjetas al mover el ratón
    if (window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('#benefits .fx-card').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
          if (window.innerWidth < 992) return; // en móvil/tablet no hay hover
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = 'perspective(900px) rotateY(' + (x * 6) + 'deg) rotateX(' + (-y * 6) + 'deg) translateY(-4px)';
        });
        card.addEventListener('mouseleave', function () { card.style.transform = ''; });
      });
    }

    // 3e. Carriles de tarjetas (móvil/tablet): puntos de paginación y arrastre con ratón
    document.querySelectorAll('.bz-card-rail').forEach(function (rail) {
      var cards = [].slice.call(rail.children);
      var dots = document.createElement('div');
      dots.className = 'bz-rail-dots d-lg-none';
      dots.innerHTML = cards.map(function (_, i) {
        return '<button type="button" aria-label="Ir a la tarjeta ' + (i + 1) + '"></button>';
      }).join('');
      rail.parentNode.insertBefore(dots, rail.nextSibling);
      var btns = [].slice.call(dots.children);
      var stepOf = function () { return cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left; };
      var syncDots = function () {
        var step = stepOf();
        if (!step) return; // pestaña oculta
        var atEnd = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 4;
        var idx = atEnd ? cards.length - 1 : Math.round(rail.scrollLeft / step);
        btns.forEach(function (b, i) { b.classList.toggle('is-active', i === idx); });
      };
      rail.addEventListener('scroll', syncDots, { passive: true });
      window.addEventListener('resize', syncDots);
      btns.forEach(function (b, i) {
        b.addEventListener('click', function () { rail.scrollTo({ left: i * stepOf(), behavior: 'smooth' }); });
      });
      syncDots();

      var drag = null;
      rail.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || window.innerWidth >= 992) return;
        drag = { x: e.clientX, left: rail.scrollLeft };
        rail.classList.add('is-dragging');
      });
      window.addEventListener('pointermove', function (e) {
        if (drag) rail.scrollLeft = drag.left - (e.clientX - drag.x);
      });
      window.addEventListener('pointerup', function () {
        if (!drag) return;
        drag = null;
        rail.classList.remove('is-dragging');
      });
    });

    // 4. Sección FAQ Interactivo (7 orbes + barra segmentada + auto-avance)
    var faqOrbsEl = document.getElementById('faqOrbCluster');
    var faqSegsEl = document.getElementById('faqSegments');
    var faqBadgeEl = document.getElementById('faqActiveBadge');
    var faqCounterEl = document.getElementById('faqCounter');
    var faqQuestionEl = document.getElementById('faqQuestion');
    var faqAnswerEl = document.getElementById('faqAnswer');
    var faqHaloEl = document.getElementById('faqClusterHalo');
    var faqViewerGlowEl = document.getElementById('faqViewerGlow');
    var faqViewerCard = document.getElementById('faqViewerCard');
    var faqPrevBtn = document.getElementById('faqPrevBtn');
    var faqNextBtn = document.getElementById('faqNextBtn');

    if (faqOrbsEl && faqSegsEl) {
      var currentFaq = 0;
      var autoPlay = true;
      var paused = false;
      var AUTO_MS = 8000;
      var startTime = Date.now();

      function renderFaqStatic() {
        faqOrbsEl.innerHTML = FAQS.map(function (f, i) {
          return (
            '<button type="button" class="bz-faq-orb" data-faq-idx="' + i + '" ' +
              'aria-label="Pregunta ' + (i + 1) + '">' + (i + 1) + '</button>'
          );
        }).join('');

        faqSegsEl.innerHTML = FAQS.map(function (_, i) {
          return (
            '<button type="button" class="bz-faq-seg-btn" data-faq-seg="' + i + '" aria-label="Ir a pregunta ' + (i + 1) + '">' +
              '<span class="bz-faq-seg-track"><span class="bz-faq-seg-fill" id="faqSegFill_' + i + '"></span></span>' +
            '</button>'
          );
        }).join('');

        faqOrbsEl.querySelectorAll('[data-faq-idx]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            setFaq(Number(btn.getAttribute('data-faq-idx')));
          });
        });

        faqSegsEl.querySelectorAll('[data-faq-seg]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            setFaq(Number(btn.getAttribute('data-faq-seg')));
          });
        });
      }

      function setFaq(idx) {
        currentFaq = (idx + FAQS.length) % FAQS.length;
        startTime = Date.now();
        var f = FAQS[currentFaq];

        faqQuestionEl.textContent = f.question;
        faqAnswerEl.textContent = f.answer;
        faqBadgeEl.textContent = String(currentFaq + 1);
        faqBadgeEl.style.background = 'linear-gradient(135deg, ' + f.color + ', #FF9FFC)';
        faqBadgeEl.style.boxShadow = '0 10px 25px ' + f.color + '88';
        faqCounterEl.innerHTML =
          String(currentFaq + 1).padStart(2, '0') +
          ' <span class="text-white-50">/ ' + String(FAQS.length).padStart(2, '0') + '</span>';

        if (faqHaloEl) {
          faqHaloEl.style.background = 'radial-gradient(circle, ' + f.color + '44 0%, transparent 65%)';
        }
        if (faqViewerGlowEl) {
          faqViewerGlowEl.style.background = 'radial-gradient(circle, ' + f.color + ' 0%, transparent 70%)';
        }

        // Posiciones fijas: la 1 al centro y 2–7 en anillo; solo cambia cuál está activa
        var R = 122;
        var ringAngles = [0, -60, -120, 180, 120, 60];
        faqOrbsEl.querySelectorAll('.bz-faq-orb').forEach(function (el, i) {
          var active = i === currentFaq;
          el.classList.toggle('is-active', active);
          el.setAttribute('aria-pressed', active ? 'true' : 'false');
          var pos = 'translate(0, 0)';
          if (i > 0) {
            var ang = ringAngles[i - 1] * Math.PI / 180;
            pos = 'translate(' + (Math.cos(ang) * R) + 'px, ' + (Math.sin(ang) * R) + 'px)';
          }
          var scale = active ? (i === 0 ? 1.42 : 1.18) : 1;
          el.style.transform = pos + ' scale(' + scale + ')';
        });

        for (var i = 0; i < FAQS.length; i++) {
          var fill = document.getElementById('faqSegFill_' + i);
          if (!fill) continue;
          fill.style.background = 'linear-gradient(90deg, ' + FAQS[i].color + ', #FF9FFC)';
          if (i < currentFaq) fill.style.width = '100%';
          else fill.style.width = '0%';
        }
      }

      renderFaqStatic();
      setFaq(0);

      if (faqViewerCard) {
        faqViewerCard.addEventListener('mouseenter', function () { paused = true; });
        faqViewerCard.addEventListener('mouseleave', function () { paused = false; startTime = Date.now(); });
      }
      if (faqPrevBtn) {
        faqPrevBtn.addEventListener('click', function () {
          setFaq(currentFaq - 1);
        });
      }
      if (faqNextBtn) {
        faqNextBtn.addEventListener('click', function () {
          setFaq(currentFaq + 1);
        });
      }

      setInterval(function () {
        if (!autoPlay || paused) return;
        var elapsed = Date.now() - startTime;
        var pct = Math.min(100, (elapsed / AUTO_MS) * 100);
        var activeFill = document.getElementById('faqSegFill_' + currentFaq);
        if (activeFill) activeFill.style.width = pct + '%';
        if (elapsed >= AUTO_MS) {
          setFaq(currentFaq + 1);
        }
      }, 60);
    }

    // 5. Año dinámico en Footer
    var yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  });
})();
