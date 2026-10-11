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
console.log('Drawing Studio checks pass: paper is separate from marks; community hand-off and project banner intact.');
