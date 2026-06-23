import { promises as fs } from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { createLogger } from 'vite';

export default function generateRoutesPlugin(userOptions = {}) {
  const defaultOptions = {
    pagesDir: './src/pages',
    urlPrefix: '',
    nestedRoutes: true,
    outputFile: './src/generatedRoutes.svelte.js',
    routeRenames: {}
  };

  const options = { ...defaultOptions, ...userOptions };

  // Variables to hold resolved paths, set once in configResolved
  let pagesDir;
  let outputFilePath;
  let commonDir;

  // Use Vite's logger for consistent logging style
  const logger = createLogger();

  return {
    name: 'generate-routes-plugin',

    async configResolved(config) {
      // Resolve paths once during configuration
      pagesDir = path.resolve(config.root, options.pagesDir);
      outputFilePath = path.resolve(config.root, options.outputFile);
      commonDir = getCommonDirectory(pagesDir, outputFilePath);

      // Initial route generation
      await generateAndWriteRoutes();
    },

    configureServer(server) {
      // Use chokidar to watch for changes, additions, and deletions in `pages` directory
      const watcher = chokidar.watch(pagesDir, {
        ignoreInitial: true
      });

      watcher.on('add', async (file) => {
        logger.info(`Page added: ${file}`);
        await regenerateRoutesAndReload(server, file, 'added');
      });

      watcher.on('unlink', async (file) => {
        logger.info(`Page deleted: ${file}`);
        await regenerateRoutesAndReload(server, file, 'deleted');
      });

      watcher.on('change', async (file) => {
        logger.info(`Page updated: ${file}`);
        await regenerateRoutesAndReload(server, file, 'modified');
      });
    }
  };

  async function regenerateRoutesAndReload(server, file, action) {
    const hasChanges = await generateAndWriteRoutes(); // Adjusted to return a boolean indicating changes

    if (hasChanges) {
      // Invalidate the module cache for the generated routes file
      const mod = server.moduleGraph.getModuleById(outputFilePath);
      if (mod) {
        server.moduleGraph.invalidateModule(mod);
      }

      // Log route regeneration and action taken on the file
      logger.info(`Routes regenerated due to file ${action}: ${file}`, { timestamp: true });

      // Trigger a full page reload to reflect new routes
      server.ws.send({ type: 'full-reload', path: '*' });
    } else {
      // Log that no routes changed and no reload was necessary
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
        return false; // Indicate no changes
      }

      await fs.writeFile(outputFilePath, routeFileContent);
      logger.info(`Routes generated and written to: ${outputFilePath}`, { timestamp: true });
      return true; // Indicate changes were made
    } catch (error) {
      logger.error(`Failed to write routes file: ${error.message}`);
      return false; // Assume no changes on error
    }
  }
}

// Helper function to generate routes using relative paths
async function generateRoutes(dir, options, commonDir, baseRoute = '') {
  const files = await fs.readdir(dir);
  const routes = {};

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory() && options.nestedRoutes) {
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
