// =========================
// CONTADOR DO EVENTO
// =========================

const dataEvento = new Date("2026-12-05T14:00:00-03:00");

const dias = document.getElementById("dias");

const horas = document.getElementById("horas");

const minutos = document.getElementById("minutos");

const segundos = document.getElementById("segundos");

function atualizarContador() {
  const diferenca = dataEvento - new Date();

  if (diferenca <= 0) {
    dias.textContent = "00";
    horas.textContent = "00";
    minutos.textContent = "00";
    segundos.textContent = "00";

    return;
  }

  const totalSegundos = Math.floor(diferenca / 1000);

  const quantidadeDias = Math.floor(totalSegundos / 86400);

  const quantidadeHoras = Math.floor((totalSegundos % 86400) / 3600);

  const quantidadeMinutos = Math.floor((totalSegundos % 3600) / 60);

  const quantidadeSegundos = totalSegundos % 60;

  dias.textContent = quantidadeDias;

  horas.textContent = String(quantidadeHoras).padStart(2, "0");

  minutos.textContent = String(quantidadeMinutos).padStart(2, "0");

  segundos.textContent = String(quantidadeSegundos).padStart(2, "0");
}

atualizarContador();

setInterval(atualizarContador, 1000);

// =========================
// CURSOS
// =========================

import { carregarCursos } from "./carregarCardsCursos.js";

const listaCursos = document.getElementById("listaCursos");

carregarCursos(listaCursos, 3);
