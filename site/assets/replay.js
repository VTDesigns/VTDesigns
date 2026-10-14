/* Studio replay — shared by the Drawing Studio and the Oil Studio.
   Quietly keeps a small picture of the artwork after every change (and a few times a second while drawing),
   plays the artwork back being made, and turns it into branded videos for YouTube, Shorts/Reels/TikTok and square posts.
   Usage:  const R = StudioReplay.create({snapshot: () => canvas, toast: msg => {}, noun: 'drawing'});
           R.changed()  after any change        R.drawing()  while a stroke is in progress
           R.open()     show the player          R.reset()    new artwork
           R.state()/R.load(s) and R.takeDirty() to keep the replay with the saved artwork
   Levels: visitors make 15-second videos at standard quality. Free members (joined the email list on this
   device, see assets/subscribe.js) also get 30 and 60 seconds, HD, and their name on the video. */
(function(){
  'use strict';
  const MAXSIDE = 960, MAXFRAMES = 600;
  const BRAND = 'Vaughn Tucker Art Academy', URL_TXT = 'vaughntuckerartacademy.com';
  const FORMATS = {
    wide:   {w:1280, h:720,  label:'YouTube (wide)',               file:'youtube'},
    tall:   {w:720,  h:1280, label:'Shorts, Reels, TikTok (tall)', file:'short'},
    square: {w:1080, h:1080, label:'Square (Instagram, Facebook)', file:'square'}
  };
  const HD = {wide:1.5, tall:1.5, square:1};          // members: 1920×1080, 1080×1920, 1080×1080
  const SD = {wide:1, tall:1, square:720/1080};       // visitors: 1280×720, 720×1280, 720×720
  const member = () => !!(window.VTSubscribe && window.VTSubscribe.isMember());
  const clamp = (v,a,b) => v<a?a:v>b?b:v;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const CSS = `
.sr-veil{position:fixed;inset:0;z-index:1000;background:rgba(18,13,6,.95);overflow-y:auto;color:#fdfaf4;font-family:'DM Sans','Outfit',system-ui,sans-serif;
  padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));-webkit-user-select:none;user-select:none;}
.sr-veil[hidden]{display:none;}
.sr-in{max-width:880px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:14px;}
.sr-in h3{margin:4px 0 0;font:700 21px 'Playfair Display','Cormorant Garamond',Georgia,serif;text-align:center;}
.sr-stage{width:100%;display:flex;justify-content:center;}
.sr-stage canvas{display:block;max-width:100%;max-height:52vh;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.5);border-radius:2px;}
.sr-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;width:100%;}
.sr-bar input[type=range]{flex:1 1 200px;accent-color:#c9943a;height:30px;}
.sr-veil button{min-height:42px;padding:0 16px;border-radius:21px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fdfaf4;font:inherit;font-size:14px;cursor:pointer;touch-action:manipulation;}
.sr-veil button:focus-visible,.sr-veil input:focus-visible{outline:3px solid #c9943a;outline-offset:2px;}
.sr-veil button.on{background:#c9943a;border-color:#c9943a;color:#1a1208;font-weight:500;}
.sr-veil button.go{background:#b85c1a;border-color:#b85c1a;font-weight:500;}
.sr-veil button:disabled{opacity:.5;cursor:default;}
.sr-share{width:100%;border-top:1px solid rgba(255,255,255,.14);padding-top:14px;display:grid;gap:10px;}
.sr-share h4{margin:0;font:700 17px 'Playfair Display','Cormorant Garamond',Georgia,serif;}
.sr-share p{margin:0;font-size:13px;line-height:1.5;color:rgba(253,250,244,.7);}
.sr-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.sr-row b{font-weight:500;font-size:13px;color:rgba(253,250,244,.75);min-width:64px;}
.sr-veil input[type=text]{flex:1 1 220px;min-height:42px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fdfaf4;padding:0 12px;font:inherit;font-size:15px;-webkit-user-select:text;user-select:text;}
.sr-veil button.lock{border-style:dashed;}
.sr-veil button .tag{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:9px;background:rgba(201,148,58,.22);color:#e8c38a;font-size:11px;}
.sr-perks{border:1px solid rgba(201,148,58,.45);border-radius:10px;padding:10px 12px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;}
.sr-perks p{flex:1 1 220px;}
.sr-perks[hidden],.sr-row[hidden]{display:none;}
.sr-note{font-size:13px;color:rgba(253,250,244,.75);text-align:center;min-height:1.2em;}
@media (prefers-reduced-motion:reduce){.sr-veil *{transition:none!important;}}`;

  function create(opts){
    let frames = [], step = 1, count = 0, busy = false, again = false, dirty = false, lastT = 0, ui = null, p = null;
    const toast = opts.toast || (()=>{});
    const noun = opts.noun || 'drawing';

    function small(){
      const src = opts.snapshot(); if(!src || !src.width) return null;
      const k = Math.min(1, MAXSIDE / Math.max(src.width, src.height));
      if(k === 1) return src;
      const c = document.createElement('canvas'); c.width = Math.round(src.width*k); c.height = Math.round(src.height*k);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height); return c;
    }
    function grab(){
      if(busy){ again = true; return; } busy = true;
      let c; try{ c = small(); }catch(_){ c = null; }
      if(!c){ busy = false; return; }
      c.toBlob(b => {
        busy = false;
        if(b && (++count % step === 0)){
          frames.push(b); dirty = true;
          if(frames.length > MAXFRAMES){ frames = frames.filter((_, i) => i % 2 === 1 || i === frames.length - 1); step *= 2; }
        }
        if(again){ again = false; grab(); }
      }, 'image/jpeg', .8);
    }

    /* ── player ── */
    function build(){
      if(!document.getElementById('sr-css')){ const s = document.createElement('style'); s.id = 'sr-css'; s.textContent = CSS; document.head.append(s); }
      const v = document.createElement('div'); v.className = 'sr-veil'; v.hidden = true; v.setAttribute('role','dialog'); v.setAttribute('aria-label','Replay');
      v.innerHTML = `<div class="sr-in">
        <h3>Watch your ${noun} come together</h3>
        <div class="sr-stage"><canvas></canvas></div>
        <div class="sr-bar">
          <button class="go" data-a="play">Pause</button>
          <input type="range" min="0" max="0" value="0" aria-label="Position in the replay">
          <button data-a="speed" aria-label="Replay speed">1×</button>
          <button data-a="close">Back to my ${noun}</button>
        </div>
        <section class="sr-share" aria-label="Make a video to share">
          <h4>Make a video to share</h4>
          <p>Your ${noun} being made, with the Academy name and web address. Social apps let you add music when you post.</p>
          <div class="sr-row" data-g="fmt"><b>Shape</b></div>
          <div class="sr-row" data-g="len"><b>Length</b></div>
          <div class="sr-row"><b>Title</b><input type="text" data-f="title" maxlength="60" placeholder="Optional, for example: Hills of St. Ann" aria-label="Title shown on the video"></div>
          <div class="sr-row" data-g="name"><b>Your name</b><input type="text" data-f="name" maxlength="40" placeholder="Optional, shown as: by Maria" aria-label="Your name shown on the video"></div>
          <div class="sr-perks" data-g="perks"><p>Free members make 30 and 60 second videos in HD, with their name on them.</p><button class="go" data-a="join">Join free to unlock</button></div>
          <div class="sr-row"><button class="go" data-a="make">Make video</button><span class="sr-q" style="font-size:13px;color:rgba(253,250,244,.7)"></span></div>
        </section>
        <div class="sr-note" role="status"></div>
      </div>`;
      document.body.append(v);
      const q = s => v.querySelector(s);
      ui = {v, cv:q('.sr-stage canvas'), play:q('[data-a=play]'), pos:q('input[type=range]'), speed:q('[data-a=speed]'), note:q('.sr-note'),
            title:q('[data-f=title]'), name:q('[data-f=name]'), make:q('[data-a=make]'), fmt:'tall', len:15,
            nameRow:q('[data-g=name]'), perks:q('[data-g=perks]'), qual:q('.sr-q')};
      try{ ui.name.value = localStorage.getItem('vtaaVideoName') || ''; }catch(_){}
      ui.name.oninput = () => { try{ localStorage.setItem('vtaaVideoName', ui.name.value.trim()); }catch(_){} };
      q('[data-a=join]').onclick = () => window.VTSubscribe && VTSubscribe.unlock(levels);
      const fmtRow = q('[data-g=fmt]'), lenRow = q('[data-g=len]');
      Object.entries(FORMATS).forEach(([k,f]) => { const b = document.createElement('button'); b.textContent = f.label; b.dataset.k = k;
        b.onclick = () => { ui.fmt = k; [...fmtRow.querySelectorAll('button')].forEach(x => x.classList.toggle('on', x === b)); }; fmtRow.append(b); });
      [15,30,60].forEach(s => { const b = document.createElement('button'); b.dataset.s = s;
        b.onclick = () => {
          if(s > 15 && !member()){ if(window.VTSubscribe) VTSubscribe.unlock(() => { levels(); b.click(); }); return; }
          ui.len = s; [...lenRow.querySelectorAll('button')].forEach(x => x.classList.toggle('on', x === b)); }; lenRow.append(b); });
      ui.lenRow = lenRow;
      fmtRow.querySelector('[data-k=tall]').classList.add('on'); lenRow.querySelector('[data-s="15"]').classList.add('on');
      ui.play.onclick = () => { if(p.i >= p.list.length - 1){ show(0); p.playing = true; } else p.playing = !p.playing; tick(); };
      ui.pos.oninput = () => { p.playing = false; tick(); show(+ui.pos.value); };
      ui.speed.onclick = () => { p.speed = p.speed >= 4 ? 1 : p.speed * 2; ui.speed.textContent = p.speed + '×'; };
      q('[data-a=close]').onclick = close;
      ui.make.onclick = makeVideo;
      v.addEventListener('keydown', e => { if(e.key === 'Escape') close(); e.stopPropagation(); });
      v.addEventListener('pointerdown', e => e.stopPropagation());
      window.addEventListener('vtaa-joined', levels);
      levels();
    }
    // Show what this visitor's level allows: free members get longer, HD videos with their name.
    function levels(){
      if(!ui) return; const m = member();
      [...ui.lenRow.querySelectorAll('button')].forEach(b => { const s = +b.dataset.s, locked = s > 15 && !m;
        b.innerHTML = s + ' seconds' + (locked ? '<span class="tag">free members</span>' : ''); b.classList.toggle('lock', locked); });
      if(!m && ui.len > 15){ ui.len = 15; [...ui.lenRow.querySelectorAll('button')].forEach(x => x.classList.toggle('on', x.dataset.s === '15')); }
      ui.nameRow.hidden = !m; ui.perks.hidden = m;
      ui.qual.textContent = m ? 'HD quality' : 'Standard quality';
    }
    async function show(i){
      const b = await createImageBitmap(p.list[i]); const x = ui.cv.getContext('2d');
      x.drawImage(b, 0, 0, ui.cv.width, ui.cv.height); if(b.close) b.close(); p.i = i; ui.pos.value = i;
    }
    const fps = () => clamp(p.list.length / 12, 6, 30) * p.speed;   // about 12 seconds at normal speed
    function tick(){
      clearTimeout(p.timer); ui.play.textContent = p.playing ? 'Pause' : 'Play';
      if(!p.playing) return;
      if(p.i >= p.list.length - 1){ p.playing = false; ui.play.textContent = 'Play again'; return; }
      p.timer = setTimeout(async () => { await show(p.i + 1); tick(); }, 1000 / fps());
    }
    async function open(){
      let last = null; try{ const c = small(); if(c) last = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); }catch(_){}
      const list = frames.concat(last ? [last] : []);
      if(list.length < 4){ toast(`Keep going a little longer first. The replay records your ${noun} as you work.`); return; }
      if(!ui) build();
      const first = await createImageBitmap(list[0]); ui.cv.width = first.width; ui.cv.height = first.height; if(first.close) first.close();
      p = {list, i:0, playing:true, speed:1, timer:0};
      ui.pos.max = list.length - 1; ui.speed.textContent = '1×'; ui.note.textContent = '';
      const canRecord = !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
      ui.v.querySelector('.sr-share').hidden = !canRecord;
      levels(); ui.v.hidden = false; await show(0); tick(); ui.play.focus();
    }
    function close(){ if(p){ clearTimeout(p.timer); p.playing = false; } if(ui) ui.v.hidden = true; if(opts.onClose) opts.onClose(); }

    /* ── branded video ── */
    function wrap(x, text, maxW){
      const words = text.split(/\s+/), lines = []; let line = '';
      for(const w of words){ const t = line ? line + ' ' + w : w; if(x.measureText(t).width > maxW && line){ lines.push(line); line = w; } else line = t; }
      if(line) lines.push(line); return lines.slice(0, 2);
    }
    function layout(f){
      if(f === 'wide')   return {art:[40, 64, 1200, 590], title:{x:40, y:44, size:30, align:'left', maxW:1200}, brand:{x:40, y:694, size:22, align:'left'}, url:{x:1240, y:694, size:20, align:'right'}};
      if(f === 'square') return {art:[60, 140, 960, 790], title:{x:540, y:84, size:40, align:'center', maxW:960}, brand:{x:540, y:996, size:34, align:'center'}, url:{x:540, y:1042, size:26, align:'center'}};
      return                {art:[36, 300, 648, 720], title:{x:360, y:170, size:46, align:'center', maxW:640}, brand:{x:360, y:1120, size:38, align:'center'}, url:{x:360, y:1172, size:28, align:'center'}};
    }
    function paint(x, f, bmp, title, outro, name){
      const F = FORMATS[f], L = layout(f);
      x.fillStyle = '#14100a'; x.fillRect(0, 0, F.w, F.h);
      const [ax, ay, aw, ah] = L.art, k = Math.min(aw / bmp.width, ah / bmp.height), w = bmp.width * k, h = bmp.height * k;
      const dx = ax + (aw - w) / 2, dy = ay + (ah - h) / 2;
      x.save(); x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 24; x.fillStyle = '#fff'; x.fillRect(dx, dy, w, h); x.restore();
      x.imageSmoothingQuality = 'high'; x.drawImage(bmp, dx, dy, w, h);
      x.textBaseline = 'alphabetic';
      if(title){
        x.fillStyle = '#fdfaf4'; x.font = `700 ${L.title.size}px 'Playfair Display', Georgia, serif`; x.textAlign = L.title.align;
        const lines = wrap(x, title, L.title.maxW).slice(0, f === 'wide' ? 1 : 2), lh = L.title.size * 1.18, y0 = L.title.y - (lines.length - 1) * lh;
        lines.forEach((t, i) => x.fillText(t, L.title.x, y0 + i * lh));
      }
      if(name){
        const sz = Math.round(L.title.size * (title ? .62 : .8)), y = title ? (f === 'wide' ? L.title.y : L.title.y + sz * 1.3) : L.title.y;
        x.fillStyle = 'rgba(253,250,244,.85)'; x.font = `italic 500 ${sz}px 'Playfair Display', Georgia, serif`;
        if(f === 'wide' && title){ x.textAlign = 'right'; x.fillText('by ' + name, L.url.x, y); }
        else { x.textAlign = L.title.align; x.fillText('by ' + name, L.title.x, y); }
      }
      x.textAlign = L.brand.align; x.fillStyle = '#c9943a'; x.font = `italic 700 ${L.brand.size}px 'Playfair Display', Georgia, serif`;
      x.fillText(outro ? 'Learn to draw and paint with me' : BRAND, L.brand.x, L.brand.y);
      x.textAlign = L.url.align; x.fillStyle = 'rgba(253,250,244,.85)'; x.font = `500 ${L.url.size}px 'DM Sans', system-ui, sans-serif`;
      x.fillText(URL_TXT, L.url.x, L.url.y);
    }
    async function makeVideo(){
      const type = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      if(!type){ ui.note.textContent = 'This browser cannot make videos. Try Safari or Chrome.'; return; }
      const m = member(), f = ui.fmt, F = FORMATS[f], title = ui.title.value.trim(), name = m ? ui.name.value.trim() : '';
      const total = m ? ui.len : 15, k = (m ? HD : SD)[f], outroS = 2.5, introS = (title || name) ? 1.2 : 0.4;
      clearTimeout(p.timer); p.playing = false; ui.play.textContent = 'Play';
      ui.make.disabled = true; const label = ui.make.textContent; ui.make.textContent = 'Making your video…';
      try{
        try{ await Promise.all(["700 40px 'Playfair Display'", "italic 700 40px 'Playfair Display'", "500 20px 'DM Sans'"].map(s => document.fonts.load(s))); }catch(_){}
        const c = document.createElement('canvas'); c.width = Math.round(F.w * k); c.height = Math.round(F.h * k); const x = c.getContext('2d');
        x.scale(k, k);   // the layout is drawn in standard sizes and scaled up for HD
        // the recording canvas is shown in place of the player while the video is made
        const holder = ui.cv.parentNode, keep = ui.cv; c.style.cssText = keep.style.cssText; holder.replaceChild(c, keep);
        const rec = new MediaRecorder(c.captureStream(30), {mimeType:type, videoBitsPerSecond: m ? 12e6 : 5e6}), parts = [];
        rec.ondataavailable = e => { if(e.data.size) parts.push(e.data); };
        const done = new Promise(r => rec.onstop = r);
        const n = p.list.length, playS = Math.max(2, total - outroS - introS), use = Math.min(n, Math.floor(playS * 30));
        const idx = Array.from({length:use}, (_, i) => Math.round(i * (n - 1) / Math.max(1, use - 1)));
        let bmp = await createImageBitmap(p.list[idx[0]]), outro = false; paint(x, f, bmp, title, false, name);
        // repaint steadily: a recorder only keeps frames when the canvas is drawn, so held pictures need redrawing
        const beat = setInterval(() => paint(x, f, bmp, title, outro, name), 1000 / 30);
        rec.start(250); const t0 = performance.now();
        await sleep(introS * 1000);
        let next = idx.length > 1 ? createImageBitmap(p.list[idx[1]]) : null;
        for(let i = 1; i < idx.length; i++){
          const nb = await next; next = i + 1 < idx.length ? createImageBitmap(p.list[idx[i + 1]]) : null;
          const old = bmp; bmp = nb; paint(x, f, bmp, title, false, name); if(old.close) old.close();
          const due = t0 + introS * 1000 + i * playS * 1000 / idx.length, wait = due - performance.now();
          if(wait > 0) await sleep(wait);
          ui.note.textContent = 'Recording ' + Math.round(100 * i / idx.length) + '%';
        }
        outro = true; paint(x, f, bmp, title, true, name); ui.note.textContent = 'Finishing…';
        await sleep(outroS * 1000); clearInterval(beat); rec.stop(); await done; if(bmp.close) bmp.close();
        holder.replaceChild(keep, c);
        const blob = new Blob(parts, {type:type.split(';')[0]}), ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
        const file = 'vtaa-' + noun + '-' + F.file + (m ? '-hd' : '') + '.' + ext;
        await save(blob, file);
        ui.note.textContent = 'Video saved: ' + file + (ext === 'webm' ? '. YouTube accepts this file; for Instagram, make it in Safari for an MP4.' : '');
        if(!m && window.VTSubscribe) VTSubscribe.prompt('video');   // a gentle invitation after a visitor's video
      }catch(err){
        ui.note.textContent = 'The video could not be made on this device.';
        const c = ui.v.querySelector('.sr-stage canvas'); if(c !== ui.cv) c.replaceWith(ui.cv);
      }
      ui.make.disabled = false; ui.make.textContent = label;
    }
    async function save(blob, name){
      if(opts.save){ await opts.save(blob, name); return; }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 15000);
    }

    return {
      changed(){ setTimeout(grab, 0); },
      drawing(){ const t = performance.now(); if(t - lastT > 200){ lastT = t; grab(); } },
      reset(){ frames = []; step = 1; count = 0; dirty = true; },
      open, close,
      state(){ return {frames:frames.slice(), step}; },
      load(s){ if(s && Array.isArray(s.frames)){ frames = s.frames; step = s.step || s.capStep || 1; } },
      takeDirty(){ const d = dirty; dirty = false; return d; },
      get length(){ return frames.length; }
    };
  }
  window.StudioReplay = {create, FORMATS};
})();
