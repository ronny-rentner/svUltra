import {
  syntaxSugar,
  transformComponentStyles,
  classMergePreprocessor,
  attributeTransformer,
  markdownPreprocessor,
  silenceRedundantWarnings,
} from '../index.js';

// Custom, project-specific replacement rules for syntaxSugar
const replacements = [
  // Remove comments with a regex
  [/\/\*[\s\S]*?\*\//gm, ''],

  ['@mobile',        '@media (max-width: 768px)'],
  ['@desktop',       '@media (min-width: 769px)'],
  ['@large',         '@media (min-width: 1536px)'],
  ['@dark',          ':root[data-theme="dark"]'],
  ['@light',         ':root[data-theme="light"]'],
];

export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: [
    // syntaxSugar needs to come first to restore proper Svelte syntax
    syntaxSugar(replacements, {
      // Configure tags to ignore with their options
      ignoreTags: {
        'svultra:ignore': { processTag: false, escapeCurlyBraces: true },
        'CodeExample': { processTag: true, escapeCurlyBraces: true }
      }
    }),
    
    markdownPreprocessor({
      path: './demo/src/markdown'
    }),
    
    attributeTransformer({
      attributes: [
        ['ariaLabel', 'aria-label'],
        ['index', 'data-index'],
      ]
    }),
    
    transformComponentStyles(),
    
    classMergePreprocessor(),
  ],
  
  compilerOptions: {},

  onwarn: silenceRedundantWarnings(),
};
