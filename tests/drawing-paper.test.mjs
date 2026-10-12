import assert from 'node:assert/strict';
import fs from 'node:fs';
// The studio keeps the paper colour on its own background element, underneath the drawing layers.
// These checks guard the promises the page makes to students and to the rest of the site.
const html=fs.readFileSync(new URL('../site/drawing-studio.html',import.meta.url),'utf8');
const paperPop=html.slice(html.indexOf("kind==='paper'"),html.indexOf("kind==='layer'"));
assert.ok(paperPop.includes('st.paper=c'),'choosing a paper sets the paper colour');
assert.ok(!/ctx\.(fillRect|clearRect|putImageData)/.test(paperPop),'choosing a paper never paints over a layer');
assert.ok(html.includes("$('paperBg').style.background=st.paper"),'paper is shown on its own background element');
assert.ok(html.includes("sessionStorage.setItem('pendingPost'")&&html.includes("community.html?post=1"),'Post to Community hand-off is intact');
assert.ok(html.includes('<script src="assets/project-context.js"></script>'),'lesson project banner script is loaded');
assert.ok(html.includes("href='/#schools'"),'Back to Academy link is intact');
// Installable app: settings file, icons and offline helper must exist and agree with each other.
const mf=JSON.parse(fs.readFileSync(new URL('../site/studio.webmanifest',import.meta.url),'utf8'));
assert.equal(mf.start_url,'/drawing-studio');assert.equal(mf.display,'standalone');
for(const i of mf.icons)assert.ok(fs.existsSync(new URL('../site'+i.src,import.meta.url)),'icon exists: '+i.src);
assert.ok(html.includes('rel="manifest" href="/studio.webmanifest"')&&html.includes("register('/studio-sw.js')"),'page links the app settings and offline helper');
const sw=fs.readFileSync(new URL('../site/studio-sw.js',import.meta.url),'utf8');
assert.ok(sw.includes("'/drawing-studio'")&&!/respondWith\(caches\.match\(e\.request\)\)\s*;?\s*}\s*\)\s*;?\s*$/.test(sw),'offline helper covers the studio only');
// Oil Studio: page, app settings and icons exist; both studios link to each other; the retired page is gone and nothing links to it.
const oil=fs.readFileSync(new URL('../site/oil-studio.html',import.meta.url),'utf8');
const omf=JSON.parse(fs.readFileSync(new URL('../site/oil-studio.webmanifest',import.meta.url),'utf8'));
assert.equal(omf.start_url,'/oil-studio');
for(const i of omf.icons)assert.ok(fs.existsSync(new URL('../site'+i.src,import.meta.url)),'icon exists: '+i.src);
assert.ok(oil.includes('href="/drawing-studio"')&&html.includes('href="/oil-studio"'),'the two studios link to each other');
assert.ok(sw.includes("'/oil-studio'"),'offline helper covers the Oil Studio');
assert.ok(!fs.existsSync(new URL('../site/vaughn-tucker-academy-app.html',import.meta.url)),'old perspective app page is retired');
for(const f of fs.readdirSync(new URL('../site/',import.meta.url)).filter(f=>f.endsWith('.html')))
  assert.ok(!fs.readFileSync(new URL('../site/'+f,import.meta.url),'utf8').includes('vaughn-tucker-academy-app'),f+' no longer links to the retired page');
console.log('Drawing Studio checks pass: paper is separate from marks; community hand-off and project banner intact.');
