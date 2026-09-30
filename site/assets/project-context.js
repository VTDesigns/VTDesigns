/* Explicit, local project handoff. No image or note is submitted until the student requests a critique. */
(function(){
  const KEY='vtaaActiveProjectV1';
  const safe=p=>p&&typeof p.title==='string'&&['kingstown-lesson.html','idea-studio.html'].includes(p.source);
  window.AcademyProject={
    save(p){if(!safe(p))return false;try{sessionStorage.setItem(KEY,JSON.stringify(p));return true;}catch{return false;}},
    read(){try{const p=JSON.parse(sessionStorage.getItem(KEY)||'null');return safe(p)?p:null;}catch{return null;}},
    clear(){try{sessionStorage.removeItem(KEY);}catch{}}
  };
  const p=AcademyProject.read();if(!p)return;
  const isCritique=location.pathname.includes('living-studio');const isDrawing=location.pathname.includes('drawing-studio');
  if(!isCritique&&!isDrawing)return;
  const host=document.createElement('aside');host.style.cssText='padding:14px 20px;background:#f3eddf;color:#29291f;font:14px/1.5 sans-serif;border-bottom:1px solid #d9d3c6;flex-shrink:0';
  const title=document.createElement('strong');title.textContent=p.title;host.append(title);
  const detail=document.createElement('p');detail.style.margin='5px 0';detail.textContent=[p.stage,p.checkpoint].filter(Boolean).join(' · ');host.append(detail);
  const back=document.createElement('a');back.href=p.source;back.textContent='Return to my project';host.append(back);
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='Clear project context';dismiss.style.cssText='margin-left:20px;background:none;border:0;text-decoration:underline;cursor:pointer';dismiss.onclick=()=>{AcademyProject.clear();host.remove();};host.append(dismiss);
  if(isDrawing){const link=document.createElement('a');link.href='living-studio.html#critique';link.textContent='Download your drawing, then get a critique →';link.style.marginLeft='20px';host.append(link);document.querySelector('nav').after(host);}
  if(isCritique){document.querySelector('#critique h2').after(host);const question=document.getElementById('studentQuestion');if(question&&!question.value)question.value=[`Project: ${p.title}`,p.stage?`Stage: ${p.stage}`:'',p.notes?`My notes: ${String(p.notes).slice(0,180)}`:'',p.checkpoint?`Check: ${String(p.checkpoint).slice(0,180)}`:'',p.goal?`Goal: ${String(p.goal).slice(0,140)}`:''].filter(Boolean).join('\n').slice(0,600);const stage=document.getElementById('stage');if(stage)stage.value=['Observe','Big shapes','Perspective','Pencil','Drawing project'].includes(p.stage)?'Sketch':['Values','Color'].includes(p.stage)?'Block-in':'Nearly finished';const focus=document.getElementById('critiqueFocus');if(focus&&p.source==='kingstown-lesson.html')focus.value='Drawing & Perspective';}
})();
