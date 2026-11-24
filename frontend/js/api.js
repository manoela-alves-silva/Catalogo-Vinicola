// Funções que buscam os vinhos.
//
// No computador (localhost), conversam com a API PHP (/api/vinhos).
// No GitHub Pages não existe PHP, então o site entra em "modo estático":
// lê o mesmo vinhos.json e aplica aqui as mesmas regras do Catalogo.php
// (filtro por tipo e busca sem diferenciar maiúsculas nem acentos).
// O resto do site não percebe a diferença: as funções exportadas são as mesmas.

// Endereço da API em desenvolvimento (php -S localhost:8000 -t backend/public).
const ENDERECO_DA_API = 'http://localhost:8000/api';
// No modo estático, o workflow do GitHub Pages copia backend/dados/vinhos.json para cá.
const ARQUIVO_ESTATICO = 'dados/vinhos.json';
const MODO_ESTATICO = !['localhost', '127.0.0.1'].includes(location.hostname);
const TEMPO_LIMITE_MS = 8000;
const TIPOS = ['tinto', 'branco', 'rosé', 'espumante', 'sobremesa']; // os mesmos de Vinho::TIPOS

/** Erro com uma mensagem já pronta para mostrar na tela. */
export class ErroDaApi extends Error {}

async function pedir(url) {
  let resposta;
  try {
    resposta = await fetch(url, {
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

// ---------- Modo estático (GitHub Pages) ----------

let todosOsVinhos = null; // lido uma vez só

function lerVinhos() {
  return (todosOsVinhos ??= pedir(ARQUIVO_ESTATICO).catch((erro) => {
    todosOsVinhos = null; // deixa tentar de novo na próxima vez
    throw erro;
  }));
}

/** Minúsculas e sem acento, para "rose" achar "Rosé" (igual ao normalizar() do PHP). */
const normalizar = (texto) => String(texto).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function listarEstatico(tipo, busca) {
  let vinhos = await lerVinhos();

  if (tipo.trim()) {
    const oficial = TIPOS.find((t) => normalizar(t) === normalizar(tipo));
    if (!oficial) throw new ErroDaApi(`Tipo inválido: "${tipo}". Use um destes: ${TIPOS.join(', ')}.`);
    vinhos = vinhos.filter((v) => v.tipo === oficial);
  }

  if (busca.trim()) {
    const termo = normalizar(busca);
    // a busca olha nome, uva e descrição curta
    vinhos = vinhos.filter((v) => normalizar(`${v.nome} ${v.uva} ${v.descricao_curta}`).includes(termo));
  }

  return vinhos;
}

async function buscarEstatico(slug) {
  const vinho = (await lerVinhos()).find((v) => v.slug === slug);
  if (!vinho) throw new ErroDaApi(`Vinho "${slug}" não encontrado.`);
  return vinho;
}

// ---------- O que o resto do site usa ----------

/** Lista de vinhos, com filtros opcionais (tipo: tinto, branco, rosé...; busca: texto livre). */
export function buscarVinhos(tipo = '', busca = '') {
  if (MODO_ESTATICO) return listarEstatico(tipo, busca);
  const parametros = new URLSearchParams();
  if (tipo) parametros.set('tipo', tipo);
  if (busca) parametros.set('busca', busca);
  const consulta = parametros.toString();
  return pedir(`${ENDERECO_DA_API}/vinhos${consulta ? `?${consulta}` : ''}`);
}

/** Um vinho com todos os detalhes. */
export function buscarVinho(slug) {
  if (MODO_ESTATICO) return buscarEstatico(slug);
  return pedir(`${ENDERECO_DA_API}/vinhos/${encodeURIComponent(slug)}`);
}
