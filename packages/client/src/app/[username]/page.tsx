'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile, subscribeToUser, getSubscribers, getUserGroups, confirmSubscription, unsubscribeFromUser } from '@/lib/api';
import styles from './profile.module.css';

interface Profile {
  username: string;
  fullName: string;
  bio: string;
  photoUrl?: string;
  hasAccount?: boolean;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [editedFullName, setEditedFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    loadProfile();
    loadGroups();
  }, [username]);

  useEffect(() => {
    if (user && !isOwnProfile) {
      checkSubscription();
    }
  }, [user, username]);

  const loadGroups = async () => {
    const data = await getUserGroups(username);
    setGroups(data || []);
  };

  const loadProfile = async () => {
    setLoading(true);
    const data = await getProfile(username);
    if (data) {
      setProfile(data);
      setEditedBio(data.bio || '');
      setEditedFullName(data.fullName);
    }
    setLoading(false);
  };

  const checkSubscription = async () => {
    if (!user) return;
    const subscribers = await getSubscribers(username);
    const subscription = subscribers.find((s: any) => s.subscriberUsername === user.username);
    setIsSubscribed(!!subscription);
    setSubscriptionInfo(subscription || null);
  };

  const handleSubscribe = async () => {
    if (!user) {
      // Save redirect URL and send to login
      localStorage.setItem('redirectAfterLogin', `/subscribe/${username}`);
      router.push('/login');
      return;
    }

    setSubscribing(true);
    try {
      const result = await subscribeToUser(username);
      if (result.error) {
        alert(result.error);
      } else {
        setIsSubscribed(true);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    if (profile) {
      setEditedBio(profile.bio || '');
      setEditedFullName(profile.fullName);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateProfile(username, {
        fullName: editedFullName,
        bio: editedBio,
      });

      if (result.error) {
        alert(result.error);
      } else {
        setProfile(result);
        setEditing(false);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSubscription = async () => {
    if (!user) return;
    setSubscribing(true);
    try {
      await confirmSubscription(username, user.username);
      await checkSubscription();
    } catch (error: any) {
      alert(error.message || 'Failed to confirm subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    setSubscribing(true);
    try {
      await unsubscribeFromUser(username, user.username);
      setIsSubscribed(false);
      setSubscriptionInfo(null);
    } catch (error: any) {
      alert(error.message || 'Failed to cancel subscription');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Profile not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.fullName} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {!editing ? (
            <div className={styles.info}>
              <h1 className={styles.name}>{profile.fullName}</h1>
              <div className={styles.username}>@{profile.username}</div>
              <p className={styles.bio}>{profile.bio || 'No bio yet'}</p>
            </div>
          ) : (
            <div className={styles.editForm}>
              <input
                type="text"
                value={editedFullName}
                onChange={(e) => setEditedFullName(e.target.value)}
                className={styles.input}
                placeholder="Full Name"
              />
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className={styles.textarea}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {isOwnProfile ? (
            !editing ? (
              <button onClick={handleEdit} className={styles.editButton}>
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className={styles.saveButton}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className={styles.cancelButton}
                  disabled={saving}
                >
                  Cancel
                </button>
              </>
            )
          ) : subscriptionInfo && subscriptionInfo.addedBy === username && !subscriptionInfo.confirmed ? (
            <div className={styles.subscriptionConfirm}>
              <p className={styles.confirmMessage}>
                {profile?.fullName} added you as a subscriber
              </p>
              <div className={styles.confirmActions}>
                <button
                  onClick={handleConfirmSubscription}
                  className={styles.confirmButton}
                  disabled={subscribing}
                >
                  {subscribing ? 'Confirming...' : 'Confirm Subscription'}
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className={styles.cancelSubscriptionButton}
                  disabled={subscribing}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : profile?.hasAccount === false ? (
            <div className={styles.noAccountMessage}>
              {profile.fullName} has not created an account yet
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              className={isSubscribed ? styles.subscribedButton : styles.subscribeButton}
              disabled={subscribing || isSubscribed}
            >
              {subscribing ? 'Subscribing...' : isSubscribed ? 'Subscribed' : 'Subscribe to Annual Post'}
            </button>
          )}
        </div>

        <div className={styles.sections}>
          {groups.length > 0 ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Groups</h2>
              <div className={styles.groupList}>
                {groups.map((group) => (
                  <Link
                    key={group.groupName}
                    href={`/g/${group.groupName}`}
                    className={styles.groupCard}
                  >
                    <div className={styles.groupHeader}>
                      <div className={styles.groupName}>{group.displayName}</div>
                      <span className={styles.groupBadge}>
                        {group.memberStatus === 'pending' ? 'Pending' : group.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                    {group.memberBio && (
                      <div className={styles.groupMemberBio}>{group.memberBio}</div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Groups</h2>
              <div className={styles.emptyState}>No groups yet</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
