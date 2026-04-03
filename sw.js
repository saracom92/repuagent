const CACHE_NAME = 'repuagent-v1';
const STATIC_ASSETS = [
  '/',
  '/landing.html',
  '/login.html',
  '/dashboard.html',
  '/demo.html',
  '/manifest.json'
];

// Installation — mise en cache des assets statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation — suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — stratégie Network First pour les pages, Cache First pour les assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes API
  if (url.pathname.startsWith('/api/')) return;

  // Ne pas intercepter Supabase, Stripe, etc.
  if (!url.hostname.includes('gosmartlink.app')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // En cas d'erreur réseau → servir depuis le cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Page hors ligne de fallback
          return new Response(`
            <!DOCTYPE html>
            <html lang="fr">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>RepuAgent — Hors ligne</title>
            <style>
              body{margin:0;background:#0c0a07;color:#f5f0e8;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}
              h1{font-size:28px;color:#c8882a;margin-bottom:12px}
              p{font-size:14px;color:#a89880;line-height:1.6}
              a{color:#c8882a;text-decoration:none;font-weight:700}
            </style>
            </head>
            <body>
              <div>
                <div style="font-size:48px;margin-bottom:20px">📡</div>
                <h1>Vous êtes hors ligne</h1>
                <p>Vérifiez votre connexion internet<br>et <a href="/">rechargez la page</a>.</p>
              </div>
            </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } });
        });
      })
  );
});
