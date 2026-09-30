"""Reproducible vector teaching reconstructions; never presented as original process photos."""
from pathlib import Path
from html import escape
ROOT=Path(__file__).resolve().parents[1]/'site/assets/lessons'
ROOT.mkdir(parents=True,exist_ok=True)
L=(-690,461);R=(1210,461);CX=590

def yy(x,y,vp):return vp[1]+(y-vp[1])*(x-vp[0])/(CX-vp[0])
def poly(points,fill,stroke='none',width=2):
 return f'<polygon points="{" ".join(f"{x:.3f},{y:.3f}" for x,y in points)}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round"/>'
def line(x1,y1,x2,y2,color='#443e35',width=2):return f'<path d="M{x1:.3f} {y1:.3f}L{x2:.3f} {y2:.3f}" fill="none" stroke="{color}" stroke-width="{width}"/>'
def face(x1,x2,top,bottom,vp,fill,stroke='none',width=2):return poly([(x1,yy(x1,top,vp)),(x2,yy(x2,top,vp)),(x2,yy(x2,bottom,vp)),(x1,yy(x1,bottom,vp))],fill,stroke,width)
def king(stage):
 pencil=stage in ('construction','pencil'); value=stage=='value'; thumb=stage=='thumbnail'
 sky='#faf7ef' if pencil else '#eee9de' if value or thumb else '#b9d0d7'
 ground='#faf7ef' if pencil else '#99958c' if value or thumb else '#a69f8e'
 left='#fffdf7' if pencil else '#b4b0a6' if value or thumb else '#e8d7ba'
 right='#fffdf7' if pencil else '#eee9de' if value or thumb else '#f2e7cc'
 dark='#373831' if value or thumb else '#596348';trim='#443e35' if pencil else dark if value else '#955443'
 out=[f'<rect width="960" height="718" fill="{sky}"/>',poly([(0,500),(590,578),(960,498),(960,718),(0,718)],ground)]
 # Main planes use the same two VPs in every reconstruction.
 out += [face(0,CX,120,578,L,left,'#443e35' if pencil else 'none'),face(CX,915,120,578,R,right,'#443e35' if pencil else 'none')]
 if stage!='construction':
  # Pavement and foliage are compositional masses, not exact tracing.
  out += [poly([(0,530),(590,591),(960,513),(960,535),(590,615),(0,553)],'#c6b990' if not pencil and not value and not thumb else '#b4b0a6' if value or thumb else '#eee9de')]
  out += [f'<path d="M0 400Q45 353 87 414Q120 394 130 446L112 512L0 520Z" fill="{dark if not pencil else "#e6e1d7"}"/>']
 if stage in ('pencil','value','color'):
  for vp,a,b in [(L,0,CX),(R,CX,915)]:
   for top,bottom in [(120,139),(337,350),(559,578)]:out.append(face(a,b,top,bottom,vp,'none' if pencil else trim,'#443e35' if pencil else 'none',1.7))
   cols=[40,133,226,319,412,505] if vp==L else [624,713,802]
   for x in cols:
    for top,bottom in [(196,307),(390,532)]:
     if vp==L and x==319 and top==390:continue
     out.append(face(x,x+43,top,bottom,vp,'none' if pencil else trim,'#443e35' if pencil else 'none',2))
     out.append(face(x+6,x+37,top+9,bottom-9,vp,'none' if pencil else '#41433b','#736b5d' if pencil else 'none',1))
   out.append(line(a,yy(a,345,vp),b,yy(b,345,vp),'#443e35' if pencil else trim,2))
  # Door and a simple entrance arch preserve the same construction planes.
  out.append(face(320,379,402,578,L,'none' if pencil else '#41433b','#443e35' if pencil else 'none',2))
  out.append(f'<path d="M303 335L303 270Q346 203 397 252L397 326" fill="none" stroke="{trim}" stroke-width="{2 if pencil else 6}"/>')
  out.append(line(590,120,590,578,'#514c43',3))
  if stage=='color':
   out.append(poly([(590,581),(683,566),(805,581),(668,614)],'#686953'))
   out.append('<path d="M37 456Q20 408 68 403M71 469Q117 441 91 416" fill="none" stroke="#82905c" stroke-width="18" stroke-linecap="round"/>')
 return ''.join(out)

def save(name,body,title,w=960,h=718):
 (ROOT/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">Teaching reconstruction, not a photograph of Vaughn Tucker\'s original painting process.</desc>{body}</svg>')
for stage in ('thumbnail','construction','pencil','value','color'):save('kingstown-'+stage+'.svg',king(stage),'Down Town Kingstown — '+stage+' study')
# Coordinated simplified road studies for the existing guided painting lesson.
def road(stage):
 isline=stage=='shapes';gray=stage=='value';warm=stage=='variation'
 sky='#fffaf0' if isline else '#eee9df' if gray else '#e9bd89' if warm else '#b9cfd0'
 mid='#fffaf0' if isline else '#a7a69c' if gray else '#867a64' if warm else '#7d907b'
 dark='#fffaf0' if isline else '#363e35' if gray else '#4e5d40'; light='#fffaf0' if isline else '#eee9df' if gray else '#ccb088' if warm else '#c2bca1'
 stroke='#615b4d' if isline else 'none'
 out=f'<rect width="600" height="800" fill="{sky}"/>'
 out+=poly([(0,320),(235,262),(300,295),(365,267),(600,220),(600,800),(0,800)],mid,stroke)
 out+=poly([(600,142),(534,218),(465,177),(435,286),(388,331),(359,390),(377,510),(600,696)],dark,stroke)
 out+=poly([(0,200),(64,228),(103,192),(163,253),(181,340),(233,355),(225,541),(0,723)],mid,stroke)
 out+=poly([(0,800),(211,503),(301,401),(355,399),(353,474),(600,800)],light,stroke)
 for pts in [[(35,385),(93,271),(161,385),(161,511),(35,550)],[(166,401),(211,335),(263,390),(263,477),(166,491)]]:out+=poly(pts,light,stroke)
 if stage in ('color','edges','variation'):
  out+=poly([(166,401),(211,335),(263,390),(256,405)],'#aa8062')
  out+=poly([(210,572),(392,527),(434,554),(189,610)],'#7f8876')
  out+=poly([(150,660),(462,606),(493,633),(115,704)],'#818a72')
  out+=poly([(80,414),(109,410),(109,505),(80,515)],'#445547')
 if stage=='edges':out+='<circle cx="109" cy="426" r="65" fill="none" stroke="#a85c29" stroke-width="4"/><path d="M176 415L285 306" stroke="#a85c29" stroke-width="3"/><rect x="208" y="250" width="246" height="65" rx="8" fill="#fffaf0"/><text x="223" y="289" font-family="sans-serif" font-size="21" fill="#3d3429">Keep a few crisp edges</text>'
 return out
for stage in ('shapes','value','color','edges','variation'):save('road-'+stage+'.svg',road(stage),'Jamaican Road Study — '+stage,600,800)
