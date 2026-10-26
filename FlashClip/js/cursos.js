// =========================
// NOTEBOOK DE CURSOS
// =========================
// Na página de Cursos o notebook já começa aberto.

import { montarNotebookCursos } from "./notebookCursos.js?v=1";

montarNotebookCursos(document.getElementById("notebookCursos"), {
  aberto: true,
  caminhoLogin: "./login.html",
  caminhoInscricoes: "./inscricoes.html",
  caminhoImagens: "../imagens/",
});
