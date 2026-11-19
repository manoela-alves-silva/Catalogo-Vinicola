// Objetos low-poly de cada etapa, ao lado da estrada:
// pedras (Terroir), pérgola com cachos (Videira), cestos (Colheita),
// tanques de inox (Fermentação), barris (Barricas) e caixas com garrafas (Engarrafamento).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const mat =(cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, flatShading: true, roughness: 0.85, ...extra });
const MATERIAIS = {
  pedra: mat('#4d4f4b'),
  madeira: mat('#8a6340'),
  madeiraClara: mat('#b08a5a'),
  vime: mat('#a3804f', { side: THREE.DoubleSide }),
  uva: mat('#4b1d3f', { roughness: 0.5 }),
  folha: mat('#4f7a3a'),
  inox: mat('#c9ced3', { metalness: 0.85, roughness: 0.28, flatShading: false }),
  aro: mat('#2d2a27', { metalness: 0.6, roughness: 0.4 }),
  vidro: mat('#1f3326', { roughness: 0.25 }),
  capsula: mat('#5b0f1e'),
};

/** Atalho: cria uma malha já posicionada dentro de um grupo. */
function peca(grupo, geometria, material, [x, y, z], rotacao = [0, 0, 0]) {
  const malha = new THREE.Mesh(geometria, material);
  malha.position.set(x, y, z);
  malha.rotation.set(...rotacao);
  grupo.add(malha);
  return malha;
}

/** Cacho de uva: bolinhas em forma de cone, de cabeça para baixo. */
function cacho(grupo, [x, y, z], tamanho = 1) {
  const bago = new THREE.IcosahedronGeometry(0.09 * tamanho, 0);
  for (let camada = 0; camada < 4; camada++) {
    const raio = (0.16 - camada * 0.04) * tamanho;
    const quantos = 6 - camada;
    for (let i = 0; i < quantos; i++) {
      const a = (i / quantos) * Math.PI * 2 + camada;
      peca(grupo, bago, MATERIAIS.uva, [x + Math.cos(a) * raio, y - camada * 0.12 * tamanho, z + Math.sin(a) * raio]);
    }
  }
}

const ELEMENTOS = {
  terroir(g) {
    // pedras de basalto meio enterradas
    [[0, 0, 1.1], [1.6, 0.8, 0.7], [-1.4, 0.5, 0.8], [0.6, -1.4, 0.5], [-0.5, 1.6, 0.45], [2.4, -0.6, 0.4]]
      .forEach(([x, z, r], i) => peca(g, new THREE.DodecahedronGeometry(r, 0), MATERIAIS.pedra, [x, r * 0.35, z], [i, i * 2, 0]));
  },

  videira(g) {
    // pérgola: dois postes, uma trave e folhas com cachos grandes pendurados
    const poste = new THREE.BoxGeometry(0.16, 2.4, 0.16);
    peca(g, poste, MATERIAIS.madeira, [-1.4, 1.2, 0]);
    peca(g, poste, MATERIAIS.madeira, [1.4, 1.2, 0]);
    peca(g, new THREE.BoxGeometry(3.2, 0.14, 0.14), MATERIAIS.madeira, [0, 2.35, 0]);
    for (let i = 0; i < 6; i++) {
      peca(g, new THREE.IcosahedronGeometry(0.45, 0), MATERIAIS.folha, [-1.25 + i * 0.5, 2.45, (i % 2) * 0.2 - 0.1]);
    }
    [-0.8, 0, 0.8].forEach((x) => cacho(g, [x, 2.05, 0.15], 1.6));
  },

  colheita(g) {
    // cestos de vime cheios de uva
    const cesto = new THREE.CylinderGeometry(0.42, 0.32, 0.5, 9, 1, true);
    const fundo = new THREE.CircleGeometry(0.32, 9);
    const bago = new THREE.IcosahedronGeometry(0.13, 0);
    [[0, 0], [1.1, 0.4], [-1, 0.5], [0.4, 1.2]].forEach(([x, z]) => {
      peca(g, cesto, MATERIAIS.vime, [x, 0.25, z]);
      peca(g, fundo, MATERIAIS.vime, [x, 0.01, z], [-Math.PI / 2, 0, 0]);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
        const r = i === 0 ? 0 : 0.22;
        peca(g, bago, MATERIAIS.uva, [x + Math.cos(a) * r, 0.5 + (i === 0 ? 0.1 : 0), z + Math.sin(a) * r]);
      }
    });
  },

  fermentacao(g) {
    // tanques de inox com tampa cônica, apoiados em pés
    const corpo = new THREE.CylinderGeometry(0.8, 0.8, 2.6, 24);
    const tampa = new THREE.ConeGeometry(0.8, 0.6, 24);
    const pe = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6);
    [[-2, 0], [0, -0.6], [2, 0]].forEach(([x, z]) => {
      peca(g, corpo, MATERIAIS.inox, [x, 1.9, z]);
      peca(g, tampa, MATERIAIS.inox, [x, 3.5, z]);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        peca(g, pe, MATERIAIS.inox, [x + Math.cos(a) * 0.6, 0.3, z + Math.sin(a) * 0.6]);
      }
    });
  },

  barricas(g) {
    // barris deitados: perfil "barrigudo" girado (o mesmo truque da garrafa), com aros escuros
    const perfil = [[0, -0.55], [0.4, -0.55], [0.47, -0.3], [0.5, 0], [0.47, 0.3], [0.4, 0.55], [0, 0.55]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const barril = new THREE.LatheGeometry(perfil, 14);
    const aro = new THREE.TorusGeometry(0.46, 0.025, 4, 16);
    const posicoes = [[-2.2, 0.5], [-1.1, 0.5], [0, 0.5], [1.1, 0.5], [2.2, 0.5], [-1.65, 1.38], [-0.55, 1.38], [0.55, 1.38], [1.65, 1.38]];
    posicoes.forEach(([x, y]) => {
      peca(g, barril, MATERIAIS.madeira, [x, y, 0], [Math.PI / 2, 0, 0]); // deitado: eixo apontando para a estrada
      [-0.32, 0.32].forEach((dz) => peca(g, aro, MATERIAIS.aro, [x, y, dz]));
    });
    peca(g, new THREE.BoxGeometry(5.4, 0.08, 0.9), MATERIAIS.madeira, [0, 0.04, 0]); // base
  },

  engarrafamento(g) {
    // caixas de madeira com garrafas aparecendo por cima
    const caixa = new THREE.BoxGeometry(1.2, 0.55, 0.8);
    const corpo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8);
    const gargalo = new THREE.CylinderGeometry(0.03, 0.04, 0.18, 6);
    [[-0.7, 0.275, 0], [0.7, 0.275, 0], [0, 0.825, 0], [1.6, 0.275, 0.9]].forEach(([x, y, z]) => {
      peca(g, caixa, MATERIAIS.madeiraClara, [x, y, z]);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          const bx = x - 0.42 + i * 0.28;
          const bz = z - 0.24 + j * 0.24;
          peca(g, corpo, MATERIAIS.vidro, [bx, y + 0.2, bz]);
          peca(g, gargalo, MATERIAIS.capsula, [bx, y + 0.5, bz]);
        }
      }
    });
  },
};

/**
 * Coloca os objetos das etapas nos lugares indicados.
 * @param {Array<{chave:string,x:number,z:number,angulo:number}>} lugares
 */
export function criarElementosEtapas(relevo, lugares) {
  const montagem = new THREE.Group();
  lugares.forEach(({ chave, x, z, angulo }) => {
    const elemento = new THREE.Group();
    ELEMENTOS[chave](elemento);
    elemento.position.set(x, relevo.alturaEm(x, z), z);
    elemento.rotation.y = angulo; // de frente para a estrada
    montagem.add(elemento);
  });
  return juntarPorMaterial(montagem);
}

/**
 * Otimização: centenas de pecinhas = centenas de chamadas de desenho à GPU.
 * Aqui juntamos todas as peças que usam o mesmo material numa geometria só
 * (já na posição final), e a cena inteira de objetos vira ~10 chamadas.
 */
function juntarPorMaterial(montagem) {
  montagem.updateMatrixWorld(true);
  const porMaterial = new Map();
  montagem.traverse((malha) => {
    if (!malha.isMesh) return;
    let geometria = malha.geometry.index ? malha.geometry.toNonIndexed() : malha.geometry.clone();
    geometria.applyMatrix4(malha.matrixWorld);
    if (!porMaterial.has(malha.material)) porMaterial.set(malha.material, []);
    porMaterial.get(malha.material).push(geometria);
  });

  const grupo = new THREE.Group();
  porMaterial.forEach((geometrias, material) => {
    grupo.add(new THREE.Mesh(mergeGeometries(geometrias), material));
    geometrias.forEach((g) => g.dispose());
  });
  return grupo;
}
