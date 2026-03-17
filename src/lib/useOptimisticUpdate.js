/**
 * useOptimisticUpdate — React hook for optimistic updates with rollback
 * Only use for small, idempotent operations with server-side idempotency guarantees
 */
import { useState } from 'react';
import { showSuccessToast, showErrorToast } from './errorToast';

export function useOptimisticUpdate(initialData) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (optimisticData, mutation, options = {}) => {
    const previousData = data;
    
    try {
      // Apply optimistic update
      setData(optimisticData);
      setIsLoading(true);
      setError(null);

      // Execute mutation
      const result = await mutation();

      // Update with server response
      setData(result || optimisticData);

      if (options.successMessage) {
        showSuccessToast(options.successMessage);
      }

      return result;
    } catch (err) {
      // Rollback on failure
      setData(previousData);
      setError(err);

      showErrorToast(err, {
        context: options.context || 'optimistic_update',
        ...options,
      });

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { data, setData, isLoading, error, execute };
}