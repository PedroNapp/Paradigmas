import { clienteSupabase } from "./supabase.js";

// =========================
// CACHE DO USUÁRIO
// =========================

const CHAVE_USUARIO = "flashclip_usuario";

// =========================
// CAMINHO PARA LOGIN
// =========================

function irParaLogin() {
  const caminho = window.location.pathname;

  const paginasInternas = [
    "/programacao/",
    "/sobre/",
    "/patrocinadores/",
    "/inscricoes/",
    "/contato/",
    "/matricula/",
  ];

  const estaDentroDePasta = paginasInternas.some(function (pagina) {
    return caminho.includes(pagina);
  });

  if (estaDentroDePasta) {
    window.location.href = "../html/login.html";
  } else {
    window.location.href = "html/login.html";
  }
}

// =========================
// APLICAR USUÁRIO NA TELA
// =========================

function aplicarUsuario(nomeCompleto) {
  const botaoUsuario =
    document.getElementById("botaoUsuario");

  const nomeUsuario =
    document.getElementById("nomeUsuario");

  if (!botaoUsuario || !nomeUsuario) {
    return;
  }

  const nomeExibido =
    nomeCompleto.length > 8
      ? nomeCompleto.substring(0, 8)
      : nomeCompleto;

  botaoUsuario.textContent = nomeExibido;

  nomeUsuario.textContent = nomeCompleto;
}

// =========================
// APLICAR USUÁRIO DESLOGADO
// =========================

function aplicarUsuarioDeslogado() {
  const botaoUsuario =
    document.getElementById("botaoUsuario");

  const nomeUsuario =
    document.getElementById("nomeUsuario");

  if (!botaoUsuario || !nomeUsuario) {
    return;
  }

  botaoUsuario.textContent = "Entrar";
  nomeUsuario.textContent = "Entrar";

  botaoUsuario.onclick = irParaLogin;
}

// =========================
// CARREGAR USUÁRIO
// =========================

export async function carregarUsuario() {
  const botaoUsuario =
    document.getElementById("botaoUsuario");

  const nomeUsuario =
    document.getElementById("nomeUsuario");

  if (!botaoUsuario || !nomeUsuario) {
    return;
  }

  // =========================
  // VERIFICAR SESSÃO
  // =========================

  const {
    data: { session },
    error,
  } = await clienteSupabase.auth.getSession();

  if (error) {
    console.error(
      "Erro ao verificar sessão:",
      error,
    );

    return;
  }

  // =========================
  // NÃO ESTÁ LOGADO
  // =========================

  if (!session) {
    localStorage.removeItem(CHAVE_USUARIO);

    aplicarUsuarioDeslogado();

    return;
  }

  // =========================
  // TENTAR USAR CACHE
  // =========================

  const usuarioSalvo =
    localStorage.getItem(CHAVE_USUARIO);

  if (usuarioSalvo) {
    try {
      const usuario =
        JSON.parse(usuarioSalvo);

      // Verificar se o cache pertence
      // ao usuário atualmente logado
      if (
        usuario.email === session.user.email &&
        usuario.nome
      ) {
        aplicarUsuario(usuario.nome);

        return;
      }

    } catch (erro) {
      console.warn(
        "Cache do usuário inválido.",
      );

      localStorage.removeItem(
        CHAVE_USUARIO,
      );
    }
  }

  // =========================
  // BUSCAR USUÁRIO
  // =========================

  const emailUsuario =
    session.user.email;

  const {
    data,
    error: erroUsuario,
  } = await clienteSupabase
    .from("usuarios")
    .select("nome")
    .eq("email", emailUsuario)
    .single();

  // =========================
  // ERRO
  // =========================

  if (erroUsuario) {
    console.error(
      "Erro ao buscar usuário:",
      erroUsuario,
    );

    botaoUsuario.textContent =
      "Usuário";

    nomeUsuario.textContent =
      "Usuário";

    return;
  }

  // =========================
  // NOME
  // =========================

  const nomeCompleto = data.nome;

  // =========================
  // SALVAR CACHE
  // =========================

  localStorage.setItem(
    CHAVE_USUARIO,
    JSON.stringify({
      email: emailUsuario,
      nome: nomeCompleto,
    }),
  );

  // =========================
  // MOSTRAR NOME
  // =========================

  aplicarUsuario(nomeCompleto);
}

// =========================
// ALTERAÇÃO DE SESSÃO
// =========================

clienteSupabase.auth.onAuthStateChange(
  function (evento) {

    // =========================
    // LOGIN
    // =========================

    if (
      evento === "SIGNED_IN" ||
      evento === "INITIAL_SESSION"
    ) {
      carregarUsuario();
      return;
    }

    // =========================
    // LOGOUT
    // =========================

    if (evento === "SIGNED_OUT") {
      localStorage.removeItem(
        CHAVE_USUARIO,
      );

      aplicarUsuarioDeslogado();
    }
  },
);

// =========================
// INICIALIZAÇÃO
// =========================

carregarUsuario();