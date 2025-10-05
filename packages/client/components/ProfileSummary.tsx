import styles from './ProfileSummary.module.css';
import type { Profile } from '../lib/data';

export type ProfileSummaryProps = {
  profile: Profile;
};

export function ProfileSummary({ profile }: ProfileSummaryProps) {
  return (
    <section className={styles.profile}>
      <div className={styles.header}>
        <img src={profile.photoUrl} alt={profile.name} className={styles.avatar} />
        <div>
          <h1>{profile.name}</h1>
          <p className={styles.username}>@{profile.username}</p>
          <p>{profile.blurb}</p>
        </div>
      </div>
      <div className={styles.groups}>
        <div>
          <h2>Public groups</h2>
          <ul>
            {profile.publicGroups.map((group) => (
              <li key={group}>{group}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Private groups you share</h2>
          {profile.sharedPrivateGroups.length > 0 ? (
            <ul>
              {profile.sharedPrivateGroups.map((group) => (
                <li key={group}>{group}</li>
              ))}
            </ul>
          ) : (
            <p>No shared private groups yet.</p>
          )}
        </div>
      </div>
      <div className={styles.actions}>
        {profile.isSelf ? (
          <button type="button" className={styles.primaryButton}>
            Edit profile
          </button>
        ) : (
          <button type="button" className={styles.primaryButton}>
            {profile.isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </section>
  );
}

export default ProfileSummary;
