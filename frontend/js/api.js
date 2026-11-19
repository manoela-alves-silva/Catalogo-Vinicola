// Funções de fetch que conversam com a API PHP (/api/vinhos).

// Endereço da API em desenvolvimento (php -S localhost:8000 -t backend/public).
// Para publicar o site, troque só esta linha.
const ENDERECO_DA_API = 'http://localhost:8000/api';
const TEMPO_LIMITE_MS = 8000;

/** Erro com uma mensagem já pronta para mostrar na tela. */
export class ErroDaApi extends Error {}

async function pedir(caminho) {
  let resposta;
  try {
    resposta = await fetch(ENDERECO_DA_API + caminho, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS), // não fica esperando para sempre
    });
  } catch {
    // fetch só "falha" assim quando nem chegou resposta: API desligada, sem internet ou demorou demais
    throw new ErroDaApi('Não conseguimos falar com a nossa adega agora. Confira a conexão e tente de novo.');
  }

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    // a API manda { "erro": "mensagem" } com o código HTTP certo (404, 400...)
    throw new ErroDaApi(corpo?.erro ?? `A adega respondeu com um erro (${resposta.status}).`);
  }
  return corpo;
}

/** Lista de vinhos, com filtros opcionais (tipo: tinto, branco, rosé...; busca: texto livre). */
export function buscarVinhos(tipo = '', busca = '') {
  const parametros = new URLSearchParams();
  if (tipo) parametros.set('tipo', tipo);
  if (busca) parametros.set('busca', busca);
  const consulta = parametros.toString();
  return pedir(`/vinhos${consulta ? `?${consulta}` : ''}`);
}

/** Um vinho com todos os detalhes. */
export function buscarVinho(slug) {
  return pedir(`/vinhos/${encodeURIComponent(slug)}`);
}
