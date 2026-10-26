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

// Na home o notebook dos cursos começa fechado.

import { montarNotebookCursos } from "./notebookCursos.js?v=1";

montarNotebookCursos(document.getElementById("notebookCursos"), {
  aberto: false,
  caminhoLogin: "./html/login.html",
  caminhoInscricoes: "./html/inscricoes.html",
  caminhoImagens: "./imagens/",
})
  .then(()=>window.FlashClipBoot?.report('courses'))
  .catch(()=>window.FlashClipBoot?.fail('courses'));

// =========================
// ADICIONAR À AGENDA
// =========================
// Gera um arquivo .ics (Google Agenda, Outlook, Apple) com o horário do
// contador. Termina às 17h, quando acaba o coffee-break da programação.

const botaoAgenda = document.querySelector("[data-agenda-ics]");

function horarioIcs(data) {
  return data.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

botaoAgenda?.addEventListener("click", function () {
  const fimEvento = new Date(dataEvento.getTime() + 3 * 60 * 60 * 1000);

  const programacao = new URL("./html/programacao.html", location.href);
  programacao.search = "";

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FlashClip//Evento//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:flashclip-2026@flashclip",
    `DTSTAMP:${horarioIcs(new Date())}`,
    `DTSTART:${horarioIcs(dataEvento)}`,
    `DTEND:${horarioIcs(fimEvento)}`,
    "SUMMARY:FlashClip 2026",
    "LOCATION:Ulbra Palmas\\, Palmas - TO",
    `DESCRIPTION:Cursos de programação do FlashClip. Programação: ${programacao.href}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const arquivo = new Blob([linhas.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });

  const link = document.createElement("a");

  link.href = URL.createObjectURL(arquivo);
  link.download = "flashclip-2026.ics";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(function () {
    URL.revokeObjectURL(link.href);
  }, 1000);
});
