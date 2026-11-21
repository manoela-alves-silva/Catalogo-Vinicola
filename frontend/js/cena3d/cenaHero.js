// Cena do hero: a garrafa num "estúdio" (halo de luz + chão), girando sozinha, reagindo
// ao mouse (inclina, vira, levanta, pode ser arrastada), com uma luz que segue o cursor,
// anotações técnicas presas a ela e subindo/diminuindo ao rolar.
import { criarRenderizador } from './renderizador.js';
import { criarGarrafa } from './garrafa.js';
import { criarInteracaoGarrafa } from './interacaoGarrafa.js';
import { criarEstudio } from './estudio.js';
import { criarAnotacoesHero } from './anotacoesHero.js';
import { mouse } from '../mouse.js';

const VELOCIDADE_GIRO = 0.25;   // radianos por segundo (uma volta a cada ~25 s)
const INCLINACAO_MAXIMA = 0.22; // radianos (~12°); mais que isso, o topo invade as palavras
const VIRAR_PARA_O_MOUSE = 0.7; // quanto a garrafa "olha" para o lado do cursor (radianos)
const SUAVIDADE = 3;            // maior = segue o mouse mais rápido
const BASE_DA_GARRAFA = -1.55;  // a garrafa tem 3,1 de altura e o centro dela fica no 0

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
 * Lê o vinho em destaque da ficha no HTML (único lugar com esses dados no hero).
 * O nome vai no rótulo 3D; uva e safra viram o subtítulo do rótulo.
 */
function lerVinhoDestaque(ficha) {
  const campo = (nome) => ficha?.querySelector(`[data-campo="${nome}"]`)?.textContent.trim() ?? '';
  return {
    titulo: ficha?.dataset.vinho ?? '',
    subtitulo: [campo('uva'), campo('safra')].filter(Boolean).join(' · '),
  };
}

/**
 * Monta a cena da garrafa no canvas do hero.
 * Hierarquia:  subida (rolagem) → inclinacao (mouse) → elevacao (hover) → garrafa (giro)
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
  const ficha = canvas.closest('section').querySelector('.hero-ficha');

  const garrafa = criarGarrafa({
    ...lerVinhoDestaque(ficha),
    qualidade,
    anisotropia: r.renderer.capabilities.getMaxAnisotropy(),
  });
  garrafa.objeto.rotation.y = -0.5; // começa levemente virada: o rótulo aparece em perspectiva

  const subida = new THREE.Group();
  const inclinacao = new THREE.Group();
  const elevacao = new THREE.Group();
  elevacao.add(garrafa.objeto);
  inclinacao.add(elevacao);
  subida.add(inclinacao);
  r.cena.add(subida);

  // Estúdio: halo atrás e chão sob a garrafa. Fica na "subida" (acompanha a rolagem),
  // mas fora da inclinação (o chão não deve entortar junto com a garrafa).
  const estudio = criarEstudio({ corFundo, alturaDaBase: BASE_DA_GARRAFA });
  subida.add(estudio.grupo);

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
  const atualizarAnotacoes = ficha ? criarAnotacoesHero(ficha, elevacao, r.camera, canvas) : () => {};

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

    // hover: a garrafa levanta e cresce um pouco; a sombra no chão fica mais fraca
    destaque = seguir(destaque, interacao.hover || interacao.arrastando ? 1 : 0);
    elevacao.position.y = destaque * 0.15;
    elevacao.scale.setScalar(1 + destaque * 0.05);
    estudio.ajustarSombra(destaque);

    // halo acompanha de leve o mouse, como se a luz de fundo se mexesse
    estudio.halo.position.x = seguir(estudio.halo.position.x, mouse.x * 0.5);

    // luz: acende quando há mouse e vai até a posição dele (na frente da garrafa)
    luzDoMouse.intensity = seguir(luzDoMouse.intensity, mouse.ativo ? 18 + destaque * 14 : 0);
    luzDoMouse.position.x = seguir(luzDoMouse.position.x, mouse.x * 3.5);
    luzDoMouse.position.y = seguir(luzDoMouse.position.y, -mouse.y * 2.5);

    // as anotações precisam das posições já atualizadas deste quadro
    subida.updateMatrixWorld();
    atualizarAnotacoes();
  });

  // ---------- Entrada: a garrafa sobe suavemente, o canvas aparece e depois a ficha ----------
  // Fica pausada até o preloader sair da frente (o main.js chama revelar()).
  // Com movimento reduzido não há entrada: sem o loop, a garrafa ficaria parada lá embaixo.
  if (movimentoReduzido) return { revelar() {} };
  const entrada = gsap.timeline({ paused: true, delay: 0.3 })
    .from(inclinacao.position, { y: -1.2, duration: 1.8, ease: 'expo.out' }, 0)
    .from(canvas, { opacity: 0, duration: 1.2 }, 0);
  if (ficha) entrada.from(ficha.querySelectorAll('.hero-anotacao'), { opacity: 0, duration: 1, stagger: 0.15 }, 1.3);

  // ---------- Rolagem: enquanto o hero sai da tela, a garrafa sobe e diminui ----------
  const saida = gsap.timeline({
    scrollTrigger: {
      trigger: canvas.closest('section'),
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  })
    .to(subida.position, { y: 1.4, ease: 'none' }, 0)
    .to(subida.scale, { x: 0.6, y: 0.6, z: 0.6, ease: 'none' }, 0);
  if (ficha) saida.to(ficha, { opacity: 0, duration: 0.3, ease: 'none' }, 0); // a ficha some logo no começo

  return { revelar: () => entrada.play() };
}
