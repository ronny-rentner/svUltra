import { test } from 'node:test';
import assert from 'node:assert/strict';

import attributeTransformer from '../src/preprocessors/attribute-transformer.js';

// Custom rules on top of the built-in defaults (tooltip, placement)
const extraAttrs = [
  ['ariaLabel', 'aria-label'],
];

// Run the preprocessor's markup() over a snippet and return the resulting code.
// markup() returns undefined when nothing was transformed, so fall back to input.
function transform(content, attributes = extraAttrs, filename = 'Test.svelte') {
  const pp = attributeTransformer({ attributes });
  const result = pp.markup({ content, filename });
  return result?.code ?? content;
}

test('quotes a static multi-word value (the regression this guards)', () => {
  const out = transform('<article tooltip="Autosaved 2 minutes ago"></article>');
  assert.match(out, /data-tooltip="Autosaved 2 minutes ago"/);
  // the old bug split the unquoted value into bogus boolean attributes
  assert.doesNotMatch(out, /\b(minutes|ago)=/);
});

test('quotes a single-word static value', () => {
  const out = transform('<div placement="bottom"></div>');
  assert.match(out, /data-placement="bottom"/);
});

test('keeps a shorthand expression intact', () => {
  const out = transform('<span {tooltip}></span>');
  assert.match(out, /data-tooltip="\{tooltip\}"/);
});

test('keeps a mustache expression intact', () => {
  const out = transform('<span tooltip={message}></span>');
  assert.match(out, /data-tooltip="\{message\}"/);
});

test('renames camelCase to hyphenated (ariaLabel -> aria-label)', () => {
  const out = transform('<button ariaLabel="Close dialog"></button>');
  assert.match(out, /aria-label="Close dialog"/);
  assert.doesNotMatch(out, /ariaLabel=/);
});

test('transforms several attributes on one element', () => {
  const out = transform('<div tooltip="a b" placement="top" ariaLabel="x y"></div>');
  assert.match(out, /data-tooltip="a b"/);
  assert.match(out, /data-placement="top"/);
  assert.match(out, /aria-label="x y"/);
});

test('skips components (capitalized tags are not elements)', () => {
  const out = transform('<Icon tooltip="hi there" />');
  assert.match(out, /tooltip="hi there"/);
  assert.doesNotMatch(out, /data-tooltip/);
});

test('supports a function replacement', () => {
  // lowercasing needs a function — '$1' capture references can't do it
  const out = transform('<span dataTooltip="a b"></span>', [[/^data([A-Z]\w*)/, (m, p1) => 'data-' + p1.toLowerCase()]]);
  assert.match(out, /data-tooltip="a b"/);
});

test('emits a replacement containing = verbatim as the whole attribute', () => {
  const out = transform('<button !enabled>x</button>', [[/!(.*)/, '$1={false}']]);
  assert.match(out, /<button enabled=\{false\}>/);
});

test('useDefaults:false drops the built-in rules', () => {
  const pp = attributeTransformer({ useDefaults: false, attributes: extraAttrs });
  const result = pp.markup({ content: '<div tooltip="a b"></div>', filename: 'Test.svelte' });
  assert.equal(result, undefined);
});

test('leaves unmatched attributes untouched', () => {
  const input = '<div title="hello world" class="x"></div>';
  assert.equal(transform(input), input);
});

test('skips files under node_modules', () => {
  const input = '<div tooltip="a b"></div>';
  const pp = attributeTransformer({ attributes: extraAttrs });
  const result = pp.markup({ content: input, filename: '/proj/node_modules/x.svelte' });
  assert.equal(result.code, input);
});

test('processes svultra itself under node_modules', () => {
  const pp = attributeTransformer({ attributes: extraAttrs });
  const result = pp.markup({ content: '<div tooltip="a b"></div>', filename: '/proj/node_modules/svultra/src/kit/components/C.svelte' });
  assert.match(result.code, /data-tooltip="a b"/);
});

test('returns undefined (no map churn) when nothing matches', () => {
  const pp = attributeTransformer({ attributes: extraAttrs });
  const result = pp.markup({ content: '<div class="x"></div>', filename: 'Test.svelte' });
  assert.equal(result, undefined);
});
