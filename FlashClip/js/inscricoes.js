import { clienteSupabase } from "./supabase.js";

const listaInscricoes = document.getElementById("listaInscricoes");

const IMAGEM_CURSO_PADRAO = "../imagens/curso-padrao.png";

// ===============================
// ESCAPAR HTML
// ===============================

function escaparHTML(valor) {
  const caracteres = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(valor ?? "").replace(/[&<>"']/g, function (caractere) {
    return caracteres[caractere];
  });
}

// ===============================
// MONTAR CAMINHO DA IMAGEM
// ===============================

function montarImagem(caminho) {
  if (!caminho || typeof caminho !== "string" || !caminho.trim()) {
    return IMAGEM_CURSO_PADRAO;
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

// ===============================
// FORMATAR DATA
// ===============================

function formatarData(data) {
  if (!data) {
    return "Não informada";
  }

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) {
    return "Não informada";
  }

  return dataConvertida.toLocaleDateString("pt-BR");
}

// ===============================
// MOSTRAR ESTADO DA PÁGINA
// ===============================

function mostrarEstado(titulo, descricao, tipo = "normal") {
  const icone = tipo === "erro" ? "!" : tipo === "vazio" ? "✦" : "i";

  listaInscricoes.innerHTML = `
    <div class="estado-inscricoes">
      <span class="icone-titulo" aria-hidden="true">
        ${icone}
      </span>

      <h2>${escaparHTML(titulo)}</h2>

      <p>${escaparHTML(descricao)}</p>

      <a href="../index.html#cursos">
        Ver cursos disponíveis
      </a>
    </div>
  `;
}

// ===============================
// BUSCAR INSCRIÇÕES
// ===============================

async function carregarInscricoes() {
  if (!listaInscricoes) {
    return;
  }

  try {
    // ===============================
    // VERIFICAR LOGIN
    // ===============================

    const { data: dadosSessao, error: erroSessao } =
      await clienteSupabase.auth.getSession();

    if (erroSessao) {
      throw erroSessao;
    }

    const session = dadosSessao.session;

    if (!session) {
      window.location.href = "../html/login.html";
      return;
    }

    // ===============================
    // BUSCAR USUÁRIO
    // ===============================

    const { data: usuario, error: erroUsuario } = await clienteSupabase
      .from("usuarios")
      .select("idUsuario")
      .eq("email", session.user.email)
      .maybeSingle();

    if (erroUsuario) {
      throw erroUsuario;
    }

    if (!usuario) {
      mostrarEstado(
        "Não foi possível identificar sua conta",
        "Seu perfil não foi localizado. Entre novamente ou contate o suporte.",
        "erro",
      );
      return;
    }

    // ===============================
    // BUSCAR MATRÍCULAS
    // ===============================

    const { data: matriculas, error } = await clienteSupabase
      .from("matriculas")
      .select(
        `
        idMatricula,
        dataInscricao,
        idCurso,
        cursos (
          nome,
          descricao,
          periodo,
          sala,
          status,
          imagem
        )
      `,
      )
      .eq("idUsuario", usuario.idUsuario)
      .order("dataInscricao", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    // ===============================
    // NENHUMA INSCRIÇÃO
    // ===============================

    if (!matriculas || matriculas.length === 0) {
      mostrarEstado(
        "Você ainda não tem inscrições",
        "Explore os cursos do evento e encontre uma nova oportunidade para aprender.",
        "vazio",
      );
      return;
    }

    // ===============================
    // MONTAR OS CARDS
    // ===============================

    listaInscricoes.innerHTML = "";

    matriculas.forEach(function (matricula) {
      // O relacionamento pode chegar como objeto ou array.
      const curso = Array.isArray(matricula.cursos)
        ? matricula.cursos[0]
        : matricula.cursos;

      if (!curso) {
        console.warn(
          "Curso não encontrado para a matrícula:",
          matricula.idMatricula,
        );
        return;
      }

      const nomeCurso = escaparHTML(curso.nome || "Curso sem nome");

      const descricao = escaparHTML(
        curso.descricao || "Sem descrição disponível.",
      );

      const periodo = escaparHTML(curso.periodo || "Não informado");

      const sala = escaparHTML(curso.sala ?? "A definir");

      const status = escaparHTML(curso.status || "Não informado");

      const dataInscricao = escaparHTML(formatarData(matricula.dataInscricao));

      const imagem = montarImagem(curso.imagem);

      const card = document.createElement("article");

      card.className = "card-inscricao";

      card.innerHTML = card.innerHTML = `
        <div class="info-curso-inscricao">

          <div class="curso-cabecalho-inscricao">

            <img
              src="${escaparHTML(imagem)}"
              alt="${nomeCurso}"
              class="imagem-curso-inscricao"
              loading="lazy"
            >

            <div class="curso-identificacao-inscricao">
              <h2>${nomeCurso}</h2>
              <p>${descricao}</p>
            </div>

            <span class="status-inscricao">
              ${status}
            </span>

          </div>

          <div class="detalhes-inscricao">

            <div class="detalhe-inscricao">
              <span class="icone-detalhe-inscricao" aria-hidden="true">◷</span>

              <div class="texto-detalhe-inscricao">
                <small>PERÍODO</small>
                <strong>${periodo}</strong>
              </div>
            </div>

            <div class="detalhe-inscricao">
              <span class="icone-detalhe-inscricao" aria-hidden="true">⌖</span>

              <div class="texto-detalhe-inscricao">
                <small>SALA</small>
                <strong>${sala}</strong>
              </div>
            </div>

            <div class="detalhe-inscricao">
              <span class="icone-detalhe-inscricao" aria-hidden="true">▦</span>

              <div class="texto-detalhe-inscricao">
                <small>INSCRIÇÃO</small>
                <strong>${dataInscricao}</strong>
              </div>
            </div>

          </div>

        </div>
      `;

      // Se a imagem do curso ou a imagem padrão falhar,
      // o cartão continua funcionando sem imagem.
      const imagemElemento = card.querySelector("img");

      imagemElemento.addEventListener("error", function () {
        if (!imagemElemento.dataset.tentouPadrao) {
          imagemElemento.dataset.tentouPadrao = "true";
          imagemElemento.src = IMAGEM_CURSO_PADRAO;
        } else {
          imagemElemento.style.display = "none";
          imagemElemento.parentElement.style.display = "none";
        }
      });

      listaInscricoes.appendChild(card);
    });

    // Todos os registros podem existir sem um curso relacionado.
    if (!listaInscricoes.children.length) {
      mostrarEstado(
        "Não foi possível mostrar suas inscrições",
        "Os cursos relacionados às matrículas não foram encontrados. Tente novamente mais tarde.",
        "erro",
      );
    }
  } catch (erro) {
    console.error("Erro ao carregar inscrições:", erro);

    mostrarEstado(
      "Não foi possível carregar suas inscrições",
      "Verifique sua conexão e tente novamente.",
      "erro",
    );
  }
}

// ===============================
// INICIAR
// ===============================

carregarInscricoes();
