// Cena do hero: a garrafa gira sozinha, inclina com o mouse e sobe/diminui ao rolar.
import { criarRenderizador } from './renderizador.js';
import { criarGarrafa } from './garrafa.js';

const VELOCIDADE_GIRO = 0.25;   // radianos por segundo (uma volta a cada ~25 s)
const INCLINACAO_MAXIMA = 0.18; // radianos (~10°)
const SUAVIDADE = 3;            // maior = segue o mouse mais rápido

// O nome da vinícola já aparece dos dois lados da garrafa; o rótulo mostra o vinho de assinatura.
// (No catálogo, cada garrafa recebe o nome do próprio vinho, vindo da API.)
const ROTULO_HERO = { titulo: 'Pedra Lisa', subtitulo: 'Marselan · 2022' };

// Distância da câmera. Em tela "em pé" (celular) a câmera se afasta e a garrafa fica
// menor, sobrando espaço para as palavras acima e abaixo dela.
// ATENÇÃO: o vão entre as palavras (--vao-garrafa, em secoes.css) depende destes
// valores. Se mudar aqui, ajuste lá na mesma proporção.
const DISTANCIA_PADRAO = 10;
const DISTANCIA_EM_PE = 12.5;

function posicionarCamera(camera) {
  camera.position.z = camera.aspect < 1 ? DISTANCIA_EM_PE : DISTANCIA_PADRAO;
}

/**
 * Monta a cena da garrafa no canvas do hero.
 * Hierarquia:  subida (rolagem) → inclinacao (mouse) → garrafa (giro)
 * Cada movimento mora no seu próprio grupo, então eles nunca brigam entre si.
 */
export function iniciarCenaHero({ canvas, qualidade, movimentoReduzido, corFundo }) {
  const r = criarRenderizador(canvas, {
    qualidade,
    corFundo,
    comLoop: !movimentoReduzido,
    aoRedimensionar: posicionarCamera,
  });
  const { THREE } = r;

  const garrafa = criarGarrafa({
    ...ROTULO_HERO,
    qualidade,
    anisotropia: r.renderer.capabilities.getMaxAnisotropy(),
  });
  garrafa.objeto.rotation.y = -0.5; // começa levemente virada: o rótulo aparece em perspectiva

  const inclinacao = new THREE.Group();
  const subida = new THREE.Group();
  inclinacao.add(garrafa.objeto);
  subida.add(inclinacao);
  r.cena.add(subida);

  if (movimentoReduzido) {
    garrafa.objeto.rotation.y = -0.25;
    r.desenhar();
    return r;
  }

  // ---------- Mouse: guarda só o "alvo"; o movimento de verdade acontece no loop ----------
  const alvo = { x: 0, y: 0 }; // de -1 a 1
  window.addEventListener('pointermove', (evento) => {
    if (evento.pointerType !== 'mouse') return; // no toque não há "seguir o mouse"
    alvo.x = (evento.clientX / window.innerWidth) * 2 - 1;
    alvo.y = (evento.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => {
    alvo.x = 0;
    alvo.y = 0;
  });

  r.aCadaQuadro((delta) => {
    garrafa.objeto.rotation.y += VELOCIDADE_GIRO * delta;

    // Interpolação: a cada quadro anda uma fração do caminho até o alvo.
    // Usar exp(-delta) deixa a suavidade igual em telas de 60 Hz ou 120 Hz.
    const fracao = 1 - Math.exp(-SUAVIDADE * delta);
    inclinacao.rotation.z += (-alvo.x * INCLINACAO_MAXIMA - inclinacao.rotation.z) * fracao;
    inclinacao.rotation.x += (alvo.y * INCLINACAO_MAXIMA * 0.6 - inclinacao.rotation.x) * fracao;
  });

  // ---------- Entrada: a garrafa sobe suavemente e o canvas aparece ----------
  gsap.from(inclinacao.position, { y: -1.2, duration: 1.8, ease: 'expo.out', delay: 0.3 });
  gsap.from(canvas, { opacity: 0, duration: 1.2, delay: 0.3 });

  // ---------- Rolagem: enquanto o hero sai da tela, a garrafa sobe e diminui ----------
  gsap.timeline({
    scrollTrigger: {
      trigger: canvas.closest('section'),
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  })
    .to(subida.position, { y: 1.4, ease: 'none' }, 0)
    .to(subida.scale, { x: 0.6, y: 0.6, z: 0.6, ease: 'none' }, 0);

  return r;
}
