// Seção "Visite a vinícola": fotos que se revelam com máscara e faixa de texto correndo.

/** Cada foto se revela de baixo para cima (clip-path) ao entrar na tela. */
function revelarFotos() {
  document.querySelectorAll('.visite-foto').forEach((foto) => {
    const imagem = foto.querySelector('img');

    const linhaDoTempo = gsap.timeline({
      scrollTrigger: { trigger: foto, start: 'top 85%', once: true },
    });

    // fromTo aplica o estado inicial (escondido) na hora: só acontece se o JS rodar
    linhaDoTempo
      .fromTo(foto,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut' })
      .fromTo(imagem,
        { scale: 1.25 },
        { scale: 1, duration: 1.6, ease: 'expo.out' }, '<'); // zoom saindo junto com a máscara
  });
}

/** Faixa de texto em loop que acelera quando a pessoa rola mais rápido. */
function animarMarquee() {
  const trilho = document.querySelector('.marquee-trilho');
  if (!trilho) return;

  // O trilho tem 3 cópias iguais da frase. Andar 1/3 da largura e recomeçar
  // deixa a emenda invisível: a segunda cópia está exatamente onde a primeira estava.
  const loop = gsap.to(trilho, {
    xPercent: -100 / 3,
    duration: 20,
    ease: 'none',
    repeat: -1,
  });

  ScrollTrigger.create({
    trigger: '.marquee',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (gatilho) => loop.paused(!gatilho.isActive), // fora da tela, para (economiza CPU)
    onUpdate: (gatilho) => {
      // getVelocity() = pixels por segundo da rolagem. Vira um fator entre 1 e 4.
      // timeScale é a velocidade da animação: 1 = normal, 2 = dobro.
      const aceleracao = 1 + Math.min(Math.abs(gatilho.getVelocity()) / 600, 3);
      gsap.to(loop, { timeScale: aceleracao, duration: 0.2, overwrite: true });
      gsap.to(loop, { timeScale: 1, duration: 1, delay: 0.2, ease: 'power2.out' }); // volta ao normal
    },
  });
}

export function iniciarVisita({ movimentoReduzido }) {
  if (movimentoReduzido) return; // fotos já visíveis e faixa parada
  revelarFotos();
  animarMarquee();
}
