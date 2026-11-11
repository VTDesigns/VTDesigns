(function () {
  let availability;
  const sessionImages = new Map();
  function status() {
    if (!availability) availability = fetch('/api/idea-image').then(r => r.ok ? r.json() : {}).then(d => !!d.enabled).catch(() => false);
    return availability;
  }
  window.addIdeaImage = function (box, project, idea) {
    const section = document.createElement('section');
    section.className = 'paint';
    section.innerHTML = '<div class="project-kicker">Picture your idea</div><h4>Your concept sketch</h4><p class="notice">Generate an AI pencil sketch of this composition. Use it for inspiration and compare it with the construction diagram as you draw.</p><button type="button" class="btn btn-ghost" style="margin-top:12px" disabled>Checking availability…</button><p class="notice" role="status" aria-live="polite" style="margin-top:12px"></p><div class="concept-output"></div>';
    box.querySelector('.paint').before(section);
    const button = section.querySelector('button'), message = section.querySelector('[role="status"]'), output = section.querySelector('.concept-output');
    const id = JSON.stringify([idea, project]);
    function display(src) {
      const img = document.createElement('img');
      img.src = src; img.alt = 'AI-generated pencil concept for ' + project.title;
      img.style.cssText = 'display:block;width:100%;max-width:640px;height:auto;border-radius:8px;margin:16px 0';
      const download = document.createElement('a');
      download.className = 'btn btn-ghost'; download.href = src; download.download = 'idea-studio-concept.jpg'; download.textContent = 'Download sketch';
      output.replaceChildren(img, download);
      button.hidden = true;
      message.textContent = 'AI-generated concept reference. Download it to keep a copy; this image stays available during this page visit.';
    }
    if (sessionImages.has(id)) { display(sessionImages.get(id)); return; }
    status().then(enabled => {
      button.disabled = !enabled;
      button.textContent = 'Generate concept sketch';
      if (!enabled) message.textContent = 'Concept sketches are not available yet. You can still use the drawing plan and construction diagram.';
    });
    button.addEventListener('click', async () => {
      button.disabled = true; button.textContent = 'Drawing your concept…';
      message.textContent = 'Creating your pencil sketch. This can take up to a minute.';
      try {
        const res = await fetch('/api/idea-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea, project }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.image || data.mediaType !== 'image/jpeg') throw new Error(data.error || (res.status === 429 ? 'Please wait three minutes before trying again.' : 'The sketch could not be generated. Please try later.'));
        const src = 'data:image/jpeg;base64,' + data.image;
        sessionImages.set(id, src); display(src);
      } catch (err) { message.textContent = err.message; }
      finally { button.disabled = false; button.textContent = 'Generate concept sketch'; }
    });
  };
})();
