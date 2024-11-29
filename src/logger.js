import chalk from 'chalk';
import log from 'loglevel';
import path from 'path';

// Helper to create the custom log method
const loglevelPlugin = (originalFactory, logLevelThreshold, loggerName) => {
  const cwd = process.cwd();

  return function (methodName, logLevel, loggerInstanceName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerInstanceName || loggerName);

    return function (...args) {
      // Only log if the level is below or equal to the logger's threshold
      if (log.levels[methodName.toUpperCase()] > logLevelThreshold[methodName]) {
        return;
      }

      if (loggerName == loggerInstanceName) {

        // Construct the log message
        const timestamp = chalk.gray(new Date().toISOString());
        const level = chalk.gray.bold(`<${methodName}>`);

        // Get the user code stack line (3rd line)
        const stackLines = new Error().stack.split("\n");
        const source = stackLines[2].trim();

        const match = source.match(/file:\/\/(.*?):(\d+):(\d+)\)?$/);
        let relativePath = chalk.cyan(source);
        if (match) {
          const [_, fullPath, line, column] = match;
          const relativeFilePath = path.relative(cwd, fullPath);
          relativePath = chalk.cyan(`${relativeFilePath}:${line}:${column}`);
        }

        const name = chalk.gray(`[${loggerInstanceName || 'default'}]`);

        // Log message formatting
        args[0] = `${timestamp} ${level} ${name} ${relativePath}\n${args[0]}`;
      }
      return rawMethod.apply(this, args);
    };
  };
};

// Define log level thresholds
const logLevelThreshold = {
  trace: log.levels.TRACE,
  debug: log.levels.DEBUG,
  info: log.levels.INFO,
  warn: log.levels.WARN,
  error: log.levels.ERROR,
};

// Configure a logger (default or scoped)
const configureLogger = (logger, logLevel = 'debug', loggerName) => {
  // Save the original method factory
  const originalFactory = logger.methodFactory;

  // Override the method factory with the plugin
  logger.methodFactory = loglevelPlugin(originalFactory, logLevelThreshold, loggerName);

  // Set the desired log level
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
  if (process.env.NODE_ENV === 'production') {
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

