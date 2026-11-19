// Garrafa 3D feita com LatheGeometry, com cor do líquido e rótulo trocáveis.
import * as THREE from 'three';

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

/** Texto escuro em rótulo claro e vice-versa. */
function corDoTexto(corFundo) {
  const { r, g, b } = new THREE.Color(corFundo);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#14201A' : '#EDE6D8';
}

/** Desenha o rótulo num <canvas> 2D, que vira a textura do cilindro. */
function desenharRotulo(canvas, { corRotulo, nome, subtitulo }) {
  const ctx = canvas.getContext('2d');
  const { width: L, height: A } = canvas;
  const corTexto = corDoTexto(corRotulo);
  const centro = L / 2; // o meio da textura fica de frente para a câmera

  ctx.fillStyle = corRotulo;
  ctx.fillRect(0, 0, L, A);

  // filetes finos em cima e embaixo
  ctx.fillStyle = corTexto;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, A * 0.1, L, 3);
  ctx.fillRect(0, A * 0.9 - 3, L, 3);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // nome da vinícola: ajusta o tamanho para caber na parte da frente (~1/6 da volta)
  const larguraMaxima = L * 0.16;
  let tamanho = 120;
  ctx.font = `600 ${tamanho}px "Clash Display", sans-serif`;
  const linhas = nome.toUpperCase().split(' ');
  const maiorLinha = Math.max(...linhas.map((linha) => ctx.measureText(linha).width));
  tamanho = Math.min(tamanho, (tamanho * larguraMaxima) / maiorLinha);
  ctx.font = `600 ${tamanho}px "Clash Display", sans-serif`;
  linhas.forEach((linha, i) => {
    const y = A * 0.47 + (i - (linhas.length - 1) / 2) * tamanho * 0.95;
    ctx.fillText(linha, centro, y);
  });

  ctx.font = `500 ${Math.round(A * 0.055)}px "General Sans", sans-serif`;
  ctx.globalAlpha = 0.75;
  ctx.letterSpacing = '6px'; // navegadores sem suporte simplesmente ignoram
  ctx.fillText(subtitulo.toUpperCase(), centro, A * 0.8);
  ctx.letterSpacing = '0px';
  ctx.globalAlpha = 1;
}

/**
 * Cria a garrafa completa (vidro, líquido, rótulo e cápsula).
 * @returns {{ objeto: THREE.Group, trocarCores: Function, descartar: Function }}
 */
export function criarGarrafa({
  nome,
  subtitulo = 'Serra Gaúcha · Brasil',
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

  const textoRotulo = { corRotulo, nome, subtitulo };
  desenharRotulo(telaRotulo, textoRotulo);

  // Agrupa tudo e centraliza: o ponto de giro fica no meio da garrafa
  const objeto = new THREE.Group();
  [corpo, liquido, capsula, rotulo].forEach((parte) => {
    parte.position.y -= ALTURA_TOTAL / 2;
    objeto.add(parte);
  });

  return {
    objeto,

    /** Troca as cores (e opcionalmente o subtítulo do rótulo). Usado pelo catálogo. */
    trocarCores({ corLiquido: novoLiquido, corRotulo: novoRotulo, subtitulo: novoSubtitulo } = {}) {
      if (novoLiquido) materialLiquido.color.set(novoLiquido);
      if (novoRotulo) textoRotulo.corRotulo = novoRotulo;
      if (novoSubtitulo) textoRotulo.subtitulo = novoSubtitulo;
      if (novoRotulo || novoSubtitulo) {
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
