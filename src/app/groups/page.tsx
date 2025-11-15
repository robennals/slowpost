'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGroups, createGroup } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './groups.module.css';

interface Group {
  groupName: string;
  displayName: string;
  description: string;
  adminUsername: string;
  isPublic: boolean;
  memberBio?: string;
}

export default function GroupsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroup, setNewGroup] = useState({
    groupName: '',
    displayName: '',
    description: '',
    isPublic: true,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;

    setLoading(true);
    const data = await getUserGroups(user.username);
    setGroups(data);
    setLoading(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const result = await createGroup(
        newGroup.groupName,
        newGroup.displayName,
        newGroup.description,
        newGroup.isPublic
      );

      if (result.error) {
        alert(result.error);
      } else {
        setShowCreateForm(false);
        setNewGroup({ groupName: '', displayName: '', description: '', isPublic: true });
        await loadGroups();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your Groups</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={styles.createButton}
          >
            {showCreateForm ? 'Cancel' : 'Create Group'}
          </button>
        </div>

        <p className={styles.explanation}>
          Groups help you discover people you know and subscribe to their annual letters. Browse members' profiles and subscribe to stay connected—groups aren't for posting, just for finding people.
        </p>

        {showCreateForm && (
          <div className={styles.createForm}>
            <h2 className={styles.formTitle}>Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Group Name (URL slug)</label>
                <input
                  type="text"
                  value={newGroup.groupName}
                  onChange={(e) => setNewGroup({ ...newGroup, groupName: e.target.value })}
                  placeholder="my-awesome-group"
                  className={styles.input}
                  required
                />
                <span className={styles.hint}>Lowercase, no spaces (e.g., book-club)</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Display Name</label>
                <input
                  type="text"
                  value={newGroup.displayName}
                  onChange={(e) => setNewGroup({ ...newGroup, displayName: e.target.value })}
                  placeholder="My Awesome Group"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="What is this group about?"
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newGroup.isPublic}
                    onChange={(e) => setNewGroup({ ...newGroup, isPublic: e.target.checked })}
                    className={styles.checkbox}
                  />
                  <span>Public group (visible to everyone)</span>
                </label>
              </div>

              <button type="submit" className={styles.submitButton} disabled={creating}>
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
          </h2>

          {groups.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No groups yet</p>
              <p className={styles.emptyHint}>
                Create a group or join one to get started
              </p>
            </div>
          ) : (
            <div className={styles.groupList}>
              {groups.map((group) => (
                <Link
                  key={group.groupName}
                  href={`/g/${group.groupName}`}
                  className={styles.groupCard}
                >
                  <div className={styles.groupHeader}>
                    <div className={styles.groupName}>{group.displayName}</div>
                    <div className={styles.groupBadge}>
                      {group.isPublic ? 'Public' : 'Private'}
                    </div>
                  </div>
                  <div className={styles.groupDescription}>{group.description}</div>
                  {group.memberBio && (
                    <div className={styles.memberBio}>Your role: {group.memberBio}</div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
