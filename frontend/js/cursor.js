// Cursor personalizado e botões magnéticos.
//
// O cursor tem duas peças: um ponto que acompanha o mouse na hora e um anel que vem
// atrás, com atraso suave. A posição vem do mouse.js (um só ouvinte para o site todo).
// O anel muda conforme o que está embaixo dele: cresce em links, vira "Ver" nos cards
// e "Girar" na garrafa 3D. Só funciona com mouse: no toque, o cursor do sistema fica.
import { mouse } from './mouse.js';

// O que fica embaixo do cursor → rótulo do anel. O primeiro seletor que bater vence.
const ESTADOS = [
  { seletor: '.card-vinho', rotulo: 'Ver' },
  { seletor: '.sugestao', rotulo: 'Ver' },
  { seletor: 'a, button, [role="button"]', rotulo: '' }, // só cresce, sem texto
];
const SELETOR_MAGNETICO = '.botao, .filtro, .prato';
const FORCA_MAGNETICA = 0.35; // quanto o botão anda em direção ao cursor (0 = nada, 1 = cola)

/** Cria o HTML do cursor. Fica fora do conteúdo e escondido do leitor de tela. */
function criarElementos() {
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = `
    <div class="cursor-anel"><div class="cursor-anel-forma"></div><span class="cursor-rotulo"></span></div>
    <div class="cursor-ponto"></div>`;
  document.body.append(cursor);
  return {
    cursor,
    anel: cursor.querySelector('.cursor-anel'),
    ponto: cursor.querySelector('.cursor-ponto'),
    rotulo: cursor.querySelector('.cursor-rotulo'),
  };
}

/** Descobre o estado do cursor a partir do elemento embaixo dele. */
function estadoPara(alvo) {
  if (!(alvo instanceof Element)) return null;
  // A garrafa do hero avisa sozinha: o interacaoGarrafa.js põe "grab" no canvas quando o mouse está nela
  if (alvo.matches('canvas') && alvo.style.cursor.startsWith('grab')) return { rotulo: 'Girar' };
  return ESTADOS.find(({ seletor }) => alvo.closest(seletor)) ?? null;
}

function iniciarMagneticos() {
  let atual = null;

  function soltar(elemento) {
    if (elemento) gsap.to(elemento, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
  }

  window.addEventListener('pointermove', (evento) => {
    if (evento.pointerType !== 'mouse') return;
    const elemento = evento.target instanceof Element ? evento.target.closest(SELETOR_MAGNETICO) : null;
    if (elemento !== atual) {
      soltar(atual);
      atual = elemento;
    }
    if (!elemento) return;

    // O retângulo já inclui o deslocamento atual; descontamos para achar o centro "de verdade"
    const caixa = elemento.getBoundingClientRect();
    const centroX = caixa.left + caixa.width / 2 - gsap.getProperty(elemento, 'x');
    const centroY = caixa.top + caixa.height / 2 - gsap.getProperty(elemento, 'y');
    gsap.to(elemento, {
      x: (evento.clientX - centroX) * FORCA_MAGNETICA,
      y: (evento.clientY - centroY) * FORCA_MAGNETICA,
      duration: 0.4,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }, { passive: true });
}

/** Liga o cursor e os botões magnéticos (só em aparelhos com mouse). */
export function iniciarCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const { cursor, anel, ponto, rotulo } = criarElementos();
  document.documentElement.classList.add('cursor-personalizado'); // esconde a seta do sistema (CSS)

  // quickTo: funções que "perseguem" o valor; o ponto é quase instantâneo, o anel vem atrás
  const moverPonto = { x: gsap.quickTo(ponto, 'x', { duration: 0.08 }), y: gsap.quickTo(ponto, 'y', { duration: 0.08 }) };
  const moverAnel = { x: gsap.quickTo(anel, 'x', { duration: 0.45, ease: 'power3.out' }), y: gsap.quickTo(anel, 'y', { duration: 0.45, ease: 'power3.out' }) };

  let alvo = null;
  window.addEventListener('pointerover', (evento) => { alvo = evento.target; }, { passive: true });
  window.addEventListener('pointerdown', () => cursor.classList.add('pressionado'));
  window.addEventListener('pointerup', () => cursor.classList.remove('pressionado'));

  // A cada quadro: posição e estado. O estado é lido no quadro (e não só no "pointerover")
  // porque a garrafa muda de "grab" sem o mouse trocar de elemento.
  let estavaVisivel = false;
  gsap.ticker.add(() => {
    // Mouse acabou de entrar na janela: o cursor já nasce no lugar, sem "voar" do canto
    if (mouse.ativo && !estavaVisivel) gsap.set([ponto, anel], { x: mouse.clientX, y: mouse.clientY });
    estavaVisivel = mouse.ativo;

    moverPonto.x(mouse.clientX);
    moverPonto.y(mouse.clientY);
    moverAnel.x(mouse.clientX);
    moverAnel.y(mouse.clientY);

    const estado = estadoPara(alvo);
    cursor.classList.toggle('visivel', mouse.ativo);
    cursor.classList.toggle('sobre-link', !!estado);
    cursor.classList.toggle('com-rotulo', !!estado?.rotulo);
    if (estado?.rotulo && rotulo.textContent !== estado.rotulo) rotulo.textContent = estado.rotulo;
  });

  iniciarMagneticos();
}
