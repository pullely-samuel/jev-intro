(function () {
  const stage = document.getElementById('stage');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const notesEl = document.getElementById('notes');
  let idx = 0;

  /* ---------- scaling ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- syntax highlighting ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const RX = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')(\s*:)?|\b(from|import|def|if|elif|else|return|for|in|with|as|and|or|not)\b|\b(None|True|False|true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\()/gm;
  function highlight(src, lang) {
    if (lang === 'text') return esc(src);
    let out = '', last = 0, m;
    RX.lastIndex = 0;
    while ((m = RX.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += '<span class="t-com">' + esc(m[1]) + '</span>';
      else if (m[2]) {
        const isKey = m[3] !== undefined && lang === 'json';
        out += '<span class="' + (isKey ? 't-key' : 't-str') + '">' + esc(m[2]) + '</span>' + esc(m[3] || '');
      }
      else if (m[4]) out += '<span class="t-kw">' + m[4] + '</span>';
      else if (m[5]) out += '<span class="t-lit">' + m[5] + '</span>';
      else if (m[6]) out += '<span class="t-num">' + m[6] + '</span>';
      else if (m[7]) out += '<span class="t-fn">' + m[7] + '</span>';
      last = RX.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  document.querySelectorAll('pre.code').forEach((el) => {
    const lang = el.dataset.lang || 'text';
    let raw = el.textContent.replace(/^\n/, '').replace(/\s+$/, '');
    const lines = raw.split('\n');
    const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    raw = lines.map((l) => l.slice(indent)).join('\n');
    el.innerHTML = highlight(raw, lang).replace(/«([^»]*)»/g, '<span class="hi">$1</span>');
  });

  /* ---------- probability bars ---------- */
  document.querySelectorAll('.bars[data-p]').forEach((el) => {
    const entries = el.dataset.p.split(',').map((s) => { const i = s.lastIndexOf(':'); return [s.slice(0, i).trim(), parseFloat(s.slice(i + 1))]; });
    const max = Math.max(...entries.map((e) => e[1]));
    el.innerHTML = entries.map(([k, v]) =>
      '<div class="b' + (v === max ? ' top' : '') + '"><span class="lab">' + esc(k) + '</span><span class="trk"><span class="fill" style="display:block;width:' + (v * 100) + '%"></span></span><span class="val">' + v.toFixed(2) + '</span></div>'
    ).join('');
  });

  /* ---------- mermaid ---------- */
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false, theme: 'base', securityLevel: 'loose',
      themeVariables: {
        background: '#1f1f1f', fontFamily: '-apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif', fontSize: '22px',
        primaryColor: '#262626', primaryTextColor: '#f2f4f8', primaryBorderColor: '#78a9ff',
        secondaryColor: '#262626', secondaryTextColor: '#f2f4f8', secondaryBorderColor: '#484848',
        tertiaryColor: '#1a1a1a', tertiaryTextColor: '#a8adb5', tertiaryBorderColor: '#484848',
        lineColor: '#8cb6ff', textColor: '#f2f4f8', mainBkg: '#262626', nodeBorder: '#78a9ff',
        clusterBkg: '#1a1a1a', clusterBorder: '#484848', edgeLabelBackground: '#161616', titleColor: '#a8adb5'
      },
      flowchart: { htmlLabels: true, curve: 'basis', padding: 14, nodeSpacing: 34, rankSpacing: 50, useMaxWidth: true }
    });
    mermaid.run({ querySelector: '.mermaid' }).catch((e) => console.error('mermaid', e));
  }

  /* ---------- navigation ---------- */
  const bar = document.querySelector('.progress');
  function show(i, push) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, k) => s.classList.toggle('active', k === idx));
    bar.style.width = ((idx + 1) / slides.length * 100) + '%';
    slides.forEach((s, k) => { const c = s.querySelector('.counter'); if (c) c.textContent = (k + 1) + ' / ' + slides.length; });
    if (push !== false) history.replaceState(null, '', '#' + (idx + 1));
    renderNotes();
  }
  function renderNotes() {
    const n = slides[idx].querySelector('aside.notes');
    notesEl.innerHTML = '<h4>Notes · slide ' + (idx + 1) + ' / ' + slides.length + '</h4>' + (n ? n.innerHTML : '<p>No notes.</p>');
  }
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); show(idx + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); show(idx - 1); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1);
    else if (k === 'n' || k === 'N') notesEl.classList.toggle('on');
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('#notes, a')) return;
    show(e.clientX < window.innerWidth * 0.25 ? idx - 1 : idx + 1);
  });
  window.addEventListener('hashchange', () => show((parseInt(location.hash.slice(1), 10) || 1) - 1, false));
  show((parseInt(location.hash.slice(1), 10) || 1) - 1, false);
})();
