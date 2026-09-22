const SUPABASE_URL = "https://mkylyczeakkgksrzffca.supabase.co";
const SUPABASE_KEY = "sb_publishable_LD9drZgiFn7iQ5FK-PhHOA_Uuv7YeqP";

const clienteSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const formulario = document.getElementById("formLogin");

formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    const { data, error } =
        await clienteSupabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

    if (error) {
        console.error("Erro ao fazer login:", error);
        alert("E-mail ou senha incorretos.");
        return;
    }

    console.log("Login realizado:", data.user);
    console.log("Sessão criada:", data.session);

    window.location.href = "../index.html";
});