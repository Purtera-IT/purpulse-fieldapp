/**
 * axiosTokenInterceptor.js — Attach to axios instances for automatic token refresh on 401
 * 
 * Handles:
 * - 401 (Unauthorized) responses
 * - Refreshes access token
 * - Retries original request
 * - Falls back to logout on repeated failure
 */

import { authManager } from '@/lib/auth'

/**
 * Attach token refresh interceptor to axios instance
 * Automatically handles 401 by refreshing token and retrying
 */
export function attachTokenInterceptor(axiosInstance) {
  const failedQueue = []
  let isRefreshing = false

  const processQueue = (error) => {
    failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error)
      } else {
        prom.resolve()
      }
    })
    failedQueue.length = 0
  }

  // Response interceptor for 401
  axiosInstance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config

      // Only handle 401 and prevent infinite loops
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        if (!isRefreshing) {
          isRefreshing = true

          try {
            // Refresh the token
            const refreshResponse = await authManager.refreshAccessToken()

            // Update axios headers with new token
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.accessToken}`
            originalRequest.headers['Authorization'] = `Bearer ${refreshResponse.accessToken}`

            // Process queued requests
            processQueue(null)

            // Retry original request
            return axiosInstance(originalRequest)
          } catch (refreshError) {
            console.error('[Interceptor] Token refresh failed:', refreshError)

            // Refresh failed — clear storage and trigger logout
            await authManager.logout()

            // Redirect to login
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }

            processQueue(refreshError)
            return Promise.reject(refreshError)
          } finally {
            isRefreshing = false
          }
        } else {
          // Queue request while refresh is in progress
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then(() => axiosInstance(originalRequest))
        }
      }

      return Promise.reject(error)
    }
  )
}