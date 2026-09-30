import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync(new URL('../site/drawing-studio.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('function syncPaper()'),html.indexOf('// ── Drawing helpers'));
// A canvas double records pixel mutations. A paper change must never paint over existing pixels.
let pixel='student pencil mark';const buttons=['white','cream','black','kraft'].map(n=>({id:'bg-'+n,classList:{toggle(){}}}));
const sandbox={canvas:{width:800,height:600,style:{}},ctx:{getImageData(){return {pixel};},putImageData(img){pixel=img.pixel;},clearRect(){pixel='transparent';},fillRect(){pixel='OVERWRITTEN';}},bgColor:'#ffffff',bgColors:{white:'#ffffff',cream:'#faf6ee',black:'#1a1208',kraft:'#c8a96e'},history:[],redoStack:[],document:{querySelectorAll(){return buttons;}},confirm(){return true;},toast(){}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
sandbox.setBg('cream');assert.equal(pixel,'student pencil mark');assert.equal(sandbox.canvas.style.backgroundColor,'#faf6ee');
sandbox.undo();assert.equal(pixel,'student pencil mark');assert.equal(sandbox.bgColor,'#ffffff');
sandbox.redo();assert.equal(pixel,'student pencil mark');assert.equal(sandbox.bgColor,'#faf6ee');
sandbox.clearCanvas();assert.equal(pixel,'transparent');sandbox.undo();assert.equal(pixel,'student pencil mark');
console.log('Drawing regression: paper change preserves marks; paper undo/redo and clear undo pass.');
