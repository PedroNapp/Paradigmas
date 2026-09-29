import { clienteSupabase } from "./supabase.js";

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
// CARREGAR USUÁRIO
// =========================

export async function carregarUsuario() {
  const botaoUsuario = document.getElementById("botaoUsuario");

  const nomeUsuario = document.getElementById("nomeUsuario");

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
    console.error("Erro ao verificar sessão:", error);

    return;
  }

  // =========================
  // NÃO ESTÁ LOGADO
  // =========================

  if (!session) {
    botaoUsuario.textContent = "Entrar";
    nomeUsuario.textContent = "Entrar";

    botaoUsuario.onclick = irParaLogin;

    return;
  }

  // =========================
  // BUSCAR USUÁRIO
  // =========================

  const emailUsuario = session.user.email;

  const { data, error: erroUsuario } = await clienteSupabase
    .from("usuarios")
    .select("nome")
    .eq("email", emailUsuario)
    .single();

  // =========================
  // ERRO
  // =========================

  if (erroUsuario) {
    console.error("Erro ao buscar usuário:", erroUsuario);

    botaoUsuario.textContent = "Usuário";
    nomeUsuario.textContent = "Usuário";

    return;
  }

  // =========================
  // NOME
  // =========================

  const nomeCompleto = data.nome;

  const nomeExibido =
    nomeCompleto.length > 8 ? nomeCompleto.substring(0, 8) : nomeCompleto;

  botaoUsuario.textContent = nomeExibido;

  nomeUsuario.textContent = nomeCompleto;
}

// =========================
// ALTERAÇÃO DE SESSÃO
// =========================

clienteSupabase.auth.onAuthStateChange(function () {
  carregarUsuario();
});

// =========================
// INICIALIZAÇÃO
// =========================

carregarUsuario();
