// Cena "Do vinhedo à taça": junta relevo, vinhedo, objetos das etapas, céu e trajeto.
import { criarRenderizador } from './renderizador.js';
import { criarRelevo } from './relevo.js';
import { criarVinhedo } from './vinhedo.js';
import { criarElementosEtapas } from './elementosEtapas.js';
import { criarTrajeto, lugaresDasEtapas } from './trajeto.js';
import { criarCeu } from './ceu.js';

export function iniciarCenaVinhedo({ secao, canvas, qualidade }) {
  // A seção vira "tela de cinema" ANTES de medir qualquer coisa (o pin depende do tamanho dela)
  secao.classList.add('em-cena');

  const r = criarRenderizador(canvas, {
    qualidade,
    corFundo: '#c6d6d6',
    campoDeVisao: 50,
    luzesDeEstudio: false, // aqui quem ilumina é o sol (criarCeu)
    alcance: 160,
    sombras: qualidade === 'alto',
    // tela em pé (celular) enxerga pouco para os lados: abre um pouco a "lente"
    aoRedimensionar: (camera) => { camera.fov = camera.aspect < 1 ? 62 : 50; },
  });
  // 1. relevo + clareiras dos objetos (antes de criar o terreno, para ele já sair plano ali)
  const relevo = criarRelevo();
  const lugares = lugaresDasEtapas(relevo);
  lugares.forEach(({ x, z, raio }) => relevo.adicionarClareira(x, z, raio));

  // 2. cenário e objetos
  const vinhedo = criarVinhedo({ relevo, qualidade, clareiras: relevo.clareiras });
  r.cena.add(vinhedo.grupo, criarElementosEtapas(relevo, lugares, qualidade === 'alto'));

  // 3. céu e trajeto: a rolagem move a câmera e passa as horas do dia
  // neblina mais densa no modo leve: o horizonte fica mais perto e esconde o que foi cortado
  const atualizarCeu = criarCeu(r.cena, { sombras: qualidade === 'alto', densidade: qualidade === 'alto' ? 0.017 : 0.026 });
  criarTrajeto({ r, relevo, lugares, secao, atualizarCeu });

  return { r, quantidadeDeVideiras: vinhedo.quantidadeDeVideiras };
}
