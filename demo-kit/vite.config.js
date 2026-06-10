import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  root: './demo-kit',
  plugins: [
    svelte({
      // Preprocessors are configured in demo-kit/svelte.config.js.
    }),
  ],
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@icons':  '@iconify-icons',
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
  },
  build: {
    outDir: 'dist',
  },
});
