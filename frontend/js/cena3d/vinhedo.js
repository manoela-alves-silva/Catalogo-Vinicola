// Terreno low-poly, fileiras de videiras (InstancedMesh) e caminho.
import * as THREE from 'three';

const TAMANHO_TERRENO = 220;
const CORES_GRAMA = ['#55703f', '#5f7a47', '#6b8550', '#768d55', '#879258'];

/** Terreno: plano com vértices deslocados pelo relevo e uma cor sólida por triângulo. */
function criarTerreno(relevo, qualidade) {
  const divisoes = qualidade === 'alto' ? 140 : 70;
  let geometria = new THREE.PlaneGeometry(TAMANHO_TERRENO, TAMANHO_TERRENO, divisoes, divisoes);
  geometria.rotateX(-Math.PI / 2); // o plano nasce "em pé"; deitamos para virar chão

  const posicoes = geometria.attributes.position;
  for (let i = 0; i < posicoes.count; i++) {
    posicoes.setY(i, relevo.alturaEm(posicoes.getX(i), posicoes.getZ(i)));
  }

  // Low-poly: cada triângulo com vértices próprios → normais "retas" e cor única por face
  geometria = geometria.toNonIndexed();
  geometria.computeVertexNormals();
  const cores = new Float32Array(geometria.attributes.position.count * 3);
  const cor = new THREE.Color();
  for (let face = 0; face < cores.length / 9; face++) {
    cor.set(CORES_GRAMA[Math.floor(Math.random() * CORES_GRAMA.length)]);
    for (let v = 0; v < 3; v++) cor.toArray(cores, face * 9 + v * 3);
  }
  geometria.setAttribute('color', new THREE.BufferAttribute(cores, 3));

  return new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
}

/** Estradinha de terra: uma "fita" que acompanha a curva e o relevo. */
function criarEstrada(relevo) {
  const amostras = 400;
  const meiaLargura = 1.3;
  const vertices = [];
  const indices = [];
  const lado = new THREE.Vector3();
  const cima = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= amostras; i++) {
    const t = i / amostras;
    const p = relevo.estrada.getPointAt(t);
    lado.crossVectors(relevo.estrada.getTangentAt(t), cima).normalize(); // perpendicular ao caminho
    for (const s of [-1, 1]) {
      const x = p.x + lado.x * meiaLargura * s;
      const z = p.z + lado.z * meiaLargura * s;
      vertices.push(x, relevo.alturaEm(x, z) + 0.08, z); // um pouco acima do chão, sem "piscar"
    }
    if (i < amostras) {
      // Ordem anti-horária vista de cima → a "frente" do triângulo aponta para o céu.
      // (Na ordem contrária ela apontaria para baixo e a GPU descartaria a estrada.)
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometria.setIndex(indices);
  geometria.computeVertexNormals();
  return new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ color: '#9c7b58', roughness: 1, flatShading: true }));
}

/**
 * Videiras em fileiras. InstancedMesh = UMA geometria desenhada milhares de vezes
 * numa única chamada à GPU; cada cópia só muda posição/escala/cor (a "matriz").
 * @param {Array<{x:number,z:number,raio:number}>} clareiras  áreas sem videira (objetos das etapas)
 */
function criarVideiras(relevo, qualidade, clareiras) {
  const alto = qualidade === 'alto';
  const espacoFileira = alto ? 2.4 : 3.6;
  const espacoPlanta = alto ? 1.5 : 2.2;

  // Fileiras correndo ao longo de z, a mesma direção em que a câmera anda: do caminho,
  // elas viram linhas que convergem para o horizonte, como num vinhedo de verdade.
  const lugares = [];
  for (let x = -46; x <= 46; x += espacoFileira) {
    for (let z = -76; z <= 76; z += espacoPlanta) {
      if (relevo.distanciaDaEstrada(x, z) < 3.6) continue;
      if (clareiras.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < c.raio ** 2)) continue;
      lugares.push({ x, z, y: relevo.alturaEm(x, z) });
    }
  }

  const material = (cor) => new THREE.MeshStandardMaterial({ color: cor, flatShading: true, roughness: 0.9 });
  const troncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.08, 1, 5), material('#5a4030'), lugares.length);

  // Copa: um bloco 1×1×1 com o topo mais estreito (como uma cerca viva podada).
  // Esticado no comprimento da fileira, os blocos vizinhos se encostam numa faixa contínua.
  const formaCopa = new THREE.BoxGeometry(1, 1, 1);
  const vertices = formaCopa.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    if (vertices.getY(i) > 0) vertices.setX(i, vertices.getX(i) * 0.6);
  }
  formaCopa.computeVertexNormals();
  const copas = new THREE.InstancedMesh(formaCopa, material('#ffffff'), lugares.length);
  const comCacho = alto ? lugares.filter(() => Math.random() < 0.4) : [];
  const cachos = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), material('#4b1d3f'), Math.max(comCacho.length, 1));
  cachos.count = comCacho.length;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const tonsDeVerde = ['#3f6b35', '#4a7a3a', '#557f3c', '#3b5f33', '#62853f'].map((c) => new THREE.Color(c));

  // Copa do tamanho exato do espaço entre plantas (+2%, para não sobrar fresta);
  // a altura varia um pouco, e o topo da fileira fica levemente "ondulado".
  lugares.forEach(({ x, y, z }, i) => {
    troncos.setMatrixAt(i, m.compose(pos.set(x, y + 0.32, z), q.identity(), s.set(1, 0.65, 1)));
    const alturaCopa = 0.75 + Math.random() * 0.2;
    copas.setMatrixAt(i, m.compose(pos.set(x, y + 0.6 + alturaCopa / 2, z), q.identity(), s.set(0.6, alturaCopa, espacoPlanta * 1.02)));
    copas.setColorAt(i, tonsDeVerde[i % tonsDeVerde.length]);
  });
  comCacho.forEach(({ x, y, z }, i) => {
    const lado = Math.random() < 0.5 ? 0.3 : -0.3;
    cachos.setMatrixAt(i, m.compose(pos.set(x + lado, y + 0.6, z + (Math.random() - 0.5) * 0.8), q.identity(), s.set(1, 1.4, 1)));
  });

  const grupo = new THREE.Group();
  grupo.add(troncos, copas, cachos);
  grupo.userData.quantidade = lugares.length;
  return grupo;
}

/** Monta o cenário completo (sem os objetos das etapas). */
export function criarVinhedo({ relevo, qualidade, clareiras }) {
  const grupo = new THREE.Group();
  const videiras = criarVideiras(relevo, qualidade, clareiras);
  grupo.add(criarTerreno(relevo, qualidade), criarEstrada(relevo), videiras);
  return { grupo, quantidadeDeVideiras: videiras.userData.quantidade };
}
