import { createScopedLogger } from '../logger.js';

const log = createScopedLogger('syntax-sugar', 'info');

// Default replacements: lossless rewrites of svUltra shorthands into standard
// Svelte syntax, safe for any project. Project-specific shortcuts (media-query
// breakpoints, theme selectors, boolean-attribute handling, comment stripping)
// are left out — pass them via the `replacements` argument, appended to these.
const defaultReplacements = [
  // `{const x = 1}` -> `{@const x = 1}`
  ['{const ', '{@const '],
  // Allow several constants in a single tag:
  // `{@const a = 1, b = 2}` -> `{@const a = 1} {@const b = 2}`
  [/\{@const\s+([^}]+)\s*}/g, (match, content) =>
    content.trim().split(/,\s*/).map(_ => `{@const ${_}}`).join(' ')],

  // svUltra's signature shorthands that extend Svelte's `{prop}` form to
  // stores and directives, for both elements and components. 
  //   `<p style:{color}>`       -> `<p style:color={color}>`
  [/<([A-Za-z0-9]+)([^>]*?)\sstyle:\{([$A-Za-z0-9_]+)\}([^>]*?)(\/?)>/g, '<$1$2 style:$3={$3}$4$5>'],
  //   `<Component {$store} />`       -> `<Component store={$store} />`
  [/<([A-Za-z0-9]+)([^>]*?)\s\{\$([A-Za-z0-9_]+)\}([^>]*?)(\/?)>/g, '<$1$2 $3={$$$3}$4$5>'],
  //   `<input bind:{value} />`  -> `<input bind:value={value} />`
  [/<([A-Za-z0-9]+)([^>]*?)\sbind:\{([A-Za-z0-9_]+)\}([^>]*?)(\/?)>/g, '<$1$2 bind:$3={$3}$4$5>'],

  // Svelte 4-style `slot="name"` on a component child rewrites to the Svelte 5
  // named-snippet form. Applies to component invocations only (uppercase tag).
  //   <Tag slot="x" ...>body</Tag>   -> {#snippet x()}<Tag ...>body</Tag>{/snippet}
  [/<([A-Z]\w*)([^>]*?)\s+slot="(\w+)"([^>]*?)>([\s\S]*?)<\/\1>/g,
    '{#snippet $3()}<$1$2$4>$5</$1>{/snippet}'],
  //   <Tag slot="x" ... />           -> {#snippet x()}<Tag ... />{/snippet}
  [/<([A-Z]\w*)([^>]*?)\s+slot="(\w+)"([^>]*?)\s*\/>/g,
    '{#snippet $3()}<$1$2$4 />{/snippet}'],
  //   <svelte:fragment slot="x">body</svelte:fragment>  -> drop the wrapper
  [/<svelte:fragment([^>]*?)\s+slot="(\w+)"([^>]*?)>([\s\S]*?)<\/svelte:fragment>/g,
    '{#snippet $2()}$4{/snippet}'],

  // Block syntax: drop the `#`/`:`/`@` prefixes Svelte requires.
  ['{snippet ', '{#snippet '],
  ['{if ',      '{#if '],
  ['{else}',    '{:else}'],
  ['{else ',    '{:else '],
  ['{elif ',    '{:else if '],
  ['{elseif ',  '{:else if '],
  ['{await ',   '{#await '],
  ['{then ',    '{:then '],
  ['{each ',    '{#each '],
  ['{key ',     '{#key '],
  ['{render ',  '{@render '],
  ['{html ',    '{@html '],
  ['{try}',     '{#try}'],
  ['{catch ',   '{:catch '],
];

// Tags whose contents are protected from the replacements above.
const defaultIgnoreTags = {
  // preserved verbatim — the "do not touch" marker
  'svultra:ignore': { processTag: false, escapeCurlyBraces: true },
  // markdown bodies are opaque source for the markdown preprocessor; never
  // rewrite shorthands or escape characters inside them.
  'markdown':       { processTag: false },
};

/**
 * Syntax-sugar preprocessor.
 *
 * Usage:
 *   syntaxSugar()                                      // defaults only
 *   syntaxSugar(replacements)                          // defaults + your own (appended)
 *   syntaxSugar(replacements, { useDefaults: false })  // only your own, no defaults
 *   syntaxSugar(replacements, { ignoreTags })          // configure preserved tags
 *
 * @param {Array}   [replacements]  Extra replacements, applied after the defaults.
 * @param {object}  [options]
 * @param {boolean} [options.useDefaults=true]  Set false to drop the default set.
 * @param {object}  [options.ignoreTags]   Tags to preserve from processing.
 */
export default function syntaxSugar(replacements = [], options = {}) {
  const { useDefaults = true, ignoreTags = {} } = options;

  const activeReplacements = useDefaults
    ? [...defaultReplacements, ...replacements]
    : [...replacements];

  const config = {
    ignoreTags: { ...defaultIgnoreTags, ...ignoreTags },
  };

  // Validate tag names are safe for regex
  const validTagPattern = /^[a-zA-Z0-9:]+$/;
  Object.keys(config.ignoreTags).forEach(tag => {
    if (!validTagPattern.test(tag)) {
      throw new Error(`Invalid tag name: ${tag}. Tag names must contain only alphanumeric characters and colons.`);
    }
  });

  return {
    markup({ content, filename }) {
      if (filename.includes('node_modules')) {
        return;
      }

      log.debug('Running syntaxSugar preprocessor', filename);

      let modifiedContent = content;
      const preservedSections = {};

      // Process each tag according to its configuration
      for (const [tagName, tagConfig] of Object.entries(config.ignoreTags)) {
        const { processTag, escapeCurlyBraces } = tagConfig;

        // Initialize array for this tag if needed
        if (!preservedSections[tagName]) {
          preservedSections[tagName] = [];
        }

        if (processTag) {
          // Process tag but handle content according to configuration
          const tagRegex = new RegExp(`(<${tagName}[^>]*>)([\\s\\S]*?)(</${tagName}>)`, 'gi');

          modifiedContent = modifiedContent.replace(tagRegex, (match, openTag, content, closeTag) => {
            if (escapeCurlyBraces) {
              // Replace curly braces and HTML tags with HTML entities
              const escapedContent = content
                .replace(/\{/g, '&lbrace;')
                .replace(/\}/g, '&rbrace;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              return openTag + escapedContent + closeTag;
            } else {
              // Just preserve content without modification
              const placeholder = `__PRESERVED_${tagName}_${preservedSections[tagName].length}__`;
              preservedSections[tagName].push(content);
              return openTag + placeholder + closeTag;
            }
          });
        } else {
          // Preserve the entire tag including tag and content
          const tagRegex = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?</${tagName}>`, 'gi');

          modifiedContent = modifiedContent.replace(tagRegex, (match) => {
            const placeholder = `__PRESERVED_WHOLE_${tagName}_${preservedSections[tagName].length}__`;
            preservedSections[tagName].push(match);
            return placeholder;
          });
        }
      }

      // Apply replacements to the modified content
      activeReplacements.forEach(([searchValue, replaceValue]) => {
        if (typeof searchValue === 'string') {
          modifiedContent = modifiedContent.split(searchValue).join(replaceValue);
        } else if (searchValue instanceof RegExp) {
          modifiedContent = modifiedContent.replace(searchValue, replaceValue);
        }
      });

      // Restore preserved sections
      for (const [tagName, sections] of Object.entries(preservedSections)) {
        for (let i = 0; i < sections.length; i++) {
          // Restore whole tag sections
          if (modifiedContent.includes(`__PRESERVED_WHOLE_${tagName}_${i}__`)) {
            modifiedContent = modifiedContent.replace(
              `__PRESERVED_WHOLE_${tagName}_${i}__`,
              sections[i]
            );
          }

          // Restore content-only sections
          if (modifiedContent.includes(`__PRESERVED_${tagName}_${i}__`)) {
            modifiedContent = modifiedContent.replace(
              `__PRESERVED_${tagName}_${i}__`,
              sections[i]
            );
          }
        }
      }

      return {
        code: modifiedContent,
      };
    },
  };
}
