'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdates } from '@/hooks/api';
import { getProfile, getGroup } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import styles from './updates.module.css';

interface Update {
  id: string;
  type: 'new_subscriber' | 'group_join' | 'group_join_request' | 'group_join_approved';
  username?: string;
  groupName?: string;
  timestamp: string;
}

interface EnrichedUpdate extends Update {
  fullName?: string;
  groupDisplayName?: string;
}

function UpdatesPageContent() {
  const { user } = useAuth();
  const { data: updatesRaw, loading: updatesLoading } = useUpdates(user?.username || '');
  const [enrichedUpdates, setEnrichedUpdates] = useState<EnrichedUpdate[]>([]);

  // Enrich updates with profile and group data
  useEffect(() => {
    if (!updatesRaw) return;

    const enrichUpdates = async () => {
      const enriched = await Promise.all(
        updatesRaw.map(async (update: Update) => {
          const enrichedUpdate: EnrichedUpdate = { ...update };

          if (update.username) {
            const profile = await getProfile(update.username);
            enrichedUpdate.fullName = profile?.fullName || update.username;
          }

          if (update.groupName) {
            const group = await getGroup(update.groupName);
            enrichedUpdate.groupDisplayName = group?.displayName || update.groupName;
          }

          return enrichedUpdate;
        })
      );

      setEnrichedUpdates(enriched);
    };

    enrichUpdates();
  }, [updatesRaw]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (updatesLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Updates</h1>

        {enrichedUpdates.length > 0 ? (
          <div className={styles.updateList}>
            {enrichedUpdates.map((update) => {
              // Determine the link destination based on update type
              let linkHref = '/';
              if (update.type === 'new_subscriber') {
                linkHref = '/subscribers';
              } else if (update.type === 'group_join_request') {
                linkHref = `/g/${update.groupName}`;
              } else if (update.type === 'group_join_approved') {
                linkHref = `/g/${update.groupName}`;
              } else if (update.type === 'group_join') {
                linkHref = `/g/${update.groupName}`;
              }

              return (
                <Link key={update.id} href={linkHref} className={styles.updateCardLink}>
                  <div className={styles.updateCard}>
                    {update.type === 'new_subscriber' && (
                      <>
                        <div className={styles.updateText}>
                          <strong>{update.fullName}</strong> subscribed to you
                        </div>
                        <div className={styles.updateTime}>{formatTime(update.timestamp)}</div>
                      </>
                    )}

                    {update.type === 'group_join' && (
                      <>
                        <div className={styles.updateText}>
                          <strong>{update.fullName}</strong>
                          {' joined '}
                          <strong>{update.groupDisplayName}</strong>
                        </div>
                        <div className={styles.updateTime}>{formatTime(update.timestamp)}</div>
                      </>
                    )}

                    {update.type === 'group_join_request' && (
                      <>
                        <div className={styles.updateText}>
                          <strong>{update.fullName}</strong>
                          {' requested to join '}
                          <strong>{update.groupDisplayName}</strong>
                        </div>
                        <div className={styles.updateTime}>{formatTime(update.timestamp)}</div>
                      </>
                    )}

                    {update.type === 'group_join_approved' && (
                      <>
                        <div className={styles.updateText}>
                          {'You were approved to join '}
                          <strong>{update.groupDisplayName}</strong>
                        </div>
                        <div className={styles.updateTime}>{formatTime(update.timestamp)}</div>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No updates yet</p>
            <p className={styles.emptyHint}>
              Updates will appear here when people subscribe to you or join your groups
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpdatesPage() {
  return (
    <ProtectedRoute loadingComponent={<div className={styles.loading}>Loading...</div>}>
      <UpdatesPageContent />
    </ProtectedRoute>
  );
}
