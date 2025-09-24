const CACHE_NAME = 'sinais-emocoes-v2'; // Incrementamos a versão do cache
// Lista de arquivos para fazer cache inicial.
// Inclua todas as fontes que você usa!
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './fonts/poppins-v21-latin-regular.woff2',
  './fonts/poppins-v21-latin-600.woff2',
  './fonts/poppins-v21-latin-700.woff2'
];

// Evento de instalação: abre o cache e adiciona os arquivos do "app shell".
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto e arquivos adicionados.');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de ativação: limpa caches antigos.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Torna o SW ativo imediatamente
});

// Evento de fetch: intercepta as requisições e decide a estratégia de cache.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Estratégia "Stale-While-Revalidate" para o HTML principal.
  // Responde rápido com o cache, mas atualiza em segundo plano.
  if (event.request.mode === 'navigate' || (url.pathname === '/' || url.pathname.endsWith('/index.html'))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          // Retorna o cache imediatamente, se disponível, senão espera a rede.
          return cachedResponse || fetchPromise;
        });
      })
    );
  } 
  // Estratégia "Cache-First" para todos os outros assets (fontes, ícones, etc).
  // Uma vez no cache, sempre serve do cache.
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Se encontrar no cache, retorna a resposta do cache.
          if (response) {
            return response;
          }
          // Senão, faz a requisição à rede (e opcionalmente, poderia adicionar ao cache aqui).
          return fetch(event.request);
        }
      )
    );
  }
});
