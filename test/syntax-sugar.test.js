import { test } from 'node:test';
import assert from 'node:assert/strict';

import syntaxSugar from '../src/preprocessors/syntax-sugar.js';

function run(content, replacements, filename = 'Test.svelte') {
  const pp = syntaxSugar(replacements);
  const result = pp.markup({ content, filename });
  return result?.code ?? content;
}

// Like run(), but lets a test pass the second `options` argument.
function runWith(content, replacements, options, filename = 'Test.svelte') {
  const pp = syntaxSugar(replacements, options);
  const result = pp.markup({ content, filename });
  return result?.code ?? content;
}

test('applies a string replacement', () => {
  assert.equal(run('{if a}', [['{if ', '{#if ']]), '{#if a}');
});

test('applies multiple string and regex replacements', () => {
  const out = run('{if a}{each b}FOO', [
    ['{if ', '{#if '],
    ['{each ', '{#each '],
    [/\bFOO\b/g, 'BAR'],
  ]);
  assert.equal(out, '{#if a}{#each b}BAR');
});

test('escapes braces and tags inside a registered ignore tag so replacements skip it', () => {
  const out = runWith('<CodeExample>{if a}<div></div></CodeExample>', [['{if ', '{#if ']], {
    ignoreTags: { 'CodeExample': { processTag: true, escapeCurlyBraces: true } },
  });
  assert.match(out, /&lbrace;if a&rbrace;/);
  assert.match(out, /&lt;div&gt;&lt;\/div&gt;/);
  assert.doesNotMatch(out, /\{#if/); // replacement must not reach escaped content
});

test('preserves <svultra:ignore> content verbatim', () => {
  const out = run('<svultra:ignore>{if a}</svultra:ignore>', [['{if ', '{#if ']]);
  assert.match(out, /<svultra:ignore>\{if a\}<\/svultra:ignore>/);
  assert.doesNotMatch(out, /\{#if/);
});

test('preserves //<svultra:ignore>…//</svultra:ignore> fenced regions in <script>', () => {
  // The same tag markers, but commented out so the script stays valid JS.
  const src = [
    '<script>',
    "  const before = '@dark';",
    '  //<svultra:ignore>',
    "  const rules = [['@dark', ':root[data-theme=\"dark\"]']];",
    '  //</svultra:ignore>',
    '</script>',
  ].join('\n');
  const out = run(src, [['@dark', ':root[data-theme="dark"]']]);
  // outside the fence: rewritten
  assert.match(out, /const before = ':root\[data-theme="dark"\]'/);
  // inside the fence: untouched
  assert.match(out, /const rules = \[\['@dark', ':root\[data-theme="dark"\]'\]\]/);
  // fence markers survive as comments
  assert.match(out, /\/\/<svultra:ignore>/);
  assert.match(out, /\/\/<\/svultra:ignore>/);
});

test('a custom ignore tag merges with the built-in svultra:ignore', () => {
  const out = runWith(
    '<svultra:ignore>{if a}</svultra:ignore><Code>{if b}</Code>',
    undefined,
    { ignoreTags: { 'Code': { processTag: true, escapeCurlyBraces: true } } }
  );
  // the built-in default still applies despite a custom ignoreTags being passed
  assert.match(out, /<svultra:ignore>\{if a\}<\/svultra:ignore>/);
  // the custom tag's content is escaped
  assert.match(out, /<Code>&lbrace;if b&rbrace;<\/Code>/);
  assert.doesNotMatch(out, /\{#if/);
});

test('rejects an ignore-tag name that is unsafe for a regex', () => {
  assert.throws(
    () => syntaxSugar([], { ignoreTags: { 'bad tag!': { processTag: false } } }),
    /Invalid tag name/
  );
});

test('skips files under node_modules', () => {
  const pp = syntaxSugar([['{if ', '{#if ']]);
  assert.equal(pp.markup({ content: '{if a}', filename: '/proj/node_modules/x.svelte' }), undefined);
});

test('applies the built-in default replacements with no config', () => {
  const out = run('{if a}{each items as i}{const x = 1}{/each}{/if}', undefined);
  assert.match(out, /\{#if a\}/);
  assert.match(out, /\{#each items as i\}/);
  assert.match(out, /\{@const x = 1\}/);
});

test('expands every default block-syntax shorthand (default)', () => {
  const cases = [
    ['{snippet row(x)}', '{#snippet row(x)}'],
    ['{if a}',           '{#if a}'],
    ['{else}',           '{:else}'],
    ['{else if a}',      '{:else if a}'],
    ['{elif a}',         '{:else if a}'],
    ['{elseif a}',       '{:else if a}'],
    ['{await p}',        '{#await p}'],
    ['{then v}',         '{:then v}'],
    ['{catch e}',        '{:catch e}'],
    ['{each xs as x}',   '{#each xs as x}'],
    ['{render row()}',   '{@render row()}'],
    ['{html s}',         '{@html s}'],
    ['{try}',            '{#try}'],
    ['{const x = 1}',    '{@const x = 1}'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(run(input, undefined), expected, `for input ${input}`);
  }
});

test('expands multiple constants in one tag (default)', () => {
  assert.equal(run('{const a = 1, b = 2}', undefined), '{@const a = 1} {@const b = 2}');
});

test('prepends svelte-ignore to a bare meta() call (default)', () => {
  assert.equal(
    run('  meta({ title: "X" });', undefined),
    '  // svelte-ignore state_referenced_locally\n  meta({ title: "X" });'
  );
});

test('does not double-annotate an already-ignored meta() call (default)', () => {
  const src = '  // svelte-ignore state_referenced_locally\n  meta({ title: "X" });';
  assert.equal(run(src, undefined), src);
});

test('does not annotate a meta function declaration or a destructure (default)', () => {
  assert.equal(run('export function meta(opts) {}', undefined), 'export function meta(opts) {}');
  assert.equal(run('  let { meta } = $props();', undefined), '  let { meta } = $props();');
});

test('rewrites the store shorthand on components (default)', () => {
  assert.equal(run('<Comp {$user} />', undefined), '<Comp user={$user} />');
});

test('shorthands keep an open tag open and a self-closing tag self-closing (default)', () => {
  // Regression: the replacement must not force `/>` onto an open tag.
  assert.equal(run('<p style:{color}>x</p>', undefined), '<p style:color={color}>x</p>');
  assert.equal(run('<input bind:{value} />', undefined), '<input bind:value={value} />');
});

test('shorthands preserve surrounding attributes and spreads (default)', () => {
  assert.equal(
    run('<img src={u} style:{width} {...rest} />', undefined),
    '<img src={u} style:width={width} {...rest} />'
  );
  assert.equal(
    run('<input {name} bind:{checked} {onchange} />', undefined),
    '<input {name} bind:checked={checked} {onchange} />'
  );
});

test('rewrites Svelte 4 slot="name" on a component child to a named snippet (default)', () => {
  assert.equal(
    run('<Card><IconWithLabel slot="header" icon={oneIcon}>Hello</IconWithLabel></Card>', undefined),
    '<Card>{#snippet header()}<IconWithLabel icon={oneIcon}>Hello</IconWithLabel>{/snippet}</Card>'
  );
});

test('rewrites slot="name" on a self-closing component (default)', () => {
  assert.equal(
    run('<Card><Icon slot="header" icon={oneIcon} /></Card>', undefined),
    '<Card>{#snippet header()}<Icon icon={oneIcon} />{/snippet}</Card>'
  );
});

test('rewrites <svelte:fragment slot="name"> by dropping the wrapper (default)', () => {
  assert.equal(
    run('<Card><svelte:fragment slot="header">Hello {name}</svelte:fragment></Card>', undefined),
    '<Card>{#snippet header()}Hello {name}{/snippet}</Card>'
  );
});

test('slot rewrite preserves other attributes on the component (default)', () => {
  assert.equal(
    run('<Card><Btn slot="action" type="submit" disabled>OK</Btn></Card>', undefined),
    '<Card>{#snippet action()}<Btn type="submit" disabled>OK</Btn>{/snippet}</Card>'
  );
});

test('slot rewrite wraps lowercase HTML tags in a named snippet', () => {
  const out = run('<Card><span slot="header">Hi</span></Card>', undefined);
  assert.equal(out, '<Card>{#snippet header()}<span>Hi</span>{/snippet}</Card>');
});

test('slot rewrite keeps the full body of nested same-name tags', () => {
  assert.equal(
    run('<Card slot="header">A<Card>B</Card>C</Card>', undefined),
    '{#snippet header()}<Card>A<Card>B</Card>C</Card>{/snippet}'
  );
});

test('slot rewrite survives `>` inside attribute expressions', () => {
  assert.equal(
    run('<Card><Btn slot="action" onclick={() => x > 1}>OK</Btn></Card>', undefined),
    '<Card>{#snippet action()}<Btn onclick={() => x > 1}>OK</Btn>{/snippet}</Card>'
  );
});

test('rewrites let: on a component to a children snippet parameter', () => {
  assert.equal(
    run('<MediaQuery query="(max-width: 768px)" let:matches>{if matches}M{/if}</MediaQuery>', undefined),
    '<MediaQuery query="(max-width: 768px)">{#snippet children(matches)}{#if matches}M{/if}{/snippet}</MediaQuery>'
  );
});

test('slot and let: combine into snippet name and parameters', () => {
  assert.equal(
    run('<List><div slot="item" let:thing>{thing}</div></List>', undefined),
    '<List>{#snippet item(thing)}<div>{thing}</div>{/snippet}</List>'
  );
});

test('skips node_modules files except svultra itself', () => {
  assert.equal(
    run('{if a}x{/if}', undefined, '/p/node_modules/foo/C.svelte'),
    '{if a}x{/if}'
  );
  assert.equal(
    run('{if a}x{/if}', undefined, '/p/node_modules/svultra/src/kit/components/C.svelte'),
    '{#if a}x{/if}'
  );
});

test('appends custom replacements after the defaults', () => {
  // Default turns {if into {#if; the custom one still fires on FOO.
  const out = run('{if a}FOO', [[/\bFOO\b/g, 'BAR']]);
  assert.equal(out, '{#if a}BAR');
});

test('useDefaults:false drops the defaults, applying only custom replacements', () => {
  // No default expands {if, so it survives untouched; only ToKen is replaced.
  const out = runWith('{if a}ToKen', [['ToKen', 'done']], { useDefaults: false });
  assert.equal(out, '{if a}done');
});
