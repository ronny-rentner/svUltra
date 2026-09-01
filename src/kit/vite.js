import path from 'path';
import { fileURLToPath } from 'node:url';

// This file sits at <svultra>/src/kit/vite.js
const svultraDir = path.resolve(fileURLToPath(import.meta.url), '../../..');

// Vite's dev watcher covers the site's root and skips `node_modules`, so a linked svUltra
// checkout — which resolves outside that root — only reaches the browser after a restart.
// A published install resolves inside the root and is left alone.
export default function watchSvultraPlugin() {
  return {
    name: 'svultra:watch-source',
    apply: 'serve',

    configureServer(server) {
      if (!path.relative(server.config.root, svultraDir).startsWith('..')) {
        return;
      }
      server.watcher.add(svultraDir);
    },
  };
}
