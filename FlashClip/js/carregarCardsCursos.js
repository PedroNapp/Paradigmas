// =========================
// SUPABASE
// =========================

import { clienteSupabase } from "./supabase.js";

// =========================
// CARREGAR CURSOS
// =========================

export async function carregarCursos(listaCursos, limite = null) {
  if (!listaCursos) {
    return;
  }

  try {
    // =========================
    // SESSÃO
    // =========================

    const {
      data: { session },
    } = await clienteSupabase.auth.getSession();

    let periodosMatriculados = [];

    // =========================
    // MATRÍCULAS DO USUÁRIO
    // =========================

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
        periodosMatriculados = matriculas
          .filter((matricula) => matricula.cursos)
          .map((matricula) => matricula.cursos.periodo);
      }
    }

    // =========================
    // BUSCAR CURSOS
    // =========================

    const { data: cursos, error } = await clienteSupabase
      .from("cursos")
      .select("*")
      .order("data", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    // =========================
    // NENHUM CURSO
    // =========================

    if (!cursos || cursos.length === 0) {
      listaCursos.innerHTML = "<p>Nenhum curso disponível.</p>";

      return;
    }

    // =========================
    // LIMITE
    // =========================

    const cursosExibidos = limite ? cursos.slice(0, limite) : cursos;

    listaCursos.innerHTML = "";

    // =========================
    // CRIAR CARDS
    // =========================

    cursosExibidos.forEach(function (curso) {
      const card = document.createElement("article");

      card.classList.add("card-curso");

      // =========================
      // MATRÍCULA
      // =========================

      const jaMatriculado = periodosMatriculados.includes(curso.periodo);

      let botaoInscricao = "";

      // =========================
      // VAGAS ESGOTADAS
      // =========================

      if (curso.vagas <= 0) {
        botaoInscricao = `
                        <span class="vagas-esgotadas">
                            Vagas esgotadas
                        </span>
                    `;
      }

      // =========================
      // JÁ MATRICULADO
      // =========================
      else if (jaMatriculado) {
        botaoInscricao = `
                        <span class="curso-matriculado">
                            Você já está inscrito
                        </span>
                    `;
      }

      // =========================
      // DISPONÍVEL
      // =========================
      else {
        const caminhoMatricula = `../matricula.html?id=${curso.id}`;

        if (session) {
          botaoInscricao = `
                            <a
                                href="${caminhoMatricula}"
                                class="botao-curso"
                            >
                                Inscrever-se
                            </a>
                        `;
        } else {
          botaoInscricao = `
                            <a
                                href="../login.html"
                                class="botao-curso"
                            >
                                Entrar para se inscrever
                            </a>
                        `;
        }
      }

      // =========================
      // CARD
      // =========================

      card.innerHTML = `
                    <img
                        src="${curso.imagem}"
                        alt="${curso.nome}"
                        class="imagem-curso"
                    >

                    <h3>
                        ${curso.nome}
                    </h3>

                    <p>
                        ${curso.descricao}
                    </p>

                    <div class="info-curso">

                        <span>
                            📅 ${curso.data}
                        </span>

                        <span>
                            🕐 ${curso.periodo}
                        </span>

                        <span>
                            👥 ${curso.vagas} vagas
                        </span>

                        <span class="status-curso">
                            ${curso.status}
                        </span>

                    </div>

                    ${botaoInscricao}
                `;

      listaCursos.appendChild(card);
    });
  } catch (erro) {
    console.error("Erro ao carregar cursos:", erro);

    listaCursos.innerHTML = "<p>Erro ao carregar os cursos.</p>";
  }
}
