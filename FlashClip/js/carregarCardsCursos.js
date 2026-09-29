// =========================
// SUPABASE
// =========================

import { clienteSupabase } from "./supabase.js";

// =========================
// CARREGAR CURSOS
// =========================

export async function carregarCursos(
  listaCursos,
  limite = null,
  caminhoMatricula = "./matricula.html",
  caminhoLogin = "./login.html",
  caminhoImagens = "./imagens/",
) {
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
      const emailUsuario = session.user.email;

      // Buscar o ID do usuário no banco
      const { data: usuario, error: erroUsuario } = await clienteSupabase
        .from("usuarios")
        .select("idUsuario")
        .eq("email", emailUsuario)
        .single();

      if (erroUsuario) {
        console.error("Erro ao buscar usuário:", erroUsuario);
      } else {
        const { data: matriculas, error: erroMatriculas } =
          await clienteSupabase
            .from("matriculas")
            .select(
              `
            idCurso,
            cursos (
              periodo
            )
          `,
            )
            .eq("idUsuario", usuario.idUsuario);

        if (erroMatriculas) {
          console.error("Erro ao buscar matrículas:", erroMatriculas);
        } else {
          periodosMatriculados = matriculas
            .filter((matricula) => matricula.cursos)
            .map((matricula) => matricula.cursos.periodo);
        }
      }
    }

    // =========================
    // BUSCAR CURSOS
    // =========================

    const { data: cursos, error } = await clienteSupabase
      .from("cursos")
      .select("*")
      .order("idCurso", {
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
      // VERIFICAR MATRÍCULA
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
        const linkMatricula = `${caminhoMatricula}?id=${encodeURIComponent(
          curso.idCurso,
        )}`;

        if (session) {
          botaoInscricao = `
            <a
              href="${linkMatricula}"
              class="botao-curso"
            >
              Inscrever-se
            </a>
          `;
        } else {
          botaoInscricao = `
            <a
              href="${caminhoLogin}"
              class="botao-curso"
            >
              Entrar para se inscrever
            </a>
          `;
        }
      }

      // =========================
      // CAMINHO DA IMAGEM
      // =========================

      const imagemCurso = curso.imagem?.startsWith("http")
        ? curso.imagem
        : `${caminhoImagens}${(curso.imagem || "").replace(
            /^\.\/imagens\//,
            "",
          )}`;

      // =========================
      // CARD
      // =========================

      card.innerHTML = `
        <img
          src="${imagemCurso}"
          alt="${curso.nome}"
          class="imagem-curso"
        >

        <h3>${curso.nome}</h3>

        <p>${curso.descricao}</p>

        <div class="info-curso">

          <span>🕐 ${curso.periodo}</span>

          <span>👥 ${curso.vagas} vagas</span>

          <span>📍 ${curso.sala}</span>

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
