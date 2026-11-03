import { escaparHTML } from "./seguranca.js";

// Algumas fotos já são menores no formato original; para elas, não há conversão.
const FOTOS_QUE_JA_SAO_MENORES = new Set([
  "Ministrantes/SCRATCH/Brenno_Milhomem_Farias.jpg",
  "Ministrantes/RUBY/Yuri_Soares_de_Oliveira.jpeg",
  "Ministrantes/RUBY/Lucas_Gabriel_Rozendo_da_Silva.jpeg",
  "Ministrantes/CLOJURE/Reginaldo_Santos_Andrade.jpeg",
  "Ministrantes/JAVASCRIPT/Anthonny_Cristhyan_Silva_Patrocinio.jpg",
  "Ministrantes/JAVASCRIPT/Lucas_Cardoso_Marinho.jpg",
  "Ministrantes/JAVASCRIPT/Pedro_Arthur_Souza_Napp.jpg",
  "Ministrantes/JAVASCRIPT/Felipe_Martins_Sundre.jpg",
])

// Usa cópias WebP locais para os retratos do projeto, sem alterar referências
// remotas do Supabase nem remover as fotos originais.
export function prepararImagemMinistrante(caminho, caminhoImagens = "../imagens/") {
  const imagemPadrao = `${caminhoImagens}usuario-padrao.png`;

  if (!caminho || !String(caminho).trim()) {
    return { src: imagemPadrao, fallback: null };
  }

  const valor = String(caminho).trim();

  // Fotos hospedadas externamente continuam usando a URL cadastrada.
  if (/^(?:https?:)?\/\//i.test(valor)) {
    return { src: valor, fallback: imagemPadrao };
  }

  const caminhoRelativo = valor
    .replace(/\\/g, "/")
    .replace(/^(?:(?:\.\.\/)|(?:\.\/))?imagens\//i, "")
    .replace(/^\/+/, "");

  const original = `${caminhoImagens}${caminhoRelativo}`;
  const arquivoMinistrante = caminhoRelativo.match(/^Ministrantes\/(.+)\.(?:jpe?g|png)$/i);

  if (!arquivoMinistrante || FOTOS_QUE_JA_SAO_MENORES.has(caminhoRelativo)) {
    return { src: original, fallback: imagemPadrao };
  }

  const otimizada = `${caminhoImagens}Ministrantes-webp/${arquivoMinistrante[1]}.webp`;

  return {
    src: otimizada,
    fallback: original,
  };
}

// Se a cópia WebP não existir por algum motivo, volta à foto original.
// Se a original também não existir, usa o avatar padrão.
export function atributosFallbackImagem(imagem, imagemPadrao) {
  const fallback = imagem?.fallback || "";
  const final = imagemPadrao || "";

  if (!fallback) {
    return 'onerror="this.onerror=null;"';
  }

  if (!final || fallback === final) {
    return `data-fallback="${escaparHTML(fallback)}" onerror="this.onerror=null;this.src=this.dataset.fallback;"`;
  }

  return `data-fallback="${escaparHTML(fallback)}" data-fallback-final="${escaparHTML(final)}" onerror="if(this.dataset.fallback){const proxima=this.dataset.fallback;this.dataset.fallback='';this.src=proxima;}else if(this.dataset.fallbackFinal){const proxima=this.dataset.fallbackFinal;this.dataset.fallbackFinal='';this.src=proxima;}else{this.onerror=null;}"`;
}
