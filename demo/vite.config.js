import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: './demo',
  plugins: [
    svelte({
      compilerOptions: {
        // Using standard Svelte component format
      }
      // Preprocessors are now configured in svelte.config.js
    })
  ],
  resolve: {
    alias: {
      '@assets':     path.resolve(__dirname, 'src/assets'),
      '@api':        path.resolve(__dirname, 'src/api'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@icons':      '@iconify-icons',
      '@layout':     path.resolve(__dirname, 'src/components/layout'),
      '@lib':        path.resolve(__dirname, 'src/lib'),
      '@pages':      path.resolve(__dirname, 'src/pages'),
      '@src':        path.resolve(__dirname, 'src'),
      '@stores':     path.resolve(__dirname, 'src/stores'),
      '@styles':     path.resolve(__dirname, 'src/styles'),
      '@vendor':     path.resolve(__dirname, 'src/lib/vendor.js'),
    },
  },
  build: {
    outDir: 'dist'
  },
  base: '/svUltra/'
});
