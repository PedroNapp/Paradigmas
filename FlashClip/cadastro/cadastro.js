const SUPABASE_URL = "https://mkylyczeakkgksrzffca.supabase.co";
const SUPABASE_KEY = "sb_publishable_LD9drZgiFn7iQ5FK-PhHOA_Uuv7YeqP";

const clienteSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const formulario = document.getElementById("formCadastro");

formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value;
    const telefone = document.getElementById("telefone").value;
    const origem = document.getElementById("origem").value;
    const idade = document.getElementById("idade").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    // Cria a conta no Supabase Auth
    const { data, error } = await clienteSupabase.auth.signUp({
        email: email,
        password: senha
    });

    if (error) {
        console.error("Erro ao criar conta:", error);
        alert("Erro ao criar conta.");
        return;
    }

    console.log("Usuário:", data.user);
    console.log("Sessão:", data.session);

    const usuarioId = data.user.id;

    // Salva os dados na tabela usuarios
    const { error: erroUsuario } = await clienteSupabase
        .from("usuarios")
        .insert({
            id: data.user.id,
            nome: nome,
            telefone: telefone,
            email: email,
            origem: origem,
            idade: idade,
            permissao: false
    });

    if (erroUsuario) {
        console.error("Erro ao salvar usuário:", erroUsuario);
        alert("Conta criada, mas houve erro ao salvar seus dados.");
        return;
    }

    // Verifica se precisa confirmar o e-mail
    if (!data.session) {
        alert(
            "Conta criada! Verifique seu e-mail para confirmar a conta antes de continuar."
        );

        formulario.reset();
        return;
    }

    alert("Cadastro realizado com sucesso!");
    formulario.reset();

    window.location.href = "../index.html";
});