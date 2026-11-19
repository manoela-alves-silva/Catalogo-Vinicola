// "Estúdio fotográfico" em volta da garrafa: halo de luz atrás e poça de luz/sombra no chão.
import * as THREE from 'three';

/** Gradiente radial desenhado num canvas 2D, usado como textura. */
function texturaRadial(paradas, tamanho = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tamanho;
  const ctx = canvas.getContext('2d');
  const meio = tamanho / 2;
  const gradiente = ctx.createRadialGradient(meio, meio, 0, meio, meio, meio);
  paradas.forEach(([posicao, cor]) => gradiente.addColorStop(posicao, cor));
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, tamanho, tamanho);
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

/**
 * @param {string} corFundo  cor do fundo da página: o halo termina exatamente nela
 * @param {number} alturaDaBase  y onde a garrafa encosta no "chão"
 */
export function criarEstudio({ corFundo, alturaDaBase }) {
  const grupo = new THREE.Group();

  // Halo: OPACO (não transparente), indo do quente no centro até a cor exata do fundo.
  // Por ser opaco, o vidro com transmissão "enxerga" o halo através dele: contraluz real.
  // toneMapped: false garante que a borda fique idêntica ao fundo (sem emenda visível).
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({
      map: texturaRadial([[0, '#3b3a2e'], [0.35, '#232821'], [1, corFundo]]),
      toneMapped: false,
    }),
  );
  halo.position.set(0, 0.3, -3);
  grupo.add(halo);

  // Chão invisível: só aparece a luz que "bate" nele, uma elipse suave sob a garrafa
  const deitar = (malha) => { malha.rotation.x = -Math.PI / 2; malha.position.y = alturaDaBase; return malha; };
  const pocaDeLuz = deitar(new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({
      map: texturaRadial([[0, 'rgba(255,240,220,0.22)'], [1, 'rgba(255,240,220,0)']], 256),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  ));

  // Sombra de contato: um "borrão" escuro bem embaixo da base, que "assenta" a garrafa
  const materialSombra = new THREE.MeshBasicMaterial({
    map: texturaRadial([[0, 'rgba(0,0,0,0.85)'], [0.5, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']], 256),
    transparent: true,
    depthWrite: false,
  });
  const sombra = deitar(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), materialSombra));
  sombra.position.y += 0.002; // um fio acima da poça, para não "brigar" com ela

  grupo.add(pocaDeLuz, sombra);

  return {
    grupo,
    halo,
    /** Garrafa levantada (hover) → sombra mais fraca e mais espalhada, como na vida real. */
    ajustarSombra(elevacao) {
      materialSombra.opacity = 1 - elevacao * 0.6;
      sombra.scale.setScalar(1 + elevacao * 0.4);
    },
  };
}
