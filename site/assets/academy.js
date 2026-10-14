/* Phone menu for the home, Kids and Adult Studio pages: show and hide the page links. */
(function(){
  var bar = document.querySelector('.topbar'); if(!bar) return;
  var toggle = bar.querySelector('.menu-toggle'); if(!toggle) return;
  function setOpen(open){
    bar.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function(){ setOpen(!bar.classList.contains('open')); });
  bar.querySelectorAll('.menu a').forEach(function(a){ a.addEventListener('click', function(){ setOpen(false); }); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') setOpen(false); });
})();
