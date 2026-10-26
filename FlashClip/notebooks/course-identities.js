const languages = {
  'c#': ['csharp', '#a66bdd', 'C#'],
  javascript: ['javascript', '#f7df1e', 'JavaScript'],
  java: ['java', '#ef8d43', 'Java'],
  python: ['python', '#6cb1dc', 'Python'],
  'c++': ['cplusplus', '#6a9fdd', 'C++'],
  php: ['php-elephpant', '#a0a9dc', 'PHP'],
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
    // Ponteiro de 32px com o ícone da linguagem (notebooks/cursores/).
    cursor: slug ? new URL(`./cursores/${slug.replace('-elephpant', '')}.svg`, import.meta.url).href : null,
    logoLabel: slug === 'prolog' ? 'Símbolo do SWI-Prolog' : slug === 'php-elephpant' ? 'elePHPant, mascote do PHP' : `Logo de ${name}`,
  };
}
