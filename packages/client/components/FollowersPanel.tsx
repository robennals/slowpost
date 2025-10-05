import Image from 'next/image';
import styles from './FollowersPanel.module.css';
import type { FollowersView } from '../lib/data';

type FollowersPanelProps = {
  followers: FollowersView;
};

export function FollowersPanel({ followers }: FollowersPanelProps) {
  return (
    <section className={styles.panel}>
      <h1>Follower requests</h1>
      <ul>
        {followers.pendingFollowers.map((follower) => (
          <li key={follower.username}>
            <div className={styles.row}>
              <Image
                src={follower.photoUrl}
                alt={follower.name}
                className={styles.avatar}
                width={52}
                height={52}
              />
              <div>
                <strong>{follower.name}</strong>
                <p>{follower.blurb}</p>
              </div>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.button}>
                Approve
              </button>
              <button type="button" className={`${styles.button} ${styles.secondary}`}>
                View profile
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default FollowersPanel;
