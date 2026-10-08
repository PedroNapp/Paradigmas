// =========================
// SUPABASE
// =========================

import { clienteSupabase } from "./supabase.js";
import { carregarDadosCursos, carregarDadosVagas } from "./dados.js";

// =========================
// CONFIGURAÇÕES
// =========================

const DURACAO_PADRAO = "3 horas";

const PERIODO_ATUAL = "2026/02";

const IMAGEM_INSTRUTOR_PADRAO = "../imagens/usuario-padrao.png";

const LIMITE_INSTRUTORES = 4;

// =========================
// FUNÇÃO PARA IMAGEM
// =========================

function montarImagem(caminho, caminhoImagens) {
  if (!caminho || caminho.trim() === "") {
    return null;
  }

  const valor = caminho.trim();

  if (valor.startsWith("http://") || valor.startsWith("https://")) {
    return valor;
  }

  return `${caminhoImagens}${valor.replace(/^\.\/imagens\//, "")}`;
}

// =========================
// CARREGAR CURSOS
// =========================

export async function carregarCursos(
  listaCursos,
  limite = 11,
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

    let temMatriculaNoPeriodo = false;

    let erroAoVerificarMatriculas = false;

    // =========================
    // MATRÍCULAS DO USUÁRIO
    // =========================

    if (session) {
      const emailUsuario = session.user.email;

      // =========================
      // BUSCAR USUÁRIO
      // =========================

      const { data: usuario, error: erroUsuario } = await clienteSupabase
        .from("usuarios")
        .select("idUsuario")
        .eq("email", emailUsuario)
        .single();

      if (erroUsuario) {
        console.error("Erro ao buscar usuário:", erroUsuario);

        erroAoVerificarMatriculas = true;
      } else {
        // =========================
        // BUSCAR MATRÍCULAS
        // =========================

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

          erroAoVerificarMatriculas = true;
        } else {
          // =========================
          // VERIFICAR MATRÍCULA
          // NO PERÍODO ATUAL
          // =========================

          const matriculasPeriodoAtual = (matriculas || []).filter(
            function (matricula) {
              if (!matricula.cursos) {
                return false;
              }

              const periodoMatricula = String(matricula.cursos.periodo)
                .trim()
                .toLowerCase();

              return periodoMatricula === PERIODO_ATUAL.trim().toLowerCase();
            },
          );

          // =========================
          // USUÁRIO JÁ TEM MATRÍCULA
          // =========================

          temMatriculaNoPeriodo = matriculasPeriodoAtual.length > 0;
        }
      }
    }

    // =========================
    // BUSCAR CURSOS
    // =========================
    // Agora os cursos passam pelo
    // sistema de cache do dados.js.
    //
    // A matrícula continua sendo
    // consultada diretamente acima.
    // =========================

    const cursos = await carregarDadosCursos();

    const vagas = await carregarDadosVagas();

    // =========================
    // ATUALIZAR VAGAS
    // =========================

    cursos.forEach(function (curso) {
      if (vagas[curso.idCurso] !== undefined) {
        curso.vagas = vagas[curso.idCurso];
      }
    });

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
      // BOTÃO
      // =========================

      let botaoInscricao = "";

      // =========================
      // USUÁRIO LOGADO
      // =========================

      if (session) {
        // =========================
        // ERRO AO VERIFICAR
        // =========================

        if (erroAoVerificarMatriculas) {
          botaoInscricao = `
            <span class="curso-matriculado">
              Não foi possível verificar sua inscrição
            </span>
          `;
        }

        // =========================
        // VAGAS ESGOTADAS
        // =========================
        else if (curso.vagas <= 0) {
          botaoInscricao = `
            <span class="vagas-esgotadas">
              Vagas esgotadas
            </span>
          `;
        }

        // =========================
        // JÁ POSSUI MATRÍCULA
        // NO PERÍODO ATUAL
        // =========================
        else if (temMatriculaNoPeriodo) {
          botaoInscricao = `
            <span class="curso-matriculado">
              Você já está inscrito em um curso
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

          botaoInscricao = `
            <a
              href="${linkMatricula}"
              class="botao-curso"
            >
              Inscrever-se
            </a>
          `;
        }
      }

      // =========================
      // USUÁRIO NÃO LOGADO
      // =========================
      else {
        if (curso.vagas <= 0) {
          botaoInscricao = `
            <span class="vagas-esgotadas">
              Vagas esgotadas
            </span>
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
      // IMAGEM DO CURSO
      // =========================

      const imagemCurso =
        montarImagem(curso.imagem, caminhoImagens) ||
        `${caminhoImagens}curso-padrao.png`;

      // =========================
      // MINISTRANTES
      // =========================

      const ministrantes = curso.ministrantes || [];

      const quantidadeInstrutores = ministrantes.length;

      // =========================
      // AVATARES
      // =========================

      let avataresInstrutores = "";

      const ministrantesVisiveis = ministrantes.slice(0, LIMITE_INSTRUTORES);

      ministrantesVisiveis.forEach(function (ministrante) {
        const imagemInstrutor =
          montarImagem(ministrante.referenciaFoto, caminhoImagens) ||
          IMAGEM_INSTRUTOR_PADRAO;

        avataresInstrutores += `
            <div class="instrutor-avatar">
              <img
                src="${imagemInstrutor}"
                alt="Instrutor do curso"
                class="imagem-instrutor"
              >
            </div>
          `;
      });

      // =========================
      // INSTRUTORES RESTANTES
      // =========================

      const instrutoresRestantes = quantidadeInstrutores - LIMITE_INSTRUTORES;

      if (instrutoresRestantes > 0) {
        avataresInstrutores += `
          <div
            class="instrutor-avatar instrutores-restantes"
          >
            +${instrutoresRestantes}
          </div>
        `;
      }

      // =========================
      // TEXTO DOS INSTRUTORES
      // =========================

      let textoInstrutores = "Nenhum instrutor";

      if (quantidadeInstrutores === 1) {
        textoInstrutores = "1 instrutor";
      } else if (quantidadeInstrutores > 1) {
        textoInstrutores = `${quantidadeInstrutores} instrutores`;
      }

      // =========================
      // CARD
      // =========================

      card.innerHTML = `
        <div class="cabecalho-curso">

          <img
            src="${imagemCurso}"
            alt="${curso.nome}"
            class="imagem-curso"
          >

          <span class="status-curso">
            ${curso.status}
          </span>

        </div>

        <div class="conteudo-curso">

          <h3>
            ${curso.nome}
          </h3>

          <p class="descricao-curso">
            ${curso.descricao}
          </p>

          <div class="informacoes-curso">

            <div class="info-item">
              <span class="icone-info">◷</span>

              <div>
                <small>DURAÇÃO</small>

                <strong>
                  ${DURACAO_PADRAO}
                </strong>
              </div>
            </div>

            <div class="info-item">
              <span class="icone-info">▣</span>

              <div>
                <small>SALA</small>

                <strong>
                  ${curso.sala}
                </strong>
              </div>
            </div>

            <div class="info-item">
              <span class="icone-info">♙</span>

              <div>
                <small>VAGAS</small>

                <strong>
                  ${curso.vagas}
                </strong>
              </div>
            </div>

          </div>

          <div class="instrutores-curso">

            <div class="titulo-instrutores">
              <span>INSTRUTORES</span>
            </div>

            <div class="lista-instrutores">

              <div class="avatares-instrutores">
                ${avataresInstrutores}
              </div>

              <span class="quantidade-instrutores">
                ${textoInstrutores}
              </span>

            </div>

          </div>

        </div>

        <div class="rodape-curso">

          ${botaoInscricao}

        </div>
      `;

      listaCursos.appendChild(card);
    });
  } catch (erro) {
    console.error("Erro ao carregar cursos:", erro);

    listaCursos.innerHTML = "<p>Erro ao carregar os cursos.</p>";
  }
}
