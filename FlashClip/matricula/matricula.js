const SUPABASE_URL = "https://mkylyczeakkgksrzffca.supabase.co";
const SUPABASE_KEY = "sb_publishable_LD9drZgiFn7iQ5FK-PhHOA_Uuv7YeqP";

const clienteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const cursoContainer = document.getElementById("curso");
const botaoConfirmar = document.getElementById("botaoConfirmar");

// Pega o ID do curso pela URL
const parametros = new URLSearchParams(window.location.search);
const cursoId = parametros.get("id");

let cursoAtual = null;


// ===============================
// CARREGAR CURSO
// ===============================

async function carregarCurso() {

  if (!cursoId) {
    cursoContainer.innerHTML = "<p>Curso não encontrado.</p>";
    botaoConfirmar.disabled = true;
    return;
  }

  const { data: curso, error } = await clienteSupabase
    .from("cursos")
    .select("*")
    .eq("id", cursoId)
    .single();

  if (error) {
    console.error("Erro ao buscar curso:", error);

    cursoContainer.innerHTML =
      "<p>Erro ao carregar o curso.</p>";

    botaoConfirmar.disabled = true;

    return;
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
}


// ===============================
// CONFIRMAR MATRÍCULA
// ===============================

botaoConfirmar.addEventListener("click", async function () {

  // Verifica se o usuário está logado
  const {
    data: { session }
  } = await clienteSupabase.auth.getSession();


  if (!session) {

    alert("Você precisa estar logado para realizar a matrícula.");

    window.location.href = "../login/login.html";

    return;
  }


  // ID do usuário logado
  const usuarioId = session.user.id;


  // Verifica se existem vagas
  if (cursoAtual.vagas <= 0) {

    alert("Este curso não possui mais vagas.");

    return;
  }


  // Busca as matrículas desse usuário
  const { data: matriculas, error: erroMatriculas } =
    await clienteSupabase
      .from("matriculas")
      .select(`
        id,
        idUsuario,
        idCurso,
        cursos (
          periodo
        )
      `)
      .eq("idUsuario", usuarioId);


  if (erroMatriculas) {

    console.error(
      "Erro ao verificar matrículas:",
      erroMatriculas
    );

    alert("Não foi possível verificar suas matrículas.");

    return;
  }


  // Verifica se já possui matrícula no mesmo período
  const jaMatriculado = matriculas.some(function (matricula) {

    return matricula.cursos &&
           matricula.cursos.periodo === cursoAtual.periodo;

  });


  if (jaMatriculado) {

    alert(
      "Você já possui uma matrícula no período " +
      cursoAtual.periodo + "."
    );

    return;
  }


  // ===============================
  // REALIZA A MATRÍCULA
  // ===============================

  const { error: erroInsercao } =
    await clienteSupabase
      .from("matriculas")
      .insert({
        idUsuario: usuarioId,
        idCurso: cursoId,
        dataIncricao: new Date().toISOString(),
        status: "Pendente"
      });


  if (erroInsercao) {

    console.error(
      "Erro ao realizar matrícula:",
      erroInsercao
    );

    alert("Não foi possível realizar a matrícula.");

    return;
  }


  // ===============================
  // DIMINUI UMA VAGA
  // ===============================

  const novasVagas = cursoAtual.vagas - 1;

  const { error: erroVaga } =
    await clienteSupabase
      .from("cursos")
      .update({
        vagas: novasVagas
      })
      .eq("id", cursoId);


  if (erroVaga) {

    console.error(
      "Erro ao atualizar vagas:",
      erroVaga
    );

    alert(
      "A matrícula foi realizada, mas não foi possível atualizar as vagas."
    );

    return;
  }


  // ===============================
  // MATRÍCULA CONCLUÍDA
  // ===============================

  alert("Matrícula realizada com sucesso!");

  window.location.href =
    "../inscricoes/inscricoes.html";
});


// Inicia carregamento
carregarCurso();