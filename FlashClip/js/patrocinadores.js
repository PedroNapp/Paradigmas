const filtros = document.querySelectorAll(".filtro");
const patrocinadores = document.querySelectorAll(".card-patrocinador");

filtros.forEach((filtro) => {
  filtro.addEventListener("click", () => {
    filtros.forEach((item) => {
      item.classList.remove("ativo");
    });

    filtro.classList.add("ativo");

    const categoria = filtro.dataset.filtro;

    patrocinadores.forEach((patrocinador) => {
      if (
        categoria === "todos" ||
        patrocinador.dataset.categoria === categoria
      ) {
        patrocinador.style.display = "flex";
      } else {
        patrocinador.style.display = "none";
      }
    });
  });
});
