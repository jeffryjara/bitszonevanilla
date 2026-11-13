# Bitszone (Versión Académica: HTML5 + CSS3 + JavaScript + Bootstrap 5)

Plataforma web de reproducción musical inspirada en diseño **Liquid Glass** con gestión de catálogo, biblioteca personal, playlists, control de descargas y panel administrativo de demostración.

## Tecnologías utilizadas
- **HTML5** semántico multipágina (`index.html`, `login.html`, `player.html`).
- **CSS3** personalizado (`css/styles.css`) con variables CSS, animaciones `@keyframes`, gradientes radiales y efecto *glassmorphism*.
- **JavaScript (Vanilla ES5/ES6 compatible sin bundlers)** en carpeta `js/`.
- **Bootstrap 5.3.8 + Bootstrap Icons** cargados vía CDN oficial (`cdn.jsdelivr.net`).

## Estructura del proyecto
```text
bitszone/
├── index.html          # Landing page (Hero, Showcase, Funciones, FAQ interactivo, Footer)
├── login.html          # Acceso con roles (Oyente / Administrador)
├── player.html         # Reproductor SPA sin recarga + Biblioteca + Descargas + Dashboard Demo
├── css/
│   └── styles.css      # Paleta visual, degradados animados y estilos Liquid Glass
├── js/
│   ├── landing.js      # Interactividad de la landing y FAQ de 7 orbes
│   ├── auth.js         # Sesión y gestión de roles en localStorage
│   ├── catalog.js      # Consumo del catálogo vía fetch() REST a Supabase + respaldo local
│   ├── storage.js      # Favoritos, playlists, descargas, medidor de 5 GB y preferencias
│   ├── dashboard.js    # Dashboard Admin (Modo Demo: KPIs, gráfico, admins, herramientas)
│   └── player.js       # Motor <audio>, cola, onda senoidal SVG, modales y atajos de teclado
└── assets/
    └── img/            # Logotipos, favicons e imágenes estáticas
```

## Credenciales de demostración (`login.html`)
- **Superadmin:** `bitszone.app@gmail.com` / `admin123` *(o botón de acceso directo Superadmin)*
- **Admin Demo:** `admin@bitszone.app` / `admin123`
- **Oyente Demo:** `oyente@bitszone.app` / `bitszone123` *(o crear cuenta nueva)*

## Cómo ejecutar
Puedes abrir directamente `index.html` o usar un servidor HTTP local (como **Live Server** en VS Code o `python3 -m http.server`) para probar la experiencia completa.
