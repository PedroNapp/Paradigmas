// =========================
// LOGOS DAS LINGUAGENS
// =========================
//
// Usadas quando o curso não tem imagem
// cadastrada no banco. A chave é o nome
// do curso em minúsculas.
//
// Logos: Devicon (https://devicon.dev), licença MIT.
//

const LOGOS_CURSOS = {
  "c#": "linguagens/csharp.svg",
  javascript: "linguagens/javascript.svg",
  java: "linguagens/java.svg",
  python: "linguagens/python.svg",
  "c++": "linguagens/cplusplus.svg",
  php: "linguagens/php.svg",
  prolog: "linguagens/prolog.svg",
  elixir: "linguagens/elixir.svg",
  clojure: "linguagens/clojure.svg",
  ruby: "linguagens/ruby.svg",
};

// Retorna o caminho da logo relativo à pasta imagens/,
// ou null se a linguagem não tiver logo.
export function logoDoCurso(nomeCurso) {
  const chave = String(nomeCurso ?? "")
    .trim()
    .toLowerCase();

  return LOGOS_CURSOS[chave] || null;
}
