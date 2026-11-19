// Céu, neblina e sol do vinhedo: do amanhecer (0) ao pôr do sol (1).
import * as THREE from 'three';

// Cada "hora": cor do céu no horizonte e no alto, cor/força do sol e altura dele (graus)
const HORAS = [
  { p: 0.0, horizonte: '#e6c0a8', alto: '#8e8ea6', sol: '#ffc49e', intensidade: 1.6, elevacao: 6 },
  { p: 0.2, horizonte: '#d2ddd8', alto: '#86a5b7', sol: '#fff0d8', intensidade: 2.6, elevacao: 30 },
  { p: 0.45, horizonte: '#d6e1dd', alto: '#7a9fb7', sol: '#ffffff', intensidade: 3.0, elevacao: 58 },
  { p: 0.7, horizonte: '#ead3a8', alto: '#8ea3aa', sol: '#ffdca6', intensidade: 2.6, elevacao: 26 },
  { p: 0.88, horizonte: '#e79b72', alto: '#7a6080', sol: '#ff9f66', intensidade: 2.0, elevacao: 8 },
  { p: 1.0, horizonte: '#835e6b', alto: '#2c2839', sol: '#d47a68', intensidade: 0.8, elevacao: 2 },
].map((h) => ({ ...h, horizonte: new THREE.Color(h.horizonte), alto: new THREE.Color(h.alto), sol: new THREE.Color(h.sol) }));

const suave = (a, b, t) => {
  const k = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
};

/**
 * @param {boolean} sombras     o sol projeta sombra (só no modo alto)
 * @param {number} densidade    da neblina: maior = horizonte mais perto
 */
export function criarCeu(cena, { sombras, densidade }) {
  const sol = new THREE.DirectionalLight('#ffffff', 2.5);
  const ambiente = new THREE.HemisphereLight('#d6e1dd', '#4a5236', 0.7);
  cena.add(sol, sol.target, ambiente);

  if (sombras) {
    // A sombra é calculada só numa "caixa" de 64 × 64 m em volta do ponto que a câmera olha.
    // Menor = sombra mais nítida; maior = cobre mais área. O sol acompanha a câmera (ver atualizar).
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 200 });
    sol.shadow.camera.updateProjectionMatrix(); // sem isso a caixa continua no tamanho padrão (10 × 10 m)
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.03; // evita "listras" de sombra no próprio objeto
  }

  // Neblina exponencial: rala perto e cada vez mais densa longe, como ar de verdade
  cena.fog = new THREE.FogExp2('#d6e1dd', densidade);

  // Céu em degradê, pintado num canvas minúsculo que vira o fundo da cena
  const tela = document.createElement('canvas');
  tela.width = 2;
  tela.height = 256;
  const ctx = tela.getContext('2d');
  const fundo = new THREE.CanvasTexture(tela);
  fundo.colorSpace = THREE.SRGBColorSpace;
  cena.background = fundo;

  const corHorizonte = new THREE.Color();
  const corAlto = new THREE.Color();
  const direcaoDoSol = new THREE.Vector3();
  let ultimoProgresso = -1;

  function pintar(p) {
    let i = 0;
    while (i < HORAS.length - 2 && p > HORAS[i + 1].p) i++;
    const a = HORAS[i];
    const b = HORAS[i + 1];
    const k = suave(a.p, b.p, p);

    corHorizonte.lerpColors(a.horizonte, b.horizonte, k);
    corAlto.lerpColors(a.alto, b.alto, k);
    const degrade = ctx.createLinearGradient(0, 0, 0, tela.height);
    degrade.addColorStop(0, `#${corAlto.getHexString()}`);
    degrade.addColorStop(0.55, `#${corHorizonte.getHexString()}`);
    degrade.addColorStop(1, `#${corHorizonte.getHexString()}`);
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, tela.width, tela.height);
    fundo.needsUpdate = true;

    cena.fog.color.copy(corHorizonte); // a neblina "vira" céu no horizonte, sem emenda
    ambiente.color.copy(corHorizonte);
    ambiente.intensity = 0.45 + a.intensidade * 0.1;

    // o sol nasce a leste (+x), passa alto ao meio-dia e se põe a oeste (-x), sempre à frente
    const elevacao = THREE.MathUtils.degToRad(a.elevacao + (b.elevacao - a.elevacao) * k);
    const caminho = p * Math.PI;
    direcaoDoSol.set(Math.cos(caminho) * Math.cos(elevacao), Math.sin(elevacao), -0.6 * Math.cos(elevacao)).normalize();
    sol.color.lerpColors(a.sol, b.sol, k);
    sol.intensity = a.intensidade + (b.intensidade - a.intensidade) * k;
  }

  /**
   * @param {number} p  hora do dia, de 0 (amanhecer) a 1 (pôr do sol)
   * @param {THREE.Vector3} foco  ponto que a câmera está olhando: a caixa de sombra fica nele
   */
  return function atualizar(p, foco) {
    if (Math.abs(p - ultimoProgresso) > 0.0005) { // só repinta se a hora mudou de verdade
      pintar(p);
      ultimoProgresso = p;
    }
    sol.target.position.copy(foco);
    sol.position.copy(foco).addScaledVector(direcaoDoSol, 80);
  };
}
