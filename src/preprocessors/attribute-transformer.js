// src/lib/preprocessors/attribute-transformer.js

import { parse } from 'svelte/compiler';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';

import { createScopedLogger } from '../logger.js';
const log = createScopedLogger('attribute-transformer', 'info');

function getAttributeValue(attr) {
  if (attr.value && attr.value.length > 0) {
    return attr.value.map(part => {
      if (part.type === 'Text') return part.data;
      else if (part.type === 'MustacheTag') return `{${part.expression.name}}`;
      else if (part.type === 'AttributeShorthand') return `{${part.expression.name}}`;
      return '';
    }).join('');
  }
  return '';
}

/**
 * Svelte preprocessor to transform attributes based on exact names or regex patterns.
 * @param {Object} config - Configuration object.
 * @param {Array} config.attributes - Array of [pattern, replacement] pairs for attribute transformation.
 * @param {Array<string>} config.excludeTags - List of tags to exclude from transformation.
 * @returns {Object} - Preprocessor object with a 'markup' function.
 */
export default function attributeTransformer(config = {}) {
  const attributePatterns = config.attributes || [];
  const excludeTags = config.excludeTags || [];

  return {
    markup({ content, filename }) {
      if (filename && filename.includes('node_modules')) return { code: content };

      log.debug(`Processing file: ${filename}`);
      let ast;
      try {
        ast = parse(content);
      } catch (error) {
        log.error(`Error parsing ${filename}:`, error);
        return { code: content };
      }

      const magicString = new MagicString(content);
      let hasTransformed = false;

      walk(ast.html, {
        enter(node) {
          if (node.type === 'Element') {
            const tagName = node.name;

            if (/^[a-zA-Z]/.test(tagName) && !excludeTags.includes(tagName)) {
              node.attributes.forEach(attr => {
                if (attr.type === 'Attribute') {
                  let transformedAttribute = null;
                  // Loop through each [pattern, replacement] pair
                  for (const [pattern, replacement] of attributePatterns) {
                    const newAttrName = attr.name.replace(pattern, replacement);
                    if (newAttrName !== attr.name) {
                      log.debug('Tag: ', tagName, pattern, replacement, attr.name, newAttrName);
                      let attrValue = getAttributeValue(attr);
                      // Include replacement exactly as specified, with or without `=`
                      transformedAttribute = replacement.includes('=')
                        ? newAttrName
                        : `${newAttrName}=${attrValue}`;
                      break;
                    }
                  }

                  if (transformedAttribute && transformedAttribute !== attr.name) {
                    log.debug('Overwrite: ', transformedAttribute);
                    magicString.overwrite(attr.start, attr.end, transformedAttribute);
                    hasTransformed = true;
                  }
                }
              });
            }
          }
        },
      });

      if (hasTransformed) {
        log.debug(`Transformations applied to ${filename}`);
        return {
          code: magicString.toString(),
          map: magicString.generateMap({ hires: true }),
        };
      }
    },
  };
}
