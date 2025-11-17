'use client';

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUserGroups } from '@/hooks/api';
import { useMutation } from '@/hooks/useMutation';
import { useForm } from '@/hooks/useForm';
import {
  getProfile,
  updateProfile,
  subscribeToUser,
  getSubscribers,
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
  email?: string;
  expectedSendMonth?: string;
  lastSentDate?: string;
  hasAccount?: boolean;
  planToSend?: boolean;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const router = useRouter();
  const { user } = useAuth();

  // Data fetching with hooks
  const { data: profile, loading, refetch: refetchProfile } = useProfile(username);
  const { data: groups } = useUserGroups(username);
  const { data: ownProfile } = useProfile(user?.username || '');

  const [editing, setEditing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [photoEditorImage, setPhotoEditorImage] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  const isOwnProfile = user?.username === username;

  // Form for profile editing
  const profileForm = useForm(
    {
      fullName: profile?.fullName || '',
      bio: profile?.bio || '',
      expectedSendMonth: profile?.expectedSendMonth || '',
      planToSend: profile?.planToSend !== undefined ? profile.planToSend : true,
    },
    async (values) => {
      const result = await updateProfile(username, values);
      if (result.error) {
        alert(result.error);
      } else {
        refetchProfile();
        setEditing(false);
      }
    }
  );

  // Update form values when profile changes
  useEffect(() => {
    if (profile) {
      profileForm.setValues({
        fullName: profile.fullName,
        bio: profile.bio || '',
        expectedSendMonth: profile.expectedSendMonth || '',
        planToSend: profile.planToSend !== undefined ? profile.planToSend : true,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user && !isOwnProfile) {
      checkSubscription();
    }
  }, [user, username]);

  // Mutations
  const { mutate: subscribe, loading: subscribing } = useMutation(
    async () => {
      if (!user) {
        localStorage.setItem('redirectAfterLogin', `/subscribe/${username}`);
        router.push('/login');
        throw new Error('Not authenticated');
      }
      return await subscribeToUser(username);
    },
    {
      onSuccess: (result) => {
        if (result.error) {
          alert(result.error);
        } else {
          setIsSubscribed(true);
        }
      },
      onError: (error) => {
        if (error.message !== 'Not authenticated') {
          alert(error.message || 'Failed to subscribe');
        }
      },
    }
  );

  const { mutate: confirmSub, loading: confirming } = useMutation(
    async () => {
      if (!user) throw new Error('Not authenticated');
      return await confirmSubscription(username, user.username);
    },
    {
      onSuccess: () => {
        checkSubscription();
      },
      onError: (error) => {
        alert(error.message || 'Failed to confirm subscription');
      },
    }
  );

  const { mutate: cancelSub, loading: canceling } = useMutation(
    async () => {
      if (!user) throw new Error('Not authenticated');
      return await unsubscribeFromUser(username, user.username);
    },
    {
      onSuccess: () => {
        setIsSubscribed(false);
        setSubscriptionInfo(null);
      },
      onError: (error) => {
        alert(error.message || 'Failed to cancel subscription');
      },
    }
  );

  const { mutate: unsubscribe, loading: unsubscribing } = useMutation(
    async () => {
      if (!user) throw new Error('Not authenticated');
      const confirmed = window.confirm(`Are you sure you want to unsubscribe from ${profile?.fullName}'s annual letter?`);
      if (!confirmed) throw new Error('Cancelled');
      return await unsubscribeFromUser(username, user.username);
    },
    {
      onSuccess: () => {
        setIsSubscribed(false);
        setSubscriptionInfo(null);
      },
      onError: (error) => {
        if (error.message !== 'Cancelled') {
          alert(error.message || 'Failed to unsubscribe');
        }
      },
    }
  );

  const checkSubscription = async () => {
    if (!user) return;
    const subscribers = await getSubscribers(username);
    const subscription = subscribers.find((s: any) => {
      if (s.subscriberUsername === user.username) return true;
      if (s.subscriberUsername.startsWith('pending-') && s.pendingEmail) {
        return false;
      }
      return false;
    });
    setIsSubscribed(!!subscription);
    setSubscriptionInfo(subscription || null);
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    profileForm.reset();
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
      refetchProfile();
      setPhotoEditorImage(null);
    } catch (error: any) {
      setPhotoUploadError(error.message || 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
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
    if (!user || isOwnProfile || !ownProfile) return false;
    const missingBio = !ownProfile.bio || ownProfile.bio.trim() === '';
    const missingPhoto = !ownProfile.photoUrl;
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
                {profile.bio || `${profile.fullName.split(' ')[0]} hasn't yet said what they'll write about in their annual letter`}
              </p>
              {profile.planToSend === false ? (
                <p className={styles.notPlanning}>
                  Not currently planning to send annual letters
                </p>
              ) : (
                <>
                  {profile.expectedSendMonth && (
                    <p className={styles.expectedMonth}>
                      Plans to send annual letter in {profile.expectedSendMonth}
                    </p>
                  )}
                  {isOwnProfile && !profile.expectedSendMonth && (
                    <p className={styles.missingInfo}>
                      You haven't said when you'll send your annual letter
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className={styles.editForm}>
              <input
                type="text"
                value={profileForm.values.fullName}
                onChange={profileForm.handleChange('fullName')}
                className={styles.input}
                placeholder="Full Name"
              />
              <textarea
                value={profileForm.values.bio}
                onChange={profileForm.handleChange('bio')}
                className={styles.textarea}
                placeholder="What will you write about in your annual letter?"
                rows={4}
              />
              <select
                value={profileForm.values.expectedSendMonth}
                onChange={profileForm.handleChange('expectedSendMonth')}
                className={styles.select}
              >
                <option value="">When do you plan to send your annual letter?</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={profileForm.values.planToSend}
                  onChange={profileForm.handleChange('planToSend')}
                  className={styles.checkbox}
                />
                <span>I plan to send an annual letter</span>
              </label>
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
                  onClick={profileForm.handleSubmit}
                  className={styles.saveButton}
                  disabled={profileForm.submitting}
                >
                  {profileForm.submitting ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className={styles.cancelButton}
                  disabled={profileForm.submitting}
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
                  onClick={() => confirmSub()}
                  className={styles.confirmButton}
                  disabled={confirming || canceling}
                >
                  {confirming ? 'Confirming...' : 'Confirm Subscription'}
                </button>
                <button
                  onClick={() => cancelSub()}
                  className={styles.cancelSubscriptionButton}
                  disabled={confirming || canceling}
                >
                  {canceling ? 'Canceling...' : 'Cancel'}
                </button>
              </div>
            </div>
          ) : profile?.hasAccount === false ? (
            <div className={styles.noAccountMessage}>
              {profile.fullName} has not created an account yet
            </div>
          ) : (
            <div className={styles.subscribeContainer}>
              <button
                onClick={() => subscribe()}
                className={isSubscribed ? styles.subscribedButton : styles.subscribeButton}
                disabled={subscribing || isSubscribed || unsubscribing}
              >
                {subscribing ? 'Subscribing...' : isSubscribed ? 'Subscribed' : 'Subscribe to Annual Letter'}
              </button>
              {(isSubscribed || unsubscribing) && !subscribing && (
                <button
                  onClick={() => unsubscribe()}
                  className={styles.unsubscribeLink}
                  disabled={unsubscribing}
                >
                  {unsubscribing ? 'Unsubscribing...' : 'Unsubscribe'}
                </button>
              )}
            </div>
          )}
        </div>

        {isOwnProfile && (
          <div className={styles.shareWidget}>
            <h2 className={styles.shareWidgetTitle}>Share your profile to collect subscribers</h2>
            <p className={styles.shareWidgetDescription}>
              When people visit your profile, they can subscribe to receive your annual letter by email
            </p>
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
          {groups && groups.length > 0 ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{profile.fullName.split(' ')[0]}'s Groups</h2>
              <div className={styles.groupList}>
                {groups.map((group: any) => (
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
            <h3 className={styles.howItWorksSubtitle}>WRITE ONCE A YEAR, STAY IN TOUCH FOREVER</h3>
            <p className={styles.howItWorksText}>
              Receive one email per year from people you care about. No posting on a platform, no feeds to check – just annual letters sent directly to your inbox.
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
