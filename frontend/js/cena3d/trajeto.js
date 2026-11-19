// Câmera percorrendo o vinhedo por uma CatmullRomCurve3 controlada pela rolagem,
// céu do amanhecer ao pôr do sol, textos das etapas e barra de progresso.
import * as THREE from 'three';
import { mouse } from '../mouse.js';

export const ETAPAS = ['terroir', 'videira', 'colheita', 'fermentacao', 'barricas', 'engarrafamento'];

// A câmera anda da fração T_INICIO até T_FIM da estrada (0 = começo, 1 = fim)
const T_INICIO = 0.03;
const T_FIM = 0.93;
const ALTURA_DO_OLHAR = 2.6;  // metros acima da estrada (um pouco acima das videiras)
const ALTURA_DO_DRONE = 12;   // no começo a câmera vem do alto e desce até a estrada
const AVANCO_DO_OBJETO = 0.045; // o objeto da etapa fica um pouco à frente da câmera
const DISTANCIA_LATERAL = 6;  // e a 6 m da estrada, alternando os lados
const SUAVIDADE_ROLAGEM = 4;  // "scrub" suave: a câmera persegue a rolagem
const BALANCO_DO_MOUSE = { x: 0.9, y: 0.45 };

const tDaCamera = (progresso) => T_INICIO + progresso * (T_FIM - T_INICIO);
const centroDaEtapa = (i) => (i + 0.5) / ETAPAS.length;
const suave = (a, b, t) => {
  const k = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
};

/** Onde fica o objeto de cada etapa: ao lado da estrada, de frente para ela. */
export function lugaresDasEtapas(relevo) {
  const cima = new THREE.Vector3(0, 1, 0);
  return ETAPAS.map((chave, i) => {
    const t = Math.min(tDaCamera(centroDaEtapa(i)) + AVANCO_DO_OBJETO, 0.99);
    const p = relevo.estrada.getPointAt(t);
    const lado = new THREE.Vector3().crossVectors(relevo.estrada.getTangentAt(t), cima).normalize();
    const sinal = i % 2 === 0 ? -1 : 1; // alterna esquerda/direita
    const x = p.x + lado.x * DISTANCIA_LATERAL * sinal;
    const z = p.z + lado.z * DISTANCIA_LATERAL * sinal;
    // ângulo que faz o "+z" do objeto apontar para a estrada
    const angulo = Math.atan2(-lado.x * sinal, -lado.z * sinal);
    return { chave, x, z, angulo, raio: 5 };
  });
}

// ---------- Céu: do amanhecer (0) ao pôr do sol (1) ----------
const HORAS = [
  { p: 0.0, ceu: '#d9b9a8', sol: '#ffc49e', intensidade: 1.2, elevacao: 6 },
  { p: 0.2, ceu: '#c2d0cc', sol: '#fff0d8', intensidade: 2.1, elevacao: 30 },
  { p: 0.45, ceu: '#c6d6d6', sol: '#ffffff', intensidade: 2.5, elevacao: 58 },
  { p: 0.7, ceu: '#dfc89f', sol: '#ffdca6', intensidade: 2.1, elevacao: 26 },
  { p: 0.88, ceu: '#d48b69', sol: '#ff9f66', intensidade: 1.5, elevacao: 8 },
  { p: 1.0, ceu: '#5f4253', sol: '#d47a68', intensidade: 0.6, elevacao: 2 },
];

export function criarCeu(cena) {
  const sol = new THREE.DirectionalLight('#ffffff', 2);
  const ambiente = new THREE.HemisphereLight('#c6d6d6', '#4a5236', 0.6);
  cena.add(sol, ambiente);
  if (!cena.fog) cena.fog = new THREE.Fog('#c6d6d6', 18, 110);

  const corCeu = new THREE.Color();
  const corSol = new THREE.Color();

  /** Ajusta céu, neblina e sol para a "hora do dia" p (0 a 1). */
  return function atualizar(p) {
    let i = 0;
    while (i < HORAS.length - 2 && p > HORAS[i + 1].p) i++;
    const a = HORAS[i];
    const b = HORAS[i + 1];
    const k = suave(a.p, b.p, p);

    corCeu.lerpColors(new THREE.Color(a.ceu), new THREE.Color(b.ceu), k);
    corSol.lerpColors(new THREE.Color(a.sol), new THREE.Color(b.sol), k);
    cena.background.copy(corCeu);
    cena.fog.color.copy(corCeu); // neblina da mesma cor do céu: o horizonte "some" nele
    ambiente.color.copy(corCeu);
    ambiente.intensity = 0.35 + a.intensidade * 0.12;

    // o sol nasce a leste (+x), passa alto ao meio-dia e se põe a oeste (-x), sempre à frente
    const elevacao = THREE.MathUtils.degToRad(a.elevacao + (b.elevacao - a.elevacao) * k);
    const caminho = p * Math.PI;
    sol.position.set(Math.cos(caminho) * 60 * Math.cos(elevacao), Math.sin(elevacao) * 60, -40);
    sol.color.copy(corSol);
    sol.intensity = a.intensidade + (b.intensidade - a.intensidade) * k;
  };
}

/**
 * Liga a rolagem à câmera: prende a seção na tela (pin) e, enquanto ela está presa,
 * a rolagem vira o "progresso" do passeio (0 a 1).
 */
export function criarTrajeto({ r, relevo, lugares, secao, atualizarCeu }) {
  const textos = [...secao.querySelectorAll('.vinhedo-etapa')];
  const barra = secao.querySelector('.vinhedo-progresso-barra');
  const contador = secao.querySelector('.vinhedo-contador-atual');

  let alvo = 0;       // progresso pedido pela rolagem
  let progresso = 0;  // progresso atual (persegue o alvo com suavidade)
  let etapaAtual = -1;
  const balanco = new THREE.Vector2(); // deslocamento da câmera pelo mouse

  gsap.set(textos, { autoAlpha: 0 }); // autoAlpha = opacity + visibility (some também do leitor de tela)

  ScrollTrigger.create({
    trigger: secao,
    start: 'top top',
    end: () => `+=${window.innerHeight * 5}`, // 5 telas de rolagem para o passeio todo
    pin: true,
    anticipatePin: 1,
    refreshPriority: 1, // calcula antes dos gatilhos de baixo (o pin empurra a página)
    invalidateOnRefresh: true,
    onUpdate: (gatilho) => { alvo = gatilho.progress; },
  });

  function trocarTexto(i) {
    if (i === etapaAtual) return;
    if (etapaAtual >= 0) gsap.to(textos[etapaAtual], { autoAlpha: 0, y: -24, duration: 0.45, overwrite: true });
    gsap.fromTo(textos[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.15, overwrite: true });
    if (contador) contador.textContent = String(i + 1).padStart(2, '0');
    etapaAtual = i;
  }

  function posicionarCamera(p, delta) {
    const t = tDaCamera(p);
    const posicao = relevo.pontoDaEstrada(t);
    posicao.y += ALTURA_DO_OLHAR + (1 - suave(0, 0.12, p)) * ALTURA_DO_DRONE;

    // olha um pouco à frente na estrada...
    const olhar = relevo.pontoDaEstrada(t + 0.04);
    olhar.y += 1.4;
    // ...mas, perto do centro de uma etapa, vira o rosto para o objeto dela
    // (em tela em pé, vira mais: senão o objeto, ao lado da estrada, sai pela borda)
    const quantoVirar = r.camera.aspect < 1 ? 0.85 : 0.6;
    lugares.forEach((lugar, i) => {
      const peso = Math.max(0, 1 - Math.abs(p - centroDaEtapa(i)) * ETAPAS.length * 1.4) ** 2;
      if (peso > 0) olhar.lerp(new THREE.Vector3(lugar.x, relevo.alturaEm(lugar.x, lugar.z) + 1.2, lugar.z), peso * quantoVirar);
    });

    // balanço leve seguindo o mouse, para a cena parecer viva
    const fracao = 1 - Math.exp(-2 * delta);
    balanco.x += (mouse.x * BALANCO_DO_MOUSE.x - balanco.x) * fracao;
    balanco.y += (-mouse.y * BALANCO_DO_MOUSE.y - balanco.y) * fracao;
    posicao.x += balanco.x;
    posicao.y += balanco.y;

    r.camera.position.copy(posicao);
    r.camera.lookAt(olhar);
  }

  r.aCadaQuadro((delta) => {
    progresso += (alvo - progresso) * (1 - Math.exp(-SUAVIDADE_ROLAGEM * delta));
    posicionarCamera(progresso, delta);
    atualizarCeu(progresso);
    if (barra) barra.style.transform = `scaleX(${progresso.toFixed(4)})`;
    trocarTexto(Math.min(ETAPAS.length - 1, Math.floor(progresso * ETAPAS.length)));
  });

  // primeiro quadro já na posição certa (sem "pulo" quando a seção aparece)
  posicionarCamera(0, 1);
  atualizarCeu(0);
}
