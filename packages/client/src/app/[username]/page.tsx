'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/lib/api';
import styles from './profile.module.css';

interface Profile {
  username: string;
  fullName: string;
  bio: string;
  photoUrl?: string;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [editedFullName, setEditedFullName] = useState('');
  const [saving, setSaving] = useState(false);

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    loadProfile();
  }, [username]);

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

        {isOwnProfile && (
          <div className={styles.actions}>
            {!editing ? (
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
            )}
          </div>
        )}

        <div className={styles.sections}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Public Groups</h2>
            <div className={styles.emptyState}>No public groups yet</div>
          </div>

          {isOwnProfile && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Private Groups</h2>
              <div className={styles.emptyState}>No private groups yet</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
