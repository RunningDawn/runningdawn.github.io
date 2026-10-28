import { useEffect } from 'react'
import { GitHubIcon, SteamIcon, DiscordIcon, CalendarIcon } from '../components/Icons'
import { useLandingStyles } from '../hooks/useLandingStyles'

function LandingPage() {
  useLandingStyles()

  useEffect(() => {
    document.body.classList.remove("is-preloaded");

    const handleTouchMove = () => false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeEvents();
      }
    }

    window.ontouchmove = handleTouchMove;
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }

  }, []);

  const openEvents = () => {
    const el = document.getElementById("eventOverlay");
    if (el) el.style.height = "100%";
  }

  const closeEvents = () => {
    const el = document.getElementById("eventOverlay");
    if (el) el.style.height = "0%";
  }

  return (
    <div className="is-preload" id="wrapper">
      <div id="bg"></div>
      <div id="overlay"></div>
      <div id="main">
        <div id="eventOverlay" className="overlay">
          <div className="overlay-content">
            <iframe src="https://calendar.google.com/calendar/embed?src=q81f25l3cj2msbrk2f6bceq4r8%40group.calendar.google.com"></iframe>
            <a className="closebtn" onClick={closeEvents} style={{ cursor: 'pointer' }}>&times;</a>
          </div>
        </div>
        <header id="header">
          <h1 style={{ color: 'black' }}>Running Dawn</h1>
          <nav className="links">
            <ul>
              <li><a href="https://github.com/RunningDawn" className="icon"><GitHubIcon /></a></li>
              <li><a href="https://steamcommunity.com/groups/RunningDawn" className="icon"><SteamIcon /></a></li>
              <li><a href="https://discord.gg/runningdawn" className="icon"><DiscordIcon /></a></li>
              <li><a onClick={openEvents} className="icon" style={{ cursor: 'pointer' }} title="Events"><CalendarIcon /></a></li>
            </ul>
          </nav>
        </header>
        <footer id="footer">
          <span className="copyright">© Running Dawn</span>
        </footer>
      </div>
    </div>
  )
}

export default LandingPage
