// Animações de texto com SplitText (letras e linhas entrando).
//
// Regra de ouro: o HTML/CSS deixam tudo VISÍVEL. Só este arquivo esconde e
// anima, então se o JS falhar o texto continua lá.
// O SplitText já coloca aria-label no elemento original, para o leitor de tela
// ler a frase inteira e não letra por letra.
import { mouse } from './mouse.js';

/**
 * Nome da vinícola no hero: cada palavra sobe de baixo para cima ao abrir a página.
 * Dividimos por palavras (e não por linhas) porque no desktop as duas palavras estão
 * na MESMA linha, separadas pela garrafa; dividir por linha juntaria as duas numa div
 * só e desmancharia o vão. Por palavra, cada uma continua dentro do seu <span>.
 */
function animarNomeHero() {
  const titulo = document.querySelector('#nome-vinicola');
  if (!titulo) return null;

  const palavraColorida = titulo.querySelector('span:last-child:not(:first-child)');
  const creme = getComputedStyle(document.documentElement).getPropertyValue('--cor-creme').trim();

  // Criada pausada: quem dá o "play" é o preloader, quando a cortina começa a subir
  const entrada = gsap.timeline({ paused: true, delay: 0.4 });
  SplitText.create(titulo, {
    type: 'words',
    mask: 'words',     // cada palavra ganha uma "janela" que esconde o que está fora dela
    onSplit: (divisao) =>
      entrada
        .from(divisao.words, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.15 })
        // a última palavra nasce creme e "tinge" de vinho (a cor final vem do CSS)
        .from(palavraColorida, { color: creme, duration: 1.4, ease: 'power2.inOut' }, '-=0.5'),
  });
  return entrada;
}

/**
 * Nome do hero vivo: as palavras acompanham o mouse em paralaxe (no sentido
 * contrário ao da garrafa, o que dá sensação de camadas) e se afastam para os
 * lados ao rolar, como uma cortina abrindo enquanto a garrafa sobe.
 * Cada efeito usa uma propriedade diferente (x/y no mouse, xPercent na rolagem)
 * para os dois se somarem sem um apagar o outro.
 */
function animarNomeVivo() {
  const palavras = [...document.querySelectorAll('#nome-vinicola > span')];
  if (palavras.length < 2) return;
  const [primeira, ultima] = [palavras[0], palavras.at(-1)];

  // Paralaxe: quickTo cria uma função que "persegue" o valor com suavidade
  const seguidores = palavras.map((palavra, i) => ({
    x: gsap.quickTo(palavra, 'x', { duration: 1.2, ease: 'power3.out' }),
    y: gsap.quickTo(palavra, 'y', { duration: 1.2, ease: 'power3.out' }),
    intensidade: 18 + i * 14, // a segunda palavra mexe mais: parece mais perto
  }));
  gsap.ticker.add(() => {
    seguidores.forEach(({ x, y, intensidade }) => {
      x(-mouse.x * intensidade);
      y(-mouse.y * intensidade * 0.5);
    });
  });

  // Rolagem: as palavras saem pelas laterais e apagam enquanto o hero sai da tela
  gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  })
    .to(primeira, { xPercent: -60, opacity: 0, ease: 'none' }, 0)
    .to(ultima, { xPercent: 60, opacity: 0, ease: 'none' }, 0);
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

/**
 * Prepara todas as animações de texto.
 * @returns {{ revelarHero: () => void }}  toca a entrada do nome do hero (chamada pelo preloader)
 */
export function iniciarTextos({ movimentoReduzido }) {
  // Com movimento reduzido, nada é dividido nem escondido: o texto aparece direto
  if (movimentoReduzido) return { revelarHero() {} };

  const entradaHero = animarNomeHero();
  animarNomeVivo();
  animarTitulos();
  animarManifesto();
  return { revelarHero: () => entradaHero?.play() };
}
