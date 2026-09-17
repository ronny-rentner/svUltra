import { promises as fs } from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { createLogger } from 'vite';

// Use Vite's logger for consistent logging style
const logger = createLogger();

export default function generateRoutesPlugin(userOptions = {}) {
  const defaultOptions = {
    pagesDir: './src/pages',
    urlPrefix: '',
    nestedRoutes: true,
    outputFile: './src/generatedRoutes.svelte.js',
    routeRenames: {}
  };

  const options = { ...defaultOptions, ...userOptions };

  // configResolved initializes these paths before the server watcher starts.
  let pagesDir;
  let outputFilePath;
  let commonDir;

  return {
    name: 'generate-routes-plugin',

    async configResolved(config) {
      pagesDir = path.resolve(config.root, options.pagesDir);
      outputFilePath = path.resolve(config.root, options.outputFile);
      commonDir = getCommonDirectory(pagesDir, outputFilePath);

      await generateAndWriteRoutes();
    },

    configureServer(server) {
      const watcher = chokidar.watch(pagesDir, {
        ignoreInitial: true
      });

      // Serialize scans so an older scan cannot overwrite the result of a newer event.
      let chain = Promise.resolve();

      watcher.on('add', (file) => {
        logger.info(`Page added: ${file}`);
        chain = chain.then(() => regenerateRoutesAndReload(server, file, 'added'));
      });

      watcher.on('unlink', (file) => {
        logger.info(`Page deleted: ${file}`);
        chain = chain.then(() => regenerateRoutesAndReload(server, file, 'deleted'));
      });

      watcher.on('change', (file) => {
        logger.info(`Page updated: ${file}`);
        chain = chain.then(() => regenerateRoutesAndReload(server, file, 'modified'));
      });
    }
  };

  async function regenerateRoutesAndReload(server, file, action) {
    let hasChanges;
    try {
      hasChanges = await generateAndWriteRoutes();
    } catch (error) {
      // Keep the last route file and let the next watcher event retry after a scan failure.
      logger.error(`Failed to regenerate routes: ${error.message}`);
      return;
    }

    if (hasChanges) {
      // Invalidate the module cache for the generated routes file
      const mod = server.moduleGraph.getModuleById(outputFilePath);
      if (mod) {
        server.moduleGraph.invalidateModule(mod);
      }

      logger.info(`Routes regenerated due to file ${action}: ${file}`, { timestamp: true });

      // Trigger a full page reload to reflect new routes
      server.ws.send({ type: 'full-reload', path: '*' });
    } else {
      logger.info(`No route changes detected from file ${action}: ${file}`);
    }
  }

  async function generateAndWriteRoutes() {
    const generatedRoutes = await generateRoutes(pagesDir, options, commonDir);
    const renamedRoutes = applyRouteRenames(generatedRoutes, options.routeRenames);

    const routeFileContent = `export const routes = {\n${Object.entries(renamedRoutes)
      .map(([path, importPath]) => `  "${path}": ${importPath}`)
      .join(',\n')}\n};\n`;

    try {
      const existingContent = await fs.readFile(outputFilePath, 'utf8').catch(() => null);

      if (existingContent === routeFileContent) {
        logger.info(`No changes in routes; skipping file write.`);
        return false;
      }

      await fs.writeFile(outputFilePath, routeFileContent);
      logger.info(`Routes generated and written to: ${outputFilePath}`, { timestamp: true });
      return true;
    } catch (error) {
      logger.error(`Failed to write routes file: ${error.message}`);
      return false;
    }
  }
}

async function generateRoutes(dir, options, commonDir, baseRoute = '') {
  // Read entry types with the directory listing to avoid a separate stat for each path.
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(error => {
    // A listed subdirectory can disappear before recursion; a missing pages root is an error.
    if (error.code === 'ENOENT' && baseRoute) {
      logger.warn(`Page directory disappeared during route generation: ${dir}`);
      return [];
    }
    throw error;
  });
  const routes = {};

  for (const entry of entries) {
    const file = entry.name;
    const filePath = path.join(dir, file);

    if (entry.isDirectory() && options.nestedRoutes) {
      Object.assign(routes, await generateRoutes(filePath, options, commonDir, `${baseRoute}/${file}`));
    } else {
      const extname = path.extname(file);
      const basename = path.basename(file, extname);

      if (extname === '.svelte') {
        const kebabCaseName = toKebabCase(basename);
        const routePath = basename === 'index' ? baseRoute || '/' : `${baseRoute}/${kebabCaseName}`;
        const fullPath = `${options.urlPrefix}${routePath}`;
        const relativeFilePath = `.${filePath.replace(commonDir, '').replace(/\\/g, '/')}`;
        routes[fullPath] = `() => import('${relativeFilePath}')`;
      }
    }
  }

  return routes;
}

function toKebabCase(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function applyRouteRenames(routes, renames) {
  const renamedRoutes = {};
  for (const [path, importPath] of Object.entries(routes)) {
    const renamedPath = renames[path] || path;
    renamedRoutes[renamedPath] = importPath;
  }
  return renamedRoutes;
}

function getCommonDirectory(pagesDir, outputFilePath) {
  const pagesParts = pagesDir.split(path.sep);
  const outputParts = outputFilePath.split(path.sep);
  let commonPath = '';

  for (let i = 0; i < Math.min(pagesParts.length, outputParts.length); i++) {
    if (pagesParts[i] === outputParts[i]) {
      commonPath = path.join(commonPath, pagesParts[i]);
    } else {
      break;
    }
  }

  return commonPath;
}
