// Service Worker: guarda o app no aparelho para funcionar 100% offline.
// Este arquivo é um modelo: no build, o vite.config.js troca os marcadores de VERSAO e
// ARQUIVOS (abaixo) pela versão e pela lista real de arquivos, e grava o resultado em dist/sw.js.
// Os dados (IndexedDB) nunca são tocados aqui: atualizar o app não apaga nada.
// ignoreVary: alguns servidores mandam "Vary: Origin"; sem isso, JS e CSS não saem do cache offline.

const VERSAO = '__VERSAO__';
const ARQUIVOS = __ARQUIVOS__;
const CACHE = `ecsfs-${VERSAO}`;

self.addEventListener('install', (evento) => {
  // Baixa todos os arquivos do app. A nova versão fica "esperando" até o usuário aceitar.
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
});

self.addEventListener('activate', (evento) => {
  // Remove só os caches de versões antigas deste app.
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k.startsWith('ecsfs-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// O app pede para ativar a nova versão quando o usuário clica em "Recarregar".
self.addEventListener('message', (evento) => {
  if (evento.data === 'PULAR_ESPERA') self.skipWaiting();
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return; // o app não usa nada de fora

  if (pedido.mode === 'navigate') {
    // Qualquer página do app abre o index.html guardado (funciona em modo avião).
    evento.respondWith(caches.match(new URL('./index.html', self.registration.scope).href, { ignoreVary: true }).then((r) => r || fetch(pedido)));
    return;
  }
  evento.respondWith(caches.match(pedido, { ignoreSearch: true, ignoreVary: true }).then((r) => r || fetch(pedido)));
});
