import { selectCopy } from '../apps/state.mjs';
import { SUPPORT_LANGUAGES, resolveSupportState, pickText, forPlatform, roadmapGroups, isVotable, voteCount, voteKey, eventData, contactUrl } from './state.mjs';

const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};
const format = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const track = (name, data) => { try { window.umami?.track(name, data); } catch { /* analytics must never break the page */ } };
// localStorage can throw (private mode, blocked site data): the page works without it.
const stored = key => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
const store = key => { try { localStorage.setItem(key, '1'); } catch { /* vote still counted once per page view */ } };

const appId = document.body.dataset.app;
const content = document.querySelector('#content');

try {
  const json = async path => { const response = await fetch(path); if (!response.ok) throw new Error(path); return response.json(); };
  const [catalog, strings, data] = await Promise.all([json('../../apps/catalog.json'), json('../data/ui.json'), json(`../data/${appId}.json`)]);
  // Vote totals are optional: the page is complete without them.
  const votes = await json('../votes.json').catch(() => null);
  const app = catalog.apps.find(item => item.id === data.id);
  if (!app) throw new Error('app');

  const select = document.querySelector('#language');
  for (const lang of SUPPORT_LANGUAGES) {
    const option = node('option', null, catalog.languages[lang]);
    option.value = lang;
    select.append(option);
  }
  const voted = new Set();
  const opened = new Set();

  const answer = (parts) => {
    const body = node('div', 'faq-answer');
    for (const part of parts) {
      if (Array.isArray(part)) { const list = node('ol'); for (const step of part) list.append(node('li', null, step)); body.append(list); }
      else body.append(node('p', null, part));
    }
    return body;
  };

  const helpful = (item, state, ui) => {
    const row = node('div', 'helpful');
    row.append(node('span', 'helpful-label', ui.helpful));
    for (const value of ['yes', 'no']) {
      const button = node('button', 'pill', ui[value]);
      button.type = 'button';
      button.addEventListener('click', () => {
        track('faq_helpful', eventData(data.id, state, { question: item.id, value }));
        const done = node('span', 'helpful-label', value === 'yes' ? ui.helpfulThanks : ui.helpfulSorry);
        row.replaceChildren(done);
        if (value === 'no') { const link = node('a', 'text-link', ui.feedbackHeading); link.href = '#feedback'; row.append(link); }
      });
      row.append(button);
    }
    return row;
  };

  const faqSection = (state, ui) => {
    const section = node('section', 'block');
    section.id = 'faq';
    section.append(node('h2', null, ui.faqHeading));
    for (const group of data.faq) {
      const items = forPlatform(group.items, state.platform);
      if (!items.length) continue;
      section.append(node('h3', 'group-title', pickText(group.title, state.lang)));
      const list = node('div', 'faq-list');
      for (const item of items) {
        const details = node('details', 'faq-item');
        details.id = `faq-${item.id}`;
        details.append(node('summary', null, pickText(item.q, state.lang)));
        details.append(answer(pickText(item.a, state.lang)), helpful(item, state, ui));
        details.addEventListener('toggle', () => {
          if (!details.open || opened.has(item.id)) return;
          opened.add(item.id);
          track('faq_open', eventData(data.id, state, { question: item.id }));
        });
        list.append(details);
      }
      section.append(list);
    }
    return section;
  };

  const voteButton = (item, state, ui) => {
    const button = node('button', 'vote');
    button.type = 'button';
    const key = voteKey(data.id, item.id);
    const paint = () => {
      const done = voted.has(item.id) || stored(key);
      const count = voteCount(votes, data.id, item.id);
      button.setAttribute('aria-pressed', String(done));
      button.replaceChildren(node('span', 'vote-label', done ? ui.voted : ui.vote));
      // The published total lags behind; a visitor's own fresh vote is added on top until the next update.
      if (count !== null) button.append(node('span', 'vote-count', String(count + (voted.has(item.id) ? 1 : 0))));
    };
    button.addEventListener('click', () => {
      if (voted.has(item.id) || stored(key)) return;
      voted.add(item.id);
      store(key);
      track('roadmap_vote', eventData(data.id, state, { item: item.id }));
      paint();
    });
    paint();
    return button;
  };

  const roadmapSection = (state, ui) => {
    const section = node('section', 'block');
    section.id = 'roadmap';
    section.append(node('h2', null, ui.roadmapHeading), node('p', 'block-lead', ui.roadmapLead));
    for (const group of roadmapGroups(data.roadmap)) {
      section.append(node('h3', `group-title status status-${group.status}`, ui.status[group.status]));
      const list = node('ul', 'roadmap-list');
      for (const item of group.items) {
        const row = node('li', 'roadmap-item');
        row.id = `roadmap-${item.id}`;
        const text = node('div', 'roadmap-text');
        text.append(node('p', 'roadmap-title', pickText(item.title, state.lang)));
        const note = pickText(item.note, state.lang);
        if (note) text.append(node('p', 'roadmap-note', note));
        row.append(text);
        if (isVotable(item)) row.append(voteButton(item, state, ui));
        list.append(row);
      }
      section.append(list);
    }
    const notes = node('p', 'fine', ui.roadmapNote);
    if (votes?.updated) notes.append(' ', format(ui.votesUpdated, { date: votes.updated }));
    section.append(notes);
    return section;
  };

  const feedbackSection = (state, ui, name) => {
    const section = node('section', 'block');
    section.id = 'feedback';
    section.append(node('h2', null, ui.feedbackHeading), node('p', 'block-lead', ui.feedbackLead));
    const actions = node('div', 'actions');
    const mail = node('a', 'button', ui.feedbackMail);
    mail.href = contactUrl(name, state, ui);
    mail.addEventListener('click', () => track('feedback_click', eventData(data.id, state, { via: 'mail' })));
    actions.append(mail);
    const general = node('a', 'text-link', ui.generalSupport);
    general.href = '../';
    actions.append(general);
    section.append(actions, node('p', 'fine', ui.feedbackNote));
    return section;
  };

  const render = () => {
    const state = resolveSupportState(location.search, catalog.apps, navigator.languages, navigator.userAgent, navigator.maxTouchPoints);
    const ui = strings[state.lang];
    const name = selectCopy(app.copy, state.lang).name;
    document.documentElement.lang = state.lang;
    document.title = `${format(ui.pageTitle, { name })} | SO-KUMA Labs`;
    select.value = state.lang;
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = ui[element.dataset.i18n];

    const head = node('section', 'app-head');
    const icon = node('img', 'app-icon');
    icon.src = `../../apps/${app.icon}`; icon.alt = ''; icon.width = 72; icon.height = 72;
    const titles = node('div');
    titles.append(node('p', 'app-kicker', ui.kicker), node('h1', null, name));
    head.append(icon, titles);

    const jump = node('nav', 'jump');
    jump.setAttribute('aria-label', ui.jump);
    for (const [id, label] of [['faq', ui.faqHeading], ['roadmap', ui.roadmapHeading], ['feedback', ui.feedbackHeading]]) {
      const link = node('a', 'pill', label);
      link.href = `#${id}`;
      jump.append(link);
    }
    content.replaceChildren(head, jump, faqSection(state, ui), roadmapSection(state, ui), feedbackSection(state, ui, name));
  };

  // The sections are drawn after the data loads, so the browser's own jump to #faq / #roadmap has already missed.
  const jumpToHash = () => {
    const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (!target) return;
    if (target.tagName === 'DETAILS') target.open = true;
    target.scrollIntoView();
  };

  select.addEventListener('change', () => {
    const url = new URL(location.href);
    url.searchParams.set('lang', select.value);
    history.replaceState(null, '', url);
    render();
  });
  addEventListener('hashchange', jumpToHash);
  render();
  jumpToHash();
} catch {
  document.querySelector('#error').hidden = false;
}
