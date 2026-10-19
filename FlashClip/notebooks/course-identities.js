const languages = {
  'c#': ['csharp', '#a66bdd', 'C#'],
  javascript: ['javascript', '#f7df1e', 'JavaScript'],
  java: ['java', '#ef8d43', 'Java'],
  python: ['python', '#6cb1dc', 'Python'],
  'c++': ['cplusplus', '#6a9fdd', 'C++'],
  php: ['php', '#a0a9dc', 'PHP'],
  prolog: ['prolog', '#ef9c6b', 'Prolog'],
  elixir: ['elixir', '#b29ad3', 'Elixir'],
  clojure: ['clojure', '#87bf72', 'Clojure'],
  ruby: ['ruby', '#e76661', 'Ruby'],
  minikanren: [null, '#e6c88c', 'miniKanren'],
};

export function courseIdentity(value) {
  const raw = String(value ?? '').trim();
  const [slug, color, name] = languages[raw.toLowerCase()] || [null, '#e6c88c', raw || 'Curso'];
  return {
    name, slug, color,
    logo: slug ? new URL(`./logos/${slug}.svg`, import.meta.url).href : null,
    logoLabel: slug === 'prolog' ? 'Símbolo do SWI-Prolog' : `Logo de ${name}`,
  };
}

const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function computerMarkup(value) {
  const language = courseIdentity(value);
  const name = escapeHTML(language.name);
  const brand = escapeHTML(new URL('../imagens/logoFlash.webp', import.meta.url).href);
  return `<details class="fc-course-computer" data-language="${name}" data-renderer="pending" style="--computer-accent:${language.color}">
    <summary class="fc-computer-trigger" aria-label="Abrir notebook de ${name}" aria-busy="true">
      <canvas class="fc-computer-canvas" aria-hidden="true"></canvas>
      <span class="fc-computer-loading" role="status"><span class="fc-computer-loading-ring" aria-hidden="true"></span><span>Preparando notebook…</span></span>
      <span class="fc-computer-fallback" aria-hidden="true">
        <span class="fc-computer-closed">
          <svg viewBox="0 0 360 190" fill="none"><ellipse cx="182" cy="151" rx="133" ry="15" fill="#000" opacity=".28"/><path d="M61 64 264 47 314 126 111 148 61 74Z" fill="#263c36" stroke="#789083"/><path d="m61 64 203-17 50 79-203 19Z" fill="#344b43" stroke="#94a396"/><path d="m111 145 203-19v6l-203 21-50-73v-6Z" fill="#0c211c" stroke="#547568"/><path d="m161 144 56-6" stroke="#e6c88c" stroke-width="2" stroke-linecap="round"/><image href="${brand}" x=".3" y=".32" width=".4" height=".35" transform="matrix(203 -17 50 81 61 64)"/></svg>
        </span>
        <span class="fc-computer-fallback-open">
          ${language.logo ? `<img src="${escapeHTML(language.logo)}" alt="" loading="lazy" width="70" height="70">` : ''}
          <b>${name}</b>
        </span>
      </span>
      <span class="fc-computer-hint"><span data-computer-action>Abrir notebook</span><span class="fc-computer-toggle" aria-hidden="true">↗︎</span></span>
    </summary>
    <span class="fc-computer-description">${escapeHTML(language.logoLabel)}. Clique no notebook novamente para fechar.</span>
  </details>`;
}
