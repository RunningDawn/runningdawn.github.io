import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import Modal from '../components/Modal'
import { useAuth, mmAccess } from './authContext'
import styles from './LoginModal.module.css'

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, isAuthenticated, login, logout } = useAuth()
  const access = mmAccess(user)

  return (
    <Modal open={open} onClose={onClose} title="Account">
      {isAuthenticated && user ? (
        <div className={styles.account}>
          <div className={styles.userRow}>
            {user.avatar ? <img src={user.avatar} alt="" className={styles.avatar} /> : null}
            <span className={styles.username}>{user.username}</span>
          </div>
          <div className={styles.chips}>
            <span className={access.member ? styles.chipOn : styles.chipOff}>Guild member</span>
            <span className={access.role ? styles.chipOn : styles.chipOff}>Albion role</span>
          </div>
          <button className={styles.logout} onClick={() => logout()}>
            Logout
          </button>
        </div>
      ) : (
        <button className={styles.discord} onClick={() => login()}>
          <FontAwesomeIcon icon={faDiscord} />
          Login with Discord
        </button>
      )}
    </Modal>
  )
}
