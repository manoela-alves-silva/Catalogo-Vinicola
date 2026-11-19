// Cena do hero: a garrafa gira sozinha, reage ao mouse (inclina, vira, levanta,
// pode ser arrastada), tem uma luz que segue o cursor e sobe/diminui ao rolar.
import { criarRenderizador } from './renderizador.js';
import { criarGarrafa } from './garrafa.js';
import { criarInteracaoGarrafa } from './interacaoGarrafa.js';
import { mouse } from '../mouse.js';

const VELOCIDADE_GIRO = 0.25;   // radianos por segundo (uma volta a cada ~25 s)
const INCLINACAO_MAXIMA = 0.22; // radianos (~12°); mais que isso, o topo invade as palavras
const VIRAR_PARA_O_MOUSE = 0.7; // quanto a garrafa "olha" para o lado do cursor (radianos)
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

  // ---------- Luz que segue o cursor: o brilho "escorre" pelo vidro ----------
  const luzDoMouse = new THREE.PointLight('#fff4e6', 0, 12); // começa apagada
  luzDoMouse.position.set(0, 0, 4);
  r.cena.add(luzDoMouse);

  const interacao = criarInteracaoGarrafa(canvas, r.camera, garrafa.objeto);

  // Valores "atuais" que perseguem os alvos (interpolação a cada quadro)
  let giro = garrafa.objeto.rotation.y; // giro automático + arrasto
  let virada = 0;                       // quanto está virada para o lado do mouse
  let destaque = 0;                     // 0 = normal, 1 = cursor em cima (hover)

  r.aCadaQuadro((delta) => {
    // Interpolação: a cada quadro anda uma fração do caminho até o alvo.
    // Usar exp(-delta) deixa a suavidade igual em telas de 60 Hz ou 120 Hz.
    const fracao = 1 - Math.exp(-SUAVIDADE * delta);
    const seguir = (atual, alvo) => atual + (alvo - atual) * fracao;

    // giro: parado enquanto arrasta; sozinho no resto do tempo; + arrasto/inércia
    if (!interacao.arrastando) giro += VELOCIDADE_GIRO * delta;
    giro += interacao.giroAcumulado(delta);
    virada = seguir(virada, mouse.x * VIRAR_PARA_O_MOUSE);
    garrafa.objeto.rotation.y = giro + virada;

    // inclinação na direção do mouse
    inclinacao.rotation.z = seguir(inclinacao.rotation.z, -mouse.x * INCLINACAO_MAXIMA);
    inclinacao.rotation.x = seguir(inclinacao.rotation.x, mouse.y * INCLINACAO_MAXIMA * 0.6);

    // hover: a garrafa levanta e cresce um pouco
    destaque = seguir(destaque, interacao.hover || interacao.arrastando ? 1 : 0);
    garrafa.objeto.position.y = destaque * 0.15;
    garrafa.objeto.scale.setScalar(1 + destaque * 0.05);

    // luz: acende quando há mouse e vai até a posição dele (na frente da garrafa)
    luzDoMouse.intensity = seguir(luzDoMouse.intensity, mouse.ativo ? 18 + destaque * 14 : 0);
    luzDoMouse.position.x = seguir(luzDoMouse.position.x, mouse.x * 3.5);
    luzDoMouse.position.y = seguir(luzDoMouse.position.y, -mouse.y * 2.5);
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
