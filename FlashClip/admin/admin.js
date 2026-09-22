const SUPABASE_URL = "https://mkylyczeakkgksrzffca.supabase.co";
const SUPABASE_KEY = "sb_publishable_LD9drZgiFn7iQ5FK-PhHOA_Uuv7YeqP";

const clienteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
);

// =============================
// ELEMENTOS DO DASHBOARD
// =============================

const mensagemAcesso = document.getElementById("mensagemAcesso");
const conteudoDashboard = document.getElementById("conteudoDashboard");

const totalPessoas = document.getElementById("totalPessoas");
const cursoPopular = document.getElementById("cursoPopular");
const mediaIdade = document.getElementById("mediaIdade");
const matriculasPendentes = document.getElementById("matriculasPendentes");

const ultimaAtualizacao = document.getElementById("ultimaAtualizacao");

const botaoVoltar = document.getElementById("botaoVoltar");
const botaoAtualizar = document.getElementById("botaoAtualizar");

// =============================
// ELEMENTOS DAS MATRÍCULAS
// =============================

const selectCurso = document.getElementById("selectCurso");

const listaParticipantes = document.getElementById("listaParticipantes");

const modalStatus = document.getElementById("modalStatus");

const botaoCancelarModal = document.getElementById("botaoCancelarModal");

const botaoConfirmarStatus = document.getElementById("botaoConfirmarStatus");

// Guarda a matrícula que será alterada
let matriculaSelecionada = null;

// =============================
// BOTÃO VOLTAR
// =============================

botaoVoltar.addEventListener("click", function () {
  window.location.href = "../index.html";
});

// =============================
// VERIFICAR ADMINISTRADOR
// =============================

async function verificarAdministrador() {
  const {
    data: { session },
    error,
  } = await clienteSupabase.auth.getSession();

  if (error || !session) {
    mensagemAcesso.textContent =
      "Você precisa estar logado para acessar esta página.";

    mensagemAcesso.classList.add("erro");

    return false;
  }

  const usuarioId = session.user.id;

  const { data: usuario, error: erroUsuario } = await clienteSupabase
    .from("usuarios")
    .select("permissao")
    .eq("id", usuarioId)
    .single();

  if (erroUsuario || !usuario) {
    mensagemAcesso.textContent = "Não foi possível verificar suas permissões.";

    mensagemAcesso.classList.add("erro");

    return false;
  }

  if (usuario.permissao !== true) {
    mensagemAcesso.textContent =
      "Acesso negado. Esta área é exclusiva para administradores.";

    mensagemAcesso.classList.add("erro");

    return false;
  }

  mensagemAcesso.classList.add("oculto");

  conteudoDashboard.classList.remove("oculto");

  return true;
}

// =============================
// CARREGAR DASHBOARD
// =============================

async function carregarDashboard() {
  const autorizado = await verificarAdministrador();

  if (!autorizado) return;

  // Carrega os cursos do seletor
  await carregarCursos();

  // =============================
  // BUSCAR MATRÍCULAS
  // =============================

  const { data: matriculas, error: erroMatriculas } =
    await clienteSupabase.from("matriculas").select(`
      idUsuario,
      idCurso,
      status,
      cursos (
        nome
      )
    `);

  console.log("Matrículas encontradas:", matriculas);
  console.log("Quantidade de matrículas:", matriculas?.length);
  console.log("Erro:", erroMatriculas);

  if (erroMatriculas) {
    console.error("Erro ao carregar matrículas:", erroMatriculas);

    mensagemAcesso.classList.remove("oculto");

    mensagemAcesso.textContent = "Erro ao carregar os dados do Dashboard.";

    mensagemAcesso.classList.add("erro");

    conteudoDashboard.classList.add("oculto");

    return;
  }

  // =============================
  // SEM MATRÍCULAS
  // =============================

  if (!matriculas || matriculas.length === 0) {
    totalPessoas.textContent = "0";

    cursoPopular.textContent = "Nenhum";

    mediaIdade.textContent = "0 anos";

    matriculasPendentes.textContent = "0";

    atualizarHorario();

    return;
  }

  // =============================
  // TOTAL DE PESSOAS
  // =============================

  const pessoas = new Set();

  matriculas.forEach(function (matricula) {
    pessoas.add(matricula.idUsuario);
  });

  totalPessoas.textContent = pessoas.size;

  // =============================
  // CURSO MAIS POPULAR
  // =============================

  const quantidadePorCurso = {};

  matriculas.forEach(function (matricula) {
    if (!matricula.cursos) return;

    const nomeCurso = matricula.cursos.nome;

    if (!quantidadePorCurso[nomeCurso]) {
      quantidadePorCurso[nomeCurso] = 0;
    }

    quantidadePorCurso[nomeCurso]++;
  });

  let nomeCursoPopular = "Nenhum";

  let maiorQuantidade = 0;

  for (const nomeCurso in quantidadePorCurso) {
    if (quantidadePorCurso[nomeCurso] > maiorQuantidade) {
      maiorQuantidade = quantidadePorCurso[nomeCurso];

      nomeCursoPopular = nomeCurso;
    }
  }

  cursoPopular.textContent = nomeCursoPopular;

  // =============================
  // MÉDIA DE IDADE
  // =============================

  const idsUsuarios = Array.from(pessoas);

  const { data: usuarios, error: erroUsuarios } = await clienteSupabase
    .from("usuarios")
    .select("id, idade")
    .in("id", idsUsuarios);

  console.log("USUÁRIOS:", usuarios);
  console.log("ERRO IDADES:", erroUsuarios);

  if (erroUsuarios) {
    mediaIdade.textContent = "Erro";
  } else {
    let somaIdades = 0;

    let quantidadeIdades = 0;

    usuarios.forEach(function (usuario) {
      console.log(
        "ID:",
        usuario.id,
        "IDADE:",
        usuario.idade,
        "TIPO:",
        typeof usuario.idade,
      );

      if (usuario.idade !== null && usuario.idade !== undefined) {
        somaIdades += Number(usuario.idade);

        quantidadeIdades++;
      }
    });

    console.log("SOMA:", somaIdades);

    console.log("QUANTIDADE:", quantidadeIdades);

    if (quantidadeIdades > 0) {
      const media = somaIdades / quantidadeIdades;

      console.log("MEDIA FINAL:", media);

      mediaIdade.textContent = `${media.toFixed(1)} anos`;
    } else {
      mediaIdade.textContent = "Não disponível";
    }
  }

  // =============================
  // MATRÍCULAS PENDENTES
  // =============================

  const pendentes = matriculas.filter(function (matricula) {
    return matricula.status === "Pendente";
  });

  matriculasPendentes.textContent = pendentes.length;

  // =============================
  // HORÁRIO
  // =============================

  atualizarHorario();
}

// =============================
// CARREGAR CURSOS NO SELECT
// =============================

async function carregarCursos() {
  const { data: cursos, error } = await clienteSupabase
    .from("cursos")
    .select("id, nome")
    .order("nome");

  if (error) {
    console.error("Erro ao carregar cursos:", error);

    return;
  }

  selectCurso.innerHTML = '<option value="">Selecione um curso</option>';

  cursos.forEach(function (curso) {
    const option = document.createElement("option");

    option.value = curso.id;

    option.textContent = curso.nome;

    selectCurso.appendChild(option);
  });
}

// =============================
// CARREGAR PARTICIPANTES
// =============================

async function carregarParticipantes(cursoId) {
  if (!cursoId) {
    listaParticipantes.innerHTML = `
      <p class="sem-matriculas">
        Selecione um curso para visualizar as matrículas.
      </p>
    `;

    return;
  }

  listaParticipantes.innerHTML = `
    <p class="carregando">
      Carregando participantes...
    </p>
  `;

  // =============================
  // BUSCAR MATRÍCULAS DO CURSO
  // =============================

  const { data: matriculas, error: erroMatriculas } = await clienteSupabase
    .from("matriculas")
    .select("id, idUsuario, status")
    .eq("idCurso", cursoId);

  if (erroMatriculas) {
    console.error("Erro ao carregar matrículas:", erroMatriculas);

    listaParticipantes.innerHTML = `
      <p class="sem-matriculas">
        Erro ao carregar as matrículas.
      </p>
    `;

    return;
  }

  // =============================
  // NENHUMA MATRÍCULA
  // =============================

  if (!matriculas || matriculas.length === 0) {
    listaParticipantes.innerHTML = `
      <p class="sem-matriculas">
        Nenhuma pessoa matriculada neste curso.
      </p>
    `;

    return;
  }

  // =============================
  // BUSCAR USUÁRIOS
  // =============================

  const idsUsuarios = matriculas.map(function (matricula) {
    return matricula.idUsuario;
  });

  const { data: usuarios, error: erroUsuarios } = await clienteSupabase
    .from("usuarios")
    .select("id, nome, idade, email, telefone")
    .in("id", idsUsuarios);

  if (erroUsuarios) {
    console.error("Erro ao carregar usuários:", erroUsuarios);

    listaParticipantes.innerHTML = `
      <p class="sem-matriculas">
        Erro ao carregar os participantes.
      </p>
    `;

    return;
  }

  // =============================
  // LIMPAR CARDS
  // =============================

  listaParticipantes.innerHTML = "";

  // =============================
  // CRIAR CARD DE CADA PARTICIPANTE
  // =============================

  matriculas.forEach(function (matricula) {
    const usuario = usuarios.find(function (usuario) {
      return usuario.id === matricula.idUsuario;
    });

    if (!usuario) return;

    const card = document.createElement("div");

    card.classList.add("card-participante");

    const status = matricula.status || "Pendente";

    let botao = "";

    // Só mostra o botão se estiver pendente

    if (status === "Pendente") {
      botao = `
        <button
          class="botao-atender"
          data-id="${matricula.id}">
          Marcar como atendido
        </button>
      `;
    }

    card.innerHTML = `

  <h3>
    ${usuario.nome}
  </h3>

  <div class="info-participante">
    ${usuario.idade} anos
  </div>

  <div class="info-participante">
    📧 ${usuario.email || "E-mail não informado"}
  </div>

  <div class="info-participante">
    📞 ${usuario.telefone || "Telefone não informado"}
  </div>

  <div class="status-participante">

    Status:

    <span class="${
      status === "Pendente" ? "status-pendente" : "status-atendido"
    }">

      ${status}

    </span>

  </div>

  ${botao}

`;

    listaParticipantes.appendChild(card);
  });

  // =============================
  // BOTÕES DE ATENDER
  // =============================

  const botoes = document.querySelectorAll(".botao-atender");

  botoes.forEach(function (botao) {
    botao.addEventListener("click", function () {
      matriculaSelecionada = botao.dataset.id;

      modalStatus.classList.add("ativo");
    });
  });
}

// =============================
// SELECIONAR CURSO
// =============================

selectCurso.addEventListener("change", function () {
  const cursoId = selectCurso.value;

  carregarParticipantes(cursoId);
});

// =============================
// CANCELAR MODAL
// =============================

botaoCancelarModal.addEventListener("click", function () {
  matriculaSelecionada = null;

  modalStatus.classList.remove("ativo");
});

// =============================
// CONFIRMAR STATUS
// =============================

botaoConfirmarStatus.addEventListener("click", async function () {
  if (!matriculaSelecionada) {
    return;
  }

  botaoConfirmarStatus.disabled = true;

  botaoConfirmarStatus.textContent = "Alterando...";

  const { error } = await clienteSupabase
    .from("matriculas")
    .update({
      status: "Atendido",
    })
    .eq("id", matriculaSelecionada);

  if (error) {
    console.error("Erro ao alterar status:", error);

    alert("Não foi possível alterar o status.");
  } else {
    // Fecha o modal

    modalStatus.classList.remove("ativo");

    // Atualiza os cards

    await carregarParticipantes(selectCurso.value);

    // Atualiza o número de pendentes

    await carregarDashboard();
  }

  botaoConfirmarStatus.disabled = false;

  botaoConfirmarStatus.textContent = "Confirmar";

  matriculaSelecionada = null;
});

// =============================
// ATUALIZAR HORÁRIO
// =============================

function atualizarHorario() {
  const agora = new Date();

  ultimaAtualizacao.textContent = agora.toLocaleString("pt-BR");
}

// =============================
// BOTÃO ATUALIZAR
// =============================

botaoAtualizar.addEventListener("click", function () {
  carregarDashboard();
});

// =============================
// INICIAR DASHBOARD
// =============================

carregarDashboard();
