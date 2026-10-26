// =========================
// NOTEBOOK DE CURSOS
// =========================
// Um notebook só, no lugar dos cards: a tela dele lista os cursos,
// mostra os detalhes e confirma a inscrição. A tela é HTML de verdade
// (clique, teclado e leitor de tela); o 3D (notebooks/notebook-cursos.js)
// é só a moldura e carrega quando o notebook chega perto da tela.
// Sem 3D, a mesma tela aparece num notebook desenhado em CSS.

import { clienteSupabase } from "./supabase.js";
import { carregarDadosCursos, carregarDadosVagas } from "./dados.js";
import { escaparHTML } from "./seguranca.js";
import {
  CANAL_MATRICULAS,
  normalizarPeriodo,
  realizarMatricula,
  situacaoDaConta,
} from "./matricular.js";
import { courseIdentity } from "../notebooks/course-identities.js?v=ready-6";

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

const MODULO_3D = new URL("../notebooks/notebook-cursos.js?v=3", import.meta.url);

const MARCA = new URL("../imagens/logoFlash.webp", import.meta.url).href;

let contador = 0;

// =========================
// FUNÇÕES DE APOIO
// =========================

function montarImagem(caminho, caminhoImagens) {
  if (!caminho || String(caminho).trim() === "") {
    return `${caminhoImagens}usuario-padrao.png`;
  }

  const valor = String(caminho).trim();

  if (valor.startsWith("http://") || valor.startsWith("https://")) {
    return valor;
  }

  return `${caminhoImagens}${valor.replace(/^\.\/imagens\//, "")}`;
}

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
    <div class="fc-notebook-palco" data-renderer="pending">
      <canvas class="fc-notebook-canvas" aria-hidden="true"></canvas>

      <div class="fc-notebook-desenho" aria-hidden="true">
        <svg class="fc-notebook-fechado" viewBox="0 0 360 190" fill="none">
          <ellipse cx="182" cy="151" rx="133" ry="15" fill="#000" opacity=".32"/>
          <path d="M61 64 264 47 314 126 111 148 61 74Z" fill="#161d25" stroke="#3a4552"/>
          <path d="m61 64 203-17 50 79-203 19Z" fill="#1d2630" stroke="#4d5966"/>
          <path d="m111 145 203-19v6l-203 21-50-73v-6Z" fill="#090d12" stroke="#2f3944"/>
          <path d="m161 144 56-6" stroke="#f5bd3d" stroke-width="2" stroke-linecap="round"/>
          <image href="${escaparHTML(MARCA)}" x=".3" y=".32" width=".4" height=".35" transform="matrix(203 -17 50 81 61 64)"/>
        </svg>
      </div>

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
    aberto = false,
    caminhoLogin = "./login.html",
    caminhoInscricoes = "./inscricoes.html",
    caminhoImagens = "./imagens/",
  } = opcoes;

  contador += 1;

  raiz.innerHTML = marcacao(`telaCursos${contador}`);

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
    vista: "carregando",
    idSelecionado: null,
    cursos: [],
    conta: null,
    mensagem: null,
    enviando: false,
    focarAoLigar: false,
  };

  let motor3D = null;
  let desistiuDo3D = false;
  let esperaFechar = 0;

  // =========================
  // TELA LIGADA E DESLIGADA
  // =========================

  function ligarTela() {
    palco.classList.add("fc-tela-ligada");
    tela.inert = false;

    if (estado.focarAoLigar) {
      estado.focarAoLigar = false;
      focarTitulo();
    }
  }

  function desligarTela() {
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
      ligarTela();
    }
  }

  botaoAbrir.addEventListener("click", function () {
    definirAberto(true, { peloUsuario: true });
  });

  botaoFechar.addEventListener("click", function () {
    definirAberto(false, { peloUsuario: true });
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

  function acaoDoCurso(curso) {
    const vagas = numeroDeVagas(curso);

    if (estado.conta === null) {
      return `<p class="fc-tela-nota">Verificando sua conta…</p>`;
    }

    if (!estado.conta.sessao) {
      return `<a class="fc-tela-botao fc-tela-botao-ouro" href="${caminhoLogin}">Entrar para se inscrever <span aria-hidden="true">→</span></a>`;
    }

    if (estado.conta.erro) {
      return `<p class="fc-tela-nota">Não foi possível verificar sua inscrição.</p>`;
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
    const ministrantes = curso.ministrantes || [];

    const avatares = ministrantes.slice(0, LIMITE_INSTRUTORES).map(function (ministrante) {
      const nome = ministrante.usuarios?.nome || "Instrutor do curso";

      return `<img src="${escaparHTML(montarImagem(ministrante.referenciaFoto, caminhoImagens))}" alt="" title="${escaparHTML(nome)}" width="30" height="30" loading="lazy">`;
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
        <div><dt>Sala</dt><dd>${escaparHTML(salaDoCurso(curso))}</dd></div>
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
      <button type="button" class="fc-tela-voltar" data-acao="curso" data-id="${Number(curso.idCurso)}"><span aria-hidden="true">←</span> Voltar</button>

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

          <button type="button" class="fc-tela-botao" data-acao="curso" data-id="${Number(curso.idCurso)}"${estado.enviando ? " disabled" : ""}>Cancelar</button>
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

    const resultado = await realizarMatricula(estado.idSelecionado);

    estado.enviando = false;

    if (resultado.ok) {
      estado.vista = "feito";
      desenhar({ focar: true });
      atualizarTudo();
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
    } else if (acao === "lista") {
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
    try {
      estado.conta = await situacaoDaConta();
    } catch (erro) {
      console.error("Erro ao verificar a conta:", erro);
      estado.conta = { sessao: null, usuario: null, matriculas: [], erro: true };
    }

    // Na confirmação, a tela não troca enquanto a pessoa decide.
    if (!estado.enviando) {
      desenhar();
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
    if (estado.conta && email !== anterior) {
      setTimeout(atualizarConta, 0);
    }
  });

  if ("BroadcastChannel" in window) {
    new BroadcastChannel(CANAL_MATRICULAS).addEventListener("message", atualizarTudo);
  }

  // =========================
  // NOTEBOOK 3D
  // =========================

  function usarDesenho() {
    desistiuDo3D = true;
    motor3D?.destruir();
    motor3D = null;
    palco.dataset.renderer = "desenho";

    if (estado.aberto) {
      ligarTela();
    }
  }

  async function carregar3D() {
    if (!temWebGL()) {
      usarDesenho();
      return;
    }

    const limite = setTimeout(usarDesenho, 20000);

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
        aoFalhar: usarDesenho,
      });

      clearTimeout(limite);

      if (desistiuDo3D) {
        motor.destruir();
        return;
      }

      motor3D = motor;
      palco.dataset.renderer = "webgl";
    } catch (erro) {
      clearTimeout(limite);
      console.warn("O notebook continua na versão desenhada.", erro);
      usarDesenho();
    }
  }

  // Só carrega quando o notebook chega perto da tela.
  const observador = new IntersectionObserver(function (entradas) {
    if (entradas.some((entrada) => entrada.isIntersecting)) {
      observador.disconnect();
      carregar3D();
    }
  }, { rootMargin: "600px 0px" });

  observador.observe(palco);

  // =========================
  // INÍCIO
  // =========================

  definirAberto(aberto, { imediato: true });
  desenhar();
  atualizarConta();

  await atualizarCursos();
}
