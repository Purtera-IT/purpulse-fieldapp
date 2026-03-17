/**
 * errorToast — Consistent error/success feedback via sonner
 * Provides friendly, actionable messages for API operations
 */
import { toast } from 'sonner';
import { reportNetworkError } from './errorReporter';

const ERROR_MESSAGES = {
  network: 'Network connection lost. Check your internet and try again.',
  timeout: 'Request timed out. Please try again.',
  unauthorized: 'Your session expired. Please log in again.',
  forbidden: 'You don\'t have permission for this action.',
  notfound: 'The resource was not found.',
  validation: 'Please check your input and try again.',
  server: 'Server error. Our team has been notified.',
  unknown: 'Something went wrong. Please try again.',
};

/**
 * getErrorMessage — Map error to friendly message
 */
export function getErrorMessage(error) {
  if (!error) return ERROR_MESSAGES.unknown;

  const status = error.response?.status;
  const message = error.response?.data?.message || error.message;

  if (!error.response) return ERROR_MESSAGES.network;
  if (status === 401) return ERROR_MESSAGES.unauthorized;
  if (status === 403) return ERROR_MESSAGES.forbidden;
  if (status === 404) return ERROR_MESSAGES.notfound;
  if (status === 422 || status === 400) return ERROR_MESSAGES.validation;
  if (status >= 500) return ERROR_MESSAGES.server;

  return message || ERROR_MESSAGES.unknown;
}

/**
 * showErrorToast — Show error with optional retry
 */
export function showErrorToast(error, options = {}) {
  const {
    message = getErrorMessage(error),
    duration = 4000,
    action = null,
    context = 'api_call',
  } = options;

  // Report to APM
  if (error) {
    reportNetworkError({
      error,
      method: options.method || 'UNKNOWN',
      url: options.url || '',
      status: error.response?.status,
      context,
      shouldRetry: false,
    });
  }

  toast.error(message, {
    duration,
    action,
  });
}

/**
 * showSuccessToast — Consistent success feedback
 */
export function showSuccessToast(message = 'Success', duration = 2000) {
  toast.success(message, { duration });
}

/**
 * withErrorToast — Wrapper for async operations
 * Usage: await withErrorToast(
 *   base44.entities.Job.update(id, data),
 *   'Job updated',
 *   { context: 'job_update' }
 * );
 */
export async function withErrorToast(promise, successMessage, options = {}) {
  try {
    const result = await promise;
    showSuccessToast(successMessage, options.duration || 2000);
    return result;
  } catch (error) {
    showErrorToast(error, options);
    throw error;
  }
}

/**
 * withOptimisticUpdate — Optimistic update with rollback
 * IMPORTANT: Only use for idempotent operations with server-side idempotency guarantees
 *
 * Usage: await withOptimisticUpdate(
 *   { state: 'done' },                    // Optimistic data
 *   () => base44.entities.Task.update(id, { status: 'done' }),  // Mutation
 *   (data) => setTask(data),              // Apply optimistic update
 *   (data) => setTask(data),              // Rollback handler
 *   'Task marked complete'                // Success message
 * );
 */
export async function withOptimisticUpdate(
  optimisticData,
  mutation,
  onOptimistic,
  onRollback,
  successMessage,
  options = {}
) {
  try {
    // Apply optimistic update immediately
    onOptimistic(optimisticData);

    // Execute mutation
    const result = await mutation();

    // Success
    showSuccessToast(successMessage, options.duration || 2000);
    return result;
  } catch (error) {
    // Rollback on failure
    onRollback();
    showErrorToast(error, options);
    throw error;
  }
}