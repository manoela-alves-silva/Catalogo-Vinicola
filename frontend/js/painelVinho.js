// Painel lateral com a ficha completa do vinho, a foto da garrafa e o botão do WhatsApp.
import { buscarVinho } from './api.js';
import { linkWhatsApp, mensagemDoVinho } from './contato.js';
import { nomeDoTipo, formatarPreco, colocarFoto } from './cardVinho.js';

const SELETOR_FOCAVEIS = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const numero = (valor, casas = 1) => valor.toLocaleString('pt-BR', { maximumFractionDigits: casas });

/**
 * @param {object} opcoes
 * @param {object|null} opcoes.lenis  rolagem suave (é pausada com o painel aberto)
 * @param {boolean} opcoes.animar      false = sem animações (movimento reduzido ou sem GSAP)
 */
export function criarPainelVinho({ lenis, animar }) {
  const painel = document.querySelector('#painel-vinho');
  const foto = painel.querySelector('#painel-vinho-foto');
  const campo = (id) => painel.querySelector(`#painel-vinho-${id}`);

  let origem = null;    // botão que abriu o painel: recebe o foco de volta ao fechar
  let slugAberto = null;

  function preencher(vinho) {
    colocarFoto(foto, vinho.slug, '(min-width: 34rem) 34rem, 100vw');
    foto.alt = `Garrafa do vinho ${vinho.nome}`;
    campo('tipo').textContent = `${nomeDoTipo(vinho.tipo)} · Safra ${vinho.safra}`;
    campo('nome').textContent = vinho.nome;
    campo('descricao').textContent = vinho.descricao_curta;
    campo('preco').textContent = formatarPreco(vinho.preco);
    campo('notas').textContent = vinho.notas_degustacao;

    const ficha = [
      ['Uva', vinho.uva],
      ['Safra', vinho.safra],
      ['Teor alcoólico', `${numero(vinho.teor_alcoolico)}%`],
      ['Volume', `${vinho.volume_ml} ml`],
      ['Servir a', vinho.temperatura_servico],
    ];
    campo('ficha').replaceChildren(...ficha.flatMap(([rotulo, valor]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = rotulo;
      dd.textContent = valor;
      return [dt, dd];
    }));

    campo('pratos').replaceChildren(...vinho.harmonizacao.map((prato) => {
      const li = document.createElement('li');
      li.textContent = prato;
      return li;
    }));

    campo('whatsapp').href = linkWhatsApp(mensagemDoVinho(vinho));
  }

  async function abrir(vinho, botaoDeOrigem) {
    origem = botaoDeOrigem;
    slugAberto = vinho.slug;
    preencher(vinho);

    painel.classList.add('aberto');
    if (lenis) lenis.stop();                                     // a página atrás não rola
    else document.documentElement.classList.add('sem-rolagem');
    painel.scrollTop = 0;
    painel.querySelector('.painel-vinho-fechar').focus();

    if (animar) {
      const partes = [...painel.children].filter((filho) => !filho.matches('.painel-vinho-fechar'));
      gsap.fromTo(partes, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.04, delay: 0.25, ease: 'power3.out', overwrite: true });
    }

    // a lista já trouxe os dados; pedimos o vinho de novo à API para ter a versão mais atual
    try {
      const completo = await buscarVinho(vinho.slug);
      if (slugAberto === vinho.slug) preencher(completo);
    } catch {
      // sem problema: o painel continua com os dados da lista
    }
  }

  function fechar() {
    if (!painel.classList.contains('aberto')) return;
    painel.classList.remove('aberto');
    slugAberto = null;
    if (lenis) lenis.start();
    else document.documentElement.classList.remove('sem-rolagem');
    origem?.focus({ preventScroll: true }); // o teclado volta para o card de onde a pessoa veio
  }

  // fecha com o botão "×" ou clicando no fundo escuro (os dois têm data-fechar-painel)
  document.querySelectorAll('[data-fechar-painel]').forEach((el) => el.addEventListener('click', fechar));

  document.addEventListener('keydown', (evento) => {
    if (!painel.classList.contains('aberto')) return;
    if (evento.key === 'Escape') {
      fechar();
      return;
    }
    // "Prende" o Tab dentro do painel: do último item volta para o primeiro e vice-versa
    if (evento.key === 'Tab') {
      const focaveis = [...painel.querySelectorAll(SELETOR_FOCAVEIS)];
      const primeiro = focaveis[0];
      const ultimo = focaveis.at(-1);
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
  });

  return { abrir, fechar };
}
