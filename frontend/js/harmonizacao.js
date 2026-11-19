// Harmonização: a pessoa escolhe um prato e o site sugere os vinhos que combinam.
// O filtro é feito no front, procurando palavras de cada categoria no campo
// "harmonizacao" dos vinhos (a lista de pratos que vem da API).
import { buscarVinhos } from './api.js';
import { colocarFoto, nomeDoTipo } from './cardVinho.js';

// Palavras que indicam cada categoria (sem acento e em minúsculas, como no normalizar())
const PALAVRAS = {
  carne: ['costela', 'cordeiro', 'picanha', 'file', 'javali', 'pato', 'carne', 'frios'],
  peixe: ['peixe', 'salmao', 'ceviche', 'tilapia', 'moqueca', 'ostra', 'bacalhau', 'camarao'],
  massa: ['pappardelle', 'risoto', 'nhoque', 'fettuccine', 'pizza', 'massa', 'ragu'],
  queijos: ['queijo', 'brie', 'gorgonzola', 'parmesao', 'grana'],
  sobremesa: ['sobremesa', 'torta', 'creme', 'pavlova', 'frutas', 'doce', 'chocolate'],
};
const NOMES = { carne: 'carne', peixe: 'peixe', massa: 'massa', queijos: 'queijos', sobremesa: 'sobremesa' };

const normalizar = (texto) => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Primeiro prato do vinho que bate com a categoria (ou undefined se nenhum bater). */
function pratoQueCombina(vinho, categoria) {
  return vinho.harmonizacao.find((prato) => PALAVRAS[categoria].some((p) => normalizar(prato).includes(p)));
}

function criarSugestao(vinho, prato, painel) {
  const item = document.createElement('li');
  item.className = 'sugestao';
  const foto = document.createElement('img');
  foto.className = 'sugestao-foto';
  colocarFoto(foto, vinho.slug, '8rem');
  foto.alt = '';
  const texto = document.createElement('div');
  const tipo = document.createElement('p');
  tipo.className = 'sugestao-tipo';
  tipo.textContent = `${nomeDoTipo(vinho.tipo)} · ${vinho.safra}`;
  const nome = document.createElement('h3');
  nome.className = 'sugestao-nome';
  const abrir = document.createElement('button');
  abrir.type = 'button';
  abrir.textContent = vinho.nome;
  abrir.addEventListener('click', () => painel?.abrir(vinho, abrir));
  nome.append(abrir);
  const combina = document.createElement('p');
  combina.className = 'sugestao-prato';
  combina.textContent = `Vai bem com: ${prato}`;
  texto.append(tipo, nome, combina);
  item.append(foto, texto);
  return item;
}

/**
 * @param {object} opcoes
 * @param {boolean} opcoes.animar
 * @param {object|null} opcoes.painel  painel do catálogo, para abrir a ficha do vinho sugerido
 */
export function iniciarHarmonizacao({ animar, painel }) {
  const secao = document.querySelector('#harmonizacao');
  const botoes = [...secao.querySelectorAll('.prato')];
  const resultado = secao.querySelector('#harmonizacao-resultado');
  let vinhos = null; // carregados só no primeiro clique

  async function escolher(botao) {
    const categoria = botao.dataset.prato;
    botoes.forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));

    try {
      vinhos ??= await buscarVinhos();
    } catch (erro) {
      resultado.replaceChildren(Object.assign(document.createElement('p'), { textContent: erro.message }));
      return;
    }

    const sugestoes = vinhos
      .map((vinho) => ({ vinho, prato: pratoQueCombina(vinho, categoria) }))
      .filter(({ prato }) => prato);

    let conteudo;
    if (sugestoes.length) {
      const titulo = document.createElement('p');
      titulo.className = 'harmonizacao-contagem';
      titulo.textContent = `${sugestoes.length} ${sugestoes.length === 1 ? 'vinho' : 'vinhos'} para ${NOMES[categoria]}`;
      const lista = document.createElement('ul');
      lista.className = 'sugestoes';
      lista.append(...sugestoes.map(({ vinho, prato }) => criarSugestao(vinho, prato, painel)));
      conteudo = [titulo, lista];
    } else {
      conteudo = [Object.assign(document.createElement('p'), {
        textContent: 'Esse prato ainda não tem par na nossa adega. Fale com a gente no WhatsApp que a gente indica um!',
      })];
    }

    if (!animar) {
      resultado.replaceChildren(...conteudo);
      return;
    }
    // Transição: o que estava sai para cima, as sugestões novas entram de baixo, uma a uma
    await gsap.to(resultado.children, { y: -20, opacity: 0, duration: 0.3, stagger: 0.04 });
    resultado.replaceChildren(...conteudo);
    gsap.from(resultado.querySelectorAll('.harmonizacao-contagem, .sugestao'), {
      y: 40, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
    });
  }

  botoes.forEach((botao) => botao.addEventListener('click', () => escolher(botao)));
}
