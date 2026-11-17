import { resolveState, storeEntries, storeBadge, safeStoreUrl, selectScreenshots, selectCopy, groupApps, categoriesOf, platformsOf } from './state.mjs';

const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};
const format = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const PLATFORM_LABEL = { ios: 'iOS', android: 'Android' };

try {
  const response = await fetch('./catalog.json');
  if (!response.ok) throw new Error('catalog');
  const catalog = await response.json();
  const select = document.querySelector('#language');
  for (const [value, label] of Object.entries(catalog.languages)) {
    const option = node('option', null, label);
    option.value = value;
    select.append(option);
  }

  // Category filter lives only in memory: it is a view preference, not part of the shareable URL.
  let activeCategory = null;
  let firstRender = true;

  const storeLinks = (app, copy, state, ui) => {
    const stores = node('div', 'stores');
    for (const [platform, url] of storeEntries(app.stores, state.platform)) {
      const href = safeStoreUrl(url);
      if (!href) continue;
      const name = platform === 'ios' ? 'App Store' : 'Google Play';
      const link = node('a', `store store-${platform}`);
      link.href = href;
      link.setAttribute('aria-label', format(ui.store, { name: copy.name, store: name }));
      const badge = node('img', 'badge');
      badge.src = storeBadge(platform, state.lang);
      badge.alt = '';
      badge.loading = 'lazy';
      badge.decoding = 'async';
      if (platform === 'ios') { badge.width = 120; badge.height = 40; } else { badge.width = 140; badge.height = 54; }
      link.append(badge);
      stores.append(link);
    }
    return stores;
  };

  const visual = (app, copy, state, ui, catalogLanguages, eager) => {
    const images = selectScreenshots(app.screenshots, state.lang);
    const figure = node('figure', 'visual');
    if (!images) {
      // No published screenshots yet: show the app icon large instead of inventing previews.
      figure.classList.add('visual-icon');
      figure.style.setProperty('--icon', `url("${app.icon}")`);
      const icon = node('img', 'visual-icon-image');
      icon.src = app.icon; icon.alt = ''; icon.width = 120; icon.height = 120; icon.decoding = 'async';
      figure.append(icon);
      return figure;
    }
    const gallery = node('div', 'gallery');
    gallery.tabIndex = 0;
    gallery.setAttribute('role', 'group');
    gallery.setAttribute('aria-label', `${copy.name} — ${ui.preview}`);
    for (const [i, path] of images.paths.entries()) {
      const image = node('img', 'screen');
      image.src = path;
      image.alt = `${copy.name} — ${ui.preview} ${i + 1}`;
      image.loading = eager ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.width = 640; image.height = 1138;
      gallery.append(image);
    }
    const caption = node('figcaption', null, format(ui.screens, { language: catalogLanguages[images.language] || images.language }));
    if (images.fallback) caption.append(node('span', 'fallback-note', ui.imageFallback));
    figure.append(gallery, caption);
    return figure;
  };

  const card = (app, { state, ui, isSource, eager }) => {
    const copy = selectCopy(app.copy, state.lang);
    const article = node('article', isSource ? 'app-card source-card' : 'app-card');
    article.id = app.id;

    const body = node('div', 'card-body');
    const head = node('div', 'card-head');
    const icon = node('img', 'icon');
    icon.src = app.icon; icon.alt = ''; icon.width = 64; icon.height = 64; icon.loading = eager ? 'eager' : 'lazy';
    const titles = node('div', 'card-titles');
    const title = node('h3', null, copy.name);
    title.dir = 'auto';
    const meta = node('p', 'card-meta');
    meta.append(node('span', 'chip', ui.categories[app.category] || app.category));
    const platforms = node('span', 'platforms');
    platforms.lang = 'en';
    platforms.dir = 'ltr';
    platforms.textContent = platformsOf(app.stores).map(p => PLATFORM_LABEL[p]).join(' · ');
    meta.append(platforms);
    titles.append(title, meta);
    head.append(icon, titles);

    const description = node('p', 'description', copy.description);
    description.dir = 'auto';
    if (copy.fallback) { description.lang = 'en'; title.lang = 'en'; }
    body.append(head, description);
    if (copy.fallback) body.append(node('p', 'fallback-note', ui.copyFallback));
    if (!isSource) body.append(storeLinks(app, copy, state, ui));

    article.append(visual(app, copy, state, ui, catalog.languages, eager), body);
    return article;
  };

  const render = () => {
    const state = resolveState(location.search, Object.keys(catalog.languages), catalog.apps, navigator.languages || [navigator.language], navigator.userAgent, navigator.maxTouchPoints);
    const ui = { ...catalog.ui.en, ...catalog.ui[state.lang], categories: { ...catalog.ui.en.categories, ...catalog.ui[state.lang]?.categories } };
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    select.value = state.lang;
    document.title = `${ui.eyebrow} — ${ui.collection}`;
    document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = ui[element.dataset.i18n] || catalog.ui.en[element.dataset.i18n]; });

    const groups = groupApps(catalog.apps, state.source);
    document.querySelector('#hero-count').textContent = format(ui.count, { n: catalog.apps.length });

    // Hero: decorative icon collage so visitors see at a glance what kind of apps these are.
    const heroIcons = document.querySelector('#hero-icons');
    heroIcons.replaceChildren(...catalog.apps.map((app, i) => {
      const tile = node('span', 'hero-icon');
      tile.style.setProperty('--i', i);
      const img = node('img');
      img.src = app.icon; img.alt = ''; img.width = 96; img.height = 96; img.decoding = 'async';
      tile.append(img);
      return tile;
    }));

    // Source app ("the app you came from"): shown once, above the others, without store buttons.
    const sourceSection = document.querySelector('#source-app');
    sourceSection.hidden = !groups.source;
    document.querySelector('#source-card').replaceChildren(...(groups.source ? [card(groups.source, { state, ui, isSource: true, eager: true })] : []));
    document.querySelector('#collection-title').textContent = groups.source ? ui.otherApps : ui.collection;

    // Filters
    const categories = categoriesOf(groups.others);
    if (activeCategory && !categories.includes(activeCategory)) activeCategory = null;
    const filters = document.querySelector('#filters');
    filters.hidden = categories.length < 2;
    filters.replaceChildren(...[null, ...categories].map(category => {
      const button = node('button', 'filter', category ? ui.categories[category] || category : ui.filterAll);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(category === activeCategory));
      button.addEventListener('click', () => { activeCategory = category; render(); filters.querySelector('[aria-pressed="true"]')?.focus(); });
      return button;
    }));

    const visible = groups.others.filter(app => !activeCategory || app.category === activeCategory);
    document.querySelector('#count').textContent = format(ui.count, { n: visible.length });
    const container = document.querySelector('#apps');
    const cards = visible.map((app, index) => {
      const article = card(app, { state, ui, isSource: false, eager: index < 3 });
      article.style.setProperty('--i', index);
      return article;
    });
    if (!visible.length) cards.push(node('p', 'empty', ui.empty));
    container.classList.toggle('animate', firstRender);
    container.replaceChildren(...cards);
    firstRender = false;

    const all = document.querySelector('#all-apps');
    all.hidden = !groups.source;
    const url = new URL(location.href);
    url.searchParams.delete('from');
    all.href = url.pathname + url.search;
  };

  select.addEventListener('change', () => {
    const url = new URL(location.href);
    url.searchParams.set('lang', select.value);
    history.pushState(null, '', url);
    render();
  });
  addEventListener('popstate', render);
  render();
} catch (error) {
  document.querySelector('#error').hidden = false;
  console.error('Collection failed to load', error);
}
