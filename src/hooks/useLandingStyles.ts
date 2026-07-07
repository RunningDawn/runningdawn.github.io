import { useLayoutEffect } from 'react'
import css from '../App.css?inline'

// Inject the landing template's CSS (HTML5UP) only while the landing page is
// mounted, then remove it on unmount. The template has a global element reset and
// its own fonts; scoping it to the `/` route this way keeps it from leaking into the
// albion app. Mirrors forge-web's useForgehavenStyles. useLayoutEffect runs before
// paint so there's no flash of unstyled landing.
export function useLandingStyles(): void {
  useLayoutEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])
}
