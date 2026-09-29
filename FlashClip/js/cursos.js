// =========================
// CARREGAR CARDS
// =========================

import { carregarCursos } from "./carregarCardsCursos.js";

const listaCursos =
    document.getElementById("listaCursos");

carregarCursos(
    listaCursos,
    null,
    "./matricula.html",
    "./login.html",
    "../imagens/"
);
