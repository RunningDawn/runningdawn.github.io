import { useLayoutEffect } from 'react'
import css from '../App.css?inline'

// Inject the landing template's CSS (HTML5UP) only while the landing page is mounted.
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
