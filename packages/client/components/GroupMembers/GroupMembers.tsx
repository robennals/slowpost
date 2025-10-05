import styles from './GroupMembers.module.css';
import type { Group } from '../../lib/data';

type GroupMembersProps = {
  group: Group;
};

export function GroupMembers({ group }: GroupMembersProps) {
  return (
    <section className={styles.container}>
      <header>
        <h1>{group.name}</h1>
        <p className={styles.meta}>
          {group.isPrivate ? 'Private group • invitation only' : 'Public group'}
        </p>
        <p>{group.description}</p>
      </header>
      <ul className={styles.members}>
        {group.members.map((member) => (
          <li key={member}>{member}</li>
        ))}
      </ul>
      <button type="button" className={styles.joinButton}>
        Request to join
      </button>
    </section>
  );
}

export default GroupMembers;
