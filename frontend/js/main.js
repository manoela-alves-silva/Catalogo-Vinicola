// Ponto de entrada: inicializa todos os módulos do site, na ordem certa.
import { iniciarRolagem } from './rolagem.js';
import { iniciarTextos } from './textos.js';
import { iniciarVisita } from './visita.js';
import { acompanharMouse } from './mouse.js';
import { atualizarLinksWhatsApp } from './contato.js';
import { iniciarCatalogo } from './catalogo.js';
import { iniciarVinhedo } from './vinhedo.js';
import { iniciarHarmonizacao } from './harmonizacao.js';

/**
 * O nome da vinícola é escrito uma vez só, no <h1 id="nome-vinicola"> do hero.
 * Esta função copia esse nome para todo elemento com [data-nome-vinicola]
 * e para o título da aba. Sem JS, o <h1> continua mostrando o nome.
 */
function preencherNomeVinicola() {
  const nome = document.querySelector('#nome-vinicola')?.textContent.trim();
  if (!nome) return '';

  document.querySelectorAll('[data-nome-vinicola]').forEach((elemento) => {
    elemento.textContent = nome;
  });
  document.title = `${nome} · ${document.title}`;
  return nome;
}

/** Troca um canvas 3D por uma imagem estática (sem WebGL ou se o 3D falhar). */
function mostrarImagemEstatica(canvas) {
  const imagem = document.createElement('img');
  imagem.src = 'assets/img/garrafa-estatica.svg';
  imagem.alt = 'Garrafa de vinho tinto em vidro escuro';
  imagem.className = 'hero-garrafa-estatica';
  imagem.width = 240;
  imagem.height = 640;
  canvas.replaceWith(imagem);
}

/**
 * Garrafa 3D do hero. Os módulos 3D são carregados com import() dinâmico:
 * se o Three.js não baixar, só o 3D falha (vira imagem); o resto do site segue normal.
 */
async function iniciarGarrafaHero({ movimentoReduzido }) {
  const canvas = document.querySelector('#canvas-garrafa');
  if (!canvas) return;

  try {
    const { suportaWebGL, detectarQualidade } = await import('./cena3d/qualidade.js');
    if (!suportaWebGL()) {
      mostrarImagemEstatica(canvas);
      return;
    }
    const { iniciarCenaHero } = await import('./cena3d/cenaHero.js');
    iniciarCenaHero({
      canvas,
      movimentoReduzido,
      qualidade: detectarQualidade(),
      corFundo: getComputedStyle(document.documentElement).getPropertyValue('--cor-fundo').trim(),
    });
  } catch (erro) {
    console.warn('3D indisponível, usando imagem estática.', erro);
    mostrarImagemEstatica(canvas);
  }
}

async function iniciar() {
  // 1. Conteúdo: funciona mesmo sem as bibliotecas
  preencherNomeVinicola();
  atualizarLinksWhatsApp();

  // 2. Preferência do sistema: menos movimento
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Se o CDN falhar, o site fica sem animações, mas inteiro: o catálogo ainda carrega da API
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
    console.warn('GSAP não carregou: site sem animações.');
    iniciarCatalogo({ animar: false, lenis: null }).then((painel) => iniciarHarmonizacao({ animar: false, painel }));
    return;
  }

  // 3. Plugins registrados antes de qualquer animação
  gsap.registerPlugin(ScrollTrigger, SplitText, ...(window.Flip ? [Flip] : []));

  // 4. Rolagem primeiro: os ScrollTriggers criados depois já nascem sincronizados com o Lenis
  const lenis = window.Lenis ? iniciarRolagem({ movimentoReduzido }) : null;

  // 5. Espera as fontes: o SplitText mede as linhas, e a fonte errada daria linhas erradas
  await document.fonts.ready;

  // 6. Animações (o mouse é lido pelo nome do hero e pela garrafa)
  if (!movimentoReduzido) acompanharMouse();
  iniciarTextos({ movimentoReduzido });
  iniciarVisita({ movimentoReduzido });

  // 7. 3D por último: é o mais pesado e não deve atrasar os textos.
  //    (Depois das fontes também porque o rótulo usa a Clash Display.)
  await iniciarGarrafaHero({ movimentoReduzido });
  iniciarVinhedo({ movimentoReduzido }); // voo pelas fotos das etapas

  // 8. Catálogo depois do vinhedo: o pin dele vem depois do pin do vinhedo na página
  const painel = await iniciarCatalogo({ animar: !movimentoReduzido, lenis });
  iniciarHarmonizacao({ animar: !movimentoReduzido, painel });

  // 9. Recalcula posições de todos os gatilhos com o layout final.
  //    sort() põe os gatilhos na ordem da página: o pin do vinhedo "empurra" o que vem
  //    abaixo dele, então quem está depois precisa ser calculado depois.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}

iniciar();
