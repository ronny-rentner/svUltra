import { writable } from 'svelte/store';

//export const personStore = writable(null);
export const personStore = createLocalStorageStore('person_data', null);

export const authLoading = writable('initial');

export const configStore = createLocalStorageStore('config', { darkMode: false });

export function overwrite(value) {
  return { __overwrite__: true, value };
}

export function merge(target, source) {
  for (const [key, val] of Object.entries(source)) {
    if (val && val.__overwrite__) {
      // Overwrite the target[key] with val.value
      target[key] = val.value;
    } else if (Array.isArray(val)) {
      // Overwrite arrays instead of merging them
      target[key] = val;
    } else if (val !== null && typeof val === 'object') {
      // Recursively merge objects
      target[key] = merge(target[key] || {}, val);
    } else {
      // Directly assign primitive values and other non-object types
      target[key] = val;
    }
  }
  return target;
}

export function createLocalStorageStore(key, initialValue, updateFromLocalStorage = true) {
  // Safely get the initial value from localStorage or fallback to initialValue
  const storedValue = localStorage.getItem(key);
  let parsedValue;

  if (storedValue !== null) {
    try {
      parsedValue = JSON.parse(storedValue);
    } catch (error) {
      // If JSON.parse fails, fall back to initialValue
      parsedValue = initialValue;
    }
  } else {
    // If storedValue is null, fall back to initialValue
    parsedValue = initialValue;
  }

  // Sync with localStorage when the store changes
  const store = writable(parsedValue);

  // Enhanced update function
  const originalUpdate = store.update;
  store.update = (updaterOrData) => {
    if (typeof updaterOrData === 'function') {
      originalUpdate(updaterOrData);
    } else {
      store.update(current => merge(current, updaterOrData));
    }
  };

  // TODO: Why does subscripte set a value in localStorage?
  store.subscribe(val => {
    const stringValue = JSON.stringify(val);
    if (localStorage.getItem(key) !== stringValue) {
      localStorage.setItem(key, stringValue);
    }
  });

  // Listen for localStorage changes in other tabs
  if (updateFromLocalStorage) {
    window.addEventListener('storage', (event) => {
      if (event.key === key) {
        if (event.newValue) {
          store.set(JSON.parse(event.newValue));
        } else {
          store.set(initialValue); // Reset to initialValue if key is removed
        }
      }
    });
  }

  return store;
}
