// Menu do celular: o botão abre e fecha a navegação em tela cheia.
// O visual (tela cheia, links entrando, ícone virando "×") é todo do CSS, guiado pelo
// aria-expanded do botão. Assim o mesmo atributo serve ao leitor de tela e ao visual.

/** @param {{ lenis: object|null }} opcoes  rolagem suave, parada enquanto o menu está aberto */
export function iniciarMenu({ lenis }) {
  const botao = document.querySelector('.cabecalho-menu-botao');
  const menu = document.querySelector('#menu-principal');
  if (!botao || !menu) return;

  const estaAberto = () => botao.getAttribute('aria-expanded') === 'true';

  function alternar(abrir) {
    botao.setAttribute('aria-expanded', String(abrir));
    botao.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    // A página atrás não rola com o menu aberto
    if (lenis) abrir ? lenis.stop() : lenis.start();
    else document.documentElement.classList.toggle('sem-rolagem', abrir);
  }

  botao.addEventListener('click', () => alternar(!estaAberto()));

  // Escolheu um link: fecha o menu. Este ouvinte roda antes do Lenis (que escuta no
  // <html>), então a rolagem já está liberada quando ele for rolar até a seção.
  menu.addEventListener('click', (evento) => {
    if (estaAberto() && evento.target.closest('a')) alternar(false);
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || !estaAberto()) return;
    alternar(false);
    botao.focus();
  });

  // Girou o tablet ou aumentou a janela até o desktop: o menu em tela cheia não existe lá
  window.matchMedia('(min-width: 64em)').addEventListener('change', (consulta) => {
    if (consulta.matches && estaAberto()) alternar(false);
  });
}
