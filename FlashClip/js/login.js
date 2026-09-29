import { clienteSupabase } from "./supabase.js";

// =========================
// FORMULÁRIO
// =========================

const formulario = document.getElementById("formLogin");

const botaoLogin = formulario?.querySelector("button[type='submit']");

if (formulario) {
  formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    // =========================
    // DADOS
    // =========================

    const email = document.getElementById("email").value.trim();

    const senha = document.getElementById("senha").value;

    // =========================
    // EVITA DUPLO ENVIO
    // =========================

    if (botaoLogin) {
      botaoLogin.disabled = true;
    }

    try {
      // =========================
      // LOGIN
      // =========================

      const { data, error } = await clienteSupabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        console.error("Erro ao fazer login:", error);

        alert("E-mail ou senha incorretos.");

        return;
      }

      // =========================
      // LOGIN REALIZADO
      // =========================

      console.log("Login realizado:", data.user);

      window.location.href = "../index.html";
    } catch (erro) {
      console.error("Erro inesperado:", erro);

      alert("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      if (botaoLogin) {
        botaoLogin.disabled = false;
      }
    }
  });
}
