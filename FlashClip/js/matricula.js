
import { clienteSupabase } from "./supabase.js";
import {
  carregarDadosCursos,
  carregarDadosVagas
} from "./dados.js";

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
let matriculaEmAndamento = false;
let matriculaConcluida = false;

// =========================
// CONFIGURAÇÕES
// =========================

const DURACAO_PADRAO = "3 horas";
const IMAGEM_CURSO_PADRAO = "../imagens/curso-padrao.png";
const IMAGEM_INSTRUTOR_PADRAO = "../imagens/usuario-padrao.png";


const mensagemMatricula = document.getElementById("mensagemMatricula");

let redirecionandoLogin = false;
// =========================
// NORMALIZAR PERÍODO
// =========================

function normalizarPeriodo(valor) {
  const periodo = String(valor ?? "")
    .trim()
    .toLowerCase();

  // Ex.: 2026/02, 2026/2 e 2026-2.
  const correspondencia = periodo.match(
    /^(\d{4})\s*[/.-]\s*0*(\d{1,2})$/
  );

  if (correspondencia) {
    const ano = correspondencia[1];
    const etapa = Number(correspondencia[2]);

    if (etapa >= 1 && etapa <= 12) {
      return `${ano}/${etapa}`;
    }
  }

  return periodo.replace(/\s+/g, " ");
}

// =========================
// ESCAPAR HTML
// =========================

function escaparHTML(valor) {
  const caracteres = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(valor ?? "").replace(/[&<>"']/g, function (caractere) {
    return caracteres[caractere];
  });
}


/* =====================================
   MENSAGENS DENTRO DO CARD
===================================== */

function mostrarMensagem(texto, tipo = "erro") {
  if (!mensagemMatricula) return;

  mensagemMatricula.textContent = texto;
  mensagemMatricula.dataset.tipo = tipo;
  mensagemMatricula.hidden = false;

  mensagemMatricula.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

function limparMensagem() {
  if (!mensagemMatricula) return;

  mensagemMatricula.textContent = "";
  mensagemMatricula.hidden = true;

  delete mensagemMatricula.dataset.tipo;
}

/* =====================================
   TRANSIÇÃO DE SUCESSO
===================================== */

function transicionarMatricula() {
  const nomeCurso = escaparHTML(
    cursoAtual?.nome || "seu curso"
  );

  const transicao = document.createElement("div");

  transicao.className = "transicao-matricula";

  transicao.setAttribute("role", "status");
  transicao.setAttribute("aria-live", "polite");

  transicao.innerHTML = `
    <div class="transicao-matricula-conteudo">

      <span
        class="transicao-matricula-icone"
        aria-hidden="true"
      >✓</span>

      <h2>Matrícula realizada!</h2>

      <p>
        Sua vaga em <strong>${nomeCurso}</strong> foi registrada.<br>
        Preparando sua área de inscrições...
      </p>

      <div
        class="transicao-matricula-barra"
        aria-hidden="true"
      ></div>

    </div>
  `;

  document.body.appendChild(transicao);

  requestAnimationFrame(function () {
    transicao.classList.add("ativa");
  });

  // Mantém o efeito visível antes do redirecionamento.
  window.setTimeout(function () {
    window.location.href = "../html/inscricoes.html";
  }, 2600);
}


// =========================
// MONTAR CAMINHO DA IMAGEM
// =========================

function montarImagem(caminho, imagemPadrao) {
  if (
    !caminho ||
    typeof caminho !== "string" ||
    !caminho.trim()
  ) {
    return imagemPadrao;
  }

  const valor = caminho.trim();

  if (/^https?:\/\//i.test(valor)) {
    return valor;
  }

  const nomeArquivo = valor
    .replace(/^(?:\.\.\/|\.\/)?imagens\//i, "")
    .replace(/^\/+/, "");

  return `../imagens/${nomeArquivo}`;
}

// =========================
// QUANTIDADE DE INSTRUTORES
// =========================

function formatarQuantidadeInstrutores(quantidade) {
  return quantidade === 1
    ? "1 instrutor"
    : `${quantidade} instrutores`;
}

// =========================
// MOSTRAR ERRO DE CARREGAMENTO
// =========================

function mostrarErroCurso(mensagem) {
  if (cursoContainer) {
    cursoContainer.innerHTML = `
      <p class="erro-carregamento-curso">
        ${escaparHTML(mensagem)}
      </p>
    `;
  }

  if (botaoConfirmar) {
    botaoConfirmar.disabled = true;
  }
}

// =========================
// CARREGAR CURSO
// =========================

async function carregarCurso() {
  if (!cursoContainer || !botaoConfirmar) {
    console.error("Elementos da matrícula não encontrados.");
    return;
  }

  if (
    !cursoId ||
    !Number.isSafeInteger(Number(cursoId)) ||
    Number(cursoId) <= 0
  ) {
    mostrarErroCurso(
      "Curso não encontrado. Volte ao evento e selecione um curso válido."
    );
    return;
  }

  botaoConfirmar.disabled = true;

  try {
    // =========================
    // BUSCAR CURSO NO SUPABASE
    // =========================

    const {
      data: cursoBanco,
      error
    } = await clienteSupabase
      .from("cursos")
      .select("*")
      .eq("idCurso", Number(cursoId))
      .single();

    if (error) {
      throw error;
    }

    if (!cursoBanco) {
      mostrarErroCurso("Curso não encontrado.");
      return;
    }

    // =========================
    // BUSCAR DADOS COMPLEMENTARES
    // =========================

    let cursoCatalogo = null;
    let vagasAtualizadas;

    try {
      const cursos = await carregarDadosCursos();

      cursoCatalogo = (cursos || []).find(function (curso) {
        return Number(curso.idCurso) === Number(cursoId);
      }) || null;
    } catch (erro) {
      console.warn(
        "Não foi possível carregar os dados complementares:",
        erro
      );
    }

    try {
      const vagas = await carregarDadosVagas();

      if (
        vagas &&
        vagas[cursoId] !== undefined &&
        vagas[cursoId] !== null
      ) {
        vagasAtualizadas = vagas[cursoId];
      }
    } catch (erro) {
      console.warn(
        "Não foi possível atualizar as vagas:",
        erro
      );
    }

    // =========================
    // COMBINAR OS DADOS
    // =========================

    cursoAtual = {
      ...(cursoCatalogo || {}),
      ...cursoBanco,

      imagem:
        cursoBanco.imagem ||
        cursoCatalogo?.imagem ||
        "",

      ministrantes:
        cursoCatalogo?.ministrantes ??
        cursoBanco.ministrantes ??
        [],

      vagas:
        cursoBanco.vagas ??
        vagasAtualizadas ??
        cursoCatalogo?.vagas
    };

    // O período é necessário para a validação,
    // mas não será exibido no cartão.
    if (!normalizarPeriodo(cursoAtual.periodo)) {
      cursoAtual = null;

      mostrarErroCurso(
        "Não foi possível identificar o período deste curso."
      );
      return;
    }

    // =========================
    // DADOS PARA O CARD
    // =========================

    const imagemCurso = escaparHTML(
      montarImagem(
        cursoAtual.imagem,
        IMAGEM_CURSO_PADRAO
      )
    );

    const nomeCurso = escaparHTML(
      cursoAtual.nome || "Curso sem nome"
    );

    const descricao = escaparHTML(
      cursoAtual.descricao || "Sem descrição disponível."
    );

    const status = escaparHTML(
      cursoAtual.status || "Não informado"
    );

    const duracao = escaparHTML(
      cursoAtual.duracao ||
      cursoAtual["duração"] ||
      DURACAO_PADRAO
    );

    const sala = escaparHTML(
      cursoAtual.sala ?? "A definir"
    );

    const vagas = escaparHTML(
      cursoAtual.vagas ?? "Não informado"
    );

    // =========================
    // INSTRUTORES
    // =========================

    const instrutores = Array.isArray(cursoAtual.ministrantes)
      ? cursoAtual.ministrantes
      : [];

    const instrutoresVisiveis = instrutores.slice(0, 4);

    const avatares = instrutoresVisiveis.length
      ? instrutoresVisiveis.map(function (instrutor) {
          const nomeInstrutor =
            instrutor.nome ||
            instrutor.nomeCompleto ||
            instrutor.nomeInstrutor ||
            "Instrutor do curso";

          const imagem = montarImagem(
            instrutor.referenciaFoto,
            IMAGEM_INSTRUTOR_PADRAO
          );

          return `
            <img
              src="${escaparHTML(imagem)}"
              alt="${escaparHTML(nomeInstrutor)}"
              class="avatar-instrutor-matricula"
              loading="lazy"
            >
          `;
        }).join("")
      : `
          <img
            src="${IMAGEM_INSTRUTOR_PADRAO}"
            alt=""
            class="avatar-instrutor-matricula"
          >
        `;

    const primeiroInstrutor = instrutores[0];

    const nomePrimeiroInstrutor = primeiroInstrutor
      ? (
          primeiroInstrutor.nome ||
          primeiroInstrutor.nomeCompleto ||
          primeiroInstrutor.nomeInstrutor ||
          "Instrutor do curso"
        )
      : "Nenhum instrutor cadastrado";

    // =========================
    // RENDERIZAR CARD
    // =========================

    cursoContainer.innerHTML = `
      <div class="info-curso">

        <div class="curso-cabecalho">
          <img
            src="${imagemCurso}"
            alt="${nomeCurso}"
            class="imagem-curso-matricula"
          >

          <div class="curso-identificacao">
            <h2>${nomeCurso}</h2>
            <p>${descricao}</p>
          </div>

          <span class="status-curso-matricula">
            <span
              class="status-curso-ponto"
              aria-hidden="true"
            ></span>
            ${status}
          </span>
        </div>

        <div class="detalhes-curso">

          <div class="detalhe-curso">
            <span
              class="icone-detalhe-curso"
              aria-hidden="true"
            >◷</span>

            <div class="texto-detalhe-curso">
              <small>DURAÇÃO</small>
              <strong>${duracao}</strong>
            </div>
          </div>

          <div class="detalhe-curso">
            <span
              class="icone-detalhe-curso"
              aria-hidden="true"
            >⌖</span>

            <div class="texto-detalhe-curso">
              <small>SALA</small>
              <strong>${sala}</strong>
            </div>
          </div>

          <div class="detalhe-curso">
            <span
              class="icone-detalhe-curso"
              aria-hidden="true"
            >♙</span>

            <div class="texto-detalhe-curso">
              <small>VAGAS</small>
              <strong>${vagas}</strong>
            </div>
          </div>

        </div>

        <div class="instrutores-matricula">

          <div class="titulo-instrutores-matricula">
            INSTRUTORES
          </div>

          <div class="linha-instrutor-matricula">

            <div class="avatares-matricula">
              ${avatares}
            </div>

            <div class="dados-instrutor-matricula">
              <strong>
                ${escaparHTML(nomePrimeiroInstrutor)}
              </strong>

              <span>
                ${formatarQuantidadeInstrutores(instrutores.length)}
              </span>
            </div>

          </div>
        </div>

      </div>
    `;

    botaoConfirmar.disabled = false;

  } catch (erro) {
    console.error("Erro ao buscar curso:", erro);

    cursoAtual = null;

    mostrarErroCurso(
      "Não foi possível carregar os dados do curso. Tente novamente."
    );
  }
}


async function confirmarMatricula() {
  if (!cursoAtual || matriculaEmAndamento || matriculaConcluida) {
    return;
  }

  matriculaEmAndamento = true;
  botaoConfirmar.disabled = true;

  const textoOriginal = botaoConfirmar.innerHTML;

  limparMensagem();

  botaoConfirmar.textContent = "Verificando matrícula...";

  try {
    // =========================
    // VERIFICAR LOGIN
    // =========================

    const {
      data: dadosSessao,
      error: erroSessao
    } = await clienteSupabase.auth.getSession();

    if (erroSessao) {
      throw erroSessao;
    }

    const session = dadosSessao.session;

    if (!session) {
      mostrarMensagem(
        "Você precisa entrar na sua conta para realizar a matrícula. Redirecionando para o login...",
        "aviso"
      );

      redirecionandoLogin = true;

      window.setTimeout(function () {
        window.location.href = "../html/login.html";
      }, 1800);

      return;
    }

    // =========================
    // BUSCAR USUÁRIO
    // =========================

    const {
      data: usuario,
      error: erroUsuario
    } = await clienteSupabase
      .from("usuarios")
      .select("idUsuario")
      .eq("email", session.user.email)
      .maybeSingle();

    if (erroUsuario) {
      console.error("Erro ao buscar usuário:", erroUsuario);

      mostrarMensagem(
        "Não foi possível identificar seu usuário. Tente novamente."
      );

      return;
    }

    if (!usuario) {
      mostrarMensagem(
        "Seu cadastro não foi localizado. Entre novamente ou contate o suporte."
      );

      return;
    }

    const usuarioId = usuario.idUsuario;

    // =========================
    // VALIDAR PERÍODO
    // =========================

    const periodoAtual = normalizarPeriodo(
      cursoAtual.periodo
    );

    if (!periodoAtual) {
      mostrarMensagem(
        "Não foi possível identificar o período deste curso."
      );

      return;
    }

    // =========================
    // VERIFICAR VAGAS
    // =========================

    if (
      cursoAtual.vagas === null ||
      cursoAtual.vagas === undefined ||
      !Number.isFinite(Number(cursoAtual.vagas))
    ) {
      mostrarMensagem(
        "Não foi possível confirmar a disponibilidade de vagas. Tente novamente.",
        "aviso"
      );

      return;
    }

    if (Number(cursoAtual.vagas) <= 0) {
      mostrarMensagem(
        "Este curso não possui mais vagas. Escolha outro curso.",
        "aviso"
      );

      return;
    }

    // =========================
    // BUSCAR MATRÍCULAS EXISTENTES
    // =========================

    const {
      data: matriculas,
      error: erroMatriculas
    } = await clienteSupabase
      .from("matriculas")
      .select(`
        idMatricula,
        idCurso,
        cursos (
          periodo
        )
      `)
      .eq("idUsuario", usuarioId);

    if (erroMatriculas) {
      console.error(
        "Erro ao buscar matrículas:",
        erroMatriculas
      );

      throw erroMatriculas;
    }

    const listaMatriculas = matriculas || [];

    // =========================
    // VALIDAR DADOS EXISTENTES
    // =========================

    const possuiPeriodoIndefinido = listaMatriculas.some(
      function (matricula) {
        const cursoRelacionado = Array.isArray(matricula.cursos)
          ? matricula.cursos[0]
          : matricula.cursos;

        return !normalizarPeriodo(
          cursoRelacionado?.periodo
        );
      }
    );

    if (possuiPeriodoIndefinido) {
      mostrarMensagem(
        "Não foi possível verificar todas as suas matrículas. Atualize a página e tente novamente.",
        "aviso"
      );

      return;
    }

    // =========================
    // VERIFICAR CONFLITO
    // =========================

    const jaMatriculado = listaMatriculas.some(
      function (matricula) {
        const cursoRelacionado = Array.isArray(matricula.cursos)
          ? matricula.cursos[0]
          : matricula.cursos;

        return (
          normalizarPeriodo(cursoRelacionado.periodo) ===
          periodoAtual
        );
      }
    );

    if (jaMatriculado) {
      mostrarMensagem(
        "Você já possui uma matrícula neste período. Cada aluno pode se inscrever em apenas um curso por período.",
        "aviso"
      );

      return;
    }

    // =========================
    // REALIZAR MATRÍCULA
    // =========================

    const {
      error: erroInsercao
    } = await clienteSupabase
      .from("matriculas")
      .insert({
        idUsuario: usuarioId,
        idCurso: Number(cursoId),
        dataInscricao: new Date().toISOString()
      });

    // =========================
    // VERIFICAR ERRO DA INSERÇÃO
    // =========================

    if (erroInsercao) {
      console.error(
        "Erro retornado pelo Supabase:",
        erroInsercao
      );

      const mensagemErro = String(
        erroInsercao.message || ""
      ).toLowerCase();

      if (
        mensagemErro.includes(
          "você já possui uma matrícula neste período".toLowerCase()
        )
      ) {
        mostrarMensagem(
          "Você já possui uma matrícula neste período. Não é possível se inscrever em outro curso agora.",
          "aviso"
        );

        return;
      }

      if (
        mensagemErro.includes(
          "não há vagas disponíveis para este curso".toLowerCase()
        )
      ) {
        mostrarMensagem(
          "As vagas deste curso se esgotaram. Escolha outro curso.",
          "aviso"
        );

        return;
      }

      throw erroInsercao;
    }

    // =========================
    // MATRÍCULA CONCLUÍDA
    // =========================

    matriculaConcluida = true;

    botaoConfirmar.textContent = "Matrícula confirmada";

    transicionarMatricula();

  } catch (erro) {
    console.error("Erro ao realizar matrícula:", erro);

    mostrarMensagem(
      "Não foi possível realizar sua matrícula. Verifique sua conexão e tente novamente."
    );

  } finally {
    matriculaEmAndamento = false;

    if (
      botaoConfirmar &&
      !matriculaConcluida &&
      !redirecionandoLogin
    ) {
      botaoConfirmar.disabled = !cursoAtual;
      botaoConfirmar.innerHTML = textoOriginal;
    }
  }
}


// =========================
// EVENTO DO BOTÃO
// =========================

if (botaoConfirmar) {
  botaoConfirmar.addEventListener(
    "click",
    confirmarMatricula
  );
}

// =========================
// INICIALIZAÇÃO
// =========================

carregarCurso();
