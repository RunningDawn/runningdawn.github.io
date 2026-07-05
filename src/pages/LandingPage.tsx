import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faSteam, faDiscord } from '@fortawesome/free-brands-svg-icons'
import '../App.css'

function LandingPage() {
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
            <a className="closebtn" onClick={closeEvents}>&times;</a>
          </div>
        </div>
        <header id="header">
          <nav className="games">
            <ul>
              <li><a onClick={openEvents} className="game">Events</a></li>
            </ul>
          </nav>
          <h1 style={{ color: 'black' }}>Running Dawn</h1>
          <nav className="links">
            <ul>
              <li><a href="https://github.com/RunningDawn" className="icon"><FontAwesomeIcon icon={faGithub} /></a></li>
              <li><a href="https://steamcommunity.com/groups/RunningDawn" className="icon"><FontAwesomeIcon icon={faSteam} /></a></li>
              <li><a href="https://discord.gg/runningdawn" className="icon"><FontAwesomeIcon icon={faDiscord} /></a></li>
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
