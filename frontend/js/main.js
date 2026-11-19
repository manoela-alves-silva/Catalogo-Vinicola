// Ponto de entrada: inicializa todos os módulos do site.

/**
 * O nome da vinícola é escrito uma vez só, no <h1 id="nome-vinicola"> do hero.
 * Esta função copia esse nome para todo elemento com [data-nome-vinicola]
 * e para o título da aba. Sem JS, o <h1> continua mostrando o nome.
 */
function preencherNomeVinicola() {
  const nome = document.querySelector('#nome-vinicola')?.textContent.trim();
  if (!nome) return;

  document.querySelectorAll('[data-nome-vinicola]').forEach((elemento) => {
    elemento.textContent = nome;
  });
  document.title = `${nome} · ${document.title}`;
}

preencherNomeVinicola();
