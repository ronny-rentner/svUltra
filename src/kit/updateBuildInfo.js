// Counts a site's build up in src/build-info.json, shown by the site's footer through
// loadBuildInfo(). Runs as the site's `prebuild` script, so the working directory is the
// site's frontend/. The file is untracked: only the live host's count means anything.
import fs from 'fs';

const buildInfoPath = 'src/build-info.json';

const buildInfo = fs.existsSync(buildInfoPath)
  ? JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'))
  : { buildNumber: 0, lastBuildTimestamp: '' };

buildInfo.buildNumber += 1;
buildInfo.lastBuildTimestamp = new Date().toISOString().substr(0, 19);

fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

console.log(`Build ${buildInfo.buildNumber} at ${buildInfo.lastBuildTimestamp}\n`);
