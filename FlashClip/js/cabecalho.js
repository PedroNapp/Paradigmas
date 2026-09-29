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
