import Link from 'next/link';
import styles from './StatusBar.module.css';

type StatusBarProps = {
  isLoggedIn: boolean;
  username?: string;
};

export function StatusBar({ isLoggedIn, username }: StatusBarProps) {
  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.logo}>
        Slowpost
      </Link>
      {isLoggedIn ? (
        <Link href={`/${username ?? ''}`} className={styles.action}>
          Profile
        </Link>
      ) : (
        <Link href="/p/login" className={styles.action}>
          Login
        </Link>
      )}
    </header>
  );
}

export default StatusBar;
