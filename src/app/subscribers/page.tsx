'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateSubscriber, getProfile, addSubscribersByEmail, subscribeToUser, checkExistingSubscribers } from '@/lib/api';
import { useSubscribers, useSubscriptions } from '@/hooks/api';
import { useMutation } from '@/hooks/useMutation';
import { useForm } from '@/hooks/useForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { parseEmailText, type ParsedEmail } from '@/shared/emailParser';
import styles from './subscribers.module.css';

interface Subscriber {
  subscriberUsername: string;
  subscribedToUsername: string;
  isClose: boolean;
  addedBy?: string;
  confirmed?: boolean;
  timestamp?: string;
}

interface SubscriberWithProfile extends Subscriber {
  fullName?: string;
  email?: string;
  hasAccount?: boolean; // Whether they have created a full account
}

function SubscribersPageContent() {
  const { user } = useAuth();

  // Use hooks for data fetching
  const { data: subscribersRaw, loading: subscribersLoading, refetch: refetchSubscribers } = useSubscribers(user?.username || '');
  const { data: subscriptionsRaw, loading: subscriptionsLoading } = useSubscriptions(user?.username || '');

  const [enrichedSubscribers, setEnrichedSubscribers] = useState<SubscriberWithProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]); // Usernames of people this user subscribes to
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');
  const [emailFilter, setEmailFilter] = useState<'all' | 'close' | 'non-close'>('all');

  // Multi-step add subscribers flow
  const [addStep, setAddStep] = useState<'input' | 'confirm'>('input');
  const [emailInput, setEmailInput] = useState('');
  const [emailInputFocused, setEmailInputFocused] = useState(false);
  const [parsedEmails, setParsedEmails] = useState<ParsedEmail[]>([]);
  const [parseErrors, setParseErrors] = useState<Array<{ line: number; text: string; error: string }>>([]);
  const [editableEmails, setEditableEmails] = useState<Array<{ email: string; name: string; exists: boolean; existingName?: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const loading = subscribersLoading || subscriptionsLoading;

  const { mutate: subscribeBack } = useMutation(
    async (subscriberUsername: string) => {
      return await subscribeToUser(subscriberUsername);
    },
    {
      onSuccess: (result) => {
        if (result.error) {
          alert(result.error);
        } else {
          // Update subscriptions list locally
          setSubscriptions(prev => [...prev, result.subscription.subscribedToUsername]);
        }
      },
      onError: (error) => {
        alert(error.message || 'Failed to subscribe');
      },
    }
  );

  // Parse email input in real-time
  useEffect(() => {
    if (!emailInput.trim()) {
      setParsedEmails([]);
      setParseErrors([]);
      return;
    }

    const result = parseEmailText(emailInput);
    setParsedEmails(result.emails);
    setParseErrors(result.errors);
  }, [emailInput]);

  const handleProceedToConfirm = async () => {
    if (parsedEmails.length === 0) {
      alert('Please enter at least one valid email address');
      return;
    }

    if (!user) return;

    setCheckingExisting(true);
    try {
      // Check which emails already exist
      const result = await checkExistingSubscribers(
        user.username,
        parsedEmails.map(e => e.email)
      );

      if (result.error) {
        alert(result.error);
        return;
      }

      // Map the results to include existing status
      const emailsWithExistingStatus = parsedEmails.map(e => {
        const checkResult = result.results?.find(
          (r: any) => r.email.toLowerCase() === e.email.toLowerCase()
        );

        return {
          email: e.email,
          name: e.name || '',
          exists: checkResult?.exists || false,
          existingName: checkResult?.existingName,
        };
      });

      setEditableEmails(emailsWithExistingStatus);
      setAddStep('confirm');
    } catch (error: any) {
      alert(error.message || 'Failed to check existing subscribers');
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleConfirmAdd = async () => {
    if (!user) return;

    // Only add emails that don't already exist
    const emailsToAdd = editableEmails.filter(e => !e.exists);

    if (emailsToAdd.length === 0) {
      alert('All selected emails are already subscribers');
      return;
    }

    setSubmitting(true);
    try {
      const result = await addSubscribersByEmail(
        user.username,
        emailsToAdd.map(e => ({ email: e.email, fullName: e.name }))
      );

      if (result.error) {
        alert(result.error);
      } else {
        // Show summary
        const added = result.added?.length || 0;
        const alreadyExisted = editableEmails.filter(e => e.exists).length;
        let message = `Successfully added ${added} subscriber${added !== 1 ? 's' : ''}`;
        if (alreadyExisted > 0) {
          message += `\n${alreadyExisted} already subscribed (skipped)`;
        }
        alert(message);

        // Reset form
        setEmailInput('');
        setParsedEmails([]);
        setParseErrors([]);
        setEditableEmails([]);
        setAddStep('input');
        refetchSubscribers();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add subscribers');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    setAddStep('input');
    setEditableEmails([]);
  };

  const updateEditableName = (index: number, newName: string) => {
    setEditableEmails(prev => prev.map((e, i) => i === index ? { ...e, name: newName } : e));
  };

  // Enrich subscribers with profile data and extract subscription usernames
  useEffect(() => {
    if (!subscribersRaw || !subscriptionsRaw) return;

    // Extract usernames of people this user subscribes to
    const subscribedToUsernames = subscriptionsRaw.map((sub: any) => sub.subscribedToUsername);
    setSubscriptions(subscribedToUsernames);

    // Enrich with profile data
    const enrichSubscribers = async () => {
      const enriched = await Promise.all(
        subscribersRaw.map(async (subscriber: Subscriber) => {
          // Check if this is a pending subscriber (not yet signed up)
          const isPending = subscriber.subscriberUsername.startsWith('pending-');

          if (isPending) {
            // For pending subscribers, use the data stored in the subscription
            return {
              ...subscriber,
              fullName: (subscriber as any).pendingFullName || 'Pending User',
              email: (subscriber as any).pendingEmail,
              hasAccount: false,
            };
          } else {
            // For real users (or old manually added users with real usernames), fetch their profile
            const profile = await getProfile(subscriber.subscriberUsername);

            // If profile doesn't exist, this might be an old manually added subscriber
            // before we implemented the pending system
            if (!profile) {
              return {
                ...subscriber,
                fullName: subscriber.subscriberUsername,
                email: undefined, // No email available
                hasAccount: false,
              };
            }

            return {
              ...subscriber,
              fullName: profile.fullName || subscriber.subscriberUsername,
              email: profile.email,
              hasAccount: profile.hasAccount !== false,
            };
          }
        })
      );

      setEnrichedSubscribers(enriched);
    };

    enrichSubscribers();
  }, [subscribersRaw, subscriptionsRaw]);

  const handleToggleClose = async (subscriberUsername: string, currentIsClose: boolean) => {
    if (!user) return;

    const result = await updateSubscriber(user.username, subscriberUsername, !currentIsClose);
    if (result.success) {
      setEnrichedSubscribers(enrichedSubscribers.map(s =>
        s.subscriberUsername === subscriberUsername
          ? { ...s, isClose: !currentIsClose }
          : s
      ));
    }
  };

  const handleSubscribeBack = async (subscriberUsername: string) => {
    await subscribeBack(subscriberUsername);
  };

  // Sort and filter subscribers
  const sortedAndFilteredSubscribers = enrichedSubscribers
    .filter(sub => {
      if (emailFilter === 'close') return sub.isClose;
      if (emailFilter === 'non-close') return !sub.isClose;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return (a.fullName || a.subscriberUsername).localeCompare(b.fullName || b.subscriberUsername);
      } else {
        // Sort by timestamp (recent first)
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      }
    });

  // Generate email list text - only include subscribers with valid emails
  const emailListText = sortedAndFilteredSubscribers
    .filter(sub => sub.email) // Only include subscribers with real emails
    .map(sub => {
      const name = sub.fullName || sub.subscriberUsername;
      // Quote names that contain characters other than letters, numbers, spaces, and hyphens
      const needsQuotes = /[^a-zA-Z0-9 -]/.test(name);
      const formattedName = needsQuotes ? `"${name}"` : name;
      return `${formattedName} <${sub.email}>,`;
    })
    .join('\n');

  const handleCopyEmailList = async () => {
    try {
      await navigator.clipboard.writeText(emailListText);
      alert('Email list copied to clipboard!');
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

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
        <h1 className={styles.title}>Your Subscribers</h1>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Subscribers by Email</h2>

          {addStep === 'input' ? (
            <>
              <div className={styles.addEmailInputContainer}>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onFocus={() => setEmailInputFocused(true)}
                  placeholder="email@example.com or Name <email@example.com>"
                  className={`${styles.addEmailTextarea} ${emailInputFocused ? styles.addEmailTextareaExpanded : ''}`}
                  rows={emailInputFocused ? 6 : 1}
                />
                <button
                  onClick={handleProceedToConfirm}
                  className={styles.addButton}
                  disabled={parsedEmails.length === 0 || checkingExisting}
                >
                  {checkingExisting ? 'Checking...' : 'Review and Confirm'}
                </button>
              </div>

              {emailInputFocused && (
                <div className={styles.formatHelp}>
                  <div className={styles.formatHelpTitle}>Supported formats:</div>
                  <ul className={styles.formatHelpList}>
                    <li><code>email@example.com</code> - Name will be auto-generated</li>
                    <li><code>John Doe &lt;email@example.com&gt;</code></li>
                    <li><code>"Doe, John" &lt;email@example.com&gt;</code> - Use quotes for names with commas</li>
                  </ul>
                  <div className={styles.formatHelpNote}>
                    Separate emails with newlines, commas, or semicolons. You can paste directly from email CC/BCC fields.
                  </div>
                  <div className={styles.formatHelpNote}>
                    You'll be able to review and edit names before confirming.
                  </div>
                </div>
              )}

              {parseErrors.length > 0 && (
                <div className={styles.parseErrors}>
                  <div className={styles.parseErrorsTitle}>Errors found:</div>
                  {parseErrors.map((err, i) => (
                    <div key={i} className={styles.parseError}>
                      Line {err.line}: {err.error}
                      <div className={styles.parseErrorText}>{err.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {parsedEmails.length > 0 && (
                <div className={styles.parseSummary}>
                  ✓ {parsedEmails.length} email{parsedEmails.length !== 1 ? 's' : ''} ready to review
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.confirmTitle}>
                Review and confirm subscribers
              </div>

              {editableEmails.filter(e => !e.exists).length > 0 && (
                <>
                  <div className={styles.confirmSectionTitle}>
                    {editableEmails.filter(e => !e.exists).length} new subscriber{editableEmails.filter(e => !e.exists).length !== 1 ? 's' : ''} to add:
                  </div>
                  <div className={styles.confirmList}>
                    {editableEmails.filter(e => !e.exists).map((item, index) => {
                      const actualIndex = editableEmails.indexOf(item);
                      return (
                        <div key={actualIndex} className={styles.confirmItem}>
                          <div className={styles.confirmItemEmail}>{item.email}</div>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateEditableName(actualIndex, e.target.value)}
                            placeholder="Full name"
                            className={styles.confirmItemNameInput}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {editableEmails.filter(e => e.exists).length > 0 && (
                <>
                  <div className={styles.confirmSectionTitleExisting}>
                    {editableEmails.filter(e => e.exists).length} already subscribed (will be skipped):
                  </div>
                  <div className={styles.confirmList}>
                    {editableEmails.filter(e => e.exists).map((item, index) => (
                      <div key={`existing-${index}`} className={styles.confirmItemExisting}>
                        <div className={styles.confirmItemEmail}>{item.email}</div>
                        <div className={styles.confirmItemExistingName}>
                          {item.existingName || item.name}
                        </div>
                        <div className={styles.confirmItemExistingBadge}>Already subscribed</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className={styles.confirmActions}>
                <button
                  onClick={handleCancelConfirm}
                  className={styles.cancelButton}
                  disabled={submitting}
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleConfirmAdd}
                  className={styles.addButton}
                  disabled={submitting || editableEmails.filter(e => !e.exists).length === 0}
                >
                  {submitting ? 'Adding...' : `Add ${editableEmails.filter(e => !e.exists).length} Subscriber${editableEmails.filter(e => !e.exists).length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {enrichedSubscribers.length} {enrichedSubscribers.length === 1 ? 'Subscriber' : 'Subscribers'}
            </h2>
            <div className={styles.controls}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'alphabetical')}
                className={styles.select}
              >
                <option value="recent">Recently Joined</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
              <select
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value as 'all' | 'close' | 'non-close')}
                className={styles.select}
              >
                <option value="all">All Subscribers</option>
                <option value="close">Close Friends</option>
                <option value="non-close">Non-Close Friends</option>
              </select>
            </div>
          </div>

          {enrichedSubscribers.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No subscribers yet</p>
              <p className={styles.emptyHint}>
                When people subscribe to you, they'll appear here
              </p>
            </div>
          ) : (
            <>
              <div className={styles.emailListSection}>
                <h3 className={styles.emailListTitle}>Email List</h3>
                {sortedAndFilteredSubscribers.some(sub => !sub.email) && (
                  <div className={styles.emailWarning}>
                    ⚠️ {sortedAndFilteredSubscribers.filter(sub => !sub.email).length} subscriber(s) missing email addresses (not included in list below)
                  </div>
                )}
                <textarea
                  className={styles.emailListTextarea}
                  value={emailListText}
                  readOnly
                  rows={Math.min(sortedAndFilteredSubscribers.length + 1, 10)}
                />
                <button onClick={handleCopyEmailList} className={styles.copyButton}>
                  Copy to Clipboard
                </button>
              </div>

              <div className={styles.subscriberList}>
                {sortedAndFilteredSubscribers.map((subscriber) => (
                <div key={subscriber.subscriberUsername} className={styles.subscriberCard}>
                  {subscriber.hasAccount ? (
                    <Link href={`/${subscriber.subscriberUsername}`} className={styles.subscriberLink}>
                      <div className={styles.subscriberInfo}>
                        <div className={styles.subscriberName}>{subscriber.fullName}</div>
                        {subscriber.email && (
                          <div className={styles.subscriberEmail}>{subscriber.email}</div>
                        )}
                        {subscriber.addedBy === user?.username && (
                          <div className={styles.subscriberSource}>
                            {subscriber.confirmed === false ? 'Added by you (not confirmed)' : 'Added by you'}
                          </div>
                        )}
                        {subscriber.addedBy === subscriber.subscriberUsername && (
                          <div className={styles.subscriberSource}>
                            They subscribed themselves
                          </div>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className={styles.subscriberInfo}>
                      <div className={styles.subscriberName}>{subscriber.fullName}</div>
                      {subscriber.email ? (
                        <div className={styles.subscriberEmail}>{subscriber.email}</div>
                      ) : (
                        <div className={styles.noAccountNotice}>Email not available</div>
                      )}
                      <div className={styles.noAccountNotice}>No account created yet</div>
                      {subscriber.addedBy === user?.username && (
                        <div className={styles.subscriberSource}>
                          {subscriber.confirmed === false ? 'Added by you (not confirmed)' : 'Added by you'}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={styles.subscriberActions}>
                    {subscriber.hasAccount && !subscriptions.includes(subscriber.subscriberUsername) && (
                      <button
                        onClick={() => handleSubscribeBack(subscriber.subscriberUsername)}
                        className={styles.subscribeBackButton}
                      >
                        Subscribe Back
                      </button>
                    )}
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={subscriber.isClose}
                        onChange={() => handleToggleClose(subscriber.subscriberUsername, subscriber.isClose)}
                        className={styles.checkbox}
                      />
                      <span>Close Friend</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SubscribersPage() {
  return (
    <ProtectedRoute loadingComponent={<div className={styles.loading}>Loading...</div>}>
      <SubscribersPageContent />
    </ProtectedRoute>
  );
}
