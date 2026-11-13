/* ==========================================================================
   BITSZONE — Interactividad de Landing Page (JavaScript Vanilla)
   ========================================================================== */
(function () {
  'use strict';

  var SHOWCASE_ALBUMS = [
    {
      title: 'Thriller',
      artist: 'Michael Jackson',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/32/4f/fd/324ffda2-9e51-8f6a-0c2d-c6fd2b41ac55/074643811224.jpg/500x500bb.jpg'
    },
    {
      title: 'Meteora',
      artist: 'LINKIN PARK',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/dd/7d/72/dd7d7259-d27f-5b3e-ce64-9e304d2cb40f/dj.rxzrauer.jpg/500x500bb.jpg'
    },
    {
      title: "Hollywood's Bleeding",
      artist: 'Post Malone',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/6c/13/27/6c13279a-399b-2631-3cb2-6233a91d7a53/19UMGIM78325.rgb.jpg/500x500bb.jpg'
    },
    {
      title: 'Ahora Más Que Nunca',
      artist: "Adolescent's Orquesta",
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/ac/f9/f2/acf9f236-eae7-023a-120d-6c071797512d/cover.jpg/500x500bb.jpg'
    },
    {
      title: 'CALM',
      artist: '5 Seconds of Summer',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/04/31/61/0431617b-8479-58fe-3cc3-9fbfef175a71/20UMGIM06593.rgb.jpg/500x500bb.jpg'
    },
    {
      title: 'Face Value',
      artist: 'Phil Collins',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/d2/d8/d6/d2d8d6ad-85d4-7024-9726-e1f312beb522/603497889754.jpg/500x500bb.jpg'
    },
    {
      title: 'Rust In Peace',
      artist: 'Megadeth',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f5/63/03/f56303f8-65cc-cd3c-07e1-8869c9b136ec/077779326159.jpg/500x500bb.jpg'
    },
    {
      title: 'Whitesnake',
      artist: 'Whitesnake',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/29/df/5c/29df5c2d-3dee-1e74-9a38-0740459035f6/25CRGIM48251.rgb.jpg/500x500bb.jpg'
    },
    {
      title: '25th Anniversary',
      artist: 'El Gran Combo de Puerto Rico',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Features/ab/71/ff/dj.klgvouou.jpg/500x500bb.jpg'
    },
    {
      title: 'Unorthodox Jukebox',
      artist: 'Bruno Mars',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7b/d4/7d/7bd47d86-2c44-4d6f-5c9b-a5c7e7c4410d/075679955753.jpg/500x500bb.jpg'
    }
  ];

  var FAQS = [
    {
      question: '¿Qué es Bitszone y en qué se diferencia?',
      answer: 'Bitszone es un reproductor web pensado para escuchar sin conexión. Descargas canciones o álbumes completos a tu equipo y los reproduces aunque no tengas internet, sin depender de la caché del navegador.',
      color: '#5227FF'
    },
    {
      question: '¿Cómo funcionan las descargas?',
      answer: 'Eliges una canción o un álbum y lo descargas directamente mientras sigues escuchando. La pista queda registrada en tu biblioteca personal y lista para escucharse.',
      color: '#6D3BFF'
    },
    {
      question: '¿Cuánto espacio puedo usar?',
      answer: 'Tienes hasta 5 GB para tu biblioteca offline. El panel de almacenamiento te muestra cuánto ocupa cada pista descargada y puedes liberar espacio cuando quieras.',
      color: '#8B5CF6'
    },
    {
      question: '¿Qué pasa si pierdo la conexión mientras escucho?',
      answer: 'Si fallara la red de nube, Bitszone cuenta con respaldo local inmediato para que la música y tu biblioteca sigan operativas sin interrupciones.',
      color: '#A855F7'
    },
    {
      question: '¿Cómo sé qué canciones tengo descargadas?',
      answer: 'La interfaz marca al instante con un distintivo visual qué pistas están descargadas en tu biblioteca y cuáles siguen disponibles en streaming.',
      color: '#C084FC'
    },
    {
      question: '¿Puedo crear mis propias listas de reproducción?',
      answer: 'Sí. En la sección Biblioteca puedes crear playlists personalizadas, asignarles nombre y agregar tus canciones favoritas de distintos álbumes en un clic.',
      color: '#E28FF8'
    },
    {
      question: '¿Puedo controlar el reproductor con el teclado?',
      answer: 'Sí. Espacio reproduce o pausa, las flechas izquierda/derecha cambian de canción, arriba/abajo ajustan el volumen, F abre el reproductor expandido, M silencia y S marca favoritos.',
      color: '#FF9FFC'
    }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    // 1. Header y botón flotante "Volver arriba" al hacer scroll
    var header = document.getElementById('landingHeader');
    var backTopBtn = document.getElementById('btnBackToTop');

    function handleScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (header) header.classList.toggle('is-scrolled', y > 40);
      if (backTopBtn) backTopBtn.classList.toggle('is-visible', y > 450);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    if (backTopBtn) {
      backTopBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // 2. Renderizar Marquee de portadas en Sección Showcase
    var showcaseTrack = document.getElementById('showcaseMarqueeTrack');
    if (showcaseTrack) {
      var doubled = SHOWCASE_ALBUMS.concat(SHOWCASE_ALBUMS);
      var html = doubled.map(function (a) {
        return (
          '<a href="./player.html" class="bz-showcase-cover text-decoration-none d-block" title="' + a.title + ' - ' + a.artist + '">' +
            '<img src="' + a.cover + '" alt="' + a.title + '" loading="lazy" />' +
          '</a>'
        );
      }).join('');
      showcaseTrack.innerHTML = html;
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
              'style="background: linear-gradient(135deg, ' + f.color + ', #ff9ffc); box-shadow: 0 10px 25px ' + f.color + '66;" ' +
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
            autoPlay = false;
            setFaq(Number(btn.getAttribute('data-faq-idx')));
          });
        });

        faqSegsEl.querySelectorAll('[data-faq-seg]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            autoPlay = false;
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

        faqOrbsEl.querySelectorAll('.bz-faq-orb').forEach(function (el, i) {
          el.classList.toggle('is-active', i === currentFaq);
        });

        for (var i = 0; i < FAQS.length; i++) {
          var fill = document.getElementById('faqSegFill_' + i);
          if (!fill) continue;
          fill.style.background = 'linear-gradient(90deg, ' + FAQS[i].color + ', #FF9FFC)';
          if (i < currentFaq) fill.style.width = '100%';
          else if (i === currentFaq && !autoPlay) fill.style.width = '100%';
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
          autoPlay = false;
          setFaq(currentFaq - 1);
        });
      }
      if (faqNextBtn) {
        faqNextBtn.addEventListener('click', function () {
          autoPlay = false;
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
