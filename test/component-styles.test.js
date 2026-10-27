import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from 'svelte/compiler';

import transformComponentStyles from '../src/preprocessors/component-styles.js';

function run(content, filename) {
  const pp = transformComponentStyles();
  return pp.markup({ content, filename });
}

test('rewrites a component selector to a hashed :global class and injects it', async () => {
  const out = await run('<style>\nCard { color: red; }\n</style>\n<Card>hi</Card>', 'cs-basic.svelte');
  // Class is doubled in the selector (e.g. .Card-XXX.Card-XXX) to bump specificity
  // from (0,1,0) to (0,2,0) so consumer styles win over the component's internal
  // element+class rules. The DOM class added to the element is the single form.
  const m = out.code.match(/:global\(\.Card-([a-f0-9]{8})\.Card-\1\)/);
  assert.ok(m, 'expected a doubled hashed :global(.Card-XXX.Card-XXX) selector');
  assert.match(out.code, new RegExp(`<Card class="Card-${m[1]}">`));
  assert.ok(out.map, 'expected a source map');
});

test('merges the hashed class into an existing class attribute', async () => {
  const out = await run('<style>\nCard { color: red; }\n</style>\n<Card class="x">hi</Card>', 'cs-merge.svelte');
  assert.match(out.code, /<Card class="x Card-[a-f0-9]{8}">/);
});

test('applies the same hash to every usage of the component', async () => {
  const out = await run('<style>\nCard { color: red; }\n</style>\n<Card>a</Card>\n<Card>b</Card>', 'cs-multi.svelte');
  const hashes = [...out.code.matchAll(/Card-([a-f0-9]{8})/g)].map((x) => x[1]);
  assert.ok(hashes.length >= 2);
  assert.equal(new Set(hashes).size, 1); // all identical
});

test('leaves plain element selectors untouched', async () => {
  const out = await run('<style>\nCard { color: red; }\nspan { color: blue; }\n</style>\n<Card>hi</Card>', 'cs-plain.svelte');
  assert.match(out.code, /span \{ color: blue; \}/);
  assert.doesNotMatch(out.code, /:global\(\.span/);
});

test('does nothing when there are no component selectors', async () => {
  const out = await run('<style>\nspan { color: blue; }\n</style>\n<span>hi</span>', 'cs-none.svelte');
  assert.equal(out, undefined);
});

test('skips files under node_modules', async () => {
  const out = await run('<style>\nCard { color: red; }\n</style>\n<Card>hi</Card>', '/proj/node_modules/x.svelte');
  assert.equal(out, undefined);
});

test('processes svultra itself under node_modules', async () => {
  const out = await run('<style>\nCard { color: red; }\n</style>\n<Card>hi</Card>', '/proj/node_modules/svultra/src/kit/components/C.svelte');
  assert.match(out.code, /:global\(\.Card-[a-f0-9]{8}\.Card-[a-f0-9]{8}\)/);
});

test('preserves component styles following a global ancestor', async () => {
  const out = await run('<style>:global(.outside) Button { color: red; }</style><Button>Test</Button>', 'cs-global-ancestor.svelte');
  const compiled = compile(out.code, { filename: 'cs-global-ancestor.svelte' });
  assert.ok(!compiled.warnings.some(warning => warning.code === 'css_unused_selector'));
  assert.match(compiled.css.code, /color: red/);
});

test('preserves nested component selectors and leading combinators', async () => {
  for (const selector of ['> div', '+ div', '~ div', '> Button', '& > Button']) {
    const out = await run(`<style>Card { ${selector} { color: red; } }</style><Card><Button>Test</Button></Card>`, 'cs-nested.svelte');
    const compiled = compile(out.code, { filename: 'cs-nested.svelte' });
    assert.ok(!compiled.warnings.some(warning => warning.code === 'css_unused_selector'), selector);
    assert.match(compiled.css.code, /color: red/, selector);
  }
});
