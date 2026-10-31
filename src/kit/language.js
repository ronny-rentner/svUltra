// The first of the browser's languages that the site has, 'de-DE' counting as 'de'; undefined where it has none of them
export function browserLanguage(languages) {
  return navigator.languages.map(tag => tag.split('-')[0]).find(lang => languages.includes(lang));
}
