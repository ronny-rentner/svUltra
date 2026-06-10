import syntaxSugar from './syntax-sugar.js';
import markdownPreprocessor from './markdown.js';
import attributeTransformer from './attribute-transformer.js';
import transformComponentStyles from './component-styles.js';
import classMergePreprocessor from './class-merge.js';

/**
 * The complete svUltra preprocessor chain in its required order. Kit
 * components are written in the svUltra dialect, so projects using the kit
 * need all of these; this preset makes the setup a one-liner:
 *
 *   import { svultraPreprocess } from 'svultra';
 *   export default { preprocess: svultraPreprocess({ replacements }) };
 *
 * @param {Array}  [options.replacements]  Extra syntaxSugar replacements, applied after the defaults.
 * @param {Object} [options.ignoreTags]    Tags syntaxSugar preserves from processing.
 * @param {Object} [options.markdown]      markdownPreprocessor options; the preprocessor is only added when set.
 * @param {Array}  [options.attributes]    Extra attributeTransformer [pattern, replacement] pairs.
 */
export default function svultraPreprocess(options = {}) {
  const { replacements, ignoreTags, markdown, attributes } = options;

  const chain = [
    // syntaxSugar needs to come first to restore proper Svelte syntax
    syntaxSugar(replacements, { ignoreTags }),
  ];

  if (markdown) {
    chain.push(markdownPreprocessor(markdown));
  }

  chain.push(
    attributeTransformer({ attributes }),
    transformComponentStyles(),
    classMergePreprocessor(),
  );

  return chain;
}
