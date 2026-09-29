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

  const {
    data: { session },
    error,
  } = await clienteSupabase.auth.getSession();

  if (error) {
    console.error("Erro ao verificar sessão:", error);
    return;
  }

  if (!session) {
    botaoUsuario.textContent = "Entrar";
    nomeUsuario.textContent = "Entrar";
    botaoUsuario.onclick = irParaLogin;
    return;
  }

  const usuarioId = session.user.id;

  const { data, error: erroUsuario } = await clienteSupabase
    .from("usuarios")
    .select("nome")
    .eq("id", usuarioId)
    .single();

  if (erroUsuario) {
    console.error("Erro ao buscar usuário:", erroUsuario);

    botaoUsuario.textContent = "Usuário";
    nomeUsuario.textContent = "Usuário";
    return;
  }

  const nomeCompleto = data.nome;

  const nomeExibido =
    nomeCompleto.length > 8 ? nomeCompleto.substring(0, 8) : nomeCompleto;

  botaoUsuario.textContent = nomeExibido;
  nomeUsuario.textContent = nomeCompleto;
}

// =========================
// ALTERAÇÃO DE SESSÃO
// =========================

clienteSupabase.auth.onAuthStateChange(function (evento) {
  console.log("Estado da autenticação:", evento);

  carregarUsuario();
});

// =========================
// INICIALIZAÇÃO
// =========================

carregarUsuario();
