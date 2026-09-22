// Data do evento
const dataEvento = new Date("2026-12-05T14:00:00-03:00");

// Elementos do contador
const dias = document.getElementById("dias");
const horas = document.getElementById("horas");
const minutos = document.getElementById("minutos");
const segundos = document.getElementById("segundos");

// Atualiza o contador
function atualizarContador() {
  const agora = new Date();

  const diferenca = dataEvento - agora;

  // Verifica se o evento já começou
  if (diferenca <= 0) {
    dias.textContent = "00";
    horas.textContent = "00";
    minutos.textContent = "00";
    segundos.textContent = "00";

    return;
  }

  // Calcula o tempo restante
  const totalSegundos = Math.floor(diferenca / 1000);

  const quantidadeDias = Math.floor(totalSegundos / 86400);

  const quantidadeHoras = Math.floor((totalSegundos % 86400) / 3600);

  const quantidadeMinutos = Math.floor((totalSegundos % 3600) / 60);

  const quantidadeSegundos = totalSegundos % 60;

  // Mostra os valores
  dias.textContent = quantidadeDias;
  horas.textContent = String(quantidadeHoras).padStart(2, "0");
  minutos.textContent = String(quantidadeMinutos).padStart(2, "0");
  segundos.textContent = String(quantidadeSegundos).padStart(2, "0");
}

// Executa imediatamente
atualizarContador();

// Atualiza a cada segundo
setInterval(atualizarContador, 1000);

// =========================
// SUPABASE
// =========================

const SUPABASE_URL = "https://mkylyczeakkgksrzffca.supabase.co";

const SUPABASE_KEY = "sb_publishable_LD9drZgiFn7iQ5FK-PhHOA_Uuv7YeqP";

const clienteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
);

// =========================
// USUÁRIO LOGADO
// =========================

async function carregarUsuario() {
  const botaoUsuario = document.getElementById("botaoUsuario");
  const nomeUsuario = document.getElementById("nomeUsuario");

  const {
    data: { session },
  } = await clienteSupabase.auth.getSession();

  // SE NÃO ESTIVER LOGADO
  if (!session) {
    botaoUsuario.textContent = "Entrar";
    nomeUsuario.textContent = "Entrar";

    botaoUsuario.addEventListener("click", function () {
      window.location.href = "login/login.html";
    });

    return;
  }

  // SE ESTIVER LOGADO
  const usuarioId = session.user.id;

  const { data, error } = await clienteSupabase
    .from("usuarios")
    .select("nome")
    .eq("id", usuarioId)
    .single();

  if (error) {
    console.error("Erro ao buscar usuário:", error);
    botaoUsuario.textContent = "Usuário";
    nomeUsuario.textContent = "Usuário";
    return;
  }

  const nomeCompleto = data.nome;
  const nomeExibido = nomeCompleto.substring(0, 8);

  botaoUsuario.textContent = nomeExibido;
  nomeUsuario.textContent = nomeCompleto;
}

carregarUsuario();

// =========================
// CARREGAR CURSOS
// =========================

async function carregarCursos() {
  const listaCursos = document.getElementById("listaCursos");

  // Verifica usuário logado
  const {
    data: { session },
  } = await clienteSupabase.auth.getSession();

  let periodosMatriculados = [];

  // Se estiver logado, busca os períodos das matrículas
  if (session) {
    const usuarioId = session.user.id;

    const { data: matriculas, error: erroMatriculas } = await clienteSupabase
      .from("matriculas")
      .select(
        `
          idCurso,
          cursos (
            periodo
          )
        `,
      )
      .eq("idUsuario", usuarioId);

    if (erroMatriculas) {
      console.error("Erro ao buscar matrículas:", erroMatriculas);
    } else {
      periodosMatriculados = matriculas.map(function (matricula) {
        return matricula.cursos.periodo;
      });
    }
  }

  // Busca os cursos
  const { data: cursos, error } = await clienteSupabase
    .from("cursos")
    .select("*")
    .order("data", { ascending: true });

  if (error) {
    console.error("Erro ao buscar cursos:", error);
    listaCursos.innerHTML = "<p>Erro ao carregar os cursos.</p>";
    return;
  }

  if (cursos.length === 0) {
    listaCursos.innerHTML = "<p>Nenhum curso disponível.</p>";
    return;
  }

  listaCursos.innerHTML = "";

  cursos.forEach(function (curso) {
    const card = document.createElement("div");
    card.classList.add("card-curso");

    // Verifica se o usuário já está matriculado nesse período
    const jaMatriculado = periodosMatriculados.includes(curso.periodo);

    let botaoInscricao = "";

    // Verifica as vagas
    if (curso.vagas <= 0) {
      botaoInscricao = `
      <span class="vagas-esgotadas">
        Vagas esgotadas
      </span>
    `;
    }
    // Verifica se já está matriculado
    else if (jaMatriculado) {
      botaoInscricao = "";
    }
    // Se estiver disponível
    else {
      botaoInscricao = `
      <a href="matricula/matricula.html?id=${curso.id}" class="botao-curso">
        Inscrever-se
      </a>
    `;
    }

    card.innerHTML = `
    <img src="${curso.imagem}" alt="${curso.nome}" class="imagem-curso">

    <h3>${curso.nome}</h3>

    <p>${curso.descricao}</p>

    <div class="info-curso">
      <span>📅 ${curso.data}</span>
      <span>🕐 ${curso.periodo}</span>
      <span>👥 ${curso.vagas} vagas</span>
      <span class="status-curso">${curso.status}</span>
    </div>

    ${botaoInscricao}
  `;

    listaCursos.appendChild(card);
  });
}

carregarCursos();
