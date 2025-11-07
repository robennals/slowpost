'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getGroup, joinGroup, getProfile, updateMemberStatus, toggleMemberAdmin } from '@/lib/api';
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
  status: 'pending' | 'approved';
  isAdmin: boolean;
  timestamp?: string;
}

interface MemberWithProfile extends Member {
  fullName?: string;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupName = params?.groupName as string;
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [groupBio, setGroupBio] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');

  const userMembership = members.find(m => m.username === user?.username);
  const isMember = !!userMembership && (userMembership.status === 'approved' || !userMembership.status); // Treat members without status as approved
  const isPending = !!userMembership && userMembership.status === 'pending';
  const isAdmin = userMembership?.isAdmin && (userMembership.status === 'approved' || !userMembership.status);

  const approvedMembers = members
    .filter(m => m.status === 'approved' || !m.status) // Treat members without status as approved for backward compatibility
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return (a.fullName || a.username).localeCompare(b.fullName || b.username);
      } else {
        // Sort by timestamp (recent first)
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      }
    });
  const pendingMembers = members.filter(m => m.status === 'pending');

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

  const handleApproveMember = async (username: string) => {
    try {
      await updateMemberStatus(groupName, username, 'approved');
      await loadGroup();
    } catch (error: any) {
      alert(error.message || 'Failed to approve member');
    }
  };

  const handleToggleAdmin = async (username: string, currentIsAdmin: boolean) => {
    try {
      await toggleMemberAdmin(groupName, username, !currentIsAdmin);
      await loadGroup();
    } catch (error: any) {
      alert(error.message || 'Failed to toggle admin status');
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

        {!isMember && !isPending && (
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
                {joining ? 'Requesting...' : 'Request to Join'}
              </button>
            </form>
          </div>
        )}

        {isPending && (
          <div className={styles.pendingNotice}>
            Your request to join this group is pending approval from an admin.
          </div>
        )}

        {isAdmin && pendingMembers.length > 0 && (
          <div className={styles.pendingSection}>
            <h2 className={styles.sectionTitle}>
              Pending Members ({pendingMembers.length})
            </h2>
            <div className={styles.memberList}>
              {pendingMembers.map((member) => (
                <div key={member.username} className={styles.pendingMemberCard}>
                  <div className={styles.memberInfo}>
                    <Link href={`/${member.username}`} className={styles.memberLink}>
                      <div className={styles.memberName}>{member.fullName}</div>
                      <div className={styles.memberUsername}>@{member.username}</div>
                    </Link>
                    {member.groupBio && (
                      <div className={styles.memberBio}>{member.groupBio}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleApproveMember(member.username)}
                    className={styles.approveButton}
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.membersSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Members ({approvedMembers.length})
            </h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'alphabetical')}
              className={styles.select}
            >
              <option value="recent">Recently Joined</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>

          <div className={styles.memberList}>
            {approvedMembers.map((member) => (
              <div key={member.username} className={styles.memberCard}>
                <Link href={`/${member.username}`} className={styles.memberLink}>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>
                      {member.fullName}
                      {member.isAdmin && <span className={styles.adminBadge}>Admin</span>}
                    </div>
                    <div className={styles.memberUsername}>@{member.username}</div>
                  </div>
                  {member.groupBio && (
                    <div className={styles.memberBio}>{member.groupBio}</div>
                  )}
                </Link>
                {isAdmin && member.username !== user?.username && (
                  <button
                    onClick={() => handleToggleAdmin(member.username, member.isAdmin)}
                    className={styles.adminToggle}
                  >
                    {member.isAdmin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {!user && (
          <div className={styles.howItWorks}>
            <h2 className={styles.howItWorksTitle}>HOW SLOWPOST WORKS</h2>
            <h3 className={styles.howItWorksSubtitle}>POST ONCE A YEAR, STAY IN TOUCH FOREVER</h3>
            <p className={styles.howItWorksText}>
              Groups on Slowpost allow you to share your annual posts with specific communities. Each member writes once a year, creating a meaningful tradition that keeps you connected.
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
    </div>
  );
}
