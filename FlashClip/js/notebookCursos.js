// =========================
// CURSOS: MODO SIMPLES E NOTEBOOK AVANÇADO
// =========================
// O modo simples mostra cards completos com as informações dos cursos.
// O modo avançado reaproveita o notebook atual, incluindo detalhes e matrícula.
// Os dois modos compartilham os mesmos dados e as mesmas validações.
// A tela do notebook é HTML acessível; o 3D é apenas a moldura visual.

import { clienteSupabase } from "./supabase.js";
import { carregarDadosCursos, carregarDadosVagas } from "./dados.js";
import { escaparHTML } from "./seguranca.js";
import { prepararImagemMinistrante, atributosFallbackImagem } from "./imagens-ministrantes.js?v=2";
import { courseIdentity } from "../notebooks/course-identities.js?v=ready-6";

// O módulo de matrícula é importado dinamicamente, mas a situação da conta
// é consultada assim que a página abre para os cards refletirem inscrições existentes.
// O CSS avançado e o notebook 3D continuam sob demanda.
const CANAL_MATRICULAS = "flashclip-matriculas";
let normalizarPeriodo = null;
let realizarMatricula = null;
let situacaoDaConta = null;
let moduloMatriculasPromise = null;

function carregarModuloMatriculas() {
  if (!moduloMatriculasPromise) {
    moduloMatriculasPromise = import("./matricular.js?v=1")
      .then((modulo) => {
        normalizarPeriodo = modulo.normalizarPeriodo;
        realizarMatricula = modulo.realizarMatricula;
        situacaoDaConta = modulo.situacaoDaConta;
        return modulo;
      })
      .catch((erro) => {
        moduloMatriculasPromise = null;
        throw erro;
      });
  }

  return moduloMatriculasPromise;
}

// No modo simples, apenas o CSS dos cards é carregado. Os estilos do
// notebook completo entram quando o usuário escolhe o modo avançado.
const CAMINHO_CSS_AVANCADO = new URL("../notebooks/notebook-cursos.css?v=7", import.meta.url);
let cssAvancadoPromise = null;

function carregarCssAvancado() {
  const existente = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .find((link) => {
      try {
        return new URL(link.href).pathname === CAMINHO_CSS_AVANCADO.pathname;
      } catch {
        return false;
      }
    });

  if (existente?.sheet) {
    return Promise.resolve();
  }

  if (cssAvancadoPromise) {
    return cssAvancadoPromise;
  }

  cssAvancadoPromise = new Promise((resolve, reject) => {
    const link = existente || document.createElement("link");
    link.rel = "stylesheet";
    link.href = CAMINHO_CSS_AVANCADO.href;
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", () => {
      link.remove();
      reject(new Error("Não foi possível carregar o estilo do notebook."));
    }, { once: true });

    if (!existente) {
      document.head.append(link);
    }
  }).catch((erro) => {
    cssAvancadoPromise = null;
    throw erro;
  });

  return cssAvancadoPromise;
}

// =========================
// CONFIGURAÇÕES
// =========================

const DURACAO_PADRAO = "3 horas";

// Início dos cursos (o mesmo horário do contador da home).
const INICIO_CURSOS = {
  iso: "2026-12-05T14:00-03:00",
  curto: "5 dez · 14h",
  longo: "5 de dezembro, às 14h",
};

const LOCAL_EVENTO = "Ulbra Palmas";

const LIMITE_INSTRUTORES = 4;

// Quanto a tela dos cursos espera o notebook 3D antes de aparecer sozinha.
const ESPERA_3D = 4000;

const MODULO_3D = new URL("../notebooks/notebook-cursos.js?v=3", import.meta.url);

let contador = 0;

// =========================
// FUNÇÕES DE APOIO
// =========================

function textoDoSelo(status) {
  const texto = String(status ?? "").trim();

  // Antes do evento, a data diz mais que "Não iniciado".
  if (texto === "" || ["não iniciado", "nao iniciado"].includes(texto.toLowerCase())) {
    return `<time datetime="${INICIO_CURSOS.iso}">${INICIO_CURSOS.curto}</time>`;
  }

  return escaparHTML(texto);
}

function salaDoCurso(curso) {
  const sala = String(curso.sala ?? "").trim();

  return /^(?:null|undefined)?$/i.test(sala) ? "A definir" : sala;
}

function numeroDeVagas(curso) {
  const vagas = Number(curso.vagas);

  return curso.vagas === null || curso.vagas === undefined || !Number.isFinite(vagas)
    ? null
    : vagas;
}

function primeiroNome(conta) {
  const nome = String(conta?.usuario?.nome || conta?.sessao?.user?.email || "").trim();

  return nome.split(/[\s@]/)[0] || "";
}

function temWebGL() {
  try {
    const teste = document.createElement("canvas");

    return Boolean(teste.getContext("webgl2") || teste.getContext("webgl"));
  } catch (erro) {
    return false;
  }
}

// =========================
// MARCAÇÃO
// =========================

function marcacao(idTela) {
  return `
    <div class="fc-modos-visualizacao" role="group" aria-label="Modo de visualização dos cursos">
      <button type="button" class="fc-modo-visualizacao fc-modo-ativo" data-modo-visualizacao="simples" aria-pressed="true">Simples</button>
      <button type="button" class="fc-modo-visualizacao" data-modo-visualizacao="avancado" aria-pressed="false">Avançado</button>
    </div>

    <section class="fc-cursos-simples" data-cursos-simples aria-label="Cursos disponíveis">
      <div class="fc-cursos-simples-topo">
        <h3>Escolha seu curso</h3>
        <p>Confira as informações e faça sua inscrição diretamente no card.</p>
      </div>
      <div data-lista-cursos-simples>
        <p class="fc-notebook-carregando">Carregando cursos...</p>
      </div>
    </section>

    <div class="fc-notebook-palco" data-renderer="pending" hidden>
      <canvas class="fc-notebook-canvas" aria-hidden="true"></canvas>

      <div class="fc-notebook-encaixe" aria-hidden="true"></div>

      <div class="fc-notebook-tela" id="${idTela}" role="region" aria-label="Tela do notebook: cursos do FlashClip" inert>
        <div class="fc-tela-barra">
          <span class="fc-tela-marca">FLASHCLIP <span aria-hidden="true">/</span> CURSOS</span>
          <span class="fc-tela-conta" data-tela-conta></span>
          <button type="button" class="fc-tela-ampliar" data-tela-ampliar>
            <span aria-hidden="true" data-ampliar-icone>⤢</span><span data-ampliar-texto>Ampliar</span>
          </button>
        </div>

        <div class="fc-tela-corpo" data-tela-corpo data-lenis-prevent>
          <p class="fc-tela-estado">Carregando cursos…</p>
        </div>
      </div>

      <p class="fc-notebook-dica" id="${idTela}-dica">
        <span data-notebook-contagem>Os cursos estão no notebook</span>
        Abra o notebook para ver os cursos e se inscrever.
      </p>

      <button type="button" class="fc-notebook-abrir" data-notebook-abrir aria-controls="${idTela}" aria-describedby="${idTela}-dica" aria-expanded="false">
        <span class="fc-notebook-abrir-rotulo">Abrir o notebook <span aria-hidden="true">↗</span></span>
      </button>

      <button type="button" class="fc-notebook-fechar" data-notebook-fechar aria-controls="${idTela}" aria-expanded="true" aria-label="Fechar o notebook" hidden>
        <span aria-hidden="true">↙</span>
      </button>
    </div>
  `;
}

// =========================
// MONTAR O NOTEBOOK
// =========================

export async function montarNotebookCursos(raiz, opcoes = {}) {
  if (!raiz) {
    return;
  }

  const {
    caminhoLogin = "./login.html",
    caminhoInscricoes = "./inscricoes.html",
    caminhoImagens = "./imagens/",
  } = opcoes;

  contador += 1;

  raiz.innerHTML = marcacao(`telaCursos${contador}`);
  const prefixoIds = `fc-cursos-${contador}`;

  const botoesModo = [...raiz.querySelectorAll("[data-modo-visualizacao]")];
  const areaSimples = raiz.querySelector("[data-cursos-simples]");
  const listaSimples = raiz.querySelector("[data-lista-cursos-simples]");
  const palco = raiz.querySelector(".fc-notebook-palco");
  const canvas = raiz.querySelector(".fc-notebook-canvas");
  const encaixe = raiz.querySelector(".fc-notebook-encaixe");
  const tela = raiz.querySelector(".fc-notebook-tela");
  const corpo = raiz.querySelector("[data-tela-corpo]");
  const conta = raiz.querySelector("[data-tela-conta]");
  const botaoAmpliar = raiz.querySelector("[data-tela-ampliar]");
  const botaoAbrir = raiz.querySelector("[data-notebook-abrir]");
  const botaoFechar = raiz.querySelector("[data-notebook-fechar]");
  const contagem = raiz.querySelector("[data-notebook-contagem]");

  const estado = {
    aberto: false,
    modo: "simples",
    vista: "carregando",
    idSelecionado: null,
    cursos: [],
    conta: null,
    mensagem: null,
    enviando: false,
    focarAoLigar: false,
    veioDoSimples: false,
  };

  let atualizacaoContaPromise = null;
  let motor3D = null;
  let desistiuDo3D = false;
  let esperaFechar = 0;
  let esperaTela = 0;

  // =========================
  // TELA LIGADA E DESLIGADA
  // =========================

  function ligarTela() {
    clearTimeout(esperaTela);
    palco.classList.add("fc-tela-ligada");
    tela.inert = false;

    if (estado.focarAoLigar) {
      estado.focarAoLigar = false;
      focarTitulo();
    }
  }

  function desligarTela() {
    clearTimeout(esperaTela);
    sairDoAmpliado();
    palco.classList.remove("fc-tela-ligada");
    tela.inert = true;
  }

  function definirAberto(valor, { imediato = false, peloUsuario = false } = {}) {
    estado.aberto = valor;
    raiz.dataset.aberto = String(valor);

    botaoAbrir.hidden = valor;
    botaoFechar.hidden = !valor;
    botaoAbrir.setAttribute("aria-expanded", String(valor));

    if (!valor) {
      desligarTela();

      if (peloUsuario) {
        botaoAbrir.focus({ preventScroll: true });
      }
    } else {
      estado.focarAoLigar = peloUsuario;
    }

    clearTimeout(esperaFechar);

    if (motor3D) {
      // O 3D avisa quando a tampa termina de abrir (aoTerminar). Ao fechar, a tela
      // HTML some primeiro, para não ficar flutuando sobre a tampa em movimento.
      if (valor || imediato) {
        motor3D.definirAberto(valor, { imediato });
      } else {
        esperaFechar = setTimeout(() => motor3D?.definirAberto(false), 160);
      }
    } else if (valor) {
      // A tela aparece junto com o notebook 3D. Se ele demorar ou não estiver
      // disponível, ela aparece sozinha, para os cursos não ficarem escondidos.
      clearTimeout(esperaTela);

      if (desistiuDo3D) {
        ligarTela();
      } else {
        esperaTela = setTimeout(ligarTela, ESPERA_3D);
      }
    }
  }

  botaoAbrir.addEventListener("click", function () {
    definirAberto(true, { peloUsuario: true });
  });

  botaoFechar.addEventListener("click", function () {
    definirAberto(false, { peloUsuario: true });
  });

  botoesModo.forEach(function (botao) {
    botao.addEventListener("click", function () {
      selecionarModo(botao.dataset.modoVisualizacao);
    });
  });

  // =========================
  // CARDS NO CELULAR: ATALHOS E DESCRIÇÃO
  // =========================

  // Descrições que a pessoa abriu continuam abertas quando a lista é redesenhada.
  const descricoesAbertas = new Set();

  // Atalhos: leva até o card escolhido (abaixo do cabeçalho fixo) e passa o foco para ele.
  function irParaCurso(id) {
    const card = listaSimples.querySelector(`[data-curso-card="${Number(id)}"]`);

    if (!card) {
      return;
    }

    const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (window.FCRolagem) {
      window.FCRolagem.scrollTo(card, { immediate: calmo });
    } else {
      card.scrollIntoView({ behavior: calmo ? "auto" : "smooth", block: "start" });
    }

    card.focus({ preventScroll: true });
    card.classList.remove("fc-curso-card-destaque");
    void card.offsetWidth;
    card.classList.add("fc-curso-card-destaque");
  }

  // No celular a descrição mostra até 3 linhas; "Ver mais" só aparece quando o texto foi cortado.
  function marcarDescricoesLongas() {
    for (const botao of listaSimples.querySelectorAll('[data-acao="descricao"]')) {
      const card = botao.closest("[data-curso-card]");
      const texto = card?.querySelector(".fc-curso-card-titulo p");

      if (!texto) {
        continue;
      }

      const aberta = card.classList.contains("fc-descricao-aberta");
      botao.hidden = !aberta && texto.scrollHeight <= texto.clientHeight + 1;
    }
  }

  let quadroDescricoes = 0;

  new ResizeObserver(function () {
    cancelAnimationFrame(quadroDescricoes);
    quadroDescricoes = requestAnimationFrame(marcarDescricoesLongas);
  }).observe(listaSimples);

  let verificandoInscricaoSimples = false;

  listaSimples.addEventListener("click", async function (evento) {
    const atalho = evento.target.closest("[data-ir-curso]");

    if (atalho) {
      irParaCurso(atalho.dataset.irCurso);
      return;
    }

    const botaoDescricao = evento.target.closest('[data-acao="descricao"]');

    if (botaoDescricao) {
      const card = botaoDescricao.closest("[data-curso-card]");

      if (!card) {
        return;
      }

      const aberta = card.classList.toggle("fc-descricao-aberta");
      const idCurso = Number(card.dataset.cursoCard);

      if (aberta) {
        descricoesAbertas.add(idCurso);
      } else {
        descricoesAbertas.delete(idCurso);
      }

      botaoDescricao.setAttribute("aria-expanded", String(aberta));
      botaoDescricao.textContent = aberta ? "Ver menos" : "Ver mais";
      return;
    }

    const botaoInscrever = evento.target.closest('[data-acao="inscrever"]');

    if (botaoInscrever) {
      const card = botaoInscrever.closest("[data-curso-card]");

      if (!card || verificandoInscricaoSimples || botaoInscrever.disabled) {
        return;
      }

      const idCurso = Number(card.dataset.cursoCard);
      if (!Number.isInteger(idCurso) || idCurso <= 0) {
        return;
      }

      verificandoInscricaoSimples = true;
      botoesModo.forEach((botao) => { botao.disabled = true; });
      botaoInscrever.disabled = true;
      botaoInscrever.textContent = "Verificando…";

      try {
        // A situação da conta e as matrículas já começam a ser carregadas
        // junto com os cursos. Se ainda estiverem em andamento, aguardamos.
        if (estado.conta === null || estado.conta.erro) {
          await atualizarConta();
        }

        const curso = estado.cursos.find((item) => Number(item.idCurso) === idCurso);

        if (!curso || !estado.conta || estado.conta.erro || !estado.conta.sessao) {
          desenharCursosSimples();
          return;
        }

        // Revalida o estado exibido antes de abrir a confirmação. A gravação
        // continua sendo protegida por realizarMatricula() no servidor.
        if (
          matriculaNoCurso(curso) ||
          matriculaNoPeriodo(curso) ||
          (numeroDeVagas(curso) !== null && numeroDeVagas(curso) <= 0)
        ) {
          desenharCursosSimples();
          return;
        }

        estado.idSelecionado = idCurso;
        estado.mensagem = null;
        estado.veioDoSimples = true;

        // O modo avançado usa a mesma tela e o mesmo componente de matrícula.
        // Com a conta validada, já abre na confirmação do curso escolhido.
        await selecionarModo("avancado", idCurso, true);
      } finally {
        verificandoInscricaoSimples = false;
        botoesModo.forEach((botao) => { botao.disabled = false; });
      }
      return;
    }

    const tentarConta = evento.target.closest('[data-acao="recarregar-conta"]');
    if (tentarConta) {
      tentarConta.disabled = true;
      tentarConta.textContent = "Verificando…";
      await atualizarConta();
      return;
    }

    const acao = evento.target.closest('[data-acao="recarregar"]');

    if (acao) {
      estado.vista = "carregando";
      desenhar();
      atualizarCursos();
    }
  });

  // =========================
  // TELA AMPLIADA (CELULAR)
  // =========================
  // No celular a tela do notebook é pequena: "Ampliar" leva a mesma
  // tela para quase a página inteira.

  function rotularAmpliar(ampliada) {
    botaoAmpliar.querySelector("[data-ampliar-icone]").textContent = ampliada ? "⤡" : "⤢";
    botaoAmpliar.querySelector("[data-ampliar-texto]").textContent = ampliada ? "Voltar ao notebook" : "Ampliar";
  }

  function sairDoAmpliado() {
    if (!tela.classList.contains("fc-tela-ampliada")) {
      return;
    }

    const comFoco = tela.contains(document.activeElement);

    tela.classList.remove("fc-tela-ampliada");
    palco.insertBefore(tela, botaoAbrir);
    rotularAmpliar(false);
    document.documentElement.classList.remove("fc-notebook-travado");

    if (comFoco) {
      botaoAmpliar.focus({ preventScroll: true });
    }
  }

  botaoAmpliar.addEventListener("click", function () {
    if (tela.classList.contains("fc-tela-ampliada")) {
      sairDoAmpliado();
      return;
    }

    // Vai para o fim do body: dentro da seção, as seções seguintes ficariam por cima.
    tela.classList.add("fc-tela-ampliada");
    document.body.append(tela);
    rotularAmpliar(true);
    botaoAmpliar.focus({ preventScroll: true });
    // A página atrás para de rolar enquanto a tela está ampliada.
    document.documentElement.classList.add("fc-notebook-travado");
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && tela.classList.contains("fc-tela-ampliada")) {
      sairDoAmpliado();
      botaoAmpliar.focus();
    }
  });

  // =========================
  // VISTAS DA TELA
  // =========================

  function cursoSelecionado() {
    return estado.cursos.find(function (curso) {
      return Number(curso.idCurso) === estado.idSelecionado;
    }) || null;
  }

  function matriculaNoCurso(curso) {
    return (estado.conta?.matriculas || []).some(function (matricula) {
      return matricula.idCurso === Number(curso.idCurso);
    });
  }

  function matriculaNoPeriodo(curso) {
    if (!normalizarPeriodo) {
      return false;
    }

    const periodo = normalizarPeriodo(curso.periodo);

    return Boolean(periodo) && (estado.conta?.matriculas || []).some(function (matricula) {
      return matricula.periodo === periodo;
    });
  }

  function vistaCarregando() {
    return `<p class="fc-tela-estado">Carregando cursos…</p>`;
  }

  function vistaErro() {
    return `
      <div class="fc-tela-vazia">
        <h3 data-tela-titulo tabindex="-1">Não foi possível carregar os cursos.</h3>
        <button type="button" class="fc-tela-botao" data-acao="recarregar">Tentar de novo</button>
      </div>
    `;
  }

  // Os dados de instrutores são compartilhados entre os cards e o notebook avançado.
  function dadosDosInstrutores(curso) {
    const ministrantes = curso.ministrantes || [];

    const avatares = ministrantes.slice(0, LIMITE_INSTRUTORES).map(function (ministrante) {
      const nome = ministrante.usuarios?.nome || "Instrutor do curso";

      const imagem = prepararImagemMinistrante(ministrante.referenciaFoto, caminhoImagens, "mini");
      return `<img src="${escaparHTML(imagem.src)}" ${atributosFallbackImagem(imagem, `${caminhoImagens}usuario-padrao.png`)} alt="" title="${escaparHTML(nome)}" width="30" height="30" loading="lazy" decoding="async">`;
    }).join("");

    const nomes = ministrantes
      .map((ministrante) => ministrante.usuarios?.nome)
      .filter(Boolean);

    let textoInstrutores = "Instrutores a definir";

    if (nomes.length === 1) {
      textoInstrutores = nomes[0];
    } else if (nomes.length > 1) {
      textoInstrutores = `${nomes[0]} e mais ${nomes.length - 1}`;
    } else if (ministrantes.length > 0) {
      textoInstrutores = ministrantes.length === 1 ? "1 instrutor" : `${ministrantes.length} instrutores`;
    }

    return { avatares, textoInstrutores };
  }

  // O modo simples apresenta as mesmas informações do detalhe avançado,
  // mas sem exigir que a pessoa abra ou navegue pelo notebook.
  function desenharCursosSimples() {
    if (estado.vista === "carregando" && estado.cursos.length === 0) {
      listaSimples.innerHTML = `<p class="fc-notebook-carregando">Carregando cursos...</p>`;
      return;
    }

    if (estado.vista === "erro" && estado.cursos.length === 0) {
      listaSimples.innerHTML = `
        <div class="fc-cursos-simples-vazio">
          <p>Não foi possível carregar os cursos.</p>
          <button type="button" class="fc-tela-botao" data-acao="recarregar">Tentar novamente</button>
        </div>
      `;
      return;
    }

    if (estado.cursos.length === 0) {
      listaSimples.innerHTML = `<p class="fc-cursos-simples-vazio">Nenhum curso disponível no momento.</p>`;
      return;
    }

    const cards = estado.cursos.map(function (curso) {
      const identidade = courseIdentity(curso.nome);
      const vagas = numeroDeVagas(curso);
      const instrutores = dadosDosInstrutores(curso);
      const idCurso = Number(curso.idCurso);

      const logo = identidade.logo
        ? `<img src="${escaparHTML(identidade.logo)}" alt="${escaparHTML(identidade.logoLabel)}" width="56" height="56" loading="lazy" decoding="async">`
        : `<span class="fc-curso-simples-sigla" aria-hidden="true">${escaparHTML(identidade.name.slice(0, 2))}</span>`;

      const status = String(curso.status ?? "").trim();
      const statusNormalizado = status.toLowerCase();
      const mostrarStatus = status && !["não iniciado", "nao iniciado"].includes(statusNormalizado);

      const aberta = descricoesAbertas.has(idCurso);
      const idDescricao = `${prefixoIds}-descricao-${idCurso}`;

      return `
        <li>
          <article class="fc-curso-card${aberta ? " fc-descricao-aberta" : ""}" data-curso-card="${idCurso}" tabindex="-1" aria-label="${escaparHTML(identidade.name)}" style="--fc-cor:${identidade.color}">
            <header class="fc-curso-card-cabecalho">
              <div class="fc-curso-card-identidade">
                <span class="fc-curso-card-logo">${logo}</span>
                <div class="fc-curso-card-titulo">
                  <h3>${escaparHTML(identidade.name)}</h3>
                  <p id="${idDescricao}">${escaparHTML(curso.descricao || "Sem descrição disponível.")}</p>
                  <button type="button" class="fc-curso-card-mais" data-acao="descricao" aria-expanded="${aberta}" aria-controls="${idDescricao}" hidden>${aberta ? "Ver menos" : "Ver mais"}</button>
                </div>
              </div>
              <time class="fc-curso-card-data" datetime="${INICIO_CURSOS.iso}">${INICIO_CURSOS.curto}</time>
            </header>

            ${mostrarStatus ? `<span class="fc-curso-card-status">${escaparHTML(status)}</span>` : ""}

            <dl class="fc-curso-card-info">
              <div><dt>Duração</dt><dd>${DURACAO_PADRAO}</dd></div>
              <div><dt>Labin</dt><dd>${escaparHTML(salaDoCurso(curso))}</dd></div>
              <div><dt>Vagas</dt><dd>${vagas === null ? "—" : vagas}</dd></div>
            </dl>

            <div class="fc-curso-card-instrutores">
              <span class="fc-curso-card-avatares" aria-hidden="true">${instrutores.avatares}</span>
              <span class="fc-curso-card-nomes"><small>Instrutores</small>${escaparHTML(instrutores.textoInstrutores)}</span>
            </div>

            <div class="fc-curso-card-acao">
              ${acaoDoCursoSimples(curso)}
            </div>
          </article>
        </li>
      `;
    }).join("");

    // Atalhos com o nome de cada curso (só na lista de uma coluna, no celular).
    const atalhos = estado.cursos.map(function (curso) {
      return `<button type="button" class="fc-cursos-atalho" data-ir-curso="${Number(curso.idCurso)}">${escaparHTML(courseIdentity(curso.nome).name)}</button>`;
    }).join("");

    listaSimples.innerHTML = `
      <nav class="fc-cursos-atalhos" aria-label="Ir direto para um curso">${atalhos}</nav>
      <ul class="fc-cursos-simples-grade" aria-label="Cursos disponíveis">${cards}</ul>
    `;

    marcarDescricoesLongas();
  }

  function atualizarModoVisualizacao() {
    const simples = estado.modo === "simples";

    areaSimples.hidden = !simples;
    palco.hidden = simples;

    botoesModo.forEach(function (botao) {
      const ativo = botao.dataset.modoVisualizacao === estado.modo;
      botao.classList.toggle("fc-modo-ativo", ativo);
      botao.setAttribute("aria-pressed", String(ativo));
    });
  }

  async function selecionarModo(modo, cursoId = null, abrirConfirmacao = false) {
    if (modo === "simples") {
      estado.modo = "simples";
      estado.idSelecionado = null;
      estado.vista = "lista";
      estado.mensagem = null;
      estado.veioDoSimples = false;
      definirAberto(false, { imediato: true });
      atualizarModoVisualizacao();
      desenharCursosSimples();
      return;
    }

    // O CSS do notebook não pesa no carregamento inicial dos cards.
    try {
      await carregarCssAvancado();
    } catch (erro) {
      console.warn("Não foi possível carregar o estilo avançado do notebook:", erro);
    }

    estado.modo = "avancado";

    if (cursoId !== null) {
      estado.idSelecionado = Number(cursoId);
      estado.vista = abrirConfirmacao ? "confirmar" : "curso";
      estado.mensagem = null;
    } else if (!estado.idSelecionado) {
      estado.vista = "lista";
    }

    atualizarModoVisualizacao();
    definirAberto(true, { imediato: true, peloUsuario: true });
    desenhar();
    iniciar3D();

    // Se a verificação inicial ainda não terminou ou falhou, tenta novamente.
    // A inicialização normal já consulta a conta também no modo simples.
    if (estado.conta === null || estado.conta.erro) {
      atualizarConta();
    }
  }

  function vistaLista() {
    if (estado.cursos.length === 0) {
      return `
        <div class="fc-tela-vazia">
          <h3 data-tela-titulo tabindex="-1">Nenhum curso disponível.</h3>
        </div>
      `;
    }

    const itens = estado.cursos.map(function (curso) {
      const identidade = courseIdentity(curso.nome);
      const vagas = numeroDeVagas(curso);
      const inscrito = matriculaNoCurso(curso);

      let detalhe = "";

      if (inscrito) {
        detalhe = "Inscrito";
      } else if (vagas !== null && vagas <= 0) {
        detalhe = "Esgotado";
      } else if (vagas !== null) {
        detalhe = vagas === 1 ? "1 vaga" : `${vagas} vagas`;
      }

      // Dentro do item, o ponteiro vira o ícone da linguagem.
      const cursor = identidade.cursor
        ? `--fc-cursor-linguagem:url('${identidade.cursor}') 16 16, pointer;`
        : "";

      const logo = identidade.logo
        ? `<img src="${escaparHTML(identidade.logo)}" alt="" width="44" height="44" loading="lazy">`
        : `<span class="fc-tela-sigla" aria-hidden="true">${escaparHTML(identidade.name.slice(0, 2))}</span>`;

      return `
        <li>
          <button
            type="button"
            class="fc-tela-item${inscrito ? " fc-tela-item-inscrito" : ""}"
            data-acao="curso"
            data-id="${Number(curso.idCurso)}"
            style="--fc-cor:${identidade.color};${cursor}"
          >
            ${logo}
            <b>${escaparHTML(identidade.name)}</b>
            ${detalhe ? `<small>${detalhe}</small>` : ""}
          </button>
        </li>
      `;
    }).join("");

    return `
      <div class="fc-tela-topo">
        <h3 data-tela-titulo tabindex="-1">Escolha seu curso</h3>
        <p><time datetime="${INICIO_CURSOS.iso}">${INICIO_CURSOS.curto}</time> · ${LOCAL_EVENTO} · ${DURACAO_PADRAO}</p>
      </div>

      <ul class="fc-tela-grade" aria-label="Cursos">${itens}</ul>
    `;
  }

  function acaoDoCursoSimples(curso) {
    // Enquanto a conta/matrículas não terminarem de carregar, não oferecemos
    // uma ação que possa levar a uma confirmação incorreta.
    return acaoDoCurso(curso);
  }

  function acaoDoCurso(curso) {
    const vagas = numeroDeVagas(curso);

    if (estado.conta === null) {
      return `<p class="fc-tela-nota">Verificando sua conta…</p>`;
    }

    if (estado.conta.erro) {
      return `
        <div class="fc-tela-nota">
          <p>Não foi possível verificar sua inscrição.</p>
          <button type="button" class="fc-tela-botao" data-acao="recarregar-conta">Tentar novamente</button>
        </div>
      `;
    }

    if (!estado.conta.sessao) {
      return `<a class="fc-tela-botao fc-tela-botao-ouro" href="${caminhoLogin}">Entrar para se inscrever <span aria-hidden="true">→</span></a>`;
    }

    if (matriculaNoCurso(curso)) {
      return `
        <p class="fc-tela-nota fc-tela-nota-ok">Você está inscrito neste curso.</p>
        <a class="fc-tela-botao" href="${caminhoInscricoes}">Ver minhas inscrições</a>
      `;
    }

    if (matriculaNoPeriodo(curso)) {
      return `<p class="fc-tela-nota">Você já está inscrito em um curso neste período.</p>`;
    }

    if (vagas !== null && vagas <= 0) {
      return `<p class="fc-tela-nota">Vagas esgotadas</p>`;
    }

    return `<button type="button" class="fc-tela-botao fc-tela-botao-ouro" data-acao="inscrever">Inscrever-se <span aria-hidden="true">→</span></button>`;
  }

  function vistaCurso(curso) {
    const identidade = courseIdentity(curso.nome);
    const vagas = numeroDeVagas(curso);
    const instrutores = dadosDosInstrutores(curso);
    const { avatares, textoInstrutores } = instrutores;

    return `
      <button type="button" class="fc-tela-voltar" data-acao="lista"><span aria-hidden="true">←</span> Todos os cursos</button>

      <div class="fc-tela-curso">
        ${identidade.logo ? `<img class="fc-tela-curso-logo" src="${escaparHTML(identidade.logo)}" alt="${escaparHTML(identidade.logoLabel)}" width="64" height="64">` : ""}

        <div class="fc-tela-curso-texto">
          <h3 data-tela-titulo tabindex="-1">${escaparHTML(identidade.name)}</h3>
          <p>${escaparHTML(curso.descricao || "Sem descrição disponível.")}</p>
        </div>

        <span class="fc-tela-selo">${textoDoSelo(curso.status)}</span>
      </div>

      <dl class="fc-tela-info">
        <div><dt>Duração</dt><dd>${DURACAO_PADRAO}</dd></div>
        <div><dt>Labin</dt><dd>${escaparHTML(salaDoCurso(curso))}</dd></div>
        <div><dt>Vagas</dt><dd>${vagas === null ? "—" : vagas}</dd></div>
      </dl>

      <div class="fc-tela-instrutores">
        <span class="fc-tela-avatares" aria-hidden="true">${avatares}</span>
        <span><small>Instrutores</small>${escaparHTML(textoInstrutores)}</span>
      </div>

      <div class="fc-tela-acao">${acaoDoCurso(curso)}</div>
    `;
  }

  function vistaConfirmar(curso) {
    const identidade = courseIdentity(curso.nome);
    const mensagem = estado.mensagem;

    let aviso = "";

    if (mensagem) {
      const link = mensagem.tipo === "login"
        ? ` <a href="${caminhoLogin}">Entrar</a>`
        : "";

      aviso = `<p class="fc-tela-mensagem" role="alert" data-tipo="${mensagem.tipo}">${escaparHTML(mensagem.mensagem)}${link}</p>`;
    }

    return `
      ${estado.veioDoSimples ? "" : `<button type="button" class="fc-tela-voltar" data-acao="curso" data-id="${Number(curso.idCurso)}"><span aria-hidden="true">←</span> Voltar</button>`}

      <div class="fc-tela-confirmar">
        <h3 data-tela-titulo tabindex="-1">Confirmar inscrição</h3>

        <p>
          Você vai se inscrever em <strong>${escaparHTML(identidade.name)}</strong>,
          no dia ${INICIO_CURSOS.longo}, na ${LOCAL_EVENTO}.
          Cada pessoa pode fazer um curso por período.
        </p>

        ${aviso}

        <div class="fc-tela-botoes">
          <button type="button" class="fc-tela-botao fc-tela-botao-ouro" data-acao="confirmar"${estado.enviando ? " disabled" : ""}>
            ${estado.enviando ? "Confirmando…" : "Confirmar inscrição"}
          </button>

          <button type="button" class="fc-tela-botao" data-acao="${estado.veioDoSimples ? "voltar-simples" : "curso"}" data-id="${Number(curso.idCurso)}"${estado.enviando ? " disabled" : ""}>${estado.veioDoSimples ? "Voltar aos cursos" : "Cancelar"}</button>
        </div>
      </div>
    `;
  }

  function vistaFeito(curso) {
    const identidade = courseIdentity(curso.nome);

    return `
      <div class="fc-tela-feito">
        <span class="fc-tela-feito-icone" aria-hidden="true">✓</span>

        <h3 data-tela-titulo tabindex="-1">Inscrição confirmada!</h3>

        <p>Sua vaga em <strong>${escaparHTML(identidade.name)}</strong> está garantida. Até ${INICIO_CURSOS.longo}.</p>

        <div class="fc-tela-botoes">
          <a class="fc-tela-botao fc-tela-botao-ouro" href="${caminhoInscricoes}">Ver minhas inscrições</a>
          <button type="button" class="fc-tela-botao" data-acao="lista">Voltar aos cursos</button>
        </div>
      </div>
    `;
  }

  function focarTitulo() {
    corpo.scrollTop = 0;
    corpo.querySelector("[data-tela-titulo]")?.focus({ preventScroll: true });
  }

  function desenharConta() {
    const situacao = estado.conta;

    if (!situacao) {
      conta.innerHTML = "";
    } else if (!situacao.sessao) {
      conta.innerHTML = `<a href="${caminhoLogin}">Entrar</a>`;
    } else {
      const nome = primeiroNome(situacao);

      conta.textContent = nome ? `Olá, ${nome}` : "Conectado";
    }
  }

  function desenhar({ focar = false } = {}) {
    if (estado.modo === "simples") {
      desenharCursosSimples();
      return;
    }

    const curso = cursoSelecionado();

    // O curso escolhido pode sumir numa atualização: volta para a lista.
    if (["curso", "confirmar", "feito"].includes(estado.vista) && !curso) {
      estado.vista = "lista";
    }

    const vistas = {
      carregando: vistaCarregando,
      erro: vistaErro,
      lista: vistaLista,
      curso: () => vistaCurso(curso),
      confirmar: () => vistaConfirmar(curso),
      feito: () => vistaFeito(curso),
    };

    corpo.dataset.vista = estado.vista;
    corpo.innerHTML = vistas[estado.vista]();

    desenharConta();

    if (focar) {
      focarTitulo();
    }
  }

  // =========================
  // AÇÕES DA TELA
  // =========================

  async function confirmar() {
    if (estado.enviando || !estado.idSelecionado) {
      return;
    }

    estado.enviando = true;
    estado.mensagem = null;
    desenhar();

    let resultado;

    try {
      await carregarModuloMatriculas();
      resultado = await realizarMatricula(estado.idSelecionado);
    } catch (erro) {
      console.error("Erro ao preparar a matrícula:", erro);
      resultado = {
        ok: false,
        tipo: "erro",
        mensagem: "Não foi possível preparar a matrícula. Tente novamente.",
      };
    }

    estado.enviando = false;

    if (resultado.ok) {
      estado.vista = "feito";
      desenhar({ focar: true });
      atualizarCursos();
      atualizarConta();
      return;
    }

    estado.mensagem = resultado;
    desenhar();
    corpo.querySelector(".fc-tela-mensagem")?.scrollIntoView({ block: "nearest" });

    // Vagas ou matrículas podem ter mudado desde que a tela abriu.
    if (resultado.tipo === "aviso") {
      atualizarTudo();
    }
  }

  corpo.addEventListener("click", function (evento) {
    const alvo = evento.target.closest("[data-acao]");

    if (!alvo || alvo.disabled) {
      return;
    }

    const acao = alvo.dataset.acao;

    if (acao === "curso") {
      estado.idSelecionado = Number(alvo.dataset.id);
      estado.vista = "curso";
      estado.mensagem = null;
      desenhar({ focar: true });
    } else if (acao === "voltar-simples") {
      estado.mensagem = null;
      estado.veioDoSimples = false;
      selecionarModo("simples");
    } else if (acao === "lista") {
      if (estado.veioDoSimples) {
        estado.veioDoSimples = false;
        selecionarModo("simples");
        return;
      }

      const anterior = estado.idSelecionado;

      estado.vista = "lista";
      estado.mensagem = null;
      desenhar();

      // Volta o foco para o curso de onde a pessoa veio.
      const item = corpo.querySelector(`[data-acao="curso"][data-id="${anterior}"]`);

      if (item) {
        item.focus({ preventScroll: true });
        item.scrollIntoView({ block: "nearest" });
      } else {
        focarTitulo();
      }
    } else if (acao === "inscrever") {
      estado.vista = "confirmar";
      estado.mensagem = null;
      desenhar({ focar: true });
    } else if (acao === "confirmar") {
      confirmar();
    } else if (acao === "recarregar") {
      estado.vista = "carregando";
      desenhar();
      atualizarCursos();
    } else if (acao === "recarregar-conta") {
      alvo.disabled = true;
      alvo.textContent = "Verificando…";
      atualizarConta();
    }
  });

  // =========================
  // DADOS
  // =========================

  async function atualizarCursos() {
    try {
      const [cursos, vagas] = await Promise.all([
        carregarDadosCursos(),
        carregarDadosVagas().catch(() => ({})),
      ]);

      (cursos || []).forEach(function (curso) {
        if (vagas[curso.idCurso] !== undefined) {
          curso.vagas = vagas[curso.idCurso];
        }
      });

      estado.cursos = cursos || [];

      // O aviso do notebook fechado diz quantos cursos estão dentro dele.
      if (estado.cursos.length > 0) {
        contagem.textContent = estado.cursos.length === 1
          ? "1 curso dentro do notebook"
          : `${estado.cursos.length} cursos dentro do notebook`;
      }

      if (["carregando", "erro"].includes(estado.vista)) {
        estado.vista = "lista";
      }
    } catch (erro) {
      console.error("Erro ao carregar cursos:", erro);

      if (estado.cursos.length === 0) {
        estado.vista = "erro";
      }
    }

    desenhar();
  }

  async function atualizarConta() {
    // Evita disparar consultas duplicadas quando a página inicializa e o
    // Supabase emite o evento INITIAL_SESSION quase ao mesmo tempo.
    if (atualizacaoContaPromise) {
      return atualizacaoContaPromise;
    }

    atualizacaoContaPromise = (async function () {
      try {
        await carregarModuloMatriculas();
        estado.conta = await situacaoDaConta();
      } catch (erro) {
        console.error("Erro ao verificar a conta:", erro);
        estado.conta = { sessao: null, usuario: null, matriculas: [], erro: true };
      }

      // Na confirmação, a tela não troca enquanto a pessoa decide.
      if (!estado.enviando) {
        desenhar();
      }

      return estado.conta;
    })();

    try {
      return await atualizacaoContaPromise;
    } finally {
      atualizacaoContaPromise = null;
    }
  }

  function atualizarTudo() {
    atualizarCursos();
    atualizarConta();
  }

  // A moldura (app.html) mantém a tela aberta: login, logout e
  // matrículas feitas em outra tela atualizam o notebook.
  clienteSupabase.auth.onAuthStateChange(function (evento, sessao) {
    const email = sessao?.user?.email || "";
    const anterior = estado.conta?.sessao?.user?.email || "";

    // O Supabase também avisa ao renovar o token: só muda quando a conta muda.
    if (!estado.conta || email !== anterior) {
      setTimeout(atualizarConta, 0);
    }
  });

  if ("BroadcastChannel" in window) {
    new BroadcastChannel(CANAL_MATRICULAS).addEventListener("message", atualizarTudo);
  }

  // =========================
  // NOTEBOOK 3D
  // =========================

  // Sem 3D (sem WebGL, erro ou demora), a tela dos cursos funciona sozinha.
  function usarSem3D() {
    desistiuDo3D = true;
    motor3D?.destruir();
    motor3D = null;
    palco.dataset.renderer = "sem3d";

    if (estado.aberto) {
      ligarTela();
    }
  }

  async function carregar3D() {
    if (!temWebGL()) {
      usarSem3D();
      return;
    }

    const limite = setTimeout(usarSem3D, 20000);

    try {
      const { criarNotebook3D } = await import(MODULO_3D.href);

      const motor = await criarNotebook3D({
        palco,
        canvas,
        encaixe,
        aberto: estado.aberto,
        aoTerminar(abriu) {
          if (abriu && estado.aberto) {
            ligarTela();
          }
        },
        aoFalhar: usarSem3D,
      });

      clearTimeout(limite);

      if (desistiuDo3D) {
        motor.destruir();
        return;
      }

      motor3D = motor;
      palco.dataset.renderer = "webgl";

      // A pessoa pode ter aberto ou fechado enquanto o 3D carregava.
      motor3D.definirAberto(estado.aberto, { imediato: true });
    } catch (erro) {
      clearTimeout(limite);
      console.warn("Sem o notebook 3D; a tela dos cursos continua funcionando.", erro);
      usarSem3D();
    }
  }

  // O notebook 3D só é carregado quando a pessoa escolhe o modo avançado.
  // No modo simples, a página usa apenas os cards e não precisa iniciar o WebGL.
  let iniciou3D = false;

  function iniciar3D() {
    if (iniciou3D) {
      return;
    }

    iniciou3D = true;
    carregar3D();
  }

  // =========================
  // INÍCIO
  // =========================

  atualizarModoVisualizacao();
  definirAberto(false, { imediato: true });
  desenhar();

  // Os cards precisam refletir inscrições existentes desde a primeira
  // renderização, tanto na home quanto na página de cursos. O CSS avançado
  // e o notebook 3D continuam carregando somente quando solicitados.
  atualizarConta();
  await atualizarCursos();
}
