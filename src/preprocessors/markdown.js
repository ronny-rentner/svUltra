import { readFile } from 'fs/promises';
import { resolve, dirname, basename, extname } from 'path';
import { marked, Marked } from 'marked';
import MagicString from 'magic-string';
import { createScopedLogger } from '../logger.js';
import { dedent } from '../snippet.svelte.js';

const log = createScopedLogger('markdown', 'info');

const internalDomains = [];

// Post-process marked's rendered code output to escape { and } — the two
// characters Svelte's compiler treats as mustache delimiters. Without this,
// braces appearing inside backtick code spans/blocks would be interpreted as
// expressions by Svelte's parser instead of rendered as literal text.
const braceEntity = { '{': '&lbrace;', '}': '&rbrace;' };
const escapeBraces = (html) => html.replace(/[{}]/g, (c) => braceEntity[c]);

// Instance of the default renderer so we can call its unmodified codespan and
// code methods, then post-process their output to add brace escaping.
const defaultRenderer = new marked.Renderer();

const renderer = {
  codespan: (token) => escapeBraces(defaultRenderer.codespan(token)),
  code:     (token) => escapeBraces(defaultRenderer.code(token)),

  link({ href, title, text }) {
    let isInternal = false;

    //console.log('LINK', href);

    // Function to extract the domain from a URL
    function getDomain(url) {
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }

    // Check if the href is relative or matches any internal domain
    if (
      href.startsWith('/') ||
      internalDomains.some(domain => {
        const linkDomain = getDomain(href);
        return linkDomain === domain;
      })
    ) {
      isInternal = true;
    }

    // Build the opening <a> tag
    let out = `<a href="${href}"`;

    if (title) {
      out += ` title="${title}"`;
    }

    if (!isInternal) {
      out += ' target="_blank"';
    }

    out += `>${text}</a>`;

    return out;
  },
};

const accordionExtension = {
  name: 'accordion',
  level: 'block',
  multiple: true,
  tokenizer(src, tokens) {
    const rule = /^##\s+(.*?)(?:\n+([\s\S]*?))(?=(?:\n##\s+|$))/;
    const match = rule.exec(src);
    log.debug('accordionExtension');
    if (match) {
      return {
        type: 'accordion',
        raw: match[0], // Ensure raw includes the full matched text
        header: match[1].trim(),
        text: match[2] ? match[2].trim() : ''
      };
    }
  },
  renderer(token) {
    const body = marked.parse(token.text);
    return `<Accordion>
  {#snippet header()}${token.header}{/snippet}
  ${body}
</Accordion>`;
  }
};

const markedOptions = { renderer, gfm: true };

//No other way to add a custom renderer
marked.use({ renderer });

// Instance without extensions
const defaultMarked = new Marked(markedOptions);
//No effect
defaultMarked.use({ renderer });

// Instance with the accordion extension
const markedWithAccordion = new Marked(markedOptions);
markedWithAccordion.use({ renderer, extensions: [accordionExtension] });

//marked.use(accordionExtension);

function renderMarkdown(markdownText, useAccordion = false) {
  let html;
  //console.log('RENDER');
  if (useAccordion) {
    log.debug('useAccordion mode: ', useAccordion);
    html = markedWithAccordion.parse(markdownText)
  } else {
    html = defaultMarked.parse(markdownText);
  }
  //log.debug('Rendered HTML', html);
  return html;
}

/**
 * Extract pattern and flags from the string and return them separately.
 * The pattern is expected to be in the format: /pattern/flags
 */
function extractPatternAndFlags(patternWithFlags) {
  const match = patternWithFlags.match(/^\/(.*?)\/([gimsuy]*)$/);
  if (!match) {
    log.error(`Invalid pattern format: ${patternWithFlags}`);
    return { pattern: '', flags: '' };
  }
  return { pattern: match[1], flags: match[2] };
}

/**
 * Apply a single regex replacement on the markdown content based on the 'pattern' and 'replacement' attributes.
 */
function applyReplacement(markdownContent, patternWithFlags, replacement) {
  const { pattern, flags } = extractPatternAndFlags(patternWithFlags);
  try {
    const regex = new RegExp(pattern, flags); // Use the extracted pattern and flags
    return markdownContent.replace(regex, replacement);
  } catch (error) {
    log.error('Error applying regex replacement:', pattern, replacement, error);
    return markdownContent;  // Return original content if replacement fails
  }
}

// Extract name="value" pairs from a string of HTML-style attributes. Only
// handles double-quoted values, which is what the <markdown> tag uses
// (file="…", mode="…", pattern="…", replacement="…").
function parseAttrs(s) {
  const attrs = {};
  const re = /(\w+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

// Matches <markdown ...>body</markdown> (body group captured) and
// self-closing <markdown ... /> (body group undefined).
const tagRegex = /<markdown((?:\s+[^>]*?)?)(?:\s*\/>|>([\s\S]*?)<\/markdown>)/g;

/**
 * Svelte preprocessor that looks for <markdown> tags, reads the associated
 * markdown file or renders the inline body, replaces the tag with compiled HTML,
 * and generates a source map. If no file attribute is provided and the tag has
 * no body, it uses the current file's basename with .md extension.
 */
async function processMarkdownTags(content, magicString, filename, rootPath, deps) {
  for (const match of content.matchAll(tagRegex)) {
    const [fullMatch, attrsStr, body] = match;
    const attrs = parseAttrs(attrsStr ?? '');
    log.debug('Found markdown tag', filename);

    let htmlContent;

    // Body mode: <markdown>…inline source…</markdown>
    if (body !== undefined && !attrs.file) {
      const bodyText = dedent(body);
      htmlContent = renderMarkdown(bodyText, attrs.mode === 'faq');
      log.debug('Replaced inline markdown body');
    } else {
      let filePath;

      if (attrs.file) {
        // If the file attribute is provided, use it
        filePath = attrs.file;
      } else {
        // If no file attribute is provided, use the current file's basename with .md extension
        const baseName = basename(filename, extname(filename));
        filePath = `${baseName}.md`;
        log.debug(`No file attribute given, using default file '${filePath}'`);
      }

      const resolvedFilePath = resolve(rootPath || dirname(filename), filePath);
      log.debug('Processing markdown file', resolvedFilePath);
      deps.push(resolvedFilePath);

      try {
        const markdownContent = await readFile(resolvedFilePath, 'utf-8');
        htmlContent = renderMarkdown(markdownContent, attrs.mode === 'faq');

        // Apply regex replacement if 'pattern' and 'replacement' attributes are present
        if (attrs.pattern && attrs.replacement) {
          log.debug(`Applying regex replacement: ${attrs.pattern} -> ${attrs.replacement}`);
          htmlContent = applyReplacement(htmlContent, attrs.pattern, attrs.replacement);
        }

        log.debug('Replaced markdown tag with HTML', resolvedFilePath);
      } catch (err) {
        log.error(`Error processing markdown file: ${resolvedFilePath}`, err);
        continue;
      }
    }

    magicString.overwrite(match.index, match.index + fullMatch.length, htmlContent);
  }
}

function markdownPreprocessor(options = {}) {
  const { path: rootPath } = options;

  return {
    name: 'markdown',
    async markup({ content, filename }) {
      if (filename.includes('node_modules') && !filename.includes('node_modules/svultra/')) {
        return;
      }

      log.debug('Processing file', filename);
      const magicString = new MagicString(content);
      const deps = [];

      await processMarkdownTags(content, magicString, filename, rootPath, deps);

      log.debug('Finished processing file', filename);
      return {
        code: magicString.toString(),
        map:  magicString.generateMap({ source: filename, includeContent: true }),
        dependencies: deps
      };
    },
  };
}

export default markdownPreprocessor;
