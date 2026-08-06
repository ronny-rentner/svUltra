import { onDestroy } from 'svelte';
import { cancelRequest } from './api.js';

/**
 * Wraps a single API function with loading state and request cancellation.
 * @param {Function} apiFunction - The API function to wrap.
 * @returns {Object} A wrapper with `execute` and `loading` for the API function.
 */
export function apiClient(apiFunction) {
  // Reactive loading state using a counter in case of multiple, parallel requests
  let isLoading = $state({ loading: 0 });

  function execute(...args) {
    isLoading.loading++;
    const promise = apiFunction(...args); // Get the promise from the API function

    // Attach a finally handler to reset loading state
    promise.finally(() => {
      isLoading.loading--;
    });

    return promise; // Return the original promise immediately
  }

  const abortKey = apiFunction.name || apiFunction;
  onDestroy(() => {
    cancelRequest(abortKey); // Automatically cancel the request on unmount
  });

  return {
      execute, // The wrapped API function
      get loading() { return isLoading.loading > 0; },
      isLoading,
  };
}

export * from './api.js';
export * from './recaptcha.js';
