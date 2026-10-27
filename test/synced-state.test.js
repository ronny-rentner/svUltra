import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { compileModule } from 'svelte/compiler';

// Node needs the same rune compilation and browser exports that Vite supplies to consumers.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier, { ...context, conditions: [...context.conditions, 'browser'] });
  },
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url.endsWith('.svelte.js')) {
      return { ...result, source: compileModule(result.source.toString(), { filename: fileURLToPath(url), generate: 'client' }).js.code };
    }
    return result;
  },
});

// Replace only browser storage and event delivery; use the real Svelte compiler and runtime.
const saved = new Map();
const events = new EventEmitter();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, String(value)),
} });
globalThis.window = { addEventListener: (type, listener) => events.on(type, listener) };

const { createSyncedState } = await import('svultra/kit/stores');
const { tick } = await import('svelte');
hooks.deregister();

test('lays saved data over the defaults and uses the defaults when no value is saved', async t => {
  const defaults = { first: {}, second: {} };
  const state = createSyncedState(t.name, defaults);
  assert.deepEqual(state, defaults);
  await tick();
  assert.deepEqual(JSON.parse(saved.get(t.name)), defaults);

  saved.set('existing', '{"first":{"answer":5}}');
  const existing = createSyncedState('existing', defaults);
  assert.deepEqual(existing, { first: { answer: 5 }, second: {} });
  await tick();
});

test('persists nested edits, deletions and array mutations after the effect runs', async t => {
  const state = createSyncedState(t.name, { answers: { first: 1, second: 2 }, items: [] });
  await tick();
  const before = saved.get(t.name);
  const answers = state.answers;
  answers.first = 5;
  delete answers.second;
  state.items.push({ name: 'Aylin' });
  state.items[0].name = 'Updated';
  assert.equal(saved.get(t.name), before);
  await tick();
  assert.deepEqual(JSON.parse(saved.get(t.name)), { answers: { first: 5 }, items: [{ name: 'Updated' }] });
});

test('replaces object contents from another tab and restores defaults on removal', async t => {
  const state = createSyncedState(t.name, { initial: true });
  await tick();
  const reference = state;
  // The other tab stored the value before the event reaches this one
  saved.set(t.name, '{"answer":5}');
  events.emit('storage', { key: t.name, newValue: '{"answer":5}' });
  assert.equal(state, reference);
  assert.deepEqual(state, { answer: 5 });
  await tick();
  // Not written back: the other tab's entry stays as it wrote it, so the two tabs do not answer each other
  assert.equal(saved.get(t.name), '{"answer":5}');
  saved.delete(t.name);
  events.emit('storage', { key: t.name, newValue: null });
  assert.deepEqual(state, { initial: true });
  await tick();
  assert.equal(saved.get(t.name), undefined);
});

test('replaces root arrays with shorter arrays without trailing entries', async t => {
  const state = createSyncedState(t.name, [1, 2, 3]);
  await tick();
  saved.set(t.name, '[4]');
  events.emit('storage', { key: t.name, newValue: '[4]' });
  assert.deepEqual(state, [4]);
  await tick();
  assert.equal(saved.get(t.name), '[4]');
});

test('preserves current state when incoming JSON is unreadable', async t => {
  const state = createSyncedState(t.name, { answer: 5 });
  await tick();
  assert.throws(() => events.emit('storage', { key: t.name, newValue: '{' }), SyntaxError);
  assert.deepEqual(state, { answer: 5 });
  await tick();
  assert.equal(saved.get(t.name), '{"answer":5}');
});

test('can ignore incoming tab changes while continuing to persist local edits', async t => {
  const state = createSyncedState(t.name, { answer: 1 }, false);
  await tick();
  events.emit('storage', { key: t.name, newValue: '{"answer":2}' });
  assert.equal(state.answer, 1);
  state.answer = 3;
  await tick();
  assert.equal(saved.get(t.name), '{"answer":3}');
});
