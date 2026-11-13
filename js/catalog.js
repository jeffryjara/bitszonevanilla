/* ==========================================================================
   BITSZONE — Catálogo Musical via fetch() nativo a Supabase REST API
   Incluye aplicación de artist_override/album_override y respaldo offline.
   ========================================================================== */
(function (window) {
  'use strict';

  var SUPABASE_URL = 'https://oxloqoggjldbjjratwoh.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bG9xb2dnamxkYmpqcmF0d29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NjAzMzEsImV4cCI6MjEwNTUzNjMzMX0.jgYh-GP25f4krR5CJw8bHzGS9XNnlg9_4TnZQVcj84o';

  var ALBUM_YEARS = {
    'Thriller': '1982',
    'Ahora Mas Que Nunca': '2001',
    'Meteora': '2003',
    "Hollywood's Bleeding": '2019',
    'CALM': '2020',
    'Face Value': '1981',
    'Make Yourself': '1999',
    'Pablo Honey': '1993',
    'UTOPIA': '2023',
    'Whitesnake': '1987',
    'Unorthodox Jukebox': '2012',
    'Purpose': '2015'
  };

  var KNOWN_ARTIST_IMAGES = {
    'Michael Jackson': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Michael_Jackson_1983_%283x4_cropped%29_%28contrast%29.jpg/500px-Michael_Jackson_1983_%283x4_cropped%29_%28contrast%29.jpg',
    'LINKIN PARK': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Linkin_Park_-_From_Zero_Lead_Press_Photo_-_James_Minchin_III.jpg/500px-Linkin_Park_-_From_Zero_Lead_Press_Photo_-_James_Minchin_III.jpg',
    'Post Malone': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Post_Malone_July_2021_%28cropped%29.jpg/500px-Post_Malone_July_2021_%28cropped%29.jpg',
    'Post Malone & Swae Lee': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Post_Malone_July_2021_%28cropped%29.jpg/500px-Post_Malone_July_2021_%28cropped%29.jpg',
    '5 Seconds of Summer': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/5sos-NZ4A4323.jpg/500px-5sos-NZ4A4323.jpg',
    "Adolescent's Orquesta": 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/PORFI_Y_SUS_ADOLECENTES.png/500px-PORFI_Y_SUS_ADOLECENTES.png',
    'Phil Collins': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Phil_Collins%2C_2025_for_%22Eras%22_%28cropped%29.jpg/500px-Phil_Collins%2C_2025_for_%22Eras%22_%28cropped%29.jpg',
    'Incubus': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/Incubus.jpg/500px-Incubus.jpg',
    'Radiohead': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/RadioheadO2211125_composite.jpg/500px-RadioheadO2211125_composite.jpg',
    'Travis Scott': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Travis_Scott_-_Openair_Frauenfeld_2019_08.jpg/500px-Travis_Scott_-_Openair_Frauenfeld_2019_08.jpg',
    'Whitesnake': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Whitesnake_1984_Promo_2.jpg/500px-Whitesnake_1984_Promo_2.jpg',
    'Bruno Mars': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/BrunoMars24KMagicWorldTourLive_%28cropped%29.jpg/500px-BrunoMars24KMagicWorldTourLive_%28cropped%29.jpg',
    'Justin Bieber': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Justin_Bieber_20161111_009-2_%28cropped%29.jpg/500px-Justin_Bieber_20161111_009-2_%28cropped%29.jpg'
  };

  var ARTIST_GENRES = {
    '5 Seconds of Summer': ['Pop', 'Rock'],
    "Adolescent's Orquesta": ['Salsa'],
    'Bruno Mars': ['Pop'],
    'Incubus': ['Rock', 'Alternativo'],
    'Justin Bieber': ['Pop'],
    'LINKIN PARK': ['Rock', 'Metal'],
    'Michael Jackson': ['Pop'],
    'Phil Collins': ['Pop', 'Balada', 'Rock'],
    'Post Malone': ['Rap', 'Pop'],
    'Radiohead': ['Rock', 'Alternativo'],
    'Travis Scott': ['Rap'],
    'Whitesnake': ['Rock', 'Metal']
  };

  var POPULARITY_ORDER = [
    'Michael Jackson',
    'LINKIN PARK',
    'Bruno Mars',
    'Travis Scott',
    'Post Malone',
    'Justin Bieber',
    'Radiohead',
    '5 Seconds of Summer',
    'Phil Collins',
    'Whitesnake',
    'Incubus',
    "Adolescent's Orquesta"
  ];

  // Respaldo por si no hay conexión a internet al abrir el archivo
  var FALLBACK_TRACKS = [
    {
      id: 2,
      title: "Wanna Be Startin' Somethin'",
      artist: 'Michael Jackson',
      album: 'Thriller',
      track_number: 1,
      duration: 363400,
      image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/32/4f/fd/324ffda2-9e51-8f6a-0c2d-c6fd2b41ac55/074643811224.jpg/500x500bb.jpg',
      audio_url: 'https://oxloqoggjldbjjratwoh.supabase.co/storage/v1/object/public/songs/Thriller/Wanna%20Be%20Startin\'%20Somethin\'.mp3'
    },
    {
      id: 49,
      title: "Hollywood's Bleeding",
      artist: 'Post Malone',
      album: "Hollywood's Bleeding",
      track_number: 1,
      duration: 156253,
      image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/6c/13/27/6c13279a-399b-2631-3cb2-6233a91d7a53/19UMGIM78325.rgb.jpg/500x500bb.jpg',
      audio_url: 'https://oxloqoggjldbjjratwoh.supabase.co/storage/v1/object/public/songs/Hollywood\'s%20Bleeding/Hollywood\'s%20Bleeding.mp3'
    },
    {
      id: 131,
      title: 'Foreword',
      artist: 'LINKIN PARK',
      album: 'Meteora',
      track_number: 1,
      duration: 13000,
      image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/dd/7d/72/dd7d7259-d27f-5b3e-ce64-9e304d2cb40f/dj.rxzrauer.jpg/500x500bb.jpg',
      audio_url: 'https://oxloqoggjldbjjratwoh.supabase.co/storage/v1/object/public/songs/Meteora/Foreword.mp3'
    },
    {
      id: 152,
      title: 'Best Years',
      artist: '5 Seconds of Summer',
      album: 'CALM',
      track_number: 1,
      duration: 190382,
      image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/04/31/61/0431617b-8479-58fe-3cc3-9fbfef175a71/20UMGIM06593.rgb.jpg/500x500bb.jpg',
      audio_url: 'https://oxloqoggjldbjjratwoh.supabase.co/storage/v1/object/public/songs/CALM/Best%20Years.mp3'
    },
    {
      id: 133,
      title: 'Ancianos',
      artist: "Adolescent's Orquesta",
      album: 'Ahora Mas Que Nunca',
      track_number: 1,
      duration: 201874,
      image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/ac/f9/f2/acf9f236-eae7-023a-120d-6c071797512d/cover.jpg/500x500bb.jpg',
      audio_url: 'https://oxloqoggjldbjjratwoh.supabase.co/storage/v1/object/public/songs/Ahora%20Mas%20Que%20Nunca/Ancianos.mp3'
    }
  ];

  function getArtistGenres(artist) {
    if (ARTIST_GENRES[artist]) return ARTIST_GENRES[artist];
    var keys = Object.keys(ARTIST_GENRES);
    for (var i = 0; i < keys.length; i++) {
      if (artist && artist.indexOf(keys[i]) === 0) return ARTIST_GENRES[keys[i]];
    }
    return ['Pop/Rock'];
  }

  function getArtistPopularity(name) {
    if (!name) return 0;
    var clean = name.toLowerCase();
    for (var i = 0; i < POPULARITY_ORDER.length; i++) {
      if (POPULARITY_ORDER[i].toLowerCase() === clean) {
        return POPULARITY_ORDER.length - i;
      }
    }
    return 0;
  }

  function supabaseFetch(path) {
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function buildCatalog(tracks, configRows) {
    var artistOverrides = {};
    var albumOverrides = {};

    (configRows || []).forEach(function (row) {
      if (!row || !row.key || !row.value) return;
      if (row.key.indexOf('artist_override:') === 0) {
        var aName = row.key.slice('artist_override:'.length);
        try {
          var parsedA = JSON.parse(row.value);
          artistOverrides[aName] = parsedA;
          if (parsedA.name) artistOverrides[parsedA.name] = parsedA;
        } catch (e) {
          artistOverrides[aName] = { img: row.value };
        }
      } else if (row.key.indexOf('album_override:') === 0) {
        var albId = row.key.slice('album_override:'.length);
        try {
          albumOverrides[albId] = JSON.parse(row.value);
        } catch (e) {
          albumOverrides[albId] = { coverUrl: row.value };
        }
      }
    });

    var albumsMap = {};
    (tracks || []).forEach(function (t) {
      var albumKey = t.album;
      if (!albumKey || albumKey === 'Yeezus' || albumKey === 'True' || albumKey.charAt(0) === '_') return;
      if (t.audio_url && t.audio_url.indexOf('/_') !== -1) return;

      if (!albumsMap[albumKey]) {
        var ovAlb = albumOverrides[albumKey] || {};
        albumsMap[albumKey] = {
          id: albumKey,
          title: ovAlb.title || t.album,
          artist: ovAlb.artist || t.artist,
          coverUrl: ovAlb.coverUrl || t.image_url || './assets/img/albums/hybrid-theory.jpg',
          year: ALBUM_YEARS[albumKey] || '2023',
          totalDuration: 0,
          genres: getArtistGenres(t.artist),
          trackCount: 0,
          tracks: []
        };
      }

      var durMs = (t.duration && t.duration < 10000) ? t.duration * 1000 : (t.duration || 180000);
      var sizeMb = t.size_mb || t.size || Number(((durMs / 1000) * 0.023).toFixed(2));
      var alb = albumsMap[albumKey];
      alb.tracks.push({
        id: Number(t.id),
        title: t.title,
        artist: alb.artist || t.artist,
        duration: durMs,
        previewUrl: t.audio_url,
        trackNumber: t.track_number || (alb.tracks.length + 1),
        sizeMb: Number(sizeMb),
        albumId: albumKey,
        albumTitle: alb.title,
        albumCover: alb.coverUrl,
        albumYear: alb.year
      });
      alb.trackCount = alb.tracks.length;
      alb.totalDuration += durMs;
    });

    var albums = Object.keys(albumsMap).map(function (k) {
      var a = albumsMap[k];
      a.tracks.sort(function (x, y) { return (x.trackNumber || 0) - (y.trackNumber || 0); });
      return a;
    }).filter(function (a) { return a.trackCount > 0; });

    var artistsMap = {};
    albums.forEach(function (album) {
      if (!artistsMap[album.artist]) {
        var ovArt = artistOverrides[album.artist] || {};
        artistsMap[album.artist] = {
          name: ovArt.name || album.artist,
          rawName: album.artist,
          img: ovArt.img || KNOWN_ARTIST_IMAGES[album.artist] || album.coverUrl,
          type: (album.artist.indexOf('Combo') !== -1 || album.artist.indexOf('Orquesta') !== -1) ? 'Grupo Musical' : 'Artista'
        };
      }
    });

    var artists = Object.keys(artistsMap).map(function (k) { return artistsMap[k]; });
    return { albums: albums, artists: artists };
  }

  function loadCatalog() {
    var t0 = performance.now();
    return Promise.all([
      supabaseFetch('tracks?select=*&order=track_number.asc'),
      supabaseFetch('app_config?select=key,value').catch(function () { return []; })
    ]).then(function (results) {
      var tracks = results[0];
      var configRows = results[1];
      if (!Array.isArray(tracks) || tracks.length === 0) {
        throw new Error('Catálogo vacío');
      }
      var built = buildCatalog(tracks, configRows);
      return {
        albums: built.albums,
        artists: built.artists,
        tracksCount: tracks.length,
        source: 'supabase',
        latencyMs: Math.max(12, Math.round(performance.now() - t0))
      };
    }).catch(function (err) {
      console.warn('Usando catálogo de respaldo local:', err);
      var built = buildCatalog(FALLBACK_TRACKS, []);
      return {
        albums: built.albums,
        artists: built.artists,
        tracksCount: FALLBACK_TRACKS.length,
        source: 'fallback',
        latencyMs: 0
      };
    });
  }

  window.BitszoneCatalog = {
    loadCatalog: loadCatalog,
    getArtistPopularity: getArtistPopularity,
    supabaseUrl: SUPABASE_URL
  };
})(window);
