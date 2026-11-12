import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// This file sits at <svultra>/src/kit/vite.js
const svultraDir = path.resolve(fileURLToPath(import.meta.url), '../../..');

// Git's index lock in the nearest .git folder at or above the Vite root
function findGitLockFile(root) {
  for (let dir = root; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return path.join(dir, '.git', 'index.lock');
  }
}

// Vite's dev watcher covers the site's root and skips `node_modules`, so a linked svUltra
// checkout — which resolves outside that root — only reaches the browser after a restart.
// A published install resolves inside the root and is left alone.
export default function watchSourcePlugin() {
  let lockWatcher;
  let fallback;

  return {
    name: 'svultra:watch-source',
    apply: 'serve',

    configureServer(server) {
      const { watcher } = server;
      if (path.relative(server.config.root, svultraDir).startsWith('..')) {
        watcher.add(svultraDir);
      }

      // We use git's lock file to know when to pause all updates.
      const lockFile = findGitLockFile(server.config.root);
      if (!lockFile) return;
      const { logger } = server.config;
      const emit = watcher.emit.bind(watcher);
      // The events held back while git holds its lock, undefined otherwise
      let queue;

      const release = () => {
        clearInterval(fallback);
        const events = queue;
        queue = undefined;
        logger.info(`git unlocked, replaying ${events.length} events`, { timestamp: true });
        for (const entry of events) emit(...entry);
      };

      lockWatcher = new watcher.constructor({ ignoreInitial: true });
      lockWatcher.add(lockFile);
      lockWatcher.on('add', () => {
        if (queue) {
          throw new Error(
            "Internal error in svultra:watch-source: git's index.lock was reported as added while the previous lock " +
            "is still held, so the lock watcher missed that lock's removal and its state no longer matches git's. " +
            'Restart the dev server to recover. To fix the cause, find out why the lock watcher in svUltra\'s ' +
            'src/kit/vite.js missed the removal, starting from the git command that just ran.'
          );
        }
        queue = [];
        fallback = setInterval(() => fs.existsSync(lockFile) || release(), 1000);
        logger.info('git locked', { timestamp: true });
      });
      lockWatcher.on('unlink', () => queue && release());

      // Vite and the plugins all listen on this watcher, so holding back its emits holds back every reaction
      watcher.emit = (event, ...args) => {
        if (queue) {
          queue.push([event, ...args]);
          return true;
        }
        return emit(event, ...args);
      };
    },

    buildEnd() {
      lockWatcher?.close();
      clearInterval(fallback);
    },
  };
}
