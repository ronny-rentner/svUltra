// Svelte compiler warning codes that svUltra treats as redundant: they fire on
// patterns svUltra uses on purpose (terse, classless markup) or are Svelte 4→5
// migration noise — not real problems. Shared so every project silences the
// same set:
//
//   import { silenceRedundantWarnings } from 'svUltra';
//   export default { /* ... */, onwarn: silenceRedundantWarnings() };
//
const redundantWarningCodes = [
  // a11y
  'a11y-click-events-have-key-events',
  'a11y-no-static-element-interactions',
  'a11y_invalid_attribute',
  'a11y_no_redundant_roles',
  'a11y_no_noninteractive_element_interactions',
  'a11y_click_events_have_key_events',
  'a11y_role_has_required_aria_props',
  'a11y_no_static_element_interactions',
  'a11y_autofocus',
  'a11y_img_redundant_alt',
  'a11y_consider_explicit_label',
  'a11y_missing_attribute',
  'a11y_no_noninteractive_tabindex',
  // non-a11y
  // Fires on every read of a prop or state at the top level of a component's script, such as each page's meta()
  // call or a computation from props. The script runs once per instance by Svelte's design, so a read there
  // takes the value once, as any Svelte author expects. A value that should follow a prop is written as $derived
  // where it is needed; marking every intended read-once with untrack() would only repeat what the script means
  'state_referenced_locally',
  'script_context_deprecated',
  'attribute_illegal_colon',
  'element_invalid_self_closing_tag',
  'vite-plugin-svelte-css-no-scopable-elements',
];

/**
 * Build an `onwarn` handler for svelte.config.js that silences the redundant
 * warnings above. Pass extra codes to silence them on top of the defaults.
 *
 *   onwarn: silenceRedundantWarnings()              // shared defaults
 *   onwarn: silenceRedundantWarnings(['some_code']) // defaults + your own
 *
 * @param {string[]} [extraCodes]
 */
export function silenceRedundantWarnings(extraCodes = []) {
  const codes = new Set([...redundantWarningCodes, ...extraCodes]);
  return (warning, handler) => {
    if (codes.has(warning.code)) return;
    handler(warning);
  };
}

/**
 * Vite plugin that silences Svelte's runtime warning `ownership_invalid_mutation`, which `onwarn` cannot reach.
 *
 * In dev, Svelte warns when a component writes into a `$state` object it got as a prop without `bind:`. The warning
 * treats every such object as owned by its creator, an ownership JavaScript does not have: a function that receives
 * an object can change its contents, and the caller sees the change, as in most languages. Protection is a decision
 * of the owner, made once at the object, as `private`, `readonly` or `Object.freeze` are. Svelte instead warns at every
 * receiver by default and gives an owner who wants to share no way to say so. svUltra passes objects down on purpose
 * for the child to fill in, such as the Layout's layoutConfig that a page sets, and Svelte has no option to turn the
 * check off.
 *
 * The compiled component creates one validator and routes every such write through its `mutation`; this keeps the
 * validator and swaps its `mutation` for one that only returns the write's result. Its binding check stays. Depends
 * on the compiled code of Svelte 5.57: `$.create_ownership_validator($$props)`. A production build has no validator.
 *
 *   plugins: [svelte(), silenceOwnershipMutationPlugin()]
 */
export function silenceOwnershipMutationPlugin() {
  return {
    name: 'svultra:silence-ownership-mutation',
    apply: 'serve',
    // After vite-plugin-svelte compiled the component
    enforce: 'post',

    transform(code, id) {
      if (!id.endsWith('.svelte') || !code.includes('$.create_ownership_validator($$props)')) {
        return;
      }
      // A function, not a replacement string, which would read `$$` as an escaped `$`
      return code.replace(
        '$.create_ownership_validator($$props)',
        match => `Object.assign(${match}, { mutation: (prop, path, result) => result })`
      );
    },
  };
}
