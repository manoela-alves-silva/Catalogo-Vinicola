// Seção "Do vinhedo à taça": a seção fica presa na tela e a rolagem faz um "voo"
// pelas 6 fotos das etapas, com textos, contador e barra de progresso.
//
// Como o voo funciona (uma linha do tempo do GSAP, controlada pela rolagem):
//  - cada etapa ocupa 1 unidade de tempo (6 etapas = 6 unidades);
//  - durante a etapa, a foto se aproxima devagar (escala 1,06 → 1,2);
//  - no fim da etapa, ela cresce rápido e some (1,2 → 1,5): parece que a câmera a atravessa;
//  - ao mesmo tempo, a foto seguinte aparece por baixo e começa a própria aproximação.
// Profundidade: o cenário anda um pouco para o lado contrário do mouse e a névoa anda mais
// (o que está "mais perto" se mexe mais: é assim que o olho percebe camadas).
import { mouse } from './mouse.js';

const TELAS_DE_ROLAGEM = 5;   // quanto rolar para o passeio inteiro (em alturas de tela)
const INICIO_DA_SAIDA = 0.8;  // em que ponto da etapa a foto começa a ser "atravessada"
const DURACAO_DA_SAIDA = 0.35;

export function iniciarVinhedo({ movimentoReduzido }) {
  const secao = document.querySelector('#vinhedo');
  // Com movimento reduzido, a seção fica como lista com as fotos (estado do HTML/CSS)
  if (!secao || movimentoReduzido) return;

  const cenario = secao.querySelector('.vinhedo-cenario');
  const nevoa = secao.querySelector('.vinhedo-nevoa');
  const cenas = [...secao.querySelectorAll('.vinhedo-cena')];
  const textos = [...secao.querySelectorAll('.vinhedo-etapa')];
  const barra = secao.querySelector('.vinhedo-progresso-barra');
  const contador = secao.querySelector('.vinhedo-contador-atual');
  const total = cenas.length;

  secao.classList.add('em-cena'); // vira "tela de cinema" ANTES de medir o pin
  cenas[0].loading = 'eager';      // a primeira foto já aparece assim que a seção chega

  gsap.set(cenas, { opacity: 0, scale: 1.06 });
  gsap.set(cenas[0], { opacity: 1 });
  gsap.set(textos, { autoAlpha: 0 }); // autoAlpha = opacity + visibility

  // ---------- Textos e contador: mostram só a etapa atual ----------
  let etapaAtual = -1;
  function trocarTexto(i) {
    if (i === etapaAtual) return;
    if (etapaAtual >= 0) gsap.to(textos[etapaAtual], { autoAlpha: 0, y: -24, duration: 0.45, overwrite: true });
    gsap.fromTo(textos[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.15, overwrite: true });
    contador.textContent = String(i + 1).padStart(2, '0');
    etapaAtual = i;
  }

  // ---------- Linha do tempo do voo ----------
  const voo = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate() {
      // a barra acompanha a linha do tempo (já suavizada pelo scrub), não a rolagem crua
      barra.style.transform = `scaleX(${this.progress().toFixed(4)})`;
      trocarTexto(Math.min(total - 1, Math.floor(this.progress() * total)));
    },
    scrollTrigger: {
      trigger: secao,
      start: 'top top',
      end: () => `+=${window.innerHeight * TELAS_DE_ROLAGEM}`,
      pin: true,
      scrub: 1,           // a animação "persegue" a rolagem com 1 s de suavidade
      anticipatePin: 1,
      refreshPriority: 1, // calcula antes dos gatilhos de baixo (o pin empurra a página)
      invalidateOnRefresh: true,
    },
  });

  cenas.forEach((cena, i) => {
    const comeco = i === 0 ? 0 : i - 1 + INICIO_DA_SAIDA; // começa a aparecer quando a anterior sai
    const saida = i + INICIO_DA_SAIDA;
    // aproximação lenta durante a etapa
    voo.fromTo(cena, { scale: 1.06 }, { scale: 1.2, duration: saida - comeco }, comeco);
    if (i < total - 1) {
      // "atravessa" a foto: cresce rápido e some...
      voo.to(cena, { scale: 1.5, opacity: 0, duration: DURACAO_DA_SAIDA, ease: 'power1.in' }, saida);
      // ...enquanto a próxima aparece por baixo
      voo.fromTo(cenas[i + 1], { opacity: 0 }, { opacity: 1, duration: DURACAO_DA_SAIDA }, saida);
    }
  });
  voo.set({}, {}, total); // garante que a linha do tempo dure exatamente 6 (1 por etapa)
  trocarTexto(0);

  // ---------- Profundidade com o mouse ----------
  const seguir = (alvo, propriedade) => gsap.quickTo(alvo, propriedade, { duration: 1.4, ease: 'power3.out' });
  const cenarioX = seguir(cenario, 'x');
  const cenarioY = seguir(cenario, 'y');
  const nevoaX = seguir(nevoa, 'x');
  const nevoaY = seguir(nevoa, 'y');
  gsap.ticker.add(() => {
    if (!voo.scrollTrigger.isActive) return; // fora da seção, não gasta nada
    cenarioX(-mouse.x * 22);
    cenarioY(-mouse.y * 14);
    nevoaX(-mouse.x * 70);
    nevoaY(-mouse.y * 30);
  });
}
