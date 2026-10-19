// =========================
// MENU RESPONSIVO
// =========================

const botaoMenu = document.getElementById("botaoMenu");

const menuMobile = document.getElementById("menuMobile");

// =========================
// USUÁRIO
// =========================

const botaoUsuario = document.getElementById("botaoUsuario");

const nomeUsuario = document.getElementById("nomeUsuario");

const botaoUsuarioMobile = document.getElementById("botaoUsuarioMobile");

const nomeUsuarioMobile = document.getElementById("nomeUsuarioMobile");

// =========================
// SINCRONIZAR USUÁRIO
// =========================

function sincronizarUsuario() {
  if (
    !botaoUsuario ||
    !nomeUsuario ||
    !botaoUsuarioMobile ||
    !nomeUsuarioMobile
  ) {
    return;
  }

  // =========================
  // BOTÃO
  // =========================

  botaoUsuarioMobile.textContent = botaoUsuario.textContent;

  // =========================
  // NOME
  // =========================

  nomeUsuarioMobile.textContent = nomeUsuario.textContent;
}

// =========================
// OBSERVAR ALTERAÇÕES
// =========================
//
// O auth.js pode alterar o usuário
// depois que a página já carregou.
// Por isso observamos mudanças.
//

if (botaoUsuario && nomeUsuario) {
  const observadorUsuario = new MutationObserver(function () {
    sincronizarUsuario();
  });

  observadorUsuario.observe(botaoUsuario, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  observadorUsuario.observe(nomeUsuario, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

// =========================
// SINCRONIZAÇÃO INICIAL
// =========================

sincronizarUsuario();

// =========================
// CLIQUE DO BOTÃO MOBILE
// =========================
//
// A ação do botão (ex.: ir para o login
// quando o visitante não está logado)
// é definida pelo auth.js só no botão
// do desktop. O botão mobile repassa
// o clique para ele.
//

if (botaoUsuario && botaoUsuarioMobile) {
  botaoUsuarioMobile.addEventListener("click", function () {
    botaoUsuario.click();
  });
}

// =========================
// PISCA-PISCA
// =========================
//
// Desenha um fio com leves curvas
// na base do cabeçalho e pendura
// lâmpadas coloridas ao longo dele.
// É redesenhado quando a largura muda.
//

const navbarPisca = document.querySelector(".navbar");

const SVG_PISCA = "http://www.w3.org/2000/svg";

const CORES_PISCA = ["vermelho", "dourado", "verde", "branco"];

function criarElementoPisca(tag, atributos) {
  const elemento = document.createElementNS(SVG_PISCA, tag);

  for (const nome in atributos) {
    elemento.setAttribute(nome, atributos[nome]);
  }

  return elemento;
}

function desenharPiscaPisca(svg, largura) {
  svg.replaceChildren();

  svg.setAttribute("viewBox", "0 0 " + largura + " 26");

  // =========================
  // FIO
  // =========================

  const alturaFio = 3;
  const curva = largura < 600 ? 5 : 7;

  const vaos = Math.max(2, Math.round(largura / 150));
  const larguraVao = largura / vaos;

  let caminho = "M 0 " + alturaFio;

  for (let i = 0; i < vaos; i++) {
    const meio = larguraVao * (i + 0.5);
    const fim = larguraVao * (i + 1);

    caminho +=
      " Q " + meio + " " + (alturaFio + curva * 2) + " " + fim + " " + alturaFio;
  }

  svg.appendChild(
    criarElementoPisca("path", { class: "pisca-fio", d: caminho }),
  );

  // =========================
  // LÂMPADAS
  // =========================

  const lampadasPorVao = 4;

  let indice = 0;

  for (let i = 0; i < vaos; i++) {
    for (let j = 0; j < lampadasPorVao; j++) {
      // posição na curva (t de 0 a 1 dentro do vão)
      const t = (j + 0.5) / lampadasPorVao;

      const x = larguraVao * (i + t);
      const y = alturaFio + curva * 4 * t * (1 - t);

      // leve inclinação acompanhando o fio
      const inclinacao =
        (Math.atan((curva * 4 * (1 - 2 * t)) / larguraVao) * 180) / Math.PI;

      // duas fileiras que se alternam, como num pisca-pisca de verdade
      const fileira = indice % 2 ? " alterna" : "";

      const lampada = criarElementoPisca("g", {
        class:
          "pisca-lampada " + CORES_PISCA[indice % CORES_PISCA.length] + fileira,
        transform:
          "translate(" + x + " " + y + ") rotate(" + inclinacao * 0.6 + ")",
      });

      lampada.appendChild(
        criarElementoPisca("rect", {
          class: "pisca-soquete",
          x: -2.2,
          y: -0.5,
          width: 4.4,
          height: 4,
          rx: 1,
        }),
      );

      lampada.appendChild(
        criarElementoPisca("path", {
          class: "pisca-vidro",
          d: "M -2.7 3.4 C -4 6.6 -1.3 10.6 0 12.2 C 1.3 10.6 4 6.6 2.7 3.4 Z",
        }),
      );

      lampada.appendChild(
        criarElementoPisca("ellipse", {
          class: "pisca-reflexo",
          cx: -1,
          cy: 6,
          rx: 0.6,
          ry: 1.5,
        }),
      );

      svg.appendChild(lampada);

      indice++;
    }
  }
}

if (navbarPisca) {
  const svgPisca = criarElementoPisca("svg", {
    class: "pisca-pisca",
    "aria-hidden": "true",
    preserveAspectRatio: "none",
  });

  // primeiro filho: o menu mobile fica por cima
  navbarPisca.prepend(svgPisca);

  let larguraPisca = 0;

  const observadorPisca = new ResizeObserver(function () {
    const largura = Math.round(navbarPisca.clientWidth);

    if (largura > 0 && largura !== larguraPisca) {
      larguraPisca = largura;

      desenharPiscaPisca(svgPisca, largura);
    }
  });

  observadorPisca.observe(navbarPisca);
}

// =========================
// MENU
// =========================

if (botaoMenu && menuMobile) {
  // =========================
  // ABRIR / FECHAR
  // =========================

  botaoMenu.addEventListener("click", function () {
    const aberto = menuMobile.classList.toggle("aberto");

    // =========================
    // ÍCONE
    // =========================

    botaoMenu.textContent = aberto ? "✕" : "☰";

    // =========================
    // ACESSIBILIDADE
    // =========================

    botaoMenu.setAttribute("aria-expanded", aberto);

    botaoMenu.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");

    // =========================
    // GARANTIR USUÁRIO ATUALIZADO
    // =========================

    sincronizarUsuario();
  });

  // =========================
  // FECHAR AO CLICAR EM LINK
  // =========================

  const linksMenu = menuMobile.querySelectorAll("a");

  linksMenu.forEach(function (link) {
    link.addEventListener("click", function () {
      fecharMenu();
    });
  });

  // =========================
  // FECHAR AO CLICAR FORA
  // =========================

  document.addEventListener("click", function (evento) {
    if (
      !menuMobile.contains(evento.target) &&
      !botaoMenu.contains(evento.target)
    ) {
      fecharMenu();
    }
  });

  // =========================
  // FECHAR COM ESC
  // =========================

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") {
      fecharMenu();
    }
  });

  // =========================
  // FECHAR MENU
  // =========================

  function fecharMenu() {
    menuMobile.classList.remove("aberto");

    botaoMenu.textContent = "☰";

    botaoMenu.setAttribute("aria-expanded", "false");

    botaoMenu.setAttribute("aria-label", "Abrir menu");
  }
}

