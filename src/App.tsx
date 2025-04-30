import { useEffect } from 'react'
import './App.css'

function App() {

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
            <a href="javascript:void(0)" className="closebtn" onClick={closeEvents}>&times;</a>
          </div>
        </div>
        <header id="header">
          <nav className="games">
            <ul>
              <li><a href="#" onClick={openEvents} className="game">Events</a></li>
            </ul>
          </nav>
          <h1 style={{ color: 'black' }}>Running Dawn</h1>
          <nav className="links">
            <ul>
              <li><a href="http://github.runningdawn.com" className="icon brands fa-github"></a></li>
              <li><a href="http://steam.runningdawn.com" className="icon brands fa-steam"></a></li>
              <li><a href="http://discord.runningdawn.com" className="icon brands fa-discord"></a></li>
            </ul>
          </nav>
          <nav className="games">
            <ul>
              {/* <!-- <li><a href="http://discord.runningdawn.com" title="Content coming soon!" className="game">Ashes of Creation</a></li> -->
              <!-- <li><a href="http://discord.runningdawn.com" title="Content coming soon!" className="game">Foxhole</a></li> -->
              <!-- <li><a href="http://discord.runningdawn.com" title="Content coming soon!" className="game">New World</a></li> -->
              <!-- <li><a href="http://discord.runningdawn.com" title="Content coming soon!" className="game">Throne & Liberty</a></li> -->

              <!-- <li><a href="http://discord.runningdawn.com" title="Content coming soon!" className="game">V-Rising</a></li> -->
              <!-- <li><a href="http://discord.runningdawn.com" className="game">New&nbsp;World</a></li> -->
              <!-- <li><a href="https://crowfall.com/en-US/guilds/search?name=Running%20Dawn#DAWN" className="game">Crowfall</a></li> -->
              <!-- <li><a href="http://discord.runningdawn.com" title="Content coming soon!" className="game">Lost Ark</a></li> -->
              <!-- <li><a href="https://classic.warcraftlogs.com/guild/us/arugal/running%20dawn" className="game">World of Warcraft</a></li> --> */}
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

export default App
