// =========================
// CARREGAR CARDS
// =========================

import { carregarCursos } from "./carregarCardsCursos.js?v=ready-3";

const listaCursos = document.getElementById("listaCursos");

carregarCursos(
  listaCursos,
  null,
  "./matricula.html",
  "./login.html",
  "../imagens/",
);
