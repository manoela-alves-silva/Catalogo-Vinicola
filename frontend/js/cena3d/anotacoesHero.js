// Anotações técnicas do hero: legendas com linha fina que "seguem" pontos da garrafa 3D.
//
// Como funciona: cada legenda tem um ponto-âncora 3D preso à garrafa (gargalo, ombro, base).
// A cada quadro, a posição 3D dele é "projetada" para a tela (vira x, y em pixels) e a
// legenda é movida até lá com transform. Se a garrafa inclina, sobe ou levanta, as
// legendas vão junto.
import * as THREE from 'three';

// Pontos na borda da garrafa (x = raio, y = altura a partir do centro da garrafa).
// O lado (esquerda/direita) define em qual borda o ponto fica.
const ANCORAS = {
  gargalo: { raio: 0.14, y: 1.15 },
  ombro: { raio: 0.40, y: 0.55 },
  base: { raio: 0.43, y: -1.3 },
};

/**
 * @param {HTMLElement} ficha  o bloco .hero-ficha (com as legendas dentro)
 * @param {THREE.Object3D} pai  grupo que inclina/levanta com a garrafa, mas NÃO gira
 *                              (se girasse, o ponto daria a volta para trás da garrafa)
 */
export function criarAnotacoesHero(ficha, pai, camera, canvas) {
  const legendas = [...ficha.querySelectorAll('.hero-anotacao')].map((elemento) => {
    const { raio, y } = ANCORAS[elemento.dataset.ancora];
    const esquerda = elemento.dataset.lado === 'esquerda';
    const ancora = new THREE.Object3D();
    ancora.position.set(esquerda ? -raio : raio, y, 0);
    pai.add(ancora);
    return { elemento, ancora, esquerda };
  });

  // Daqui em diante, as legendas deixam de ser uma lista simples e passam a seguir a garrafa
  ficha.classList.add('ancorada');

  const ponto = new THREE.Vector3();

  return function atualizar() {
    const largura = canvas.clientWidth;
    const altura = canvas.clientHeight;
    legendas.forEach(({ elemento, ancora, esquerda }) => {
      ponto.setFromMatrixPosition(ancora.matrixWorld).project(camera); // → coordenadas de -1 a 1
      const x = (ponto.x * 0.5 + 0.5) * largura;
      const y = (-ponto.y * 0.5 + 0.5) * altura;
      // legenda à esquerda: a ponta direita (o pontinho) encosta na âncora
      const alinhamento = esquerda ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
      elemento.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ${alinhamento}`;
    });
  };
}
