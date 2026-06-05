import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import markdownPreprocessor from '../src/preprocessors/markdown.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function run(content, filename = 'Test.svelte') {
  const pp = markdownPreprocessor({ path: fixtures });
  return pp.markup({ content, filename });
}

test('inlines a markdown file as rendered HTML', async () => {
  const out = await run('<article><markdown file="sample.md" /></article>');
  assert.match(out.code, /<h1>Hello<\/h1>/);
  assert.match(out.code, /<strong>bold<\/strong>/);
  assert.doesNotMatch(out.code, /<markdown/); // tag replaced
});

test('keeps the surrounding markup', async () => {
  const out = await run('<article><markdown file="sample.md" /></article>');
  assert.match(out.code, /^<article>/);
  assert.match(out.code, /<\/article>$/);
});

test('reports the markdown file as a build dependency', async () => {
  const out = await run('<article><markdown file="sample.md" /></article>');
  assert.ok(Array.isArray(out.dependencies));
  assert.ok(out.dependencies.some((d) => d.endsWith('sample.md')));
});

test('marks external links with target=_blank', async () => {
  const out = await run('<article><markdown file="sample.md" /></article>');
  assert.match(out.code, /<a href="https:\/\/example\.com"[^>]*target="_blank"/);
});

test('skips files under node_modules', async () => {
  const pp = markdownPreprocessor({ path: fixtures });
  const out = await pp.markup({ content: '<markdown file="sample.md" />', filename: '/proj/node_modules/x.svelte' });
  assert.equal(out, undefined);
});
