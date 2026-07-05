import SectionLayout from '../layouts/SectionLayout'
import logo from '../assets/albion-logo.png'
import styles from './AlbionPage.module.css'

function AlbionPage() {
  return (
    <SectionLayout>
      <div className={styles.container}>
        <img src={logo} alt="Albion Online" className={styles.logo} />
        <h1 className={styles.heading}>
          Albion <span className={styles.accent}>Online</span>
        </h1>
        <p className={styles.subtitle}>Coming soon.</p>
      </div>
    </SectionLayout>
  )
}

export default AlbionPage
