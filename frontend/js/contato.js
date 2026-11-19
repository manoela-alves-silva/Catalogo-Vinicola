// Contato pelo WhatsApp: número numa constante só e montagem dos links.

// Número FICTÍCIO (DDI 55 + DDD 54 + número), só com dígitos. Troque aqui.
export const NUMERO_WHATSAPP = '5554900000000';

/** Link do WhatsApp, com mensagem já escrita se for passada. */
export function linkWhatsApp(mensagem = '') {
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
  return `https://wa.me/${NUMERO_WHATSAPP}${texto}`;
}

/** Mensagem pronta do botão "Quero este vinho". */
export function mensagemDoVinho({ nome, safra }) {
  return `Olá! Tenho interesse no vinho ${nome} safra ${safra}.`;
}

/**
 * Os links do HTML já vêm com o número (para funcionar sem JS). Com JS, trocamos
 * o número de todos pelo desta constante, mantendo a mensagem que cada um tiver.
 */
export function atualizarLinksWhatsApp() {
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach((link) => {
    const url = new URL(link.href);
    link.href = linkWhatsApp(url.searchParams.get('text') ?? '');
  });
}
