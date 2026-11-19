// Cena, câmera, luzes, loop de renderização e ajuste ao redimensionar.
// Serve para qualquer canvas: hero, painel do vinho, vinhedo...
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Luz de estúdio: principal suave, recorte por trás e um ambiente fraco. */
function criarLuzes(cena) {
  // Principal: de cima/frente/direita, levemente quente, como um softbox
  const principal = new THREE.DirectionalLight('#fff1e0', 2.2);
  principal.position.set(4, 5, 6);

  // Recorte (rim light): atrás e acima, fria e forte → desenha o contorno do vidro
  const recorteEsquerda = new THREE.DirectionalLight('#dce8ff', 4);
  recorteEsquerda.position.set(-5, 3, -6);
  const recorteDireita = new THREE.DirectionalLight('#dce8ff', 2.5);
  recorteDireita.position.set(5, 2, -5);

  // Ambiente fraco: céu levemente esverdeado, chão escuro (combina com o fundo do site)
  const ambiente = new THREE.HemisphereLight('#c9d6cc', '#0e1512', 0.35);

  cena.add(principal, recorteEsquerda, recorteDireita, ambiente);
}

/**
 * Cria tudo o que uma cena 3D precisa num canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {object} opcoes
 * @param {'alto'|'baixo'} opcoes.qualidade
 * @param {string} opcoes.corFundo  mesma cor do fundo da página, para o canvas "sumir"
 * @param {number} [opcoes.campoDeVisao] graus da câmera (menor = mais "teleobjetiva")
 * @param {boolean} [opcoes.comLoop] false = sem animação: desenha só quando precisa
 * @param {Function} [opcoes.aoRedimensionar] chamada com a câmera sempre que o tamanho muda
 * @param {boolean} [opcoes.luzesDeEstudio] false = a cena traz a própria iluminação (ex.: sol)
 * @param {number} [opcoes.alcance] até que distância a câmera enxerga
 */
export function criarRenderizador(canvas, {
  qualidade,
  corFundo,
  campoDeVisao = 30,
  comLoop = true,
  aoRedimensionar,
  luzesDeEstudio = true,
  alcance = 100,
}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: qualidade === 'alto',
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // cores e brilhos com cara de foto
  renderer.toneMappingExposure = 1;
  // pixelRatio no máximo 2 (telas 3x gastariam 2,25x mais GPU sem diferença visível)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualidade === 'alto' ? 2 : 1.5));

  const cena = new THREE.Scene();
  cena.background = new THREE.Color(corFundo);

  // Reflexos de estúdio para o vidro: um "quarto" iluminado, pré-processado em mapa de ambiente
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.35; // fraco: só para o vidro ter onde refletir
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(campoDeVisao, 1, 0.1, alcance);
  camera.position.set(0, 0, 10);

  if (luzesDeEstudio) criarLuzes(cena);

  // ---------- Loop ----------
  const atualizadores = []; // funções chamadas a cada quadro: (segundosDesdeUltimoQuadro, tempoTotal)
  let ultimoTempo = performance.now();
  let rodando = false;
  let visivel = true;

  function quadro(agora) {
    const delta = Math.min((agora - ultimoTempo) / 1000, 0.1); // limita para não "pular" após uma pausa
    ultimoTempo = agora;
    atualizadores.forEach((atualizar) => atualizar(delta, agora / 1000));
    renderer.render(cena, camera);
  }

  function iniciarLoop() {
    if (rodando || !visivel) return;
    rodando = true;
    ultimoTempo = performance.now();
    renderer.setAnimationLoop(quadro);
  }

  function pausarLoop() {
    rodando = false;
    renderer.setAnimationLoop(null);
  }

  // ---------- Tamanho ----------
  function ajustarTamanho() {
    const largura = canvas.clientWidth;
    const altura = canvas.clientHeight;
    if (!largura || !altura) return;
    renderer.setSize(largura, altura, false); // false = não mexe no CSS do canvas
    camera.aspect = largura / altura;
    aoRedimensionar?.(camera);
    camera.updateProjectionMatrix();
    if (!rodando) renderer.render(cena, camera); // mantém a imagem certa mesmo pausado
  }
  const observadorTamanho = new ResizeObserver(ajustarTamanho);
  observadorTamanho.observe(canvas);
  ajustarTamanho();

  // ---------- Pausa fora da tela ----------
  let pausadoManualmente = !comLoop;
  const observadorTela = new IntersectionObserver(([entrada]) => {
    visivel = entrada.isIntersecting;
    if (visivel && !pausadoManualmente) iniciarLoop();
    else pausarLoop();
  });
  observadorTela.observe(canvas);

  return {
    THREE,
    cena,
    camera,
    renderer,
    /** Registra uma função que roda a cada quadro. */
    aCadaQuadro: (funcao) => atualizadores.push(funcao),
    /** Desenha um único quadro (útil com movimento reduzido, sem loop). */
    desenhar: () => renderer.render(cena, camera),
    iniciar: () => { pausadoManualmente = false; iniciarLoop(); },
    pausar: () => { pausadoManualmente = true; pausarLoop(); },
    destruir() {
      pausarLoop();
      observadorTamanho.disconnect();
      observadorTela.disconnect();
      renderer.dispose();
    },
  };
}
