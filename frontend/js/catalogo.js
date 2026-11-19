// Catálogo: busca os vinhos na API, cria os cards, filtra por tipo (GSAP Flip),
// prende a seção e anda com os cards na horizontal (desktop) e abre o painel do vinho.
import { buscarVinhos } from './api.js';
import { criarCard, ativarInclinacao, nomeDoTipo } from './cardVinho.js';
import { criarPainelVinho } from './painelVinho.js';

const PLURAIS = { tinto: 'tintos', branco: 'brancos', 'rosé': 'rosés', espumante: 'espumantes', sobremesa: 'de sobremesa' };

/**
 * @param {object} opcoes
 * @param {boolean} opcoes.animar  false = sem GSAP ou com movimento reduzido
 * @param {object|null} opcoes.lenis
 */
export async function iniciarCatalogo({ animar, lenis }) {
  const secao = document.querySelector('#vinhos');
  const lista = secao.querySelector('#catalogo-lista');
  const estado = secao.querySelector('#catalogo-estado');
  const filtros = [...secao.querySelectorAll('.filtro')];
  const usarFlip = animar && Boolean(window.Flip);

  const painel = criarPainelVinho({ lenis, animar });
  const cards = new Map(); // slug → elemento do card

  function anunciar(quantidade, tipo = '') {
    const nome = quantidade === 1 ? 'vinho' : 'vinhos';
    estado.textContent = tipo
      ? `${quantidade} ${quantidade === 1 ? nomeDoTipo(tipo).toLowerCase() : PLURAIS[tipo]}`
      : `${quantidade} ${nome} no catálogo`;
  }

  function mostrarErro(erro) {
    estado.textContent = erro.message;
    const tentar = document.createElement('button');
    tentar.type = 'button';
    tentar.className = 'botao botao-contorno';
    tentar.textContent = 'Tentar de novo';
    tentar.addEventListener('click', carregar);
    lista.replaceChildren(tentar);
    filtros.forEach((f) => { f.disabled = true; });
  }

  async function carregar() {
    estado.textContent = 'Carregando os vinhos…';
    let vinhos;
    try {
      vinhos = await buscarVinhos();
    } catch (erro) {
      mostrarErro(erro);
      return false;
    }

    filtros.forEach((f) => { f.disabled = false; });
    cards.clear();
    lista.replaceChildren(...vinhos.map((vinho) => {
      const card = criarCard(vinho);
      cards.set(vinho.slug, card);
      if (animar) ativarInclinacao(card);
      card.querySelector('.card-vinho-abrir').addEventListener('click', (evento) => painel.abrir(vinho, evento.currentTarget));
      return card;
    }));
    anunciar(vinhos.length);

    if (animar) {
      gsap.from([...cards.values()], {
        y: 60, opacity: 0, duration: 0.9, stagger: 0.07, ease: 'power3.out',
        scrollTrigger: { trigger: lista, start: 'top 85%', once: true },
      });
    }
    return true;
  }

  let pedidoAtual = 0;     // para ignorar respostas antigas (cliques rápidos em vários filtros)
  let animacaoFlip = null; // animação de filtro em andamento

  /** Filtro: pergunta à API quais vinhos são daquele tipo e mostra só esses. */
  async function filtrar(botao) {
    const tipo = botao.dataset.tipo;
    filtros.forEach((f) => f.setAttribute('aria-pressed', String(f === botao)));

    const meuPedido = ++pedidoAtual;
    let slugs;
    try {
      slugs = new Set((await buscarVinhos(tipo)).map((v) => v.slug));
    } catch (erro) {
      estado.textContent = erro.message;
      return;
    }
    if (meuPedido !== pedidoAtual) return; // outro filtro foi clicado enquanto esperávamos

    // se a animação do filtro anterior ainda está rodando, termina ela na hora
    animacaoFlip?.progress(1);

    // Flip: 1) guarda onde cada card está, 2) muda o DOM, 3) anima do "antes" para o "depois"
    const antes = usarFlip ? Flip.getState([...cards.values()]) : null;
    cards.forEach((card, slug) => { card.style.display = slugs.has(slug) ? '' : 'none'; });
    anunciar(slugs.size, tipo);

    if (!usarFlip) {
      window.ScrollTrigger?.refresh(); // "window." evita erro se o GSAP nem carregou
      return;
    }
    animacaoFlip = Flip.from(antes, {
      duration: 0.7,
      ease: 'power3.inOut',
      absolute: true, // durante a animação os cards "flutuam", sem empurrar uns aos outros
      onEnter: (entrando) => gsap.fromTo(entrando, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, delay: 0.2 }),
      onLeave: (saindo) => gsap.to(saindo, { opacity: 0, scale: 0.85, duration: 0.4 }),
      onComplete: () => ScrollTrigger.refresh(), // a fileira mudou de largura: recalcula a rolagem
    });
  }

  filtros.forEach((botao) => botao.addEventListener('click', () => filtrar(botao)));

  const carregou = await carregar();
  if (carregou && animar) ativarRolagemHorizontal({ secao, lista, lenis });
}

/**
 * Desktop: a seção fica presa e a rolagem vertical anda com os cards na horizontal.
 * No celular (ou com movimento reduzido) nada disso roda e a lista fica vertical (CSS).
 * gsap.matchMedia cria/desfaz tudo sozinho quando a tela passa do limite.
 */
function ativarRolagemHorizontal({ secao, lista, lenis }) {
  const distancia = () => Math.max(0, lista.scrollWidth - lista.clientWidth);

  gsap.matchMedia().add('(min-width: 64em)', () => {
    secao.classList.add('horizontal');
    const andar = gsap.to(lista, {
      x: () => -distancia(),
      ease: 'none',
      scrollTrigger: {
        trigger: secao,
        start: 'top top',
        end: () => `+=${distancia()}`, // 1 px rolado = 1 px andado
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Teclado: ao focar um card fora da tela, rola até ele aparecer
    const trazerParaATela = (evento) => {
      const card = evento.target.closest('.card-vinho');
      const gatilho = andar.scrollTrigger;
      if (!card || !gatilho) return;
      const alvo = Math.min(Math.max(card.offsetLeft - 48, 0), distancia());
      const destino = gatilho.start + alvo;
      if (lenis) lenis.scrollTo(destino, { immediate: true });
      else window.scrollTo(0, destino);
    };
    lista.addEventListener('focusin', trazerParaATela);
    ScrollTrigger.sort();
    ScrollTrigger.refresh();

    return () => { // ao sair do desktop: desfaz tudo
      secao.classList.remove('horizontal');
      lista.removeEventListener('focusin', trazerParaATela);
    };
  });
}
