// Ponto de entrada: inicializa todos os módulos do site, na ordem certa.
import { iniciarRolagem } from './rolagem.js';
import { iniciarTextos } from './textos.js';
import { iniciarVisita } from './visita.js';
import { acompanharMouse } from './mouse.js';
import { atualizarLinksWhatsApp } from './contato.js';
import { iniciarCatalogo } from './catalogo.js';
import { iniciarVinhedo } from './vinhedo.js';
import { iniciarHarmonizacao } from './harmonizacao.js';
import { iniciarPreloader, comLimiteDeTempo } from './preloader.js';
import { iniciarCursor } from './cursor.js';
import { iniciarMenu } from './menu.js';

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
 * Devolve a cena (com revelar(), que toca a entrada da garrafa) ou null.
 */
async function iniciarGarrafaHero({ movimentoReduzido }) {
  const canvas = document.querySelector('#canvas-garrafa');
  if (!canvas) return null;

  try {
    const { suportaWebGL, detectarQualidade } = await import('./cena3d/qualidade.js');
    if (!suportaWebGL()) {
      mostrarImagemEstatica(canvas);
      return null;
    }
    const { iniciarCenaHero } = await import('./cena3d/cenaHero.js');
    return iniciarCenaHero({
      canvas,
      movimentoReduzido,
      qualidade: detectarQualidade(),
      corFundo: getComputedStyle(document.documentElement).getPropertyValue('--cor-fundo').trim(),
    });
  } catch (erro) {
    console.warn('3D indisponível, usando imagem estática.', erro);
    mostrarImagemEstatica(canvas);
    return null;
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
    iniciarPreloader({ animar: false, lenis: null }).concluir();
    iniciarMenu({ lenis: null });
    iniciarCatalogo({ animar: false, lenis: null }).then((painel) => iniciarHarmonizacao({ animar: false, painel }));
    return;
  }

  // 3. Plugins registrados antes de qualquer animação
  gsap.registerPlugin(ScrollTrigger, SplitText, ...(window.Flip ? [Flip] : []));

  // 4. Rolagem primeiro: os ScrollTriggers criados depois já nascem sincronizados com o Lenis
  const lenis = window.Lenis ? iniciarRolagem({ movimentoReduzido }) : null;
  iniciarMenu({ lenis });

  // 5. Preloader cobre a tela enquanto o resto carrega; cada etapa pronta faz o contador andar
  const preloader = iniciarPreloader({ animar: !movimentoReduzido, lenis });
  preloader.avancar(15);

  // 6. Espera as fontes: o SplitText mede as linhas, e a fonte errada daria linhas erradas
  await comLimiteDeTempo(document.fonts.ready);
  preloader.avancar(40);

  // 7. Animações (o mouse é lido pelo nome do hero, pela garrafa e pelo cursor)
  if (!movimentoReduzido) {
    acompanharMouse();
    iniciarCursor(); // cursor próprio e botões magnéticos (só com mouse)
  }
  const textos = iniciarTextos({ movimentoReduzido });
  iniciarVisita({ movimentoReduzido });

  // 8. 3D por último: é o mais pesado e não deve atrasar os textos.
  //    (Depois das fontes também porque o rótulo usa a Clash Display.)
  const garrafaPronta = iniciarGarrafaHero({ movimentoReduzido });
  await comLimiteDeTempo(garrafaPronta);
  preloader.avancar(80);
  iniciarVinhedo({ movimentoReduzido }); // voo pelas fotos das etapas

  // 9. Tudo que aparece na primeira tela está pronto: a cortina sobe e o hero entra.
  //    Se a garrafa passou do tempo limite, a entrada dela toca quando ela chegar.
  preloader.concluir(() => {
    textos.revelarHero();
    garrafaPronta.then((garrafa) => garrafa?.revelar());
  });

  // 10. Catálogo depois do vinhedo: o pin dele vem depois do pin do vinhedo na página.
  //     Ele não segura o preloader: fica mais abaixo e pode terminar de carregar da API depois.
  const painel = await iniciarCatalogo({ animar: !movimentoReduzido, lenis });
  iniciarHarmonizacao({ animar: !movimentoReduzido, painel });

  // 11. Recalcula posições de todos os gatilhos com o layout final.
  //     sort() põe os gatilhos na ordem da página: o pin do vinhedo "empurra" o que vem
  //     abaixo dele, então quem está depois precisa ser calculado depois.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}

iniciar();
