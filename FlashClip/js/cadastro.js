import { clienteSupabase } from "./supabase.js";

// =========================
// FORMULÁRIO
// =========================

const formulario = document.getElementById("formCadastro");

const botaoCadastro = formulario?.querySelector("button[type='submit']");

if (formulario) {
  formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    // =========================
    // DADOS DO FORMULÁRIO
    // =========================

    const nome = document.getElementById("nome").value.trim();

    const telefone = document.getElementById("telefone").value.trim();

    const origem = document.getElementById("origem").value;

    const idade = document.getElementById("idade").value;

    const email = document.getElementById("email").value.trim();

    const senha = document.getElementById("senha").value;

    // =========================
    // EVITA DUPLO ENVIO
    // =========================

    if (botaoCadastro) {
      botaoCadastro.disabled = true;
    }

    try {
      // =========================
      // CRIAR CONTA
      // =========================

      const { data, error } = await clienteSupabase.auth.signUp({
        email,
        password: senha,
      });

      if (error) {
        console.error("Erro ao criar conta:", error);

        alert("Não foi possível criar a conta.");

        return;
      }

      // =========================
      // VERIFICAR USUÁRIO
      // =========================

      if (!data.user) {
        console.error("Usuário não retornado pelo Supabase.");

        alert("Não foi possível finalizar o cadastro.");

        return;
      }

      // =========================
      // SALVAR USUÁRIO
      // =========================

      const { error: erroUsuario } = await clienteSupabase
        .from("usuarios")
        .insert({
          nome,

          telefone,

          email,

          origem,

          idade: Number(idade),
        });

      if (erroUsuario) {
        console.error("Erro ao salvar usuário:", erroUsuario);

        alert("Conta criada, mas não foi possível salvar seus dados.");

        return;
      }

      // =========================
      // CONFIRMAÇÃO DE E-MAIL
      // =========================

      if (!data.session) {
        alert(
          "Conta criada! Verifique seu e-mail para confirmar a conta antes de continuar.",
        );

        formulario.reset();

        return;
      }

      // =========================
      // CADASTRO CONCLUÍDO
      // =========================

      alert("Cadastro realizado com sucesso!");

      formulario.reset();

      window.location.href = "../index.html";
    } catch (erro) {
      console.error("Erro inesperado:", erro);

      alert("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      if (botaoCadastro) {
        botaoCadastro.disabled = false;
      }
    }
  });
}
