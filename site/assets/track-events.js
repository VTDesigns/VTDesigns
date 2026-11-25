/* Google Analytics actions for the Academy (sent through the Google tag that Tag Manager loads).
   Events: sign_up, contact_message, critique_request, artwork_submit,
           purchase_click (Stripe), donate_click (PayPal), email_click, youtube_click, share_click.
   Other pages can call window.vtTrack('event_name', {details}) directly. */
(function(){
  'use strict';
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') { window.gtag = function(){ window.dataLayer.push(arguments); }; }
  function track(name, params){ try { window.gtag('event', name, params || {}); } catch(e){} }
  window.vtTrack = track;

  // Email list sign-ups from the "Learn with me" card and the studios (subscribe.js announces them)
  window.addEventListener('vtaa-joined', function(){ track('sign_up', { method: 'learn_with_me_card' }); });

  // Forms that post to Netlify Forms
  var FORM_EVENTS = { 'personal-critique': 'critique_request', 'student-artwork': 'artwork_submit' };
  document.addEventListener('submit', function(e){
    var f = e.target, n = f && f.getAttribute && f.getAttribute('name');
    if (n && FORM_EVENTS[n] && (!f.checkValidity || f.checkValidity())) track(FORM_EVENTS[n], { form_name: n });
  }, true);

  // Important link clicks
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '', name = null;
    if (/buy\.stripe\.com/i.test(h)) name = 'purchase_click';
    else if (/paypal\.com\/donate/i.test(h)) name = 'donate_click';
    else if (h.indexOf('mailto:') === 0) name = 'email_click';
    else if (/facebook\.com\/sharer|twitter\.com\/intent|x\.com\/intent|wa\.me\/\?text|api\.whatsapp\.com\/send/i.test(h)) name = 'share_click';
    else if (/youtube\.com|youtu\.be/i.test(h)) name = 'youtube_click';
    if (name) track(name, { link_url: h, link_text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) });
  }, true);
})();
