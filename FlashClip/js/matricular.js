// =========================
// REGRAS DA MATRÍCULA
// =========================
// Usadas pela tela do notebook de cursos e pela página de matrícula,
// para as duas seguirem as mesmas verificações antes de gravar.

import { clienteSupabase } from "./supabase.js";
import { inteiroPositivo } from "./seguranca.js";
import { limparCacheCursos } from "./dados.js";

export const CANAL_MATRICULAS = "flashclip-matriculas";

// =========================
// NORMALIZAR PERÍODO
// =========================

export function normalizarPeriodo(valor) {
  const periodo = String(valor ?? "")
    .trim()
    .toLowerCase();

  // Ex.: 2026/02, 2026/2 e 2026-2.
  const correspondencia = periodo.match(
    /^(\d{4})\s*[/.-]\s*0*(\d{1,2})$/
  );

  if (correspondencia) {
    const ano = correspondencia[1];
    const etapa = Number(correspondencia[2]);

    if (etapa >= 1 && etapa <= 12) {
      return `${ano}/${etapa}`;
    }
  }

  return periodo.replace(/\s+/g, " ");
}

function periodoDaMatricula(matricula) {
  const curso = Array.isArray(matricula.cursos)
    ? matricula.cursos[0]
    : matricula.cursos;

  return normalizarPeriodo(curso?.periodo);
}

// =========================
// SITUAÇÃO DA CONTA
// =========================
// Quem está logado e em quais cursos já está inscrito.
// erro: true quando não deu para conferir as matrículas.

export async function situacaoDaConta() {
  const {
    data: { session },
  } = await clienteSupabase.auth.getSession();

  if (!session) {
    return { sessao: null, usuario: null, matriculas: [], erro: false };
  }

  const { data: usuario, error: erroUsuario } = await clienteSupabase
    .from("usuarios")
    .select("idUsuario, nome")
    .eq("email", session.user.email)
    .maybeSingle();

  if (erroUsuario || !usuario) {
    if (erroUsuario) {
      console.error("Erro ao buscar usuário:", erroUsuario);
    }

    return { sessao: session, usuario: null, matriculas: [], erro: true };
  }

  const { data: matriculas, error: erroMatriculas } = await clienteSupabase
    .from("matriculas")
    .select(`
      idCurso,
      cursos (
        periodo
      )
    `)
    .eq("idUsuario", usuario.idUsuario);

  if (erroMatriculas) {
    console.error("Erro ao buscar matrículas:", erroMatriculas);

    return { sessao: session, usuario, matriculas: [], erro: true };
  }

  return {
    sessao: session,
    usuario,
    matriculas: (matriculas || []).map(function (matricula) {
      return {
        idCurso: Number(matricula.idCurso),
        periodo: periodoDaMatricula(matricula),
      };
    }),
    erro: false,
  };
}

// =========================
// REALIZAR MATRÍCULA
// =========================
// Confere login, cadastro, período, vagas e matrículas do período
// antes de gravar. Resultado:
//   { ok: true, curso }
//   { ok: false, tipo: "login" | "aviso" | "erro", mensagem }

export async function realizarMatricula(idCursoInformado) {
  const idCurso = inteiroPositivo(String(idCursoInformado ?? ""));

  if (!idCurso) {
    return {
      ok: false,
      tipo: "erro",
      mensagem: "Curso não encontrado. Escolha um curso válido.",
    };
  }

  try {
    // =========================
    // VERIFICAR LOGIN
    // =========================

    const { data: dadosSessao, error: erroSessao } =
      await clienteSupabase.auth.getSession();

    if (erroSessao) {
      throw erroSessao;
    }

    const session = dadosSessao.session;

    if (!session) {
      return {
        ok: false,
        tipo: "login",
        mensagem: "Você precisa entrar na sua conta para realizar a matrícula.",
      };
    }

    // =========================
    // BUSCAR USUÁRIO
    // =========================

    const { data: usuario, error: erroUsuario } = await clienteSupabase
      .from("usuarios")
      .select("idUsuario")
      .eq("email", session.user.email)
      .maybeSingle();

    if (erroUsuario) {
      console.error("Erro ao buscar usuário:", erroUsuario);

      return {
        ok: false,
        tipo: "erro",
        mensagem: "Não foi possível identificar seu usuário. Tente novamente.",
      };
    }

    if (!usuario) {
      return {
        ok: false,
        tipo: "erro",
        mensagem: "Seu cadastro não foi localizado. Entre novamente ou contate o suporte.",
      };
    }

    // =========================
    // CURSO ATUALIZADO
    // =========================
    // Período e vagas vêm do banco agora, não do cache da página.

    const { data: curso, error: erroCurso } = await clienteSupabase
      .from("cursos")
      .select("idCurso, nome, periodo, vagas")
      .eq("idCurso", Number(idCurso))
      .maybeSingle();

    if (erroCurso) {
      throw erroCurso;
    }

    if (!curso) {
      return { ok: false, tipo: "erro", mensagem: "Curso não encontrado." };
    }

    // =========================
    // VALIDAR PERÍODO
    // =========================

    const periodoAtual = normalizarPeriodo(curso.periodo);

    if (!periodoAtual) {
      return {
        ok: false,
        tipo: "erro",
        mensagem: "Não foi possível identificar o período deste curso.",
      };
    }

    // =========================
    // VERIFICAR VAGAS
    // =========================

    if (
      curso.vagas === null ||
      curso.vagas === undefined ||
      !Number.isFinite(Number(curso.vagas))
    ) {
      return {
        ok: false,
        tipo: "aviso",
        mensagem: "Não foi possível confirmar a disponibilidade de vagas. Tente novamente.",
      };
    }

    if (Number(curso.vagas) <= 0) {
      return {
        ok: false,
        tipo: "aviso",
        mensagem: "Este curso não possui mais vagas. Escolha outro curso.",
      };
    }

    // =========================
    // BUSCAR MATRÍCULAS EXISTENTES
    // =========================

    const { data: matriculas, error: erroMatriculas } = await clienteSupabase
      .from("matriculas")
      .select(`
        idMatricula,
        idCurso,
        cursos (
          periodo
        )
      `)
      .eq("idUsuario", usuario.idUsuario);

    if (erroMatriculas) {
      console.error("Erro ao buscar matrículas:", erroMatriculas);

      throw erroMatriculas;
    }

    const listaMatriculas = matriculas || [];

    // =========================
    // VALIDAR DADOS EXISTENTES
    // =========================

    if (listaMatriculas.some((matricula) => !periodoDaMatricula(matricula))) {
      return {
        ok: false,
        tipo: "aviso",
        mensagem: "Não foi possível verificar todas as suas matrículas. Atualize a página e tente novamente.",
      };
    }

    // =========================
    // VERIFICAR CONFLITO
    // =========================

    if (listaMatriculas.some((matricula) => periodoDaMatricula(matricula) === periodoAtual)) {
      return {
        ok: false,
        tipo: "aviso",
        mensagem: "Você já possui uma matrícula neste período. Cada aluno pode se inscrever em apenas um curso por período.",
      };
    }

    // =========================
    // REALIZAR MATRÍCULA
    // =========================

    const { error: erroInsercao } = await clienteSupabase
      .from("matriculas")
      .insert({
        idUsuario: usuario.idUsuario,
        idCurso: Number(idCurso),
        dataInscricao: new Date().toISOString(),
      });

    if (erroInsercao) {
      console.error("Erro retornado pelo Supabase:", erroInsercao);

      const mensagemErro = String(erroInsercao.message || "").toLowerCase();

      if (mensagemErro.includes("você já possui uma matrícula neste período")) {
        return {
          ok: false,
          tipo: "aviso",
          mensagem: "Você já possui uma matrícula neste período. Não é possível se inscrever em outro curso agora.",
        };
      }

      if (mensagemErro.includes("não há vagas disponíveis para este curso")) {
        return {
          ok: false,
          tipo: "aviso",
          mensagem: "As vagas deste curso se esgotaram. Escolha outro curso.",
        };
      }

      throw erroInsercao;
    }

    // =========================
    // MATRÍCULA CONCLUÍDA
    // =========================
    // Vagas mudaram: limpa o cache e avisa as outras telas abertas
    // na moldura (app.html) para atualizarem.

    limparCacheCursos();

    if ("BroadcastChannel" in window) {
      new BroadcastChannel(CANAL_MATRICULAS).postMessage("matricula");
    }

    return { ok: true, curso };
  } catch (erro) {
    console.error("Erro ao realizar matrícula:", erro);

    return {
      ok: false,
      tipo: "erro",
      mensagem: "Não foi possível realizar sua matrícula. Verifique sua conexão e tente novamente.",
    };
  }
}
