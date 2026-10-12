/*
 * CriptSage — service worker
 *
 * Guarda a aplicação inteira no navegador para que ela abra sem conexão.
 * Não existe comunicação com servidor algum além do download desses arquivos:
 * nenhuma mensagem, palavra-passe ou estatística é enviada a lugar nenhum.
 *
 * Ao publicar uma versão nova, altere VERSAO. O cache antigo é descartado e a
 * página aberta recebe o aviso de atualização.
 */

const VERSAO = 'criptsage-v1.0.0';

/* Arquivos próprios, sempre guardados na instalação. */
const ESSENCIAIS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icone.svg',
  './assets/icone-192.png',
  './assets/icone-512.png',
  './assets/apple-touch-icon.png',
  './assets/favicon-32.png'
];

/* Hospedeiros das fontes, guardados conforme vão sendo usados. */
const FONTES = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO)
      .then((cache) => cache.addAll(ESSENCIAIS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;
  const ehFonte = FONTES.includes(url.hostname);
  if (!mesmaOrigem && !ehFonte) return;

  /* Navegação: tenta a rede e, sem ela, serve a página guardada. */
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(VERSAO).then((cache) => cache.put('./index.html', copia));
          return resp;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })
          .then((guardada) => guardada || Response.error()))
    );
    return;
  }

  /* Demais arquivos: serve o que está guardado e repõe em segundo plano. */
  evento.respondWith(
    caches.match(req).then((guardado) => {
      const daRede = fetch(req)
        .then((resp) => {
          if (resp && (resp.ok || resp.type === 'opaque')) {
            const copia = resp.clone();
            caches.open(VERSAO).then((cache) => cache.put(req, copia));
          }
          return resp;
        })
        .catch(() => guardado);
      return guardado || daRede;
    })
  );
});
