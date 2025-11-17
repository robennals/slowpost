import { useState, useCallback } from 'react';

export interface UseFormResult<T extends Record<string, any>> {
  values: T;
  handleChange: (field: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  handleSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  setValues: React.Dispatch<React.SetStateAction<T>>;
  reset: () => void;
}

/**
 * useForm<T>(initialValues: T, onSubmit: (values: T) => void | Promise<void>): UseFormResult<T>
 *
 * Generic form state management hook that handles form values, changes, and submission.
 * Automatically handles text inputs, textareas, selects, and checkboxes.
 *
 * @param initialValues - Object containing initial form field values
 * @param onSubmit - Async function called when form is submitted with current form values
 *
 * @returns Object containing:
 *   - values: Current form field values
 *   - handleChange: Function that returns a change handler for a specific field
 *   - handleSubmit: Form submission handler (prevents default and manages submitting state)
 *   - submitting: Boolean indicating if form is currently submitting
 *   - setValues: Function to manually update form values
 *   - reset: Function to reset form to initial values
 *
 * @example
 * ```tsx
 * const form = useForm(
 *   { email: '', fullName: '', subscribe: false },
 *   async (values) => {
 *     const result = await createUser(values);
 *     if (result.error) {
 *       alert(result.error);
 *     } else {
 *       form.reset();
 *     }
 *   }
 * );
 *
 * return (
 *   <form onSubmit={form.handleSubmit}>
 *     <input
 *       type="email"
 *       value={form.values.email}
 *       onChange={form.handleChange('email')}
 *     />
 *     <input
 *       type="text"
 *       value={form.values.fullName}
 *       onChange={form.handleChange('fullName')}
 *     />
 *     <input
 *       type="checkbox"
 *       checked={form.values.subscribe}
 *       onChange={form.handleChange('subscribe')}
 *     />
 *     <button type="submit" disabled={form.submitting}>
 *       {form.submitting ? 'Submitting...' : 'Submit'}
 *     </button>
 *   </form>
 * );
 * ```
 *
 * Best practices:
 * - Use this hook for any form with multiple fields
 * - handleChange automatically detects input type (checkbox vs text)
 * - Call form.reset() after successful submission to clear the form
 * - Use setValues to programmatically update form fields
 */
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => void | Promise<void>
): UseFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((field: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;

    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }, [values, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  return { values, handleChange, handleSubmit, submitting, setValues, reset };
}
