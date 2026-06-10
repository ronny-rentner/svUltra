// Main export file for svUltra
export { default as attributeTransformer } from './src/preprocessors/attribute-transformer.js';
export { default as classMergePreprocessor } from './src/preprocessors/class-merge.js';
export { default as transformComponentStyles } from './src/preprocessors/component-styles.js';
export { default as markdownPreprocessor } from './src/preprocessors/markdown.js';
export { default as syntaxSugar } from './src/preprocessors/syntax-sugar.js';
export { default as svultraPreprocess } from './src/preprocessors/preset.js';
export { default as printSourceCode } from './src/preprocessors/print.js';

// Shared svelte.config.js helper: an `onwarn` that silences svUltra's standard
// set of redundant (mostly a11y) Svelte warnings.
export { silenceRedundantWarnings } from './src/svelte-warnings.js';