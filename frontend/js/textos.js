// Animações de texto com SplitText (letras e linhas entrando).
//
// Regra de ouro: o HTML/CSS deixam tudo VISÍVEL. Só este arquivo esconde e
// anima, então se o JS falhar o texto continua lá.
// O SplitText já coloca aria-label no elemento original, para o leitor de tela
// ler a frase inteira e não letra por letra.

/**
 * Nome da vinícola no hero: cada palavra sobe de baixo para cima ao abrir a página.
 * Dividimos por palavras (e não por linhas) porque no desktop as duas palavras estão
 * na MESMA linha, separadas pela garrafa; dividir por linha juntaria as duas numa div
 * só e desmancharia o vão. Por palavra, cada uma continua dentro do seu <span>.
 */
function animarNomeHero() {
  const titulo = document.querySelector('#nome-vinicola');
  if (!titulo) return;

  SplitText.create(titulo, {
    type: 'words',
    mask: 'words',     // cada palavra ganha uma "janela" que esconde o que está fora dela
    onSplit: (divisao) =>
      gsap.from(divisao.words, {
        yPercent: 110,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.15,
        delay: 0.4,
      }),
  });
}

/** Títulos das seções: letra por letra quando entram na tela. */
function animarTitulos() {
  document.querySelectorAll('.titulo-secao').forEach((titulo) => {
    SplitText.create(titulo, {
      type: 'words, chars', // "words" evita quebrar uma palavra no meio da linha
      autoSplit: true,
      onSplit: (divisao) =>
        gsap.from(divisao.chars, {
          yPercent: 60,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.025,
          scrollTrigger: {
            trigger: titulo,
            start: 'top 85%', // quando o topo do título chega a 85% da altura da tela
            once: true,       // anima uma vez só
          },
        }),
    });
  });
}

/** Manifesto: palavras acendem uma a uma conforme a rolagem; destaques viram vinho. */
function animarManifesto() {
  const texto = document.querySelector('.manifesto-texto');
  if (!texto) return;

  const estilo = getComputedStyle(document.documentElement);
  const creme = estilo.getPropertyValue('--cor-creme').trim();
  const vinho = estilo.getPropertyValue('--cor-vinho-claro').trim();

  SplitText.create(texto, {
    type: 'words',
    autoSplit: true,
    onSplit: (divisao) => {
      const destaques = divisao.words.filter((palavra) => palavra.closest('.destaque'));

      // Estado inicial (aplicado só aqui, pelo JS): tudo apagado e creme
      gsap.set(divisao.words, { opacity: 0.15 });
      gsap.set(destaques, { color: creme });

      const linhaDoTempo = gsap.timeline({
        scrollTrigger: {
          trigger: texto,
          start: 'top 75%',
          end: 'bottom 45%',
          scrub: true, // o progresso segue a rolagem, ida e volta
        },
      });

      divisao.words.forEach((palavra) => {
        const ehDestaque = destaques.includes(palavra);
        linhaDoTempo.to(palavra, {
          opacity: 1,
          ...(ehDestaque && { color: vinho }),
          duration: 1,
          ease: 'none',
        }, '<0.35'); // cada palavra começa um pouco depois da anterior
      });

      return linhaDoTempo;
    },
  });
}

export function iniciarTextos({ movimentoReduzido }) {
  // Com movimento reduzido, nada é dividido nem escondido: o texto aparece direto
  if (movimentoReduzido) return;

  animarNomeHero();
  animarTitulos();
  animarManifesto();
}
