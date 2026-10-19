// =========================
// CARREGAR CARDS
// =========================

import { carregarCursos } from "./carregarCardsCursos.js?v=ready-2";

const listaCursos = document.getElementById("listaCursos");

carregarCursos(
  listaCursos,
  null,
  "./matricula.html",
  "./login.html",
  "../imagens/",
);
