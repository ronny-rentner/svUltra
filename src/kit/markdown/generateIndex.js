import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import sbd from 'sbd';
import { createLogger } from 'vite';

const logger = createLogger();
const TITLE_LENGTH = 100;
const DESCRIPTION_LENGTH = 250;
const ABBREVIATIONS = ['zB'];

export default function generateMarkdownIndexPlugin({
  inputDirs,
  titleLength = TITLE_LENGTH,
  descriptionLength = DESCRIPTION_LENGTH,
}) {
  let directories;

  return {
    name: 'generate-markdown-index-plugin',

    async configResolved(config) {
      directories = inputDirs.map(directory => path.resolve(config.root, directory));
      await Promise.all(directories.map(generateIndex));
    },

    configureServer(server) {
      // Vite already watches the source directories; regenerate only the affected index.
      let chain = Promise.resolve();

      const update = (file, action, message) => {
        const directory = path.dirname(file);
        if (!directories.includes(directory) || !file.endsWith('.md')) return;
        logger.info(`Markdown file ${message}: ${file}`);
        chain = chain.then(() => regenerateIndex(directory, file, action));
      };

      server.watcher.on('add', (file) => {
        update(file, 'added', 'added');
      });

      server.watcher.on('unlink', (file) => {
        update(file, 'deleted', 'deleted');
      });

      server.watcher.on('change', (file) => {
        update(file, 'modified', 'updated');
      });
    },
  };

  async function regenerateIndex(directory, file, action) {
    let hasChanges;
    try {
      hasChanges = await generateIndex(directory);
    } catch (error) {
      logger.error(`Failed to regenerate Markdown index: ${error.message}`);
      return;
    }

    if (hasChanges) {
      logger.info(`Markdown index regenerated due to file ${action}: ${file}`, { timestamp: true });
    } else {
      logger.info(`No Markdown index changes detected from file ${action}: ${file}`);
    }
  }

  async function generateIndex(directory) {
    const entries = await generateMarkdownIndexEntries(directory, { titleLength, descriptionLength });
    const indexFile = path.join(directory, 'index.js');
    const indexFileContent = '// Generated from the .md files in this directory.\n' +
      `export const entries = ${JSON.stringify(entries, null, 2)};\n`;

    try {
      const existingContent = await fs.readFile(indexFile, 'utf8').catch(() => null);

      if (existingContent === indexFileContent) {
        logger.info(`No changes in Markdown index; skipping file write.`);
        return false;
      }

      await fs.writeFile(indexFile, indexFileContent);
      logger.info(`Markdown index generated and written to: ${indexFile}`, { timestamp: true });
      return true;
    } catch (error) {
      logger.error(`Failed to write Markdown index file: ${error.message}`);
      return false;
    }
  }
}

export async function generateMarkdownIndexEntries(directory, {
  titleLength = TITLE_LENGTH,
  descriptionLength = DESCRIPTION_LENGTH,
} = {}) {
  const files = (await fs.readdir(directory, { withFileTypes: true }))
    .filter(file => file.isFile() && file.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const entries = [];
  for (const file of files) {
    const source = (await fs.readFile(path.join(directory, file.name), 'utf8')).trim();
    if (source) {
      const metadata = extractMarkdownMetadata(source, titleLength, descriptionLength);
      if (!metadata) continue;
      entries.push({
        id: path.basename(file.name, '.md'),
        ...metadata,
      });
    }
  }
  return entries;
}

function extractMarkdownMetadata(source, titleLength, descriptionLength) {
  // Frontmatter syntax belongs to gray-matter; Markdown extraction only sees article content.
  const { data, content } = matter(source);
  if (!content.trim()) return;
  const tokens = marked.lexer(content);
  const firstToken = tokens.find(token => token.type !== 'space');
  // A leading heading supplies its full title, without sentence or length truncation.
  const heading = firstToken?.type === 'heading' ? collectText([firstToken], Infinity) : undefined;
  const text = collectText(tokens, (heading?.length ?? titleLength) + descriptionLength);
  const sentence = sbd.sentences(text, { abbreviations: ABBREVIATIONS })[0] ?? '';
  const generatedTitle = heading ?? (sentence.length <= titleLength ? sentence : limitText(sentence, titleLength));
  const generatedExcerpt = limitText(text.slice(generatedTitle.length).trim(), descriptionLength);
  const metadata = {
    title: data.title ?? generatedTitle,
    excerpt: data.description ?? generatedExcerpt,
  };
  if (data.date) metadata.date = data.date;
  return metadata;
}

function collectText(tokens, textLength) {
  let text = '';
  let skipNextText = false;
  const enoughText = Symbol('enoughText');
  try {
    marked.walkTokens(tokens, token => {
      if (text.length >= textLength) throw enoughText;
      if (token.type === 'image') {
        skipNextText = true;
        return;
      }
      if (skipNextText && token.type === 'text') {
        skipNextText = false;
        return;
      }
      // Keep words separated across paragraph gaps and hard line breaks.
      if (token.type === 'space' || token.type === 'br') text += ' ';
      if (token.type === 'text' || token.type === 'codespan') text += token.text;
      if (text.length >= textLength) throw enoughText;
    });
  } catch (error) {
    if (error !== enoughText) throw error;
  }
  return text.trim();
}

function limitText(text, length) {
  if (text.length <= length) return text;
  const start = text.slice(0, length);
  const boundary = start.lastIndexOf(' ');
  return boundary > 0 ? text.slice(0, boundary) : start;
}
