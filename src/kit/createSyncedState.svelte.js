import { createScopedLogger } from '../logger.js';
import { merge } from './stores.js';

const log = createScopedLogger('synced-state', 'info');

//Returns a $state object or array synchronised with localStorage under `key`, in both directions and across tabs
export function createSyncedState(key, initialValue, updateFromLocalStorage = true) {
  let storedValue;
  try {
    storedValue = JSON.parse(localStorage.getItem(key));
  } catch (error) {
    log.warn(`Ignoring unreadable localStorage entry "${key}":`, error);
  }
  //An object: the stored value over the initial one, so a key added since the value was stored arrives with its
  //initial value. An array: the stored one as it is
  const state = $state(Array.isArray(initialValue)
    ? storedValue ?? structuredClone(initialValue)
    : merge(structuredClone(initialValue), storedValue ?? {}));

  //Set while another tab's value is taken over, so the effect below does not write it back and trigger that tab again
  let receiving = false;

  //Update localStorage when the `state` changes
  $effect.root(() => {
    $effect(() => {
      //Read before the check, so the effect keeps tracking `state` while receiving
      const json = JSON.stringify(state);
      if (!receiving) {
        localStorage.setItem(key, json);
      }
    });
  });

  if (updateFromLocalStorage) {
    window.addEventListener('storage', event => {
      if (event.key === key) {
        //JSON.parse can throw, so we parse before replacing anything
        const value = JSON.parse(event.newValue) ?? structuredClone(initialValue);
        receiving = true;
        if (Array.isArray(state)) {
          state.splice(0, state.length, ...value);
        } else {
          //A $state object has no replace, so we have to delete manually first
          for (const property of Object.keys(state)) delete state[property];
          Object.assign(state, value);
        }
        //Svelte runs the effects in a microtask it queued at the first change above, so this one comes after them
        queueMicrotask(() => receiving = false);
      }
    });
  }

  return state;
}
