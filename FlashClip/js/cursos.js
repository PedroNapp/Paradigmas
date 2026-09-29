// =========================
// CARREGAR CARDS
// =========================

import { carregarCursos } from "./carregarCardsCursos.js";

// =========================
// ELEMENTOS
// =========================

const listaCursos = document.getElementById("listaCursos");

// =========================
// INICIALIZAÇÃO
// =========================

carregarCursos(listaCursos, null, "./matricula.html");
