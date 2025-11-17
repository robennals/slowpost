'use client';

import React from 'react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserGroups } from '@/hooks/api';
import { createGroup } from '@/lib/api';
import { useMutation } from '@/hooks/useMutation';
import { useForm } from '@/hooks/useForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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

function GroupsPageContent() {
  const { user } = useAuth();
  const { data: groups, loading, refetch: refetchGroups } = useUserGroups(user?.username || '');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const createGroupForm = useForm(
    {
      groupName: '',
      displayName: '',
      description: '',
      isPublic: true,
    },
    async (values) => {
      const result = await createGroup(
        values.groupName,
        values.displayName,
        values.description,
        values.isPublic
      );

      if (result.error) {
        alert(result.error);
      } else {
        setShowCreateForm(false);
        createGroupForm.reset();
        refetchGroups();
      }
    }
  );

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
            <form onSubmit={createGroupForm.handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Group Name (URL slug)</label>
                <input
                  type="text"
                  value={createGroupForm.values.groupName}
                  onChange={createGroupForm.handleChange('groupName')}
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
                  value={createGroupForm.values.displayName}
                  onChange={createGroupForm.handleChange('displayName')}
                  placeholder="My Awesome Group"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  value={createGroupForm.values.description}
                  onChange={createGroupForm.handleChange('description')}
                  placeholder="What is this group about?"
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={createGroupForm.values.isPublic}
                    onChange={createGroupForm.handleChange('isPublic')}
                    className={styles.checkbox}
                  />
                  <span>Public group (visible to everyone)</span>
                </label>
              </div>

              <button type="submit" className={styles.submitButton} disabled={createGroupForm.submitting}>
                {createGroupForm.submitting ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {groups?.length || 0} {groups?.length === 1 ? 'Group' : 'Groups'}
          </h2>

          {!groups || groups.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No groups yet</p>
              <p className={styles.emptyHint}>
                Create a group or join one to get started
              </p>
            </div>
          ) : (
            <div className={styles.groupList}>
              {groups.map((group: Group) => (
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

export default function GroupsPage() {
  return (
    <ProtectedRoute loadingComponent={<div className={styles.loading}>Loading...</div>}>
      <GroupsPageContent />
    </ProtectedRoute>
  );
}
