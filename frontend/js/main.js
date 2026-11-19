// Ponto de entrada: inicializa todos os módulos do site, na ordem certa.
import { iniciarRolagem } from './rolagem.js';
import { iniciarTextos } from './textos.js';
import { iniciarVisita } from './visita.js';

/**
 * O nome da vinícola é escrito uma vez só, no <h1 id="nome-vinicola"> do hero.
 * Esta função copia esse nome para todo elemento com [data-nome-vinicola]
 * e para o título da aba. Sem JS, o <h1> continua mostrando o nome.
 */
function preencherNomeVinicola() {
  const nome = document.querySelector('#nome-vinicola')?.textContent.trim();
  if (!nome) return;

  document.querySelectorAll('[data-nome-vinicola]').forEach((elemento) => {
    elemento.textContent = nome;
  });
  document.title = `${nome} · ${document.title}`;
}

async function iniciar() {
  // 1. Conteúdo: funciona mesmo sem as bibliotecas
  preencherNomeVinicola();

  // Se o CDN falhar, o site fica estático, mas inteiro e legível
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
    console.warn('GSAP não carregou: site sem animações.');
    return;
  }

  // 2. Preferência do sistema: menos movimento
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 3. Plugins registrados antes de qualquer animação
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // 4. Rolagem primeiro: os ScrollTriggers criados depois já nascem sincronizados com o Lenis
  if (window.Lenis) iniciarRolagem({ movimentoReduzido });

  // 5. Espera as fontes: o SplitText mede as linhas, e a fonte errada daria linhas erradas
  await document.fonts.ready;

  // 6. Animações
  iniciarTextos({ movimentoReduzido });
  iniciarVisita({ movimentoReduzido });

  // 7. Recalcula posições de todos os gatilhos com o layout final
  ScrollTrigger.refresh();
}

iniciar();
