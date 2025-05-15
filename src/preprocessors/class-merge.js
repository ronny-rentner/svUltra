import { walk } from 'estree-walker';
import { parse } from 'svelte/compiler';
import MagicString from 'magic-string';

import { createScopedLogger } from '../logger.js';

//Change log level to 'debug' to see the transformations
//const log = createScopedLogger('class-merge', 'debug');

const log = createScopedLogger('class-merge', 'info');

// Function to get the full line from a given position
function getFullLine(content, position) {
  const startOfLine = content.lastIndexOf('\n', position - 1);
  const endOfLine = content.indexOf('\n', position);
  return content.slice(startOfLine + 1, endOfLine !== -1 ? endOfLine : content.length);
}

function getFullLineNew(magicString, position) {
  const originalContent = magicString.original;
  const startOfLine = originalContent.lastIndexOf('\n', position - 1);
  const endOfLine = originalContent.indexOf('\n', position);
  const lineStart = startOfLine + 1;
  const lineEnd = endOfLine !== -1 ? endOfLine : originalContent.length;

  const fullLineBefore = originalContent.slice(lineStart, lineEnd);
  const fullLineAfter = magicString.slice(lineStart, lineEnd);

  return { fullLineBefore, fullLineAfter };
}


// Function to log the full line before and after the modification
function logLineModification(fullLineBefore, fullLineAfter) {
  log.debug(`Full line before: ${fullLineBefore}\n           after: ${fullLineAfter}`);
}

// Function to find the actual closing bracket ">" of the tag
function findTagClosingPosition(node, content) {
  let searchStart = node.start;
  for (const attr of node.attributes) {
    searchStart = Math.max(searchStart, attr.end);
  }

  let closingBracketPos = content.indexOf('>', searchStart);
  if (content[closingBracketPos - 1] === '/') {
    closingBracketPos -= 1;
  }

  return closingBracketPos;
}

export default function classMergePreprocessor() {
  return {
    markup({ content, filename }) {
      if (filename.includes('node_modules')) {
        //log.debug('Skipping vendor file:', filename);
        return;
      }

      log.debug(`Processing: ${filename}`);

      const ast = parse(content);
      const magicString = new MagicString(content);

      let hasTransformed = false;
      let cumulativeOffset = 0;

      //hasTransformed = true;

      walk(ast, {
        enter(node) {
          if (node.type === 'InlineComponent') {
            log.debug(`Found InlineComponent: <${node.name}>`);

            const hasClassAttribute = node.attributes.some(attr => (attr.type === 'Attribute' && attr.name === 'class'));
            const hasClassDirective = node.attributes.some(attr => attr.type === 'Class');
            const hasSpreadOperator = node.attributes.some(attr => attr.type === 'Spread');

            const conditionsMet = [hasClassAttribute, hasClassDirective, hasSpreadOperator].filter(Boolean).length;

            //log.debug('attr:', node.attributes);
            //log.debug('attr:', hasClassAttribute, hasClassDirective, hasSpreadOperator);

            if (conditionsMet < 2 && !hasClassDirective) {
              log.debug(`  - Less than two conditions met, skipping.`);
              return;
            }

            let staticClassAttr = '';
            const classDirectives = [];
            const spreadAttributes = [];

            node.attributes.forEach(attr => {
              if (attr.type === 'Class') {
                log.debug(`  - Found class directive: ${attr.name}`);
                classDirectives.push(attr);
              } else if (attr.type === 'Attribute' && attr.name === 'class') {
                staticClassAttr = attr.value.map(part => magicString.original.slice(part.start, part.end).trim()).join(' ');

                log.debug(`  - Found static class attribute: "${staticClassAttr}"`);
              } else if (attr.type === 'Spread') {
                spreadAttributes.push(attr);
                log.debug(`  - Found spread attribute`);
              }
            });

            if (classDirectives.length > 0 || spreadAttributes.length > 0 || staticClassAttr) {
              hasTransformed = true;
              let classString = staticClassAttr;

              // Handle each spread attribute individually
              spreadAttributes.forEach(spreadAttr => {
                // Capture the entire spread expression
                //const spreadExpression = magicString.snip(spreadAttr.expression.start, spreadAttr.expression.end).toString();
                const spreadExpression = content.slice(spreadAttr.start, spreadAttr.end);

                log.debug(`spreadExpression: ${spreadExpression}`);

                //const spreadClassHandling = `{${spreadExpression}?.class ? ${spreadExpression}?.class + ' ' : ''}`;
                const spreadClassHandling = `{${spreadExpression}?.class}`;
                log.debug(`  - Handling complex spread attribute: ${spreadExpression}`);
                classString = `${spreadClassHandling} ${classString}`.trim();
              });

              // Generate class strings from class directives
              classString += classDirectives.map(attr => {
                const className = attr.name;
                const condition = attr.expression
                  ? `${magicString.snip(attr.expression.start, attr.expression.end).toString()}`
                  : 'true';
                log.debug(`  - Generated class condition: ${condition} ? '${className}' : ''`);
                return ` {${condition} ? '${className}' : ''}`;
              }).join('');

              // Remove the original class directives and static class attributes
              node.attributes.forEach(attr => {
                if (attr.type === 'Class' || (attr.type === 'Attribute' && attr.name === 'class')) {
                  log.debug(`  - Removing original attribute: ${attr.name}`);
                  magicString.remove(attr.start, attr.end);
                  cumulativeOffset -= (attr.end - attr.start);
                }
              });

              // Find the actual closing ">" of the tag
              const insertionPoint = findTagClosingPosition(node, content);

              // Log the full line before modification
              const fullLineBefore = getFullLine(content, insertionPoint);

              const insertedText = ` class="${classString.trim()}"`;
              // Insert the new class attribute at the correct position
              magicString.appendRight(insertionPoint, insertedText);
              cumulativeOffset += insertedText.length;

              // Log the full line after modification
              const updatedContent = magicString.toString();
              const fullLineAfter = getFullLine(updatedContent, insertionPoint + cumulativeOffset);
              logLineModification(fullLineBefore, fullLineAfter);
            }
          }
        }
      });

      if (hasTransformed) {
        const finalCode = magicString.toString();

        return {
          code: finalCode,
          map: magicString.generateMap({ source: filename, hires: true })
        };
      }
    }
  };
}
