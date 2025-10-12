'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscribers, updateSubscriber, getProfile, addSubscriberByEmail } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './subscribers.module.css';

interface Subscriber {
  subscriberUsername: string;
  subscribedToUsername: string;
  isClose: boolean;
  addedBy?: string;
  confirmed?: boolean;
  timestamp?: string;
}

interface SubscriberWithProfile extends Subscriber {
  fullName?: string;
  email?: string;
  hasAccount?: boolean; // Whether they have created a full account
}

export default function SubscribersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [subscribers, setSubscribers] = useState<SubscriberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingEmail, setAddingEmail] = useState('');
  const [addingName, setAddingName] = useState('');
  const [adding, setAdding] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');
  const [emailFilter, setEmailFilter] = useState<'all' | 'close' | 'non-close'>('all');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSubscribers();
  }, [user]);

  const loadSubscribers = async () => {
    if (!user) return;

    setLoading(true);
    const data = await getSubscribers(user.username);

    // Enrich with profile data
    const enriched = await Promise.all(
      data.map(async (subscriber: Subscriber) => {
        const profile = await getProfile(subscriber.subscriberUsername);
        return {
          ...subscriber,
          fullName: profile?.fullName || subscriber.subscriberUsername,
          hasAccount: profile?.hasAccount !== false, // Use the hasAccount field from profile
        };
      })
    );

    setSubscribers(enriched);
    setLoading(false);
  };

  const handleToggleClose = async (subscriberUsername: string, currentIsClose: boolean) => {
    if (!user) return;

    const result = await updateSubscriber(user.username, subscriberUsername, !currentIsClose);
    if (result.success) {
      setSubscribers(subscribers.map(s =>
        s.subscriberUsername === subscriberUsername
          ? { ...s, isClose: !currentIsClose }
          : s
      ));
    }
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !addingEmail) return;

    setAdding(true);
    try {
      const result = await addSubscriberByEmail(user.username, addingEmail, addingName || undefined);
      if (result.error) {
        alert(result.error);
      } else {
        // Reload subscribers list
        await loadSubscribers();
        setAddingEmail('');
        setAddingName('');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add subscriber');
    } finally {
      setAdding(false);
    }
  };

  // Sort and filter subscribers
  const sortedAndFilteredSubscribers = subscribers
    .filter(sub => {
      if (emailFilter === 'close') return sub.isClose;
      if (emailFilter === 'non-close') return !sub.isClose;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return (a.fullName || a.subscriberUsername).localeCompare(b.fullName || b.subscriberUsername);
      } else {
        // Sort by timestamp (recent first)
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      }
    });

  // Generate email list text
  const emailListText = sortedAndFilteredSubscribers
    .map(sub => {
      const name = sub.fullName || sub.subscriberUsername;
      const email = sub.email || `${sub.subscriberUsername}@slowpost.local`;
      return `${name} <${email}>`;
    })
    .join('\n');

  const handleCopyEmailList = async () => {
    try {
      await navigator.clipboard.writeText(emailListText);
      alert('Email list copied to clipboard!');
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Your Subscribers</h1>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Subscriber by Email</h2>
          <form onSubmit={handleAddSubscriber} className={styles.addForm}>
            <input
              type="email"
              value={addingEmail}
              onChange={(e) => setAddingEmail(e.target.value)}
              placeholder="email@example.com"
              className={styles.input}
              required
            />
            <input
              type="text"
              value={addingName}
              onChange={(e) => setAddingName(e.target.value)}
              placeholder="Full name (optional)"
              className={styles.input}
            />
            <button type="submit" className={styles.addButton} disabled={adding}>
              {adding ? 'Adding...' : 'Add Subscriber'}
            </button>
          </form>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {subscribers.length} {subscribers.length === 1 ? 'Subscriber' : 'Subscribers'}
            </h2>
            <div className={styles.controls}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'alphabetical')}
                className={styles.select}
              >
                <option value="recent">Recently Joined</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
              <select
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value as 'all' | 'close' | 'non-close')}
                className={styles.select}
              >
                <option value="all">All Subscribers</option>
                <option value="close">Close Friends</option>
                <option value="non-close">Non-Close Friends</option>
              </select>
            </div>
          </div>

          {subscribers.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No subscribers yet</p>
              <p className={styles.emptyHint}>
                When people subscribe to you, they'll appear here
              </p>
            </div>
          ) : (
            <>
              <div className={styles.emailListSection}>
                <h3 className={styles.emailListTitle}>Email List</h3>
                <textarea
                  className={styles.emailListTextarea}
                  value={emailListText}
                  readOnly
                  rows={Math.min(sortedAndFilteredSubscribers.length + 1, 10)}
                />
                <button onClick={handleCopyEmailList} className={styles.copyButton}>
                  Copy to Clipboard
                </button>
              </div>

              <div className={styles.subscriberList}>
                {sortedAndFilteredSubscribers.map((subscriber) => (
                <div key={subscriber.subscriberUsername} className={styles.subscriberCard}>
                  {subscriber.hasAccount ? (
                    <Link href={`/${subscriber.subscriberUsername}`} className={styles.subscriberLink}>
                      <div className={styles.subscriberInfo}>
                        <div className={styles.subscriberName}>{subscriber.fullName}</div>
                        <div className={styles.subscriberUsername}>@{subscriber.subscriberUsername}</div>
                        {subscriber.addedBy === user?.username && (
                          <div className={styles.subscriberSource}>
                            {subscriber.confirmed === false ? 'Added by you (not confirmed)' : 'Added by you'}
                          </div>
                        )}
                        {subscriber.addedBy === subscriber.subscriberUsername && (
                          <div className={styles.subscriberSource}>
                            They subscribed themselves
                          </div>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className={styles.subscriberInfo}>
                      <div className={styles.subscriberName}>{subscriber.fullName}</div>
                      <div className={styles.subscriberUsername}>@{subscriber.subscriberUsername}</div>
                      <div className={styles.noAccountNotice}>No account created yet</div>
                      {subscriber.addedBy === user?.username && (
                        <div className={styles.subscriberSource}>
                          {subscriber.confirmed === false ? 'Added by you (not confirmed)' : 'Added by you'}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={styles.subscriberActions}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={subscriber.isClose}
                        onChange={() => handleToggleClose(subscriber.subscriberUsername, subscriber.isClose)}
                        className={styles.checkbox}
                      />
                      <span>Close Friend</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
