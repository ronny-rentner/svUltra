// Backend-agnostic request helpers: a fetch wrapper with CSRF handling and
// automatic aborting of superseded requests. Apps build their own endpoint
// functions on top of apiRequest.

// Helper function to get a cookie by name
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Store AbortControllers by endpoint or a hashed key
const abortControllers = new Map();

/**
 * Creates a new AbortController for a given key and add it to the
 * controllers map. Automatically clears existing controllers.
 * @param {string} key - Unique identifier for the request (e.g., URL).
 * @returns {AbortController} - The AbortController for the request.
 */
async function createAbortController(key) {
  if (abortControllers.has(key)) {
    // Retrieve and abort the existing controller
    const oldController = abortControllers.get(key);

    // Abort the old request
    await oldController.abort();

    // Explicitly clean up to avoid any delay in removing the old controller
    await abortControllers.delete(key);
    console.warn('Aborting still running previous request: ', key);
  }

  // Create a new controller and add it to the map
  const controller = new AbortController();
  abortControllers.set(key, controller);

  return controller;
}

/**
 * Makes an API request with optional AbortController integration.
 * @param {string} endpoint - The URL for the request.
 * @param {object} options - Fetch options.
 * @returns {Promise<object>} - Result of the API call.
 */
export async function apiRequest(endpoint, options = {}, key = null) {
  // Derive the abort key from the function name or fallback to endpoint
  const abortKey = key?.name || key || endpoint;

  const controller = await createAbortController(abortKey); // Use the derived abort key
  options.signal = controller.signal; // Attach the signal to the fetch options

  if (!options.headers) options.headers = {};

  // Set CSRF Token Header for relevant methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      options.headers['X-CSRFToken'] = csrfToken;
    }
  }
  options.credentials = 'include';

  let response;
  let result = { success: false, data: null, error: null, endpoint };

  try {
    console.log('API request initiated:', { endpoint, options, abortKey });
    response = await fetch(endpoint, options);
    const data = await response.json();
    if (response.ok) {
      result = { ...result, success: true, data };
    } else {
      result = { ...result, error: data?.error ?? data ?? response };
    }
  } catch (error) {
    result = { ...result, error };
    if (error.name === 'AbortError') {
      console.warn('API request was aborted for abortKey:', abortKey);
    } else {
      console.error('API request had an error:', abortKey, error);
    }
  } finally {
    // Cleanup abort controller after request finishes
    abortControllers.delete(abortKey);
  }

  console[result.success ? 'log' : 'error']('API Response:', result);

  return result;
}

/**
 * Cancels an API request by its key.
 * If no key is provided, cancels all ongoing requests.
 * @param {string} key - Unique identifier for the request (e.g., URL).
 */
export function cancelRequest(key = null) {
  if (key) {
    // Derive the abortKey consistently
    const abortKey = key.name || key;

    if (abortControllers.has(abortKey)) {
      abortControllers.get(abortKey).abort();
      abortControllers.delete(abortKey); // Cleanup
      console.log(`Request for abortKey "${abortKey}" was canceled.`);
    }
  } else {
    // Cancel all requests if no key is provided
    cancelAll();
  }
}

/**
 * Cancels all ongoing requests and clears the abortControllers map.
 */
export function cancelAll() {
  for (const [abortKey, controller] of abortControllers.entries()) {
    controller.abort();
  }
  abortControllers.clear(); // Clear all keys
}

// Add global event listeners for page unload/navigation
function addGlobalEventListeners() {
  const handlePageUnload = () => {
    cancelAll();
  };

  const handlePageHide = () => {
    cancelAll();
  };

  window.addEventListener('beforeunload', handlePageUnload);
  window.addEventListener('pagehide', handlePageHide);
}

// Ensure listeners are added once when the module is loaded
addGlobalEventListeners();
