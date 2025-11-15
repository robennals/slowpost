'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGroups, getSubscriptions, getSubscribers, getUpdates, getProfile, markLetterSent } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [markingSent, setMarkingSent] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadGroups();
      loadSubscriptions();
      loadSubscribers();
      loadUpdates();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const data = await getProfile(user.username);
    setProfile(data);
  };

  const loadGroups = async () => {
    if (!user) return;
    const data = await getUserGroups(user.username);
    setGroups(data || []);
  };

  const loadSubscriptions = async () => {
    if (!user) return;
    const data = await getSubscriptions(user.username);
    setSubscriptions(data || []);
  };

  const loadSubscribers = async () => {
    if (!user) return;
    const data = await getSubscribers(user.username);
    setSubscribers(data || []);
  };

  const loadUpdates = async () => {
    if (!user) return;
    const data = await getUpdates(user.username);
    setUpdates(data || []);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
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
          <h2 className={styles.heroTitle}>WRITE ONCE A YEAR, STAY IN TOUCH FOREVER</h2>

          <p className={styles.description}>
          Slowpost is the world's least addictive social platform, reviving the tradition of the annual New Year letter. No doomscrolling, no likes, no apps, no ranking. Just one email a year.
          </p>

          <div className={styles.valueProposition}>
          <p className={styles.valueText}>

            Create a profile, share your link, and collect subscribers. Once a year, you'll send your annual update directly to their inboxes by email. Slowpost just helps you manage who to send to.
          </p>
            <div className={styles.valueLinks}>
              <a href="/pages/why-slowpost.html" className={styles.valueLink}>Why Slowpost?</a>
              <span className={styles.valueLinkSeparator}>·</span>
              <a href="/pages/how-it-works.html" className={styles.valueLink}>How it works</a>
            </div>
          </div>

          <Link href="/login" className={styles.ctaButton}>
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const isTimeToSend = () => {
    if (!profile?.expectedSendMonth) return false;

    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

    // Check if we're in the expected send month
    if (profile.expectedSendMonth === currentMonth) {
      // Check if they haven't sent this year yet
      if (!profile.lastSentDate) return true;

      const lastSentDate = new Date(profile.lastSentDate);
      const now = new Date();

      // Check if last sent was more than 6 months ago (to handle year boundary)
      const monthsSinceLastSent = (now.getFullYear() - lastSentDate.getFullYear()) * 12 +
                                  (now.getMonth() - lastSentDate.getMonth());
      return monthsSinceLastSent >= 6;
    }

    return false;
  };

  const handleMarkSent = async () => {
    if (!user) return;
    setMarkingSent(true);
    try {
      const result = await markLetterSent(user.username);
      if (result.error) {
        alert(result.error);
      } else {
        setProfile(result);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to mark letter as sent');
    } finally {
      setMarkingSent(false);
    }
  };

  // Check what's missing from profile and return appropriate message
  const getProfileSetupMessage = (profile: any): string | null => {
    if (!profile.bio || profile.bio.trim() === '') {
      return 'Edit your profile to tell people what you\'ll write about';
    }
    if (!profile.photoUrl) {
      return 'Add a profile photo so subscribers can recognize you';
    }
    if (!profile.expectedSendMonth) {
      return 'Set when you plan to send your annual letter';
    }
    return null; // Profile is complete
  };

  // Determine next action
  const getNextAction = () => {
    // Don't show setup widget if profile hasn't loaded yet
    if (!profile) {
      return null;
    }

    const setupMessage = getProfileSetupMessage(profile);
    if (setupMessage) {
      return {
        type: 'setup' as const,
        message: setupMessage,
        link: `/${user.username}`,
        linkText: 'Edit your profile',
        helpDoc: '/pages/setting-up-your-profile.html'
      };
    }

    if (isTimeToSend() && subscribers.length > 0) {
      return {
        type: 'send' as const,
        message: `It's time to send your annual letter by email! You have ${subscribers.length} ${subscribers.length === 1 ? 'subscriber' : 'subscribers'} waiting to hear from you.`,
        link: '/subscribers',
        linkText: 'View subscriber emails',
        helpDoc: '/pages/writing-a-good-letter.html'
      };
    }

    if (groups.length === 0) {
      return {
        type: 'setup' as const,
        message: 'Create a group to reconnect with people you know',
        link: '/groups',
        linkText: 'Create a group',
        helpDoc: '/pages/joining-groups.html'
      };
    }

    return {
      type: 'setup' as const,
      message: `You have ${subscribers.length} ${subscribers.length === 1 ? 'subscriber' : 'subscribers'}. Share your profile to get more!`,
      link: `/${user.username}`,
      linkText: 'View your profile',
      helpDoc: '/pages/getting-subscribers.html'
    };
  };

  const nextAction = getNextAction();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.welcomeHeader}>
          <h1 className={styles.welcome}>Welcome back, {user.fullName}!</h1>
          <Link href={`/${user.username}`} className={styles.profileButton}>
            Your Profile
          </Link>
        </div>

        {nextAction && (
          <div className={styles.nextThingToDo}>
            <h2 className={styles.nextThingTitle}>
              {nextAction.type === 'send' ? 'Time to send your annual letter!' : 'Complete your setup'}
            </h2>
            <p className={styles.nextThingMessage}>{nextAction.message}</p>
            <div className={styles.nextThingActions}>
              <Link href={nextAction.link} className={styles.nextThingButton}>
                {nextAction.linkText}
              </Link>
              {nextAction.type === 'send' && (
                <button
                  onClick={handleMarkSent}
                  className={styles.nextThingButton}
                  disabled={markingSent}
                >
                  {markingSent ? 'Marking...' : 'Mark as sent'}
                </button>
              )}
              <a href={nextAction.helpDoc} className={styles.nextThingHelp}>
                Learn more
              </a>
            </div>
          </div>
        )}

        <div className={styles.sections}>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Updates</h2>
              <Link href="/updates" className={styles.viewAll}>
                View all
              </Link>
            </div>
            {updates.length > 0 ? (
              <div className={styles.updateList}>
                {updates.slice(0, 3).map((update) => {
                  // Determine the link destination based on update type
                  let linkHref = '/';
                  if (update.type === 'new_subscriber') {
                    linkHref = '/subscribers';
                  } else if (update.type === 'group_join_request') {
                    linkHref = `/g/${update.groupName}`;
                  } else if (update.type === 'group_join_approved') {
                    linkHref = `/g/${update.groupName}`;
                  } else if (update.type === 'group_join') {
                    linkHref = `/g/${update.groupName}`;
                  }

                  return (
                    <Link key={update.id} href={linkHref} className={styles.updateCardLink}>
                      <div className={styles.updateCard}>
                        {update.type === 'new_subscriber' && (
                          <>
                            <div className={styles.updateText}>
                              <strong>{update.fullName}</strong> subscribed to you
                            </div>
                            <div className={styles.updateTime}>{formatTime(update.timestamp)}</div>
                          </>
                        )}

                        {update.type === 'group_join' && (
                          <>
                            <div className={styles.updateText}>
                              <strong>{update.fullName}</strong>
                              {' joined '}
                              <strong>{update.groupDisplayName}</strong>
                            </div>
                            <div className={styles.updateTime}>{formatTime(update.timestamp)}</div>
                          </>
                        )}

                        {update.type === 'group_join_request' && (
                          <>
                            <div className={styles.updateText}>
                              <strong>{update.fullName}</strong>
                              {' requested to join '}
                              <strong>{update.groupDisplayName}</strong>
                            </div>
                            <div className={styles.updateTime}>{formatTime(update.timestamp)}</div>
                          </>
                        )}

                        {update.type === 'group_join_approved' && (
                          <>
                            <div className={styles.updateText}>
                              {'You were approved to join '}
                              <strong>{update.groupDisplayName}</strong>
                            </div>
                            <div className={styles.updateTime}>{formatTime(update.timestamp)}</div>
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No updates yet</p>
                <p className={styles.emptyHint}>
                  Updates will appear here when people subscribe to you or join your groups
                </p>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Subscribers</h2>
              <Link href="/subscribers" className={styles.viewAll}>
                View all
              </Link>
            </div>
            {subscribers.length > 0 ? (
              <div className={styles.subscriptionList}>
                {subscribers.slice(0, 5).map((sub) => (
                  <Link
                    key={sub.subscriberUsername}
                    href={`/${sub.subscriberUsername}`}
                    className={styles.subscriptionCard}
                  >
                    <div className={styles.subscriptionName}>{sub.fullName}</div>
                    <div className={styles.subscriptionUsername}>@{sub.subscriberUsername}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No subscribers yet</p>
                <p className={styles.emptyHint}>
                  When people subscribe to you, they'll appear here
                </p>
              </div>
            )}
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
