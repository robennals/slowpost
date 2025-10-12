'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.logoLarge}>Slowpost</div>
          <p className={styles.tagline}>
            Connect meaningfully with your close friends and communities
          </p>
          <p className={styles.description}>
            Slowpost helps you stay connected to the people who matter most.
            Share updates with close friends, join intimate groups, and build
            authentic connections without the noise.
          </p>
          <Link href="/login" className={styles.ctaButton}>
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.welcome}>Welcome back, {user.fullName}!</h1>

        <div className={styles.sections}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Updates</h2>
            <div className={styles.emptyState}>
              <p>No updates yet</p>
              <p className={styles.emptyHint}>
                Updates will appear here when people follow you or request to join your groups
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Followers</h2>
              <Link href="/followers" className={styles.viewAll}>
                View all
              </Link>
            </div>
            <div className={styles.emptyState}>
              <p>No followers yet</p>
              <p className={styles.emptyHint}>
                When people follow you, they'll appear here
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Groups</h2>
              <Link href="/groups" className={styles.viewAll}>
                View all
              </Link>
            </div>
            <div className={styles.emptyState}>
              <p>No groups yet</p>
              <p className={styles.emptyHint}>
                Join or create a group to get started
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
