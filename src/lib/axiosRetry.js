/**
 * axiosRetry — Centralized retry policy for API requests
 * Handles exponential backoff, idempotent operations, and error reporting
 */
import { reportNetworkError } from './errorReporter';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1s base, exponential backoff
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const RETRYABLE_METHODS = ['GET', 'PUT', 'DELETE', 'HEAD']; // Safe/idempotent

/**
 * isRetryableError — Determine if an error should be retried
 */
function isRetryableError(error, method = 'GET') {
  if (!error.response) return true; // Network error, retry
  const { status } = error.response;
  return RETRYABLE_STATUS_CODES.includes(status) && RETRYABLE_METHODS.includes(method);
}

/**
 * exponentialBackoff — Calculate delay with jitter
 */
function exponentialBackoff(attempt) {
  const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
}

/**
 * attachRetryInterceptor — Add retry logic to axios instance
 */
export function attachRetryInterceptor(axiosInstance) {
  axiosInstance.interceptors.response.use(
    response => response,
    async error => {
      const config = error.config;

      // Initialize retry count
      if (!config.__retryCount) {
        config.__retryCount = 0;
      }

      const method = config.method?.toUpperCase() || 'GET';
      const shouldRetry = isRetryableError(error, method) && config.__retryCount < MAX_RETRIES;

      if (shouldRetry) {
        config.__retryCount += 1;
        const delay = exponentialBackoff(config.__retryCount - 1);

        // Log retry attempt
        console.warn(
          `[Retry ${config.__retryCount}/${MAX_RETRIES}] ${method} ${config.url} after ${delay.toFixed(0)}ms`
        );

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, delay));
        return axiosInstance(config);
      }

      // Report final error
      await reportNetworkError({
        error,
        method,
        url: config.url,
        status: error.response?.status,
        retryCount: config.__retryCount || 0,
        shouldRetry: false,
      });

      return Promise.reject(error);
    }
  );

  return axiosInstance;
}