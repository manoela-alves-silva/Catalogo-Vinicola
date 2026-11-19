// Detecta celular ou GPU fraca e reduz os detalhes das cenas 3D.

/** O navegador consegue desenhar WebGL? (Se não, o site mostra imagens estáticas.) */
export function suportaWebGL() {
  try {
    const teste = document.createElement('canvas');
    return Boolean(teste.getContext('webgl2') || teste.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Nome da placa de vídeo, quando o navegador informa (alguns escondem por privacidade). */
function nomeDaGpu() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
  } catch {
    return '';
  }
}

/**
 * Devolve 'alto' ou 'baixo'.
 * 'baixo' = celular/tablet, poucos núcleos, pouca memória ou GPU simulada/fraca.
 */
export function detectarQualidade() {
  const toque = window.matchMedia('(pointer: coarse)').matches;
  const poucosNucleos = (navigator.hardwareConcurrency ?? 8) <= 4;
  const poucaMemoria = (navigator.deviceMemory ?? 8) <= 4; // só existe no Chrome
  const gpuFraca = /swiftshader|llvmpipe|software|mali-4|adreno \(tm\) [1-4]\d\d|powervr/i.test(nomeDaGpu());

  return toque || poucosNucleos || poucaMemoria || gpuFraca ? 'baixo' : 'alto';
}
