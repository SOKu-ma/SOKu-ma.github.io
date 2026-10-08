export function matchLanguage(value, supported) {
  if (typeof value !== 'string') return null;
  const tag = value.toLowerCase().replaceAll('_', '-');
  const exact = supported.find(item => item.toLowerCase() === tag);
  if (exact) return exact;
  if (/^zh-(cn|sg|hans)(-|$)/.test(tag)) return supported.includes('zh-CN') ? 'zh-CN' : null;
  if (tag === 'zh') return supported.includes('zh-CN') ? 'zh-CN' : null;
  if (/^zh-(tw|hk|hant)(-|$)/.test(tag)) return supported.includes('zh-TW') ? 'zh-TW' : null;
  return supported.find(item => item.toLowerCase() === tag.split('-')[0]) || null;
}
export function resolveState(search, languages, catalog, browserLanguages = [], userAgent = '', touchPoints = 0) {
  const params = new URLSearchParams(search);
  const lang = matchLanguage(params.get('lang'), languages) || browserLanguages.map(value => matchLanguage(value, languages)).find(Boolean) || 'en';
  const from = params.get('from')?.toLowerCase();
  const source = catalog.find(app => app.id === from || app.aliases.includes(from))?.id || null;
  const requested = params.get('platform')?.toLowerCase();
  const platform = ['ios', 'android'].includes(requested) ? requested : /android/i.test(userAgent) ? 'android' : /iphone|ipad|ipod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1) ? 'ios' : null;
  return { lang, source, platform };
}
export function storeEntries(stores, platform) {
  return Object.entries(stores).sort(([a], [b]) => (a === platform ? -1 : b === platform ? 1 : a === 'ios' ? -1 : 1));
}
export function safeStoreUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['apps.apple.com', 'play.google.com'].includes(url.hostname) ? url.href : null; } catch { return null; }
}

export function selectScreenshots(screenshots, lang) {
 const base=lang.split('-')[0];
 const selected=screenshots[lang] || screenshots[base] || screenshots.en;
 return {...selected, fallback:selected.language.split('-')[0] !== base || (base === 'zh' && selected.language !== lang)};
}
export function selectCopy(copy, lang) {
 const selected=copy[lang] || copy[lang.split('-')[0]] || copy.en;
 return { ...copy.en, ...selected, fallback:!copy[lang] && !copy[lang.split('-')[0]] };
}

export function groupApps(apps, sourceId) {
 const source = apps.find(app => app.id === sourceId) || null;
 return {source, others: source ? apps.filter(app => app.id !== source.id) : apps};
}
