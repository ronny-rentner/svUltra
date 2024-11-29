# svUltra

This is currently a collection of Svelte preprocessors that allow to build a hierarchical component tree with a consistent style. It's can be most efficiently used with a 'class-less' CSS framework like PicoCSS.

**NOTE: It's not yet a real Javascript npm package and there are also no unit tests, yet.**

## Example Svelte Component

In the following component, we can style the 3rd party `Icon` component from Iconify using our `transformComponentStyles` preprocessor. What happens under the hood is that the `Icon` CSS selector is transformed to something like `.Icon-c1eafff6`. The hash is dependent on the content of the CSS rule. This CSS selector is then added to the `class` parameter of any Icon component found. This only works if the component is actually making use of a `class` attribute.

The `classMergePreprocessor` is then used to merge together all class properties for each custom component. If `...rest` would contain a class property, it would be extracted and merged together with the others:

```
<MyComponent class:someClass={someCondition} class="other" {...rest} />
```

becomes

```
<MyComponent {...rest} class="{someCondition ? 'someClass' : ''} other {rest?.class ? rest.class : ''}" />
```

Note that the class attribute is moved to the end of the element so it would overwrite any potential class attribute in the `...rest` map.

### IconWithLabel.svelte
```
<script>
  import Icon from '@iconify/svelte';
  import defaultIcon from '@icons/ph/smiley-duotone';

  let { icon = defaultIcon, iconSize = '1.25rem', width, height, size,
        label, tooltip, placement, children, ...rest } = $props();

  if (children) {
    label = children;
  }

  if (size) {
    iconSize = size;
  }
  if (!width) {
    width = iconSize;
  }
  if (!height) {
    height = iconSize;
  }
</script>

<style>
  span.wrapper {
    display: inline-flex;
    /* Necessary to vertically align icon and label in user menu */
    align-items: center;
    /*vertical-align: top;*/

    Icon {
      margin-right: 0.25rem;
      /* Important setting to ensure the size and prevent shrinking */
      flex-shrink: 0;
    }

    > span {
      /* Necessary to vertically align label after icon used in accordions in the middle between top and bottom border */
      align-self: baseline;
    }
  }
</style>

{if label}
  {if icon}
    <span class="wrapper">
      <Icon {icon} {width} {height} class="margin" {...rest} /><span {tooltip} {placement}>{render label()}</span>
    </span>
  {else}
    {render label()}
  {/if}
{else}
  <Icon {icon} {width} {height} {...rest} {tooltip} {placement} />
{/if}
```

## Example `svelte.config.js`

```
import sveltePreprocess from 'svelte-preprocess';

import transformComponentStyles from './src/lib/preprocessors/component-styles.js';
import classMergePreprocessor   from './src/lib/preprocessors/class-merge.js';
import markdownPreprocessor     from './src/lib/preprocessors/markdown.js';
import syntaxSugar              from './src/lib/preprocessors/syntax-sugar.js';
import attributeTransformer     from './src/lib/preprocessors/attribute-transformer.js';
import printSourceCode          from './src/lib/preprocessors/print.js';

const ignore_warning_codes = [
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
  'script_context_deprecated',
  'attribute_illegal_colon',
  'element_invalid_self_closing_tag',
]

let replacements = [
  //Allow multiple constants being defined with one tag
  [/\{const\s+([^}]+)\s*}/g, (match, content) => content.trim().split(/,\s*/).map(_ => `\{@const ${_}\}`).join(' ')],

  //Allow short-hand tag for writables, e. g. `<Component {$someStore} />` gets transformed
  //                                       to `<Component someStore={$someStore}>`
  [/<([A-Za-z0-9]+)([^>]*?)\s\{\$([A-Za-z0-9_]+)\}([^>]*?)\/?>/g, '<$1$2 $3={$$$3}$4/>'],
  [/ disabled=\{([^}|]*?)\}/g, ' disabled={$1 || undefined}' ],
  ['{const ',   '{@const '],
  ['{snippet ', '{#snippet '],
  ['{if ',      '{#if '],
  ['{else}',    '{:else}'],
  ['{else ',    '{:else '],
  ['{elif ',    '{:else if '],
  ['{elseif ',  '{:else if '],
  ['{await ',   '{#await '],
  ['{then ',    '{:then '],
  ['{each ',    '{#each '],
  ['{render ',  '{@render '],
  ['{try}',     '{#try}'],
  ['{catch ',   '{:catch '],

  //Remove comments
  [/\/\*[\s\S]*?\*\//gm, ''],

  //Send `undefined` instead of `false` for disabled to omit the attribute
  ['{disabled}',     'disabled={disabled || undefined}'],
  ['disabled=false', ''],
  ['@media mobile',  '@media (max-width: 768px)'],
  ['@mobile',        '@media (max-width: 768px)'],
  ['@media desktop', '@media (min-width: 769px)'],
  ['@desktop',       '@media (min-width: 769px)'],
  ['@media large',   '@media (min-width: 1536px)'],
  ['@large',         '@media (min-width: 1536px)'],
  ['@dark',          ':root[data-theme="dark"]'],
  ['@light',         ':root[data-theme="light"]'],
];

export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: [
    //This needs to come first to restore proper Svelte syntax
    syntaxSugar(replacements),

    markdownPreprocessor({
      path: './src/markdown'
    }),

    attributeTransformer({
      attributes: [
        ['tooltip', 'data-tooltip'],               // Exact match
        ['placement', 'data-placement'],           // Exact match
        //[/!(.*)/, '$1={false}'],                   // Regex match: `!showLogo` → `showLogo={false}`
      ],
      excludeTags: [],
    }),

    transformComponentStyles(),

    classMergePreprocessor(),

    //sveltePreprocess({
      //no effect
      //sourceMap: true,
    //}),

    //printSourceCode('ToggleDarkMode.svelte'),
    //printSourceCode('LoadingOverlay.svelte'),
    //printSourceCode('Router.svelte'),
    //printSourceCode('Document.svelte'),
  ],
  compilerOptions: {},
  onwarn: (warning, handler) => {

    if (ignore_warning_codes.includes(warning.code)) {
      return;
    }
    console.log("\n\nWarning: ", warning.code, "\n", warning.frame, "\n");

    handler(warning);
  },
}

```
