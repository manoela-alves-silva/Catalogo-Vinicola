// Árvores em volta do vinhedo: araucárias (a árvore símbolo da serra gaúcha) nas colinas
// e algumas árvores de copa redonda nas bordas. Também com InstancedMesh.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ruido } from './relevo.js';

/** Copa da araucária: o "guarda-chuva" achatado, feito girando um perfil (LatheGeometry). */
function criarCopaAraucaria() {
  const perfil = [[0, -0.15], [1.2, 0.05], [2.3, 0.35], [2.6, 0.6], [2.1, 0.85], [1.1, 1], [0, 1.05]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(perfil, 12);
}

function criarCopaRedonda() {
  let forma = new THREE.IcosahedronGeometry(1, 1);
  forma.deleteAttribute('normal');
  forma.deleteAttribute('uv');
  forma = mergeVertices(forma);
  const p = forma.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).multiplyScalar(1 + (ruido(v.x * 3 + 5, v.y * 3 + v.z * 3) - 0.5) * 0.35);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  forma.computeVertexNormals();
  return forma;
}

/** Sorteia lugares longe da estrada e fora da área das videiras. */
function sortearLugares(relevo, quantidade, aceitar) {
  const lugares = [];
  for (let tentativa = 0; lugares.length < quantidade && tentativa < quantidade * 40; tentativa++) {
    const x = (Math.random() - 0.5) * 210;
    const z = (Math.random() - 0.5) * 210;
    if (relevo.distanciaDaEstrada(x, z) < 12 || !aceitar(x, z)) continue;
    lugares.push({ x, z, y: relevo.alturaEm(x, z), escala: 0.75 + Math.random() * 0.5 });
  }
  return lugares;
}

export function criarArvores({ relevo, qualidade, sombras }) {
  const alto = qualidade === 'alto';
  const foraDoVinhedo = (x) => Math.abs(x) > 50;
  const araucarias = sortearLugares(relevo, alto ? 90 : 40, foraDoVinhedo);
  const redondas = sortearLugares(relevo, alto ? 70 : 30, (x) => Math.abs(x) > 47 && Math.abs(x) < 70);

  const material = (cor) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.9 });
  const instancias = (geometria, mat, n) => {
    const malha = new THREE.InstancedMesh(geometria, mat, n);
    malha.castShadow = sombras;
    return malha;
  };
  const caule = new THREE.CylinderGeometry(0.12, 0.2, 1, 6);
  const troncosA = instancias(caule, material('#4e3b2c'), araucarias.length);
  const copasA = instancias(criarCopaAraucaria(), material('#2c4429'), araucarias.length);
  const troncosR = instancias(caule, material('#4e3b2c'), redondas.length);
  const copasR = instancias(criarCopaRedonda(), material('#3d5b31'), redondas.length);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const eixoY = new THREE.Vector3(0, 1, 0);

  araucarias.forEach(({ x, y, z, escala }, i) => {
    const altura = 9 * escala; // araucárias são altas e com o tronco reto e nu
    troncosA.setMatrixAt(i, m.compose(p.set(x, y + altura / 2, z), q.identity(), s.set(escala, altura, escala)));
    q.setFromAxisAngle(eixoY, Math.random() * Math.PI);
    copasA.setMatrixAt(i, m.compose(p.set(x, y + altura - 0.3, z), q, s.set(escala, escala * 1.3, escala)));
  });
  redondas.forEach(({ x, y, z, escala }, i) => {
    troncosR.setMatrixAt(i, m.compose(p.set(x, y + 1.2 * escala, z), q.identity(), s.set(escala, 2.4 * escala, escala)));
    copasR.setMatrixAt(i, m.compose(p.set(x, y + 3.2 * escala, z), q.identity(), s.set(1.8 * escala, 1.5 * escala, 1.8 * escala)));
  });

  const grupo = new THREE.Group();
  grupo.add(troncosA, copasA, troncosR, copasR);
  return grupo;
}
