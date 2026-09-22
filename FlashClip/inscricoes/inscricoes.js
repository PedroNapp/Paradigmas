const SUPABASE_URL = "https://mkylyczeakkgksrzffca.supabase.co";
const SUPABASE_KEY = "sb_publishable_LD9drZgiFn7iQ5FK-PhHOA_Uuv7YeqP";

const clienteSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const listaInscricoes =
    document.getElementById("listaInscricoes");


// ===============================
// CARREGAR INSCRIÇÕES
// ===============================

async function carregarInscricoes() {

    // Verifica se o usuário está logado
    const {
        data: { session }
    } = await clienteSupabase.auth.getSession();


    if (!session) {

        window.location.href = "../login/login.html";

        return;
    }


    const usuarioId = session.user.id;


    // Busca as inscrições do usuário
    const { data: matriculas, error } =
        await clienteSupabase
            .from("matriculas")
            .select(`
                id,
                idCurso,
                dataIncricao,
                cursos (
                    nome,
                    descricao,
                    data,
                    periodo,
                    status
                )
            `)
            .eq("idUsuario", usuarioId);


    if (error) {

        console.error(
            "Erro ao buscar inscrições:",
            error
        );

        listaInscricoes.innerHTML =
            "<p>Erro ao carregar suas inscrições.</p>";

        return;
    }


    // Nenhuma inscrição
    if (matriculas.length === 0) {

        listaInscricoes.innerHTML = `
            <p>Você ainda não possui nenhuma inscrição.</p>
        `;

        return;
    }


    // Limpa a mensagem de carregamento
    listaInscricoes.innerHTML = "";


    // Cria os cards
    matriculas.forEach(function (matricula) {

        const curso = matricula.cursos;


        const card = document.createElement("div");

        card.classList.add("card-inscricao");


        card.innerHTML = `
            <h2>${curso.nome}</h2>

            <p>
                ${curso.descricao}
            </p>

            <div class="info-inscricao">

                <span>
                    📅 Data: ${curso.data}
                </span>

                <span>
                    🕐 Período: ${curso.periodo}
                </span>

                <span>
                    📝 Inscrição: ${new Date(
                        matricula.dataIncricao
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


carregarInscricoes();