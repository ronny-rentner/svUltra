/* Allow to style custom components.
 *
 * Limitation: Styles must start with the componen name.
 *
 */

import { parse } from 'svelte/compiler';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';
import postcss from 'postcss';
import crypto from 'crypto';

import selectorParser from 'postcss-selector-parser';

import { createScopedLogger } from '../logger.js';
const log = createScopedLogger('component-styles', 'info');

// Utility function to hash a string
function hashString(str) {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

// Map to store detailed component information
const componentHashesMap = new Map();

// Function to process nested rules for a given rule
function processNestedRules(rule) {
  // Walk nested rules (for `&.someclass` syntax) and apply transformations
  rule.walkRules(nestedRule => {
    nestedRule.selectors = nestedRule.selectors.map(nestedSelector => {
      // Ensure the nested selector gets the :global() transformation
      if (nestedSelector.startsWith('&')) {
        return `:global(${nestedSelector})`;
      }
      return nestedSelector;
    });
  });
}

/*
function processMatchedSelector(match, selector, rule, filename) {
  log.info('processMatchedSelector:', match[1], ' --- ', selector);
  const ruleContent = rule.toString();
  const componentName = match[1];
  const remainingSelector = match[2];
  const hash = hashString(ruleContent);

  // Ensure structure in the map
  if (!componentHashesMap.has(filename)) {
    componentHashesMap.set(filename, new Map());
  }
  const fileMap = componentHashesMap.get(filename);
  if (!fileMap.has(componentName)) {
    fileMap.set(componentName, []);
  }
  const componentList = fileMap.get(componentName);

  // Store detailed information in the list
  componentList.push({
    componentName,
    hash,
    fullSelector: selector,
    remainingSelector
  });

  log.info('Found custom component CSS rule:', selector);
  log.debug('Generated hash:', hash, 'for rule:', ruleContent);

  processNestedRules(rule);

  // Transform the selector to :global(.Component-${hash}${p2})
  return selector.replace(/([A-Z][a-zA-Z_-]*)(.*?)$/g, (match, p1, p2) => {
    return `:global(.${p1}-${hash}${p2})`;
  });
}
*/

function processMatchedSelector2(tagSelector, selector, rule, filename) {
  log.debug('processMatchedSelector2:', tagSelector, ' --- ', selector);
  const ruleContent = rule.toString();
  const componentName = tagSelector;
  const empty = '';
  const hash = hashString(ruleContent);

  // Ensure structure in the map
  if (!componentHashesMap.has(filename)) {
    componentHashesMap.set(filename, new Map());
  }
  const fileMap = componentHashesMap.get(filename);
  if (!fileMap.has(componentName)) {
    fileMap.set(componentName, []);
  }
  const componentList = fileMap.get(componentName);

  // Store detailed information in the list
  componentList.push({
    componentName,
    hash,
    fullSelector: selector,
    empty
  });

  log.debug('Found custom component CSS rule:', selector);
  log.debug('Generated hash:', hash, 'for rule:', ruleContent);

  processNestedRules(rule);

  return `.${componentName}-${hash}`;
}

const processSelectors = (selectors, rule, filename) => {
  return selectors.map(selector => {
    log.debug('Processing selector:', selector);

    /*
    const match = selector.match(/(?:^|\s)([A-Z][a-zA-Z_-]*)(.*?)$/);
    log.info('Match result:', match);
    */

    // Add this code to parse the selector and log the nodes
    const s = new MagicString(selector);
    let globalWrapperStarted = false;

    // Use selectorParser to identify component tags and replace them using MagicString
    selectorParser(selectorsAST => {
      selectorsAST.walk(node => {
        if (node.type === 'tag' && /^[A-Z]/.test(node.value)) {
          log.debug('selectorParser found custom component:', node.type, node.value, node.toString());

          const componentName = node.value;

          // Call processMatchedSelector2 to get the transformed class name
          let newSelector = processMatchedSelector2(componentName, selector, rule, filename);

          if (!globalWrapperStarted) {
            newSelector = `:global(${newSelector}`;
            globalWrapperStarted = true;
          }

          // Calculate the position of the component name in the selector string
          const startIndex = node.sourceIndex;
          const endIndex = startIndex + node.value.length;

          // Replace the component name with the transformed selector using MagicString
          s.overwrite(startIndex, endIndex, newSelector);
        }
      });
    }).processSync(selector);

    if (globalWrapperStarted) {
      // Append the closing ')'
      s.append(')');
    }

    selector = s.toString();
    log.debug('New updated selector: ', selector);
    return selector;

    /*
    if (match) {
      log.info('Selector matches component pattern.');
      selector = processMatchedSelector(match, selector, rule, filename);
      log.info('Original updated selector: ', selector);
    } else {
      log.info('Selector does not match component pattern.');
    }

    return selector;
    */
  });
};

// Custom PostCSS plugin to identify and transform component selectors
const customComponentPlugin = (filename) => ({
  postcssPlugin: 'postcss-custom-component',
  Once(root) {
    root.walkRules(rule => {
      // Process top-level rule selectors
      rule.selectors = processSelectors(rule.selectors, rule, filename);

      // Process nested rules if any
      //processNestedRules(rule);
    });
  }
});
customComponentPlugin.postcss = true;

// Function to process CSS and identify relevant rules
async function processCSS(cssContent, filename) {
  log.debug('Starting CSS processing with content length:', cssContent.length);
  let foundCustomComponent = false;

  try {
    //log.info('Processing: ', filename);
    //log.info('CSS content: ', cssContent);
    const result = await postcss([customComponentPlugin(filename)])
      .process(cssContent, { from: undefined });

    foundCustomComponent = componentHashesMap.has(filename);
    return { foundCustomComponent, transformedCSS: result.css };
  } catch (error) {
    console.error('Error processing CSS:', error);
    return { foundCustomComponent: false, transformedCSS: cssContent };
  }
}

// Function to identify and transform custom components in the markup
function processMarkup(ast, filename, magicString) {
  log.debug('Identifying custom components in markup for file:', filename);
  const fileMap = componentHashesMap.get(filename);

  if (!fileMap) {
    log.error('No custom components found in CSS for file:', filename);
    log.error('processMarkup() should not have been called');
    return;
  }

  log.debug('fileMap:', fileMap);

  walk(ast, {
    enter(node) {
      if (node.type === 'InlineComponent') {
        const componentName = node.name;

        if (fileMap.has(componentName)) {
          log.debug('Found custom component in markup:', componentName);

          const componentList = fileMap.get(componentName);

          let added = false;

          // Iterate over componentList to apply the correct hash
          componentList.forEach(item => {
            log.debug('Processing item:', JSON.stringify(item));
            let classAttribute = node.attributes.find(attr => attr.name === 'class');
            log.debug('classAttribute: ', classAttribute);
            if (classAttribute) {
              // Reconstruct the class attribute value
              const existingClasses = classAttribute.value.map(part => {
                return magicString.original.slice(part.start, part.end);
              });

              let newClasses = new Set(existingClasses);

              // Iterate over each item in the component list
              componentList.forEach(item => {
                log.debug('Looking at component item: ', item);
                // Apply the base component class if there are no additional selectors (excluding pseudo-elements)
                //if (!item.remainingSelector || item.remainingSelector.startsWith('::')) {
                  // No additional selectors or only pseudo-elements, apply base component class
                  newClasses.add(`${componentName}-${item.hash}`);
                //} else {
                  // Split remainingSelector by space to handle direct and descendant selectors
                  //const [directPart, ...descendantParts] = item.remainingSelector.split(' ', 2);

                  // Check if directPart classes apply to the component itself
                  /*
                  if (directPart) {
                    const directClasses = directPart.split('.').filter(Boolean);

                    // Ensure that all classes in directPart exist on the component
                    const hasAllDirectClasses = directClasses.every(cls => existingClasses.includes(cls));

                    if (hasAllDirectClasses) {
                      newClasses.add(`${componentName}-${item.hash}`);
                    }
                  } else {
                  */
                  //  newClasses.add(`${componentName}-${item.hash}`);
                  /*
                  }
                  */
                //}
              });

              // Apply all accumulated classes
              magicString.overwrite(classAttribute.start, classAttribute.end, `class="${Array.from(newClasses).join(' ')}"`);
            } else {
              if (!added) {
                // If no class attribute exists yet, apply base component class (assuming itemList has base component hash)
                let newClasses = new Set([`${componentName}-${componentList[0].hash}`]);
                componentList.forEach(item => {
                  //We do not need to check the remainingSelector as this will happen in the browser itself if they're
                  //added dynamically
                  //if (!item.remainingSelector || item.remainingSelector.startsWith('::')) {
                    newClasses.add(`${componentName}-${item.hash}`);
                  //}
                });
                const insertPosition = node.start + `<${componentName}`.length;
                magicString.appendLeft(insertPosition, ` class="${Array.from(newClasses).join(' ')}"`);

                added = true;
              }
            }
          });
        }
      }
    }
  });
}

// Function to process the markup and CSS
async function processFile({ html, css, js, filename, originalContent }) {
  let foundCustomComponent = false;
  let transformedCSS = '';

  // Clear component hashes for the current file to avoid accumulation
  componentHashesMap.delete(filename);

  if (css) {
    const cssResult = await processCSS(css.content.styles, filename);
    foundCustomComponent = cssResult.foundCustomComponent;
    transformedCSS = cssResult.transformedCSS;
  }

  // If no relevant custom component CSS rules were found, return original content
  if (!foundCustomComponent) {
    log.debug('No custom component selectors found in CSS, skipping further processing');
    return;
  }

  log.debug('Transformed CSS:\n', transformedCSS, '\n');

  const magicString = new MagicString(originalContent);

  // Replace the original <style> block with the transformed CSS
  if (css) {
    magicString.overwrite(css.start, css.end, `<style>${transformedCSS}</style>`);
  }

  // Identify and transform custom components in the markup
  processMarkup(html, filename, magicString);

  // Generate the final content including script, styles, and markup
  const finalContent = magicString.toString();

  log.debug('Final transformed content for file:', filename, '\n', finalContent, '\n');

  //if (filename.includes('TermsDialog.svelte')) {  // Focus only on TermsDialog.svelte
  //  console.log(`Processing TermsDialog.svelte - Source map:`, magicString.generateMap({ hires: true }));  // Log the source map
  //}

  return {
    code: finalContent,
    map: magicString.generateMap({ hires: true })
  };
}

// Main preprocessor function
function transformComponentStyles() {
  return {
    markup({ content, filename }) {
      if (filename.includes('node_modules')) {
        return;
      }

      log.debug('Processing file:', filename);

      // Parse the Svelte component content into an AST
      const svelteAST = parse(content);

      // Process the markup and styles
      return processFile({ ...svelteAST, filename, originalContent: content });
    }
  };
}

export default transformComponentStyles;
