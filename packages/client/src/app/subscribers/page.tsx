'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscribers, updateSubscriber, getProfile } from '@/lib/api';
import { useRouter } from 'next/navigation';
import styles from './subscribers.module.css';

interface Subscriber {
  subscriberUsername: string;
  subscribedToUsername: string;
  isClose: boolean;
}

interface SubscriberWithProfile extends Subscriber {
  fullName?: string;
}

export default function SubscribersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [subscribers, setSubscribers] = useState<SubscriberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingEmail, setAddingEmail] = useState('');

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
    alert('Subscriber invitation feature coming soon!');
    setAddingEmail('');
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
            />
            <button type="submit" className={styles.addButton}>
              Add Subscriber
            </button>
          </form>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {subscribers.length} {subscribers.length === 1 ? 'Subscriber' : 'Subscribers'}
          </h2>

          {subscribers.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No subscribers yet</p>
              <p className={styles.emptyHint}>
                When people subscribe to you, they'll appear here
              </p>
            </div>
          ) : (
            <div className={styles.subscriberList}>
              {subscribers.map((subscriber) => (
                <div key={subscriber.subscriberUsername} className={styles.subscriberCard}>
                  <div className={styles.subscriberInfo}>
                    <div className={styles.subscriberName}>{subscriber.fullName}</div>
                    <div className={styles.subscriberUsername}>@{subscriber.subscriberUsername}</div>
                  </div>
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
          )}
        </div>
      </div>
    </div>
  );
}
