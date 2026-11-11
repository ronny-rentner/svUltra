import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// This file sits at <svultra>/src/kit/vite.js
const svultraDir = path.resolve(fileURLToPath(import.meta.url), '../../..');

// Vite's dev watcher covers the site's root and skips `node_modules`, so a linked svUltra
// checkout — which resolves outside that root — only reaches the browser after a restart.
// A published install resolves inside the root and is left alone.
export default function watchSourcePlugin() {
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

// Git's index lock in the nearest .git folder at or above the Vite root
function findGitLockFile(root) {
  for (let dir = root; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return path.join(dir, '.git', 'index.lock');
  }
}

// Reports through Vite's file watcher when git takes and releases its index lock
export function gitLockPlugin() {
  return {
    name: 'svultra:git-lock',
    apply: 'serve',

    // Vite ignores everything below .git; the negation lifts that for the lock file only
    config: () => ({ server: { watch: { ignored: ['!**/.git/index.lock'] } } }),

    configureServer(server) {
      const lockFile = findGitLockFile(server.config.root);
      if (!lockFile) return;
      const { logger } = server.config;
      // Vite watches only its root, and the checkout's .git can lie above it
      server.watcher.add(lockFile);
      server.watcher.on('add', (file) => file === lockFile && logger.info('git locked', { timestamp: true }));
      server.watcher.on('unlink', (file) => file === lockFile && logger.info('git unlocked', { timestamp: true }));
    },
  };
}
