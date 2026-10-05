import { clienteSupabase } from "./supabase.js";

// =========================
// FORMULÁRIO
// =========================

const formulario = document.getElementById("formCadastro");

const botaoCadastro = formulario?.querySelector("button[type='submit']");

// =========================
// CAMPOS
// =========================

const nome = document.getElementById("nome");

const telefone = document.getElementById("telefone");

const idade = document.getElementById("idade");

const origem = document.getElementById("origem");

const email = document.getElementById("email");

const senha = document.getElementById("senha");

// =========================
// FORMATAR NOME
// =========================

function formatarNome(valor) {
  return valor
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map(function (palavra) {
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(" ");
}

// =========================
// FORMATAR TELEFONE
// =========================

function formatarTelefone(valor) {
  const numeros = valor.replace(/\D/g, "");

  if (numeros.length < 10 || numeros.length > 11) {
    return null;
  }

  const ddd = numeros.substring(0, 2);

  const numero = numeros.substring(2);

  return `(${ddd}) ${numero}`;
}

// =========================
// MÁSCARA DO TELEFONE
// =========================

if (telefone) {
  telefone.addEventListener("input", function () {
    let numeros = telefone.value.replace(/\D/g, "");

    // Máximo de 11 números
    numeros = numeros.substring(0, 11);

    // Espaço depois do DDD
    if (numeros.length > 2) {
      numeros = numeros.substring(0, 2) + " " + numeros.substring(2);
    }

    telefone.value = numeros;

    // Atualiza o erro enquanto digita
    if (telefone.classList.contains("campo-invalido")) {
      validarTelefone();
    }
  });
}

// =========================
// MOSTRAR ERRO
// =========================

function mostrarErro(campo, mensagem) {
  campo.setCustomValidity(mensagem);

  campo.classList.add("campo-invalido");

  let mensagemErro = campo.parentElement.querySelector(".mensagem-erro");

  if (!mensagemErro) {
    mensagemErro = document.createElement("small");

    mensagemErro.classList.add("mensagem-erro");

    campo.parentElement.appendChild(mensagemErro);
  }

  mensagemErro.textContent = mensagem;
}

// =========================
// LIMPAR ERRO
// =========================

function limparErro(campo) {
  campo.setCustomValidity("");

  campo.classList.remove("campo-invalido");

  const mensagemErro = campo.parentElement.querySelector(".mensagem-erro");

  if (mensagemErro) {
    mensagemErro.remove();
  }
}

// =========================
// VALIDAR NOME
// =========================

function validarNome() {
  const valor = nome.value.trim();

  // Campo vazio
  if (valor === "") {
    mostrarErro(nome, "Digite seu nome completo.");

    return false;
  }

  const partesNome = valor.split(/\s+/);

  // Nome e sobrenome
  if (partesNome.length < 2) {
    mostrarErro(nome, "Digite seu nome e sobrenome.");

    return false;
  }

  // Somente letras
  const nomeValido = partesNome.every(function (palavra) {
    return /^[A-Za-zÀ-ÿ]{2,}$/.test(palavra);
  });

  if (!nomeValido) {
    mostrarErro(nome, "Digite um nome válido.");

    return false;
  }

  limparErro(nome);

  return true;
}

// =========================
// VALIDAR TELEFONE
// =========================

function validarTelefone() {
  const numeros = telefone.value.replace(/\D/g, "");

  if (numeros.length < 10 || numeros.length > 11) {
    mostrarErro(telefone, "Digite um telefone válido com DDD.");

    return false;
  }

  limparErro(telefone);

  return true;
}

// =========================
// VALIDAR IDADE
// =========================

function validarIdade() {
  const valor = idade.value;

  const numero = Number(valor);

  if (valor === "" || !Number.isInteger(numero) || numero < 1 || numero > 100) {
    mostrarErro(idade, "A idade deve estar entre 1 e 100 anos.");

    return false;
  }

  limparErro(idade);

  return true;
}

// =========================
// VALIDAR ORIGEM
// =========================

function validarOrigem() {
  if (!origem.value) {
    mostrarErro(origem, "Selecione sua origem.");

    return false;
  }

  limparErro(origem);

  return true;
}

// =========================
// VALIDAR E-MAIL
// =========================

function validarEmail() {
  // Limpa a validade personalizada antes de verificar
  // a validade real do campo
  email.setCustomValidity("");

  const valor = email.value.trim();

  // Campo vazio
  if (valor === "") {
    mostrarErro(email, "Digite seu e-mail.");

    return false;
  }

  // Formato inválido
  if (email.validity.typeMismatch) {
    mostrarErro(email, "Digite um e-mail válido.");

    return false;
  }

  limparErro(email);

  return true;
}

// =========================
// VALIDAR SENHA
// =========================

function validarSenha() {
  if (senha.value === "") {
    mostrarErro(senha, "Digite uma senha.");

    return false;
  }

  if (senha.value.length < 6) {
    mostrarErro(senha, "A senha deve ter pelo menos 6 caracteres.");

    return false;
  }

  limparErro(senha);

  return true;
}

// =========================
// VALIDAR FORMULÁRIO
// =========================

function validarFormulario() {
  if (!validarNome()) {
    return false;
  }

  if (!validarTelefone()) {
    return false;
  }

  if (!validarIdade()) {
    return false;
  }

  if (!validarOrigem()) {
    return false;
  }

  if (!validarEmail()) {
    return false;
  }

  if (!validarSenha()) {
    return false;
  }

  return true;
}

// =========================
// FEEDBACK ENQUANTO DIGITA
// =========================

if (nome) {
  nome.addEventListener("input", function () {
    if (nome.classList.contains("campo-invalido")) {
      validarNome();
    }
  });
}

if (idade) {
  idade.addEventListener("input", function () {
    if (idade.classList.contains("campo-invalido")) {
      validarIdade();
    }
  });
}

if (origem) {
  origem.addEventListener("change", function () {
    if (origem.classList.contains("campo-invalido")) {
      validarOrigem();
    }
  });
}

if (email) {
  email.addEventListener("input", function () {
    if (email.classList.contains("campo-invalido")) {
      validarEmail();
    }
  });
}

if (senha) {
  senha.addEventListener("input", function () {
    if (senha.classList.contains("campo-invalido")) {
      validarSenha();
    }
  });
}

// =========================
// ENVIO DO FORMULÁRIO
// =========================

if (formulario) {
  formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    // =========================
    // VALIDAR TUDO
    // =========================

    if (!validarFormulario()) {
      return;
    }

    // =========================
    // PEGAR DADOS
    // =========================

    const nomeDigitado = nome.value;

    const telefoneDigitado = telefone.value;

    const origemDigitada = origem.value.trim().toLowerCase();

    const idadeDigitada = Number(idade.value);

    const emailDigitado = email.value.trim().toLowerCase();

    const senhaDigitada = senha.value;

    // =========================
    // FORMATAR DADOS
    // =========================

    const nomeFormatado = formatarNome(nomeDigitado);

    const telefoneFormatado = formatarTelefone(telefoneDigitado);

    // =========================
    // EVITAR DUPLO ENVIO
    // =========================

    if (botaoCadastro) {
      botaoCadastro.disabled = true;

      botaoCadastro.textContent = "Criando conta...";
    }

    try {
      // =========================
      // CRIAR CONTA
      // =========================

      const { data, error } = await clienteSupabase.auth.signUp({
        email: emailDigitado,

        password: senhaDigitada,
      });

      // =========================
      // ERRO NO AUTH
      // =========================

      if (error) {
        console.error("Erro ao criar conta:", error);

        const mensagem = error.message.toLowerCase();

        // E-mail já cadastrado
        if (
          mensagem.includes("already registered") ||
          mensagem.includes("already been registered")
        ) {
          mostrarErro(email, "Este e-mail já está cadastrado.");
        } else {
          mostrarErro(email, error.message);
        }

        return;
      }

      // =========================
      // VERIFICAR USUÁRIO
      // =========================

      if (!data.user) {
        console.error("Usuário não retornado pelo Supabase.");

        mostrarErro(email, "Não foi possível criar a conta.");

        return;
      }

      // =========================
      // SALVAR USUÁRIO
      // =========================

      const { error: erroUsuario } = await clienteSupabase
        .from("usuarios")
        .insert({
          nome: nomeFormatado,

          telefone: telefoneFormatado,

          origem: origemDigitada,

          idade: idadeDigitada,

          email: emailDigitado,
        });

      // =========================
      // ERRO AO SALVAR
      // =========================

      if (erroUsuario) {
        console.error("Erro ao salvar usuário:", erroUsuario);

        mostrarErro(
          email,
          "A conta foi criada, mas não foi possível salvar seus dados.",
        );

        return;
      }

      // =========================
      // CADASTRO CONCLUÍDO
      // =========================

      formulario.reset();

      window.location.href = "../index.html";
    } catch (erro) {
      console.error("Erro inesperado:", erro);

      mostrarErro(email, "Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      if (botaoCadastro) {
        botaoCadastro.disabled = false;

        botaoCadastro.textContent = "Criar conta";
      }
    }
  });
}
