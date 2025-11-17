import { useState, useCallback } from 'react';

export interface UseMutationOptions<TResult> {
  onSuccess?: (result: TResult) => void;
  onError?: (error: Error) => void;
}

export interface UseMutationResult<TArgs extends any[], TResult> {
  mutate: (...args: TArgs) => Promise<TResult>;
  loading: boolean;
  error: string | null;
}

/**
 * useMutation<TArgs, TResult>(mutationFn: (...args: TArgs) => Promise<TResult>, options?: UseMutationOptions<TResult>): UseMutationResult<TArgs, TResult>
 *
 * Generic mutation hook for handling async operations that modify data (POST/PUT/DELETE).
 * Manages loading and error states, and provides success/error callbacks.
 *
 * @param mutationFn - Async function that performs the mutation. Can accept any arguments.
 * @param options - Optional callbacks:
 *   - onSuccess: Called when mutation succeeds with the result
 *   - onError: Called when mutation fails with the error
 *
 * @returns Object containing:
 *   - mutate: Function to trigger the mutation (pass any args your mutationFn expects)
 *   - loading: Boolean indicating if the mutation is currently running
 *   - error: Error message string (null if no error)
 *
 * @example
 * ```tsx
 * const { mutate: subscribe, loading } = useMutation(
 *   async (username: string) => await subscribeToUser(username),
 *   {
 *     onSuccess: (result) => {
 *       alert('Subscribed successfully!');
 *       refetchSubscriptions();
 *     },
 *     onError: (error) => {
 *       alert(error.message);
 *     }
 *   }
 * );
 *
 * // In your component:
 * <button onClick={() => subscribe('john')} disabled={loading}>
 *   {loading ? 'Subscribing...' : 'Subscribe'}
 * </button>
 * ```
 *
 * Best practices:
 * - Use this hook for POST/PUT/DELETE operations
 * - For GET/read operations, use useQuery instead
 * - Handle both success and error cases with callbacks
 * - The mutate function re-throws errors, so you can also use try/catch
 */
export function useMutation<TArgs extends any[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
  options?: UseMutationOptions<TResult>
): UseMutationResult<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (...args: TArgs) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn(...args);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      options?.onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, options]);

  return { mutate, loading, error };
}
