import { clienteSupabase } from "./supabase.js";

// =====================================================
// CONFIGURAÇÃO DOS CACHES
// =====================================================

// Dados gerais: cache por 60 minutos
const TEMPO_CACHE_DADOS = 60 * 60 * 1000;

// Vagas: cache por 2 minutos
const TEMPO_CACHE_VAGAS = 2 * 60 * 1000;

// =====================================================
// CHAVES DO LOCALSTORAGE
// =====================================================

const CHAVE_DADOS = "flashclip_dados";
const CHAVE_DADOS_ATUALIZADO = "flashclip_dados_atualizado";

const CHAVE_VAGAS = "flashclip_vagas";
const CHAVE_VAGAS_ATUALIZADO = "flashclip_vagas_atualizado";

// =====================================================
// CARREGAR DADOS
// =====================================================

export async function carregarDados(forcarAtualizacao = false) {
  // ---------------------------------------------------
  // TENTA USAR O CACHE
  // ---------------------------------------------------

  if (!forcarAtualizacao) {
    const dadosSalvos = localStorage.getItem(CHAVE_DADOS);

    const ultimaAtualizacao = localStorage.getItem(CHAVE_DADOS_ATUALIZADO);

    if (dadosSalvos && ultimaAtualizacao) {
      const tempoPassado = Date.now() - Number(ultimaAtualizacao);

      if (tempoPassado < TEMPO_CACHE_DADOS) {
        try {
          return JSON.parse(dadosSalvos);
        } catch (erro) {
          console.warn("Cache de dados inválido. Buscando novamente.");

          localStorage.removeItem(CHAVE_DADOS);
          localStorage.removeItem(CHAVE_DADOS_ATUALIZADO);
        }
      }
    }
  }

  // ---------------------------------------------------
  // BUSCA TODOS OS DADOS NECESSÁRIOS
  // ---------------------------------------------------

  const { data: cursos, error } = await clienteSupabase
    .from("cursos")
    .select(
      `
        idCurso,
        nome,
        descricao,
        imagem,
        status,
        sala,
        vagas,
        periodo,

        ministrantes (
          idMinistrante,
          idUsuario,
          idCurso,
          referenciaFoto,

          usuarios (
            idUsuario,
            nome,
            email
          )
        )
      `,
    )
    .order("idCurso", {
      ascending: true,
    });

  // ---------------------------------------------------
  // TRATAMENTO DE ERRO
  // ---------------------------------------------------

  if (error) {
    console.error("Erro ao carregar dados:", error);

    // Usa cache antigo se existir
    const cacheAntigo = localStorage.getItem(CHAVE_DADOS);

    if (cacheAntigo) {
      try {
        return JSON.parse(cacheAntigo);
      } catch (erro) {
        return {
          cursos: [],
          instrutores: [],
        };
      }
    }

    return {
      cursos: [],
      instrutores: [],
    };
  }

  // ---------------------------------------------------
  // ORGANIZA OS DADOS
  // ---------------------------------------------------

  const instrutores = [];

  (cursos || []).forEach(function (curso) {
    const ministrantes = curso.ministrantes || [];

    ministrantes.forEach(function (ministrante) {
      instrutores.push({
        idMinistrante: ministrante.idMinistrante,
        idUsuario: ministrante.idUsuario,
        idCurso: ministrante.idCurso,
        referenciaFoto: ministrante.referenciaFoto,

        usuarios: ministrante.usuarios || null,

        cursos: {
          idCurso: curso.idCurso,
          nome: curso.nome,
        },
      });
    });
  });

  const dados = {
    cursos: cursos || [],
    instrutores: instrutores,
  };

  // ---------------------------------------------------
  // SALVA NO CACHE
  // ---------------------------------------------------

  localStorage.setItem(CHAVE_DADOS, JSON.stringify(dados));

  localStorage.setItem(CHAVE_DADOS_ATUALIZADO, Date.now().toString());

  return dados;
}

// =====================================================
// CARREGAR CURSOS
// =====================================================

export async function carregarDadosCursos(forcarAtualizacao = false) {
  const dados = await carregarDados(forcarAtualizacao);

  return dados.cursos;
}

// =====================================================
// CARREGAR INSTRUTORES
// =====================================================

export async function carregarDadosInstrutores(forcarAtualizacao = false) {
  const dados = await carregarDados(forcarAtualizacao);

  return dados.instrutores;
}

// =====================================================
// CARREGAR VAGAS
// =====================================================


export async function carregarDadosVagas(forcarAtualizacao = false) {
  // =========================
  // TENTAR USAR O CACHE
  // =========================

  let vagasSalvas = null;

  if (!forcarAtualizacao) {
    const cache = localStorage.getItem(CHAVE_VAGAS);
    const ultimaAtualizacao = localStorage.getItem(
      CHAVE_VAGAS_ATUALIZADO
    );

    if (cache && ultimaAtualizacao) {
      try {
        vagasSalvas = JSON.parse(cache);

        const tempoPassado =
          Date.now() - Number(ultimaAtualizacao);

        if (
          Number.isFinite(tempoPassado) &&
          tempoPassado >= 0 &&
          tempoPassado < TEMPO_CACHE_VAGAS
        ) {
          return vagasSalvas;
        }
      } catch (erro) {
        console.warn(
          "Cache de vagas inválido. Buscando novamente."
        );

        localStorage.removeItem(CHAVE_VAGAS);
        localStorage.removeItem(CHAVE_VAGAS_ATUALIZADO);

        vagasSalvas = null;
      }
    }
  }

  // =========================
  // BUSCAR VAGAS ATUALIZADAS
  // DIRETAMENTE NO SUPABASE
  // =========================

  const { data: cursos, error } = await clienteSupabase
    .from("cursos")
    .select("idCurso, vagas")
    .order("idCurso", {
      ascending: true
    });

  // =========================
  // TRATAR ERRO
  // =========================

  if (error) {
    console.error("Erro ao carregar vagas:", error);

    // Permite usar o cache antigo se o Supabase falhar.
    if (vagasSalvas) {
      return vagasSalvas;
    }

    const cacheAntigo = localStorage.getItem(CHAVE_VAGAS);

    if (cacheAntigo) {
      try {
        return JSON.parse(cacheAntigo);
      } catch (erroCache) {
        console.warn("Não foi possível recuperar o cache antigo.");
      }
    }

    throw error;
  }

  // =========================
  // ORGANIZAR AS VAGAS
  // =========================

  const vagas = {};

  (cursos || []).forEach(function (curso) {
    vagas[curso.idCurso] = curso.vagas;
  });

  // =========================
  // SALVAR CACHE
  // =========================

  localStorage.setItem(
    CHAVE_VAGAS,
    JSON.stringify(vagas)
  );

  localStorage.setItem(
    CHAVE_VAGAS_ATUALIZADO,
    Date.now().toString()
  );

  return vagas;
}


// =====================================================
// LIMPAR CACHE
// =====================================================

export function limparCacheCursos() {
  // Cache dos dados gerais
  localStorage.removeItem(CHAVE_DADOS);
  localStorage.removeItem(CHAVE_DADOS_ATUALIZADO);

  // Cache das vagas
  localStorage.removeItem(CHAVE_VAGAS);
  localStorage.removeItem(CHAVE_VAGAS_ATUALIZADO);
}
