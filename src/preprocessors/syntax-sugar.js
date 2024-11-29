import { createScopedLogger } from '../logger.js';

const log = createScopedLogger('syntax-sugar', 'info');

export default function syntaxSugar(replacements = []) {
  return {
    markup({ content, filename }) {
      if (filename.includes('node_modules')) {
        return;
      }

      //if (!filename.includes('AISearch.svelte')) {
      //  return { code: content };
      //}

      log.debug('Running syntaxSugar preprocessor', filename);

      // Apply each replacement sequentially
      replacements.forEach(([searchValue, replaceValue]) => {
        //log.debug(`Replacing "${searchValue}" with "${replaceValue}"`);
        if (typeof searchValue === 'string') {
          // String replacement
          content = content.split(searchValue).join(replaceValue);
        } else if (searchValue instanceof RegExp) {
          // Regex replacement
          content = content.replace(searchValue, replaceValue);
        }
      });

      //if (filename.includes('Layout.svelte')) {
      //  log.info('Layout', content);
      //}

      // Return modified content (no need for MagicString, but source map isn't handled here)
      return {
        code: content,
      };
    },
  };
}
