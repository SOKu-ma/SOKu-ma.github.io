const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const catalog=JSON.parse(fs.readFileSync(__dirname+'/../apps/catalog.json'));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const results=[];
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:950});
  for(const app of catalog.apps){
   await page.goto(`http://127.0.0.1:5190/apps/?from=${app.id}&lang=ja&platform=android`);
   await page.locator('#source-card .app-card').waitFor();
   for(const lang of Object.keys(catalog.languages)){
    await page.selectOption('#language',lang);
    const result=await page.evaluate(()=>({lang:document.documentElement.lang,source:document.querySelector('#source-card .app-card').id,others:[...document.querySelectorAll('#apps .app-card')].map(a=>a.id),unique:new Set([...document.querySelectorAll('.app-card')].map(a=>a.id)).size,sourceLinks:document.querySelectorAll('#source-card .store').length,overflow:document.documentElement.scrollWidth>innerWidth,query:location.search}));
    if(result.lang!==lang||result.source!==app.id||result.others.includes(app.id)||result.others.length!==4||result.unique!==5||result.sourceLinks||result.overflow)throw Error(JSON.stringify(result));
    if(new URLSearchParams(result.query).get('platform')!=='android')throw Error('Lost platform');results.push({width,...result});
   }
  }
 }
 for(const query of ['', '?from=unknown&lang=fr','?from=%3Cscript%3E&lang=ja']){
  await page.goto('http://127.0.0.1:5190/apps/'+query);await page.locator('#apps .app-card').first().waitFor();
  if(await page.locator('#apps .app-card').count()!==5||await page.locator('#source-card .app-card').count())throw Error('Default list');
 }
 await page.goto('http://127.0.0.1:5190/apps/?from=soccer_lineup_board&lang=ja&platform=ios');await page.locator('#source-card .app-card').waitFor();
 await page.selectOption('#language','ar');await page.selectOption('#language','fr');await page.goBack();
 if(await page.locator('html').getAttribute('lang')!=='ar')throw Error('Back');await page.goForward();
 if(await page.locator('html').getAttribute('lang')!=='fr')throw Error('Forward');
 await page.locator('#all-apps').click();await page.locator('#apps #starting-xi').waitFor();if(new URL(page.url()).searchParams.has('from'))throw Error('Source reset');
 await page.goto('http://127.0.0.1:5190/apps/?from=starting-xi&lang=ja&platform=ios');await page.locator('#source-card .app-card').waitFor();
 await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))});
 const images=await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0})));if(images.some(i=>!i.ok))throw Error('Image load');
 fs.mkdirSync('evidence',{recursive:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'evidence/source-soccer-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:900});await page.screenshot({path:'evidence/source-soccer-mobile.png',fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync('evidence/source-flow-browser-results.json',JSON.stringify({results,images,errors},null,2));
 console.log('Passed: '+results.length+' source/language/viewport cases, default fallback, history, query reset and images');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
