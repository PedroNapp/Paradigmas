import { carregarDadosInstrutores } from "./dados.js";

const listaInstrutores = document.getElementById("listaInstrutores");

async function carregarInstrutores() {
  try {
    const ministrantes = await carregarDadosInstrutores();

    if (!ministrantes || ministrantes.length === 0) {
      listaInstrutores.innerHTML = `
                <div class="estado-instrutores">
                    <p>Nenhum instrutor encontrado.</p>
                </div>
            `;

      return;
    }

    /*
     * Agrupa os instrutores pelo curso
     */

    const cursos = {};

    ministrantes.forEach(function (ministrante) {
      const curso = ministrante.cursos?.nome || "Curso";

      const nome = ministrante.usuarios?.nome || "Instrutor";

      const foto =
        ministrante.referenciaFoto || "../imagens/usuario-padrao.png";

      if (!cursos[curso]) {
        cursos[curso] = [];
      }

      cursos[curso].push({
        nome: nome,
        foto: foto,
      });
    });

    /*
     * Limpa o carregamento
     */

    listaInstrutores.innerHTML = "";

    /*
     * Cria cada grupo de curso
     */

    Object.entries(cursos).forEach(function ([curso, instrutores]) {
      /*
       * Cria a seção do curso
       */

      const grupo = document.createElement("section");

      grupo.classList.add("grupo-curso");

      /*
       * Título do curso
       */

      const titulo = document.createElement("div");

      titulo.classList.add("titulo-curso");

      titulo.innerHTML = `
                    <span>CURSO</span>
                    <h2>
                        ${curso}
                    </h2>
                `;

      grupo.appendChild(titulo);

      /*
       * Lista de instrutores
       */

      const lista = document.createElement("div");

      lista.classList.add("lista-curso");

      /*
       * Cria os cards
       */

      instrutores.forEach(function (instrutor) {
        const card = document.createElement("article");

        card.classList.add("card-instrutor");

        card.innerHTML = `
                            <div class="foto-instrutor">

                                <img
                                    src="${instrutor.foto}"
                                    alt="${instrutor.nome}"
                                    loading="lazy"
                                    onerror="this.onerror=null; this.src='../imagens/usuario-padrao.png';"
                                 >

                            </div>

                            <h3>
                                ${instrutor.nome}
                            </h3>

                            <span class="nome-curso">
                                ${curso}
                            </span>
                        `;

        lista.appendChild(card);
      });

      grupo.appendChild(lista);

      listaInstrutores.appendChild(grupo);
    });
  } catch (erro) {
    console.error("Erro ao carregar instrutores:", erro);

    listaInstrutores.innerHTML = `
            <div class="estado-instrutores">
                <p>
                    Erro ao carregar os instrutores.
                </p>
            </div>
        `;
  }
}

carregarInstrutores();