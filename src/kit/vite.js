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

// Holds back the events of Vite's watcher while git holds its index lock and replays them once git releases it
export function gitLockPlugin() {
  return {
    name: 'svultra:git-lock',
    apply: 'serve',

    // Everything inside .git (objects, refs, HEAD, …) stays ignored through **/.git/**; only the folder itself and index.lock get through.
    config: () => ({ server: { watch: { ignored: ['!**/.git', '!**/.git/index.lock'] } } }),

    configureServer(server) {
      const lockFile = findGitLockFile(server.config.root);
      if (!lockFile) return;
      const { watcher } = server;
      const { logger } = server.config;
      const emit = watcher.emit.bind(watcher);
      // The events held back while git holds its lock, undefined otherwise
      let queue;

      watcher.add(lockFile);
      // Vite and the plugins all listen on this watcher, so holding back its emits holds back every reaction
      watcher.emit = (event, ...args) => {
        // An 'all' event carries the event name first and the path second
        const file = event === 'all' ? args[1] : args[0];
        if (file === lockFile) {
          if (event === 'add') {
            queue = [];
            logger.info('git locked', { timestamp: true });
          } else if (event === 'unlink') {
            const events = queue ?? [];
            queue = undefined;
            logger.info(`git unlocked, replaying ${events.length} events`, { timestamp: true });
            for (const entry of events) emit(...entry);
          }
          return true;
        }
        if (queue) {
          queue.push([event, ...args]);
          return true;
        }
        return emit(event, ...args);
      };
    },
  };
}
