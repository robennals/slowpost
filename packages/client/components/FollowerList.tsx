import { useState } from 'react';
import styles from './FollowerList.module.css';
import type { HomeFollower } from '../lib/data';

type FollowerListProps = {
  followers: HomeFollower[];
};

export function FollowerList({ followers }: FollowerListProps) {
  const [showCloseFriends, setShowCloseFriends] = useState(false);
  const visibleFollowers = showCloseFriends
    ? followers.filter((follower) => follower.isCloseFriend)
    : followers;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Followers</h2>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showCloseFriends}
            onChange={(event) => setShowCloseFriends(event.target.checked)}
          />
          Close friends only
        </label>
      </div>
      <ul className={styles.list}>
        {visibleFollowers.map((follower) => (
          <li key={follower.username} className={styles.item}>
            <img src={follower.photoUrl} alt={follower.name} className={styles.avatar} />
            <div>
              <strong>{follower.name}</strong>
              <p>{follower.blurb}</p>
            </div>
          </li>
        ))}
      </ul>
      <textarea
        className={styles.exportBox}
        readOnly
        value={followers
          .filter((follower) => follower.isCloseFriend)
          .map((follower) => `${follower.name} <${follower.username}@slowpost.org>`)
          .join(', ')}
      />
    </section>
  );
}

export default FollowerList;
