// The site's build writes src/build-info.json, untracked, so a checkout that has never
// built has none. A glob import yields nothing for a missing file where a plain import
// fails to resolve. The path is root-relative, so it names the site's file, not svUltra's.
export function loadBuildInfo() {
  return Object.values(import.meta.glob('/src/build-info.json', { eager: true, import: 'default' }))[0];
}
