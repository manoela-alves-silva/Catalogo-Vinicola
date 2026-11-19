// Garrafa 3D feita com LatheGeometry, com cor do líquido e rótulo trocáveis.
import * as THREE from 'three';
import { desenharRotulo } from './rotulo.js';

const ALTURA_TOTAL = 3.1;

/**
 * Perfil da garrafa: metade do contorno, vista de lado.
 * Cada ponto é (x = raio, y = altura). O LatheGeometry gira esses pontos
 * em volta do eixo Y e o resultado é a superfície da garrafa.
 */
function criarPerfil() {
  const pontos = [
    // base: começa no centro (raio 0) para fechar o fundo, com a quina arredondada
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.37, 0),
    new THREE.Vector2(0.41, 0.02),
    new THREE.Vector2(0.425, 0.08),
    // corpo: reto
    new THREE.Vector2(0.425, 1.65),
  ];

  // ombro: curva suave do corpo até o gargalo (curva de Bézier com 2 pontos de controle)
  const ombro = new THREE.CubicBezierCurve(
    new THREE.Vector2(0.425, 1.65),
    new THREE.Vector2(0.425, 2.15), // segura a largura por um tempo (ombro "cheio")
    new THREE.Vector2(0.14, 2.15),  // e então fecha rápido
    new THREE.Vector2(0.135, 2.55),
  );
  pontos.push(...ombro.getPoints(16).slice(1));

  pontos.push(
    // gargalo: afina bem pouco até a boca
    new THREE.Vector2(0.13, 2.95),
    // boca: um anel um pouco mais grosso, e fecha no centro
    new THREE.Vector2(0.15, 2.97),
    new THREE.Vector2(0.152, 3.08),
    new THREE.Vector2(0.13, ALTURA_TOTAL),
    new THREE.Vector2(0, ALTURA_TOTAL),
  );
  return pontos;
}

/**
 * Recorta um pedaço do perfil entre duas alturas e muda o raio.
 * Usado para o líquido (um pouco mais estreito, dentro do vidro)
 * e para a cápsula (um pouco mais larga, por fora do gargalo).
 */
function fatiarPerfil(perfil, yMin, yMax, ajustarRaio) {
  const raioEm = (y) => {
    for (let i = 1; i < perfil.length; i++) {
      const a = perfil[i - 1];
      const b = perfil[i];
      if (y >= a.y && y <= b.y && b.y !== a.y) return a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
    }
    return 0;
  };
  const dentro = perfil.filter((p) => p.y > yMin && p.y < yMax && p.x > 0);
  return [
    new THREE.Vector2(0, yMin),
    new THREE.Vector2(ajustarRaio(raioEm(yMin)), yMin),
    ...dentro.map((p) => new THREE.Vector2(ajustarRaio(p.x), p.y)),
    new THREE.Vector2(ajustarRaio(raioEm(yMax)), yMax),
    new THREE.Vector2(0, yMax),
  ];
}

/**
 * Cria a garrafa completa (vidro, líquido, rótulo e cápsula).
 * @returns {{ objeto: THREE.Group, trocarCores: Function, descartar: Function }}
 */
export function criarGarrafa({
  titulo,
  subtitulo = '',
  corLiquido = '#5B0F1E',
  corRotulo = '#E9E1D3',
  corCapsula = '#3A0D18',
  qualidade = 'alto',
  anisotropia = 1,
}) {
  const segmentos = qualidade === 'alto' ? 96 : 40; // fatias em volta do eixo
  const perfil = criarPerfil();

  // Vidro escuro. Alto: transmissão real (luz atravessa). Baixo: só transparência (mais barato).
  // A transparência simples mistura as cores de outro jeito, por isso cada modo tem o seu tom.
  const vidro = new THREE.MeshPhysicalMaterial({
    color: qualidade === 'alto' ? '#45594b' : '#1f2a23', // verde-garrafa escuro
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,            // camada de verniz: o reflexo nítido de vidro
    clearcoatRoughness: 0.04,
    ior: 1.5,                // índice de refração do vidro
    ...(qualidade === 'alto'
      ? { transmission: 0.7, thickness: 0.35 }
      : { transparent: true, opacity: 0.7 }),
  });
  const corpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, segmentos), vidro);

  // Líquido: mesmo perfil, 8% mais estreito, até a altura do ombro
  const materialLiquido = new THREE.MeshStandardMaterial({ color: corLiquido, roughness: 0.2 });
  const liquido = new THREE.Mesh(
    new THREE.LatheGeometry(fatiarPerfil(perfil, 0.05, 2.2, (r) => r * 0.92), segmentos),
    materialLiquido,
  );

  // Cápsula: cobre o gargalo e a boca, um pouco mais larga
  const capsula = new THREE.Mesh(
    new THREE.LatheGeometry(fatiarPerfil(perfil, 2.6, ALTURA_TOTAL + 0.005, (r) => r + 0.012), segmentos),
    new THREE.MeshStandardMaterial({ color: corCapsula, metalness: 0.7, roughness: 0.35 }),
  );

  // Rótulo: cilindro aberto (sem tampas) com textura desenhada em canvas.
  // thetaStart = π faz o centro da textura (u = 0.5) ficar de frente para a câmera (+Z).
  const telaRotulo = document.createElement('canvas');
  telaRotulo.width = 2048;
  telaRotulo.height = 600;
  const textura = new THREE.CanvasTexture(telaRotulo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = anisotropia; // texto nítido mesmo visto de lado
  const rotulo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.432, 0.432, 0.8, segmentos, 1, true, Math.PI),
    new THREE.MeshStandardMaterial({ map: textura, roughness: 0.75 }),
  );
  rotulo.position.y = 1.05;

  const textoRotulo = { corRotulo, titulo, subtitulo };
  desenharRotulo(telaRotulo, textoRotulo);

  // Agrupa tudo e centraliza: o ponto de giro fica no meio da garrafa
  const objeto = new THREE.Group();
  [corpo, liquido, capsula, rotulo].forEach((parte) => {
    parte.position.y -= ALTURA_TOTAL / 2;
    objeto.add(parte);
  });

  return {
    objeto,

    /** Troca cores e textos do rótulo (o que não for passado continua igual). Usado pelo catálogo. */
    trocarCores({ corLiquido: novoLiquido, corRotulo: novoRotulo, titulo: novoTitulo, subtitulo: novoSubtitulo } = {}) {
      if (novoLiquido) materialLiquido.color.set(novoLiquido);
      if (novoRotulo) textoRotulo.corRotulo = novoRotulo;
      if (novoTitulo) textoRotulo.titulo = novoTitulo;
      if (novoSubtitulo) textoRotulo.subtitulo = novoSubtitulo;
      if (novoRotulo || novoTitulo || novoSubtitulo) {
        desenharRotulo(telaRotulo, textoRotulo);
        textura.needsUpdate = true; // avisa o Three.js para reenviar a imagem à GPU
      }
    },

    /** Libera a memória da GPU quando a garrafa não for mais usada. */
    descartar() {
      objeto.traverse((parte) => {
        parte.geometry?.dispose();
        parte.material?.map?.dispose();
        parte.material?.dispose();
      });
    },
  };
}
