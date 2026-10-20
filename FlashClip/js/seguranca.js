// =========================
// SEGURANÇA DAS ENTRADAS
// =========================
// O Supabase envia cada valor como parâmetro: não há SQL montado no
// navegador. Mesmo assim, tudo que vem da pessoa (formulários, endereço,
// <select> e botões, que podem ser alterados pelo navegador) ou do banco
// passa por aqui: formato e tamanho antes de consultar, escape antes de
// virar HTML.
//
// Estas checagens não substituem as regras do próprio banco (RLS e
// restrições nas tabelas), porque a API pode ser chamada sem o site.

export const LIMITES = {
  nome: 100,
  email: 254,
  senha: 72,
  texto: 500,
};

// =========================
// HTML
// =========================

export function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, function (caractere) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[caractere];
  });
}

// =========================
// TEXTO LIVRE
// =========================
// Sem caracteres de controle ou invisíveis, espaços normalizados e com
// limite de tamanho.

export function textoLimpo(valor, limite = LIMITES.texto) {
  return String(valor ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

// =========================
// E-MAIL
// =========================
// Devolve o e-mail em minúsculas, ou null se o formato ou o tamanho não
// servirem.

export function emailNormalizado(valor) {
  const email = String(valor ?? "").trim().toLowerCase();

  if (email === "" || email.length > LIMITES.email) {
    return null;
  }

  const formatoValido = /^[^\s@<>()[\]\\,;:"']+@[^\s@<>()[\]\\,;:"']+\.[a-z]{2,}$/.test(email);

  return formatoValido ? email : null;
}

// =========================
// IDENTIFICADOR NUMÉRICO
// =========================
// Para ids que chegam pelo endereço, por um <select> ou por um botão:
// aceita só dígitos (nada de "1e3", "0x10" ou espaços) e devolve o número,
// ou null.

export function inteiroPositivo(valor) {
  const texto = String(valor ?? "").trim();

  if (!/^\d{1,15}$/.test(texto)) {
    return null;
  }

  const numero = Number(texto);

  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}
