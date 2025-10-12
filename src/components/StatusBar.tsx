'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './StatusBar.module.css';

export default function StatusBar() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Slowpost
        </Link>

        <div className={styles.nav}>
          {user ? (
            <>
              <Link href={`/${user.username}`} className={styles.profileLink}>
                {user.fullName}
              </Link>
              <button onClick={handleLogout} className={styles.logoutButton}>
                Log Out
              </button>
            </>
          ) : (
            <Link href="/login" className={styles.loginButton}>
              Log In | Sign Up
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
