'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getUserGroups, getSubscriptions, getProfile } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadGroups();
      loadSubscriptions();
    }
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;
    const data = await getUserGroups(user.username);
    setGroups(data || []);
  };

  const loadSubscriptions = async () => {
    if (!user) return;
    const data = await getSubscriptions(user.username);

    // Enrich subscriptions with profile data
    const enriched = await Promise.all(
      data.map(async (sub: any) => {
        const profile = await getProfile(sub.subscribedToUsername);
        return {
          ...sub,
          fullName: profile?.fullName || sub.subscribedToUsername,
        };
      })
    );

    setSubscriptions(enriched);
  };

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
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Your Profile</h2>
              <Link href={`/${user.username}`} className={styles.viewAll}>
                View profile
              </Link>
            </div>
            <div className={styles.profilePreview}>
              <div className={styles.profileInfo}>
                <div className={styles.profileName}>{user.fullName}</div>
                <div className={styles.profileUsername}>@{user.username}</div>
              </div>
            </div>
          </section>

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
              <h2 className={styles.sectionTitle}>Subscribers</h2>
              <Link href="/subscribers" className={styles.viewAll}>
                View all
              </Link>
            </div>
            <div className={styles.emptyState}>
              <p>No subscribers yet</p>
              <p className={styles.emptyHint}>
                When people subscribe to you, they'll appear here
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Subscriptions</h2>
            {subscriptions.length > 0 ? (
              <div className={styles.subscriptionList}>
                {subscriptions.map((sub) => (
                  <Link
                    key={sub.subscribedToUsername}
                    href={`/${sub.subscribedToUsername}`}
                    className={styles.subscriptionCard}
                  >
                    <div className={styles.subscriptionName}>{sub.fullName}</div>
                    <div className={styles.subscriptionUsername}>@{sub.subscribedToUsername}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No subscriptions yet</p>
                <p className={styles.emptyHint}>
                  Subscribe to people to see their annual posts
                </p>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Groups</h2>
              <Link href="/groups" className={styles.viewAll}>
                View all
              </Link>
            </div>
            {groups.length > 0 ? (
              <div className={styles.groupList}>
                {groups.slice(0, 5).map((group) => (
                  <Link
                    key={group.groupName}
                    href={`/g/${group.groupName}`}
                    className={styles.groupCard}
                  >
                    <div className={styles.groupHeader}>
                      <div className={styles.groupName}>{group.displayName}</div>
                      <span className={styles.groupBadge}>
                        {group.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No groups yet</p>
                <p className={styles.emptyHint}>
                  Join or create a group to get started
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
