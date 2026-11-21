import { resolveState } from '../apps/state.mjs';

// Per-app support pages (/support/<app id>/): FAQ, roadmap with "want this" votes, feedback.
// Pure helpers only, so they can be tested without a browser.

// Languages the support text is written in. Every other language falls back to English.
export const SUPPORT_LANGUAGES = ['ja', 'en'];
// Vote counts stay hidden until an item has this many, so a new page does not show "2 votes".
export const VOTE_DISPLAY_MIN = 10;
export const ROADMAP_STATUSES = ['in_progress', 'planned', 'done'];
export const SUPPORT_EMAIL = 'sokumaeng2020@gmail.com';

const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const isId = value => typeof value === 'string' && ID.test(value);

// Same query contract as /apps/ (from, lang, platform) plus v = the app version that opened the page.
export function resolveSupportState(search, catalogApps, browserLanguages = [], userAgent = '', touchPoints = 0) {
  const base = resolveState(search, SUPPORT_LANGUAGES, catalogApps, browserLanguages, userAgent, touchPoints);
  const version = new URLSearchParams(search).get('v') || '';
  return { ...base, version: /^[0-9][0-9A-Za-z.+-]{0,19}$/.test(version) ? version : null };
}

export function pickText(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value[lang.split('-')[0]] ?? value.en ?? '';
}

// Questions tagged with a platform are hidden on the other one. Unknown platform shows everything.
export function forPlatform(items, platform) {
  return items.filter(item => !item.platform || !platform || item.platform === platform);
}

export function roadmapGroups(items) {
  return ROADMAP_STATUSES.map(status => ({ status, items: items.filter(item => item.status === status) })).filter(group => group.items.length);
}
export const isVotable = item => item.status !== 'done';

// votes.json is written by a scheduled job from the analytics totals; the page only reads it.
export function voteCount(votes, appId, itemId) {
  const count = votes?.apps?.[appId]?.[itemId];
  return Number.isInteger(count) && count >= VOTE_DISPLAY_MIN ? count : null;
}
export const voteKey = (appId, itemId) => `sk-vote:${appId}:${itemId}`;

// Cookieless events. Only coarse, non-personal values: app, item, page language, source app, OS.
export function eventData(appId, state, extra = {}) {
  return { app: appId, lang: state.lang, from: state.source || 'direct', platform: state.platform || 'unknown', ...extra };
}

// Mail link with the context filled in, so the first reply does not have to ask for it.
export function contactUrl(appName, state, ui) {
  const lines = [ui.mailIntro, '', '', '---', `App: ${appName}`];
  if (state.version) lines.push(`Version: ${state.version}`);
  if (state.platform) lines.push(`OS: ${state.platform === 'ios' ? 'iOS' : 'Android'}`);
  lines.push(`Language: ${state.lang}`);
  const query = `subject=${encodeURIComponent(`[${appName}] ${ui.mailSubject}`)}&body=${encodeURIComponent(lines.join('\n'))}`;
  return `mailto:${SUPPORT_EMAIL}?${query}`;
}

// Build-time and test-time check of one app's support data. Returns a list of problems.
export function validateSupportData(data, catalogApps) {
  const problems = [];
  const text = (value, where) => { for (const lang of SUPPORT_LANGUAGES) if (!value?.[lang] || (Array.isArray(value[lang]) && !value[lang].length)) problems.push(`${where}: missing ${lang}`); };
  if (!catalogApps.some(app => app.id === data.id)) problems.push(`unknown app ${data.id}`);
  const seen = new Set();
  const unique = (id, where) => { if (!isId(id)) problems.push(`${where}: bad id`); if (seen.has(id)) problems.push(`${where}: duplicate id ${id}`); seen.add(id); };
  for (const section of data.faq || []) {
    unique(section.id, 'faq section');
    text(section.title, `faq/${section.id}`);
    for (const item of section.items || []) {
      unique(item.id, `faq/${section.id}`);
      text(item.q, `faq/${item.id}/q`);
      text(item.a, `faq/${item.id}/a`);
      if (item.platform && !['ios', 'android'].includes(item.platform)) problems.push(`faq/${item.id}: bad platform`);
    }
  }
  for (const item of data.roadmap || []) {
    unique(item.id, 'roadmap');
    text(item.title, `roadmap/${item.id}`);
    if (!ROADMAP_STATUSES.includes(item.status)) problems.push(`roadmap/${item.id}: bad status`);
  }
  return problems;
}
