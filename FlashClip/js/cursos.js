// =========================
// NOTEBOOK DE CURSOS
// =========================
// A página de Cursos começa no modo simples; o notebook abre ao escolher Avançado.

import { montarNotebookCursos } from "./notebookCursos.js?v=leve-2";

montarNotebookCursos(document.getElementById("notebookCursos"), {
  caminhoLogin: "./login.html",
  caminhoInscricoes: "./inscricoes.html",
  caminhoImagens: "../imagens/",
});
