// Cache-first service worker for Albion item icons served by the forge-api proxy.
// Icons are immutable game art: once fetched they are cached in the Cache API with no
// expiry, so repeat visits (and quality/tier browsing) hit zero network. Only
// /game/albion/icon/ requests are intercepted. The render CDN itself sends no CORS
// headers, so caching it directly would store opaque responses (quota-padded ~7MB each
// in Chromium) - hence the proxy + crossOrigin="anonymous" on the img tags.
const CACHE = 'albion-icons-v1'
const MAX_ENTRIES = 4000

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', event => {
  if (!new URL(event.request.url).pathname.includes('/game/albion/icon/')) return
  event.respondWith(iconResponse(event.request))
})

async function iconResponse(request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request, { ignoreVary: true })
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) {
    const keys = await cache.keys()
    if (keys.length >= MAX_ENTRIES) await caches.delete(CACHE)
    await (await caches.open(CACHE)).put(request, response.clone())
  }
  return response
}
