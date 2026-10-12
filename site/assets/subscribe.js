/* "Learn with me" — a gentle reminder to join the Academy email list.
   Content pages: a small card slides up once the visitor has read part of the page (or after a while).
   Studio pages (data-mode="manual" on the script tag): it never interrupts painting; the studio calls
   VTSubscribe.prompt() after a drawing or painting is saved.
   "Not now" hides it for two weeks; signing up hides it for good. Uses the Academy's Mailchimp list. */
(function(){
  'use strict';
  var MC = 'https://vaughntuckerartacademy.us5.list-manage.com/subscribe/post-json?u=559886487deac33ef98a51cc9&id=f7754c0807&f_id=001f40edf0';
  var HONEYPOT = 'b_559886487deac33ef98a51cc9_f7754c0807';
  var KEY = 'vtaaSubscribe', SNOOZE_DAYS = 14;
  var script = document.currentScript;
  var manual = script && script.getAttribute('data-mode') === 'manual';

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || '{}'); }catch(e){ return {}; } }
  function save(v){ try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){} }
  function allowed(){
    var s = load();
    if(s.joined) return false;
    if(s.until && Date.now() < s.until) return false;
    try{ if(sessionStorage.getItem(KEY + 'Shown')) return false; }catch(e){}
    return true;
  }

  var CSS = '' +
  '.vt-sub{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:360px;max-width:calc(100vw - 32px);box-sizing:border-box;' +
    'background:#FAF6F0;color:#1B2A4A;border-radius:12px;padding:22px 22px 18px;font-family:Lato,"Helvetica Neue",Arial,sans-serif;' +
    'box-shadow:0 2px 6px rgba(27,42,74,.10),0 16px 40px -8px rgba(27,42,74,.35);border-top:4px solid #C9A84C;' +
    'transform:translateY(24px);opacity:0;transition:transform .45s ease,opacity .45s ease;}' +
  '.vt-sub.vt-in{transform:none;opacity:1;}' +
  '.vt-sub h2{margin:0 36px 6px 0;font:600 26px/1.15 "Cormorant Garamond",Garamond,Georgia,serif;color:#1B2A4A;}' +
  '.vt-sub p{margin:0 0 14px;font-size:16px;line-height:24px;color:#1B2A4A;}' +
  '.vt-sub form{display:flex;flex-wrap:wrap;gap:8px;margin:0;}' +
  '.vt-sub label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}' +
  '.vt-sub input[type=email]{flex:1 1 180px;min-width:0;min-height:46px;box-sizing:border-box;padding:0 12px;border:1px solid #E3D8C2;border-radius:6px;background:#fff;color:#1B2A4A;font:16px Lato,"Helvetica Neue",Arial,sans-serif;}' +
  '.vt-sub button{font:700 16px Lato,"Helvetica Neue",Arial,sans-serif;cursor:pointer;}' +
  '.vt-sub .vt-go{flex:0 0 auto;min-height:46px;padding:0 18px;border:0;border-radius:6px;background:#1B2A4A;color:#FAF6F0;}' +
  '.vt-sub .vt-go:disabled{opacity:.6;cursor:default;}' +
  '.vt-sub .vt-x{position:absolute;top:8px;right:8px;width:44px;height:44px;border:0;background:none;color:#5C6475;font-size:26px;line-height:1;border-radius:22px;}' +
  '.vt-sub .vt-later{margin-top:10px;min-height:44px;padding:0;border:0;background:none;color:#5C6475;font-weight:400;font-size:15px;text-decoration:underline;}' +
  '.vt-sub small{display:block;margin-top:8px;font-size:14px;line-height:20px;color:#5C6475;}' +
  '.vt-sub .vt-msg{margin:10px 0 0;font-size:15px;line-height:22px;}' +
  '.vt-sub .vt-msg.vt-err{color:#9b2c17;}' +
  '.vt-sub button:focus-visible,.vt-sub input:focus-visible{outline:none;box-shadow:0 0 0 3px #FAF6F0,0 0 0 6px #1B2A4A;}' +
  '@media (max-width:600px){.vt-sub{left:16px;right:16px;bottom:16px;width:auto;max-width:none;}}' +
  '@media (prefers-reduced-motion:reduce){.vt-sub{transition:none;transform:none;}}';

  var el = null, shown = false;
  function build(context){
    if(!document.getElementById('vt-sub-css')){ var st = document.createElement('style'); st.id = 'vt-sub-css'; st.textContent = CSS; document.head.appendChild(st); }
    el = document.createElement('aside');
    el.className = 'vt-sub'; el.setAttribute('aria-labelledby', 'vt-sub-h');
    var lead = (context === 'saved' ? 'Nice work. ' : '') +
      'Joining is free, and so are all the drawing and painting tools. My lessons come both ways: some free, some paid courses. Subscribers get the free ones and hear first when a new course opens.';
    el.innerHTML =
      '<button type="button" class="vt-x" aria-label="Close">&times;</button>' +
      '<h2 id="vt-sub-h">Learn with me</h2>' +
      '<p></p>' +
      '<form novalidate>' +
        '<label for="vt-sub-email">Your email address</label>' +
        '<input id="vt-sub-email" type="email" name="EMAIL" autocomplete="email" placeholder="Your email address" required>' +
        '<button type="submit" class="vt-go">Join free</button>' +
      '</form>' +
      '<small>Free to join. Unsubscribe whenever you like.</small>' +
      '<p class="vt-msg" role="status" aria-live="polite" hidden></p>' +
      '<button type="button" class="vt-later">Not now</button>';
    el.querySelector('p').textContent = lead;
    document.body.appendChild(el);
    el.querySelector('.vt-x').onclick = snooze;
    el.querySelector('.vt-later').onclick = snooze;
    el.querySelector('form').onsubmit = submit;
    el.addEventListener('keydown', function(e){ if(e.key === 'Escape') snooze(); });
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('vt-in'); }); });
  }
  function show(context){
    if(shown || !allowed()) return;
    shown = true;
    try{ sessionStorage.setItem(KEY + 'Shown', '1'); }catch(e){}
    build(context || 'page');
  }
  function hide(){ if(!el) return; el.classList.remove('vt-in'); var e = el; setTimeout(function(){ if(e.parentNode) e.parentNode.removeChild(e); }, 450); el = null; }
  function snooze(){ var s = load(); s.until = Date.now() + SNOOZE_DAYS * 864e5; save(s); hide(); }

  function message(text, isErr){
    var m = el.querySelector('.vt-msg'); m.hidden = false; m.textContent = text; m.classList.toggle('vt-err', !!isErr);
  }
  function submit(e){
    e.preventDefault();
    var input = el.querySelector('input[type=email]'), btn = el.querySelector('.vt-go'), email = input.value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ message('Please type your full email address, like name@example.com.', true); input.focus(); return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    var cb = 'vtSub' + Date.now(), s = document.createElement('script'), done = false;
    var timer = setTimeout(function(){ if(done) return; done = true; cleanup(); fallback(email); }, 9000);
    function cleanup(){ try{ delete window[cb]; }catch(_){ window[cb] = undefined; } if(s.parentNode) s.parentNode.removeChild(s); }
    window[cb] = function(r){
      if(done) return; done = true; clearTimeout(timer); cleanup();
      btn.disabled = false; btn.textContent = 'Join free';
      var msg = String((r && r.msg) || '').replace(/<[^>]*>/g, '').replace(/^\d+\s*-\s*/, '');
      if(r && r.result === 'success'){ joined(); return; }
      if(/already subscribed/i.test(msg)){ joined(true); return; }
      message(msg || 'That did not go through. Please try again in a moment.', true);
    };
    s.onerror = function(){ if(done) return; done = true; clearTimeout(timer); cleanup(); fallback(email); };
    s.src = MC + '&EMAIL=' + encodeURIComponent(email) + '&' + HONEYPOT + '=&c=' + cb;
    document.body.appendChild(s);
  }
  function joined(already){
    var s = load(); s.joined = true; save(s);
    el.querySelector('form').hidden = true; el.querySelector('small').hidden = true; el.querySelector('.vt-later').hidden = true;
    el.querySelector('p').hidden = true;
    message(already ? 'You are already on the list. Thank you for learning with me.' : 'Thank you! Check your inbox for an email to confirm. Then you will get free lessons and news of new courses.');
    setTimeout(hide, 7000);
  }
  function fallback(email){
    // if the quick sign-up is blocked, open Mailchimp's own sign-up page with the email filled in
    var f = document.createElement('form'); f.method = 'POST'; f.action = MC.replace('/post-json?', '/post?'); f.target = '_blank';
    [['EMAIL', email], [HONEYPOT, '']].forEach(function(p){ var i = document.createElement('input'); i.type = 'hidden'; i.name = p[0]; i.value = p[1]; f.appendChild(i); });
    document.body.appendChild(f); f.submit(); document.body.removeChild(f);
    var b = el.querySelector('.vt-go'); b.disabled = false; b.textContent = 'Join free';
    message('A Mailchimp page opened in a new tab to finish signing up.');
  }

  function auto(){
    if(manual) return;
    var fired = false;
    function go(){ if(fired) return; fired = true; window.removeEventListener('scroll', onScroll); clearTimeout(t); show('page'); }
    function onScroll(){
      var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      if(max > 0 && h.scrollTop / max > 0.45) go();
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    var t = setTimeout(go, 35000);
  }
  // the home page's own Join form counts too: once someone uses it, stop reminding them
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest && e.target.closest('[onclick*="handleJoin"]');
    var input = document.getElementById('joinEmail');
    if(b && input && /@/.test(input.value)){ var s = load(); s.joined = true; save(s); }
  }, true);

  window.VTSubscribe = { prompt: function(context){ setTimeout(function(){ show(context || 'saved'); }, 1200); } };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
