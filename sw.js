/* Pactos — service worker
   Guarda la app en el celular para que abra sin internet.
   En cada actualización de la app hay que cambiar VERSION (igual que APP_VERSION en index.html). */
const VERSION = '1.2.0';
const CACHE = 'pactos-' + VERSION;
const BASE = ['./', './index.html', './manifest.json'];
const EXTRA = ['./icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (ev) {
  ev.waitUntil((async function () {
    const c = await caches.open(CACHE);
    // "reload" obliga a traer los archivos nuevos del servidor, no una copia vieja del navegador
    await c.addAll(BASE.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    await Promise.all(EXTRA.map(function (u) {
      return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil((async function () {
    const claves = await caches.keys();
    await Promise.all(claves.filter(function (k) { return k.indexOf('pactos-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (ev) {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  ev.respondWith((async function () {
    const c = await caches.open(CACHE);
    const esInicio = req.mode === 'navigate' && /\/(index\.html)?$/.test(url.pathname);
    const guardado = esInicio ? await c.match('./index.html') : await c.match(req, { ignoreSearch: true });
    if (guardado) return guardado;
    try {
      return await fetch(req);
    } catch (e) {
      if (req.mode === 'navigate') {
        const inicio = await c.match('./index.html');
        if (inicio) return inicio;
      }
      return Response.error();
    }
  })());
});
