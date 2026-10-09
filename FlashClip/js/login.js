
import { clienteSupabase } from "./supabase.js";

// =========================
// ELEMENTOS
// =========================

const formulario = document.getElementById("formLogin");

const botaoLogin =
  formulario?.querySelector("button[type='submit']");

const mensagemLogin =
  document.getElementById("mensagemLogin");

// =========================
// CONTROLE DE TENTATIVAS
// =========================

const LIMITE_TENTATIVAS = 5;
const TEMPO_BLOQUEIO = 30_000;
const TEMPO_LIMITE_SUPABASE = 60_000;

let tentativasFalhas = 0;
let bloqueadoAte = 0;
let intervaloBloqueio = null;
let loginConcluido = false;

// =========================
// MENSAGENS NA TELA
// =========================

function mostrarMensagem(texto, tipo = "erro") {
  if (!mensagemLogin) return;

  mensagemLogin.textContent = texto;
  mensagemLogin.dataset.tipo = tipo;
  mensagemLogin.hidden = false;
}

function limparMensagem() {
  if (!mensagemLogin) return;

  mensagemLogin.textContent = "";
  mensagemLogin.hidden = true;
  delete mensagemLogin.dataset.tipo;
}

// =========================
// BLOQUEIO TEMPORÁRIO
// =========================

function atualizarBloqueio() {
  const restante = bloqueadoAte - Date.now();

  if (restante <= 0) {
    bloqueadoAte = 0;

    if (intervaloBloqueio !== null) {
      clearInterval(intervaloBloqueio);
      intervaloBloqueio = null;
    }

    if (botaoLogin && !loginConcluido) {
      botaoLogin.disabled = false;
    }

    mostrarMensagem(
      "O tempo de espera terminou. Você já pode tentar novamente.",
      "sucesso"
    );

    return;
  }

  const segundos = Math.ceil(restante / 1000);

  if (botaoLogin) {
    botaoLogin.disabled = true;
  }

  mostrarMensagem(
    `Muitas tentativas de login. Aguarde ${segundos} segundos para tentar novamente.`,
    "aviso"
  );
}

function iniciarBloqueio(duracao) {
  bloqueadoAte = Date.now() + duracao;

  if (intervaloBloqueio !== null) {
    clearInterval(intervaloBloqueio);
  }

  if (botaoLogin) {
    botaoLogin.disabled = true;
  }

  atualizarBloqueio();

  intervaloBloqueio = window.setInterval(
    atualizarBloqueio,
    1000
  );
}

// =========================
// TRANSIÇÃO PARA A HOME
// =========================

function transicionarParaInicio() {
  const transicao = document.createElement("div");

  transicao.className = "transicao-cadastro";

  transicao.setAttribute("role", "status");
  transicao.setAttribute("aria-live", "polite");

  transicao.innerHTML = `
    <div class="transicao-cadastro-conteudo">
      <span class="transicao-cadastro-icone" aria-hidden="true">
        ✦
      </span>

      <h2>Login realizado!</h2>

      <p>
        Bem-vindo de volta ao FlashClip.<br>
        Preparando sua entrada no evento...
      </p>

      <div class="transicao-cadastro-carregamento"></div>
    </div>
  `;

  document.body.appendChild(transicao);

  requestAnimationFrame(function () {
    transicao.classList.add("ativa");
  });

  window.setTimeout(function () {
    window.location.href = "../index.html";
  }, 3000);
}

// =========================
// REALIZAR LOGIN
// =========================

if (formulario) {
  formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Impede novas tentativas durante o bloqueio.
    if (bloqueadoAte > Date.now()) {
      atualizarBloqueio();
      return;
    }

    const email =
      document.getElementById("email").value.trim();

    const senha =
      document.getElementById("senha").value;

    limparMensagem();

    // =========================
    // VALIDAÇÃO
    // =========================

    if (!email || !senha) {
      mostrarMensagem(
        "Preencha o e-mail e a senha para continuar."
      );
      return;
    }

    if (botaoLogin) {
      botaoLogin.disabled = true;
    }

    try {
      // =========================
      // AUTENTICAÇÃO SUPABASE
      // =========================

      const { data, error } =
        await clienteSupabase.auth.signInWithPassword({
          email,
          password: senha
        });

      if (error) {
        console.error("Erro ao fazer login:", error);

        const detalhesErro =
          `${error.code ?? ""} ${error.message ?? ""}`;

        const atingiuLimite =
          error.status === 429 ||
          /rate.?limit|too many requests|over_request_rate_limit/i
            .test(detalhesErro);

        // =========================
        // LIMITE DO SUPABASE
        // =========================

        if (atingiuLimite) {
          tentativasFalhas = 0;

          iniciarBloqueio(TEMPO_LIMITE_SUPABASE);
          return;
        }

        // =========================
        // E-MAIL NÃO CONFIRMADO
        // =========================

        if (error.code === "email_not_confirmed") {
          mostrarMensagem(
            "Seu e-mail ainda não foi confirmado. Confira sua caixa de entrada.",
            "aviso"
          );

          return;
        }

        // =========================
        // CREDENCIAIS INCORRETAS
        // =========================

        if (error.status === 400) {
          tentativasFalhas++;

          if (tentativasFalhas >= LIMITE_TENTATIVAS) {
            tentativasFalhas = 0;

            iniciarBloqueio(TEMPO_BLOQUEIO);
            return;
          }

          mostrarMensagem(
            `E-mail ou senha incorretos. Confira os dados e tente novamente. Tentativa ${tentativasFalhas} de ${LIMITE_TENTATIVAS}.`
          );

          return;
        }

        // =========================
        // OUTROS ERROS
        // =========================

        mostrarMensagem(
          "Não foi possível realizar o login agora. Tente novamente mais tarde."
        );

        return;
      }

      // =========================
      // LOGIN REALIZADO
      // =========================

      tentativasFalhas = 0;
      loginConcluido = true;

      limparMensagem();

      console.log("Login realizado:", data.user);

      transicionarParaInicio();

    } catch (erro) {
      console.error("Erro inesperado:", erro);

      mostrarMensagem(
        "Não foi possível conectar ao serviço de login. Verifique sua conexão e tente novamente."
      );

    } finally {
      if (botaoLogin) {
        botaoLogin.disabled =
          loginConcluido || bloqueadoAte > Date.now();
      }
    }
  });
}