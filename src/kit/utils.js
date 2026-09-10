// Pull the keys carrying `prefix` out of a props object, stripped of the prefix, so a
// component can hand a caller's `image:class` to its inner image element. The keys are
// removed from `map`, leaving it as the rest for the component's own element.
export function extract(map, prefix) {
  let extracted = {};
  const prefixLength = prefix.length;

  Object.keys(map).forEach(key => {
    if (key.startsWith(prefix)) {
      extracted[key.slice(prefixLength)] = map[key];
      delete map[key];
    }
  });

  return extracted;
}
