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

test('keeps local and protocol-handler links in the default target', async () => {
  const cases = [
    { href: '#section', target: '' },
    { href: 'about', target: '' },
    { href: './about', target: '' },
    { href: '../about', target: '' },
    { href: '/about', target: '' },
    { href: '?page=2', target: '' },
    { href: 'mailto:hello@example.com', target: '' },
    { href: 'tel:+4930123456', target: '' },
    { href: 'https://example.com/about', target: ' target="_blank"' },
    { href: 'http://example.com/about', target: ' target="_blank"' },
    { href: 'HTTPS://example.com/about', target: ' target="_blank"' },
    { href: '//example.com/about', target: ' target="_blank"' },
  ];
  // Standalone files and inline tags must apply the same link-target policy.
  for (const { href, target } of cases) {
    const source = `[About](${href})`;
    const standalone = await run(source, 'Article.md');
    const inline = await run(`<markdown>${source}</markdown>`);
    assert.equal(standalone.code, `<p><a href="${href}"${target}>About</a></p>\n`, href);
    assert.equal(inline.code, `<p><a href="${href}"${target}>About</a></p>\n`, href);
  }
});

test('renders standalone markdown as Svelte markup', async () => {
  const source = '---\ntitle: From frontmatter\n---\n\n# Hello\n\nText with **bold**.';
  const out = await run(source, path.join(fixtures, 'article.md'));
  assert.match(out.code, /<h1>Hello<\/h1>/);
  assert.match(out.code, /<strong>bold<\/strong>/);
  assert.doesNotMatch(out.code, /From frontmatter/);
});

test('applies Marked options independently to each preprocessor', async () => {
  const withBreaks = markdownPreprocessor({ path: fixtures, breaks: true });
  const withoutBreaks = markdownPreprocessor({ path: fixtures, breaks: false });
  const source = 'First line\nSecond line';
  const inputs = [
    { content: source, filename: 'Article.md' },
    { content: '<markdown>' + source + '</markdown>', filename: 'Test.svelte' },
    { content: '<markdown file="line-breaks.md" />', filename: 'Test.svelte' },
    { content: '<markdown mode="faq">## Question\n\n' + source + '</markdown>', filename: 'FAQ.svelte' },
  ];
  // Alternating configurations must retain their own line-break setting in every input form.
  for (const input of inputs) {
    assert.match((await withBreaks.markup(input)).code, /<p>First line<br>Second line<\/p>/, input.content);
    assert.match((await withoutBreaks.markup(input)).code, /<p>First line\nSecond line<\/p>/, input.content);
  }
});

test('preserves a single literal asterisk without a visible backslash', async () => {
  const cases = [
    {
      source: 'A single * marks a required field.',
      expected: 'A single * marks a required field.',
    },
    {
      source: 'A single * marks **required** fields and *important* notes.',
      expected: 'A single * marks <strong>required</strong> fields and <em>important</em> notes.',
    },
    {
      source: '**Required** fields * need a value; *optional* fields do not.',
      expected: '<strong>Required</strong> fields * need a value; <em>optional</em> fields do not.',
    },
    {
      source: 'Read **every** field and _each_ note*.',
      expected: 'Read <strong>every</strong> field and <em>each</em> note*.',
    },
    {
      source: 'The **required * field** needs a value.',
      expected: 'The <strong>required * field</strong> needs a value.',
    },
    {
      source: 'The *required * field* needs a value.',
      expected: 'The <em>required * field</em> needs a value.',
    },
    {
      source: '[Wann braucht mein Startup eine*n CFO – und was bis dahin?](https://example.com/interview)',
      expected: '<a href="https://example.com/interview" target="_blank">Wann braucht mein Startup eine*n CFO – und was bis dahin?</a>',
    },
    {
      source: '[Wann braucht mein Startup eine&#42;n CFO – und was bis dahin?](https://example.com/interview)',
      expected: '<a href="https://example.com/interview" target="_blank">Wann braucht mein Startup eine&#42;n CFO – und was bis dahin?</a>',
    },
    {
      source: '[Wann braucht mein Startup eine\\*n CFO – und was bis dahin?](https://example.com/interview)',
      expected: '<a href="https://example.com/interview" target="_blank">Wann braucht mein Startup eine*n CFO – und was bis dahin?</a>',
    },
  ];
  // Both input forms must render inline Markdown, including escapes inside link labels.
  for (const { source, expected } of cases) {
    const standalone = await run(source, 'Article.md');
    const inline = await run(`<markdown>${source}</markdown>`);
    assert.equal(standalone.code, `<p>${expected}</p>\n`, source);
    assert.equal(inline.code, `<p>${expected}</p>\n`, source);
  }
});

test('skips files under node_modules', async () => {
  const pp = markdownPreprocessor({ path: fixtures });
  const out = await pp.markup({ content: '<markdown file="sample.md" />', filename: '/proj/node_modules/x.svelte' });
  assert.equal(out, undefined);
});

test('processes svultra itself under node_modules', async () => {
  const pp = markdownPreprocessor({ path: fixtures });
  const out = await pp.markup({ content: '<markdown file="sample.md" />', filename: '/proj/node_modules/svultra/src/kit/components/C.svelte' });
  assert.match(out.code, /<h1>Hello<\/h1>/);
});
