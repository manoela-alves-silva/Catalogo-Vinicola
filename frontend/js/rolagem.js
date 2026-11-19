// Rolagem suave com Lenis sincronizada com o ScrollTrigger do GSAP.
//
// Como os dois conversam:
// 1. O Lenis não usa um loop próprio (autoRaf: false). Quem "dá o ritmo" é o
//    ticker do GSAP, que chama lenis.raf() a cada quadro. Assim existe um só
//    relógio para a rolagem e para as animações, e eles nunca saem de sincronia.
// 2. A cada quadro em que o Lenis move a página, ele dispara o evento "scroll".
//    Nesse evento chamamos ScrollTrigger.update(), que recalcula o progresso de
//    todas as animações ligadas à rolagem.

/**
 * Liga a rolagem suave. Devolve a instância do Lenis, ou null se a pessoa
 * prefere menos movimento (aí fica a rolagem nativa do navegador).
 */
export function iniciarRolagem({ movimentoReduzido }) {
  if (movimentoReduzido) return null;

  const alturaCabecalho = document.querySelector('.cabecalho')?.offsetHeight ?? 0;

  const lenis = new Lenis({
    autoRaf: false,     // o ticker do GSAP chama o raf (passo 1)
    lerp: 0.1,          // suavidade: menor = mais "manteiga", maior = mais direto
    anchors: { offset: -alturaCabecalho }, // links "#secao" rolam suave, sem ficar sob o header
  });

  // Passo 2: Lenis rolou → ScrollTrigger atualiza
  lenis.on('scroll', ScrollTrigger.update);

  // Passo 1: o ticker do GSAP (em segundos) move o Lenis (em milissegundos)
  gsap.ticker.add((tempo) => lenis.raf(tempo * 1000));

  // Sem isso, o GSAP "pula" quadros depois de uma travada e a rolagem dá um tranco
  gsap.ticker.lagSmoothing(0);

  return lenis;
}
