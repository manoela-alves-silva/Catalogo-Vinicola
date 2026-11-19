// Posição do mouse compartilhada por vários módulos (nome do hero, garrafa 3D, cursor).
// Um único "ouvinte" de evento atualiza este objeto; quem precisa só lê os valores.

export const mouse = {
  x: 0,        // -1 (esquerda) a 1 (direita)
  y: 0,        // -1 (topo) a 1 (base)
  clientX: 0,  // posição em pixels na janela
  clientY: 0,
  ativo: false, // false no toque ou com o mouse fora da janela
};

let iniciado = false;

export function acompanharMouse() {
  if (iniciado) return;
  iniciado = true;

  window.addEventListener('pointermove', (evento) => {
    if (evento.pointerType !== 'mouse') return; // no toque não há "seguir o cursor"
    mouse.clientX = evento.clientX;
    mouse.clientY = evento.clientY;
    mouse.x = (evento.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (evento.clientY / window.innerHeight) * 2 - 1;
    mouse.ativo = true;
  }, { passive: true });

  // Mouse saiu da janela: tudo volta suavemente para o centro
  document.documentElement.addEventListener('mouseleave', () => {
    mouse.x = 0;
    mouse.y = 0;
    mouse.ativo = false;
  });
}
