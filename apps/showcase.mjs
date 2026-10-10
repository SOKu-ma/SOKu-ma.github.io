import { resolveState, storeEntries, safeStoreUrl, selectScreenshots, selectCopy, groupApps } from './state.mjs';
const node = (tag, className, text) => { const element = document.createElement(tag); if(className) element.className = className; if(text) element.textContent = text; return element; };
const format = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
try {
 const response = await fetch('./catalog.json'); if (!response.ok) throw new Error('catalog');
 const catalog = await response.json();
 const select = document.querySelector('#language');
 for(const [value, label] of Object.entries(catalog.languages)) { const option = node('option', null, label); option.value = value; select.append(option); }
 const render = () => {
  const state = resolveState(location.search, Object.keys(catalog.languages), catalog.apps, navigator.languages || [navigator.language], navigator.userAgent, navigator.maxTouchPoints);
  const ui = {...catalog.ui.en, ...catalog.ui[state.lang]};
  document.documentElement.lang = state.lang; document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr'; select.value = state.lang;
  document.title = `${ui.collection} — SO-KUMA Labs`;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = ui[element.dataset.i18n] || catalog.ui.en[element.dataset.i18n]; });
  const groups = groupApps(catalog.apps, state.source);
  const visible = groups.others;
  document.querySelector("#source-app").hidden = !groups.source;
  document.querySelector("#collection-title").textContent = groups.source ? ui.otherApps : ui.collection;
  document.querySelector('#count').textContent = format(ui.count, {n:visible.length});
  const container = document.querySelector('#apps'); const fragment = document.createDocumentFragment();
  const sourceFragment = document.createDocumentFragment();
  const ordered = groups.source ? [...visible, groups.source] : visible;
  for(const [index, app] of ordered.entries()) {
   const isSource = app.id === groups.source?.id;
   const copy = selectCopy(app.copy, state.lang);
   const images = selectScreenshots(app.screenshots, state.lang);
   const article = node('article', isSource ? 'app-card source-card' : 'app-card'); article.id = app.id;
   const details = node('div', 'details');
   const topline = node('div','app-topline');
   const icon = node('img','icon'); icon.src = app.icon; icon.alt = ''; icon.width=64; icon.height=64; icon.loading='lazy';
   topline.append(icon,node('span','category',ui.categories[app.category] || app.category));
   if(!isSource)topline.append(node('span','number',String(index+1).padStart(2,'0')));
   const title=node('h3',null,copy.name);title.dir='auto';const description=node('p','description',copy.description);description.dir='auto'; if(copy.fallback){description.lang='en';title.lang='en';} details.append(topline,title,description);if(copy.fallback)details.append(node('p','fallback-note',ui.copyFallback));
   const stores = node('div','stores');
   for(const [platform,url] of storeEntries(app.stores,state.platform)) {
    const href = safeStoreUrl(url); if(!href) continue;
    const name = platform === 'ios' ? 'App Store' : 'Google Play';
    const link = node('a',platform === state.platform ? 'store preferred' : 'store', name+' ↗'); link.href=href; link.setAttribute('aria-label',format(ui.store,{name:copy.name,store:name}));
    stores.append(link);
   }

   const figure=node('figure','visual'); const gallery=node('div','gallery'); gallery.tabIndex=0; gallery.setAttribute('role','group'); gallery.setAttribute('aria-label',copy.name+' — '+ui.preview);
   for(const [i,path] of images.paths.entries()) {
    const image=node('img','screen'); image.src=path;image.alt=`${copy.name} — ${ui.preview} ${i+1}`;image.loading=index===0 ? 'eager':'lazy';image.decoding='async';image.width=640;image.height=1138;gallery.append(image);
   }
   const caption=node('figcaption',null,format(ui.screens,{language:catalog.languages[images.language] || images.language}));if(images.fallback)caption.append(node('span','fallback-note',ui.imageFallback));figure.append(gallery,caption);article.append(details,figure);if(!isSource)article.append(stores);(isSource ? sourceFragment : fragment).append(article);
  }
  if (!visible.length) fragment.append(node('p',null,ui.empty));
  document.querySelector("#source-card").replaceChildren(sourceFragment);
  container.replaceChildren(fragment);
  const all=document.querySelector('#all-apps');all.hidden=!groups.source; const url=new URL(location.href);url.searchParams.delete('from');all.href=url.pathname+url.search;
 };
 select.addEventListener('change', () => {const url=new URL(location.href);url.searchParams.set('lang',select.value);history.pushState(null,'',url);render();});
 addEventListener('popstate',render);render();
} catch(error) {document.querySelector('#error').hidden=false;console.error('Collection failed to load',error);}
