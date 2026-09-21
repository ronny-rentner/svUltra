import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';

import generateRoutesPlugin from '../src/kit/router/generateRoutes.js';

test('continues scanning when listed directories disappear', async (t) => {
  const root = path.resolve('test/fixtures/routes');
  const pagesDir = path.join(root, 'src/pages');
  t.mock.method(fs, 'readdir', async (dir) => {
    // Reproduce a temporary directory disappearing after its parent was listed.
    if (['.codex', 'gone'].includes(path.basename(dir))) {
      throw Object.assign(new Error(`ENOENT: scandir '${dir}'`), { code: 'ENOENT' });
    }
    const names = dir === pagesDir
      ? ['Home.svelte', '.Draft.svelte', '.codex', 'gone', 'guide']
      : ['index.svelte', '.Draft.svelte', '.codex'];
    return names.map(name => ({ name, isDirectory: () => !name.endsWith('.svelte') }));
  });
  t.mock.method(fs, 'readFile', async () => '');
  const write = t.mock.method(fs, 'writeFile', async () => {});
  const warn = t.mock.method(console, 'warn', () => {});

  await generateRoutesPlugin().configResolved({ root });

  // Dot-prefixed pages are included; directories missing at scan time are omitted.
  assert.equal(write.mock.calls[0].arguments[1],
    'export const routes = {\n' +
    '  "/home": () => import(\'.//pages/Home.svelte\'),\n' +
    '  "/.draft": () => import(\'.//pages/.Draft.svelte\'),\n' +
    '  "/guide": () => import(\'.//pages/guide/index.svelte\'),\n' +
    '  "/guide/.draft": () => import(\'.//pages/guide/.Draft.svelte\')\n' +
    '};\n');
  assert.equal(warn.mock.callCount(), 3);
});

test('fails initial generation when the pages root is missing', async (t) => {
  t.mock.method(fs, 'readdir', async () => {
    throw Object.assign(new Error('Pages root is missing'), { code: 'ENOENT' });
  });
  await assert.rejects(generateRoutesPlugin().configResolved({ root: path.resolve('test/fixtures/routes') }),
    { code: 'ENOENT' });
});

test('fails initial generation when a nested directory cannot be read', async (t) => {
  const root = path.resolve('test/fixtures/routes');
  const pagesDir = path.join(root, 'src/pages');
  t.mock.method(fs, 'readdir', async (dir) => {
    if (dir === pagesDir) {
      return [{ name: 'private', isDirectory: () => true }];
    }
    throw Object.assign(new Error('Cannot read directory'), { code: 'EACCES' });
  });
  await assert.rejects(generateRoutesPlugin().configResolved({ root }), { code: 'EACCES' });
});

test('reports a watcher scan failure and processes the next change', async (t) => {
  const root = path.resolve('test/fixtures/routes');
  const pagesDir = path.join(root, 'src/pages');
  // Initial generation succeeds, one watched scan fails, then a new page is discovered.
  const scans = [[], Object.assign(new Error('Cannot read pages'), { code: 'EACCES' }),
    [{ name: 'Home.svelte', isDirectory: () => false }]];
  t.mock.method(fs, 'readdir', async () => {
    const scan = scans.shift();
    if (scan instanceof Error) {
      throw scan;
    }
    return scan;
  });
  t.mock.method(fs, 'readFile', async () => 'export const routes = {\n\n};\n');
  const write = t.mock.method(fs, 'writeFile', async () => {});
  const error = t.mock.method(console, 'error', () => {});
  const watcher = new EventEmitter();
  const send = t.mock.fn();
  const plugin = generateRoutesPlugin();
  await plugin.configResolved({ root });
  plugin.configureServer({ watcher, moduleGraph: { getModuleById: () => null }, ws: { send } });

  watcher.emit('change', path.join(pagesDir, 'Home.svelte'));
  watcher.emit('add', path.join(pagesDir, 'Home.svelte'));
  // All file operations above are mocked promises; drain the queued scans before asserting.
  await setImmediate();

  assert.equal(error.mock.callCount(), 1);
  assert.match(error.mock.calls[0].arguments[0], /Failed to regenerate routes: Cannot read pages/);
  assert.equal(write.mock.callCount(), 1);
  assert.match(write.mock.calls[0].arguments[1], /"\/home"/);
  assert.deepEqual(send.mock.calls[0].arguments[0], { type: 'full-reload', path: '*' });
});
