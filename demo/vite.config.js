import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFile } from 'node:fs/promises';
import path from 'path';
import svelteConfig from './svelte.config.js';

// Runs svelte.config.js's preprocess chain on a file at build time when
// imported as `from 'path/to/file.svelte?preprocessed'` — returns the post-
// preprocessor string. Lets the demo show "what the compiler sees" without
// shipping the preprocessor + Svelte compiler in the browser bundle.
function preprocessedPlugin() {
  const SUFFIX = '?preprocessed';
  // Virtual-module wrapping: prefix with \0 (so other plugins skip it) and
  // append a tail that takes the path out of vite-plugin-svelte's
  // `^[^?#]+\.svelte$` filter — otherwise it tries to compile our exported
  // JS string as a Svelte component.
  const VIRTUAL_PREFIX = '\0preprocessed:';
  const VIRTUAL_TAIL = '.preprocessed';
  return {
    name: 'svultra-preprocessed',
    enforce: 'pre',
    async resolveId(id, importer) {
      if (!id.endsWith(SUFFIX)) return;
      const base = id.slice(0, -SUFFIX.length);
      const resolved = await this.resolve(base, importer, { skipSelf: true });
      if (resolved) return VIRTUAL_PREFIX + resolved.id + VIRTUAL_TAIL;
    },
    async load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX) || !id.endsWith(VIRTUAL_TAIL)) return;
      const filePath = id.slice(VIRTUAL_PREFIX.length, -VIRTUAL_TAIL.length);
      let code = await readFile(filePath, 'utf-8');
      for (const pp of svelteConfig.preprocess ?? []) {
        const result = await pp.markup?.({ content: code, filename: filePath });
        if (result?.code) code = result.code;
      }
      this.addWatchFile(filePath);
      return `export default ${JSON.stringify(code)};`;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  root: './demo',
  plugins: [
    preprocessedPlugin(),
    svelte({
      // Preprocessors are configured in demo/svelte.config.js.
    })
  ],
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@examples':   path.resolve(__dirname, 'src/examples'),
      '@icons':      '@iconify-icons',
      '@lib':        path.resolve(__dirname, 'src/lib'),
      '@styles':     path.resolve(__dirname, 'src/styles'),
      // Demo-only alias: the demo lives in the same repo as the library, so it
      // imports from svUltra's source. In a real project, don't add this line
      // to your config — you can import directly `from 'svUltra'`.
      '@svUltra':    path.resolve(__dirname, '..', 'src'),
    },
  },
  build: {
    outDir: 'dist'
  },
  // Keep the GitHub Pages base only for builds. Dev servers and hosted sandboxes serve the demo from '/'.
  base: command === 'build' ? '/svUltra/' : '/'
}));
