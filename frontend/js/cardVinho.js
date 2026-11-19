// Card de um vinho: criação a partir dos dados da API e inclinação no hover.

const NOMES_DOS_TIPOS = {
  tinto: 'Tinto', branco: 'Branco', 'rosé': 'Rosé', espumante: 'Espumante', sobremesa: 'Sobremesa',
};
const formatoPreco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const nomeDoTipo = (tipo) => NOMES_DOS_TIPOS[tipo] ?? tipo;
export const formatarPreco = (valor) => formatoPreco.format(valor);

/**
 * Foto da garrafa: o nome do arquivo é o slug do vinho, em dois tamanhos.
 * Com srcset, o navegador baixa só o tamanho que a tela precisa.
 */
export function colocarFoto(img, slug, tamanhos) {
  img.src = `assets/img/vinhos/${slug}-480.jpg`;
  img.srcset = `assets/img/vinhos/${slug}-480.jpg 480w, assets/img/vinhos/${slug}-800.jpg 800w`;
  img.sizes = tamanhos;
  img.width = 800;
  img.height = 1000;
  img.decoding = 'async';
}

/** Cria um elemento a partir de uma tag, classe e texto (textContent: nunca HTML cru da API). */
function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

/**
 * Estrutura do card:
 * <article class="card-vinho">            ← o GSAP Flip anima este (posição nos filtros)
 *   <div class="card-vinho-corpo">         ← a inclinação do hover anima este
 *     foto da garrafa, selo, tipo · safra,
 *     <h3><button>nome</button></h3>       ← o botão cobre o card inteiro (clique e teclado)
 *     uva, preço, "Ver ficha"
 */
export function criarCard(vinho) {
  const card = elemento('article', 'card-vinho');
  card.dataset.slug = vinho.slug;
  card.dataset.tipo = vinho.tipo;
  card.style.setProperty('--cor-liquido', vinho.cor_liquido);
  card.style.setProperty('--cor-rotulo', vinho.cor_rotulo);

  const corpo = elemento('div', 'card-vinho-corpo');
  const moldura = elemento('div', 'card-vinho-moldura');
  const foto = elemento('img', 'card-vinho-foto');
  colocarFoto(foto, vinho.slug, '(min-width: 64em) 18rem, (min-width: 40em) 50vw, 100vw');
  foto.alt = ''; // decorativa: o nome do vinho já está no botão logo abaixo
  foto.loading = 'lazy';
  moldura.append(foto);
  corpo.append(moldura);

  if (vinho.destaque) corpo.append(elemento('p', 'card-vinho-selo', 'Destaque'));
  corpo.append(elemento('p', 'card-vinho-tipo', `${nomeDoTipo(vinho.tipo)} · ${vinho.safra}`));

  const titulo = elemento('h3', 'card-vinho-nome');
  const abrir = elemento('button', 'card-vinho-abrir', vinho.nome);
  abrir.type = 'button';
  abrir.setAttribute('aria-haspopup', 'dialog');
  titulo.append(abrir);
  corpo.append(
    titulo,
    elemento('p', 'card-vinho-uva', vinho.uva),
    elemento('p', 'card-vinho-preco', formatarPreco(vinho.preco)),
    elemento('span', 'card-vinho-ver', 'Ver ficha'),
  );
  card.append(corpo);
  return card;
}

/**
 * Hover: o card inclina para o lado do mouse e levanta.
 * quickTo cria funções que "perseguem" o valor com suavidade (sem tranco).
 */
export function ativarInclinacao(card) {
  const corpo = card.querySelector('.card-vinho-corpo');
  gsap.set(corpo, { transformPerspective: 800 }); // perspectiva: a inclinação parece 3D
  const giroX = gsap.quickTo(corpo, 'rotationX', { duration: 0.5, ease: 'power3.out' });
  const giroY = gsap.quickTo(corpo, 'rotationY', { duration: 0.5, ease: 'power3.out' });
  const subir = gsap.quickTo(corpo, 'y', { duration: 0.5, ease: 'power3.out' });

  card.addEventListener('pointermove', (evento) => {
    if (evento.pointerType !== 'mouse') return;
    const r = card.getBoundingClientRect();
    const x = (evento.clientX - r.left) / r.width - 0.5;  // -0.5 a 0.5
    const y = (evento.clientY - r.top) / r.height - 0.5;
    giroY(x * 12);   // até 6° para cada lado
    giroX(-y * 10);
    subir(-10);
  });
  card.addEventListener('pointerleave', () => {
    giroX(0);
    giroY(0);
    subir(0);
  });
}
