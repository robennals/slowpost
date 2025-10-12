'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getGroup, joinGroup, getProfile } from '@/lib/api';
import Link from 'next/link';
import styles from './group.module.css';

interface Group {
  groupName: string;
  displayName: string;
  description: string;
  adminUsername: string;
  isPublic: boolean;
  members: Member[];
}

interface Member {
  groupName: string;
  username: string;
  groupBio: string;
}

interface MemberWithProfile extends Member {
  fullName?: string;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupName = params.groupName as string;
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [groupBio, setGroupBio] = useState('');

  const isMember = members.some(m => m.username === user?.username);
  const isAdmin = group?.adminUsername === user?.username;

  useEffect(() => {
    loadGroup();
  }, [groupName]);

  const loadGroup = async () => {
    setLoading(true);
    const data = await getGroup(groupName);
    if (data) {
      setGroup(data);

      // Enrich members with profile data
      const enriched = await Promise.all(
        data.members.map(async (member: Member) => {
          const profile = await getProfile(member.username);
          return {
            ...member,
            fullName: profile?.fullName || member.username,
          };
        })
      );

      setMembers(enriched);
    }
    setLoading(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    setJoining(true);
    try {
      const result = await joinGroup(groupName, groupBio);
      if (result.error) {
        alert(result.error);
      } else {
        await loadGroup();
        setGroupBio('');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Group not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{group.displayName}</h1>
            <div className={styles.meta}>
              <span className={styles.badge}>
                {group.isPublic ? 'Public' : 'Private'}
              </span>
              <span className={styles.admin}>
                Admin: <Link href={`/${group.adminUsername}`}>@{group.adminUsername}</Link>
              </span>
            </div>
          </div>
        </div>

        {group.description && (
          <div className={styles.description}>{group.description}</div>
        )}

        {!isMember && (
          <div className={styles.joinSection}>
            <h2 className={styles.sectionTitle}>Join this Group</h2>
            <form onSubmit={handleJoin} className={styles.joinForm}>
              <input
                type="text"
                value={groupBio}
                onChange={(e) => setGroupBio(e.target.value)}
                placeholder="Your role in this group (optional)"
                className={styles.input}
              />
              <button type="submit" className={styles.joinButton} disabled={joining}>
                {joining ? 'Joining...' : 'Join Group'}
              </button>
            </form>
          </div>
        )}

        <div className={styles.membersSection}>
          <h2 className={styles.sectionTitle}>
            Members ({members.length})
          </h2>

          <div className={styles.memberList}>
            {members.map((member) => (
              <Link
                key={member.username}
                href={`/${member.username}`}
                className={styles.memberCard}
              >
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{member.fullName}</div>
                  <div className={styles.memberUsername}>@{member.username}</div>
                </div>
                {member.groupBio && (
                  <div className={styles.memberBio}>{member.groupBio}</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
