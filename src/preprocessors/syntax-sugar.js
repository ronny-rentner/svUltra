import { walk } from 'estree-walker';
import { parse } from 'svelte/compiler';
import MagicString from 'magic-string';

import { createScopedLogger } from '../logger.js';

const log = createScopedLogger('syntax-sugar', 'info');

// Svelte 4-style `slot="name"` and `let:prop` rewritten to the Svelte 5
// named-snippet form. AST-based: nested same-name tags and `>` inside
// attribute expressions are resolved by the parser, which a regex over the
// raw source cannot do. Runs after the string replacements, which turn the
// remaining svUltra shorthands into parseable Svelte.
//   <tag slot="x" ...>body</tag>  -> {#snippet x()}<tag ...>body</tag>{/snippet}
//   <tag slot="x" ... />          -> {#snippet x()}<tag ... />{/snippet}
//   <svelte:fragment slot="x">body</svelte:fragment> -> {#snippet x()}body{/snippet}
//   <Tag let:a>body</Tag>         -> <Tag>{#snippet children(a)}body{/snippet}</Tag>
// slot= and let: combine: the let: names become the snippet parameters, in
// order of appearance; `let:name={alias}` passes the alias pattern through.
function rewriteSlotSugar(content, filename) {
  if (!content.includes('slot=') && !content.includes('let:')) {
    return content;
  }

  let ast;
  try {
    ast = parse(content);
  } catch (error) {
    log.error(`Cannot parse ${filename} for the slot/let rewrite: ${error.message}`);
    return content;
  }

  const ms = new MagicString(content);
  let hasTransformed = false;

  walk(ast.html, {
    enter(node) {
      if (!node.attributes) {
        return;
      }

      const slotAttr = node.attributes.find(attr =>
        attr.type === 'Attribute' && attr.name === 'slot' &&
        Array.isArray(attr.value) && attr.value[0]?.type === 'Text');
      const letDirectives = node.attributes.filter(attr => attr.type === 'Let');

      if (!slotAttr && !letDirectives.length) {
        return;
      }
      // let: without a body has nothing to receive the parameters
      if (!slotAttr && !node.children?.length) {
        return;
      }

      const params = letDirectives.map(directive => directive.expression
        ? content.slice(directive.expression.start, directive.expression.end)
        : directive.name
      ).join(', ');

      if (slotAttr && node.name === 'svelte:fragment') {
        // the fragment exists only to carry slot=, so drop the wrapper tags
        const openEnd = content.indexOf('>', Math.max(...node.attributes.map(attr => attr.end))) + 1;
        const closeStart = content.lastIndexOf('</', node.end - 2);
        if (closeStart < node.start) {
          return; // self-closing fragment: nothing to unwrap
        }
        ms.overwrite(node.start, openEnd, `{#snippet ${slotAttr.value[0].data}(${params})}`);
        ms.overwrite(closeStart, node.end, '{/snippet}');
        hasTransformed = true;
        return;
      }

      // Strip the sugar attributes together with their leading whitespace.
      for (const attr of letDirectives.concat(slotAttr ?? [])) {
        let from = attr.start;
        while (/\s/.test(content[from - 1])) {
          from--;
        }
        ms.remove(from, attr.end);
      }

      if (slotAttr) {
        ms.appendLeft(node.start, `{#snippet ${slotAttr.value[0].data}(${params})}`);
        ms.appendRight(node.end, '{/snippet}');
      } else {
        // let: only: the tag stays, its body becomes an explicit children snippet
        ms.appendLeft(node.children[0].start, `{#snippet children(${params})}`);
        ms.appendRight(node.children.at(-1).end, '{/snippet}');
      }

      hasTransformed = true;
    },
  });

  return hasTransformed ? ms.toString() : content;
}

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

  // Prepend `// svelte-ignore state_referenced_locally` to a bare `meta(...)`
  // call. The Router passes meta() to pages as a (reactive) prop, and Svelte
  // 5.56 flags the call site with state_referenced_locally — a false positive
  // here. Skips calls already annotated, and never matches a `function meta(...)`
  // declaration (that line doesn't start with `meta(`).
  [/^([ \t]*)meta[ \t]*\(/gm, (match, indent, offset, source) => {
    const before = source.slice(0, offset);
    if (before.trimEnd().endsWith('svelte-ignore state_referenced_locally')) {
      return match;
    }
    return `${indent}// svelte-ignore state_referenced_locally\n${match}`;
  }],
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
      if (filename.includes('node_modules') && !filename.includes('node_modules/svultra/')) {
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

      modifiedContent = rewriteSlotSugar(modifiedContent, filename);

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
