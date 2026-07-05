import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faUser, faGear } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../auth/authContext'
import LoginModal from '../auth/LoginModal'
import Modal from '../components/Modal'
import styles from './SectionLayout.module.css'
import forgehavenLogo from '../assets/forgehaven-logo.png'

function SidebarInner({
  onClose,
  onOpenLogin,
  onOpenSettings,
}: {
  onClose: () => void
  onOpenLogin: () => void
  onOpenSettings: () => void
}) {
  const { user, isAuthenticated } = useAuth()
  const label = isAuthenticated && user ? user.username : 'Login'

  return (
    <>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarHeaderRow}>
          <Link to="/" onClick={onClose} className={styles.logoLink}>
            <img src="/favicon.png" alt="Running Dawn" className={styles.logo} />
          </Link>
          <Link to="/albion" onClick={onClose} className={styles.wordmark}>
            Albion <span className={styles.wordmarkAccent}>Online</span>
          </Link>
        </div>
      </div>

      <nav className={styles.nav} />

      <div className={styles.footer}>
        <button className={styles.footerRow} onClick={onOpenLogin}>
          {isAuthenticated && user?.avatar ? (
            <img src={user.avatar} alt="" className={styles.avatar} />
          ) : (
            <FontAwesomeIcon icon={faUser} className={styles.footerIcon} />
          )}
          <span className={styles.footerLabel}>{label}</span>
        </button>
        <button className={`${styles.footerRow} ${styles.footerRowBorder}`} onClick={onOpenSettings}>
          <FontAwesomeIcon icon={faGear} className={styles.footerIcon} />
          <span className={styles.footerLabel}>Settings</span>
        </button>
      </div>
    </>
  )
}

export default function SectionLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const close = () => setSidebarOpen(false)

  return (
    <div className={styles.layout}>
      {sidebarOpen && <div className={styles.backdrop} onClick={close} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <SidebarInner
          onClose={close}
          onOpenLogin={() => { setLoginOpen(true); close() }}
          onOpenSettings={() => { setSettingsOpen(true); close() }}
        />
      </aside>

      <div className={styles.content}>
        <header className={styles.topbar}>
          <button className={styles.hamburger} onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <FontAwesomeIcon icon={faBars} />
          </button>
          <Link to="/albion" className={styles.topbarTitle}>
            Albion <span className={styles.wordmarkAccent}>Online</span>
          </Link>
        </header>

        <main className={styles.main}>
          <div className={styles.mainInner}>{children}</div>
        </main>

        <footer className={styles.bottombar}>
          <a
            href="https://forgehaven.io"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.poweredBy}
          >
            Powered by FORGEHAVEN
            <img src={forgehavenLogo} alt="Forgehaven" className={styles.poweredLogo} />
          </a>
        </footer>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <p className={styles.settingsEmpty}>No settings yet.</p>
      </Modal>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
