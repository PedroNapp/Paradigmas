import { clienteSupabase } from "./supabase.js";

// =========================
// ELEMENTOS
// =========================

const cursoContainer = document.getElementById("curso");

const botaoConfirmar = document.getElementById("botaoConfirmar");

// =========================
// CURSO DA URL
// =========================

const parametros = new URLSearchParams(window.location.search);

const cursoId = parametros.get("id");

let cursoAtual = null;

// =========================
// CARREGAR CURSO
// =========================

async function carregarCurso() {
  if (!cursoId) {
    cursoContainer.innerHTML = "<p>Curso não encontrado.</p>";

    botaoConfirmar.disabled = true;

    return;
  }

  try {
    const { data: curso, error } = await clienteSupabase
      .from("cursos")
      .select("*")
      .eq("idCurso", cursoId)
      .single();

    if (error) {
      throw error;
    }

    cursoAtual = curso;

    cursoContainer.innerHTML = `
      <div class="info-curso">

        <h2>${curso.nome}</h2>

        <p>${curso.descricao}</p>

        <span class="info-item">
          🕐 Período: ${curso.periodo}
        </span>

        <span class="info-item">
          👥 Vagas disponíveis: ${curso.vagas}
        </span>

        <span class="info-item">
          Status: ${curso.status}
        </span>

        <span class="info-item">
          📍 Sala: ${curso.sala}
        </span>

      </div>
    `;
  } catch (erro) {
    console.error("Erro ao buscar curso:", erro);

    cursoContainer.innerHTML = "<p>Erro ao carregar o curso.</p>";

    botaoConfirmar.disabled = true;
  }
}

// =========================
// CONFIRMAR MATRÍCULA
// =========================

async function confirmarMatricula() {
  if (!cursoAtual) {
    alert("Curso não carregado.");

    return;
  }

  // =========================
  // VERIFICAR LOGIN
  // =========================

  const {
    data: { session },
  } = await clienteSupabase.auth.getSession();

  if (!session) {
    alert("Você precisa estar logado para realizar a matrícula.");

    window.location.href = "../html/login.html";

    return;
  }

  // =========================
  // BUSCAR USUÁRIO
  // =========================

  const emailUsuario = session.user.email;

  const { data: usuario, error: erroUsuario } = await clienteSupabase
    .from("usuarios")
    .select("idUsuario")
    .eq("email", emailUsuario)
    .single();

  if (erroUsuario) {
    console.error("Erro ao buscar usuário:", erroUsuario);

    alert("Não foi possível identificar seu usuário.");

    return;
  }

  const usuarioId = usuario.idUsuario;

  // =========================
  // VERIFICAR VAGAS
  // =========================

  if (cursoAtual.vagas <= 0) {
    alert("Este curso não possui mais vagas.");

    return;
  }

  try {
    // =========================
    // BUSCAR MATRÍCULAS
    // =========================

    const { data: matriculas, error: erroMatriculas } = await clienteSupabase
      .from("matriculas")
      .select(
        `
        idMatricula,
        idUsuario,
        idCurso,

        cursos (
          periodo
        )
      `,
      )
      .eq("idUsuario", usuarioId);

    if (erroMatriculas) {
      throw erroMatriculas;
    }

    
    // =========================
    // PERÍODO ATUAL
    // =========================

    const periodoAtual = String(cursoAtual.periodo).trim().toLowerCase();
    
    // =========================
    // VERIFICAR CONFLITO
    // =========================

    const jaMatriculado = matriculas.some(function (matricula) {
      if (!matricula.cursos) {
        return false;
      }

      const periodoMatricula = String(matricula.cursos.periodo)
        .trim()
        .toLowerCase();

      return periodoMatricula === periodoAtual;
    });

    // =========================
    // JÁ POSSUI MATRÍCULA
    // =========================

    if (jaMatriculado) {
      alert(
        "Você já possui uma matrícula no período " + cursoAtual.periodo + ".",
      );

      return;
    }

    // =========================
    // REALIZAR MATRÍCULA
    // =========================

    const { error: erroInsercao } = await clienteSupabase
      .from("matriculas")
      .insert({
        idUsuario: usuarioId,

        idCurso: Number(cursoId),

        dataInscricao: new Date().toISOString(),
      });

    // =========================
    // VERIFICAR ERRO
    // =========================

    if (erroInsercao) {
      console.error("Erro retornado pelo Supabase:", erroInsercao);

      // =========================
      // PERÍODO JÁ POSSUI MATRÍCULA
      // =========================

      if (
        erroInsercao.message &&
        erroInsercao.message.includes(
          "Você já possui uma matrícula neste período",
        )
      ) {
        alert("Você já possui uma matrícula neste período.");

        return;
      }

      // =========================
      // VAGAS ESGOTADAS
      // =========================

      if (
        erroInsercao.message &&
        erroInsercao.message.includes(
          "Não há vagas disponíveis para este curso",
        )
      ) {
        alert("Este curso não possui mais vagas.");

        return;
      }

      throw erroInsercao;
    }

    // =========================
    // CONCLUÍDO
    // =========================

    alert("Matrícula realizada com sucesso!");

    window.location.href = "../html/inscricoes.html";
  } catch (erro) {
    console.error("Erro ao realizar matrícula:", erro);

    alert("Não foi possível realizar a matrícula.");
  }
}

// =========================
// EVENTO
// =========================

if (botaoConfirmar) {
  botaoConfirmar.addEventListener("click", confirmarMatricula);
}

// =========================
// INICIALIZAÇÃO
// =========================

carregarCurso();
