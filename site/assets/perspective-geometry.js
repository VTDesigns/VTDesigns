/* Shared, deterministic projective construction. All parallel edge families meet at their VP. */
(function(root){
 const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 function intersect(a,b,c,d){const den=(a.x-b.x)*(c.y-d.y)-(a.y-b.y)*(c.x-d.x);if(Math.abs(den)<1e-9)throw new Error('Degenerate perspective construction');const t=((a.x-c.x)*(c.y-d.y)-(a.y-c.y)*(c.x-d.x))/den;return {x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)};}
 function box(B,T,L,R,dl,dr,U){const BL=lerp(B,L,dl),BR=lerp(B,R,dr);const TL=intersect(T,L,BL,U||{x:BL.x,y:BL.y-100});const TR=intersect(T,R,BR,U||{x:BR.x,y:BR.y-100});return {B,T,BL,BR,TL,TR,BB:intersect(BL,R,BR,L),TB:intersect(TL,R,TR,L)};}
 root.PerspectiveGeometry={lerp,intersect,box};
})(typeof window==='undefined'?globalThis:window);
