import log from 'loglevel';

// Are we under Node, or in a browser? The colourful, file:line formatting below
// is Node-only; in a browser we keep the logger dependency-free and let loglevel
// write straight to the console.
const isNode =
  typeof process !== 'undefined' && !!process.versions && !!process.versions.node;

// chalk reads `process` when it loads, so import it lazily and only under Node —
// a browser bundle then never evaluates it. Until it resolves (or in the
// browser) `chalk` stays null and formatPrefix falls back to plain text.
let chalk = null;
if (isNode) {
  import('chalk').then((m) => { chalk = m.default; }).catch(() => {});
}

const logLevelThreshold = {
  trace: log.levels.TRACE,
  debug: log.levels.DEBUG,
  info: log.levels.INFO,
  warn: log.levels.WARN,
  error: log.levels.ERROR,
};

// The one place a log line's prefix is built. Rich (timestamp + colour +
// file:line) under Node; plain `<level> [scope]` everywhere else, so the same
// logger works in the browser console.
const formatPrefix = (methodName, loggerName) => {
  const tag = `<${methodName}>`;
  const name = `[${loggerName || 'default'}]`;

  if (!isNode || !chalk) {
    return `${tag} ${name}`;
  }

  const timestamp = chalk.gray(new Date().toISOString());
  const level = chalk.gray.bold(tag);

  // The caller's file:line, pulled from the stack and made relative to cwd.
  let location = '';
  const source = (new Error().stack || '').split('\n')[3]?.trim() ?? '';
  const match = source.match(/file:\/\/(.*?):(\d+):(\d+)\)?$/);
  if (match) {
    const [, fullPath, line, column] = match;
    const cwd = process.cwd();
    const rel = fullPath.startsWith(cwd) ? fullPath.slice(cwd.length + 1) : fullPath;
    location = chalk.cyan(`${rel}:${line}:${column}`);
  } else if (source) {
    location = chalk.cyan(source);
  }

  return `${timestamp} ${level} ${chalk.gray(name)} ${location}`.trimEnd();
};

// loglevel method factory that prepends our prefix to scoped log calls.
const makeMethodFactory = (originalFactory, loggerName) =>
  function (methodName, logLevel, loggerInstanceName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerInstanceName || loggerName);

    return function (...args) {
      if (log.levels[methodName.toUpperCase()] > logLevelThreshold[methodName]) {
        return;
      }

      if (loggerName === loggerInstanceName) {
        args[0] = `${formatPrefix(methodName, loggerInstanceName)}\n${args[0]}`;
      }

      return rawMethod.apply(this, args);
    };
  };

// Configure a logger (default or scoped) with our method factory and level.
const configureLogger = (logger, logLevel = 'debug', loggerName) => {
  const originalFactory = logger.methodFactory;
  logger.methodFactory = makeMethodFactory(originalFactory, loggerName);
  logger.setLevel(logLevel);
};

// Function to send logs to the backend in production
const sendLogToBackend = (level, message, error) => {
  fetch('/api/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ level, message, error: error ? error.stack : null }),
  }).catch(console.error);
};

// Patch log.error to send logs to the backend in production
const originalError = log.error;
log.error = (...args) => {
  originalError.apply(log, args);
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    sendLogToBackend('error', args[0], args[1]);
  }
};

// Configure the default logger with a global log level
configureLogger(log, 'info');

// Function to create a scoped logger with independent settings
const createScopedLogger = (scope, logLevel = 'debug') => {
  // Create a new logger instance for the scope
  const scopedLogger = log.getLogger(scope);

  // Configure the scoped logger with its own method factory
  configureLogger(scopedLogger, logLevel, scope);

  return scopedLogger;
};

// Export the default logger for global logging
export default log;

// Export the scoped logger creator for module-specific logging
export { createScopedLogger };
