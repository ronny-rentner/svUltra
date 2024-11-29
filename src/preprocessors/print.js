import { createScopedLogger } from '../logger.js';

const log = createScopedLogger('print', 'info');

export default function printSourceCode(targetFile) {
  return {
    markup({ content, filename }) {
      if (filename.includes(targetFile)) {
        log.info('File: ', filename, content);
      }
      return;
    }
  };
}
