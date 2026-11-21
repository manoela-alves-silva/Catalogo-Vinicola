// Preloader: contador de 0 a 100 com a taça enchendo e transição para o hero.
//
// O número acompanha o carregamento de verdade: o main.js avisa cada etapa concluída
// (fontes, garrafa 3D, vinhedo) com avancar(). O contador nunca "pula": ele persegue
// o valor alvo com uma animação suave, e a taça enche junto.

const DURACAO_MINIMA = 1.6; // segundos: rápido demais e ninguém vê a taça encher
const TEMPO_MAXIMO = 6000;  // ms: se algo travar, o site abre mesmo assim

/**
 * @param {object} opcoes
 * @param {boolean} opcoes.animar  false = sem GSAP ou com movimento reduzido
 * @param {object|null} opcoes.lenis  rolagem suave (fica parada enquanto o preloader cobre a tela)
 * @returns {{ avancar: (valor: number) => void, concluir: (aoRevelar?: () => void) => Promise<void> }}
 */
export function iniciarPreloader({ animar, lenis }) {
  const preloader = document.querySelector('#preloader');
  const numero = document.querySelector('#preloader-numero');
  const liquido = preloader?.querySelector('.taca-liquido');

  // Sempre começa do topo: com seções presas na rolagem, voltar no meio da página confunde
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  if (!preloader) return { avancar() {}, concluir: async (aoRevelar) => aoRevelar?.() };

  lenis?.stop();
  const inicio = performance.now();
  const progresso = { valor: 0 };

  function desenhar() {
    numero.textContent = Math.round(progresso.valor);
    if (liquido) liquido.style.transform = `scaleY(${progresso.valor / 100})`;
  }

  /** Leva o contador até "alvo" (0 a 100). Chamadas seguidas só fazem ele continuar subindo. */
  function avancar(alvo) {
    if (alvo <= progresso.valor) return;
    if (!animar) {
      progresso.valor = alvo;
      desenhar();
      return;
    }
    gsap.to(progresso, { valor: alvo, duration: 0.9, ease: 'power2.out', overwrite: true, onUpdate: desenhar });
  }

  function remover() {
    preloader.remove();
    lenis?.start();
  }

  /**
   * Completa o contador e tira o preloader da frente.
   * @param {() => void} [aoRevelar]  chamada quando a cortina começa a subir (ex.: animar o nome do hero)
   */
  async function concluir(aoRevelar) {
    if (!animar) {
      avancar(100);
      aoRevelar?.();
      remover();
      return;
    }

    // Respeita a duração mínima e termina de encher a taça
    const decorrido = (performance.now() - inicio) / 1000;
    const resto = Math.max(0.6, DURACAO_MINIMA - decorrido);
    await gsap.to(progresso, { valor: 100, duration: resto, ease: 'power2.inOut', overwrite: true, onUpdate: desenhar });

    // Saída: número e taça sobem e somem, depois a cortina inteira sobe revelando o hero
    await gsap.timeline()
      .to([numero.parentElement, preloader.querySelector('.preloader-taca')], {
        yPercent: -40, opacity: 0, duration: 0.5, ease: 'power3.in', stagger: 0.06,
      })
      .call(() => aoRevelar?.())
      .to(preloader, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' });
    remover();
  }

  return { avancar, concluir };
}

/**
 * Espera uma promessa, mas no máximo até TEMPO_MAXIMO depois que a página começou a abrir
 * (performance.now() conta a partir daí). Assim uma etapa lenta (CDN do Three.js, por
 * exemplo) não deixa o site preso atrás da cortina.
 */
export function comLimiteDeTempo(promessa) {
  const restante = Math.max(0, TEMPO_MAXIMO - performance.now());
  return Promise.race([promessa, new Promise((resolver) => setTimeout(resolver, restante))]);
}
