// Runtime helper for use inside Svelte 5 components.

import { writable } from 'svelte/store';

/**
 * Render a Svelte 5 snippet to a reactive HTML store.
 *
 * Svelte snippets are write-only render functions — you can't ask one for its
 * output as a string. This helper bypasses that by calling the snippet against
 * a throwaway parent DOM node (using the compiler's (anchor, ...lazyArgs)
 * calling convention). Svelte's template effects from that call keep updating
 * the detached parent's DOM whenever reactive deps change.
 *
 * The returned writable surfaces those updates: on first subscribe a
 * MutationObserver attaches; on last unsubscribe it disconnects. Subscribers
 * receive the current innerHTML, kept current by Svelte's own reactivity.
 *
 * For a one-shot snapshot use `get(store)` from svelte/store — it subscribes
 * and immediately unsubscribes, returning the current value.
 *
 * @param {Function} snippet  A Svelte 5 snippet.
 * @param {...any}   args     Arguments forwarded to the snippet; each is
 *                            wrapped in a zero-arg getter per the snippet
 *                            calling convention.
 * @returns {import('svelte/store').Writable<string>}
 */
export function snippetToHtml(snippet, ...args) {
  const parent = document.createElement('div');
  const anchor = document.createTextNode('');
  parent.appendChild(anchor);
  snippet?.(anchor, ...args.map(a => () => a));

  return writable(parent.innerHTML, (set) => {
    const observer = new MutationObserver(() => set(parent.innerHTML));
    observer.observe(parent, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  });
}

/**
 * Strip the common leading whitespace from every line. Useful for letting
 * authors indent multi-line text content (markdown bodies, code snippets,
 * template literals) to match the surrounding source without that indent
 * leaking into the rendered output. Whitespace-only lines are ignored when
 * measuring; the resulting common prefix is sliced from every line.
 *
 * @param {string} s
 * @returns {string}
 */
export function dedent(s) {
  const lines = s.split('\n');
  let min = Infinity;
  for (const l of lines) {
    let i = 0;
    while (l[i] === ' ' || l[i] === '\t') i++;
    if (i < l.length && i < min) min = i;
  }
  return min === Infinity ? s : lines.map(l => l.slice(min)).join('\n');
}
