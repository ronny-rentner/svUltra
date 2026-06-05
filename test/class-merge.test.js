import { test } from 'node:test';
import assert from 'node:assert/strict';

import classMergePreprocessor from '../src/preprocessors/class-merge.js';

function run(content, filename = 'Test.svelte') {
  const pp = classMergePreprocessor();
  return pp.markup({ content, filename });
}

test('merges a static class with a class: directive', () => {
  const out = run('<Button class="a" class:b={x} />').code;
  assert.match(out, /class="a \{x \? 'b' : ''\}"/);
  assert.doesNotMatch(out, /class:b/); // original directive removed
});

test('merges a spread source with a static class', () => {
  // the spread class is read as `{ {...rest}?.class }` (object spread inside a mustache)
  const out = run('<Button {...rest} class="a" />').code;
  assert.match(out, /class="\{\{\.\.\.rest\}\?\.class\} a"/);
});

test('processes a lone class: directive', () => {
  const out = run('<Button class:b={x} />').code;
  assert.match(out, /class="\{x \? 'b' : ''\}"/);
});

test('skips a component with only a single static class (nothing to merge)', () => {
  assert.equal(run('<Button class="a" />'), undefined);
});

test('skips files under node_modules', () => {
  const pp = classMergePreprocessor();
  assert.equal(
    pp.markup({ content: '<Button class="a" class:b={x} />', filename: '/proj/node_modules/x.svelte' }),
    undefined,
  );
});
