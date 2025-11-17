import { useState, useEffect, useCallback } from 'react';

export interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * useQuery<T>(queryFn: () => Promise<T | null>, deps?: any[]): UseQueryResult<T>
 *
 * Generic data fetching hook that manages loading, error, and data states.
 *
 * @param queryFn - Async function that fetches the data. Should return a Promise<T | null>.
 * @param deps - Dependency array that triggers refetch when values change (similar to useEffect deps).
 *
 * @returns Object containing:
 *   - data: The fetched data (null if not yet loaded or on error)
 *   - loading: Boolean indicating if the query is currently running
 *   - error: Error message string (null if no error)
 *   - refetch: Function to manually trigger a refetch
 *
 * @example
 * ```tsx
 * const { data: profile, loading, error, refetch } = useQuery(
 *   () => getProfile(username),
 *   [username] // Refetches when username changes
 * );
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * return <div>{profile.name}</div>;
 * ```
 *
 * Best practices:
 * - Use this hook for GET/read operations
 * - For mutations (POST/PUT/DELETE), use useMutation instead
 * - Always include variables used in queryFn in the deps array
 */
export function useQuery<T>(
  queryFn: () => Promise<T | null>,
  deps: any[] = []
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    queryFn()
      .then(setData)
      .catch(err => {
        setError(err.message || 'An error occurred');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
