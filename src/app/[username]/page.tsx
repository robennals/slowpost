'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getProfile,
  updateProfile,
  subscribeToUser,
  getSubscribers,
  getUserGroups,
  confirmSubscription,
  unsubscribeFromUser,
  uploadProfilePhoto,
} from '@/lib/api';
import { ProfilePhotoEditor } from '@/components/ProfilePhotoEditor';
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
  const username = params?.username as string;
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
  const [photoEditorImage, setPhotoEditorImage] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [ownProfile, setOwnProfile] = useState<any>(null);
  const [ownProfileLoaded, setOwnProfileLoaded] = useState(false);

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

  useEffect(() => {
    if (user && !isOwnProfile && !ownProfileLoaded) {
      loadOwnProfile();
    }
  }, [user, isOwnProfile, ownProfileLoaded]);

  const loadOwnProfile = async () => {
    if (!user) return;
    const data = await getProfile(user.username);
    setOwnProfile(data);
    setOwnProfileLoaded(true);
  };

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

  const handleSelectPhoto = () => {
    if (!isOwnProfile || photoUploading) return;
    setPhotoUploadError(null);
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoUploadError('Please choose an image file.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoEditorImage(reader.result as string);
    };
    reader.onerror = () => {
      setPhotoUploadError('Failed to read the selected file.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCancelPhotoEdit = () => {
    setPhotoEditorImage(null);
    setPhotoUploadError(null);
  };

  const handleSavePhoto = async ({ dataUrl }: { dataUrl: string; mimeType: string }) => {
    if (!profile) return;
    setPhotoUploading(true);
    setPhotoUploadError(null);
    try {
      const result = await uploadProfilePhoto(dataUrl);
      if (result?.error) {
        throw new Error(result.error);
      }
      if (result?.profile) {
        setProfile(result.profile);
        setEditedBio(result.profile.bio || '');
        setEditedFullName(result.profile.fullName);
      } else if (result?.photoUrl) {
        setProfile((prev) => (prev ? { ...prev, photoUrl: result.photoUrl } : prev));
      }
      setPhotoEditorImage(null);
    } catch (error: any) {
      setPhotoUploadError(error.message || 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
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

  const handleCopyUrl = async () => {
    const profileUrl = `https://slowpost.org/${username}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = profileUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const shouldShowSetupPrompt = () => {
    if (!user || isOwnProfile || !ownProfileLoaded) return false;
    const missingBio = !ownProfile?.bio || ownProfile.bio.trim() === '';
    const missingPhoto = !ownProfile?.photoUrl;
    return missingBio || missingPhoto;
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
            <div className={styles.avatarContainer}>
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.fullName} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {profile.fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isOwnProfile ? (
              <div className={styles.avatarActions}>
                <button
                  type="button"
                  onClick={handleSelectPhoto}
                  className={styles.changePhotoButton}
                  disabled={photoUploading}
                >
                  {photoUploading ? 'Uploading…' : profile.photoUrl ? 'Change photo' : 'Add photo'}
                </button>
                {photoUploadError && !photoEditorImage ? (
                  <div className={styles.photoError}>{photoUploadError}</div>
                ) : null}
              </div>
            ) : null}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handlePhotoFileChange}
              className={styles.fileInput}
            />
          </div>

          {!editing ? (
            <div className={styles.info}>
              <h1 className={styles.name}>{profile.fullName}</h1>
              <div className={styles.username}>@{profile.username}</div>
              <p className={styles.bio}>
                {profile.bio || `${profile.fullName.split(' ')[0]} hasn't yet said what they will write about`}
              </p>
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
                placeholder="What will you write about in your annual posts?"
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

        {isOwnProfile && (
          <div className={styles.shareWidget}>
            <h2 className={styles.shareWidgetTitle}>Share your profile</h2>
            <div className={styles.shareUrlContainer}>
              <div className={styles.shareUrl} onClick={handleCopyUrl}>
                https://slowpost.org/{username}
              </div>
              <button
                onClick={handleCopyUrl}
                className={styles.copyButton}
                disabled={urlCopied}
              >
                {urlCopied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>
        )}

        <div className={styles.sections}>
          {groups.length > 0 ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{profile.fullName.split(' ')[0]}'s Groups</h2>
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
              <h2 className={styles.sectionTitle}>{profile.fullName.split(' ')[0]}'s Groups</h2>
              <div className={styles.emptyState}>No groups yet</div>
            </div>
          )}
        </div>

        {shouldShowSetupPrompt() && (
          <div className={styles.setupPrompt}>
            <h3 className={styles.setupPromptTitle}>Want your own annual letter?</h3>
            <p className={styles.setupPromptMessage}>Set up your profile to start collecting subscribers</p>
            <div className={styles.setupPromptActions}>
              <Link href="/me" className={styles.setupPromptButton}>
                Set up your profile
              </Link>
              <a href="/pages/how-it-works.html" className={styles.setupPromptHelp}>
                Learn more
              </a>
            </div>
          </div>
        )}

        {!user && (
          <div className={styles.howItWorks}>
            <h2 className={styles.howItWorksTitle}>HOW SLOWPOST WORKS</h2>
            <h3 className={styles.howItWorksSubtitle}>POST ONCE A YEAR, STAY IN TOUCH FOREVER</h3>
            <p className={styles.howItWorksText}>
              Receive one update per year. That's it. No endless feeds, no infinite scrolling – just a single post to stay connected with those you care about.
            </p>
            <div className={styles.howItWorksLinks}>
              <a href="/pages/how-it-works.html" className={styles.howItWorksLink}>Learn more</a>
              <span className={styles.linkSeparator}>·</span>
              <a href="/pages/why-slowpost.html" className={styles.howItWorksLink}>Why Slowpost?</a>
              <span className={styles.linkSeparator}>·</span>
              <a href="/pages/about.html" className={styles.howItWorksLink}>About</a>
            </div>
          </div>
        )}
      </div>
      {photoEditorImage ? (
        <ProfilePhotoEditor
          imageSrc={photoEditorImage}
          onCancel={handleCancelPhotoEdit}
          onSave={handleSavePhoto}
          saving={photoUploading}
          errorMessage={photoUploadError}
        />
      ) : null}
    </div>
  );
}
