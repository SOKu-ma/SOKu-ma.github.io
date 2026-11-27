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
  // `app`: the app an article links to, shown first (with store buttons). `ref`: where the visitor came from.
  const wanted = params.get('app')?.toLowerCase();
  const pick = catalog.find(app => app.id === wanted || app.aliases.includes(wanted))?.id || null;
  const refValue = params.get('ref')?.toLowerCase();
  const ref = KNOWN_REFS.includes(refValue) ? refValue : null;
  const requested = params.get('platform')?.toLowerCase();
  const platform = ['ios', 'android'].includes(requested) ? requested : /android/i.test(userAgent) ? 'android' : /iphone|ipad|ipod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1) ? 'ios' : null;
  return { lang, source, platform, pick: pick === source ? null : pick, ref };
}
// Outside referrers we count separately from app-to-app links (articles, posts).
export const KNOWN_REFS = ['note', 'zenn', 'x', 'threads'];
export function storeEntries(stores, platform) {
  return Object.entries(stores).sort(([a], [b]) => (a === platform ? -1 : b === platform ? 1 : a === 'ios' ? -1 : 1));
}
export const BADGE_LANGUAGES = ['ja','en','es','ko','zh-TW','zh-CN','ar','bn','de','fr','id','it','pt','pt-BR','tr','nl','pl'];
export function storeBadge(platform, lang) {
  const badgeLang = BADGE_LANGUAGES.includes(lang) ? lang : 'en';
  return platform === 'ios' ? `assets/badges/app-store/${badgeLang}.svg` : `assets/badges/google-play/${badgeLang}.png`;
}
export function safeStoreUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['apps.apple.com', 'play.google.com'].includes(url.hostname) ? url.href : null; } catch { return null; }
}

// Store-side attribution, no cookies or analytics on this page.
// App Store Connect: pt (provider token, shared by every app of this developer) + ct (campaign).
// Play Console: install referrer with UTM values.
// The campaign is the recognised source app ID, or "direct" when the page was opened without one.
export const APP_STORE_PROVIDER_TOKEN = '122938945';
// With a known `ref` (e.g. a note article) the campaign is `<ref>_<app>`, e.g. note_starting-xi.
export function campaignName(sourceId, ref = null, pick = null) {
  return ref ? `${ref}_${pick || sourceId || 'direct'}` : `apps_${sourceId || 'direct'}`;
}
export function campaignStoreUrl(value, sourceId, ref = null, pick = null) {
  const safe = safeStoreUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  const campaign = campaignName(sourceId, ref, pick);
  if (url.hostname === 'apps.apple.com') {
    url.searchParams.set('pt', APP_STORE_PROVIDER_TOKEN);
    url.searchParams.set('ct', campaign);
    url.searchParams.set('mt', '8');
  } else {
    url.searchParams.set('referrer', new URLSearchParams({ utm_source: 'so-kuma_apps', utm_medium: 'apps_page', utm_campaign: campaign }).toString());
  }
  return url.href;
}

export function selectScreenshots(screenshots = {}, lang) {
 const base=lang.split('-')[0];
 const selected=screenshots[lang] || screenshots[base] || screenshots.en;
 if (!selected) return null;
 return {...selected, fallback:selected.language.split('-')[0] !== base || (base === 'zh' && selected.language !== lang)};
}
export function selectCopy(copy, lang) {
 const selected=copy[lang] || copy[lang.split('-')[0]] || copy.en;
 return { ...copy.en, ...selected, fallback:!copy[lang] && !copy[lang.split('-')[0]] };
}

// Catalog order is the recommended order. Apps not on the visitor's platform move to the end (stable).
export function orderApps(apps, platform) {
 if (!platform) return apps;
 // A store that is only "coming soon" keeps the recommended position, so OTHER stays last.
 const offered = app => Boolean(app.stores?.[platform]) || upcomingStores(app).includes(platform);
 return [...apps].sort((a, b) => Number(!offered(a)) - Number(!offered(b)));
}
export function groupApps(apps, sourceId, platform = null, pickId = null) {
 const source = apps.find(app => app.id === sourceId) || null;
 const ordered = orderApps(apps, platform);
 const others = source ? ordered.filter(app => app.id !== source.id) : ordered;
 // The app an article points to goes first among the others (it keeps its store buttons).
 const pick = others.find(app => app.id === pickId);
 return {source, others: pick ? [pick, ...others.filter(app => app !== pick)] : others};
}
export function isNew(app, today = new Date()) {
 return Boolean(app.newUntil) && today.toISOString().slice(0, 10) <= app.newUntil;
}

export function categoriesOf(apps) {
 return [...new Set(apps.map(app => app.category))];
}
export function platformsOf(stores) {
 return ['ios', 'android'].filter(platform => safeStoreUrl(stores?.[platform] || ''));
}

// Store availability. Apps without `regions` are offered in every country.
// Stores still in review: shown as a note, never as a link, and only while the store URL is missing.
export function upcomingStores(app) { return (Array.isArray(app.upcomingStores) ? app.upcomingStores : []).filter(platform => ['ios', 'android'].includes(platform) && !app.stores?.[platform]); }
export function isJapanOnly(app) {
  return Array.isArray(app.regions) && app.regions.length === 1 && app.regions[0] === 'JP';
}
// Cookieless tap counting (Umami data attributes). Only coarse, non-personal values:
// which app and store, the page language, the source app, and whether the app is Japan only.
// Taps on Japan-only apps from non-Japanese pages show demand in countries the app is not offered in.
export function storeClickData(app, platform, state) {
  return {
    'umami-event': 'store_click',
    'umami-event-app': app.id,
    'umami-event-store': platform,
    'umami-event-lang': state.lang,
    'umami-event-from': state.source || 'direct',
    'umami-event-region': isJapanOnly(app) ? 'jp_only' : 'global',
    ...(state.ref ? { 'umami-event-ref': state.ref } : {}),
  };
}
