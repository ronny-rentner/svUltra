import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';

import generateMarkdownIndexPlugin, { generateMarkdownIndexEntries } from '../src/kit/markdown/generateIndex.js';

// Unquoted YAML dates reach entry generation as Date objects.
const unquotedFrontmatterDate = new Date('2026-09-21');

async function setup(t, files, options = {}) {
  const root = path.resolve('test/fixtures/markdown-index');
  const directory = path.join(root, 'articles');
  // File events and file contents are independent, as with Vite's directory watcher.
  const scan = t.mock.method(fs, 'readdir', async () => Object.keys(files).map(name => ({
    name, isFile: () => typeof files[name] === 'string',
  })));
  t.mock.method(fs, 'readFile', async file => {
    const name = path.basename(file);
    if (!(name in files)) throw Object.assign(new Error(`Missing ${name}`), { code: 'ENOENT' });
    return files[name];
  });
  const write = t.mock.method(fs, 'writeFile', async (file, content) => {
    files[path.basename(file)] = content;
  });
  const plugin = generateMarkdownIndexPlugin({ inputDirs: ['./articles'], ...options });
  await plugin.configResolved({ root });
  const watcher = new EventEmitter();
  plugin.configureServer({ watcher });
  return { directory, watcher, scan, write };
}

test('extracts Markdown index metadata', async (t) => {
  const inputs = [
    { id: '1', source: '', skipped: true },
    {
      id: '2',
      source: 'Dr. Ada builds **finance** with [teams](https://example.com).\n\nNext paragraph.',
      expected: { id: '2', title: 'Dr. Ada builds finance with teams.', excerpt: 'Next paragraph.' },
    },
    { id: '3', source: ' \n\n\t ', skipped: true },
    { id: '4', source: 'Word', expected: { id: '4', title: 'Word', excerpt: '' } },
    {
      id: '5',
      source: 'Diese Einführung erklärt, wie Teams bessere Entscheidungen treffen und nutzt z.B. Forecasts als Beispiel. Danach kommt Reporting.',
      expected: {
        id: '5',
        title: 'Diese Einführung erklärt, wie Teams bessere Entscheidungen treffen und nutzt z.B. Forecasts als',
        excerpt: 'Beispiel. Danach kommt Reporting.',
      },
    },
    {
      id: '6',
      source: 'Diese Einführung erklärt, wie Teams bessere Entscheidungen treffen und nutzt z. B. Forecasts als Beispiel. Danach kommt Reporting.',
      expected: {
        id: '6',
        title: 'Diese Einführung erklärt, wie Teams bessere Entscheidungen treffen und nutzt z. B. Forecasts als',
        excerpt: 'Beispiel. Danach kommt Reporting.',
      },
    },
    {
      id: '7',
      source: 'Teams nutzen z.B. Forecasts für Planung. Danach kommt Reporting.',
      //                     ^ 15 chars from the start as a test boundary
      options: { titleLength: 15 },
      expected: {
        id: '7',
        title: 'Teams nutzen',
        excerpt: 'z.B. Forecasts für Planung. Danach kommt Reporting.',
      },
    },
    {
      id: '8',
      source: 'Teams nutzen z. B. Forecasts für Planung. Danach kommt Reporting.',
      //                     ^ 15 chars from the start as a test boundary
      options: { titleLength: 15 },
      expected: {
        id: '8',
        title: 'Teams nutzen',
        excerpt: 'z. B. Forecasts für Planung. Danach kommt Reporting.',
      },
    },
    {
      id: '10',
      source: 'No sentence punctuation',
      expected: { id: '10', title: 'No sentence punctuation', excerpt: '' },
    },
    {
      id: '11',
      source: '![Image](1.image)\n\nA title.\n\nFinanzen 💶 wachsen schnell.',
      options: { descriptionLength: 22 },
      expected: { id: '11', title: 'A title.', excerpt: 'Finanzen 💶 wachsen' },
    },
    {
      id: '12',
      source: '[**Make room for better decisions.** Start by asking _which numbers matter_](<https://example.com/guides/planning_(teams)> "Planning. A guide.") before building another report. Teams need a shared view.',
      options: { descriptionLength: 80 },
      expected: {
        id: '12',
        title: 'Make room for better decisions.',
        excerpt: 'Start by asking which numbers matter before building another report. Teams need',
      },
    },
    {
      id: '13',
      source: '[**Make room for better decisions.** Start by asking _which numbers matter_][intro] before building another report. Teams need a shared view.\n\n[intro]: <https://example.com/guides/planning_(teams)> "Planning. A guide."',
      options: { descriptionLength: 80 },
      expected: {
        id: '13',
        title: 'Make room for better decisions.',
        excerpt: 'Start by asking which numbers matter before building another report. Teams need',
      },
    },
    {
      id: '14',
      source: 'Supercalifragilisticexpialidocious keeps going.',
      options: { titleLength: 12 },
      expected: {
        id: '14',
        title: 'Supercalifra',
        excerpt: 'gilisticexpialidocious keeps going.',
      },
    },
    {
      id: '15',
      source: '---\ntitle: Custom article title\ndescription: Custom article description\ndate: 2026-09-21\n---\n\nBody text should not define the title.',
      expected: {
        id: '15',
        title: 'Custom article title',
        excerpt: 'Custom article description',
        date: unquotedFrontmatterDate,
      },
    },
    {
      id: '16',
      source: '---\ntitle: Custom article title\ndate: 2026-09-21\n---\n\nBody text defines the generated title. Body text also defines the excerpt.',
      expected: {
        id: '16',
        title: 'Custom article title',
        excerpt: 'Body text also defines the excerpt.',
        date: unquotedFrontmatterDate,
      },
    },
    {
      id: '17',
      source: '---\ndate: 2026-09-21\n---',
      skipped: true,
    },
    {
      id: '18',
      source: '---\ndate: 2026-09-21\n---\n\nBody text defines the title. Body text defines the excerpt.',
      expected: {
        id: '18',
        title: 'Body text defines the title.',
        excerpt: 'Body text defines the excerpt.',
        date: unquotedFrontmatterDate,
      },
    },
    // A leading heading supplies the whole title; the next line starts the excerpt.
    {
      id: '19',
      source: '# Better decisions. Stronger teams.\nStart with a shared view of cash.',
      expected: {
        id: '19',
        title: 'Better decisions. Stronger teams.',
        excerpt: 'Start with a shared view of cash.',
      },
    },
    {
      id: '20',
      source: '---\ndate: "2026-09-21"\n---\n\n# **Finance** for [growing teams](https://example.com). A practical guide to planning together.\n\nStart with shared goals. Review them every month.',
      // The length limit applies to titles inferred from prose, not explicit headings.
      options: { titleLength: 15 },
      expected: {
        id: '20',
        title: 'Finance for growing teams. A practical guide to planning together.',
        excerpt: 'Start with shared goals. Review them every month.',
        date: '2026-09-21',
      },
    },
    {
      id: '21',
      source: '---\ntitle: Custom title\ndescription: Custom description\n---\n\n# Better decisions. Stronger teams.\n\nStart with shared goals.',
      expected: { id: '21', title: 'Custom title', excerpt: 'Custom description' },
    },
    {
      id: '22',
      source: 'An opening sentence. More context.\n\n# A later heading\n\nDetails follow.',
      expected: {
        id: '22',
        title: 'An opening sentence.',
        excerpt: 'More context. A later heading Details follow.',
      },
    },
    {
      id: '23',
      source: 'Better decisions. Stronger teams.\n===\n\nStart with shared goals.',
      expected: {
        id: '23',
        title: 'Better decisions. Stronger teams.',
        excerpt: 'Start with shared goals.',
      },
    },
    {
      id: '24',
      // Backslash and two-space line endings both separate the adjacent sentences.
      source: '# A clear plan\n\nA customer wrote to us.\\\nThe bank requested a plan.  \nWe supplied realistic figures.',
      expected: {
        id: '24',
        title: 'A clear plan',
        excerpt: 'A customer wrote to us. The bank requested a plan. We supplied realistic figures.',
      },
    },
  ];
  for (const input of inputs) {
    await t.test(input.id, async (t) => {
      const files = { [`${input.id}.md`]: input.source };
      const { directory } = await setup(t, files, input.options);
      const entry = (await generateMarkdownIndexEntries(directory, input.options))[0];
      if (input.skipped) {
        assert.equal(entry, undefined, `metadata row ${input.id} should be skipped`);
      } else {
        assert.deepEqual(entry, input.expected, `metadata row ${input.id}`);
      }
    });
  }
});

test('updates on add, change and unlink without reacting to its index or nested directories', async (t) => {
  const files = { '1.md': 'First article.' };
  const { directory, watcher, scan, write } = await setup(t, files);

  files['2.md'] = 'Second article.';
  watcher.emit('add', path.join(directory, '2.md'));
  await setImmediate();
  assert.equal((await generateMarkdownIndexEntries(directory)).length, 2);

  files['2.md'] = 'Updated article.';
  watcher.emit('change', path.join(directory, '2.md'));
  await setImmediate();
  assert.equal((await generateMarkdownIndexEntries(directory))[1].title, 'Updated article.');

  delete files['1.md'];
  watcher.emit('unlink', path.join(directory, '1.md'));
  await setImmediate();
  assert.deepEqual((await generateMarkdownIndexEntries(directory)).map(entry => entry.id), ['2']);

  const scans = scan.mock.callCount();
  watcher.emit('change', path.join(directory, 'index.js'));
  watcher.emit('add', path.join(directory, 'nested', '3.md'));
  watcher.emit('change', path.join(directory, '2.image'));
  await setImmediate();
  assert.equal(scan.mock.callCount(), scans);

  const writes = write.mock.callCount();
  watcher.emit('change', path.join(directory, '2.md'));
  await setImmediate();
  assert.equal(write.mock.callCount(), writes);
});

test('reports a failed scan and recovers on the next file event', async (t) => {
  const files = { '1.md': 'First article.' };
  const { directory, watcher, scan } = await setup(t, files);
  const error = t.mock.method(console, 'error', () => {});
  scan.mock.mockImplementationOnce(async () => { throw new Error('Cannot read directory'); });
  watcher.emit('change', path.join(directory, '1.md'));
  await setImmediate();
  assert.equal(error.mock.callCount(), 1);
  assert.equal((await generateMarkdownIndexEntries(directory))[0].title, 'First article.');

  files['1.md'] = 'Recovered article.';
  watcher.emit('change', path.join(directory, '1.md'));
  await setImmediate();
  assert.equal((await generateMarkdownIndexEntries(directory))[0].title, 'Recovered article.');
});

test('generates separate indexes and updates only the affected directory', async (t) => {
  const root = path.resolve('test/fixtures/markdown-index');
  const files = {
    [path.join(root, 'articles', '1.md')]: 'An article.',
    [path.join(root, 'guides', '1.md')]: 'A guide.',
  };
  // Identical filenames in different directories must remain independent.
  t.mock.method(fs, 'readdir', async directory => Object.keys(files)
    .filter(file => path.dirname(file) === directory)
    .map(file => ({ name: path.basename(file), isFile: () => true })));
  t.mock.method(fs, 'readFile', async file => {
    if (!(file in files)) throw Object.assign(new Error(`Missing ${file}`), { code: 'ENOENT' });
    return files[file];
  });
  const write = t.mock.method(fs, 'writeFile', async (file, content) => { files[file] = content; });
  const plugin = generateMarkdownIndexPlugin({ inputDirs: ['./articles', './guides'] });
  await plugin.configResolved({ root });
  assert.equal((await generateMarkdownIndexEntries(path.join(root, 'articles')))[0].title, 'An article.');
  assert.equal((await generateMarkdownIndexEntries(path.join(root, 'guides')))[0].title, 'A guide.');

  const watcher = new EventEmitter();
  plugin.configureServer({ watcher });
  files[path.join(root, 'guides', '1.md')] = 'Updated guide.';
  watcher.emit('change', path.join(root, 'guides', '1.md'));
  await setImmediate();
  assert.equal(write.mock.callCount(), 3);
  assert.equal(write.mock.calls[2].arguments[0], path.join(root, 'guides', 'index.js'));
  assert.equal((await generateMarkdownIndexEntries(path.join(root, 'guides')))[0].title, 'Updated guide.');
});
