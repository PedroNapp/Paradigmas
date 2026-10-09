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
const containerForcaSenha = document.getElementById("containerForcaSenha");
const medidorSenha = document.getElementById("medidorSenha");
const barraSenha = document.getElementById("barraSenha");
const textoForcaSenha = document.getElementById("textoForcaSenha");
const contadorSenha = document.getElementById("contadorSenha");
const alternarVisibilidadeSenha = document.getElementById(
  "alternarVisibilidadeSenha",
);
const senhaDica = document.querySelector(".senha-dica");

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

  // Procura o campo completo para manter a mensagem
  // fora do contêiner interno do input da senha.
  const containerCampo = campo.closest(".campo") || campo.parentElement;

  let mensagemErro = containerCampo.querySelector(".mensagem-erro");

  if (!mensagemErro) {
    mensagemErro = document.createElement("small");
    mensagemErro.classList.add("mensagem-erro");

    containerCampo.appendChild(mensagemErro);
  }

  mensagemErro.textContent = mensagem;
}

// =========================
// LIMPAR ERRO
// =========================

function limparErro(campo) {
  campo.setCustomValidity("");

  campo.classList.remove("campo-invalido");

  const containerCampo = campo.closest(".campo") || campo.parentElement;

  const mensagemErro = containerCampo.querySelector(".mensagem-erro");

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
  // Limpa a validade personalizada antes da verificação
  email.setCustomValidity("");

  const valor = email.value.trim();

  if (valor === "") {
    mostrarErro(email, "Digite seu e-mail.");
    return false;
  }

  if (email.validity.typeMismatch) {
    mostrarErro(email, "Digite um e-mail válido.");
    return false;
  }

  limparErro(email);
  return true;
}

// =========================
// AVALIAR FORÇA E CONTAGEM DA SENHA
// =========================

function avaliarForcaSenha(valor) {
  // Conta caracteres Unicode de forma consistente
  const caracteres = Array.from(valor);
  const quantidadeCaracteres = caracteres.length;

  // Quantidade exata de cada tipo de caractere
  const maiusculas = caracteres.filter((caractere) =>
    /\p{Lu}/u.test(caractere),
  ).length;

  const minusculas = caracteres.filter((caractere) =>
    /\p{Ll}/u.test(caractere),
  ).length;

  const numeros = caracteres.filter((caractere) =>
    /\d/u.test(caractere),
  ).length;

  // Espaços e pontuação sozinhos não contam como símbolo
  const simbolos = caracteres.filter((caractere) =>
    /[^\p{L}\p{N}\s]/u.test(caractere),
  ).length;

  const temMaiuscula = maiusculas > 0;
  const temMinuscula = minusculas > 0;
  const temNumero = numeros > 0;
  const temSimbolo = simbolos > 0;

  const categorias = [temMinuscula, temMaiuscula, temNumero, temSimbolo].filter(
    Boolean,
  ).length;

  // Critérios usados na barra de força
  const criterios = [
    quantidadeCaracteres >= 8,
    quantidadeCaracteres >= 12,
    temMinuscula,
    temMaiuscula,
    temNumero,
    temSimbolo,
  ];

  const pontuacao = criterios.filter(Boolean).length;

  let nivel = "vazia";
  let texto = "Digite uma senha";

  if (quantidadeCaracteres > 0) {
    if (pontuacao <= 2) {
      nivel = "muito-fraca";
      texto = "Muito fraca";
    } else if (pontuacao === 3) {
      nivel = "fraca";
      texto = "Fraca";
    } else if (pontuacao === 4) {
      nivel = "razoavel";
      texto = "Razoável";
    } else if (pontuacao === 5) {
      nivel = "boa";
      texto = "Boa";
    } else {
      nivel = "forte";
      texto = "Forte";
    }
  }

  /*
    Regras de aceitação:
    - 8 ou mais caracteres e pelo menos 3 categorias;
    - OU 12 caracteres ou mais e pelo menos 2 categorias.
  */

  const suficiente =
    (quantidadeCaracteres >= 8 && categorias >= 3) ||
    (quantidadeCaracteres >= 12 && categorias >= 2);

  return {
    quantidadeCaracteres,
    maiusculas,
    minusculas,
    numeros,
    simbolos,
    categorias,
    pontuacao,
    nivel,
    texto,
    suficiente,
  };
}

// =========================
// EXPLICAR O QUE FALTA NA SENHA
// =========================

function obterPendenciasSenha(valor) {
  if (!valor) {
    return ["Digite uma senha."];
  }

  const avaliacao = avaliarForcaSenha(valor);
  const pendencias = [];

  // Verifica o comprimento mínimo
  if (avaliacao.quantidadeCaracteres < 8) {
    const faltam = 8 - avaliacao.quantidadeCaracteres;

    pendencias.push(
      `Adicione mais ${faltam} ${
        faltam === 1 ? "caractere" : "caracteres"
      } à senha.`,
    );
  }

  // Verifica quantos tipos de caracteres ainda são necessários
  const minimoCategorias = avaliacao.quantidadeCaracteres >= 12 ? 2 : 3;

  const faltamCategorias = minimoCategorias - avaliacao.categorias;

  if (faltamCategorias > 0) {
    const tiposAusentes = [];

    if (avaliacao.maiusculas === 0) {
      tiposAusentes.push("uma letra maiúscula");
    }

    if (avaliacao.minusculas === 0) {
      tiposAusentes.push("uma letra minúscula");
    }

    if (avaliacao.numeros === 0) {
      tiposAusentes.push("um número");
    }

    if (avaliacao.simbolos === 0) {
      tiposAusentes.push("um símbolo especial, como !");
    }

    if (faltamCategorias === 1) {
      pendencias.push(
        `Para fortalecer a senha, inclua mais um destes tipos: ${tiposAusentes.join(", ")}.`,
      );
    } else {
      pendencias.push(
        `Para fortalecer a senha, inclua mais ${faltamCategorias} tipos de caracteres, escolhendo entre: ${tiposAusentes.join(", ")}.`,
      );
    }
  }

  return pendencias;
}

// =========================
// ATUALIZAR BARRA E CONTAGEM DA SENHA
// =========================

function atualizarForcaSenha() {
  if (
    !senha ||
    !containerForcaSenha ||
    !medidorSenha ||
    !barraSenha ||
    !textoForcaSenha ||
    !contadorSenha
  ) {
    return;
  }

  const valor = senha.value;
  const avaliacao = avaliarForcaSenha(valor);

  const porcentagem = (avaliacao.pontuacao / 6) * 100;

  // =========================
  // DICA SIMPLES DA SENHA
  // =========================

  if (senhaDica) {
    if (!valor) {
      senhaDica.textContent =
        "Use pelo menos 8 caracteres e combine diferentes tipos de caracteres.";
    } else if (avaliacao.suficiente) {
      senhaDica.textContent = "Senha válida! Você já pode continuar.";
    } else {
      senhaDica.textContent = obterPendenciasSenha(valor).join(" ");
    }
  }

  // Atualiza o nível de força e a barra
  containerForcaSenha.dataset.nivel = avaliacao.nivel;

  barraSenha.style.width = `${porcentagem}%`;

  textoForcaSenha.textContent = avaliacao.texto;

  contadorSenha.textContent = `${avaliacao.quantidadeCaracteres} ${
    avaliacao.quantidadeCaracteres === 1 ? "caractere" : "caracteres"
  }`;

  // Acessibilidade do indicador de força
  medidorSenha.setAttribute("aria-valuenow", avaliacao.pontuacao);

  medidorSenha.setAttribute(
    "aria-valuetext",
    `${avaliacao.texto}. ${avaliacao.quantidadeCaracteres} caracteres.`,
  );
}

// =========================
// VALIDAR SENHA
// =========================

function validarSenha() {
  const valor = senha.value;

  if (valor === "") {
    mostrarErro(senha, "Digite uma senha.");
    return false;
  }

  const pendencias = obterPendenciasSenha(valor);

  if (pendencias.length > 0) {
    mostrarErro(senha, `Senha ainda não é válida. ${pendencias.join(" ")}`);

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

// =========================
// FEEDBACK DA SENHA
// =========================

if (senha) {
  // Mostra as contagens desde o início
  atualizarForcaSenha();

  senha.addEventListener("input", function () {
    atualizarForcaSenha();

    if (senha.classList.contains("campo-invalido")) {
      validarSenha();
    }
  });
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

      <h2>Cadastro concluído!</h2>

      <p>
        Bem-vindo ao FlashClip.<br>
        Preparando sua entrada no evento...
      </p>

      <div class="transicao-cadastro-carregamento"></div>
    </div>
  `;

  document.body.appendChild(transicao);

  // Permite que o navegador aplique o estado inicial
  requestAnimationFrame(function () {
    transicao.classList.add("ativa");
  });

  // Vai para a Home após a animação
  window.setTimeout(function () {
    window.location.href = "../index.html";
  }, 3000);
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
      // CRIAR CONTA NO SUPABASE
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

      transicionarParaInicio();

      atualizarForcaSenha();

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

// =========================
// MOSTRAR / OCULTAR SENHA
// =========================

if (senha && alternarVisibilidadeSenha) {
  alternarVisibilidadeSenha.addEventListener("click", function () {
    const mostrar = senha.type === "password";

    senha.type = mostrar ? "text" : "password";

    alternarVisibilidadeSenha.innerHTML = mostrar
      ? `
        <svg class="icone-senha"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true">
          <path d="M3 3l18 18"/>
          <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83"/>
          <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4.89c6.5 0 9.94 7.11 9.94 7.11a16.7 16.7 0 0 1-3.03 3.85"/>
          <path d="M6.61 6.61C3.72 8.55 2.06 12 2.06 12s3.44 7.11 9.94 7.11a10.9 10.9 0 0 0 4.12-.8"/>
        </svg>
      `
      : `
        <svg class="icone-senha"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true">
          <path d="M2.06 12s3.44-7 9.94-7 9.94 7 9.94 7-3.44 7-9.94 7-9.94-7-9.94-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `;

    alternarVisibilidadeSenha.setAttribute(
      "aria-label",
      mostrar ? "Ocultar senha" : "Mostrar senha",
    );

    alternarVisibilidadeSenha.setAttribute("aria-pressed", String(mostrar));
  });
}
