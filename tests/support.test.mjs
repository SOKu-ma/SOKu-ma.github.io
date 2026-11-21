import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { SUPPORT_LANGUAGES, VOTE_DISPLAY_MIN, SUPPORT_EMAIL, resolveSupportState, pickText, forPlatform, roadmapGroups, isVotable, voteCount, voteKey, eventData, contactUrl, validateSupportData, isId } from '../support/state.mjs';

const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url)));
const catalog = read('apps/catalog.json');
const ui = read('support/data/ui.json');
const appFiles = readdirSync(new URL('../support/data/', import.meta.url)).filter(name => name.endsWith('.json') && name !== 'ui.json');
const state = (query, browser = [], ua = '') => resolveSupportState(query, catalog.apps, browser, ua);

test('support pages use Japanese or English, everything else falls back to English', () => {
  assert.equal(state('?lang=ja').lang, 'ja');
  assert.equal(state('?lang=ko', ['ko-KR']).lang, 'en');
  assert.equal(state('', ['fr', 'ja-JP']).lang, 'ja');
  assert.equal(pickText({ ja: 'あ', en: 'a' }, 'ja'), 'あ');
  assert.equal(pickText({ en: 'a' }, 'ja'), 'a');
  assert.equal(pickText(undefined, 'ja'), '');
});

test('the app version is accepted only in a plain version shape', () => {
  assert.equal(state('?v=2.9.1').version, '2.9.1');
  assert.equal(state('?v=2.9.1%2B52').version, '2.9.1+52');
  for (const bad of ['?v=%3Cscript%3E', '?v=', '?v=abc', '?v=1.0%0AOS%3A%20x', '?v=' + '1'.repeat(30)]) assert.equal(state(bad).version, null, bad);
});

test('source app and platform follow the same rules as the apps page', () => {
  assert.equal(state('?from=com.sokuma.battinglogapp&platform=android').source, 'batting-log');
  assert.equal(state('?platform=windows', [], 'iPhone').platform, 'ios');
  assert.equal(state('?from=%3Cscript%3E').source, null);
});

test('platform-specific questions are hidden on the other platform only', () => {
  const items = [{ id: 'a' }, { id: 'b', platform: 'ios' }, { id: 'c', platform: 'android' }];
  assert.deepEqual(forPlatform(items, 'ios').map(i => i.id), ['a', 'b']);
  assert.deepEqual(forPlatform(items, 'android').map(i => i.id), ['a', 'c']);
  assert.equal(forPlatform(items, null).length, 3);
});

test('roadmap is grouped in progress, planned, done; done items take no votes', () => {
  const items = [{ id: 'a', status: 'done' }, { id: 'b', status: 'planned' }, { id: 'c', status: 'in_progress' }, { id: 'd', status: 'planned' }];
  assert.deepEqual(roadmapGroups(items).map(g => [g.status, g.items.map(i => i.id)]), [['in_progress', ['c']], ['planned', ['b', 'd']], ['done', ['a']]]);
  assert.deepEqual(roadmapGroups([{ id: 'a', status: 'done' }]).map(g => g.status), ['done']);
  assert.equal(isVotable(items[0]), false);
  assert.equal(isVotable(items[1]), true);
});

test('vote counts are shown only from the published file and only above the threshold', () => {
  const votes = { apps: { 'batting-log': { a: VOTE_DISPLAY_MIN, b: VOTE_DISPLAY_MIN - 1, c: '99', d: 12.5 } } };
  assert.equal(voteCount(votes, 'batting-log', 'a'), VOTE_DISPLAY_MIN);
  for (const item of ['b', 'c', 'd', 'missing']) assert.equal(voteCount(votes, 'batting-log', item), null, item);
  assert.equal(voteCount(null, 'batting-log', 'a'), null);
  assert.equal(voteCount(read('support/votes.json'), 'batting-log', 'a'), null);
  assert.equal(voteKey('batting-log', 'a'), 'sk-vote:batting-log:a');
});

test('events carry coarse values only', () => {
  assert.deepEqual(eventData('batting-log', state('?lang=ja&platform=ios&v=2.9.1'), { item: 'x' }), { app: 'batting-log', lang: 'ja', from: 'direct', platform: 'ios', item: 'x' });
  assert.equal(eventData('batting-log', state('?from=dartlog')).from, 'dartlog');
  assert.equal(eventData('batting-log', state('')).platform, 'unknown');
});

test('the mail link fills in app, version, OS and language', () => {
  const url = new URL(contactUrl('野球打率ノート', state('?lang=ja&platform=android&v=2.9.1'), ui.ja));
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, SUPPORT_EMAIL);
  assert.equal(url.searchParams.get('subject'), '[野球打率ノート] ご意見・ご要望');
  const body = url.searchParams.get('body');
  for (const line of ['App: 野球打率ノート', 'Version: 2.9.1', 'OS: Android', 'Language: ja']) assert.ok(body.includes(line), line);
  assert.ok(!new URL(contactUrl('Batting Log', state(''), ui.en)).searchParams.get('body').includes('Version'));
});

test('UI text has the same keys in every support language', () => {
  const keys = value => Object.entries(value).flatMap(([key, item]) => typeof item === 'object' ? keys(item).map(child => key + '.' + child) : [key]).sort();
  for (const lang of SUPPORT_LANGUAGES) assert.deepEqual(keys(ui[lang]), keys(ui.en), lang);
});

test('every app support file is valid and has its page', () => {
  assert.ok(appFiles.includes('batting-log.json'));
  for (const file of appFiles) {
    const data = read('support/data/' + file);
    assert.equal(data.id + '.json', file);
    assert.deepEqual(validateSupportData(data, catalog.apps), [], file);
    assert.ok(data.faq.length && data.roadmap.length, file);
    const page = new URL(`../support/${data.id}/index.html`, import.meta.url);
    assert.ok(existsSync(page), file);
    const html = readFileSync(page, 'utf8');
    assert.match(html, new RegExp(`<body data-app="${data.id}">`));
    assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[0-9a-f-]{36}" data-domains="www\.so-kuma\.com"><\/script>/);
  }
});

test('broken support data is reported', () => {
  const bad = { id: 'nope', faq: [{ id: 'S', title: { ja: 'a' }, items: [{ id: 'q', q: { ja: 'a', en: 'a' }, a: { ja: [], en: ['a'] }, platform: 'windows' }] }], roadmap: [{ id: 'q', status: 'soon', title: { ja: 'a', en: 'a' } }] };
  const problems = validateSupportData(bad, catalog.apps);
  for (const part of ['unknown app', 'bad id', 'faq/S: missing en', 'faq/q/a: missing ja', 'bad platform', 'duplicate id q', 'bad status']) assert.ok(problems.some(p => p.includes(part)), part);
  assert.equal(isId('a-b-1'), true);
  assert.equal(isId('A b'), false);
});
