import { readFile } from 'fs/promises';
import { resolve, dirname, basename, extname } from 'path';
import { marked, Marked } from 'marked';
import MagicString from 'magic-string';
import { parse } from 'svelte/compiler';
import { createScopedLogger } from '../logger.js';

const log = createScopedLogger('markdown', 'info');

const internalDomains = [];

const renderer = {
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

/**
 * Svelte preprocessor that looks for <markdown> tags, reads the associated
 * markdown file, applies regex replacements (if any), replaces the tag with compiled HTML,
 * and generates a source map. If no file attribute is provided, it uses the current file's basename with .md extension.
 */
async function processMarkdownTags(node, magicString, filename, rootPath) {
  if (node.type === 'Element' && node.name === 'markdown') {
    log.debug('Found markdown tag', filename);

    const fileAttr = node.attributes.find(attr => attr.name === 'file');
    const modeAttr = node.attributes.find(attr => attr.name === 'mode');
    const patternAttr = node.attributes.find(attr => attr.name === 'pattern');
    const replacementAttr = node.attributes.find(attr => attr.name === 'replacement');
    let filePath;

    if (fileAttr && fileAttr.value.length) {
      // If the file attribute is provided, use it
      filePath = fileAttr.value[0].data;
    } else {
      // If no file attribute is provided, use the current file's basename with .md extension
      const baseName = basename(filename, extname(filename));
      filePath = `${baseName}.md`;
      log.debug(`No file attribute given, using default file '${filePath}'`);
    }

    const resolvedFilePath = resolve(rootPath || dirname(filename), filePath);
    log.debug('Processing markdown file', resolvedFilePath);

    try {
      let markdownContent = await readFile(resolvedFilePath, 'utf-8');
      let htmlContent = renderMarkdown(markdownContent, modeAttr?.value[0]?.data == 'faq');

      // Apply regex replacement if 'pattern' and 'replacement' attributes are present
      if (patternAttr && replacementAttr) {
        const pattern = patternAttr.value[0].data;
        const replacement = replacementAttr.value[0].data;
        log.debug(`Applying regex replacement: ${pattern} -> ${replacement}`);
        htmlContent = applyReplacement(htmlContent, pattern, replacement);
      }



      magicString.overwrite(node.start, node.end, htmlContent);
      log.debug('Replaced markdown tag with HTML', resolvedFilePath);
    } catch (err) {
      log.error(`Error processing markdown file: ${resolvedFilePath}`, err);
    }
  }

  if (node.children && node.children.length) {
    for (const child of node.children) {
      await processMarkdownTags(child, magicString, filename, rootPath);
    }
  }
}

function markdownPreprocessor(options = {}) {
  const { path: rootPath } = options;

  return {
    async markup({ content, filename }) {
      if (filename.includes('node_modules')) {
        return;
      }

      log.debug('Processing file', filename);
      const ast = parse(content);
      const magicString = new MagicString(content);
      await processMarkdownTags(ast.html, magicString, filename, rootPath);

      const code = magicString.toString();
      const map = magicString.generateMap({ source: filename, includeContent: true });

      log.debug('Finished processing file', filename);
      return { code, map };
    },
  };
}

export default markdownPreprocessor;
