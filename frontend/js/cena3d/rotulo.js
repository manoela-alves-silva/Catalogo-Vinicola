// Rótulo da garrafa: desenhado num <canvas> 2D que vira a textura do cilindro.
import * as THREE from 'three';

/** Texto escuro em rótulo claro e vice-versa. */
function corDoTexto(corFundo) {
  const { r, g, b } = new THREE.Color(corFundo);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#14201A' : '#EDE6D8';
}

/**
 * Quebra o nome em linhas de até ~14 letras, juntando palavras curtas na mesma linha.
 * "Encosta Velha Cabernet Franc Reserva" → ["ENCOSTA VELHA", "CABERNET FRANC", "RESERVA"]
 */
function quebrarEmLinhas(texto, maximo = 14) {
  const linhas = [];
  let atual = '';
  texto.split(' ').forEach((palavra) => {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (tentativa.length > maximo && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  });
  linhas.push(atual);
  return linhas;
}

/** Desenha o rótulo num <canvas> 2D, que vira a textura do cilindro. */
export function desenharRotulo(canvas, { corRotulo, titulo, subtitulo }) {
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

  // título: ajusta o tamanho para caber na parte da frente (~1/6 da volta) e na altura do rótulo
  const larguraMaxima = L * 0.16;
  const alturaMaxima = A * 0.5;
  let tamanho = 120;
  ctx.font = `600 ${tamanho}px "Clash Display", sans-serif`;
  const linhas = quebrarEmLinhas(titulo.toUpperCase());
  const maiorLinha = Math.max(1, ...linhas.map((linha) => ctx.measureText(linha).width));
  tamanho = Math.min(tamanho, (tamanho * larguraMaxima) / maiorLinha, alturaMaxima / (linhas.length * 0.95));
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
