// Terreno, estrada e montagem do cenário (videiras e árvores vêm de módulos próprios).
import * as THREE from 'three';
import { ruido } from './relevo.js';
import { criarVideiras } from './videiras.js';
import { criarArvores } from './arvores.js';

const TAMANHO_TERRENO = 220;
const COR = {
  grama: new THREE.Color('#5f7b45'),
  gramaClara: new THREE.Color('#7f9353'),
  gramaSeca: new THREE.Color('#a39b63'),
  encosta: new THREE.Color('#4b6538'),
  terra: new THREE.Color('#8f7656'),
};

const suave = (a, b, t) => {
  const k = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
};

/**
 * Terreno com sombreamento liso e cores que mudam aos poucos (nada de "xadrez"):
 * - dois tons de grama misturados por um ruído de baixa frequência
 * - manchas de grama seca
 * - encostas íngremes mais escuras (a normal do vértice diz o quanto o chão está inclinado)
 * - beira da estrada puxando para a cor de terra
 */
function criarTerreno(relevo, qualidade, sombras) {
  const divisoes = qualidade === 'alto' ? 160 : 80;
  const geometria = new THREE.PlaneGeometry(TAMANHO_TERRENO, TAMANHO_TERRENO, divisoes, divisoes);
  geometria.rotateX(-Math.PI / 2); // o plano nasce "em pé"; deitamos para virar chão

  const posicoes = geometria.attributes.position;
  for (let i = 0; i < posicoes.count; i++) {
    posicoes.setY(i, relevo.alturaEm(posicoes.getX(i), posicoes.getZ(i)));
  }
  geometria.computeVertexNormals();

  const normais = geometria.attributes.normal;
  const cores = new Float32Array(posicoes.count * 3);
  const cor = new THREE.Color();
  for (let i = 0; i < posicoes.count; i++) {
    const x = posicoes.getX(i);
    const z = posicoes.getZ(i);
    cor.copy(COR.grama).lerp(COR.gramaClara, ruido(x * 0.05, z * 0.05));
    cor.lerp(COR.gramaSeca, suave(0.6, 0.85, ruido(x * 0.11 + 40, z * 0.11)) * 0.7);
    cor.lerp(COR.encosta, suave(0.97, 0.88, normais.getY(i))); // normal.y = 1 é chão plano
    cor.lerp(COR.terra, suave(3.6, 1.8, relevo.distanciaDaEstrada(x, z)) * 0.8);
    cor.toArray(cores, i * 3);
  }
  geometria.setAttribute('color', new THREE.BufferAttribute(cores, 3));

  const terreno = new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  terreno.receiveShadow = sombras;
  return terreno;
}

/** Estradinha de terra: uma "fita" que acompanha a curva e o relevo. */
function criarEstrada(relevo, sombras) {
  const amostras = 500;
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
  const estrada = new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ color: '#a8885f', roughness: 1 }));
  estrada.receiveShadow = sombras;
  return estrada;
}

/** Monta o cenário completo (sem os objetos das etapas). */
export function criarVinhedo({ relevo, qualidade, clareiras }) {
  const sombras = qualidade === 'alto';
  const grupo = new THREE.Group();
  const videiras = criarVideiras({ relevo, qualidade, clareiras, sombras });
  grupo.add(
    criarTerreno(relevo, qualidade, sombras),
    criarEstrada(relevo, sombras),
    videiras.grupo,
    criarArvores({ relevo, qualidade, sombras }),
  );
  return { grupo, quantidadeDeVideiras: videiras.quantidade };
}
