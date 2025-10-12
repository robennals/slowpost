'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowers, updateFollower, getProfile } from '@/lib/api';
import { useRouter } from 'next/navigation';
import styles from './followers.module.css';

interface Follower {
  followerUsername: string;
  followedUsername: string;
  isClose: boolean;
}

interface FollowerWithProfile extends Follower {
  fullName?: string;
}

export default function FollowersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [followers, setFollowers] = useState<FollowerWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingEmail, setAddingEmail] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadFollowers();
  }, [user]);

  const loadFollowers = async () => {
    if (!user) return;

    setLoading(true);
    const data = await getFollowers(user.username);

    // Enrich with profile data
    const enriched = await Promise.all(
      data.map(async (follower: Follower) => {
        const profile = await getProfile(follower.followerUsername);
        return {
          ...follower,
          fullName: profile?.fullName || follower.followerUsername,
        };
      })
    );

    setFollowers(enriched);
    setLoading(false);
  };

  const handleToggleClose = async (followerUsername: string, currentIsClose: boolean) => {
    if (!user) return;

    const result = await updateFollower(user.username, followerUsername, !currentIsClose);
    if (result.success) {
      setFollowers(followers.map(f =>
        f.followerUsername === followerUsername
          ? { ...f, isClose: !currentIsClose }
          : f
      ));
    }
  };

  const handleAddFollower = async (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just show a message - in a real app, we'd send an invitation
    alert('Follower invitation feature coming soon!');
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
        <h1 className={styles.title}>Your Followers</h1>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Follower by Email</h2>
          <form onSubmit={handleAddFollower} className={styles.addForm}>
            <input
              type="email"
              value={addingEmail}
              onChange={(e) => setAddingEmail(e.target.value)}
              placeholder="email@example.com"
              className={styles.input}
            />
            <button type="submit" className={styles.addButton}>
              Add Follower
            </button>
          </form>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {followers.length} {followers.length === 1 ? 'Follower' : 'Followers'}
          </h2>

          {followers.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No followers yet</p>
              <p className={styles.emptyHint}>
                When people follow you, they'll appear here
              </p>
            </div>
          ) : (
            <div className={styles.followerList}>
              {followers.map((follower) => (
                <div key={follower.followerUsername} className={styles.followerCard}>
                  <div className={styles.followerInfo}>
                    <div className={styles.followerName}>{follower.fullName}</div>
                    <div className={styles.followerUsername}>@{follower.followerUsername}</div>
                  </div>
                  <div className={styles.followerActions}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={follower.isClose}
                        onChange={() => handleToggleClose(follower.followerUsername, follower.isClose)}
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
