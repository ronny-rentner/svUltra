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
