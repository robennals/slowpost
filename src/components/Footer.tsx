import styles from './Footer.module.css';

export default function Footer() {
  return (
    <div className={styles.footer}>
      <a href="/pages/how-it-works.html" className={styles.link}>How it works</a>
      <span className={styles.separator}>·</span>
      <a href="/pages/why-slowpost.html" className={styles.link}>Why Slowpost?</a>
      <span className={styles.separator}>·</span>
      <a href="/pages/writing-a-good-letter.html" className={styles.link}>Writing a good letter</a>
      <span className={styles.separator}>·</span>
      <a href="/pages/about.html" className={styles.link}>About</a>
      <span className={styles.separator}>·</span>
      <a href="/pages/legal.html" className={styles.link}>Legal</a>
    </div>
  );
}
