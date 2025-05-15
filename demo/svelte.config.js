import { 
  syntaxSugar,
  transformComponentStyles,
  classMergePreprocessor,
  attributeTransformer,
  markdownPreprocessor,
} from '../index.js';

// Define syntax replacements
const replacements = [
  ['{const ',   '{@const '],
  //Allow multiple constants being defined with one tag
  [/\{@const\s+([^}]+)\s*}/g, (match, content) => content.trim().split(/,\s*/).map(_ => `\{@const ${_}\}`).join(' ')],

  //Allow short-hand tag for writables, e. g. `<Component {$someStore} />` gets transformed
  //                                       to `<Component someStore={$someStore}>`
  [/<([A-Za-z0-9]+)([^>]*?)\sstyle:\{([$A-Za-z0-9_]+)\}([^>]*?)\/?>/g, '<$1$2 style:$3={$3}$4/>'],
  [/<([A-Za-z0-9]+)([^>]*?)\s\{\$([A-Za-z0-9_]+)\}([^>]*?)\/?>/g, '<$1$2 $3={$$$3}$4/>'],
  // Transform `<Component bind:{someVar} />` to `<Component bind:someVar={someVar} />`
  [/<([A-Za-z0-9]+)([^>]*?)\sbind:\{([A-Za-z0-9_]+)\}([^>]*?)\/?>/g, '<$1$2 bind:$3={$3}$4/>'],
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
  ['{html ',    '{@html '],
  ['{try}',     '{#try}'],
  ['{catch ',   '{:catch '],

  //Remove comments
  [/\/\*[\s\S]*?\*\//gm, ''],

  //Send `undefined` instead of `false` for disabled to omit the attribute
  [/ disabled=\{([^}|]*?)\}/g, ' disabled={$1 || undefined}'],
  [' disabled=false',          ''],
  ['{disabled}',               'disabled={disabled || undefined}'],
  ['{novalidate}',             'novalidate={novalidate || undefined}'],

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
    // This needs to come first to restore proper Svelte syntax
    syntaxSugar(replacements, {
      // Configure tags to ignore with their options
      ignoreTags: {
        'svultra:ignore': { processTag: false, escapeCurlyBraces: true },
        'CodeExample': { processTag: true, escapeCurlyBraces: true }
      }
    }),
    
    markdownPreprocessor({
      path: './src/markdown'
    }),
    
    attributeTransformer({
      attributes: [
        ['tooltip', 'data-tooltip'],
        ['placement', 'data-placement'],
      ]
    }),
    
    transformComponentStyles(),
    
    classMergePreprocessor(),
  ],
  
  compilerOptions: {},
};