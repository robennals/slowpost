/**
 * API-specific hooks that wrap useQuery for common data fetching operations.
 * These hooks provide a simple, one-line interface for fetching data with
 * automatic loading states, error handling, and refetch capabilities.
 *
 * All hooks automatically refetch when their parameters change.
 */

import { useQuery } from './useQuery';
import {
  getProfile,
  getSubscribers,
  getSubscriptions,
  getUserGroups,
  getGroup,
  getUpdates,
} from '@/lib/api';

/**
 * useProfile(username: string): UseQueryResult<Profile>
 *
 * Fetches a user's profile by username.
 * Automatically refetches when username changes.
 *
 * @example
 * const { data: profile, loading, refetch } = useProfile('johndoe');
 */
export function useProfile(username: string) {
  return useQuery(() => getProfile(username), [username]);
}

/**
 * useSubscribers(username: string): UseQueryResult<Subscriber[]>
 *
 * Fetches the list of subscribers for a given user.
 * Automatically refetches when username changes.
 *
 * @example
 * const { data: subscribers, loading } = useSubscribers(user.username);
 */
export function useSubscribers(username: string) {
  return useQuery(() => getSubscribers(username), [username]);
}

/**
 * useSubscriptions(username: string): UseQueryResult<Subscription[]>
 *
 * Fetches the list of users that a given user subscribes to.
 * Automatically refetches when username changes.
 *
 * @example
 * const { data: subscriptions, loading } = useSubscriptions(user.username);
 */
export function useSubscriptions(username: string) {
  return useQuery(() => getSubscriptions(username), [username]);
}

/**
 * useUserGroups(username: string): UseQueryResult<Group[]>
 *
 * Fetches all groups that a user is a member of.
 * Automatically refetches when username changes.
 *
 * @example
 * const { data: groups, loading, refetch } = useUserGroups(username);
 */
export function useUserGroups(username: string) {
  return useQuery(() => getUserGroups(username), [username]);
}

/**
 * useGroup(groupName: string): UseQueryResult<Group>
 *
 * Fetches details for a specific group by group name.
 * Automatically refetches when groupName changes.
 *
 * @example
 * const { data: group, loading } = useGroup('book-club');
 */
export function useGroup(groupName: string) {
  return useQuery(() => getGroup(groupName), [groupName]);
}

/**
 * useUpdates(username: string): UseQueryResult<Update[]>
 *
 * Fetches the latest updates/notifications for a user.
 * Automatically refetches when username changes.
 *
 * @example
 * const { data: updates, loading } = useUpdates(user.username);
 */
export function useUpdates(username: string) {
  return useQuery(() => getUpdates(username), [username]);
}
