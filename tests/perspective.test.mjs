import assert from 'node:assert/strict';
import '../site/assets/perspective-geometry.js';
const {box,lerp}=globalThis.PerspectiveGeometry;
function collinear(a,b,v){const cross=(b.x-a.x)*(v.y-a.y)-(b.y-a.y)*(v.x-a.x);assert.ok(Math.abs(cross)<1e-6,`Edge misses its vanishing point: ${cross}`);}
for(const eye of [120,300,480])for(const u of [null,{x:400,y:-900},{x:550,y:-1300}]){
 const L={x:20,y:eye},R={x:980,y:eye},B={x:500,y:550},T=u?lerp(B,u,.24):{x:500,y:150};
 const c=box(B,T,L,R,.42,.4,u);
 for(const [a,b] of [['B','BL'],['T','TL'],['BR','BB'],['TR','TB']])collinear(c[a],c[b],L);
 for(const [a,b] of [['B','BR'],['T','TR'],['BL','BB'],['TL','TB']])collinear(c[a],c[b],R);
 for(const [a,b] of [['B','T'],['BL','TL'],['BR','TR'],['BB','TB']])u?collinear(c[a],c[b],u):assert.ok(Math.abs(c[a].x-c[b].x)<1e-6);
}
console.log('Perspective: every edge family converges correctly across 9 camera configurations.');
