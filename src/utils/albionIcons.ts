import { API_URLS } from '../config/apiUrls'

// Item icons come from forge-api's /game/albion/icon proxy (7-day immutable HTTP cache)
// and are then pinned FOREVER by the icon service worker (public/icon-sw.js, Cache API,
// cache-first): after an icon loads once it never touches the network again. The render
// CDN can't be cached directly - it sends no CORS headers, so cross-origin caching would
// store opaque responses (quota-padded ~7MB each in Chromium). ItemIcon sets
// crossOrigin="anonymous" so the proxy responses are non-opaque and cacheable.
// Fetch sizes are normalized to TWO canonical variants so the same item shares one cached
// URL across tables/trees/strips (64) and detail headers (128) - `displaySize` is the CSS
// size. Quality is only ever passed on detail headers; table icons omit it so quality
// flips reuse the cached image.
export function itemIconUrl(uniqueName: string, displaySize = 32, quality?: number): string {
  const size = displaySize <= 32 ? 64 : 128
  let url = `${API_URLS.forgeAPI}/game/albion/icon/${encodeURIComponent(uniqueName)}?size=${size}`
  if (quality !== undefined && quality >= 1 && quality <= 5) url += `&quality=${quality}`
  return url
}
