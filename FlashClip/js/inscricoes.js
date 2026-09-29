const SUPABASE_URL =
  "https://mkylyczeakkgksrzffca.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_LD9drZgiFn7iQ5FK-PhHOA_Uuv7YeqP";

const clienteSupabase =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

const listaInscricoes =
  document.getElementById("listaInscricoes");

// ===============================
// CARREGAR INSCRIÇÕES
// ===============================

async function carregarInscricoes() {

  // ===============================
  // VERIFICAR LOGIN
  // ===============================

  const {
    data: { session },
  } = await clienteSupabase.auth.getSession();

  if (!session) {

    window.location.href =
      "../html/login.html";

    return;
  }

  // ===============================
  // BUSCAR USUÁRIO
  // ===============================

  const emailUsuario =
    session.user.email;

  const {
    data: usuario,
    error: erroUsuario
  } = await clienteSupabase
    .from("usuarios")
    .select("idUsuario")
    .eq("email", emailUsuario)
    .single();

  if (erroUsuario) {

    console.error(
      "Erro ao buscar usuário:",
      erroUsuario
    );

    listaInscricoes.innerHTML =
      "<p>Erro ao identificar usuário.</p>";

    return;
  }

  // ===============================
  // BUSCAR INSCRIÇÕES
  // ===============================

  const {
    data: matriculas,
    error
  } = await clienteSupabase
    .from("matriculas")
    .select(`
      idMatricula,
      dataInscricao,
      idCurso,
      cursos (
        nome,
        descricao,
        periodo,
        sala,
        status
      )
    `)
    .eq(
      "idUsuario",
      usuario.idUsuario
    );

  if (error) {

    console.error(
      "Erro ao buscar inscrições:",
      error
    );

    listaInscricoes.innerHTML =
      "<p>Erro ao carregar suas inscrições.</p>";

    return;
  }

  // ===============================
  // NENHUMA INSCRIÇÃO
  // ===============================

  if (!matriculas || matriculas.length === 0) {

    listaInscricoes.innerHTML = `
      <p>
        Você ainda não possui nenhuma inscrição.
      </p>
    `;

    return;
  }

  // ===============================
  // LIMPAR
  // ===============================

  listaInscricoes.innerHTML = "";

  // ===============================
  // CRIAR CARDS
  // ===============================

  matriculas.forEach(function (matricula) {

    const curso =
      matricula.cursos;

    if (!curso) {
      return;
    }

    const card =
      document.createElement("div");

    card.classList.add(
      "card-inscricao"
    );

    card.innerHTML = `
      <h2>
        ${curso.nome}
      </h2>

      <p>
        ${curso.descricao}
      </p>

      <div class="info-inscricao">

        <span>
          🕐 Período: ${curso.periodo}
        </span>

        <span>
          📍 Sala: ${curso.sala}
        </span>

        <span>
          📝 Inscrição:
          ${new Date(
            matricula.dataInscricao
          ).toLocaleDateString("pt-BR")}
        </span>

      </div>

      <span class="status-inscricao">
        ${curso.status}
      </span>
    `;

    listaInscricoes.appendChild(card);

  });
}

// ===============================
// INICIAR
// ===============================

carregarInscricoes();