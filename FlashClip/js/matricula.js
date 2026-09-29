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
      .eq("id", cursoId)
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
                    📅 Data: ${curso.data}
                </span>

                <span class="info-item">
                    🕐 Período: ${curso.periodo}
                </span>

                <span class="info-item">
                    👥 Vagas disponíveis: ${curso.vagas}
                </span>

                <span class="info-item">
                    Status: ${curso.status}
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

  const usuarioId = session.user.id;

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
                id,
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
    // VERIFICAR CONFLITO
    // =========================

    const jaMatriculado = matriculas.some(function (matricula) {
      return (
        matricula.cursos && matricula.cursos.periodo === cursoAtual.periodo
      );
    });

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
        idCurso: cursoId,
        dataIncricao: new Date().toISOString(),
        status: "Pendente",
      });

    if (erroInsercao) {
      throw erroInsercao;
    }

    // =========================
    // DIMINUIR VAGA
    // =========================

    const novasVagas = cursoAtual.vagas - 1;

    const { error: erroVaga } = await clienteSupabase
      .from("cursos")
      .update({
        vagas: novasVagas,
      })
      .eq("id", cursoId);

    if (erroVaga) {
      console.error("Erro ao atualizar vagas:", erroVaga);

      alert(
        "A matrícula foi realizada, mas não foi possível atualizar as vagas.",
      );

      return;
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
