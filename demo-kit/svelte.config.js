import { svultraPreprocess, silenceRedundantWarnings } from 'svultra';

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
  preprocess: svultraPreprocess({
    replacements,
    attributes: [
      ['ariaLabel', 'aria-label'],
    ],
  }),

  compilerOptions: {},

  onwarn: silenceRedundantWarnings(),
};
