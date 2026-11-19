// Relevo do vinhedo: traçado da estrada e altura do terreno em qualquer ponto.
// Terreno, estrada, videiras e objetos usam a MESMA função alturaEm(), então tudo
// fica apoiado no chão, sem flutuar nem afundar.
import * as THREE from 'three';

// Traçado da estrada visto de cima (x, z). A câmera percorre de z = +70 até z = -75.
const PONTOS_DA_ESTRADA = [
  [-8, 72], [5, 48], [-6, 24], [7, 0], [-5, -26], [6, -52], [0, -78],
];

// ---------- Ruído ----------
// "Ruído de valor": sorteia um número fixo em cada ponto inteiro da grade e
// interpola suavemente entre eles. O resultado parece aleatório, mas é contínuo
// (sem degraus) e sempre igual para o mesmo (x, z), então dá colinas suaves.
function sorteio(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s); // de 0 a 1
}

export function ruido(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx); // curva "S": suaviza a passagem entre os pontos
  const v = fz * fz * (3 - 2 * fz);
  const a = sorteio(xi, zi);
  const b = sorteio(xi + 1, zi);
  const c = sorteio(xi, zi + 1);
  const d = sorteio(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Colinas: soma de ruídos em escalas diferentes (grande + médio + detalhe). */
function colinas(x, z) {
  return ruido(x * 0.025, z * 0.025) * 9
    + ruido(x * 0.07, z * 0.07) * 2.5
    + ruido(x * 0.2, z * 0.2) * 0.4
    + Math.abs(x) * 0.06 // as laterais sobem um pouco: o vale "abraça" a estrada
    - 6;
}

const suavizar = (a, b, t) => {
  const k = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
};

export function criarRelevo() {
  const estrada = new THREE.CatmullRomCurve3(
    PONTOS_DA_ESTRADA.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  );

  // Amostras da estrada (de cima) com a altura das colinas em cada uma
  const amostras = estrada.getSpacedPoints(300).map((p) => ({ x: p.x, z: p.z, y: colinas(p.x, p.z) }));

  /** Distância (de cima) até a estrada e a altura dela no ponto mais próximo. */
  function maisProximoDaEstrada(x, z) {
    let menor = Infinity;
    let altura = 0;
    for (const a of amostras) {
      const d = (a.x - x) ** 2 + (a.z - z) ** 2;
      if (d < menor) { menor = d; altura = a.y; }
    }
    return { distancia: Math.sqrt(menor), altura };
  }

  // Clareiras: áreas planas onde ficam os objetos das etapas (cestos, tanques...)
  const clareiras = [];

  /** Altura do terreno em (x, z): colinas, aplainadas perto da estrada e nas clareiras. */
  function alturaEm(x, z) {
    const { distancia, altura } = maisProximoDaEstrada(x, z);
    const peso = suavizar(2, 7, distancia); // 0 na estrada, 1 a partir de 7 m dela
    let h = altura + (colinas(x, z) - altura) * peso;
    for (const c of clareiras) {
      const pesoClareira = suavizar(c.raio * 0.6, c.raio, Math.hypot(c.x - x, c.z - z));
      h = c.altura + (h - c.altura) * pesoClareira;
    }
    return h;
  }

  /** Aplaina um círculo do terreno (chamar ANTES de criar o terreno). */
  function adicionarClareira(x, z, raio) {
    clareiras.push({ x, z, raio, altura: alturaEm(x, z) });
  }

  /** Ponto da estrada (já na altura do chão) numa fração t de 0 a 1 do caminho. */
  function pontoDaEstrada(t) {
    const p = estrada.getPointAt(Math.min(Math.max(t, 0), 1));
    p.y = alturaEm(p.x, p.z);
    return p;
  }

  return {
    estrada,
    clareiras,
    alturaEm,
    adicionarClareira,
    pontoDaEstrada,
    distanciaDaEstrada: (x, z) => maisProximoDaEstrada(x, z).distancia,
  };
}
