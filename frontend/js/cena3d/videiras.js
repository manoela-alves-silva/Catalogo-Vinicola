// Videiras em fileiras (espaldeira): tronco, copa "fofa", cachos e postes.
// Tudo com InstancedMesh: UMA geometria desenhada milhares de vezes numa única
// chamada à GPU; cada cópia só muda posição/escala/cor (a "matriz").
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ruido } from './relevo.js';

const PLANTAS_POR_POSTE = 4;

/**
 * Copa orgânica: uma esfera com a superfície "amassada" por ruído.
 * mergeVertices junta os vértices repetidos das faces vizinhas; assim o ruído
 * desloca cada ponto uma vez só (sem rachar) e as normais ficam lisas.
 */
function criarFormaCopa() {
  let forma = new THREE.IcosahedronGeometry(0.5, 2);
  forma.deleteAttribute('normal');
  forma.deleteAttribute('uv');
  forma = mergeVertices(forma);
  const p = forma.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const amassado = 1 + (ruido(v.x * 6 + 10, v.y * 6 + v.z * 6) - 0.5) * 0.45;
    v.multiplyScalar(amassado);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  forma.computeVertexNormals();
  return forma;
}

/**
 * @param {Array<{x:number,z:number,raio:number}>} clareiras  áreas sem videira (objetos das etapas)
 */
export function criarVideiras({ relevo, qualidade, clareiras, sombras }) {
  const alto = qualidade === 'alto';
  const espacoFileira = alto ? 2.4 : 3.6;
  const espacoPlanta = alto ? 1.3 : 2;

  // Fileiras correndo ao longo de z, a mesma direção em que a câmera anda: do caminho,
  // elas viram linhas que convergem para o horizonte, como num vinhedo de verdade.
  const plantas = [];
  const postes = [];
  for (let x = -46; x <= 46; x += espacoFileira) {
    let naFileira = 0;
    for (let z = -76; z <= 76; z += espacoPlanta) {
      const livre = relevo.distanciaDaEstrada(x, z) >= 3.6
        && !clareiras.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < c.raio ** 2);
      if (!livre) { naFileira = 0; continue; }
      const y = relevo.alturaEm(x, z);
      plantas.push({ x, y, z });
      if (naFileira % PLANTAS_POR_POSTE === 0) postes.push({ x, y, z: z - espacoPlanta / 2 });
      naFileira++;
    }
  }

  const material = (cor, extra) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, ...extra });
  const instancias = (geometria, mat, quantidade) => {
    const malha = new THREE.InstancedMesh(geometria, mat, Math.max(quantidade, 1));
    malha.count = quantidade;
    malha.castShadow = sombras;
    malha.receiveShadow = sombras;
    return malha;
  };

  const troncos = instancias(new THREE.CylinderGeometry(0.04, 0.07, 1, 6), material('#5b4331'), plantas.length);
  const copas = instancias(criarFormaCopa(), material('#ffffff', { roughness: 0.8 }), plantas.length);
  const comCacho = alto ? plantas.filter(() => Math.random() < 0.35) : [];
  const cachos = instancias(new THREE.IcosahedronGeometry(0.11, 1), material('#3d1734', { roughness: 0.45 }), comCacho.length);
  const mastros = instancias(new THREE.BoxGeometry(0.08, 1.7, 0.08), material('#7b6b58'), postes.length);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const eixoY = new THREE.Vector3(0, 1, 0);
  const verde = new THREE.Color();

  plantas.forEach(({ x, y, z }, i) => {
    troncos.setMatrixAt(i, m.compose(pos.set(x, y + 0.32, z), q.identity(), s.set(1, 0.65, 1)));
    // copa: comprida na fileira e 35% maior que o espaço entre plantas → as copas se sobrepõem
    s.set(0.7 + Math.random() * 0.1, 0.85 + Math.random() * 0.2, espacoPlanta * 1.35);
    copas.setMatrixAt(i, m.compose(pos.set(x, y + 1.05, z), q.setFromAxisAngle(eixoY, (Math.random() - 0.5) * 0.3), s));
    // verde-oliva escuro de folha de videira (a luz do sol e o tone mapping clareiam bastante)
    verde.setHSL(0.25 + Math.random() * 0.04, 0.32 + Math.random() * 0.1, 0.17 + Math.random() * 0.05);
    copas.setColorAt(i, verde);
  });
  comCacho.forEach(({ x, y, z }, i) => {
    const lado = Math.random() < 0.5 ? 0.32 : -0.32;
    cachos.setMatrixAt(i, m.compose(pos.set(x + lado, y + 0.62, z + (Math.random() - 0.5) * 0.8), q.identity(), s.set(1, 1.5, 1)));
  });
  postes.forEach(({ x, y, z }, i) => {
    mastros.setMatrixAt(i, m.compose(pos.set(x, y + 0.75, z), q.identity(), s.set(1, 1, 1)));
  });

  const grupo = new THREE.Group();
  grupo.add(troncos, copas, cachos, mastros);
  return { grupo, quantidade: plantas.length };
}
