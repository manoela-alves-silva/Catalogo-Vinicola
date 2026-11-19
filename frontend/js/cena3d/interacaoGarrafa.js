// Interação direta com a garrafa: perceber o cursor em cima (hover) e girar arrastando.
import * as THREE from 'three';

const SENSIBILIDADE = 0.012; // radianos de giro por pixel arrastado
const ATRITO = 2.5;          // maior = a garrafa para de girar mais rápido depois de soltar

/**
 * @param {HTMLCanvasElement} canvas
 * @param {THREE.Camera} camera
 * @param {THREE.Object3D} objeto  a garrafa (o raio testa todas as partes dela)
 * @returns {{ hover: boolean, arrastando: boolean, giroAcumulado: (delta: number) => number }}
 */
export function criarInteracaoGarrafa(canvas, camera, objeto) {
  // Raycaster: "dispara um raio" da câmera passando pelo ponto do cursor
  // e diz quais objetos 3D ele atravessa. É assim que se clica em coisas no 3D.
  const raio = new THREE.Raycaster();
  const ponto = new THREE.Vector2();

  const estado = { hover: false, arrastando: false };
  let giroPendente = 0;  // giro vindo do arrasto, ainda não aplicado
  let velocidade = 0;    // radianos por segundo, para a inércia depois de soltar
  let ultimoX = 0;
  let ultimoTempo = 0;

  function estaSobreAGarrafa(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    // coordenadas do WebGL: de -1 a 1, com Y para cima
    ponto.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raio.setFromCamera(ponto, camera);
    return raio.intersectObject(objeto, true).length > 0;
  }

  function atualizarCursor() {
    canvas.style.cursor = estado.arrastando ? 'grabbing' : estado.hover ? 'grab' : '';
  }

  window.addEventListener('pointermove', (evento) => {
    if (estado.arrastando) {
      const agora = performance.now();
      const deslocamento = (evento.clientX - ultimoX) * SENSIBILIDADE;
      giroPendente += deslocamento;
      velocidade = deslocamento / Math.max((agora - ultimoTempo) / 1000, 0.001);
      ultimoX = evento.clientX;
      ultimoTempo = agora;
      return;
    }
    if (evento.pointerType === 'mouse') {
      estado.hover = estaSobreAGarrafa(evento.clientX, evento.clientY);
      atualizarCursor();
    }
  }, { passive: true });

  canvas.addEventListener('pointerdown', (evento) => {
    if (!estaSobreAGarrafa(evento.clientX, evento.clientY)) return;
    estado.arrastando = true;
    velocidade = 0;
    ultimoX = evento.clientX;
    ultimoTempo = performance.now();
    canvas.setPointerCapture(evento.pointerId); // continua recebendo o movimento fora do canvas
    atualizarCursor();
  });

  const soltar = () => {
    if (!estado.arrastando) return;
    estado.arrastando = false;
    // se a pessoa parou antes de soltar, não deve sair girando
    if (performance.now() - ultimoTempo > 80) velocidade = 0;
    atualizarCursor();
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);

  return {
    get hover() { return estado.hover; },
    get arrastando() { return estado.arrastando; },

    /** Quanto girar neste quadro por causa do arrasto e da inércia. */
    giroAcumulado(delta) {
      let giro = giroPendente;
      giroPendente = 0;
      if (!estado.arrastando) {
        giro += velocidade * delta;
        velocidade *= Math.exp(-ATRITO * delta); // a inércia vai morrendo aos poucos
      }
      return giro;
    },
  };
}
